const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { ObjectId } = require('mongodb');
const verifyToken = require('../middleware/auth');

router.get('/:username', async (req, res) => {
    try {
        const db = getDB();

        const user = await db.collection('users').findOne(
            { username: req.params.username },
            { projection: { _id: 1, username: 1, bio: 1, createdAt: 1 } }
        )
        if (!user) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' })
        }

        return res.status(200).json({ user })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })
    }
})

router.get('/:username/boards', async (req, res) => {
    try {
        const db = getDB();

        const user = await db.collection('users').findOne({ username: req.params.username })
        if (!user) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' })
        }

        const cursor = req.query.cursor;
        const parsedLimit = Number(req.query.limit);
        const limit = (parsedLimit > 0 && parsedLimit <= 50) ? parsedLimit : 10;
        const filter = cursor ? { ownerId: user._id, _id: { $lt: new ObjectId(cursor) } } : { ownerId: user._id }

        const boards = await db.collection('boards').aggregate([
            { $match: filter },
            { $sort: { _id: -1 } },
            { $limit: limit + 1 },
            // links 필드 추가. (이 보드 _id 가진 모든 boardPins 객체 최신순 배열)
            {
                $lookup: {
                    from: 'boardPins',
                    let: { boardId: "$_id" }, // 조인 변수 boardId를 이 보드 _id로 생성
                    pipeline: [
                        { $match: { $expr: { $eq: ["$boardId", "$$boardId"] } } },
                        { $sort: { createdAt: -1 } } // 커버이미지를 위해 최신 3개가 필요하므로, 미리 최신순 정렬
                    ],
                    as: "links"
                }
            },
            // 추가된 links 필드 이용해서 pinCount, coverLinks, lastPinAddedAt 필드 추가.
            {
                $addFields: {
                    pinCount: { $size: "$links" }, // links 개수 == 이 보드에 추가된 pin개수
                    coverLinks: { $slice: ["$links", 3] }, // 커버 이미지로 사용될 links 3개 자르기(이미 최신순으로 정렬되어 있음)
                    lastPinAddedAt: { $arrayElemAt: ["$links.createdAt", 0] } // 이 보드에 핀이 마지막으로 추가된 시간 (이미 최신순으로 정렬되어 있어서 0번째가 가장 최신)
                }
            },
            // coverPins 필드 추가(addedAt 필드 추가된 최근 핀 3개 객체 담긴 배열)
            {
                $lookup: {
                    from: 'pins',
                    let: { coverLinks: "$coverLinks" }, // 조인 변수 coverLinks를 이전에 추가한 coverLinks 필드로 생성
                    pipeline: [
                        { $match: { $expr: { $in: ["$_id", "$$coverLinks.pinId"] } } }, // 핀 3개 찾기(coverLinks 배열 안의 값이 3개이기 때문)
                        // 매칭된 3개의 pin 객체에 addedAt 필드 추가
                        {
                            $addFields: {
                                // 핀이 추가된 날짜 (핀이 생성된 날짜 아님)
                                addedAt: {
                                    $let: {
                                        vars: {
                                            matched: {
                                                $arrayElemAt: [
                                                    {
                                                        $filter: {
                                                            input: "$$coverLinks",
                                                            cond: { $eq: ["$$this.pinId", "$_id"] }
                                                        }
                                                    },
                                                    0
                                                ]
                                            }
                                        },
                                        in: "$$matched.createdAt"
                                    }
                                }
                            }
                        },
                        // 추가된 최신순으로 정렬
                        { $sort: { addedAt: -1 } },
                        // pin 객체에 필요한 필드들만 추출
                        { $project: { _id: 1, imageURL: 1, addedAt: 1 } }
                    ],
                    as: "coverPins"
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    ownerId: 1,
                    pinCount: 1,
                    coverPins: 1,
                    lastPinAddedAt: 1,
                    createdAt: 1,
                }
            }
        ]).toArray();

        // const boards = await db.collection('boards')
        //     .find(filter)
        //     .limit(limit + 1)
        //     .sort({ _id: -1 })
        //     .toArray();

        const nextCursor = boards[limit] ? boards[limit - 1]._id : null
        const trimmedBoards = boards.slice(0, limit);

        res.status(200).json({ boards: trimmedBoards, nextCursor })

    } catch (error) {
        if (error.name === 'BSONError' || error.message.includes('ObjectId')) {
            return res.status(400).json({ error: '유효하지 않은 cursor 형식입니다.' });
        }
        console.log(error)
        res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })
    }
})

