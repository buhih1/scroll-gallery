import { Link, useNavigate } from 'react-router-dom'
import styles from './ReplyItem.module.css'
import formatRelativeTime from '../../../utils/formatRelativeTime';
import Avatar from '../../Avatar/Avatar';
import { useRef, useState } from 'react';
import Button from '../../Button/Button';
import { useCreateComment } from '../../../hooks/comments/useCreateComment';
import { useModal } from '../../../contexts/ModalContext';
import { useFloating, useDismiss, autoUpdate, flip, shift, offset, hide, useInteractions } from '@floating-ui/react';
import { useSelector } from 'react-redux';

export default function ReplyItem({ reply, commentsExpanded, pin }) {
    const navigate = useNavigate();
    const { showModal } = useModal();
    const user = useSelector(state => state.auth.user);

    const [isReplyInputOpen, setIsReplyInputOpen] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isOpenedMoreOptions, setIsOpenedMoreOptions] = useState(false);

    const textareaRef = useRef(null);

    const createCommentMutation = useCreateComment(pin._id);

    const { refs, floatingStyles, middlewareData, context } = useFloating({
        open: isOpenedMoreOptions,
        onOpenChange: setIsOpenedMoreOptions,
        placement: 'bottom',
        middleware: [
            offset(8),
            flip({ fallbackPlacements: ['top', 'right', 'left',] }),
            shift(),
            hide(),
        ],
        whileElementsMounted: autoUpdate,
    })

    const dismiss = useDismiss(context); // 바깥 클릭 감지해서 닫는 로직
    const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]); // dom에 연결

    function handleReplyInputOpen() {
        setIsReplyInputOpen(true);
    }

    function handleReplyInputClose() {
        if (replyText.trim()) {
            showModal('DISCARD_REPLY', {
                onReplyDiscarded: () => {
                    setIsReplyInputOpen(false);
                    setReplyText('');
                },
            })
        } else {
            setIsReplyInputOpen(false)
        }
    }

    function handleReplyChange(e) {
        const value = e.target.value;
        setReplyText(value);
    }

    function handleReplySubmit() {
        const trimmedText = replyText.trim();
        createCommentMutation.mutate(
            { text: trimmedText, replyToCommentId: reply._id },
            {
                onSuccess: () => {
                    setIsReplyInputOpen(false);
                    setReplyText('');
                }
            }
        );
    }

    function handleToggleMoreOptions() {
        setIsOpenedMoreOptions(prev => !prev);
    }

    function handleOpenDeleteCommentModal() {
        showModal('DELETE_COMMENT', { pinId: pin._id, commentId: reply._id })
    }

    return (
        <div>
            <div className={styles.comment}>
                <Avatar className={styles.commentAvatar} onClick={() => navigate(`/${reply.user.username}`)} username={reply.user.username}></Avatar>
                <div className={styles.commentRight}>
                    <div className={`${styles.commentText} ${commentsExpanded ? styles.expanded : ''}`}>
                        <Link to={`/${reply.user.username}`} className={styles.commentUsername}>{reply.user.username}
                        </Link>{reply.replyTo &&
                            <span>
                                <span> </span>
                                <Link to={`/${reply.replyTo.username}`} className={`${styles.commentUsername} ${styles.replyTo}`}>{reply.replyTo.username}</Link>
                            </span>
                        } {reply.text}
                    </div>
                    <div className={styles.commentActions}>
                        <div className={styles.commentDate}>{formatRelativeTime(reply.createdAt)}</div>
                        <button onClick={handleReplyInputOpen} className={styles.commentReplyButton}>답변</button>
                        <button
                            ref={refs.setReference}
                            {...getReferenceProps({ onClick: handleToggleMoreOptions })}
                            className={styles.commentMoreButton}>
                            <svg aria-hidden="true" height="12" viewBox="0 0 24 24" width="12"><path d="M2.5 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5m9.5 0a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5m9.5 0a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5"></path></svg>
                        </button>
                        {isOpenedMoreOptions && user?._id === reply.user._id &&
                            <div
                                ref={refs.setFloating}
                                style={{
                                    ...floatingStyles,
                                    visibility: middlewareData.hide?.referenceHidden ? 'hidden' : 'visible'
                                }}
                                className={styles.moreOptions}
                                {...getFloatingProps()}>
                                <div className={styles.moreOptionsButtons}>
                                    <button onClick={handleOpenDeleteCommentModal}>삭제</button>
                                </div>
                            </div>}
                    </div>
                </div>
            </div>
            {isReplyInputOpen &&
                <div className={styles.replyForm}>
                    <div onClick={() => textareaRef.current?.focus()} className={styles.replyFormInput}>
                        <textarea
                            ref={textareaRef}
                            name='replyTextarea'
                            rows={1}
                            value={replyText}
                            onChange={handleReplyChange}
                            spellCheck={false}
                            placeholder='답변을 남기세요'
                        />
                    </div>
                    <div className={styles.replyFormButtons}>
                        <Button onClick={handleReplyInputClose} variant='secondary' style={{ minHeight: '36px', borderRadius: '12px', fontSize: '14px', padding: '4px 10px' }}>취소</Button>
                        <Button onClick={handleReplySubmit} variant={`${replyText ? 'primary' : 'disabled'}`} disabled={!replyText} style={{ minHeight: '36px', borderRadius: '12px', fontSize: '14px', padding: '4px 10px' }}>저장</Button>
                    </div>
                </div>}
        </div>
    )
}