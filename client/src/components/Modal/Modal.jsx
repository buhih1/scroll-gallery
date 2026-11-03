import { useRef } from 'react'
import styles from './Modal.module.css'
import useClickOutside from '../../hooks/useClickOutside'

export default function Modal({ onClose, children, isTop = true }) {
    const modalRef = useRef(null)
    useClickOutside(modalRef, onClose, isTop)

    return (
        <div className={styles.overlay}>
            <div ref={modalRef} className={styles.modal}>
                {children}
            </div>
        </div>
    )
}