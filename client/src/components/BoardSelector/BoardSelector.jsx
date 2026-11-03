import styles from './BoardSelector.module.css'
import { useSelector } from 'react-redux';
import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import useClickOutside from '../../hooks/useClickOutside';
import { useModal } from '../../contexts/ModalContext';
import { boardKeys } from '../../api/boards';

export default function BoardSelector({
    isOpen,
    onClose,
    onSelectBoard,
    triggerRef
}) {
    const { showModal } = useModal();
    const auth = useSelector(state => state.auth)
    const [searchQuery, setSearchQuery] = useState('');
    const overlayRef = useRef(null)

    const { data, isLoading, error } = useQuery({
        queryKey: boardKeys.selector(auth.user._id),
        queryFn: async () => {
            if (!auth.user.username) throw new Error('로그인 정보가 없습니다.')
            const res = await fetch(`http://localhost:4000/api/users/${auth.user.username}/boards?limit=50`);
            const resData = await res.json();
            if (!res.ok) throw new Error(resData.error || '보드 목록을 불러오지 못했습니다.');
            return resData;
        },
        enabled: !!auth.user.username,
    })

    useClickOutside([overlayRef, triggerRef], () => {
        if (isOpen) onClose();
    });

    function handleSelectBoard(board) {
        onClose();
        onSelectBoard(board);
        setSearchQuery('');
    }

    function handleCreateBoard() {
        onClose();
        showModal('CREATE_BOARD', {
            onBoardCreated: (newBoard) => { onSelectBoard(newBoard) },
        })
    }

    return <div ref={overlayRef} className={`${styles.overlay} ${isOpen ? '' : styles.hidden}`}>
        <div className={styles.search}>
            <div className={styles.searchIcon}>
                <svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16"><path d="M17.33 18.74a10 10 0 1 1 1.41-1.41l4.47 4.47-1.41 1.41zM11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16"></path></svg>
            </div>
            <input
                className={styles.searchInput}
                type="text"
                placeholder="검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
        <div className={styles.boardList}>
            {data?.boards && searchQuery.length == 0 && <div className={styles.boardListLabel}>모든 보드</div>}
            {isLoading ? <></>
                : (error ? <></>
                    : (data?.boards
                        ? data.boards
                            .filter(board =>
                                board.name.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .map(board => (
                                <div key={board._id} className={styles.boardItem} onClick={() => handleSelectBoard(board)}>{board.name}</div>
                            ))
                        : <p className={styles.emptyLabel}>아래 버튼을 눌러 새 보드를 만들어 보세요.</p>
                    )
                )
            }
        </div>
        <hr />
        <div className={styles.createBoardButton} onClick={handleCreateBoard}>
            <div className={styles.createBoardButtonIcon}>
                <svg aria-hidden="true" height="28" viewBox="0 0 24 24" width="28"><path d="M11 17v-4H7v-2h4V7h2v4h4v2h-4v4zm13-5a12 12 0 1 1-24 0 12 12 0 0 1 24 0M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20"></path></svg>
            </div>
            <div className={styles.createBoardButtonText}>보드 만들기</div>
        </div>
    </div>
}