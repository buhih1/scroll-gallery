import { BASE_URL } from "./config";

export const searchKeys = {
    all: ['search'],
    pins: (keyword) => ['search', 'pins', keyword],
    myPins: (keyword) => ['search', 'my-pins', keyword],
};

export const getPins = async (keyword, cursor) => {
    const queryString = new URLSearchParams({ limit: 10, q: keyword });
    if (cursor) queryString.set('cursor', cursor);

    const res = await fetch(`${BASE_URL}/search/pins?${queryString}`)
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
}

export const getMyPins = async (keyword, authFetch, cursor) => {
    const queryString = new URLSearchParams({ limit: 10, q: keyword });
    if (cursor) queryString.set('cursor', cursor);

    const res = await authFetch(`${BASE_URL}/search/my_pins?${queryString}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error)
    return data;
}