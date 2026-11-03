import { BASE_URL } from "./config";

export const postComment = async (authFetch, pinId, { text, replyToCommentId }) => {
    const res = await authFetch(`${BASE_URL}/pins/${pinId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, replyToCommentId }),
    })
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
}

export const deleteComment = async (authFetch, pinId, commentId) => {
    const res = await authFetch(`${BASE_URL}/pins/${pinId}/comments/${commentId}`, {
        method: 'DELETE'
    });
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
    }
}