router.get('/:username/pins', async (req, res) => {
    try {
        const db = getDB();
        const user = await db.collection('users').findOne({ username: req.params.username })
        if (!user) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' })
        }

        const cursor = req.query.cursor;
        const parsedLimit = Number(req.query.limit);
        const limit = (parsedLimit > 0 && parsedLimit <= 50) ? parsedLimit : 10;
        const filter = cursor ? { ownerId: user._id, _id: { $lt: new ObjectId(cursor) } } : { ownerId: user._id }

        const pins = await db.collection('pins')
            .find(filter)
            .limit(limit + 1)
            .sort({ _id: -1 })
            .toArray();

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

function encodeCursor(doc) {
    return Buffer.from(JSON.stringify({
        createdAt: doc.sortAt,
        id: doc.sortId.toString()
    })).toString('base64');
}

function decodeCursor(cursor) {
    const json = Buffer.from(cursor, 'base64').toString('utf-8');
    const { createdAt, id } = JSON.parse(json);
    return { createdAt: new Date(createdAt), id: new ObjectId(id) };
}

router.get('/:username/pins/all', async (req, res) => {
    try {
        const db = getDB();
        const user = await db.collection('users').findOne({ username: req.params.username })
        if (!user) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' })
        }

        const cursorParam = req.query.cursor;
        const parsedLimit = Number(req.query.limit);
        const limit = (parsedLimit > 0 && parsedLimit <= 50) ? parsedLimit : 10;

        let decoded = null;
        if (cursorParam) {
            try {
                decoded = decodeCursor(cursorParam);
                if (isNaN(decoded.createdAt.getTime())) throw new Error('invalid');
            } catch {
                return res.status(400).json({ error: '유효하지 않은 cursor 형식입니다.' });
            }
        }

        const paginationClause = decoded
            ? {
                $or: [
                    { createdAt: { $lt: decoded.createdAt } },
                    { createdAt: decoded.createdAt, _id: { $lt: decoded.id } }
                ]
            }
            : {};

        const boardIds = (await db.collection('boards')
            .find({ ownerId: user._id })
            .project({ _id: 1 })
            .toArray()).map(b => b._id);

        const ownMatch = { ownerId: user._id, ...paginationClause };
        const boardPinMatch = { boardId: { $in: boardIds }, ...paginationClause };

        const pipeline = [
            { $match: ownMatch },
            { $addFields: { sortAt: '$createdAt', sortId: '$_id', source: 'own', board: null } },
            {
                $unionWith: {
                    coll: 'boardPins',
                    pipeline: [
                        { $match: boardPinMatch },
                        { $lookup: { from: 'pins', localField: 'pinId', foreignField: '_id', as: 'pin' } },
                        { $unwind: '$pin' },
                        { $lookup: { from: 'boards', localField: 'boardId', foreignField: '_id', as: 'boardInfo' } },
                        { $unwind: '$boardInfo' },
                        {
                            $replaceRoot: {
                                newRoot: {
                                    $mergeObjects: [
                                        '$pin',
                                        {
                                            sortAt: '$createdAt',
                                            sortId: '$_id',
                                            source: 'board',
                                            board: { _id: '$boardInfo._id', name: '$boardInfo.name' }
                                        }
                                    ]
                                }
                            }
                        }
                    ]
                }
            },
            { $sort: { sortAt: -1, sortId: -1 } },
            { $limit: limit + 1 }
        ];

        const pins = await db.collection('pins').aggregate(pipeline).toArray();

        const nextCursor = pins[limit] ? encodeCursor(pins[limit - 1]) : null;
        const trimmedPins = pins.slice(0, limit);

        res.status(200).json({ pins: trimmedPins, nextCursor })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })
    }
})

module.exports = router;