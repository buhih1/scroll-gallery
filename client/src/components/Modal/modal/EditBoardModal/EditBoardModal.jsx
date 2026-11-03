import { useSelector } from 'react-redux';
import Modal from '../../Modal'
import styles from './EditBoardModal.module.css'
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '../../../../contexts/ModalContext';
import { useAuthFetch } from '../../../../hooks/useAuthFetch';
import { useRef, useState } from 'react';
import Button from '../../../Button/Button';
import { boardKeys } from '../../../../api/boards';
// _id: 1,
// name: 1,
// description: 1,
// ownerId: 1,
// pinCount: 1,
// coverPins: 1,
// lastPinAddedAt: 1,
// createdAt: 1,

export default function EditBoardModal({ onClose, isTop, board, onDeleted }) {
    const auth = useSelector(state => state.auth)
    const queryClient = useQueryClient();
    const { showModal } = useModal();
    const authFetch = useAuthFetch();

    const [validationErrors, setValidationErrors] = useState({});
    const [formData, setFormData] = useState({
        name: board.name ?? '',
        description: board.description ?? '',
    });

    const textareaRef = useRef(null);

    const {
        mutate: updateBoard,
        isPending: isUpdatingBoard,
        isError: isUpdateBoardError,
        error: updateBoardError,
    } = useMutation({
        mutationFn: async (updatedBoardData) => {
            const res = await authFetch(`http://localhost:4000/api/boards/${board._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedBoardData),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        },
        onSuccess: (updatedBoard, variables) => {
            // queryClient.invalidateQueries({ queryKey: ['users', auth.user.username, 'boards'] });
            queryClient.invalidateQueries({ queryKey: ['users', auth.user.username, 'pins'] });
            queryClient.invalidateQueries({ queryKey: boardKeys.list(auth.user._id) });
            queryClient.invalidateQueries({ queryKey: boardKeys.detail(board._id), exact: true });

            onClose();
            console.log('board update 성공')
        },
        onError: (err) => {
            console.log(`err: ${err}`)
        }
    });

    function handleUpdateBoard() {
        const updatedBoardData = { ...formData };
        updateBoard(updatedBoardData);
    }

    function handleDeleteBoard() {
        showModal('DELETE_BOARD', {
            board,
            onDeleted
        })
    }

    function handleChange(field) {
        return (e) => {
            let value = e.target.value;
            let errorMessage = null;

            switch (field) {
                case 'name':
                    if (value?.trim().length > 50) {
                        errorMessage = '50자 이하로 입력하세요.';
                    }
                    if (!value || value.trim().length === 0) {
                        errorMessage = '보드 이름을 지정하세요!';
                    }
                    break;
                case 'description':
                    if (value?.trim().length > 500) {
                        errorMessage = '500자 이하로 입력하세요.';

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

    return <Modal onClose={onClose} isTop={isTop}>
        <div className={styles.modal}>
            <div className={styles.name}>
                <h1>보드 수정</h1>
            </div>
            <div className={styles.formTop}>
                <div className={styles.infoContainer}>
                    <div>
                        <div className={`${styles.inputCard} ${validationErrors.name ? styles.alertInput : ''}`}>
                            <label htmlFor="name">이름</label>
                            <input className={styles.input} value={formData.name} onChange={handleChange('name')} type="text" id="name" placeholder='사람들에게 회원님의 핀에 대해 설명해 보세요' />
                        </div>
                        {validationErrors.name &&
                            <div className={styles.alert}>
                                <svg className={styles.alertIcon} fill="currentColor" aria-hidden="true" height="16" viewBox="0 0 16 16" width="16"><path d="M9.83 2.04a2.14 2.14 0 0 0-3.66 0L.33 11.77A2.14 2.14 0 0 0 2.16 15h11.68a2.14 2.14 0 0 0 1.83-3.23zM6.21 6.79 8 8.6l1.8-1.8 1.4 1.42L9.42 10l1.8 1.8-1.42 1.4L8 11.42l-1.8 1.8-1.4-1.42L6.58 10l-1.8-1.8z"></path></svg>
                                <p className={styles.alertMessage}>{validationErrors.name}</p>
                            </div>
                        }
                    </div>
                    <div>
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
                    </div>
                </div>
            </div>
            <div className={styles.formBottom}>
                {isUpdateBoardError && <div className={styles.globalAlert}>{updateBoardError.message}</div>}
                <div className={styles.buttons}>
                    <Button onClick={handleDeleteBoard} variant={isUpdatingBoard ? 'disabled' : 'secondary'} disabled={isUpdatingBoard}>삭제</Button>
                    {
                        Object.keys(validationErrors).length !== 0
                            ? <Button variant='disabled' disabled>저장</Button>
                            : <Button variant={isUpdatingBoard ? 'disabled' : 'primary'} onClick={handleUpdateBoard} disabled={isUpdatingBoard}>저장</Button>
                    }
                </div>
            </div>
        </div>
    </Modal>
}