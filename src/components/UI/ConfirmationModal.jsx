import React from 'react';
import './ConfirmationModal.css';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning', // 'warning', 'danger', 'info'
  isLoading = false
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return '🗑️';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '⚠️';
    }
  };

  return (
    <div className="confirmation-modal-overlay" onClick={handleBackdropClick}>
      <div className={`confirmation-modal confirmation-modal-${type}`}>
        <div className="confirmation-modal-header">
          <div className="confirmation-icon">
            {getIcon()}
          </div>
          <h3 className="confirmation-title">{title}</h3>
        </div>
        
        <div className="confirmation-modal-body">
          <p className="confirmation-message">{message}</p>
        </div>
        
        <div className="confirmation-modal-footer">
          <button
            className="confirmation-btn confirmation-btn-cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            className={`confirmation-btn confirmation-btn-confirm confirmation-btn-${type}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading-spinner-small"></span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
