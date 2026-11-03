const express = require('express');
const router = express.Router();
const { getDB, getClient } = require('../database');
const { ObjectId } = require('mongodb');
const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const crypto = require('crypto')
const sharp = require('sharp')
const verifyToken = require('../middleware/auth')
const path = require('path')
const s3 = require('../s3')
const upload = require('../middleware/upload')

// Pin {
//   _id: ObjectId,
//   ownerId: ObjectId,         // FK -> User
//   imageURL: String,          // 최적화(WebP) 이미지 URL
//   originalURL: String,       // 원본 이미지 URL
//   imageKey: String,          // R2 오브젝트 키 (최적화본, 삭제 시 사용)
//   originalKey: String,       // R2 오브젝트 키 (원본, 삭제 시 사용)
//   width: Number,             // 비율 계산 및 레이아웃 shift 방지에 필요
//   height: Number,
//   title: String,             // nullable
//   description: String,       // nullable
//   link: String,              // nullable
//   tags: [String],
//   likeCount: Number,         // 기본값 0, 캐싱용
//   commentCount: Number,      // 기본값 0, 캐싱용
//   createdAt: Date
// }

// #### POST /api/pins
// - 인증: 필요
// - Content-Type: `multipart/form-data`
// - Request Body:
// 	- `image`: File (필수)
// 	- `title`: String (선택)
// 	- `description`: String (선택)
// 	- `tags`: String, JSON 배열 문자열 (선택)
// 	- `link`: String, URL (선택)
// 	- `boardId`: String (필수) — 새 보드면 프론트가 먼저 `POST /boards` 호출해서 받은 ID를 사용
// - 서버가 채우는 것: `ownerId`, `images.{...}`, `width`, `height`, `likeCount`(0), `commentCount`(0), `createdAt`
// - 처리: Pin 생성 + BoardPin(연결) 생성이 함께 일어남 (둘 다 성공해야 완료로 간주 — 구현 시 실패 처리 전략 필요)
// - Response: `201` -> `{ pin: Pin }`
// - 에러: `400`(boardId 누락, link 형식 오류 등), `404`(boardId가 존재하지 않음)

