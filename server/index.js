const express = require('express')
const app = express()
const path = require('path')
const cors = require('cors')
require('dotenv').config()
const { connectDB } = require('./database')
const cookieParser = require('cookie-parser')
const authRouter = require('./routes/auth')
const pinsRouter = require('./routes/pins')
const boardsRouter = require('./routes/boards')
const usersRouter = require('./routes/users')
const commentsRouter = require('./routes/comments')
const searchRouter = require('./routes/search')


app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRouter);
app.use('/api/boards', boardsRouter);
app.use('/api/users', usersRouter);
app.use('/api/pins/:id/comments', commentsRouter);
app.use('/api/pins', pinsRouter);
app.use('/api/search', searchRouter);

connectDB().then(() => {
    app.listen(4000, () => console.log('서버가 실행됐습니다'))
})