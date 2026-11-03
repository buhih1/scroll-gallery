import { useState } from 'react';
import Button from '../Button/Button';
import styles from './CreateBoardModal.module.css'
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import useClickOutside from '../../hooks/useClickOutside';
import { useRef } from 'react';
import { useAuthFetch } from '../../hooks/useAuthFetch';
import { boardKeys } from '../../api/boards';
import { BASE_URL } from '../../api/config';

function CreateBoardModal({ onClose, onBoardCreated = () => { } }) {
    const auth = useSelector(state => state.auth)
    const authFetch = useAuthFetch();
    const [boardName, setBoardName] = useState('');
    const [validationError, setValidationError] = useState('');
    const [touched, setTouched] = useState(false);
    const queryClient = useQueryClient();

    const modalRef = useRef(null)
    useClickOutside(modalRef, onClose)

    const FIELD_ERROR_STATUSES = [400, 409];

    const { mutate: createBoard, isPending: isCreatingBoard, isError, error } = useMutation({
        mutationFn: async (boardName) => {
            const res = await authFetch(`${BASE_URL}/boards`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: boardName }),
            })

            const resData = await res.json();
            if (!res.ok) {
                const err = new Error(resData.error || '보드 생성에 실패했습니다.');
                err.status = res.status;
                throw err;
            }
            return resData.board;
        },
        onSuccess: (newBoard) => {
            // queryClient.setQueryData(boardKeys.list(auth.user._id), (old) => {
            //     if (!old) return old;
            //     return {
            //         ...old,
            //         boards: [newBoard, ...(old?.boards ?? [])]
            //     };
            // })
            // queryClient.invalidateQueries({ queryKey: ['users', auth.user.username, 'boards'] });
            queryClient.invalidateQueries({ queryKey: boardKeys.list(auth.user._id) });
            onBoardCreated(newBoard);
            onClose();
        },
        onError: (err) => {
            if (FIELD_ERROR_STATUSES.includes(err.status)) {
                setValidationError(err.message);
            }
        }
    })

    function validate(name) {
        if (!name.trim()) return '보드 이름을 지정하세요!'
        if (name.length > 50) return '50자 이하로 입력하세요.'
    }

    function handleChange(e) {
        setBoardName(e.target.value);
        setTouched(true);
        setValidationError(validate(e.target.value));
    }

    function handleSubmit(e) {
        e.preventDefault();
        createBoard(boardName);
    }

    return <div className={styles.overlay}>
        <div ref={modalRef} className={styles.modal}>
            <div className={styles.title}>
                <h1>보드 만들기</h1>
            </div>
            <form onSubmit={handleSubmit}>
                <div className={styles.formTop}>
                    <div className={styles.boardNameInput}>
                        <label htmlFor="boardName">이름</label>
                        <div>
                            <input
                                className={`${styles.input} ${touched && validationError ? styles.alertInput : ''}`}
                                type="text"
                                onChange={handleChange}
                                value={boardName}
                                placeholder="예: '가고 싶은 곳' 또는 '요리법'" />
                            {
                                touched && validationError &&
                                <div className={styles.alert}>
                                    <svg className={styles.alertIcon} fill="currentColor" aria-hidden="true" height="16" viewBox="0 0 16 16" width="16"><path d="M9.83 2.04a2.14 2.14 0 0 0-3.66 0L.33 11.77A2.14 2.14 0 0 0 2.16 15h11.68a2.14 2.14 0 0 0 1.83-3.23zM6.21 6.79 8 8.6l1.8-1.8 1.4 1.42L9.42 10l1.8 1.8-1.42 1.4L8 11.42l-1.8 1.8-1.4-1.42L6.58 10l-1.8-1.8z"></path></svg>
                                    <p className={styles.alertMessage}>{validationError}</p>
                                </div>
                            }
                        </div>
                    </div>
                </div>
                <div className={styles.formBottom}>
                    {
                        validationError
                            ? <Button variant='disabled' disabled>만들기</Button>
                            : <Button variant={isCreatingBoard ? 'disabled' : 'primary'} disabled={isCreatingBoard}>만들기</Button>
                    }
                </div>
                {isError && !FIELD_ERROR_STATUSES.includes(error.status) && (
                    <div className={styles.globalAlert}>{error.message}</div>
                )}
            </form>
        </div>
    </div>
}

export default CreateBoardModal