router.post('/', verifyToken, upload.single('image'), async (req, res) => {
    try {
        const { title, description, link, boardId } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: '이미지를 첨부해주세요.' });
        }

        if (title?.length > 100) {
            return res.status(400).json({ error: '제목은 100자를 초과할 수 없습니다.' });
        }

        if (description?.length > 800) {
            return res.status(400).json({ error: '설명은 800자를 초과할 수 없습니다.' });
        }

        if (link) {
            try {
                new URL(link);
            } catch {
                return res.status(400).json({ error: '유효하지 않은 링크 형식입니다.' });
            }
        }

        // let tags = [];
        // if (req.body.tags) {
        //     try {
        //         tags = JSON.parse(req.body.tags);
        //     } catch (err) {
        //         return res.status(400).json({ error: 'tags 형식이 올바르지 않습니다.' });
        //     }
        // }

        if (boardId && !ObjectId.isValid(boardId)) {
            return res.status(400).json({ error: '유효하지 않은 ID입니다.' })
        }

        const db = getDB();

        if (boardId) {
            const board = await db.collection('boards').findOne({ _id: new ObjectId(boardId) })
            if (!board) {
                return res.status(404).json({ error: '보드가 존재하지 않습니다.' })
            }
            if (!board.ownerId.equals(req.userId)) {
                return res.status(403).json({ error: '이 보드에 대한 권한이 없습니다.' })
            }
        }

        const id = crypto.randomUUID();
        const originalExt = path.extname(req.file.originalname) || '.jpg';
        const originalKey = `originals/${id}${originalExt}`;
        const optimizedKey = `optimized/${id}.webp`;

        const { data: optimizedBuffer, info } = await sharp(req.file.buffer)
            .rotate()
            .resize({ width: 736, withoutEnlargement: true })
            .toFormat('webp', { quality: 80 })
            .toBuffer({ resolveWithObject: true })

        const originalCommand = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: originalKey,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        })

        const optimizedCommand = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: optimizedKey,
            Body: optimizedBuffer,
            ContentType: 'image/webp',
        })

        // 1단계: R2 업로드
        const uploadResults = await Promise.allSettled([
            s3.send(originalCommand),
            s3.send(optimizedCommand),
        ]);

        const originalUploaded = uploadResults[0].status === 'fulfilled'
        const optimizedUploaded = uploadResults[1].status === 'fulfilled'

        // 헬퍼: 업로드된 것 중 지정된 key들만 삭제
        const cleanupR2 = async (keysToDelete) => {
            const tasks = keysToDelete.map(key =>
                s3.send(new DeleteObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: key,
                }))
            )

            const cleanupResults = await Promise.allSettled(tasks)

            cleanupResults.forEach((result, i) => {
                if (result.status === 'rejected') {
                    console.error('R2 정리(cleanup) 실패, 수동 확인 필요: ', keysToDelete[i], result.reason)
                }
            });
        }

        // r2 업로드 하나라도 실패 시
        if (!originalUploaded || !optimizedUploaded) {
            // 실패한 key랑 reason을 console에 출력
            uploadResults.forEach((result, i) => {
                if (result.status === 'rejected') {
                    const key = i === 0 ? originalKey : optimizedKey;
                    console.error('R2 업로드 실패: ', key, result.reason)
                }
            });

            // 성공한 것이 있다면 r2에서 삭제
            const succeededKeys = [];
            if (originalUploaded) succeededKeys.push(originalKey);
            if (optimizedUploaded) succeededKeys.push(optimizedKey);
            if (succeededKeys.length > 0) {
                await cleanupR2(succeededKeys)
            }

            return res.status(500).json({ error: '이미지 업로드에 실패했습니다.' })
        }

        // 2단계: DB 저장 (R2는 이미 둘 다 성공한 상태)
        const originalURL = process.env.R2_PUBLIC_URL + '/' + originalKey
        const imageURL = process.env.R2_PUBLIC_URL + '/' + optimizedKey

        const pin = {
            ownerId: new ObjectId(req.userId),
            imageURL: imageURL,
            originalURL: originalURL,
            imageKey: optimizedKey,
            originalKey: originalKey,
            width: info.width,
            height: info.height,
            title,
            description,
            // tags,
            link,
            likeCount: 0,
            commentCount: 0,
            createdAt: new Date()
        }

        const client = getClient();
        const session = client.startSession();
        try {
            await session.withTransaction(async () => {
                await db.collection('pins').insertOne(pin, { session })

                if (boardId) {
                    const boardPin = {
                        boardId: new ObjectId(boardId),
                        pinId: pin._id,
                        createdAt: new Date()
                    }
                    await db.collection('boardPins').insertOne(boardPin, { session })
                }
            });
        } catch (dbErr) {
            // 2단계 실패: R2엔 이미 올라갔으니 둘 다 지워서 정리
            console.error('DB 저장 실패, R2 정리 진행: ', dbErr)
            await cleanupR2([originalKey, optimizedKey])
            return res.status(500).json({ error: '핀 저장에 실패했습니다.' })
        } finally {
            await session.endSession();
        }

        res.status(201).json({ pin })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })

    }
})

router.get('/', async (req, res) => {
    try {
        const cursor = req.query.cursor
        const limit = Number(req.query.limit) || 10;
        const filter = cursor ? { _id: { $lt: new ObjectId(cursor) } } : {};

        const db = getDB();
        const pins = await db.collection('pins')
            .find(filter)
            .limit(limit + 1)
            .sort({ _id: -1 })
            .toArray()

        const nextCursor = pins[limit] ? pins[limit - 1]._id : null;
        const trimmedPins = pins.slice(0, limit);

        res.status(200).json({ pins: trimmedPins, nextCursor })
    } catch (error) {
        if (error.name === 'BSONError' || error.message.includes('ObjectId')) {
            return res.status(400).json({ error: '유효하지 않은 cursor 형식입니다.' });
        }
        console.log(error)
        res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })
    }
})

