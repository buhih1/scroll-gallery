import Modal from '../../Modal'
import styles from './DeleteCommentModal.module.css'
import Button from '../../../Button/Button';
import { useDeleteComment } from '../../../../hooks/comments/useDeleteComment';
import { AuthExpiredError } from '../../../../hooks/useAuthFetch';

const buttonStyle = { minHeight: '36px', padding: '4px 10px', border: '1.6px', borderRadius: '12px', fontSize: '14px' };

export default function DeleteCommentModal({ onClose, pinId, commentId }) {
    const deleteCommentMutation = useDeleteComment(pinId);
    const { isPending, isError, error } = deleteCommentMutation;

    function handleDeleteComment() {
        deleteCommentMutation.mutate(commentId, {
            onSuccess: onClose
        })
    }

    return (
        <Modal onClose={onClose}>
            <div className={styles.modalContent}>
                <h1 className={styles.title}>계속할까요?</h1>
                <p className={styles.message}>이 댓글이 삭제됩니다.</p>
                {isError && !(error instanceof AuthExpiredError) &&
                    <div className={styles.globalAlert}>{error.message}</div>}
                <div className={styles.buttons}>
                    <Button variant={isPending ? 'disabled' : 'secondary'} onClick={onClose} disabled={isPending} style={buttonStyle}>취소</Button>
                    <Button variant={isPending ? 'disabled' : 'primary'} onClick={handleDeleteComment} disabled={isPending} style={buttonStyle}>삭제</Button>
                </div>
            </div>
        </Modal>
    )
}