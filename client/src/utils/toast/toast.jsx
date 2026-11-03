import { Link } from 'react-router-dom';
import styles from './toast.module.css'
import toast from 'react-hot-toast';

export const showToast = (message) =>
    toast(message, {
        position: 'bottom-center',
        className: styles.toast,
    })

export const showBoardSaveToast = (board) =>
    toast(
        <div className={styles.toastContents}>
            <Link to={`/boards/${board._id}`} className={styles.toastMessage}>{board.name}</Link>
            <div className={styles.toastDesc}>에 저장됨</div>
        </div>,
        {
            position: 'bottom-center',
            className: styles.toast,
        }
    );

export const showErrorToast = (message) =>
    toast(
        <div className={styles.errorToastContents}>
            <svg fill='#fff' aria-label="오류 메시지" height="20" viewBox="0 0 24 24" width="20"><path d="m9.2 10.3 2.8 2.79 2.8-2.8 1.4 1.42-2.79 2.79 2.8 2.8-1.42 1.4L12 15.92l-2.8 2.8-1.4-1.42 2.79-2.79-2.8-2.8zM7.68 3.5a5 5 0 0 1 8.66 0l6.93 12a5 5 0 0 1-4.33 7.5H5.07a5 5 0 0 1-4.33-7.5zm1.73 1-6.93 12a3 3 0 0 0 2.6 4.5h13.86a3 3 0 0 0 2.6-4.5l-6.93-12a3 3 0 0 0-5.2 0"></path></svg>
            <p>{message}</p>
        </div>,
        {
            position: 'bottom-center',
            className: styles.errorToast,
        });