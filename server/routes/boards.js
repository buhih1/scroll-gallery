const express = require('express');
const router = express.Router();
const { getDB, getClient } = require('../database');
const { ObjectId } = require('mongodb');
const verifyToken = require('../middleware/auth');

// Board {
//   _id: ObjectId, 
//   ownerId: ObjectId,         // FK -> User
//   name: String, 
//   description: String,       // nullable
//   createdAt: Date
// }

router.post('/', verifyToken, async (req, res) => {
    try {
        const { name } = req.body;

        if (typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ error: '보드 이름을 지정하세요!' })
        }

        if (name.length > 50) {
            return res.status(400).json({ error: '50자 이하로 입력하세요.' })
        }

        const db = getDB();
        const ownerId = new ObjectId(req.userId);
        const trimmedName = name.trim();

        const existing = await db.collection('boards').findOne({
            ownerId,
            name: trimmedName,
        });

        if (existing) {
            return res.status(409).json({ error: '다른 이름을 사용해 보세요. 같은 이름의 보드를 이미 가지고 있습니다.' });
        }

        const board = {
            ownerId,
            name: trimmedName,
            createdAt: new Date()
        }

        await db.collection('boards').insertOne(board);

        return res.status(201).json({ board });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: '다른 이름을 사용해 보세요. 같은 이름의 보드를 이미 가지고 있습니다.' })
        }
        console.error(err)
        return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })
    }

})

router.get('/:id', async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: '유효하지 않은 ID 형식입니다.' });
        }
        const boardId = new ObjectId(req.params.id);

        const db = getDB();
        const [board] = await db.collection('boards').aggregate([
            { $match: { _id: boardId } },
            {
                $lookup: {
                    from: "boardPins",
                    localField: "_id",
                    foreignField: "boardId",
                    pipeline: [{ $count: 'count' }],
                    as: "pinStats"
                }
            },
            {
                $addFields: {
                    pinCount: { $ifNull: [{ $first: '$pinStats.count' }, 0] }
                }
            },
            { $project: { pinStats: 0 } }
        ]).toArray();

        // const board = await db.collection('boards').findOne({ _id: boardId });
        if (!board) {
            return res.status(404).json({ error: '보드가 존재하지 않습니다.' })
        }
        return res.status(200).json({ board })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })
    }
})

router.post('/:id/pins', verifyToken, async (req, res) => {
    try {
        if (!ObjectId.isValid(req.userId) || !ObjectId.isValid(req.body.pinId) || !ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: '유효하지 않은 ID입니다.' })
        }

        const db = getDB();

        const board = await db.collection('boards').findOne({ _id: new ObjectId(req.params.id) });
        if (!board) {
            return res.status(404).json({ error: '보드가 존재하지 않습니다.' })
        }
        if (!board.ownerId.equals(req.userId)) {
            return res.status(403).json({ error: '이 보드에 대한 권한이 없습니다.' })
        }

        const pin = await db.collection('pins').findOne({ _id: new ObjectId(req.body.pinId) })
        if (!pin) {
            return res.status(404).json({ error: '핀이 존재하지 않습니다.' })
        }

        const existing = await db.collection('boardPins').findOne({
            boardId: board._id,
            pinId: new ObjectId(req.body.pinId)
        })
        if (existing) {
            return res.status(409).json({ error: '이미 저장되었습니다.' })
        }

        const boardPins = {
            boardId: board._id,
            pinId: new ObjectId(req.body.pinId),
            createdAt: new Date()
        }
        await db.collection('boardPins').insertOne(boardPins)
        return res.status(201).json(boardPins)

    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })
    }
})

router.get('/:id/pins', async (req, res) => {
    try {
        const boardId = req.params.id;
        const cursor = req.query.cursor;
        const limit = Number(req.query.limit) || 10;

        if (!ObjectId.isValid(boardId)) {
            return res.status(400).json({ error: '유효하지 않은 ID입니다.' })
        }

        const db = getDB();
        const board = await db.collection('boards').findOne({ _id: new ObjectId(boardId) })
        if (!board) {
            return res.status(404).json({ error: '보드가 존재하지 않습니다.' })
        }

        const filter = cursor ? { _id: { $lt: new ObjectId(cursor) }, boardId: new ObjectId(boardId) } : { boardId: new ObjectId(boardId) };

        const boardPins = await db.collection('boardPins').aggregate([
            { $match: filter },
            { $sort: { _id: -1 } },
            { $limit: limit + 1 },
            {
                $lookup: {
                    from: "pins",
                    localField: "pinId",
                    foreignField: "_id",
                    as: "pin"
                }
            },
            {
                $unwind: {
                    path: "$pin",
                    preserveNullAndEmptyArrays: true
                }
            }
        ]).toArray();

        const nextCursor = boardPins[limit] ? boardPins[limit - 1]._id : null;
        const trimmedBoardPins = boardPins.slice(0, limit);
        const pins = trimmedBoardPins.map(boardPin => boardPin.pin);

        return res.status(200).json({ pins, nextCursor });
    } catch (error) {
        if (error.name === 'BSONError' || error.message.includes('ObjectId')) {
            return res.status(400).json({ error: '유효하지 않은 cursor 형식입니다.' });
        }
        console.error(error)
        return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })
    }
})

