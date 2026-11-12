const multer = require('multer')

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const multerUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIMES.includes(file.mimetype)) {
            const err = new Error('지원하지 않는 이미지 형식입니다.');
            err.status = 415;
            return cb(err);
        }
        cb(null, true);
    },
})

function uploadImage(req, res, next) {
    multerUpload.single('image')(req, res, (err) => {
        if (!err) return next();

        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ error: '이미지 용량은 20MB를 초과할 수 없습니다.' });
            }
            return res.status(400).json({ error: '업로드 요청이 올바르지 않습니다.' });
        }
        if (err.status === 415) {
            return res.status(415).json({ error: err.message });
        }
        console.error(err)
        return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
    })
}

module.exports = uploadImage