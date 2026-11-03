const jwt = require('jsonwebtoken')
require('dotenv').config()
const crypto = require('crypto');

function generateAccessToken(userId) {
    return jwt.sign(
        { userId: userId },
        process.env.JWT_ACCESS_TOKEN_SECRET,
        // { expiresIn: '1h' }
        { expiresIn: '5s' }
    )
}

function verifyAccessToken(token) {
    return jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET)
}

function generateRefreshToken() {
    const refreshToken = crypto.randomBytes(64).toString('hex');
    return refreshToken;
}

module.exports = { generateAccessToken, verifyAccessToken, generateRefreshToken };