router.delete('/:id/pins/:pinId', verifyToken, async (req, res) => {
    try {
        const boardId = req.params.id;
        const pinId = req.params.pinId;

        if (!ObjectId.isValid(boardId) || !ObjectId.isValid(pinId)) {
            return res.status(400).json({ error: '유효하지 않은 ID입니다.' })
        }

        const db = getDB();
        const board = await db.collection('boards').findOne({ _id: new ObjectId(boardId) });
        if (!board) {
            return res.status(404).json({ error: '보드가 존재하지 않습니다.' })
        }
        if (!board.ownerId.equals(req.userId)) {
            return res.status(403).json({ error: '이 보드에 대한 권한이 없습니다.' })
        }

        const deletedBoardPin = await db.collection('boardPins').deleteOne({ boardId: new ObjectId(boardId), pinId: new ObjectId(pinId) })
        if (!deletedBoardPin.deletedCount) {
            return res.status(404).json({ error: '핀이 존재하지 않습니다' })
        }

        return res.status(204).end();
    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })
    }
})

router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const boardId = req.params.id;

        if (!ObjectId.isValid(boardId)) {
            return res.status(400).json({ error: '유효하지 않은 ID입니다.' })
        }

        const db = getDB();
        const board = await db.collection('boards').findOne({ _id: new ObjectId(boardId) });
        if (!board) {
            return res.status(404).json({ error: '보드가 존재하지 않습니다.' })
        }
        if (!board.ownerId.equals(req.userId)) {
            return res.status(403).json({ error: '이 보드에 대한 권한이 없습니다.' })
        }

        const session = getClient().startSession();
        try {
            await session.withTransaction(async () => {
                await db.collection('boardPins').deleteMany({ boardId: new ObjectId(boardId) }, { session })
                await db.collection('boards').deleteOne({ _id: new ObjectId(boardId) }, { session });
            })
        } finally {
            await session.endSession();
        }

        res.status(204).end();
    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })
    }
})

router.patch('/:id', verifyToken, async (req, res) => {
    try {
        const boardId = req.params.id;
        const { name, description } = req.body;

        if (!ObjectId.isValid(boardId)) {
            return res.status(400).json({ error: '유효하지 않은 ID입니다.' })
        }

        if (!name) {
            return res.status(400).json({ error: '보드 이름을 지정하세요!' })
        }

        if (typeof description !== 'string') {
            return res.status(400).json({ error: '잘못된 요청입니다.' });
        }

        if (name.trim().length > 50) {
            return res.status(400).json({ error: '이름은 50자를 초과할 수 없습니다.' });
        }

        if (description?.trim().length > 500) {
            return res.status(400).json({ error: '설명은 500자를 초과할 수 없습니다.' });
        }

        const db = getDB();
        const board = await db.collection('boards').findOne({ _id: new ObjectId(boardId) });
        if (!board) {
            return res.status(404).json({ error: '보드가 존재하지 않습니다.' })
        }
        if (!board.ownerId.equals(req.userId)) {
            return res.status(403).json({ error: '이 보드에 대한 권한이 없습니다.' })
        }

        const updatedBoard = await db.collection('boards').findOneAndUpdate(
            { _id: new ObjectId(boardId) },
            { $set: { name: name.trim(), description: description.trim() } },
            { returnDocument: 'after' }
        );

        if (!updatedBoard) {
            return res.status(404).json({ error: '보드를 찾을 수 없습니다.' });
        }

        return res.status(200).json({ board: updatedBoard })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: '보드를 수정하지 못했습니다. 같은 이름의 보드를 이미 가지고 있습니다.' })
        }
        console.error(error)
        return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })
    }
})

module.exports = router;