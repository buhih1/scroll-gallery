const express = require('express');
const bcrypt = require('bcrypt');
const { getDB } = require('../database');
const { generateAccessToken, generateRefreshToken } = require('../utils/token');
const { validateField } = require('../utils/validators');
const { ObjectId } = require('mongodb');

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { email, password, birth } = req.body;

        const fields = { email, password, birth };
        for (const [field, value] of Object.entries(fields)) {
            const error = validateField(field, value);
            if (error) {
                return res.status(400).json({ error });
            }
        }

        const db = getDB();
        const existing = await db.collection('users').findOne({ email });
        if (existing) {
            return res.status(409).json({ error: '이미 가입된 이메일입니다.' });
        }

        let username = email.split('@')[0];
        const base = username;
        let counter = 1;

        while (await db.collection('users').findOne({ username })) {
            username = `${base}_${counter}`;
            counter++;
        }

        const passwordHash = await bcrypt.hash(password, 10)
        const userDoc = {
            username: username,
            email: email,
            passwordHash: passwordHash,
            authProvider: 'local',
            birth: new Date(birth),
            createdAt: new Date()
        }

        const result = await db.collection('users').insertOne(userDoc)

        const accessToken = generateAccessToken(result.insertedId.toString())
        const refreshToken = generateRefreshToken();
        await db.collection('refreshTokens').insertOne({
            token: refreshToken,
            userId: result.insertedId.toString(),
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            createdAt: new Date()
        })
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 14 * 24 * 60 * 60 * 1000
        })

        res.status(201).json({
            accessToken,
            user: {
                _id: result.insertedId,
                username: userDoc.username,
                email: userDoc.email,
                birth: userDoc.birth,
                createdAt: userDoc.createdAt
            }
        })
    } catch (err) {
        if (err.code === 11000) {
            // 같은 이메일로 요청이 거의 동시에 들어와서 existing 검증으로 예외 처리되지 않았을 때
            return res.status(409).json({ error: '이미 가입된 이메일입니다.' })
        }

        console.error(err)
        return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })
    }
})

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: '모든 항목을 입력해주세요.' });
        }

        const db = getDB();
        const userDoc = await db.collection('users').findOne({ email: email })
        if (!userDoc) {
            return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' })
        }

        const isMatch = await bcrypt.compare(password, userDoc.passwordHash)
        if (!isMatch) {
            return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' })
        }

        const accessToken = generateAccessToken(userDoc._id.toString())
        const refreshToken = generateRefreshToken();
        await db.collection('refreshTokens').insertOne({
            token: refreshToken,
            userId: userDoc._id.toString(),
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            createdAt: new Date()
        })
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 14 * 24 * 60 * 60 * 1000
        })

        return res.status(200).json({
            user: {
                _id: userDoc._id,
                username: userDoc.username,
                email: userDoc.email,
                birth: userDoc.birth,
                createdAt: userDoc.createdAt,
                avatarUrl: userDoc.avatarUrl,
                bio: userDoc.bio
            },
            accessToken
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })
    }
})

router.post('/logout', async (req, res) => {
    const oldToken = req.cookies.refreshToken;
    if (oldToken) {
        const db = getDB();
        await db.collection('refreshTokens').deleteOne({ token: oldToken });
    }
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    return res.status(204).end();
})

router.post('/refresh', async (req, res) => {
    const db = getDB();
    const collection = db.collection('refreshTokens');
    const oldToken = req.cookies.refreshToken;
    if (!oldToken) return res.status(401).json({ error: 'No refresh token' });

    const stored = await collection.findOne({ token: oldToken })
    if (!stored) {
        return res.status(403).json({ error: 'Token reuse detected. Please log in again.' })
    }

    if (stored.expiresAt < new Date()) {
        await collection.deleteOne({ _id: stored._id });
        return res.status(403).json({ error: 'Refresh token expired' })
    }

    await collection.deleteOne({ _id: stored._id });

    const userDoc = await db.collection('users').findOne({ _id: new ObjectId(stored.userId) });
    if (!userDoc) {
        return res.status(403).json({ error: '사용자를 찾을 수 없습니다. 다시 로그인해주세요.' })
    }
    const newAccessToken = generateAccessToken(stored.userId);
    const newRefreshToken = generateRefreshToken();

    await collection.insertOne({
        token: newRefreshToken,
        userId: stored.userId,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        createdAt: new Date()
    });

    res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 14 * 24 * 60 * 60 * 1000
    });

    res.json({
        user: {
            _id: userDoc._id,
            username: userDoc.username,
            email: userDoc.email,
            birth: userDoc.birth,
            createdAt: userDoc.createdAt,
            avatarUrl: userDoc.avatarUrl,
            bio: userDoc.bio
        },
        accessToken: newAccessToken
    });
})

module.exports = router;