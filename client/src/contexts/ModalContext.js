import { createContext, useContext } from 'react';

export const ModalContext = createContext(null);

export function useModal() {
    const context = useContext(ModalContext);
    if (!context) throw new Error('useModal은 ModalProvider 안에서만 사용할 수 있습니다.')
    return context;
}