import React, { useState } from 'react';
import './CancelMembershipModal.css';

const CancelMembershipModal = ({ 
  isOpen, 
  onClose, 
  member, 
  onConfirm, 
  isLoading = false 
}) => {
  const [reason, setReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');

  if (!isOpen || !member) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('İptal sebebi zorunludur');
      return;
    }
    
    const refund = parseFloat(refundAmount) || 0;
    onConfirm(member.id, {
      reason: reason.trim(),
      refundAmount: refund,
      memberName: member.displayName || `${member.firstName} ${member.lastName}`
    });
  };

  const handleClose = () => {
    if (!isLoading) {
      setReason('');
      setRefundAmount('');
      onClose();
    }
  };

  const memberName = member.displayName || `${member.firstName} ${member.lastName}`;

  return (
    <div className="cancel-membership-modal-overlay" onClick={handleBackdropClick}>
      <div className="cancel-membership-modal">
        <div className="cancel-membership-modal-header">
          <div className="cancel-icon">
            ❌
          </div>
          <h3 className="cancel-title">Üyelik İptali</h3>
          {!isLoading && (
            <button className="close-btn" onClick={handleClose}>
              ✕
            </button>
          )}
        </div>
        
        <div className="cancel-membership-modal-body">
          <div className="member-info-card">
            <div className="member-avatar-large">
              {memberName.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="member-details">
              <h4 className="member-name-large">{memberName}</h4>
              <p className="member-email">{member.email}</p>
              <p className="member-phone">{member.phone}</p>
              <div className="membership-info">
                <span className="membership-type">
                  {member.membershipType === 'basic' ? 'Temel' : 
                   member.membershipType === 'premium' ? 'Premium' : 
                   member.membershipType === 'unlimited' ? 'Sınırsız' : 'Temel'}
                </span>
                <span className="remaining-classes">
                  {member.remainingClasses === 999 ? 'Sınırsız' : 
                   `${member.remainingClasses || 0} ders kaldı`}
                </span>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="cancel-form">
            <div className="form-group">
              <label htmlFor="reason">İptal Sebebi *</label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Üyelik iptali sebebini açıklayın..."
                required
                disabled={isLoading}
                rows="3"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="refundAmount">İade Tutarı (₺)</label>
              <input
                type="number"
                id="refundAmount"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                disabled={isLoading}
              />
              <small className="form-help">İade yapılacak tutarı girin (opsiyonel)</small>
            </div>
          </form>
          
          <div className="cancel-warning">
            <div className="warning-icon">⚠️</div>
            <div className="warning-content">
              <p className="warning-message">
                <strong>{memberName}</strong> adlı üyenin üyeliğini iptal etmek istediğinizden emin misiniz?
              </p>
              <ul className="warning-list">
                <li>Üye artık derse katılamayacak</li>
                <li>Üyelik durumu "İptal Edildi" olarak işaretlenecek</li>
                <li>İptal edilen üyeler raporlar bölümünde görüntülenebilir</li>
                <li>Bu işlem daha sonra geri alınabilir</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="cancel-membership-modal-footer">
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={handleClose}
            disabled={isLoading}
          >
            Vazgeç
          </button>
          <button 
            type="submit" 
            className="btn-danger" 
            onClick={handleSubmit}
            disabled={isLoading || !reason.trim()}
          >
            Üyeliği İptal Et
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelMembershipModal;
