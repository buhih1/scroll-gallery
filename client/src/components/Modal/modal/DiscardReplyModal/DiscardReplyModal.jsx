import Button from '../../../Button/Button';
import Modal from '../../Modal'
import styles from './DiscardReplyModal.module.css'

export default function DiscardReplyModal({ onClose, onReplyDiscarded }) {
    function handleDiscardReply() {
        onReplyDiscarded();
        onClose();
    }

    return (
        <Modal onClose={onClose}>
            <div className={styles.modalContent}>
                <h1 className={styles.title}>정말 삭제하시겠어요?</h1>
                <p className={styles.message}>변경 사항이 삭제됩니다.</p>
                <div className={styles.buttons}>
                    <Button variant='secondary' onClick={onClose} style={{ minHeight: '36px', padding: '4px 10px', border: '1.6px', borderRadius: '12px', fontSize: '14px' }}>취소</Button>
                    <Button variant='primary' onClick={handleDiscardReply} style={{ minHeight: '36px', padding: '4px 10px', border: '1.6px', borderRadius: '12px', fontSize: '14px' }}>변경 사항 삭제</Button>
                </div>

            </div>
        </Modal>
    )
}