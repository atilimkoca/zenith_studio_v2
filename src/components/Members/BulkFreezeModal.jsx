import React, { useState, useEffect } from 'react';
import './BulkFreezeModal.css';

const BulkFreezeModal = ({ isOpen, onClose, onConfirm, isLoading = false }) => {
  const [reason, setReason] = useState('');
  const [freezeEndDate, setFreezeEndDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setFreezeEndDate('');
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget && !isLoading) {
      handleClose();
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setReason('');
    setFreezeEndDate('');
    onClose();
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!reason.trim()) {
      alert('Dondurma sebebi zorunludur');
      return;
    }

    if (!freezeEndDate) {
      alert('Dondurma bitiş tarihi zorunludur');
      return;
    }

    const endDate = new Date(freezeEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(endDate.getTime()) || endDate <= today) {
      alert('Dondurma bitiş tarihi bugünden sonra olmalıdır');
      return;
    }

    onConfirm({
      reason: reason.trim(),
      freezeEndDate: endDate.toISOString()
    });
  };

  return (
    <div className="bulk-freeze-overlay" onClick={handleBackdropClick}>
      <div className="bulk-freeze-modal">
        <div className="bulk-freeze-header">
          <div className="bulk-freeze-icon">❄️</div>
          <div>
            <h3>Toplu Üyelik Dondurma</h3>
            <p>Tüm aktif üyelikleri belirlediğiniz tarihe kadar dondurun</p>
          </div>
          <button className="bulk-freeze-close" onClick={handleClose} disabled={isLoading}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bulk-freeze-body">
            <div className="bulk-freeze-alert">
              <strong>Bilgilendirme:</strong> Bu işlem tüm aktif üyeler için uygulanacaktır. Zaten dondurulmuş veya iptal edilmiş üyelikler etkilenmez.
            </div>

            <div className="bulk-freeze-grid">
              <div className="bulk-freeze-card">
                <h4>Dondurma Sebebi *</h4>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Örn: Bayram tatili sebebiyle tüm üyelikleri 15 günlüğüne donduruyoruz."
                  disabled={isLoading}
                  rows={4}
                  required
                />
              </div>

              <div className="bulk-freeze-card">
                <h4>Bitiş Tarihi *</h4>
                <input
                  type="date"
                  value={freezeEndDate}
                  onChange={(e) => setFreezeEndDate(e.target.value)}
                  min={minDate}
                  disabled={isLoading}
                  required
                />
                <span className="bulk-freeze-help">
                  Seçtiğiniz tarihte üyelikler otomatik olarak yeniden aktifleştirilmeye hazır hale gelecek.
                </span>
              </div>
            </div>

            <div className="bulk-freeze-summary">
              <h4>İşlem Özeti</h4>
              <ul>
                <li>Tüm aktif ve onaylanmış üyelikler dondurulacak</li>
                <li>Kalan ders sayıları korunacak ve dersler düşmeyecek</li>
                <li>Paket bitiş tarihleri dondurma süresi kadar otomatik uzatılacak</li>
                <li>Zaten dondurulmuş veya iptal edilmiş üyelikler atlanacak</li>
              </ul>
            </div>
          </div>

          <div className="bulk-freeze-footer">
            <button
              type="button"
              className="bulk-freeze-cancel"
              onClick={handleClose}
              disabled={isLoading}
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="bulk-freeze-confirm"
              disabled={isLoading}
            >
              {isLoading ? 'İşlem Devam Ediyor...' : 'Tüm Üyeleri Dondur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkFreezeModal;
