import React, { useState } from 'react';
import './FreezeMembershipModal.css';

const FreezeMembershipModal = ({ 
  isOpen, 
  onClose, 
  member, 
  onConfirm, 
  isLoading = false 
}) => {
  const [reason, setReason] = useState('');
  const [freezeEndDate, setFreezeEndDate] = useState('');

  if (!isOpen || !member) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Dondurma sebebi zorunludur');
      return;
    }
    
    if (!freezeEndDate) {
      alert('Dondurma bitiş tarihi zorunludur');
      return;
    }
    
    // Check if end date is in the future
    const endDate = new Date(freezeEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (endDate <= today) {
      alert('Dondurma bitiş tarihi bugünden sonra olmalıdır');
      return;
    }
    
    onConfirm(member.id, {
      reason: reason.trim(),
      freezeEndDate: endDate.toISOString(),
      freezeType: 'individual', // Mark as individual freeze
      memberName: member.displayName || `${member.firstName} ${member.lastName}`
    });
  };

  const handleClose = () => {
    if (!isLoading) {
      setReason('');
      setFreezeEndDate('');
      onClose();
    }
  };

  const memberName = member.displayName || `${member.firstName} ${member.lastName}`;

  // Set minimum date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="freeze-membership-modal-overlay" onClick={handleBackdropClick}>
      <div className="freeze-membership-modal">
        <div className="freeze-membership-modal-header">
          <div className="freeze-icon">
            ❄️
          </div>
          <h3 className="freeze-title">Üyelik Dondurma</h3>
          {!isLoading && (
            <button className="close-btn" onClick={handleClose}>
              ✕
            </button>
          )}
        </div>
        
        <div className="freeze-membership-modal-body">
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
          
          <form onSubmit={handleSubmit} className="freeze-form">
            <div className="form-group">
              <label htmlFor="reason">Dondurma Sebebi *</label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Üyelik dondurma sebebini açıklayın..."
                required
                disabled={isLoading}
                rows="3"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="freezeEndDate">Dondurma Bitiş Tarihi *</label>
              <input
                type="date"
                id="freezeEndDate"
                value={freezeEndDate}
                onChange={(e) => setFreezeEndDate(e.target.value)}
                min={minDate}
                required
                disabled={isLoading}
              />
              <small className="form-help">Üyeliğin hangi tarihe kadar dondurulacağını seçin</small>
            </div>
          </form>
          
          <div className="freeze-warning">
            <div className="warning-icon">❄️</div>
            <div className="warning-content">
              <p className="warning-message">
                <strong>{memberName}</strong> adlı üyenin üyeliğini dondurmak istediğinizden emin misiniz?
              </p>
              <ul className="warning-list">
                <li>Üye belirlenen tarihe kadar derse katılamayacak</li>
                <li>Kalan ders sayısı korunacak</li>
                <li>Üyelik durumu "Donduruldu" olarak işaretlenecek</li>
                <li>Dondurulmuş üyeler raporlar bölümünde görüntülenebilir</li>
                <li>Bu işlem daha sonra geri alınabilir</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="freeze-membership-modal-footer">
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
            className="btn-freeze" 
            onClick={handleSubmit}
            disabled={isLoading || !reason.trim() || !freezeEndDate}
          >
            Üyeliği Dondur
          </button>
        </div>
      </div>
    </div>
  );
};

export default FreezeMembershipModal;