router.get('/:id', async (req, res) => {
    const pinId = req.params.id;

    if (!ObjectId.isValid(pinId)) {
        return res.status(400).json({ error: '유효하지 않은 ID입니다.' })
    }

    try {
        const db = getDB();
        const pins = await db.collection('pins').aggregate([
            {
                $match: { _id: new ObjectId(pinId) }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "ownerId",
                    foreignField: "_id",
                    pipeline: [
                        { $project: { _id: 1, username: 1 } }
                    ],
                    as: "owner"
                }
            },
            {
                $unwind: {
                    path: "$owner",
                    preserveNullAndEmptyArrays: true
                }
            }
        ]).toArray();
        const pin = pins[0];

        if (!pin) return res.status(404).json({ error: 'Pin not found' })

        return res.status(200).json({ pin })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })
    }


})

router.patch('/:id', verifyToken, async (req, res) => {
    const pinId = req.params.id;
    const { title, description, link, sourceBoardId, targetBoardId } = req.body;

    if (title?.length > 100) {
        return res.status(400).json({ error: '제목은 100자를 초과할 수 없습니다.' });
    }

    if (description?.length > 800) {
        return res.status(400).json({ error: '설명은 800자를 초과할 수 없습니다.' });
    }

    if (link) {
        try {
            new URL(link);
        } catch {
            return res.status(400).json({ error: '유효하지 않은 링크 형식입니다.' });
        }
    }

    if (!ObjectId.isValid(pinId)) {
        return res.status(400).json({ error: '유효하지 않은 ID입니다.' })
    }

    if (sourceBoardId && !ObjectId.isValid(sourceBoardId)) {
        return res.status(400).json({ error: '유효하지 않은 보드 ID입니다.' })

    }

    if (targetBoardId && !ObjectId.isValid(targetBoardId)) {
        return res.status(400).json({ error: '유효하지 않은 보드 ID입니다.' })

    }

    const db = getDB();
    const client = getClient();
    const session = client.startSession();
    try {
        let updatedPin;

        await session.withTransaction(async () => {
            const pin = await db.collection('pins').findOne(
                { _id: new ObjectId(pinId) },
                { session }
            );
            if (!pin) {
                throw { status: 404, message: '핀이 존재하지 않습니다.' };
            }
            if (!pin.ownerId.equals(req.userId)) {
                throw { status: 403, message: '이 핀에 대한 권한이 없습니다.' };
            }

            // board 추가
            if (!sourceBoardId && targetBoardId) {
                const targetBoard = await db.collection('boards').findOne(
                    { _id: new ObjectId(targetBoardId) },
                    { session }
                )

                if (!targetBoard) {
                    throw { status: 404, message: '보드를 찾을 수 없습니다.' };
                }
                if (!targetBoard.ownerId.equals(req.userId)) {
                    throw { status: 403, message: '이 보드에 대한 권한이 없습니다.' };
                }

                const existingLink = await db.collection('boardPins').findOne(
                    { boardId: new ObjectId(targetBoardId), pinId: new ObjectId(pinId) },
                    { session }
                );

                if (existingLink) {
                    throw { status: 409, message: '해당 보드에 이미 존재하는 핀입니다.' };
                }

                await db.collection('boardPins').insertOne(
                    {
                        boardId: new ObjectId(targetBoardId),
                        pinId: new ObjectId(pinId),
                        createdAt: new Date(),
                    },
                    { session }
                );
            }

            // board 이동
            if (sourceBoardId && targetBoardId && sourceBoardId !== targetBoardId) {
                const [sourceBoard, targetBoard] = await Promise.all([
                    db.collection('boards').findOne({ _id: new ObjectId(sourceBoardId) }, { session }),
                    db.collection('boards').findOne({ _id: new ObjectId(targetBoardId) }, { session }),
                ]);

                if (!sourceBoard || !targetBoard) {
                    throw { status: 404, message: '보드를 찾을 수 없습니다.' };
                }
                if (!sourceBoard.ownerId.equals(req.userId) || !targetBoard.ownerId.equals(req.userId)) {
                    throw { status: 403, message: '이 보드에 대한 권한이 없습니다.' };
                }

                const existingLink = await db.collection('boardPins').findOne(
                    { boardId: new ObjectId(sourceBoardId), pinId: new ObjectId(pinId) },
                    { session }
                );
                if (!existingLink) {
                    throw { status: 404, message: '해당 보드에 이 핀이 존재하지 않습니다.' };
                }

                await db.collection('boardPins').updateOne(
                    { _id: existingLink._id },
                    { $set: { boardId: new ObjectId(targetBoardId), createdAt: new Date() } },
                    { session }
                );
            }

            // pin update
            updatedPin = await db.collection('pins').findOneAndUpdate(
                { _id: new ObjectId(pinId) },
                { $set: { title, description, link } },
                { returnDocument: 'after', session, ignoreUndefined: true }
            );

            if (!updatedPin) {
                throw { status: 404, message: '핀을 찾을 수 없습니다.' };
            }
        });

        return res.status(200).json({ pin: updatedPin })
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        if (error.code === 11000) {
            return res.status(409).json({ error: '이 핀은 이미 해당 보드에 존재합니다.' })
        }
        console.error(error)
        return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })
    } finally {
        await session.endSession();
    }
})

