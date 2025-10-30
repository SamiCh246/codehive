import { FaExclamationTriangle, FaTimes } from 'react-icons/fa'

export default function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  isLoading = false
}) {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal confirmation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="confirmation-modal__title">
            <FaExclamationTriangle className={`confirmation-modal__icon ${isDestructive ? 'destructive' : ''}`} />
            <h2>{title}</h2>
          </div>
          <button className="modal__close-btn" onClick={onClose} disabled={isLoading}>
            <FaTimes />
          </button>
        </div>

        <div className="modal__content">
          <p className="confirmation-modal__message">{message}</p>
        </div>

        <div className="modal__footer">
          <button 
            type="button" 
            className="btn btn--secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            className={`btn ${isDestructive ? 'btn--destructive' : 'btn--primary'}`}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
