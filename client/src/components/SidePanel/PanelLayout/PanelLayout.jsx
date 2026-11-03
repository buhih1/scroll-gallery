import styles from './PanelLayout.module.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'


function PanelLayout({ name, onClose, children }) {
    let title

    if (name === 'upload') title = '만들기'
    else if (name === 'alarm') title = '알림'
    else if (name === 'message') title = '메시지'
    else if (name === 'settings') title = '설정 및 지원'

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>{title}</h3>
                <button className={styles.closeButton} onClick={() => { onClose() }}>
                    <FontAwesomeIcon icon={faXmark} />
                </button>
            </div>
            {children}
        </div>
    )
}

export default PanelLayout