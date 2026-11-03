import PanelLayout from '../../PanelLayout/PanelLayout'
import styles from './UploadPanel.module.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faThumbTack, faClipboard, faScissors } from '@fortawesome/free-solid-svg-icons'
import { useNavigate } from 'react-router-dom';
import { useModal } from '../../../../contexts/ModalContext';

function UploadPanel({ onClose }) {
    const navigate = useNavigate();
    const { showModal } = useModal();

    function handleCreateBoard() {
        onClose();
        showModal('CREATE_BOARD', {
            onBoardCreated: () => { }, // 여기선 필요없는 거 같은데
        })
    }
    return (
        <PanelLayout name="upload" onClose={onClose}>
            <div className={styles.container}>
                <div className={styles.menuItem} onClick={() => {
                    navigate('/pin-creation-tool');
                    onClose();
                }}>
                    <div className={styles.menuIcon}>
                        {/* <FontAwesomeIcon icon={faThumbTack} size='xl' /> */}
                        <svg aria-label="핀 만들기" height="28" viewBox="0 0 24 24" width="28"><path d="M5 3h2a1 1 0 0 1 1 1v3.69l-.92.2a5 5 0 0 0-3.97 4.66l-.1 2.4A1 1 0 0 0 4 16h7v2.3q0 2.7.66 5.33l.09.37h.5l.1-.37a22 22 0 0 0 .65-5.34V16h7a1 1 0 0 0 1-1.1l-.24-2.58a5 5 0 0 0-3.9-4.43l-.86-.2V4a1 1 0 0 1 1-1h2V1H5zm5 1a3 3 0 0 0-.17-1h4.34A3 3 0 0 0 14 4v5.3l2.43.54a3 3 0 0 1 2.34 2.66l.13 1.5H5.05l.06-1.36a3 3 0 0 1 2.38-2.8L10 9.31z"></path></svg>
                    </div>
                    <div className={styles.menuText}>
                        <p className={styles.title}>핀</p>
                        <p className={styles.description}>사진이나 동영상을 게시하고 링크, 스티커, 효과 등을 추가하세요.</p>
                    </div>
                </div>
                <div className={styles.menuItem} onClick={handleCreateBoard}>
                    <div className={styles.menuIcon}>
                        {/* <FontAwesomeIcon icon={faClipboard} size='xl' /> */}
                        <svg aria-label="보드 만들기" height="28" viewBox="0 0 24 24" width="28"><path d="M23 5a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v14a4 4 0 0 0 4 4h14a4 4 0 0 0 4-4zm-10 6V3h6a2 2 0 0 1 2 2v6zm8 8a2 2 0 0 1-2 2h-6v-8h8zM5 3h6v18H5a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2"></path></svg>
                    </div>
                    <div className={styles.menuText}>
                        <p className={styles.title}>보드</p>
                        <p className={styles.description}>보드를 만들어 좋아하는 핀 컬렉션을 정리하세요.</p>
                    </div>
                </div>
                <div className={styles.menuItem} onClick={() => onClose()}>
                    <div className={styles.menuIcon}>
                        {/* <FontAwesomeIcon icon={faScissors} size='xl' /> */}
                        <svg aria-label="콜라주 만들기" height="28" viewBox="0 0 24 24" width="28"><path d="M19.95 1h-4.82a4 4 0 0 0-3.44-.66L3.97 2.4a4 4 0 0 0-2.83 4.9l.25.95a5 5 0 0 1 2-.24l-.32-1.23a2 2 0 0 1 1.41-2.45l7.73-2.07a2 2 0 0 1 2.45 1.41l3.62 13.53a2 2 0 0 1-1.41 2.45l-1.53.4a2 2 0 0 1-.27 1.43L14.13 23h5.82a4 4 0 0 0 4-4V5a4 4 0 0 0-4-4M16.6 3.17 16.54 3h3.41a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-1.3a4 4 0 0 0 1.57-4.31zM4.86 18.64l.48-.33 4.98 2.66q.59.4 1.25.4a2.2 2.2 0 0 0 1.78-.93L7.34 17l6-3.44a2.2 2.2 0 0 0-3.02-.53l-4.98 2.66-.48-.33a3 3 0 1 0-3.48.17L3.6 17l-2.22 1.47a3 3 0 1 0 3.48.17M4 21a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-2-8a1 1 0 1 1 2 0 1 1 0 0 1-2 0"></path></svg>
                    </div>
                    <div className={styles.menuText}>
                        <p className={styles.title}>콜라주</p>
                        <p className={styles.description}>아이디어를 섞고 일치시켜 비전을 구축하고 새로운 것을 만들어 보세요.</p>
                    </div>
                </div>
            </div>
        </PanelLayout>
    )
}

export default UploadPanel