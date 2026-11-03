import { useParams, useSearchParams } from 'react-router-dom'
import styles from './Search.module.css'
import { useSelector } from 'react-redux';
import { useEffect } from 'react';
import MasonryGrid from '../../components/MasonryGrid/MasonryGrid';
import { useSearchMyPins, useSearchPins } from '../../hooks/useSearch';
import { useRef } from 'react';

export default function Search() {
    const { type } = useParams();
    const auth = useSelector(state => state.auth)
    const [searchParams] = useSearchParams();

    const q = searchParams.get('q') ?? '';
    const isPins = type === 'pins';
    const isMyPins = type === 'my_pins';
    const isLogined = !!auth.accessToken;
    const needsLogin = isMyPins && !isLogined;

    const pinsQuery = useSearchPins(q, isPins);
    const myPinsQuery = useSearchMyPins(q, isMyPins && isLogined);
    const query = isMyPins ? myPinsQuery : pinsQuery;

    const sentinelRef = useRef(null);

    const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
    const hasData = !!query.data;

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage, hasData]);

    if (!isPins && !isMyPins) return null;
    if (needsLogin) return <div>로그인을 해주세요</div>;
    if (!q) return <div>검색어를 입력하세요</div>;
    if (query.isLoading) return <div>불러오는 중...</div>;
    if (query.isError) return <div>{query.error.message}</div>;

    const pins = query.data.pages.flatMap(page => page.pins);

    return (
        <div>
            <h3 className={styles.heading}>{isMyPins ? '내가 생성한' : '모든'} 핀에서 검색 결과</h3>
            <MasonryGrid pins={pins} context={isMyPins ? 'search' : 'home'} />
            <div ref={sentinelRef} style={{ height: '1px' }} />
        </div>
    )
}