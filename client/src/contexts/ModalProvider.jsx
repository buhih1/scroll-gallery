import { useState } from 'react';
import CreateBoardModal from '../components/CreateBoardModal/CreateBoardModal';
import PinEditModal from '../components/PinEditModal/PinEditModal';
import { ModalContext } from './ModalContext';
import DeletePinModal from '../components/Modal/modal/DeletePinModal/DeletePinModal';
import EditBoardModal from '../components/Modal/modal/EditBoardModal/EditBoardModal';
import DeleteBoardModal from '../components/Modal/modal/DeleteBoardModal/DeleteBoardModal';
import DiscardReplyModal from '../components/Modal/modal/DiscardReplyModal/DiscardReplyModal';
import DeleteCommentModal from '../components/Modal/modal/DeleteCommentModal/DeleteCommentModal';

const MODAL_COMPONENTS = {
    CREATE_BOARD: CreateBoardModal,
    PIN_EDIT: PinEditModal,
    DELETE_PIN: DeletePinModal,
    EDIT_BOARD: EditBoardModal,
    DELETE_BOARD: DeleteBoardModal,
    DELETE_COMMENT: DeleteCommentModal,
    DISCARD_REPLY: DiscardReplyModal,
};

export function ModalProvider({ children, showLogin }) {
    const [modalStack, setModalStack] = useState([]);

    function showModal(type, props = {}) {
        const id = crypto.randomUUID();
        setModalStack((stack) => [...stack, { id, type, props }]);
        return id;
    }

    function closeModal() {
        setModalStack((stack) => stack.slice(0, -1));
    }

    function closeAllModals() {
        setModalStack([]);
    }

    const topIndex = modalStack.length - 1;

    return (
        <ModalContext.Provider value={{ showLogin, showModal, closeModal, closeAllModals }}>
            {children}
            {modalStack.map((modal, index) => {
                const ModalComponent = MODAL_COMPONENTS[modal.type];
                const isTop = index === topIndex;

                return (
                    <div
                        key={modal.id}
                        style={{ display: isTop ? 'block' : 'none' }}
                    >
                        <ModalComponent
                            showLogin={showLogin}
                            {...modal.props}
                            isTop={isTop}
                            onClose={closeModal}
                        />
                    </div>
                )
            })}
        </ModalContext.Provider>
    )
}
