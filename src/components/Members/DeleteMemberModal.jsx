import React from 'react';
import './DeleteMemberModal.css';

const DeleteMemberModal = ({ 
  isOpen, 
  onClose, 
  member, 
  onConfirm, 
  isLoading = false 
}) => {
  if (!isOpen || !member) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const memberName = member.displayName || `${member.firstName} ${member.lastName}`;

  return (
    <div className="delete-modal-overlay" onClick={handleBackdropClick}>
      <div className="delete-modal">
        <div className="delete-modal-header">
          <div className="delete-icon">
            🗑️
          </div>
          <h3 className="delete-title">Üyeyi Sil</h3>
        </div>
        
        <div className="delete-modal-body">
          <div className="member-info-card">
            <div className="member-avatar-large">
              {memberName.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="member-details">
              <h4 className="member-name-large">{memberName}</h4>
              <p className="member-email">{member.email}</p>
              <p className="member-phone">{member.phone}</p>
            </div>
          </div>
          
          <div className="delete-warning">
            <p className="warning-message">
              <strong>{memberName}</strong> adlı üyeyi silmek istediğinizden emin misiniz?
            </p>
            <p className="warning-note">
              Üye aktif listeden kaldırılacak ve <strong>Raporlar</strong> bölümündeki "Silinen Üyeler" 
              kısmına taşınacaktır. Firebase Auth hesabı korunacaktır.
            </p>
          </div>
        </div>
        
        <div className="delete-modal-footer">
          <button
            className="delete-btn-cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            İptal
          </button>
          <button
            className="delete-btn-confirm"
            onClick={() => onConfirm(member.id, memberName)}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner-small"></span>
                Siliniyor...
              </>
            ) : (
              <>
                🗑️ Raporlara Taşı
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteMemberModal;
