import PanelLayout from '../../PanelLayout/PanelLayout'
import styles from './AlarmPanel.module.css'

function AlarmPanel({ onClose }) {
    return (
        <PanelLayout name="alarm" onClose={onClose}>
            <div className={styles.container}></div>
        </PanelLayout>
    )
}

export default AlarmPanel