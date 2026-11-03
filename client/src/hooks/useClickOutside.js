import { useEffect, useRef } from "react";

function useClickOutside(refs, callback, enabled = true) {
    const callbackRef = useRef(callback);
    const refsRef = useRef(refs);

    // 매 렌더링마다 최신 값으로 갱신 (effect 재실행 없이)
    callbackRef.current = callback;
    refsRef.current = refs;

    useEffect(() => {
        if (!enabled) return;

        function handleClickOutside(event) {
            const refList = Array.isArray(refsRef.current) ? refsRef.current : [refsRef.current];
            const isInsideAny = refList.some(
                (ref) => ref.current && ref.current.contains(event.target)
            );

            if (!isInsideAny) {
                callbackRef.current();
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [enabled]);
}

export default useClickOutside;