router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const pinId = req.params.id;
        if (!ObjectId.isValid(pinId)) {
            return res.status(400).json({ error: '유효하지 않은 ID입니다.' })
        }

        const db = getDB();
        const client = getClient();
        const session = client.startSession();
        let deletedKeys = null;

        try {
            await session.withTransaction(async () => {
                const deletedPin = await db.collection('pins').findOneAndDelete(
                    { _id: new ObjectId(pinId), ownerId: new ObjectId(req.userId) },
                    { session }
                )

                if (!deletedPin) {
                    const exists = await db.collection('pins').findOne(
                        { _id: new ObjectId(pinId) },
                        { projection: { _id: 1 }, session }
                    )
                    throw new Error(exists ? 'FORBIDDEN' : 'NOT_FOUND')
                }

                await db.collection('boardPins').deleteMany(
                    { pinId: new ObjectId(pinId) },
                    { session }
                )

                await db.collection('likes').deleteMany(
                    { pinId: new ObjectId(pinId) },
                    { session }
                )

                await db.collection('comments').deleteMany(
                    { pinId: new ObjectId(pinId) },
                    { session }
                )

                deletedKeys = {
                    imageKey: deletedPin.imageKey,
                    originalKey: deletedPin.originalKey
                }
            });
        } catch (err) {
            if (err.message === 'FORBIDDEN') {
                return res.status(403).json({ error: '이 핀에 대한 권한이 없습니다.' })
            }
            if (err.message === 'NOT_FOUND') {
                return res.status(404).json({ error: '핀을 찾을 수 없습니다.' })
            }
            throw err
        } finally {
            await session.endSession();
        }

        if (deletedKeys) {
            const results = await Promise.allSettled([
                s3.send(new DeleteObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: deletedKeys.imageKey,
                })),
                s3.send(new DeleteObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: deletedKeys.originalKey,
                }))
            ])

            results.forEach((result, i) => {
                if (result.status === 'rejected') {
                    const key = i === 0 ? deletedKeys.imageKey : deletedKeys.originalKey;
                    console.error('R2 이미지 삭제 실패, 정리 필요: ', key, result.reason)
                }
            })
        }

        res.status(204).end()
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })
    }
})

