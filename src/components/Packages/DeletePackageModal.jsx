import React from 'react';
import './DeletePackageModal.css';

const DeletePackageModal = ({ isOpen, onClose, package: pkg, onConfirm, isLoading }) => {
  if (!isOpen || !pkg) return null;

  const handleConfirm = () => {
    onConfirm(pkg.id, pkg.name);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="delete-package-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon delete-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>

        <h2>Paketi Sil</h2>
        <p className="warning-text">
          <strong>{pkg.name}</strong> paketini silmek üzeresiniz. Bu işlem geri alınamaz.
        </p>
        
        <div className="package-info-box">
          <div className="info-item">
            <span className="info-label">Fiyat:</span>
            <span className="info-value">₺{pkg.price?.toLocaleString('tr-TR')}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Ders Hakkı:</span>
            <span className="info-value">
              {pkg.classes === 999 ? 'Sınırsız' : `${pkg.classes} ders`}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Süre:</span>
            <span className="info-value">{pkg.duration} ay</span>
          </div>
        </div>

        <p className="confirmation-text">
          Bu paketi silmek istediğinizden emin misiniz?
        </p>

        <div className="modal-actions">
          <button 
            className="cancel-btn" 
            onClick={onClose}
            disabled={isLoading}
          >
            İptal
          </button>
          <button 
            className="confirm-delete-btn" 
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Siliniyor...' : 'Evet, Sil'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeletePackageModal;
