import styles from "./PinCard.module.css"
import { useEffect, useRef, useState } from "react"
import PinCardContent from "./PinCardContent/PinCardContent"

function PinCard({ pin, context }) {
    const [isFarOutOfView, setIsFarOutOfView] = useState(false);
    const slotRef = useRef(null);
    const heightRef = useRef(null);

    useEffect(() => {
        let debounceTimer = null;
        const observer = new IntersectionObserver(
            ([entry]) => {
                clearTimeout(debounceTimer);
                if (!entry.isIntersecting) {
                    // 사라지기 직전, 현재 높이를 기록해둠
                    debounceTimer = setTimeout(() => {
                        if (slotRef.current) {
                            heightRef.current = slotRef.current.offsetHeight;
                        }
                        setIsFarOutOfView(true);
                    }, 300);
                } else {
                    setIsFarOutOfView(false);
                }
            },
            { rootMargin: '600px' } // 화면 기준 600px 이상 벗어나야 언마운트
        );
        if (slotRef.current) observer.observe(slotRef.current);
        return () => {
            observer.disconnect();
            clearTimeout(debounceTimer);
        }
    }, []);

    return (
        <div
            ref={slotRef}
            className={styles.pinCardSlot}
            style={isFarOutOfView ? { minHeight: heightRef.current ?? 'auto' } : undefined}
        >
            {isFarOutOfView ? null : <PinCardContent pin={pin} context={context} />}
        </div>
    )
}

export default PinCard