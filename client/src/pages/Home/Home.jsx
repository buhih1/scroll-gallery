import { useRef } from 'react'
import { useEffect, useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import MasonryGrid from '../../components/MasonryGrid/MasonryGrid'
import styles from './Home.module.css'
import { BASE_URL } from '../../api/config'

function Home() {
    const sentinelRef = useRef(null); // infinite scroll 구현용 감지할 element

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isPending,
        isError,
        error,
    } = useInfiniteQuery({
        queryKey: ['pins'],
        queryFn: async ({ pageParam }) => {
            const url = pageParam
                ? `${BASE_URL}/pins?cursor=${pageParam}&limit=5` // 첫 페이지 외 다음 페이지 요청
                : `${BASE_URL}/pins?limit=5`; // 첫 페이지 요청
            const res = await fetch(url);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        },
        initialPageParam: null,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    })

    // 맨아래 감지 옵저버
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                fetchNextPage()
            }
        });
        if (sentinelRef.current) observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])

    // useMemo를 사용하는 이유: 참조동일성을 유지.
    // usememo를 사용하지 않고 그냥 변수로 선언하면 
    // 리렌더링 시 data 값이 이전이랑 같은 값이라도 배열이 새로 생성된다. 
    // 그럼 pins를 의존성으로 가지고 있는 useEffect는 새로운 값으로 인식하고 불필요한 실행이 발생한다.
    // 여기서 불필요한 실행은 pins 배열 안의 내용이 같아도 distributeItems이 불필요하게 계속 실행되는 것이다.
    const pins = useMemo(
        () => data?.pages.flatMap(page => page.pins) ?? [],
        [data] // data(즉 실제 서버 응답)가 바뀔 때만 새로 계산
    );

    if (isError) {
        return <div>Error: {error.message}</div>;
    } else if (isPending) {
        return <div>Loading...</div>
    } else {
        return (
            <>
                <MasonryGrid pins={pins} context='home' />
                <div ref={sentinelRef} style={{ height: '1px' }} />
            </>
        )
    }
}

export default Home