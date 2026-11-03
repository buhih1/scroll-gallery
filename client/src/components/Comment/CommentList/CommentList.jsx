import { useInfiniteQuery } from '@tanstack/react-query';
import styles from './CommentList.module.css'
import { useEffect, useRef } from 'react';
import Avatar from '../../Avatar/Avatar';
import CommentItem from '../CommentItem/CommentItem';
import { commentKeys } from '../../../hooks/comments/queryKeys';
import { BASE_URL } from '../../../api/config';

export default function CommentList({ pin, scrollRef, commentsExpanded, handleToggleExpandComments }) {
    const sentinelRef = useRef(null);

    const commentsQuery = useInfiniteQuery({
        queryKey: commentKeys.all(pin._id),
        queryFn: ({ pageParam }) => fetchComments(pageParam),
        initialPageParam: null,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        select: (data) => data.pages.flatMap((page) => page.comments),
    })

    async function fetchComments(pageParam) {
        const url = pageParam
            ? `${BASE_URL}/pins/${pin._id}/comments?cursor=${pageParam}&limit=5` // 첫 페이지 외 다음 페이지 요청
            : `${BASE_URL}/pins/${pin._id}/comments?limit=5`; // 첫 페이지 요청
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error)
        }
        return data;
    }

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (
                entries[0].isIntersecting &&
                commentsExpanded &&
                commentsQuery.hasNextPage &&
                !commentsQuery.isFetchingNextPage &&
                !commentsQuery.isFetchNextPageError
            ) {
                commentsQuery.fetchNextPage();
            }
        }, { root: scrollRef.current });

        if (sentinelRef.current) observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [
        commentsExpanded,
        commentsQuery.hasNextPage,
        commentsQuery.isFetchingNextPage,
        commentsQuery.isFetchNextPageError,
        commentsQuery.fetchNextPage,
    ])

    if (commentsQuery.isPending) return <div>로딩중</div>
    if (commentsQuery.isError && !commentsQuery.data) {
        return (
            <div>
                <div>댓글을 불러오지 못했어요.</div>
                <button
                    style={{
                        marginLeft: '8px',
                        textDecoration: 'underline',
                        cursor: commentsQuery.isFetching ? 'default' : 'pointer',
                    }}
                    disabled={commentsQuery.isFetching}
                    onClick={() => commentsQuery.refetch()}>
                    {commentsQuery.isFetching ? '불러오는 중...' : '다시 시도'}
                </button>
            </div>
        )
    }

    const firstComment = commentsQuery.data?.[0];

    return (
        <div>
            <div onClick={commentsExpanded ? undefined : handleToggleExpandComments} className={`${styles.commentList} ${commentsExpanded ? styles.expanded : ''}`}>
                {!commentsExpanded && firstComment &&
                    <div className={styles.commentItem}>
                        <div className={styles.comment}>
                            <Avatar className={styles.commentAvatar} username={firstComment.user.username}></Avatar>
                            <div className={styles.commentRight}>
                                <div className={styles.commentText}>
                                    <span className={styles.foldedCommentUsername}>{firstComment.user.username}</span> {firstComment.text}
                                </div>
                            </div>
                        </div>
                    </div>
                }
                {commentsExpanded && commentsQuery.data.map(comment => (
                    <CommentItem
                        key={comment._id}
                        pin={pin}
                        comment={comment}
                        commentsExpanded={commentsExpanded}
                    />
                ))}
                {commentsExpanded && commentsQuery.isFetchNextPageError && (
                    <div>
                        <span>댓글을 더 불러오지 못했어요.</span>
                        <button
                            style={{
                                marginLeft: '8px',
                                textDecoration: 'underline',
                                cursor: commentsQuery.isFetchingNextPage ? 'default' : 'pointer',
                            }}
                            disabled={commentsQuery.isFetchingNextPage}
                            onClick={() => commentsQuery.fetchNextPage()}>
                            {commentsQuery.isFetchingNextPage ? '불러오는 중...' : '다시 시도'}
                        </button>
                    </div>
                )}
            </div>
            <div ref={sentinelRef} style={{ height: '1px' }} />
        </div>

    )
}