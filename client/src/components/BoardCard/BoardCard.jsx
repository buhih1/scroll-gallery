import styles from './BoardCard.module.css'
import formatRelativTime from '../../utils/formatRelativeTime'
import { Link, useParams } from 'react-router-dom';
import { useModal } from "../../contexts/ModalContext";
import { useSelector } from 'react-redux';
// _id: 1,
// name: 1,
// description: 1,
// ownerId: 1,
// pinCount: 1,
// coverPins: 1,
// lastPinAddedAt: 1,
// createdAt: 1,

function BoardCard({ board }) {
    const auth = useSelector(state => state.auth)
    const { name, pinCount, coverPins, lastPinAddedAt, createdAt } = board;
    const lastPinAddedRelative = formatRelativTime(lastPinAddedAt);
    const createdRelative = formatRelativTime(createdAt);
    const { showModal } = useModal();
    const { username } = useParams();
    const isOwner = auth.user?.username === username

    function handleEditClick() {
        showModal('EDIT_BOARD', {
            board
        })
    }

    return (
        <div className={styles.card}>
            <div className={styles.coverWrapper}>
                {/* <Link to={`/boards/${board._id}`}> */}
                <Link to={`/${username}/${board.name}`} state={{ board }}>
                    <div className={styles.overlay}></div>
                    <div className={styles.cover}>
                        <div className={styles.left}>
                            <div className={styles.bigBox}>
                                {coverPins[0] && <img src={coverPins[0].imageURL} />}
                            </div>
                        </div>
                        <div className={styles.right}>
                            <div className={styles.smallBoxTop}>
                                {coverPins[1] && <img src={coverPins[1].imageURL} />}
                            </div>
                            <div className={styles.smallBoxBottom}>
                                {coverPins[2] && <img src={coverPins[2].imageURL} />}
                            </div>
                            <div></div>
                        </div>
                    </div>
                </Link>
                <div className={styles.buttonOverlay}>
                    <div className={styles.button}>
                        {
                            isOwner &&
                            <button onClick={handleEditClick} className={styles.iconButton}>
                                <svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16"><path d="M15.3 1.3a4 4 0 0 1 5.53.11l1.76 1.76a4 4 0 0 1 .11 5.53L9.95 21.48a2 2 0 0 1-1.12.57L2.41 23a1 1 0 0 1-.86-.28l-.25-.25a1 1 0 0 1-.28-.86l.95-6.42a2 2 0 0 1 .57-1.12L15.17 1.4l.02-.02zM3.93 15.46l-.57 4.03a1 1 0 0 0 1.13 1.13l4.03-.57L18.58 10 14 5.4zM18.57 2.32a2 2 0 0 0-1.98.5l-.47.47a1 1 0 0 0 0 1.42l3.17 3.17a1 1 0 0 0 1.4.01l.48-.48a2 2 0 0 0 0-2.82l-1.76-1.76a2 2 0 0 0-.84-.5"></path></svg>
                            </button>
                        }
                    </div>
                </div>
            </div>
            <div className={styles.meta}>
                <h2 className={styles.name}>{name}</h2>
                <div className={styles.stats}>
                    <p className={styles.pinCount}>{`핀 ${pinCount}개`}</p>
                    <p className={styles.updatedAt}>{lastPinAddedAt ? lastPinAddedRelative : createdRelative}</p>
                </div>
            </div>
        </div>
    )
}

export default BoardCard