import styles from './SideBar.module.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPinterest } from '@fortawesome/free-brands-svg-icons'
import { faHouse, faSquare, faClipboard, faSquarePlus, faBell, faCommentDots, faSun } from '@fortawesome/free-regular-svg-icons'
import { faHouse as faHouseSolid, faSquare as faSquareSolid, faClipboard as faClipboardSolid, faSquarePlus as faSquarePlusSolid, faBell as faBellSolid, faCommentDots as faCommentDotsSolid, faSun as faSunSolid } from '@fortawesome/free-solid-svg-icons'
import { Link } from "react-router-dom"
import { useSelector } from 'react-redux'
import { showToast } from '../../utils/toast/toast'

function SideBar({ onSelect, state, activePanel }) {
    const auth = useSelector(state => state.auth)
    let username = '';
    if (auth.user) username = auth.user.username;

    function togglePanel(panelName) {
        if (!auth.accessToken) {
            onSelect(null);
            showToast('로그인을 해주세요.');
        } else {
            onSelect(prev => prev === panelName ? null : panelName)
        }
    }

    return (
        <div className={styles.sideBarWrap}>
            <div className={styles.sideBarContainer}>
                <div className={styles.buttonGroupWrapper}>
                    <div className={styles.buttonGroupContainer}>
                        <div className={styles.buttonGroup}>
                            <Link to='/' className={styles.button}>
                                <FontAwesomeIcon className={styles.logo} icon={faPinterest} />
                                <div className={styles.label}>홈</div>
                            </Link>
                            <Link to='/' className={styles.button}>
                                {/* <FontAwesomeIcon icon={(!activePanel && state === 'home') ? faHouseSolid : faHouse} /> */}
                                {
                                    (!activePanel && state === 'home')
                                        ? <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24"><path d="M9.59.92a3.63 3.63 0 0 1 4.82 0l7.25 6.44A4 4 0 0 1 23 10.35v8.46a3.9 3.9 0 0 1-3.6 3.92 106 106 0 0 1-14.8 0A3.9 3.9 0 0 1 1 18.8v-8.46a4 4 0 0 1 1.34-3zM12 16a5 5 0 0 1-3.05-1.04l-1.23 1.58a7 7 0 0 0 8.56 0l-1.23-1.58A5 5 0 0 1 12 16"></path></svg>
                                        : <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24"><path d="M4.6 22.73A107 107 0 0 0 11 23h2.22c2.43-.04 4.6-.16 6.18-.27A3.9 3.9 0 0 0 23 18.8v-8.46a4 4 0 0 0-1.34-3L14.4.93a3.63 3.63 0 0 0-4.82 0L2.34 7.36A4 4 0 0 0 1 10.35v8.46a3.9 3.9 0 0 0 3.6 3.92M13.08 2.4l7.25 6.44a2 2 0 0 1 .67 1.5v8.46a1.9 1.9 0 0 1-1.74 1.92q-1.39.11-3.26.19V16a4 4 0 0 0-8 0v4.92q-1.87-.08-3.26-.19A1.9 1.9 0 0 1 3 18.81v-8.46a2 2 0 0 1 .67-1.5l7.25-6.44a1.63 1.63 0 0 1 2.16 0M13.12 21h-2.24a1 1 0 0 1-.88-1v-4a2 2 0 1 1 4 0v4a1 1 0 0 1-.88 1"></path></svg>
                                }
                                <div className={styles.label}>홈</div>
                            </Link>
                            <Link to={`/${username}`} onClick={() => { if (!auth.accessToken) showToast('로그인을 해주세요.') }} className={styles.button}>
                                {/* <FontAwesomeIcon icon={(!activePanel && state === 'board') ? faClipboardSolid : faClipboard} /> */}
                                {
                                    (!activePanel && state === 'board')
                                        ? <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24"><path d="M11 23H5a4 4 0 0 1-4-4V5a4 4 0 0 1 4-4h6zm12-4a4 4 0 0 1-4 4h-6V13h10zM19 1a4 4 0 0 1 4 4v6H13V1z"></path></svg>
                                        : <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24"><path d="M23 5a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v14a4 4 0 0 0 4 4h14a4 4 0 0 0 4-4zm-10 6V3h6a2 2 0 0 1 2 2v6zm8 8a2 2 0 0 1-2 2h-6v-8h8zM5 3h6v18H5a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2"></path></svg>
                                }
                                <div className={styles.label}>내 보드</div>
                            </Link>
                            <div className={styles.button} onClick={() => togglePanel('upload')}>
                                {/* <FontAwesomeIcon icon={activePanel === 'upload' ? faSquarePlusSolid : faSquarePlus} /> */}
                                {
                                    (activePanel === 'upload')
                                        ? <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24"><path d="M1 5a4 4 0 0 1 4-4h14a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4zm10 6H6v2h5v5h2v-5h5v-2h-5V6h-2z"></path></svg>
                                        : <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24"><path d="M11 11H6v2h5v5h2v-5h5v-2h-5V6h-2zM5 1a4 4 0 0 0-4 4v14a4 4 0 0 0 4 4h14a4 4 0 0 0 4-4V5a4 4 0 0 0-4-4zm16 4v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h14a2 2 0 0 1 2 2"></path></svg>
                                }
                                <div className={styles.label}>만들기</div>
                            </div>
                            <div className={styles.button} onClick={() => togglePanel('alarm')}>
                                {/* <FontAwesomeIcon icon={activePanel === 'alarm' ? faBellSolid : faBell} /> */}
                                {
                                    (activePanel === 'alarm')
                                        ? <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24"><path d="M20.54 14.24A3.15 3.15 0 0 0 23.66 17H24v2h-8v1h-.02a3.4 3.4 0 0 1-3.38 3h-1.2a3.4 3.4 0 0 1-3.38-3H8v-1H0v-2h.34a3.15 3.15 0 0 0 3.12-2.76l.8-6.41a7.8 7.8 0 0 1 15.48 0zM10 19.6c0 .77.63 1.4 1.4 1.4h1.2c.77 0 1.4-.63 1.4-1.4a.6.6 0 0 0-.6-.6h-2.8a.6.6 0 0 0-.6.6"></path></svg>
                                        : <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24"><path d="M16 19h8v-2h-.34a3.15 3.15 0 0 1-3.12-2.76l-.8-6.41a7.8 7.8 0 0 0-15.48 0l-.8 6.41A3.15 3.15 0 0 1 .34 17H0v2h8v1h.02a3.4 3.4 0 0 0 3.38 3h1.2a3.4 3.4 0 0 0 3.38-3H16zm1.75-10.92.8 6.4c.12.95.5 1.81 1.04 2.52H4.4c.55-.7.92-1.57 1.04-2.51l.8-6.41a5.8 5.8 0 0 1 11.5 0M13.4 19c.33 0 .6.27.6.6 0 .77-.63 1.4-1.4 1.4h-1.2a1.4 1.4 0 0 1-1.4-1.4c0-.33.27-.6.6-.6z"></path></svg>
                                }
                                <div className={styles.label}>업데이트</div>
                            </div>
                            <div className={styles.button} onClick={() => togglePanel('message')}>
                                {/* <FontAwesomeIcon icon={activePanel === 'message' ? faCommentDotsSolid : faCommentDots} /> */}
                                {
                                    (activePanel === 'message')
                                        ? <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24"><path d="M17 22.35A11.5 11.5 0 1 1 22.36 17l.64 3.7a2 2 0 0 1-2.3 2.3zM7 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m5 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m5-3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3"></path></svg>
                                        : <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24"><path d="M7 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m5 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m5 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m-5 10c1.8 0 3.5-.41 5-1.15l3.69.65A2 2 0 0 0 23 20.7l-.65-3.7A11.5 11.5 0 1 0 12 23.5m8.55-7.36-.28.58.76 4.31-4.31-.76-.58.28q-1.89.93-4.14.95a9.5 9.5 0 1 1 8.55-5.36"></path></svg>
                                }
                                <div className={styles.label}>메시지</div>
                            </div>
                        </div>
                        <div className={styles.buttonGroup}>
                            <div className={styles.button} onClick={() => togglePanel('settings')}>
                                {/* <FontAwesomeIcon icon={activePanel === 'settings' ? faSunSolid : faSun} /> */}
                                {
                                    (activePanel === 'settings')
                                        ? <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24"><path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0M14.7.3c.73.18 1.25.74 1.43 1.41l.58 2.14 2.14-.57a2 2 0 0 1 1.93.54 12 12 0 0 1 2.7 4.67c.21.72-.01 1.46-.5 1.95L21.4 12l1.57 1.57c.49.49.72 1.23.5 1.94a12 12 0 0 1-2.7 4.67c-.51.55-1.27.73-1.94.55l-2.13-.58-.58 2.14a1.9 1.9 0 0 1-1.43 1.4 12 12 0 0 1-5.4 0 2 2 0 0 1-1.43-1.4l-.58-2.14-2.14.58c-.66.18-1.42 0-1.93-.54a12 12 0 0 1-2.7-4.68c-.22-.72.01-1.46.5-1.95L2.6 12l-1.57-1.56a2 2 0 0 1-.5-1.95 12 12 0 0 1 2.7-4.67 2 2 0 0 1 1.93-.54l2.14.57.58-2.14c.17-.66.7-1.23 1.43-1.4a12 12 0 0 1 5.4 0M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10"></path></svg>
                                        : <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24"><path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10m3 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0m1.13-10.29A2 2 0 0 0 14.7.31a12 12 0 0 0-5.4 0c-.73.17-1.26.74-1.43 1.4l-.58 2.14-2.14-.57a2 2 0 0 0-1.93.54 12 12 0 0 0-2.7 4.67c-.22.72.01 1.46.5 1.95L2.59 12l-1.57 1.56a2 2 0 0 0-.5 1.95 12 12 0 0 0 2.7 4.68c.51.54 1.27.72 1.93.54l2.14-.58.58 2.14c.17.67.7 1.24 1.43 1.4a12 12 0 0 0 5.4 0 2 2 0 0 0 1.43-1.4l.58-2.14 2.13.58c.67.18 1.43 0 1.94-.55a12 12 0 0 0 2.7-4.67 2 2 0 0 0-.5-1.94L21.4 12l1.57-1.56c.49-.5.71-1.23.5-1.95a12 12 0 0 0-2.7-4.67 2 2 0 0 0-1.93-.54l-2.14.57zm-6.34.54a10 10 0 0 1 4.42 0l.56 2.12a2 2 0 0 0 2.45 1.41l2.13-.57a10 10 0 0 1 2.2 3.83L20 10.59a2 2 0 0 0 0 2.83l1.55 1.55a10 10 0 0 1-2.2 3.82l-2.13-.57a2 2 0 0 0-2.44 1.42l-.57 2.12a10 10 0 0 1-4.42 0l-.57-2.12a2 2 0 0 0-2.45-1.42l-2.12.57a10 10 0 0 1-2.2-3.82L4 13.42a2 2 0 0 0 0-2.83L2.45 9.03a10 10 0 0 1 2.2-3.82l2.13.57a2 2 0 0 0 2.44-1.41z"></path></svg>
                                }
                                <div className={styles.label}>설정 및 지원</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SideBar