// #### POST /api/pins/:id/likes
// - 인증: 필요
// - 서버가 하는 일: `Like` 문서 생성 + `Pin.likeCount`+1
// - Response: `201` -> `{ likeCount }`
// - 에러: `404`(핀 없음), `409`(이미 좋아요함)

router.post('/:id/likes', verifyToken, async (req, res) => {
    const pinId = req.params.id;
    if (!ObjectId.isValid(pinId)) {
        return res.status(400).json({ error: '유효하지 않은 ID입니다.' })
    }

    const db = getDB();
    const session = getClient().startSession();

    try {
        let pin = null;

        await session.withTransaction(async () => {
            pin = null;
            await db.collection('likes').insertOne(
                {
                    userId: new ObjectId(req.userId),
                    pinId: new ObjectId(pinId),
                    createdAt: new Date(),
                },
                { session }
            );

            pin = await db.collection('pins').findOneAndUpdate(
                { _id: new ObjectId(pinId) },
                { $inc: { likeCount: 1 } },
                { returnDocument: 'after', session }
            );

            if (!pin) {
                const err = new Error('PIN_NOT_FOUND');
                err.code = 'PIN_NOT_FOUND';
                throw err;
            }
        });

        res.status(201).json({ likeCount: pin.likeCount });
    } catch (error) {
        if (error.code === 'PIN_NOT_FOUND') {
            return res.status(404).json({ error: '핀을 찾을 수 없습니다.' })
        }
        if (error.code === 11000) {
            return res.status(409).json({ error: '이미 좋아요한 핀입니다.' })
        }
        console.log(error)
        res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })
    } finally {
        await session.endSession();
    }
})

// #### DELETE /api/pins/:id/likes
// - 인증: 필요
// - 서버가 하는 일: `Like` 문서 삭제 + `Pin.likeCount`-1
// - Response: `200` -> `{ likeCount }`
// - 에러: `404`(핀 없음 또는 좋아요한 적 없음)

router.delete('/:id/likes', verifyToken, async (req, res) => {
    const pinId = req.params.id;
    if (!ObjectId.isValid(pinId)) {
        return res.status(400).json({ error: '유효하지 않은 PIN ID입니다.' })
    }

    const db = getDB();
    const session = getClient().startSession();

    try {
        let updatedPin = null;

        await session.withTransaction(async () => {
            updatedPin = null;

            const del = await db.collection('likes').deleteOne(
                { userId: new ObjectId(req.userId), pinId: new ObjectId(pinId) },
                { session }
            )

            if (del.deletedCount === 0) {
                const err = new Error('NOT_FOUND');
                err.code = 'NOT_FOUND';
                throw err;
            }

            updatedPin = await db.collection('pins').findOneAndUpdate(
                { _id: new ObjectId(pinId) },
                { $inc: { likeCount: -1 } },
                { returnDocument: 'after', session }
            );

            if (!updatedPin) {
                const err = new Error('NOT_FOUND');
                err.code = 'NOT_FOUND';
                throw err;
            }
        })
        res.status(200).json({ likeCount: updatedPin.likeCount });
    } catch (error) {
        if (error.code === 'NOT_FOUND') {
            return res.status(404).json({ error: '핀 또는 좋아요를 찾을 수 없습니다.' })
        }
        console.error(error);
        res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
    } finally {
        await session.endSession();
    }
})

// #### GET  /api/pins/:id/likes/me
// - 인증: 필요 (JWT)
// - Response: `200` -> `{ liked: true | false }`

router.get('/:id/likes/me', verifyToken, async (req, res) => {
    try {
        const pinId = req.params.id;
        if (!ObjectId.isValid(pinId)) {
            return res.status(400).json({ error: '유효하지 않은 PIN ID입니다.' })
        }

        const db = getDB();
        const like = await db.collection('likes').findOne(
            { userId: new ObjectId(req.userId), pinId: new ObjectId(pinId) },
            { projection: { _id: 1 } }
        )

        return res.status(200).json({ liked: !!like });
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })
    }
})

module.exports = router;