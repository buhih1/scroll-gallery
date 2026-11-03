import { useLocation, useNavigate, useParams } from 'react-router-dom';
import styles from './BoardDetail.module.css'
import { useSelector } from 'react-redux';
import Button from '../../components/Button/Button';
import { useEffect, useRef, useState } from 'react';
import MasonryGrid from '../../components/MasonryGrid/MasonryGrid';
import { useBoard, useBoardPins } from '../../hooks/useBoards';
import { useFloating, useDismiss, autoUpdate, flip, shift, offset, hide, useInteractions } from '@floating-ui/react';
import { useModal } from '../../contexts/ModalContext';

const buttonStyle = { padding: '20px', borderRadius: '24px' };

export default function BoardDetail() {
    const { state } = useLocation();
    const boardId = state?.board._id;
    const auth = useSelector(state => state.auth)
    const { showModal } = useModal();
    const navigate = useNavigate();

    const sentinelRef = useRef(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [isOpenedMoreOptions, setIsOpenedMoreOptions] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);

    const {
        data: board,
        isPending: isBoardPending,
        isError: isBoardError,
        error: boardError,
    } = useBoard(boardId);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isPending: isPinsPending,
        isError: isPinsError,
        error: pinsError,
    } = useBoardPins(boardId);

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

    const pins = data?.pages.flatMap((page) => page.pins) ?? [];

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [isBoardPending, hasNextPage, isFetchingNextPage, fetchNextPage]);

    function handleToggleMoreOptions() {
        setIsOpenedMoreOptions(prev => !prev);
    }

    function handleOpenEditBoardModal() {
        setIsOpenedMoreOptions(false);
        showModal('EDIT_BOARD', {
            board,
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

    const q = searchQuery.trim().toLowerCase();
    const filter = (pin) => !q ||
        pin.title?.toLowerCase().includes(q) ||
        pin.description?.toLowerCase().includes(q);

    if (isDeleted) return null;
    if (isBoardPending) return <p>로딩 중...</p>;
    if (isBoardError) return <p>{boardError.message}</p>;

    const isOwner = auth.user._id === board.ownerId;

    return <div>
        <div className={styles.header}>
            <div className={styles.headerInner}>
                <div className={styles.headerInfo}>
                    <h1>{board.name}</h1>
                    <p className={styles.pinCount}>핀 {board.pinCount}개</p>
                    {board.description && <p className={styles.description}>{board.description}</p>}
                </div>
                <div className={styles.headerActions}>
                    <Button className={styles.shareButton} variant='secondary'>
                        <svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16"><path d="M17.7 5.8 12 .08l-5.7 5.7L7.7 7.2 11 3.9V15h2V3.91l3.3 3.3zM2 18v-5H0v5a4 4 0 0 0 4 4h16a4 4 0 0 0 4-4v-5h-2v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2"></path></svg>
                        <span>공유</span>
                    </Button>
                    {isOwner &&
                        <Button
                            ref={refs.setReference}
                            {...getReferenceProps({ onClick: handleToggleMoreOptions })}
                            className={styles.moreButton}
                            variant={`${isOpenedMoreOptions ? 'selected' : 'secondary'}`}
                            style={buttonStyle}>
                            <svg aria-label="more options" height="24" viewBox="0 0 24 24" width="24"><path d="M2.5 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5m9.5 0a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5m9.5 0a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5"></path></svg>
                        </Button>
                    }
                    {isOpenedMoreOptions &&
                        <div
                            ref={refs.setFloating}
                            style={{
                                ...floatingStyles,
                                visibility: middlewareData.hide?.referenceHidden ? 'hidden' : 'visible'
                            }}
                            className={styles.moreOptions}
                            {...getFloatingProps()}>

                            <div className={styles.moreOptionsButtons}>
                                <div className={styles.moreOptionsLabel}>보드 옵션</div>
                                <button onClick={handleOpenEditBoardModal}>정보 및 설정 수정</button>
                            </div>
                        </div>
                    }
                </div>
            </div>
        </div>
        <div className={styles.bar}>
            <div className={styles.barInner}>
                <div className={styles.search}>
                    <div className={styles.searchIcon}>
                        <svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16"><path d="M17.33 18.74a10 10 0 1 1 1.41-1.41l4.47 4.47-1.41 1.41zM11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16"></path></svg>
                    </div>
                    <input
                        className={styles.searchInput}
                        type="text"
                        placeholder="이 보드 검색"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className={styles.settingButton}>
                    <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24"><path d="M19.87 8H24V6h-4.13a4 4 0 0 0-7.74 0H0v2h12.13a4 4 0 0 0 7.74 0M18 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0m-6.13 9a4 4 0 0 0-7.74 0H0v2h4.13a4 4 0 0 0 7.74 0H24v-2zM10 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0"></path></svg>
                </div>
            </div>
        </div>
        <MasonryGrid
            pins={pins.filter(filter)}
            context='board' />
        <div ref={sentinelRef} style={{ height: '1px' }} />
    </div>
}