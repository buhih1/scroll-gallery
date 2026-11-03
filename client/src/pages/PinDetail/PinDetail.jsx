import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import styles from './PinDetail.module.css'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Avatar from '../../components/Avatar/Avatar'
import Button from '../../components/Button/Button'
import { useSelector } from 'react-redux'
import { useFloating, useDismiss, autoUpdate, flip, shift, offset, hide, useInteractions } from '@floating-ui/react';
import BoardSelector from '../../components/BoardSelector/BoardSelector'
import { useAuthFetch } from '../../hooks/useAuthFetch'
import toast from 'react-hot-toast';
import CommentList from '../../components/Comment/CommentList/CommentList'
import { useCreateComment } from '../../hooks/comments/useCreateComment'
import { pinKeys } from '../../hooks/pins/queryKeys'
import { useModal } from '../../contexts/ModalContext'
import { showBoardSaveToast, showErrorToast, showToast } from '../../utils/toast/toast'
import { boardKeys } from '../../api/boards'

function PinDetail() {
    const auth = useSelector(state => state.auth)
    const isLogined = !!auth.accessToken
    const { id } = useParams()
    const navigate = useNavigate();
    const authFetch = useAuthFetch();
    const queryClient = useQueryClient();
    const { showModal } = useModal();

    // TODO: 상세 페이지 안에서 다른 핀으로 이동하는 경로(관련 핀, 알림 링크 등)가 생기면
    // /pins/A → /pins/B 이동 시 리마운트되지 않아 아래 로컬 state가 이전 핀 값으로 남음 → 초기화 방법 필요
    const [descriptionExpanded, setDescriptionExpanded] = useState(false);
    const [commentsExpanded, setCommentsExpanded] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isMultiline, setIsMultiline] = useState(false);

    const [isBoardSelectorOpen, setIsBoardSelectorOpen] = useState(false);
    const [isBoardSelectorVisible, setIsBoardSelectorVisible] = useState(true);
    const [selectedBoard, setSelectedBoard] = useState(null);
    const [isSaved, setIsSaved] = useState(false);
    const [isOpenedMoreOptions, setIsOpenedMoreOptions] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);
    const [isClamped, setIsClamped] = useState(false);

    const boardTriggerRef = useRef(null);
    const textareaRef = useRef(null);
    const scrollRef = useRef(null);
    const descriptionRef = useRef(null);

    const { data: pin, isLoading, error } = useQuery({
        queryKey: pinKeys.detail(id),
        queryFn: async () => {
            const res = await fetch(`http://localhost:4000/api/pins/${id}`)
            const data = await res.json();
            if (!res.ok) {
                const err = new Error(data.error)
                err.status = res.status   // retry 함수에서 판단할 수 있게 부착
                throw err
            }
            return data.pin;
        },
        retry: (failureCount, error) => {
            if (error.status >= 400 && error.status < 500) return false
            return failureCount < 3
        },
        enabled: !isDeleted,
    })

    // 로그인 되어있을 시, 좋아요 여부
    const { data: likedData, isLoading: isLikedLoading, error: likedError } = useQuery({
        queryKey: pinKeys.liked(id, auth.user._id),
        queryFn: async () => {
            const res = await authFetch(`http://localhost:4000/api/pins/${id}/likes/me`);
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error);
            }
            return data.liked;
        },
        enabled: isLogined,
    })

    const liked = likedData ?? false;

    const likeMutation = useMutation({
        onMutate: async (currentlyLiked) => {
            // 낙관적으로 바꾸는 두 쿼리만 정확히 취소
            // 서버에 좋아요 데이터를 반영하기 전에 캐시만 먼저 업데이트 하는 과정이므로
            // 이미 핀 상세 관련 요청이 날라가 있는 경우 
            // 그 요청이 응답하는 서버 좋아요 데이터는 오래된 값이 된다.
            // 따라서 요청 중에 좋아요가 눌린 경우 그 요청을 취소해준다.
            await Promise.all([
                queryClient.cancelQueries({ queryKey: pinKeys.detail(id), exact: true }),
                queryClient.cancelQueries({ queryKey: pinKeys.liked(id, auth.user._id), exact: true }),
            ]);

            const prevPin = queryClient.getQueryData(pinKeys.detail(id));
            const prevLiked = queryClient.getQueryData(pinKeys.liked(id, auth.user._id));

            queryClient.setQueryData(pinKeys.detail(id), (old) => ({
                ...old,
                likeCount: old.likeCount + (currentlyLiked ? -1 : 1),
            }));
            queryClient.setQueryData(pinKeys.liked(id, auth.user._id), !currentlyLiked);

            return { prevPin, prevLiked };
        },
        mutationFn: async (currentlyLiked) => {
            const res = await authFetch(`http://localhost:4000/api/pins/${id}/likes/`, {
                method: currentlyLiked ? 'DELETE' : 'POST'
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error);
            }

            return data; // { likeCount }
        },
        onError: (err, currentlyLiked, context) => {
            queryClient.setQueryData(pinKeys.detail(id), context.prevPin);
            queryClient.setQueryData(pinKeys.liked(id, auth.user._id), context.prevLiked);
        },
        onSettled: () => {
            return Promise.all([
                queryClient.invalidateQueries({ queryKey: pinKeys.detail(id), exact: true }),
                queryClient.invalidateQueries({ queryKey: pinKeys.liked(id, auth.user._id), exact: true }),
            ]);
        }
    })

    const { mutate: saveToBoard, isPending: isSavingToBoard } = useMutation({
        mutationFn: async ({ pinId, boardId }) => {
            const res = await authFetch(`http://localhost:4000/api/boards/${boardId}/pins`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ pinId }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (res.status === 409) return { alreadySaved: true };
                throw new Error(data.error || '저장 실패');
            }
            return data
        },
        onSuccess: (data, variables) => {
            setIsSaved(true)
            // setIsHovered(true)
            if (data?.alreadySaved) {
                // 이미 저장된 핀이라 무효화 스킵
                toast(`이미 저장됨`, {
                    position: 'bottom-center',
                    className: styles.toast,
                })
            } else {
                // queryClient.invalidateQueries({ queryKey: ['users', auth.user.username, 'boards'] });
                queryClient.invalidateQueries({ queryKey: ['users', auth.user.username, 'pins'] });
                queryClient.invalidateQueries({ queryKey: boardKeys.all });
                // variables -> { pinId, boardId }
                showBoardSaveToast(selectedBoard);
            }
        }
    })

    // 해당 보드에서 핀 삭제 쿼리(저장됨 버튼 눌렀을 때)
    const { mutate: removeFromBoard, isPending: isRemovingFromBoard } = useMutation({
        mutationFn: async ({ pinId, boardId }) => {
            const res = await authFetch(`http://localhost:4000/api/boards/${boardId}/pins/${pinId}`, {
                method: 'DELETE',
            })

            if (res.status === 204) {
                return null;  // body 없음, 파싱 스킵하고 바로 성공 처리
            }

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '삭제 실패');
            }
            return data;
        },
        onSuccess: (data, variables) => {
            setIsSaved(false)
            showToast('보드에서 삭제되었습니다!');
            // queryClient.invalidateQueries({ queryKey: ['users', auth.user.username, 'boards'] });
            queryClient.invalidateQueries({ queryKey: ['users', auth.user.username, 'pins'] });
            queryClient.invalidateQueries({ queryKey: boardKeys.all });

            console.log(`삭제 성공: ${data}, ${variables}`)
            // variables -> { pinId, boardId }
        }
    })

    const createCommentMutation = useCreateComment(id);

    useLayoutEffect(() => {
        const el = descriptionRef.current;
        if (!el) return;

        const checkClamped = () => {
            if (descriptionExpanded) return;
            setIsClamped(el.scrollHeight > el.clientHeight);
        };

        checkClamped();

        const observer = new ResizeObserver(checkClamped);
        observer.observe(el);
        return () => observer.disconnect();
    }, [pin?.description, descriptionExpanded])

    const { refs, floatingStyles, middlewareData } = useFloating({
        placement: 'left',  // 기본 우선순위: 왼쪽
        middleware: [
            offset(8),                          // 트리거와의 여백
            flip({ fallbackPlacements: ['right', 'bottom', 'top'] }),  // 공간 없으면 순서대로 전환
            shift({ padding: 16 }),                            // 뷰포트 밖으로 안 나가게 미세 조정
            hide(),
        ],
        whileElementsMounted: autoUpdate,       // 스크롤/리사이즈 시 자동 재계산
    });

    useEffect(() => {
        if (isBoardSelectorOpen) {
            if (middlewareData.hide?.referenceHidden) {
                setIsBoardSelectorVisible(false)
            } else {
                setIsBoardSelectorVisible(true)
            }
        }
    }, [middlewareData.hide?.referenceHidden])

    const moreOptionsFloating = useFloating({
        open: isOpenedMoreOptions,
        onOpenChange: setIsOpenedMoreOptions,
        placement: 'bottom',
        middleware: [offset(8), flip({ fallbackPlacements: ['top', 'right', 'left'] }), shift(), hide()],
        whileElementsMounted: autoUpdate,
    });
    const dismiss = useDismiss(moreOptionsFloating.context);
    const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

    if (isDeleted) return null;

    function handleSelectBoard(board) {
        setSelectedBoard(board)
        saveToBoard({ pinId: pin._id, boardId: board._id })
    }

    function handleUnsave() {
        removeFromBoard({ pinId: pin._id, boardId: selectedBoard._id })
    }

    function handleSave() {
        if (!selectedBoard) {
            setIsBoardSelectorOpen(true)
            return
        }
        saveToBoard({ pinId: pin._id, boardId: selectedBoard._id })
    }

    function toggleBoardSelector() {
        setIsBoardSelectorOpen(prev => !prev)
    }

    function setTriggerRefs(node) {
        boardTriggerRef.current = node;   // 기존 ref (다른 곳에서 계속 쓰고 있을 테니 유지)
        refs.setReference(node);          // floating-ui가 필요로 하는 ref
    }

    function handleCloseBoardselector() {
        setIsBoardSelectorOpen(false);
        // setIsHovered(true);
    }


    function handleNavigateToProfile() {
        navigate(`/${pin.owner?.username}`)
    }

    function handleToggleExpandDescription() {
        setDescriptionExpanded(prev => !prev);
    }

    function handleToggleExpandComments() {
        setCommentsExpanded(prev => !prev)
    }

    function handleCommentChange(e) {
        const value = e.target.value;
        setCommentText(value);
        setIsMultiline(value.includes('\n'));
    }

    function handleCommentSubmit() {
        const trimmedText = commentText.trim();
        createCommentMutation.mutate(
            { text: trimmedText },
            { onSuccess: () => setCommentText('') }
        );
    }

    function handleToggleLike() {
        likeMutation.mutate(liked);
    }

    function handleToggleMoreOptions() {
        setIsOpenedMoreOptions(prev => !prev)
    }

    function handleOpenEditPinModal() {
        setIsOpenedMoreOptions(false);
        showModal('PIN_EDIT', {
            pin,
            onDeleted: () => {
                setIsDeleted(true);
                if (window.history.state?.idx > 0) {
                    navigate(-1);
                } else {
                    navigate('/', { replace: true });
                }
            }
        })
    }

    async function handleDownloadImage() {
        setIsOpenedMoreOptions(false);
        try {
            const res = await fetch(pin.originalURL);
            if (!res.ok) throw new Error('이미지를 불러오지 못했습니다.');

            const blob = await res.blob();
            const ext = blob.type.split('/')[1] || 'jpg';
            const url = URL.createObjectURL(blob);
            const imageName = pin.title || pin.description || '다운로드';

            const a = document.createElement('a');
            a.href = url;
            a.download = `${imageName}.${ext}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            showToast('이미지를 다운로드했습니다!');
            // toast('이미지를 다운로드했습니다!', {
            //     position: 'bottom-center',
            //     className: styles.toast,
            // })
        } catch (err) {
            showErrorToast('이미지 다운로드에 실패했습니다.');
            console.log(`download err: ${err}`)
        }
    }
    if (isLoading) return <div>Loading...</div>
    if (error) return <div>에러: {error.message}</div>

    return (
        <>
            <div className={styles.container}>
                <div className={styles.pinDetailCard}>
                    <div className={styles.pinImageContainer}>
                        <img className={styles.pinImage} src={pin.imageURL} />
                    </div>
                    <div className={styles.pinInfoContainer}>
                        <div className={styles.topBar}>
                            <div className={styles.topBarLeft}>
                                <div className={styles.like}>
                                    <button
                                        onClick={handleToggleLike}
                                        disabled={likeMutation.isPending || isLikedLoading || !isLogined || likedError}
                                        aria-pressed={liked}
                                        className={styles.likeButton}>
                                        {liked
                                            ? <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24"><path d="M0 9c0 6.18 8.97 11.59 11.07 12.76q.43.24.93.24t.93-.24C15.03 20.6 24 15.18 24 9v-.53a6.47 6.47 0 0 0-11.44-4.14L12 5l-.56-.67A6.47 6.47 0 0 0 0 8.47z"></path></svg>
                                            : <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24"><path d="M14.1 5.6A4.47 4.47 0 0 1 22 8.48V9c0 2.18-1.65 4.56-4.1 6.78a35 35 0 0 1-5.9 4.21 35 35 0 0 1-5.9-4.21C3.64 13.56 2 11.18 2 9v-.53a4.47 4.47 0 0 1 7.9-2.86L12 8.12zm-3.47-2.08A6.47 6.47 0 0 0 0 8.47V9c0 6.18 8.97 11.59 11.07 12.76q.43.24.93.24t.93-.24C15.03 20.6 24 15.18 24 9v-.53a6.47 6.47 0 0 0-11.44-4.14L12 5l-.56-.67q-.38-.45-.8-.81"></path></svg>}
                                    </button>
                                    <div className={styles.likeCount}>{pin.likeCount}</div>
                                </div>
                                <button onClick={() => setCommentsExpanded(true)} className={styles.commentButton}>
                                    <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24"><path d="m20.27 16.72.28-.58q.93-1.89.95-4.14a9.5 9.5 0 1 0-5.36 8.55l.58-.28 4.31.76zm-3.26 5.63A11.5 11.5 0 1 1 22.36 17l.64 3.7a2 2 0 0 1-2.3 2.3z"></path></svg>
                                </button>
                                <button className={styles.shareButton}>
                                    <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24"><path d="M17.7 5.8 12 .08l-5.7 5.7L7.7 7.2 11 3.9V15h2V3.91l3.3 3.3zM2 18v-5H0v5a4 4 0 0 0 4 4h16a4 4 0 0 0 4-4v-5h-2v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2"></path></svg>
                                </button>
                                <button
                                    ref={moreOptionsFloating.refs.setReference}
                                    {...getReferenceProps({ onClick: handleToggleMoreOptions })}
                                    className={`${styles.moreButton} ${isOpenedMoreOptions ? styles.selected : ''}`}>
                                    <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24"><path d="M2.5 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5m9.5 0a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5m9.5 0a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5"></path></svg>
                                </button>
                                {isOpenedMoreOptions &&
                                    <div
                                        ref={moreOptionsFloating.refs.setFloating}
                                        style={{
                                            ...moreOptionsFloating.floatingStyles,
                                            visibility: moreOptionsFloating.middlewareData.hide?.referenceHidden ? 'hidden' : 'visible'
                                        }}
                                        className={styles.moreOptions}
                                        {...getFloatingProps()}>
                                        <div className={styles.moreOptionsButtons}>
                                            {auth.user?._id === pin.owner._id && <button onClick={handleOpenEditPinModal}>핀 수정</button>}
                                            <button onClick={handleDownloadImage}>이미지 다운로드</button>
                                        </div>
                                    </div>
                                }
                            </div>
                            <div className={styles.topBarRight}>
                                {isLogined && (
                                    <>
                                        {
                                            isSaved
                                                ? <Link to={`/boards/${selectedBoard._id}`} className={styles.boardLink}>
                                                    <span className={styles.boardLinkText}>{selectedBoard.name}</span>
                                                </Link>
                                                : <button
                                                    ref={setTriggerRefs}
                                                    disabled={isSavingToBoard || isRemovingFromBoard}
                                                    className={styles.boardButton}
                                                    aria-expanded={isBoardSelectorOpen}
                                                    onClick={toggleBoardSelector}
                                                >
                                                    <div className={styles.boardButtonText}>{selectedBoard ? selectedBoard.name : '...'}</div>
                                                    <svg className={styles.boardButtonIcon} aria-expanded={isBoardSelectorOpen} aria-hidden="true" height="12" viewBox="0 0 24 24" width="12">
                                                        <path d="M23.7 8.7 12 20.42.3 8.71l1.4-1.42L12 17.6 22.3 7.3z"></path>
                                                    </svg>
                                                </button>
                                        }
                                        {
                                            isSaved
                                                ? <Button onClick={handleUnsave} disabled={isRemovingFromBoard} variant="selected" className={styles.saveButton} style={{ minHeight: 'unset', padding: '0.8em 0.9em', borderRadius: '0.95em' }}>저장됨</Button>
                                                : <Button onClick={handleSave} disabled={isSavingToBoard} className={styles.saveButton} style={{ minHeight: 'unset', padding: '0.8em 0.9em', borderRadius: '0.95em' }}>저장</Button>
                                        }
                                    </>
                                )}
                            </div>

                        </div>
                        <div className={styles.pinInfo}>
                            <div className={styles.profile}>
                                <Avatar onClick={handleNavigateToProfile} className={styles.profileAvatar} username={pin.owner?.username} size={24} />
                                <div onClick={handleNavigateToProfile} className={styles.profileName}>{pin.owner?.username}</div>
                            </div>
                            {pin.title && <h1 className={styles.title}>{pin.title}</h1>}
                            {pin.link &&
                                <div className={styles.linkButtonWrapper}>
                                    <a className={styles.linkButton} href={pin.link} target="_blank" rel="noopener noreferrer" >사이트 방문</a>
                                </div>}
                            <div ref={scrollRef} className={styles.scroll}>
                                {pin.description &&
                                    <div className={styles.description}>
                                        <h4>설명</h4>
                                        <p ref={descriptionRef} className={`${styles.descriptionText} ${descriptionExpanded ? styles.expanded : ''}`}>{pin.description}</p>
                                        {(isClamped || descriptionExpanded) &&
                                            <div className={styles.descriptionButton}>
                                                <button onClick={handleToggleExpandDescription}>{descriptionExpanded ? '덜 보기' : '더 보기'}</button>
                                            </div>}
                                    </div>}
                                {pin.commentCount > 0 && <>
                                    <div className={styles.divider}>
                                        <div className={styles.dividerInner}></div>
                                    </div>
                                    <div className={styles.comments}>
                                        <div className={styles.commentsTopBar} onClick={handleToggleExpandComments}>
                                            <h2 className={styles.commentsLabel}>댓글 {pin.commentCount}개</h2>
                                            <div
                                                className={`${styles.commentsExpandedButton} ${commentsExpanded ? styles.expanded : ''}`}
                                            >
                                                <svg aria-hidden="true" data-test-id="collapse-button" height="16" viewBox="0 0 24 24" width="16"><path d="M23.7 8.7 12 20.42.3 8.71l1.4-1.42L12 17.6 22.3 7.3z"></path></svg>
                                            </div>
                                        </div>
                                        <CommentList
                                            pin={pin}
                                            scrollRef={scrollRef}
                                            commentsExpanded={commentsExpanded}
                                            handleToggleExpandComments={handleToggleExpandComments}
                                        />
                                    </div>
                                </>}
                            </div>
                        </div>
                        <div className={styles.pinInfoFooter}>
                            <div className={`${styles.commentForm} ${isMultiline ? styles.isMultiline : ''}`}>
                                <div onClick={() => textareaRef.current?.focus()} className={styles.commentFormInput}>
                                    <textarea
                                        ref={textareaRef}
                                        name='comment'
                                        rows={1}
                                        value={commentText}
                                        onChange={handleCommentChange}
                                        spellCheck={false}
                                        placeholder='댓글 추가'
                                    />
                                </div>
                                {commentText &&
                                    <div className={`${styles.commentFormSubmit} ${isMultiline ? styles.isMultiline : ''}`}>
                                        <Button onClick={handleCommentSubmit} className={styles.submitButton} style={{ minHeight: 'unset', padding: '0', borderRadius: '8px' }}>
                                            <svg fill="currentColor" aria-hidden="true" height="16" viewBox="0 0 24 24" width="16"><path d="M4.07 1.37a2.1 2.1 0 0 0-2.8 2.59L3.94 12l-2.69 8.04a2.1 2.1 0 0 0 2.81 2.6l18.1-7.7A3 3 0 0 0 24 12.18v-.36a3 3 0 0 0-1.83-2.76zm-.89 1.86a.1.1 0 0 1 .1-.02l18.11 7.7a1 1 0 0 1 .61.91v.36a1 1 0 0 1-.6.92L3.28 20.8a.1.1 0 0 1-.13-.12L5.72 13H14v-2H5.72L3.16 3.33a.1.1 0 0 1 .02-.1"></path></svg>
                                        </Button>
                                    </div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {isBoardSelectorOpen &&
                <div ref={refs.setFloating}
                    style={{
                        ...floatingStyles,
                        opacity: isBoardSelectorVisible ? 1 : 0,
                        zIndex: 300
                    }}
                    className={styles.boardSelectorOverlay}>
                    <BoardSelector
                        isOpen={isBoardSelectorOpen}
                        onClose={handleCloseBoardselector}
                        onSelectBoard={handleSelectBoard}
                        triggerRef={boardTriggerRef}
                    />
                </div>
            }
        </>
    )
}

export default PinDetail