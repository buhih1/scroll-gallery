const express = require('express');
const router = express.Router({ mergeParams: true });
const { getDB, getClient } = require('../database');
const { ObjectId } = require('mongodb');
const verifyToken = require('../middleware/auth');
const { parseLimit, parseCursor } = require('../utils/pagination');
const { withUser, withReplyTo, stripIds } = require('../utils/commentShape');

// /api/pins/:id/comments
router.post('/', verifyToken, async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: '유효하지 않은 PIN ID입니다.' })
        }

        const pinId = new ObjectId(req.params.id);

        // replyToCommentId: 댓글 id or 대댓글 id
        const { text, replyToCommentId } = req.body ?? {}

        if (typeof text !== 'string') {
            return res.status(400).json({ error: 'text는 문자열이어야 합니다.' });
        }

        if (replyToCommentId != null && !ObjectId.isValid(replyToCommentId)) {
            return res.status(400).json({ error: '유효하지 않은 COMMENT ID입니다.' })
        }

        const trimmedText = text.trim();
        if (trimmedText.length < 1) {
            return res.status(400).json({ error: '이 필드는 너무 짧습니다. 최소 길이는 1자입니다.' })
        }
        if (trimmedText.length > 500) {
            return res.status(400).json({ error: '이 필드는 너무 깁니다. 최대 길이는 500자입니다.' })
        }

        const db = getDB();
        const session = getClient().startSession();
        let comment;
        try {
            await session.withTransaction(async () => {
                let parentCommentId = null;
                let replyToUserId = null;

                if (replyToCommentId) {
                    const target = await db.collection('comments').findOne(
                        { _id: new ObjectId(replyToCommentId) },
                        { session }
                    );
                    if (!target || !target.pinId.equals(pinId)) {
                        const err = new Error('답변할 댓글을 찾을 수 없습니다.');
                        err.code = 'NOT_FOUND';
                        throw err;
                    }

                    parentCommentId = target.parentCommentId ?? target._id;
                    replyToUserId = target.parentCommentId ? target.userId : null;
                }

                comment = {
                    pinId,
                    userId: new ObjectId(req.userId),
                    text: trimmedText,
                    parentCommentId,
                    replyToUserId,
                    createdAt: new Date(),
                }

                if (parentCommentId === null) {
                    comment.replyCount = 0;
                }

                await db.collection('comments').insertOne(comment, { session });
                const pinResult = await db.collection('pins').updateOne(
                    { _id: pinId },
                    { $inc: { commentCount: 1 } },
                    { session }
                )
                if (pinResult.matchedCount === 0) {
                    const err = new Error('핀을 찾을 수 없습니다.');
                    err.code = 'NOT_FOUND';
                    throw err;
                }

                if (parentCommentId) {
                    const root = await db.collection('comments').updateOne(
                        { _id: parentCommentId },
                        { $inc: { replyCount: 1 } },
                        { session }
                    );
                    if (root.matchedCount === 0) {
                        const err = new Error('부모 댓글을 찾을 수 없습니다.');
                        err.code = 'NOT_FOUND';
                        throw err;
                    }
                }
            })
        } finally {
            await session.endSession();
        }

        const isReply = comment.parentCommentId !== null;
        const [response] = await db.collection('comments').aggregate([
            { $match: { _id: comment._id } },
            ...withUser,
            ...(isReply ? withReplyTo : [{ $set: { replies: [] } }]),
            stripIds,
        ]).toArray();

        return res.status(201).json({ comment: response });
    } catch (error) {
        if (error.code === 'NOT_FOUND') {
            return res.status(404).json({ error: error.message })
        }
        console.error(error)
        return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })
    }
})

router.get('/', async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: '유효하지 않은 PIN ID입니다.' })
        }
        const pinId = new ObjectId(req.params.id);

        const cursor = parseCursor(req.query.cursor);
        if (cursor === null) {
            return res.status(400).json({ error: '유효하지 않은 cursor 형식입니다.' })
        }

        const limit = parseLimit(req.query.limit);
        if (limit === null) {
            return res.status(400).json({ error: '유효하지 않은 limit입니다.' });
        }

        const db = getDB();
        const pin = await db.collection('pins').findOne(
            { _id: pinId },
            { projection: { _id: 1 } }
        );
        if (!pin) {
            return res.status(404).json({ error: '핀을 찾을 수 없습니다.' })
        }

        const filter = { pinId, parentCommentId: null };
        if (cursor) {
            filter._id = { $gt: cursor };
        }

        const comments = await db.collection('comments').aggregate([
            { $match: filter },
            { $sort: { _id: 1 } },
            { $limit: limit + 1 },
            ...withUser,
            {
                $lookup: {
                    from: 'comments',
                    localField: '_id',
                    foreignField: 'parentCommentId',
                    pipeline: [
                        { $match: { pinId } },
                        { $sort: { _id: 1 } },
                        { $limit: 1 },
                        ...withUser,
                        ...withReplyTo,
                        stripIds,
                    ],
                    as: 'replies',
                },
            },
            stripIds,
        ]).toArray();

        const hasNext = comments.length > limit;
        const page = comments.slice(0, limit);
        const nextCursor = hasNext ? page[page.length - 1]._id : null;

        res.status(200).json({ comments: page, nextCursor })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })
    }
})

