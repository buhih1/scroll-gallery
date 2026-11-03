import { useSelector } from 'react-redux'
import { useModal } from '../../../../contexts/ModalContext'
import Modal from '../../Modal'
import styles from './DeleteBoardModal.module.css'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthFetch } from '../../../../hooks/useAuthFetch'
import Button from '../../../Button/Button'
import { boardKeys } from '../../../../api/boards'
import { BASE_URL } from '../../../../api/config'

export default function DeleteBoardModal({ onClose, board, onDeleted }) {
    const { closeAllModals } = useModal()
    const auth = useSelector(state => state.auth)
    const queryClient = useQueryClient();
    const authFetch = useAuthFetch();

    const {
        mutate: deleteBoard,
        isPending: isDeletingBoard,
        isError: isDeleteBoardError,
        error: deleteBoardError,
    } = useMutation({
        mutationFn: async () => {
            const res = await authFetch(`${BASE_URL}/boards/${board._id}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                const data = await res.json();
                const err = new Error(data.error || '보드 삭제에 실패했습니다.');
                err.status = res.status;
                throw err;
            }
            return { deletedBoardId: board._id };
        },
        onSuccess: (result, variables) => {
            // result = { deletedBoardId: board._id }
            // queryClient.invalidateQueries({ queryKey: ['users', auth.user.username, 'boards'] });
            queryClient.invalidateQueries({ queryKey: ['users', auth.user.username, 'pins'] });
            queryClient.invalidateQueries({ queryKey: boardKeys.list(auth.user._id) });

            closeAllModals();
            onDeleted?.();
            queryClient.removeQueries({ queryKey: boardKeys.detail(board._id) });
            console.log('board delete 성공')
        },
        onError: (err) => {
            console.log(`err: ${err}`)
        }
    });

    function handleDeleteBoard() {
        deleteBoard();
    }

    return (
        <Modal onClose={onClose}>
            <div className={styles.modalContent}>
                <h1 className={styles.title}>이 보드를 삭제할까요?</h1>
                <p className={styles.message}><span className={styles.bold}>{board.name}</span> {`보드와 핀 ${board.pinCount}개가 프로필에서 삭제됩니다.`}</p>
                {isDeleteBoardError &&
                    <div className={styles.globalAlert}>{deleteBoardError.message}</div>}
                <div className={styles.buttons}>
                    <Button variant={isDeletingBoard ? 'disabled' : 'secondary'} onClick={onClose} disabled={isDeletingBoard} style={{ minHeight: '36px', padding: '4px 10px', border: '1.6px', borderRadius: '12px', fontSize: '14px' }}>취소</Button>
                    <Button variant={isDeletingBoard ? 'disabled' : 'primary'} onClick={handleDeleteBoard} disabled={isDeletingBoard} style={{ minHeight: '36px', padding: '4px 10px', border: '1.6px', borderRadius: '12px', fontSize: '14px' }}>삭제</Button>
                </div>

            </div>
        </Modal>
    )
}