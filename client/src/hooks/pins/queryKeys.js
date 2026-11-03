export const pinKeys = {
    detail: (pinId) => ['pin', pinId],
    liked: (pinId, userId) => ['pin', pinId, 'liked', userId]
};
