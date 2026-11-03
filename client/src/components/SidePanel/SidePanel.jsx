import styles from './SidePanel.module.css'

function SidePanel({ isOpen, children }) {
    return (
        <div className={`${styles.container} ${isOpen ? styles.isOpen : ''}`}>
            {children}
        </div>
    )
}

export default SidePanel