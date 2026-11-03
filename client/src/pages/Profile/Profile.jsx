import { useSelector } from 'react-redux'
import Avatar from '../../components/Avatar/Avatar'
import Button from '../../components/Button/Button'
import styles from './Profile.module.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import MasonryGrid from '../../components/MasonryGrid/MasonryGrid'
import BoardCard from '../../components/BoardCard/BoardCard'
import { useModal } from '../../contexts/ModalContext'
import useClickOutside from '../../hooks/useClickOutside'
import { boardKeys } from '../../api/boards'

function Profile() {
    const auth = useSelector(state => state.auth)
    const [activeTab, setActiveTab] = useState('boards');
    const [isCreatedByMe, setIsCreatedByMe] = useState(false);
    const [isOpenedCreateOptions, setIsOpenedCreateOptions] = useState(false);
    const { username } = useParams();
    const navigate = useNavigate();
    const { showModal } = useModal();
    const isOwner = auth.user?.username === username
    const sentinelRef = useRef(null); // infinite scroll 구현용 감지할 element
    const optionsRef = useRef(null);

    useClickOutside(optionsRef, () => setIsOpenedCreateOptions(false))

    const {
        data: profileData,
        isPending: isProfilePending,
        isError: isProfileError,
        error: profileError
    } = useQuery({
        queryKey: ['users', username],
        queryFn: () => fetchUserProfile(),
    })

    async function fetchUserProfile() {
        const res = await fetch(`http://localhost:4000/api/users/${username}`);
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error);
        }
        return data;
    }

    const {
        data: pinsData,
        isPending: isPinsPending,
        fetchNextPage: fetchNextPinsPage,
        hasNextPage: hasNextPinsPage,
        isFetchingNextPage: isFetchingNextPinsPage,
    } = useInfiniteQuery({
        queryKey: ['users', username, 'pins', 'all'],
        queryFn: ({ pageParam }) => fetchUserPins(pageParam),
        enabled: activeTab === 'pins' && !isCreatedByMe,
        initialPageParam: null,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    })

    async function fetchUserPins(pageParam) {
        const url = pageParam
            ? `http://localhost:4000/api/users/${username}/pins/all?cursor=${pageParam}&limit=5` // 첫 페이지 외 다음 페이지 요청
            : `http://localhost:4000/api/users/${username}/pins/all?limit=5`; // 첫 페이지 요청
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error)
        }
        return data;
    }

    const {
        data: pinsByMeData,
        isPending: isPinsByMePending,
        fetchNextPage: fetchNextPinsByMePage,
        hasNextPage: hasNextPinsByMePage,
        isFetchingNextPage: isFetchingNextPinsByMePage,
    } = useInfiniteQuery({
        queryKey: ['users', username, 'pins', 'own'],
        queryFn: ({ pageParam }) => fetchUserPinsByMe(pageParam),
        enabled: activeTab === 'pins' && isCreatedByMe,
        initialPageParam: null,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    })

    async function fetchUserPinsByMe(pageParam) {
        const url = pageParam
            ? `http://localhost:4000/api/users/${username}/pins?cursor=${pageParam}&limit=5` // 첫 페이지 외 다음 페이지 요청
            : `http://localhost:4000/api/users/${username}/pins?limit=5`; // 첫 페이지 요청
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error)
        }
        return data;
    }

    const userId = profileData?.user?._id;

    const {
        data: boardsData,
        isPending: isBoardsPending,
        fetchNextPage: fetchNextBoardsPage,
        hasNextPage: hasNextBoardsPage,
        isFetchingNextPage: isFetchingNextBoardsPage,
    } = useInfiniteQuery({
        queryKey: boardKeys.list(userId),
        queryFn: ({ pageParam }) => fetchUserBoards(pageParam),
        enabled: activeTab === 'boards' && !!userId,
        initialPageParam: null,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    })

    async function fetchUserBoards(pageParam) {
        const url = pageParam
            ? `http://localhost:4000/api/users/${username}/boards?cursor=${pageParam}&limit=5` // 첫 페이지 외 다음 페이지 요청
            : `http://localhost:4000/api/users/${username}/boards?limit=5`; // 첫 페이지 요청
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error)
        }
        return data;
    }

    const pins = useMemo(
        () => pinsData?.pages.flatMap(page => page.pins) ?? [],
        [pinsData]
    );

    const pinsByMe = useMemo(
        () => pinsByMeData?.pages.flatMap(page => page.pins) ?? [],
        [pinsByMeData]
    );

    const boards = useMemo(
        () => boardsData?.pages.flatMap(page => page.boards) ?? [],
        [boardsData]
    )

    const isPinsListPending = isCreatedByMe ? isPinsByMePending : isPinsPending;

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                if (activeTab === 'pins' && !isCreatedByMe && hasNextPinsPage && !isFetchingNextPinsPage) {
                    fetchNextPinsPage()
                } else if (activeTab === 'pins' && isCreatedByMe && hasNextPinsByMePage && !isFetchingNextPinsByMePage) {
                    fetchNextPinsByMePage()
                } else if (activeTab === 'boards' && hasNextBoardsPage && !isFetchingNextBoardsPage) {
                    fetchNextBoardsPage()
                }
            }

        });

        if (sentinelRef.current) observer.observe(sentinelRef.current)
        return () => observer.disconnect();
    }, [
        activeTab,
        isCreatedByMe,
        hasNextPinsPage,
        isFetchingNextPinsPage,
        fetchNextPinsPage,
        hasNextPinsByMePage,
        isFetchingNextPinsByMePage,
        fetchNextPinsByMePage,
        hasNextBoardsPage,
        isFetchingNextBoardsPage,
        fetchNextBoardsPage
    ])

    function handleOpenCreateOptions() {
        setIsOpenedCreateOptions(prev => !prev)
    }

    function handleOpenCreateBoardModal() {
        setIsOpenedCreateOptions(false);
        showModal('CREATE_BOARD')
    }

    function handleNavigateToPinCreationTool() {
        setIsOpenedCreateOptions(false);
        navigate('/pin-creation-tool');
    }

    if (isProfilePending) return null;
    if (isProfileError) return <div>{profileError.message}</div>
    if (isBoardsPending) return null;

    return <div className={styles.container}>
        <div className={styles.header}>
            <div className={styles.profile}>
                <div className={styles.profileHeader}>
                    <Avatar username={profileData.user.username} size={120}></Avatar>
                    <div className={styles.profileName}>
                        <h1>{profileData.user.username}</h1>
                    </div>
                </div>
                <div className={styles.profileFollow}>
                    <p>팔로워 0명 · 팔로잉 0명</p>
                </div>
                <div className={styles.profileBio}>
                    <p>소개</p>
                </div>
                <div className={styles.profileButton}>
                    <Button variant='secondary'><svg aria-hidden="true" height="12" viewBox="0 0 24 24" width="12"><path d="M17.7 5.8 12 .08l-5.7 5.7L7.7 7.2 11 3.9V15h2V3.91l3.3 3.3zM2 18v-5H0v5a4 4 0 0 0 4 4h16a4 4 0 0 0 4-4v-5h-2v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2"></path></svg> 프로필 공유</Button>
                    {isOwner &&
                        <Button variant='secondary'><svg aria-hidden="true" height="12" viewBox="0 0 24 24" width="12"><path d="M15.3 1.3a4 4 0 0 1 5.53.11l1.76 1.76a4 4 0 0 1 .11 5.53L9.95 21.48a2 2 0 0 1-1.12.57L2.41 23a1 1 0 0 1-.86-.28l-.25-.25a1 1 0 0 1-.28-.86l.95-6.42a2 2 0 0 1 .57-1.12L15.17 1.4l.02-.02zM3.93 15.46l-.57 4.03a1 1 0 0 0 1.13 1.13l4.03-.57L18.58 10 14 5.4zM18.57 2.32a2 2 0 0 0-1.98.5l-.47.47a1 1 0 0 0 0 1.42l3.17 3.17a1 1 0 0 0 1.4.01l.48-.48a2 2 0 0 0 0-2.82l-1.76-1.76a2 2 0 0 0-.84-.5"></path></svg> 프로필 수정</Button>
                    }
                </div>
            </div>
        </div>
        <div className={styles.sticky}>
            <div className={styles.tabBar}>
                <div onClick={() => setActiveTab('pins')} className={styles.tab}>
                    <p>핀</p>
                    {activeTab === 'pins' && <div className={styles.buttonBar}></div>}
                </div>
                <div onClick={() => setActiveTab('boards')} className={styles.tab}>
                    <p>보드</p>
                    {activeTab === 'boards' && <div className={styles.buttonBar}></div>}
                </div>
            </div>
            {/* {
                isOwner && activeTab === 'pins' &&
                <div className={styles.toolbar}>
                    <div className={styles.leftTool}>
                        <button className={styles.settingButton}><svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24"><path d="M19.87 8H24V6h-4.13a4 4 0 0 0-7.74 0H0v2h12.13a4 4 0 0 0 7.74 0M18 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0m-6.13 9a4 4 0 0 0-7.74 0H0v2h4.13a4 4 0 0 0 7.74 0H24v-2zM10 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0"></path></svg></button>
                        <Button onClick={() => setIsCreatedByMe(prev => !prev)} className={`${styles.filterButton} ${isCreatedByMe ? styles.createdByMe : ''}`} variant='secondary'>회원님이 만듦</Button>
                    </div>
                    <Button>만들기</Button>
                </div>
            }
            {
                isOwner && activeTab === 'boards' &&
                <div className={styles.toolbar}>
                    <div className={styles.leftTool}>
                        <button className={styles.settingButton}><svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24"><path d="M19.87 8H24V6h-4.13a4 4 0 0 0-7.74 0H0v2h12.13a4 4 0 0 0 7.74 0M18 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0m-6.13 9a4 4 0 0 0-7.74 0H0v2h4.13a4 4 0 0 0 7.74 0H24v-2zM10 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0"></path></svg></button>
                    </div>
                    <Button>만들기</Button>
                </div>
            } */}
            {
                isOwner &&
                <div className={styles.toolbar}>
                    <div className={styles.leftTool}>
                        {
                            activeTab === 'pins' &&
                            <>
                                <button className={styles.settingButton}><svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24"><path d="M19.87 8H24V6h-4.13a4 4 0 0 0-7.74 0H0v2h12.13a4 4 0 0 0 7.74 0M18 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0m-6.13 9a4 4 0 0 0-7.74 0H0v2h4.13a4 4 0 0 0 7.74 0H24v-2zM10 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0"></path></svg></button>
                                <Button onClick={() => setIsCreatedByMe(prev => !prev)} className={`${styles.filterButton} ${isCreatedByMe ? styles.createdByMe : ''}`} variant='secondary'>회원님이 만듦</Button>

                            </>
                        }
                        {
                            activeTab === 'boards' &&
                            <button className={styles.settingButton}><svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24"><path d="M19.87 8H24V6h-4.13a4 4 0 0 0-7.74 0H0v2h12.13a4 4 0 0 0 7.74 0M18 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0m-6.13 9a4 4 0 0 0-7.74 0H0v2h4.13a4 4 0 0 0 7.74 0H24v-2zM10 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0"></path></svg></button>
                        }
                    </div>
                    <div ref={optionsRef}>
                        <Button variant={`${isOpenedCreateOptions ? 'selected' : 'primary'}`} onClick={handleOpenCreateOptions}>만들기</Button>
                        {isOpenedCreateOptions &&
                            <div className={styles.createOptions}>
                                <div className={styles.createOptionsButtons}>
                                    <button onClick={handleNavigateToPinCreationTool}>핀</button>
                                    <button onClick={handleOpenCreateBoardModal}>보드</button>
                                </div>
                            </div>}
                    </div>
                </div>
            }
        </div>
        {activeTab === 'pins' && (
            isPinsListPending
                ? <div>불러오는 중...</div>
                : <MasonryGrid
                    key={isCreatedByMe ? 'created-by-me' : 'all'}
                    pins={isCreatedByMe ? pinsByMe : pins}
                    context='profile' />
        )}
        {activeTab === 'boards' &&
            <div className={styles.boardsGrid}>
                {
                    boards.map(board => <BoardCard key={board._id} board={board} />)
                }
            </div>
        }
        <div ref={sentinelRef} style={{ height: '1px' }} />
    </div>
}

export default Profile