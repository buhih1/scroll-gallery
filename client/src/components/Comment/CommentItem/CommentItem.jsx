import { Link, useNavigate } from 'react-router-dom';
import styles from './CommentItem.module.css'
import formatRelativeTime from '../../../utils/formatRelativeTime';
import Avatar from '../../Avatar/Avatar';
import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import Button from '../../Button/Button';
import { useCreateComment } from '../../../hooks/comments/useCreateComment';
import ReplyItem from '../ReplyItem/ReplyItem';
import { useModal } from '../../../contexts/ModalContext';
import { useFloating, useDismiss, autoUpdate, flip, shift, offset, hide, useInteractions } from '@floating-ui/react';
import { useSelector } from 'react-redux';
import { commentKeys } from '../../../hooks/comments/queryKeys';

export default function CommentItem({ pin, comment, commentsExpanded }) {
    const navigate = useNavigate();
    const sentinelRef = useRef(null);
    const scrollRef = useRef(null);
    const { showModal } = useModal();
    const user = useSelector(state => state.auth.user);

    const [showReplies, setShowReplies] = useState(false)
    const [isInitialState, setIsInitialState] = useState(true)  // 한 번 false가 되면 되돌아가지 않음
    const [replyText, setReplyText] = useState('');
    const [isReplyInputOpen, setIsReplyInputOpen] = useState(false);
    const [isOpenedMoreOptions, setIsOpenedMoreOptions] = useState(false);

    const textareaRef = useRef(null);

    const repliesQuery = useInfiniteQuery({
        queryKey: commentKeys.replies(pin._id, comment._id),
        queryFn: ({ pageParam }) => fetchReplies(pageParam),
        initialPageParam: null,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        select: (data) => data.pages.flatMap((page) => page.replies),
    })

    async function fetchReplies(pageParam) {
        const url = pageParam
            ? `http://localhost:4000/api/pins/${pin._id}/comments/${comment._id}/replies?cursor=${pageParam}&limit=5` // 첫 페이지 외 다음 페이지 요청
            : `http://localhost:4000/api/pins/${pin._id}/comments/${comment._id}/replies?limit=10`; // 첫 페이지 요청
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error)
        }
        return data;
    }

    const createCommentMutation = useCreateComment(pin._id);

    const { refs, floatingStyles, middlewareData, context } = useFloating({
        open: isOpenedMoreOptions,
        onOpenChange: setIsOpenedMoreOptions,
        placement: 'bottom',  // 기본 우선순위: 왼쪽
        middleware: [
            offset(8),                          // 트리거와의 여백
            flip({ fallbackPlacements: ['top', 'right', 'left',] }),  // 공간 없으면 순서대로 전환
            shift(),                            // 뷰포트 밖으로 안 나가게 미세 조정
            hide(),
        ],
        whileElementsMounted: autoUpdate,       // 스크롤/리사이즈 시 자동 재계산
    });

    const dismiss = useDismiss(context);   // 바깥 클릭 + Esc로 닫기
    const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

    useEffect(() => {
        if (!showReplies) return;
        const observer = new IntersectionObserver((entries) => {
            if (
                entries[0].isIntersecting &&
                commentsExpanded &&
                repliesQuery.hasNextPage &&
                !repliesQuery.isFetchingNextPage &&
                !repliesQuery.isFetchNextPageError
            ) {
                repliesQuery.fetchNextPage();
                console.log('fetch 대댓글')
            }
        }, { root: scrollRef.current });

        if (sentinelRef.current) observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [
        showReplies,
        commentsExpanded,
        repliesQuery.hasNextPage,
        repliesQuery.isFetchingNextPage,
        repliesQuery.isFetchNextPageError,
        repliesQuery.fetchNextPage,
    ])

    function handleToggleExpandReplies() {
        setIsInitialState(false);
        setShowReplies(prev => !prev);
    }

    function handleReplyInputOpen() {
        setIsReplyInputOpen(true);
    }

    function handleReplyInputClose() {
        if (replyText.trim()) {
            showModal('DISCARD_REPLY', {
                onReplyDiscarded: () => {
                    setIsReplyInputOpen(false);
                    setReplyText('');
                },
            })
        } else {
            setIsReplyInputOpen(false)
        }
    }

    function handleReplyChange(e) {
        const value = e.target.value;
        setReplyText(value);
    }

    function handleReplySubmit() {
        const trimmedText = replyText.trim();
        createCommentMutation.mutate(
            { text: trimmedText, replyToCommentId: comment._id },
            {
                onSuccess: () => {
                    setIsReplyInputOpen(false);
                    setReplyText('');
                }
            }
        );
    }

    function handleToggleMoreOptions() {
        setIsOpenedMoreOptions(prev => !prev);
    }

    function handleOpenDeleteCommentModal() {
        showModal('DELETE_COMMENT', { pinId: pin._id, commentId: comment._id })
    }

    return (
        <div className={styles.commentItem}>
            <div className={styles.comment}>
                <Avatar className={styles.commentAvatar} onClick={() => navigate(`/${comment.user.username}`)} username={comment.user.username}></Avatar>
                <div className={styles.commentRight}>
                    <div className={`${styles.commentText} ${commentsExpanded ? styles.expanded : ''}`}><Link to={`/${comment.user.username}`} className={styles.commentUsername}>{comment.user.username}</Link> {comment.text}</div>
                    <div className={styles.commentActions}>
                        <div className={styles.commentDate}>{formatRelativeTime(comment.createdAt)}</div>
                        <button onClick={handleReplyInputOpen} className={styles.commentReplyButton}>답변</button>
                        <button
                            ref={refs.setReference}
                            {...getReferenceProps({ onClick: handleToggleMoreOptions })}
                            className={styles.commentMoreButton}>
                            <svg aria-hidden="true" height="12" viewBox="0 0 24 24" width="12"><path d="M2.5 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5m9.5 0a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5m9.5 0a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5"></path></svg>
                        </button>
                        {isOpenedMoreOptions && user?._id === comment.user._id &&
                            <div
                                ref={refs.setFloating}
                                style={{
                                    ...floatingStyles,
                                    visibility: middlewareData.hide?.referenceHidden ? 'hidden' : 'visible'
                                }}
                                className={styles.moreOptions}
                                {...getFloatingProps()}>
                                <div className={styles.moreOptionsButtons}>
                                    <button onClick={handleOpenDeleteCommentModal}>삭제</button>
                                </div>
                            </div>
                        }
                    </div>
                </div>
            </div>

            {isReplyInputOpen &&
                <div className={styles.replyForm}>
                    <div onClick={() => textareaRef.current?.focus()} className={styles.replyFormInput}>
                        <textarea
                            ref={textareaRef}
                            name='replyTextarea'
                            rows={1}
                            value={replyText}
                            onChange={handleReplyChange}
                            spellCheck={false}
                            placeholder='답변을 남기세요'
                        />
                    </div>
                    <div className={styles.replyFormButtons}>
                        <Button onClick={handleReplyInputClose} variant='secondary' style={{ minHeight: '36px', borderRadius: '12px', fontSize: '14px', padding: '4px 10px' }}>취소</Button>
                        <Button onClick={handleReplySubmit} variant={`${replyText ? 'primary' : 'disabled'}`} disabled={!replyText} style={{ minHeight: '36px', borderRadius: '12px', fontSize: '14px', padding: '4px 10px' }}>저장</Button>
                    </div>
                </div>}
            {comment.replies.length > 0 &&
                <div className={styles.replies}>
                    {comment.replyCount > 1 &&
                        <div onClick={handleToggleExpandReplies} className={styles.repliesMoreButton}>
                            <div>⎯⎯</div>
                            {showReplies
                                ? <span>답변 숨기기</span>
                                : <span>답변 {comment.replyCount}개 보기</span>
                            }
                        </div>
                    }
                    <div ref={scrollRef} className={styles.repliesList} style={{ paddingBottom: '1px' }}>
                        {isInitialState &&
                            <ReplyItem
                                reply={comment.replies[0]}
                                pin={pin}
                                commentsExpanded={commentsExpanded}
                            />
                        }
                        {showReplies && repliesQuery.data?.map(reply => {
                            return (
                                <ReplyItem
                                    key={reply._id}
                                    reply={reply}
                                    pin={pin}
                                    commentsExpanded={commentsExpanded} />
                            )
                        })}
                        {showReplies && repliesQuery.isError && !repliesQuery.data && (
                            <div>
                                <span>답변을 불러오지 못했어요.</span>
                                <button
                                    style={{
                                        marginLeft: '8px',
                                        textDecoration: 'underline',
                                        cursor: repliesQuery.isFetching ? 'default' : 'pointer',
                                    }}
                                    onClick={() => repliesQuery.refetch()}
                                    disabled={repliesQuery.isFetching}
                                >
                                    {repliesQuery.isFetching ? '불러오는 중...' : '다시 시도'}
                                </button>
                            </div>
                        )}
                        {showReplies && repliesQuery.isFetchNextPageError && (
                            <div>
                                <span>답변을 더 불러오지 못했어요.</span>
                                <button
                                    style={{
                                        marginLeft: '8px',
                                        textDecoration: 'underline',
                                        cursor: repliesQuery.isFetchingNextPage ? 'default' : 'pointer',
                                    }}
                                    onClick={() => repliesQuery.fetchNextPage()}
                                    disabled={repliesQuery.isFetchingNextPage}
                                >
                                    {repliesQuery.isFetchingNextPage ? '불러오는 중...' : '다시 시도'}
                                </button>
                            </div>
                        )}
                        <div ref={sentinelRef} style={{ height: '1px' }} />
                    </div>
                </div>
            }
        </div>
    )
}