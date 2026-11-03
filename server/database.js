const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

let db;

const connectDB = async () => {
    try {
        await client.connect();
        db = client.db('scroll-gallery'); // DB 이름 지정
        await db.collection('users').createIndexes([
            { key: { email: 1 }, unique: true },
            { key: { username: 1 }, unique: true }
        ]);
        await db.collection('boards').createIndex({ ownerId: 1, name: 1 }, { unique: true });
        await db.collection('boardPins').createIndex({ boardId: 1, pinId: 1 }, { unique: true });
        await db.collection('likes').createIndex({ userId: 1, pinId: 1 }, { unique: true });
        await db.collection('likes').createIndex({ pinId: 1 });
        await db.collection('comments').createIndex({ pinId: 1, parentCommentId: 1, _id: 1 });
        console.log('MongoDB 연결 성공');
    } catch (err) {
        console.error('MongoDB 연결 실패:', err.message);
        process.exit(1);
    }
};

const getDB = () => db;
const getClient = () => client;

module.exports = { connectDB, getDB, getClient };