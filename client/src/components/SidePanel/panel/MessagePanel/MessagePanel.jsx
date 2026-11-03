import PanelLayout from '../../PanelLayout/PanelLayout'
import styles from './MessagePanel.module.css'

function MessagePanel({ onClose }) {
    return (
        <PanelLayout name="message" onClose={onClose}>
            <div className={styles.container}></div>
        </PanelLayout>
    )
}

export default MessagePanel