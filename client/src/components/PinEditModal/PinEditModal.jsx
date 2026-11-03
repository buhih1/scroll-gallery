import styles from './PinEditModal.module.css'
import { useState } from 'react';
import Button from '../Button/Button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import useClickOutside from '../../hooks/useClickOutside';
import { useRef } from 'react';
import BoardSelector from '../BoardSelector/BoardSelector';
import { useModal } from '../../contexts/ModalContext';
import { useAuthFetch } from '../../hooks/useAuthFetch';
import { pinKeys } from '../../hooks/pins/queryKeys';
import { boardKeys } from '../../api/boards';
import { searchKeys } from '../../api/search';
import { BASE_URL } from '../../api/config';

export default function PinEditModal({ onClose, pin, isTop, onDeleted }) {
    const pinSource = pin.source ?? 'own';

    const auth = useSelector(state => state.auth)
    const queryClient = useQueryClient();
    const { showModal } = useModal();
    const authFetch = useAuthFetch();

    const [validationErrors, setValidationErrors] = useState({}); // input form error
    const [formData, setFormData] = useState({
        title: `${pinSource === 'own' ? (pin.title ?? '') : ''}`,
        description: `${pinSource === 'own' ? (pin.description ?? '') : ''}`,
        link: `${pinSource === 'own' ? (pin.link ?? '') : ''}`
    });
    const [selectedBoard, setSelectedBoard] = useState(pinSource === 'board' ? pin.board : null);    // { board._id, board.name }
    const [showBoardList, setShowBoardList] = useState(false);

    const textareaRef = useRef(null);
    const selectRef = useRef(null);

    const modalRef = useRef(null)
    useClickOutside(modalRef, onClose, isTop)

    const {
        mutate: updatePin,
        isPending: isUpdatingPin,
        isError: isUpdatePinError,
        error: updatePinError,
    } = useMutation({
        mutationFn: async (updatedPinData) => {
            const res = await authFetch(`${BASE_URL}/pins/${pin._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedPinData),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        },
        onSuccess: (updatedPin, variables) => {
            // queryClient.invalidateQueries({ queryKey: ['users', auth.user.username, 'boards'] });
            queryClient.invalidateQueries({ queryKey: ['users', auth.user.username, 'pins'] });
            queryClient.invalidateQueries({ queryKey: pinKeys.detail(pin._id), exact: true });
            queryClient.invalidateQueries({ queryKey: boardKeys.all });
            queryClient.invalidateQueries({ queryKey: searchKeys.all });
            onClose();
            console.log('pinupdate 성공')
        },
        onError: (err) => {
            console.log(`err: ${err}`)
        }
    });

    function handleUpdatePin() {
        let updatedPinData;
        if (pinSource === 'own') {
            updatedPinData = {
                ...formData,
                targetBoardId: selectedBoard?._id,
            }
        } else {
            updatedPinData = {
                sourceBoardId: pin.board._id,
                targetBoardId: selectedBoard._id,
            }
        }
        updatePin(updatedPinData)
    }


    function handleDeletePin() {
        if (pinSource === 'own') {
            // 핀 삭제
            showModal('DELETE_PIN', {
                pin,
                mode: 'delete',
                onDeleted
            })
        } else {
            // 보드에 저장된 핀 제거
            showModal('DELETE_PIN', {
                pin,
                mode: 'remove',
            })
        }
    }

    function handleChange(field) {
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

    function handleSelectBoard(board) {
        setSelectedBoard(board);
    }

    return <div className={styles.overlay}>
        <div ref={modalRef} className={styles.modal}>
            <div className={styles.title}>
                <h1>핀 수정</h1>
            </div>
            <div className={`${pinSource === 'own' ? styles.ownFormTop : styles.formTop}`}>
                <div className={styles.infoContainer}>
                    {pinSource === 'own' && <div>
                        <div className={`${styles.inputCard} ${validationErrors.title ? styles.alertInput : ''}`}>
                            <label htmlFor="title">제목</label>
                            <input className={styles.input} value={formData.title} onChange={handleChange('title')} type="text" id="title" placeholder='사람들에게 회원님의 핀에 대해 설명해 보세요' />
                        </div>
                        {validationErrors.title &&
                            <div className={styles.alert}>
                                <svg className={styles.alertIcon} fill="currentColor" aria-hidden="true" height="16" viewBox="0 0 16 16" width="16"><path d="M9.83 2.04a2.14 2.14 0 0 0-3.66 0L.33 11.77A2.14 2.14 0 0 0 2.16 15h11.68a2.14 2.14 0 0 0 1.83-3.23zM6.21 6.79 8 8.6l1.8-1.8 1.4 1.42L9.42 10l1.8 1.8-1.42 1.4L8 11.42l-1.8 1.8-1.4-1.42L6.58 10l-1.8-1.8z"></path></svg>
                                <p className={styles.alertMessage}>{validationErrors.title}</p>
                            </div>
                        }
                    </div>}
                    {pinSource === 'own' && <div>
                        <div className={`${styles.inputCard} ${validationErrors.description ? styles.alertInput : ''}`} onClick={() => textareaRef.current?.focus()}>
                            <label htmlFor="description">설명</label>
                            <textarea ref={textareaRef} value={formData.description} onChange={handleChange('description')} className={styles.input} name="description" id="description" placeholder='핀에 대해 설명하세요'></textarea>
                        </div>
                        {validationErrors.description &&
                            <div className={styles.alert}>
                                <svg className={styles.alertIcon} fill="currentColor" aria-hidden="true" height="16" viewBox="0 0 16 16" width="16"><path d="M9.83 2.04a2.14 2.14 0 0 0-3.66 0L.33 11.77A2.14 2.14 0 0 0 2.16 15h11.68a2.14 2.14 0 0 0 1.83-3.23zM6.21 6.79 8 8.6l1.8-1.8 1.4 1.42L9.42 10l1.8 1.8-1.42 1.4L8 11.42l-1.8 1.8-1.4-1.42L6.58 10l-1.8-1.8z"></path></svg>
                                <p className={styles.alertMessage}>{validationErrors.description}</p>
                            </div>
                        }
                    </div>}
                    {pinSource === 'own' && <div>
                        <div className={`${styles.inputCard} ${validationErrors.link ? styles.alertInput : ''}`}>
                            <label htmlFor="link">링크</label>
                            <input className={styles.input} value={formData.link} onChange={handleChange('link')} type="text" id="link" placeholder='링크 추가' />
                        </div>
                        {validationErrors.link &&
                            <div className={styles.alert}>
                                <svg className={styles.alertIcon} fill="currentColor" aria-hidden="true" height="16" viewBox="0 0 16 16" width="16"><path d="M9.83 2.04a2.14 2.14 0 0 0-3.66 0L.33 11.77A2.14 2.14 0 0 0 2.16 15h11.68a2.14 2.14 0 0 0 1.83-3.23zM6.21 6.79 8 8.6l1.8-1.8 1.4 1.42L9.42 10l1.8 1.8-1.42 1.4L8 11.42l-1.8 1.8-1.4-1.42L6.58 10l-1.8-1.8z"></path></svg>
                                <p className={styles.alertMessage}>{validationErrors.link}</p>
                            </div>
                        }
                    </div>}

                    <div className={styles.overlayParent}>
                        <div ref={selectRef} tabIndex={0} className={styles.inputCard}
                            onClick={() => {
                                selectRef.current?.focus();
                                setShowBoardList(prev => !prev);
                            }}
                        >
                            <label htmlFor="board">보드</label>
                            <div className={`${styles.input} ${styles.select} ${selectedBoard || styles.placeholderTextColor}`} type="text" id="board">
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
                            <div style={{ height: '20px' }}></div>
                        </div>
                    </div>
                </div>
                {showBoardList &&
                    (pinSource === 'board'
                        ? <div style={{ height: '200px' }}></div>
                        : <div style={{ height: '20px' }}></div>
                    )}
            </div>
            <div className={styles.formBottom}>
                {isUpdatePinError && <div className={styles.globalAlert}>{updatePinError.message}</div>}
                <div className={styles.buttons}>
                    <Button onClick={handleDeletePin} variant={isUpdatingPin ? 'disabled' : 'secondary'} disabled={isUpdatingPin}>삭제</Button>
                    {
                        Object.keys(validationErrors).length !== 0
                            ? <Button variant='disabled' disabled>저장</Button>
                            : <Button variant={isUpdatingPin ? 'disabled' : 'primary'} onClick={handleUpdatePin} disabled={isUpdatingPin}>저장</Button>
                    }
                </div>
                {/* {(isUpdatePinError || isDeletePinError || isRemovePinFromBoardError) &&
                    <div className={styles.globalAlert}>{isUpdatePinError ? updatePinError.message : (isDeletePinError ? deletePinError.message : removePinFromBoardError.message)}</div>}
                <div className={styles.buttons}>
                    <Button onClick={handleDeletePin} variant={isUpdatingPin || isDeletingPin ? 'disabled' : 'secondary'} disabled={isUpdatingPin || isDeletingPin || isRemovingPinFromBoard}>삭제</Button>
                    {
                        Object.keys(validationErrors).length !== 0
                            ? <Button variant='disabled' disabled>저장</Button>
                            : <Button variant={isUpdatingPin || isDeletingPin || isRemovingPinFromBoard ? 'disabled' : 'primary'} onClick={handleUpdatePin} disabled={isUpdatingPin || isDeletingPin || isRemovingPinFromBoard}>저장</Button>
                    }
                </div> */}
            </div>
        </div>
    </div>
}