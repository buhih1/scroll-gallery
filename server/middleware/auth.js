const { ObjectId } = require('mongodb');
const { verifyAccessToken } = require('../utils/token');

function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: '토큰이 없습니다' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = verifyAccessToken(token);

        if (!decoded.userId || !ObjectId.isValid(decoded.userId)) {
            return res.status(401).json({ error: '유효하지 않은 토큰입니다' });
        }

        req.userId = decoded.userId;
        next();
    } catch (error) {
        res.status(401).json({ error: error.message })
    }
}

module.exports = verifyToken