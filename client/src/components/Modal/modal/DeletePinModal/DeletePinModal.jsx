import Modal from '../../Modal'
import styles from './DeletePinModal.module.css'
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import Button from '../../../Button/Button';
import { useModal } from '../../../../contexts/ModalContext';
import { useAuthFetch } from '../../../../hooks/useAuthFetch';
import { pinKeys } from '../../../../hooks/pins/queryKeys';
import { boardKeys } from '../../../../api/boards';
import { searchKeys } from '../../../../api/search';

export default function DeletePinModal({ onClose, pin, mode, onDeleted }) {
    const { closeAllModals } = useModal()
    const auth = useSelector(state => state.auth)
    const queryClient = useQueryClient();
    const authFetch = useAuthFetch();

    const {
        mutate: deletePin,
        isPending: isDeletingPin,
        isError: isDeletePinError,
        error: deletePinError,
    } = useMutation({
        mutationFn: async () => {
            const res = await authFetch(`http://localhost:4000/api/pins/${pin._id}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                const data = await res.json();
                const err = new Error(data.error || '핀 삭제에 실패했습니다.');
                err.status = res.status;
                throw err;
            }
            return { deletedPinId: pin._id };
        },
        onSuccess: (result, variables) => {
            // result = { deletedPinId: pin._id }
            // queryClient.invalidateQueries({ queryKey: ['users', auth.user.username, 'boards'] });
            queryClient.invalidateQueries({ queryKey: ['users', auth.user.username, 'pins'] });
            queryClient.invalidateQueries({ queryKey: boardKeys.all });
            queryClient.invalidateQueries({ queryKey: searchKeys.all });

            // 필요하다면 여기서 pin._id를 직접 씀 (return 값 안 거쳐도 됨)
            queryClient.setQueryData(['pins'], (old) => {
                if (!old) return old;
                return {
                    ...old, // 복제 { pages: [ 응답1, 응답2, ... ], pageParams: [...]}
                    pages: old.pages.map(page => ({
                        ...page,
                        pins: page.pins.filter(p => p._id !== pin._id)
                    }))
                };
            });
            // onClose();
            closeAllModals();
            onDeleted?.();
            queryClient.removeQueries({ queryKey: pinKeys.detail(pin._id) });
            console.log('pin delete 성공')
        },
        onError: (err) => {
            console.log(`err: ${err}`)
        }
    });

    const {
        mutate: removePinFromBoard,
        isPending: isRemovingPinFromBoard,
        isError: isRemovePinFromBoardError,
        error: removePinFromBoardError,
    } = useMutation({
        mutationFn: async () => {
            const res = await authFetch(`http://localhost:4000/api/boards/${pin.board._id}/pins/${pin._id}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                const data = await res.json();
                const err = new Error(data.error || '핀 제거에 실패했습니다.');
                err.status = res.status;
                throw err;
            }
            return { removedPinId: pin._id };
        },
        onSuccess: (result, variables) => {
            // result = { removedPinId: pin._id }
            // queryClient.invalidateQueries({ queryKey: ['users', auth.user.username, 'boards'] });
            queryClient.invalidateQueries({ queryKey: ['users', auth.user.username, 'pins'] });
            queryClient.invalidateQueries({ queryKey: boardKeys.all });

            // onClose();
            closeAllModals();
            console.log('pin remove 성공')
        },
        onError: (err) => {
            console.log(`err: ${err}`)
        }
    });

    function handleDeletePin() {
        if (mode === 'delete') {
            deletePin();
        } else if (mode === 'remove') {
            removePinFromBoard();
        }
    }

    return (
        <Modal onClose={onClose}>
            <div className={styles.modalContent}>
                <h1 className={styles.title}>정말 삭제하시겠어요?</h1>
                {
                    mode === 'delete'
                        ? <p className={styles.message}>이 핀을 삭제하면 영구적으로 삭제되며 이 핀을 저장한 사람들도 볼 수 없습니다.</p>
                        : <p className={styles.message}>핀을 삭제한 후에는 실행을 취소할 수 없습니다!</p>
                }
                {(isDeletePinError || isRemovePinFromBoardError) &&
                    <div className={styles.globalAlert}>{isDeletePinError ? deletePinError.message : removePinFromBoardError.message}</div>}
                <div className={styles.buttons}>
                    <Button variant={isDeletingPin || isRemovingPinFromBoard ? 'disabled' : 'secondary'} onClick={onClose} disabled={isDeletingPin || isRemovingPinFromBoard} style={{ minHeight: '36px', padding: '4px 10px', border: '1.6px', borderRadius: '12px', fontSize: '14px' }}>취소</Button>
                    <Button variant={isDeletingPin || isRemovingPinFromBoard ? 'disabled' : 'primary'} onClick={handleDeletePin} disabled={isDeletingPin || isRemovingPinFromBoard} style={{ minHeight: '36px', padding: '4px 10px', border: '1.6px', borderRadius: '12px', fontSize: '14px' }}>삭제</Button>
                </div>

            </div>
        </Modal>
    )
}