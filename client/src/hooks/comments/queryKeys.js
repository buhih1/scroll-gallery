// hooks/comments/queryKeys.js
export const commentKeys = {
    all: (pinId) => ['pin', pinId, 'comments'],
    replies: (pinId, commentId) => ['pin', pinId, 'comments', commentId, 'replies'],
};