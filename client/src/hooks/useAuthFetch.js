import { useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useModal } from "../contexts/ModalContext";
import { login, logout } from "../store/authSlice";

export class AuthExpiredError extends Error { }

let refreshPromise = null; // 모듈 레벨: 동시 401 합치기

export function useAuthFetch() {
    const dispatch = useDispatch();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const { closeAllModals, showLogin } = useModal();

    const tokenRef = useRef(accessToken);
    tokenRef.current = accessToken;

    return useCallback(async (url, options = {}) => {
        const send = (token) =>
            fetch(url, {
                ...options,
                headers: { ...options.headers, Authorization: `Bearer ${token}` },
            });

        const res = await send(tokenRef.current);
        if (res.status !== 401) return res;

        refreshPromise ??= (async () => {
            const r = await fetch('http://localhost:4000/api/auth/refresh', {
                method: 'POST',
                credentials: 'include',
            });
            const data = await r.json();

            if (!r.ok) throw new AuthExpiredError(data.error);

            dispatch(login(data));
            localStorage.setItem('auth', JSON.stringify(data));
            return data;
        })().finally(() => { refreshPromise = null; });

        try {
            const data = await refreshPromise;
            return send(data.accessToken);
        } catch (e) {
            if (e instanceof AuthExpiredError) {
                dispatch(logout());
                localStorage.removeItem('auth');
                closeAllModals();
                showLogin();
            }
            throw e;
        }
    }, [dispatch, closeAllModals, showLogin]);
}