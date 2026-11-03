import styles from './MasonryGrid.module.css'
import { useRef, useState } from 'react'
import { useEffect } from 'react'
import PinCard from '../../components/PinCard/PinCard'

function MasonryGrid({ pins, context = "home" }) {
    const [cols, setCols] = useState([]); // 배열된 pin들
    const [colCount, setColCount] = useState(getColCount(null)); // 열 개수

    const columnsRef = useRef(Array.from({ length: colCount }, () => [])) // 이전에 배열된 pin들, pin들 배치 기억
    const columnHeightsRef = useRef(new Array(colCount).fill(0)) // 이전에 계산된 열 높이들 기역
    const renderedKeysRef = useRef([]);// 이전에 배치된 pin 키들(배치 순서 그대로)
    const containerRef = useRef(null); // resize용

    // 리사이즈 옵저버
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const observer = new ResizeObserver((entries) => {
            const width = entries[0].contentRect.width;
            setColCount(getColCount(width));
        });

        observer.observe(el);
        return () => observer.disconnect()
    }, []);

    function resetColumns() {
        columnsRef.current = Array.from({ length: colCount }, () => []) // 기존 기억된 배치를 colCount에 맞게 초기화
        columnHeightsRef.current = new Array(colCount).fill(0) // 기존 기억된 높이를 colCount에 맞게 초기화
        renderedKeysRef.current = [];
    }

    function distributeItems() {
        const CARD_MARGIN = 10;
        const getKey = (p) => p.sortId ?? p._id;
        const keys = pins.map(getKey);

        // 기존 목록이 새 목록의 앞부분과 정확히 같으면 "뒤에만 늘어난 경우"
        const prevKeys = renderedKeysRef.current;
        const isAppendOnly =
            prevKeys.length <= keys.length &&
            prevKeys.every((k, i) => k === keys[i]);

        if (!isAppendOnly) {
            resetColumns();
        }

        const columns = columnsRef.current;
        const columnHeights = columnHeightsRef.current;

        // 이미 배치된 pin 내용 최신화
        const pinsMap = new Map(pins.map(p => [getKey(p), p]));
        columns.forEach(column => {
            column.forEach((item, idx) => {
                const updated = pinsMap.get(getKey(item));
                if (updated) column[idx] = updated;
            })
        })

        // 새 pin만 배치
        const slicedPins = pins.slice(renderedKeysRef.current.length)
        slicedPins.forEach(pin => {
            const shortestIndex = columnHeights.indexOf(Math.min(...columnHeights))
            columns[shortestIndex].push(pin)
            const height = 250 * pin.height / pin.width
            columnHeights[shortestIndex] += height + CARD_MARGIN * 2
        });

        renderedKeysRef.current = keys;
    }

    // 새로운 pin들이 요청될 때마다 새로운 pin들만 계산해서 배치
    useEffect(() => {
        distributeItems(); // 배치된 pin들
        setCols([...columnsRef.current]); // 배치된 pin들 cols에 주입. cols가 바뀌면 실제 UI 바뀜.
    }, [pins])

    // colCount가 변경됐을 때 전체 재계산
    useEffect(() => {
        resetColumns();
        distributeItems();
        setCols([...columnsRef.current]);
    }, [colCount])

    // 화면 너비별 열 개수 반환 함수
    function getColCount(width) {
        if (!width) width = window.innerWidth;
        if (width <= 600) return 2;
        else if (width <= 900) return 3;
        else if (width <= 1200) return 4;
        else return 5;
    }

    return (
        <>
            <div ref={containerRef} className={styles.imgContainer}>
                {
                    cols.map((col, idx) => (
                        <div key={idx} className={styles.imgColumn}>
                            {
                                col.map((pin) => (
                                    <PinCard key={pin.sortId ?? pin._id} pin={pin} context={context}></PinCard>
                                ))
                            }
                        </div>
                    ))
                }
            </div>
        </>
    )
}

export default MasonryGrid