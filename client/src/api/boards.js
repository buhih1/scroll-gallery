import { BASE_URL } from "./config";

export const boardKeys = {
    all: ['boards'],
    list: (userId) => ['boards', 'list', userId],
    selector: (userId) => [...boardKeys.list(userId), 'selector'],
    detail: (boardId) => ['boards', 'detail', boardId],
    pins: (boardId) => ['boards', 'detail', boardId, 'pins'],
};

export const getBoard = async (boardId) => {
    const res = await fetch(`${BASE_URL}/boards/${boardId}`)
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.board;
}

export const getBoardPins = async (boardId, cursor) => {
    const queryString = new URLSearchParams({ limit: cursor ? 5 : 10 });
    if (cursor) queryString.set('cursor', cursor);

    const res = await fetch(`${BASE_URL}/boards/${boardId}/pins?${queryString}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error)
    return data;
}

export const patchBoard = async (authFetch, boardId, updatedBoardData) => {
    const res = await authFetch(`${BASE_URL}/boards/${boardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBoardData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
}

export const deleteBoard = async (authFetch, boardId) => {
    const res = await authFetch(`${BASE_URL}/boards/${boardId}`, {
        method: 'DELETE'
    });
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
    }
}
