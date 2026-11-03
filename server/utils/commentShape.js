const userLookup = (localField, as) => ({
    $lookup: {
        from: 'users',
        localField,
        foreignField: '_id',
        pipeline: [{ $project: { username: 1 } }],
        as,
    },
});

const toObject = field => ({ $set: { [field]: { $ifNull: [{ $first: `$${field}` }, null] } } });

const withUser = [userLookup('userId', 'user'), toObject('user')];
const withReplyTo = [userLookup('replyToUserId', 'replyTo'), toObject('replyTo')];
const stripIds = { $project: { userId: 0, replyToUserId: 0 } };

module.exports = { withUser, withReplyTo, stripIds };