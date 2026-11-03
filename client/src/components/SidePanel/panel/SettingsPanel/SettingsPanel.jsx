import PanelLayout from '../../PanelLayout/PanelLayout'
import styles from './SettingsPanel.module.css'

function SettingsPanel({ onClose }) {
    return (
        <PanelLayout name="settings" onClose={onClose}>
            <div className={styles.container}></div>
        </PanelLayout>
    )
}

export default SettingsPanel