router.get('/:commentId/replies', async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: '유효하지 않은 PIN ID입니다.' })
        }
        if (!ObjectId.isValid(req.params.commentId)) {
            return res.status(400).json({ error: '유효하지 않은 COMMENT ID입니다.' })
        }
        const pinId = new ObjectId(req.params.id);
        const commentId = new ObjectId(req.params.commentId);

        const cursor = parseCursor(req.query.cursor);
        if (cursor === null) {
            return res.status(400).json({ error: '유효하지 않은 cursor 형식입니다.' })
        }

        const limit = parseLimit(req.query.limit);
        if (limit === null) {
            return res.status(400).json({ error: '유효하지 않은 limit입니다.' });
        }

        const db = getDB();
        const root = await db.collection('comments').findOne(
            { _id: commentId },
            { projection: { pinId: 1, parentCommentId: 1 } }
        );
        // 핀 삭제 시 댓글도 삭제 구현해야함
        if (!root || !root.pinId.equals(pinId) || root.parentCommentId !== null) {
            return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
        }

        const filter = { pinId, parentCommentId: commentId };
        if (cursor) {
            filter._id = { $gt: cursor };
        }

        const replies = await db.collection('comments').aggregate([
            { $match: filter },
            { $sort: { _id: 1 } },
            { $limit: limit + 1 },
            ...withUser,
            ...withReplyTo,
            stripIds,
        ]).toArray();

        const hasNext = replies.length > limit;
        const page = replies.slice(0, limit);
        const nextCursor = hasNext ? page[page.length - 1]._id : null;

        res.status(200).json({ replies: page, nextCursor })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
    }
})

router.delete('/:commentId', verifyToken, async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: '유효하지 않은 PIN ID입니다.' })
        }
        if (!ObjectId.isValid(req.params.commentId)) {
            return res.status(400).json({ error: '유효하지 않은 COMMENT ID입니다.' })
        }
        const pinId = new ObjectId(req.params.id);
        const commentId = new ObjectId(req.params.commentId);
        const userId = new ObjectId(req.userId);

        const db = getDB();
        const session = getClient().startSession();
        try {
            await session.withTransaction(async () => {
                const deletedComment = await db.collection('comments').findOneAndDelete(
                    { _id: commentId, userId, pinId },
                    { session }
                );

                if (!deletedComment) {
                    const exists = await db.collection('comments').findOne(
                        { _id: commentId },
                        { session }
                    )

                    if (!exists || !exists.pinId.equals(pinId)) {
                        throw new Error('NOT_FOUND')
                    }

                    throw new Error('FORBIDDEN')
                }

                if (deletedComment.parentCommentId === null) {
                    const result = await db.collection('comments').deleteMany(
                        { pinId, parentCommentId: commentId },
                        { session }
                    )
                    await db.collection('pins').updateOne(
                        { _id: pinId },
                        { $inc: { commentCount: -(result.deletedCount + 1) } },
                        { session }
                    )
                } else {
                    await db.collection('pins').updateOne(
                        { _id: pinId },
                        { $inc: { commentCount: - 1 } },
                        { session }
                    )
                    await db.collection('comments').updateOne(
                        { _id: deletedComment.parentCommentId },
                        { $inc: { replyCount: -1 } },
                        { session }
                    )
                }
            })
        } finally {
            await session.endSession();
        }
        res.status(204).end();
    } catch (error) {
        if (error.message === 'NOT_FOUND') {
            return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' })
        }
        if (error.message === 'FORBIDDEN') {
            return res.status(403).json({ error: '이 댓글에 대한 권한이 없습니다.' })
        }
        console.log(error);
        return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })
    }
})

module.exports = router;