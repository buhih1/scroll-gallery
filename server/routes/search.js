const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { ObjectId } = require('mongodb');
const verifyToken = require('../middleware/auth');
const { parseLimit } = require('../utils/pagination');

async function searchPins(req, res, ownerId) {
    try {
        const cursor = typeof req.query.cursor === 'string' && req.query.cursor
            ? req.query.cursor
            : undefined;

        const limit = parseLimit(req.query.limit);
        if (limit === null) {
            return res.status(400).json({ error: '유효하지 않은 limit입니다.' });
        }

        const q = (req.query.q ?? '').trim();
        if (!q) return res.json({ pins: [], nextCursor: null });

        const docs = await getDB().collection('pins').aggregate([
            {
                $search: {
                    compound: {
                        must: [
                            { text: { query: q, path: ['title', 'description'] } },
                        ],
                        ...(ownerId && {
                            filter: [
                                { equals: { path: 'ownerId', value: ownerId } },
                            ],
                        }),
                    },
                    sort: { _id: -1 },
                    ...(cursor && { searchAfter: cursor }),
                },
            },
            { $limit: limit + 1 },
            { $addFields: { paginationToken: { $meta: 'searchSequenceToken' } } },
        ]).toArray();
        const hasMore = docs.length > limit;
        const page = hasMore ? docs.slice(0, limit) : docs;
        const nextCursor = hasMore ? page[page.length - 1].paginationToken : null;
        const pins = page.map(({ paginationToken, ...pin }) => pin);

        res.json({ pins, nextCursor });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'search failed' });
    }
}

router.get('/pins', (req, res) => searchPins(req, res, null));

router.get('/my_pins', verifyToken, (req, res) => searchPins(req, res, new ObjectId(req.userId)));

module.exports = router;