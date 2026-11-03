import { Link, matchPath, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom"
import styles from './NavBar.module.css'
import { useEffect, useRef, useState } from "react"
import logo from "../../assets/logo.png"
import Button from "../Button/Button"
import { useSelector } from "react-redux"
import Avatar from "../Avatar/Avatar"
import useClickOutside from "../../hooks/useClickOutside"

function NavBar(props) {
    const user = useSelector(state => state.auth.user)
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const [showAccountOptions, setShowAccountOptions] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');


    const containerRef = useRef(null);
    const buttonRef = useRef(null);
    useClickOutside([containerRef, buttonRef], () => setShowAccountOptions(false));

    const match = matchPath('/:username/*', location.pathname);
    const isOwner = !!user && match?.params.username === user.username;
    const isSearchPage = location.pathname.startsWith('/search/');
    const isMyPinsScope = isSearchPage
        ? location.pathname === '/search/my_pins'
        : isOwner;
    const searchPath = isMyPinsScope ? '/search/my_pins' : '/search/pins';
    const placeholder = isMyPinsScope ? '내가 생성한 핀 검색' : '검색';

    useEffect(() => {
        setSearchQuery(isSearchPage ? (searchParams.get('q') ?? '') : '');
    }, [location.pathname, location.search]);

    function handleSearch(e) {
        e.preventDefault();
        navigate(`${searchPath}?q=${encodeURIComponent(searchQuery)}`);
    }

    return (
        <div className={`${styles.navBarWrap} ${props.isShifted ? styles.shifted : ''}`}>
            <div className={styles.navBarContainer}>
                {/* <Link to="/" className={styles.logoWrap}>
                    <img src={logo} />
                    <div className={styles.logo}>Pinterest</div>
                </Link> */}
                <form onSubmit={handleSearch} className={styles.search}>
                    <div className={styles.searchIcon}>
                        <svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16"><path d="M17.33 18.74a10 10 0 1 1 1.41-1.41l4.47 4.47-1.41 1.41zM11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16"></path></svg>
                    </div>
                    <input
                        className={styles.searchInput}
                        type="text"
                        placeholder={placeholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </form>
                {user ?
                    <div className={styles.accoutButtonWrap}>
                        <button onClick={() => navigate(`/${user.username}`)} className={styles.profileButton}>
                            <Avatar username={user.username} size={32} />
                            <div className={styles.label}>내 프로필</div>
                        </button>
                        <button ref={buttonRef} onClick={() => { setShowAccountOptions(prev => !prev) }} className={styles.accountButton}>
                            <svg aria-hidden="true" height="12" viewBox="0 0 24 24" width="12"><path d="M23.7 8.7 12 20.42.3 8.71l1.4-1.42L12 17.6 22.3 7.3z"></path></svg>
                            <div className={styles.label}>계정</div>
                        </button>
                        {(showAccountOptions && <div className={styles.accountOptions}>
                            <div ref={containerRef} className={styles.accountOptionsContainer}>
                                <div className={styles.accountOption}>
                                    <div onClick={() => navigate(`/${user.username}`)} className={styles.myProfile}>
                                        <Avatar username={user.username} size={60} />
                                        <div>
                                            <p className={styles.title}>{user.username}</p>
                                            <p className={styles.subtle}>개인</p>
                                            <p className={styles.subtle}>{user.email}</p>
                                        </div>
                                    </div>
                                </div>
                                <div onClick={props.onLogoutClick} className={styles.accountOption}>
                                    <p className={styles.logout}>로그아웃</p>
                                </div>
                            </div>
                        </div>)}
                    </div>
                    :
                    <div className={styles.buttonWrap}>
                        <Button onClick={props.onLoginClick}>로그인</Button>
                        <Button variant="secondary" onClick={props.onRegisterClick}>가입하기</Button>
                    </div>
                }
            </div>
        </div>
    )
}

export default NavBar