import styles from './PinUpload.module.css'
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../../components/Button/Button';
import { useNavigate } from 'react-router-dom';
import BoardSelector from '../../components/BoardSelector/BoardSelector';
import { useAuthFetch } from '../../hooks/useAuthFetch';
import { boardKeys } from '../../api/boards';
import { searchKeys } from '../../api/search';

function PinUpload() {
    const auth = useSelector(state => state.auth)
    const navigate = useNavigate();
    const authFetch = useAuthFetch();
    const [imageFile, setImageFile] = useState(); // 선택된 이미지 파일 저장용
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showBoardList, setShowBoardList] = useState(false);
    const [selectedBoard, setSelectedBoard] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        link: ''
    });
    const [showToast, setShowToast] = useState(false)
    const [isToastVisible, setIsToastVisible] = useState(false)
    const [uploadedPin, setUploadedPin] = useState(null)

    const inputRef = useRef(null);
    const textareaRef = useRef(null);
    const selectRef = useRef(null);

    const queryClient = useQueryClient();

    useEffect(() => {
        if (!imageFile) {
            setPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(imageFile);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [imageFile])

    useEffect(() => {
        let showTimer, hideTimer
        if (showToast) {
            showTimer = setTimeout(() => {
                setIsToastVisible(true)
            }, 10)

            hideTimer = setTimeout(() => {
                setIsToastVisible(false)
            }, 3000)
        }

        return () => {
            clearTimeout(showTimer)
            clearTimeout(hideTimer)
        }
    }, [showToast])

    function handleTransitionEnd() {
        if (!isToastVisible) {
            setShowToast(false)
        }
    }

    const { mutate: uploadPin, isPending } = useMutation({
        mutationFn: async (submitData) => {
            const res = await authFetch('http://localhost:4000/api/pins', {
                method: 'POST',
                body: submitData,
            })
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error);
            }
            return data.pin;
        },
        onSuccess: (newPin) => {
            setFormData({ title: '', description: '', link: '' })
            setImageFile(null);
            setSelectedBoard(null);
            setShowToast(true);
            setUploadedPin(newPin)
            // queryClient.invalidateQueries({ queryKey: ['users', auth.user.username, 'boards'] });
            queryClient.invalidateQueries({ queryKey: ['users', auth.user.username, 'pins'] });
            queryClient.invalidateQueries({ queryKey: boardKeys.all });
            queryClient.invalidateQueries({ queryKey: searchKeys.all });
            queryClient.setQueryData(['pins'], (old) => {
                // const lastIndex = old.pages.length - 1; // 마지막 페이지 인덱스
                // return {
                //     ...old,
                //     pages: old.pages.map((page, idx) =>
                //         idx === lastIndex
                //             ? { ...page, pins: [...page.pins, newPin] } // 마지막 페이지의 pins 맨 뒤에 추가
                //             : page // 나머지 페이지는 그대로
                //     ),
                // };
                if (!old || !old.pages || old.pages.length === 0) {
                    return old; // 캐시가 없으면 건드리지 않고, 다음 쿼리에서 자연스럽게 새로 받아오게 둠
                }
                return {
                    ...old,
                    pages: [
                        { ...old.pages[0], pins: [newPin, ...old.pages[0].pins] },
                        ...old.pages.slice(1),
                    ],
                };
            })
        }
    })

    // 이미지 파일 업로드 요청 함수
    async function handleSubmit() {
        const submitData = new FormData();

        if (!imageFile) return;
        submitData.append('image', imageFile);

        let title = formData.title.trim();
        let description = formData.description.trim();
        let link = formData.link;

        if (title.length > 100) title = title.slice(0, 100);
        if (description.length > 800) description = description.slice(0, 800);
        try {
            if (link) new URL(link);
        } catch {
            return;
        }

        submitData.append('title', title);
        submitData.append('description', description);
        submitData.append('link', link);
        if (selectedBoard) submitData.append('boardId', selectedBoard._id);

        uploadPin(submitData);
    }

    function validateAndSetFile(file) {
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const isImage = allowedTypes.includes(file.type);

        if (!isImage) {
            alert('파일 형식이 잘못되어 업로드하지 못했습니다.')
            return;
        }

        const maxSize = 20 * 1024 * 1024;
        if (file.size > maxSize) {
            alert('이미지 용량이 20MB를 초과하여 업로드하지 못했습니다.')
        }

        setImageFile(file);
    }

    // 파일 선택 시 실행될 함수
    function handleFileChange(e) {
        validateAndSetFile(e.target.files[0])
        e.target.value = '';
    }

    function handleDragOver(e) {
        e.preventDefault();
        setIsDragging(true);
    }
    function handleDragLeave() {
        setIsDragging(false);
    }
    function handleDrop(e) {
        e.preventDefault();
        setIsDragging(false);
        validateAndSetFile(e.dataTransfer.files[0])
    }

    function handleSelectBoard(board) {
        setSelectedBoard(board);
    }

    function handleChage(field) {
        return (e) => {
            let value = e.target.value;
            let errorMessage = null;

            switch (field) {
                case 'title':
                    if (value?.trim().length > 100) {
                        // value = value.slice(0, 100);
                        errorMessage = '제목이 너무 깁니다. 초반 100자까지만 표시됩니다.';
                    }
                    break;
                case 'description':
                    if (value?.trim().length > 800) {
                        // value = value.slice(0, 800);
                        errorMessage = '설명이 너무 깁니다. 처음 800자까지만 표시됩니다.';

                    }
                    break;
                case 'link':
                    try {
                        if (!value) break;
                        new URL(value);
                    } catch {
                        errorMessage = '죄송합니다. 올바르지 않은 URL입니다—다시 시도하세요.';
                    }
                    break;
            }

            const newErrors = { ...validationErrors };
            if (errorMessage) {
                newErrors[field] = errorMessage;
            } else {
                delete newErrors[field];
            }
            setValidationErrors(newErrors);
            setFormData({ ...formData, [field]: value })
        }
    }

    function handleViewPin() {
        if (uploadedPin) navigate(`/pins/${uploadedPin._id}`)
    }

    return <div className={styles.uploadContainer}>
        <div className={styles.navbar}>
            <h1>핀 만들기</h1>
            <div className={styles.uploadButton}>
                {
                    imageFile && !isPending
                        ? <Button onClick={handleSubmit} variant='primary'>게시</Button>
                        : <Button onClick={handleSubmit} variant='disabled' disabled>게시</Button>
                }
            </div>
        </div>
        <div className={styles.container}>
            <div className={styles.uploadBoxWrapper}>
                <div className={`${styles.uploadBox} ${isDragging ? styles.isDragging : ''}`}
                    onClick={() => inputRef.current.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {previewUrl ? (
                        <div className={styles.previewWrapper}>
                            <img src={previewUrl} alt="선택된 이미지 미리보기" className={styles.previewImage} />
                        </div>
                    ) : (
                        <div className={styles.placeholder}>
                            <svg aria-label="파일 추가" height="32" viewBox="0 0 24 24" width="32"><path d="M18 8a2 2 0 1 0-4 0 2 2 0 0 0 4 0M5 1a4 4 0 0 0-4 4v14a4 4 0 0 0 4 4h14a4 4 0 0 0 4-4V5a4 4 0 0 0-4-4zm16 4v9h-4.17a5.8 5.8 0 0 1-4.12-1.7l-.24-.24A7.04 7.04 0 0 0 3 11.63V5c0-1.1.9-2 2-2h14a2 2 0 0 1 2 2M3 19v-4.59l.94-.94a5.04 5.04 0 0 1 7.12 0l.23.24A7.8 7.8 0 0 0 16.83 16H21v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2"></path></svg>
                            <h6>미디어 업로드</h6>
                            <p>JPG, PNG 최대 20MB · MP4 최대 200MB</p>
                        </div>
                    )}

                </div>
                <input ref={inputRef} type="file" onChange={handleFileChange} style={{ display: 'none' }} />
            </div>
            <div className={styles.infoContainer}>
                <div>
                    <div className={`${styles.inputCard} ${validationErrors.title ? styles.alertInput : ''}`}>
                        <label htmlFor="title">제목</label>
                        <input className={styles.input} value={formData.title} onChange={handleChage('title')} type="text" id="title" disabled={!imageFile} placeholder='사람들에게 회원님의 핀에 대해 설명해 보세요' />
                    </div>
                    {validationErrors.title &&
                        <div className={styles.alert}>
                            <svg className={styles.alertIcon} fill="currentColor" aria-hidden="true" height="16" viewBox="0 0 16 16" width="16"><path d="M9.83 2.04a2.14 2.14 0 0 0-3.66 0L.33 11.77A2.14 2.14 0 0 0 2.16 15h11.68a2.14 2.14 0 0 0 1.83-3.23zM6.21 6.79 8 8.6l1.8-1.8 1.4 1.42L9.42 10l1.8 1.8-1.42 1.4L8 11.42l-1.8 1.8-1.4-1.42L6.58 10l-1.8-1.8z"></path></svg>
                            <p className={styles.alertMessage}>{validationErrors.title}</p>
                        </div>
                    }
                </div>

                <div>
                    <div className={`${styles.inputCard} ${validationErrors.description ? styles.alertInput : ''}`} onClick={() => textareaRef.current?.focus()}>
                        <label htmlFor="description">설명</label>
                        <textarea ref={textareaRef} value={formData.description} onChange={handleChage('description')} className={styles.input} name="description" id="description" disabled={!imageFile} placeholder='핀에 대해 설명하세요'></textarea>
                    </div>
                    {validationErrors.description &&
                        <div className={styles.alert}>
                            <svg className={styles.alertIcon} fill="currentColor" aria-hidden="true" height="16" viewBox="0 0 16 16" width="16"><path d="M9.83 2.04a2.14 2.14 0 0 0-3.66 0L.33 11.77A2.14 2.14 0 0 0 2.16 15h11.68a2.14 2.14 0 0 0 1.83-3.23zM6.21 6.79 8 8.6l1.8-1.8 1.4 1.42L9.42 10l1.8 1.8-1.42 1.4L8 11.42l-1.8 1.8-1.4-1.42L6.58 10l-1.8-1.8z"></path></svg>
                            <p className={styles.alertMessage}>{validationErrors.description}</p>
                        </div>
                    }
                </div>

                <div>
                    <div className={`${styles.inputCard} ${validationErrors.link ? styles.alertInput : ''}`}>
                        <label htmlFor="link">링크</label>
                        <input className={styles.input} value={formData.link} onChange={handleChage('link')} type="text" id="link" disabled={!imageFile} placeholder='링크 추가' />
                    </div>
                    {validationErrors.link &&
                        <div className={styles.alert}>
                            <svg className={styles.alertIcon} fill="currentColor" aria-hidden="true" height="16" viewBox="0 0 16 16" width="16"><path d="M9.83 2.04a2.14 2.14 0 0 0-3.66 0L.33 11.77A2.14 2.14 0 0 0 2.16 15h11.68a2.14 2.14 0 0 0 1.83-3.23zM6.21 6.79 8 8.6l1.8-1.8 1.4 1.42L9.42 10l1.8 1.8-1.42 1.4L8 11.42l-1.8 1.8-1.4-1.42L6.58 10l-1.8-1.8z"></path></svg>
                            <p className={styles.alertMessage}>{validationErrors.link}</p>
                        </div>
                    }
                </div>

                <div className={styles.overlayParent}>
                    <div ref={selectRef} tabIndex={imageFile ? 0 : -1} className={styles.inputCard}
                        onClick={() => {
                            if (imageFile) {
                                selectRef.current?.focus();
                                setShowBoardList(prev => !prev);
                            }
                        }}
                    >
                        <label htmlFor="board">보드</label>
                        <div className={`${styles.input} ${styles.select} ${selectedBoard || styles.placeholderTextColor} ${imageFile ? '' : styles.disabled}`} type="text" id="board">
                            <p>{selectedBoard ? selectedBoard.name : '보드 선택'}</p>
                        </div>
                    </div>
                    <div className={styles.boardSelectorWrapper}>
                        <BoardSelector
                            isOpen={showBoardList}
                            onClose={() => setShowBoardList(false)}
                            onSelectBoard={handleSelectBoard}
                            triggerRef={selectRef}
                        />
                    </div>
                </div>
                <div className={styles.legalNotice}>불법 촬영 콘텐츠 등을 게시하는 경우 Pinterest는 한국 전기통신사업법 제22-5(1)조에 따라 해당 콘텐츠의 액세스를 삭제하거나 차단할 수 있으며, 사용자는 관련 법률 및 규정에 따라 처벌을 받을 수 있습니다.</div>
            </div>
        </div>
        {showBoardList &&
            <div style={{ height: '250px' }}></div>}
        {showToast &&
            <div className={`${styles.toastContainer} ${isToastVisible ? styles.toastVisible : ''}`}
                onTransitionEnd={handleTransitionEnd}>
                <div className={styles.toast}>
                    <p className={styles.toastMessage}>핀이 게시되었습니다!</p>
                    <button className={styles.toastAction} onClick={handleViewPin}>보기</button>
                </div>
            </div>
        }

    </div>
}

export default PinUpload