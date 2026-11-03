import { Link, useLocation, useParams } from "react-router-dom"
import styles from "./PinCardContent.module.css"
import Button from "../../Button/Button"
import { useEffect, useRef, useState } from "react"
import BoardSelector from "../../BoardSelector/BoardSelector";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useFloating, autoUpdate, flip, shift, offset, hide } from '@floating-ui/react';
import { useModal } from "../../../contexts/ModalContext";
import { useAuthFetch } from "../../../hooks/useAuthFetch";
import { showBoardSaveToast, showToast } from "../../../utils/toast/toast";
import { boardKeys } from "../../../api/boards";

function PinCardContent({ pin, context }) {
    const auth = useSelector(state => state.auth)
    const isLogined = !!auth.accessToken
    const [isBoardSelectorOpen, setIsBoardSelectorOpen] = useState(false);
    const [isBoardSelectorVisible, setIsBoardSelectorVisible] = useState(true);
    const [selectedBoard, setSelectedBoard] = useState(null);
    const [isSaved, setIsSaved] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const boardTriggerRef = useRef(null);
    const queryClient = useQueryClient();
    const { showModal } = useModal();
    const { state } = useLocation();
    const board = state?.board;
    const { username } = useParams();
    const authFetch = useAuthFetch();
    const isOwner = auth.user?.username === username || (board ? auth.user?._id === board.ownerId : false);

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
            setIsHovered(true)
            if (data?.alreadySaved) {
                // 이미 저장된 핀이라 무효화 스킵
                showToast('이미 저장됨');
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
                method: 'DELETE'
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
            // variables -> { pinId, boardId }
        }
    })

    const { refs, floatingStyles, middlewareData } = useFloating({
        placement: 'left',  // 기본 우선순위: 왼쪽
        middleware: [
            offset(8),                          // 트리거와의 여백
            flip({ fallbackPlacements: ['right', 'bottom', 'top'] }),  // 공간 없으면 순서대로 전환
            shift(),                            // 뷰포트 밖으로 안 나가게 미세 조정
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
        setIsHovered(true);
    }

    function handleEditClick() {
        if (context === 'board') {
            pin.source = 'board';
            pin.board = { _id: board._id, name: board.name };
        }
        if (context === 'search') {
            pin.source = 'own';
        }
        showModal('PIN_EDIT', {
            pin
        })
    }

    return (
        <div
            className={styles.boardSelectorOverlayParent}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={styles.pinCard}>
                <Link to={`/pins/${pin._id}`}>
                    <img className={styles.pinImage} src={pin.imageURL}
                        style={{ aspectRatio: pin.width && pin.height ? `${pin.width} / ${pin.height}` : undefined }}
                    />
                    <div className={styles.overlay} style={{ opacity: isHovered ? 1 : 0 }}>
                        <div className={styles.overlayTop}></div>
                        <div className={styles.overlayBottom}></div>
                    </div>
                </Link>
                <div className={styles.buttonsOverlay} style={{ opacity: isHovered || isBoardSelectorOpen ? 1 : 0 }}>
                    <div className={styles.buttons}>
                        <div className={styles.buttonsTop}>
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
                                                // className={isBoardSelectorOpen ? styles.activedBoardButton : styles.boardButton}
                                                className={styles.boardButton}
                                                aria-expanded={isBoardSelectorOpen}
                                                onClick={toggleBoardSelector}
                                            >
                                                <div className={styles.boardButtonText}>{selectedBoard ? selectedBoard.name : '...'}</div>
                                                <svg className={styles.boardButtonIcon} aria-hidden="true" height="12" viewBox="0 0 24 24" width="12">
                                                    <path d="M23.7 8.7 12 20.42.3 8.71l1.4-1.42L12 17.6 22.3 7.3z"></path>
                                                </svg>
                                            </button>
                                    }
                                    {
                                        isSaved
                                            ? <Button onClick={handleUnsave} disabled={isRemovingFromBoard} variant="selected" style={{ minHeight: 'unset', padding: '0.8em 0.9em', borderRadius: '0.95em' }} className={styles.saveButton}>저장됨</Button>
                                            : <Button onClick={handleSave} disabled={isSavingToBoard} style={{ minHeight: 'unset', padding: '0.8em 0.9em', borderRadius: '0.95em' }} className={styles.saveButton}>저장</Button>
                                    }
                                </>
                            )}
                        </div>
                        <div className={styles.buttonsBottom}>
                            <div className={styles.buttonsBottomLeft}>
                                {
                                    pin.link &&
                                    <a href={pin.link} target="_blank" rel="noopener noreferrer" className={styles.siteButton}>
                                        <svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16"><path d="M20 4v14h-2V7.41L5.7 19.71l-1.4-1.42L16.58 6H6V4z"></path></svg>
                                        <div>사이트 방문</div>
                                    </a>
                                }
                            </div>
                            <div className={styles.buttonsBottomRight}>
                                <button className={styles.iconButton}>
                                    <svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16"><path d="M17.7 5.8 12 .08l-5.7 5.7L7.7 7.2 11 3.9V15h2V3.91l3.3 3.3zM2 18v-5H0v5a4 4 0 0 0 4 4h16a4 4 0 0 0 4-4v-5h-2v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2"></path></svg>
                                </button>
                                {
                                    (((context === 'profile' || context === 'board') && isOwner) || (context === 'search')) &&
                                    <button onClick={handleEditClick} className={styles.iconButton}>
                                        <svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16"><path d="M15.3 1.3a4 4 0 0 1 5.53.11l1.76 1.76a4 4 0 0 1 .11 5.53L9.95 21.48a2 2 0 0 1-1.12.57L2.41 23a1 1 0 0 1-.86-.28l-.25-.25a1 1 0 0 1-.28-.86l.95-6.42a2 2 0 0 1 .57-1.12L15.17 1.4l.02-.02zM3.93 15.46l-.57 4.03a1 1 0 0 0 1.13 1.13l4.03-.57L18.58 10 14 5.4zM18.57 2.32a2 2 0 0 0-1.98.5l-.47.47a1 1 0 0 0 0 1.42l3.17 3.17a1 1 0 0 0 1.4.01l.48-.48a2 2 0 0 0 0-2.82l-1.76-1.76a2 2 0 0 0-.84-.5"></path></svg>
                                    </button>
                                }
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
        </div>
    )
}

export default PinCardContent