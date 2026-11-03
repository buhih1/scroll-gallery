const { ObjectId } = require('mongodb');

function parseLimit(raw, { defaultValue = 10, max = 50 } = {}) {
    if (raw === undefined) return defaultValue;
    if (typeof raw !== 'string' || !/^\d+$/.test(raw)) return null;
    const num = Number(raw);
    if (num < 1) return null; // 0인 경우
    return Math.min(num, max);
}

function parseCursor(raw) {
    if (raw === undefined) return undefined;
    if (typeof raw !== 'string' || !ObjectId.isValid(raw)) return null;
    return new ObjectId(raw);
}

module.exports = { parseLimit, parseCursor };