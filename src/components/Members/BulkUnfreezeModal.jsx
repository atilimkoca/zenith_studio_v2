import React, { useState, useEffect } from 'react';
import './BulkUnfreezeModal.css';

const BulkUnfreezeModal = ({ isOpen, onClose, onConfirm, isLoading = false }) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget && !isLoading) {
      handleClose();
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setReason('');
    onClose();
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onConfirm({
      reason: reason.trim()
    });
  };

  return (
    <div className="bulk-unfreeze-overlay" onClick={handleBackdropClick}>
      <div className="bulk-unfreeze-modal">
        <div className="bulk-unfreeze-header">
          <div className="bulk-unfreeze-icon">☀️</div>
          <div>
            <h3>Toplu Dondurma Kaldırma</h3>
            <p>Dondurulmuş tüm üyelikleri yeniden aktifleştirin</p>
          </div>
          <button className="bulk-unfreeze-close" onClick={handleClose} disabled={isLoading}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bulk-unfreeze-body">
            <div className="bulk-unfreeze-alert">
              <strong>Bilgilendirme:</strong> Bu işlem tüm dondurulmuş üyelikler için uygulanacaktır. Paket bitiş
              tarihleri, üyelerin gerçekten dondurulduğu süreye göre otomatik olarak güncellenecek.
            </div>

            <div className="bulk-unfreeze-card">
              <h4>Not (Opsiyonel)</h4>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Örn: Tatil dönemi sona erdiği için tüm üyelikleri tekrar aktifleştiriyoruz."
                disabled={isLoading}
                rows={4}
              />
              <span className="bulk-unfreeze-help">
                Bu not sadece kayıt amaçlıdır ve gelecekteki raporlamalarda kullanılabilir.
              </span>
            </div>

            <div className="bulk-unfreeze-summary">
              <h4>İşlem Özeti</h4>
              <ul>
                <li>Dondurulmuş tüm üyelikler yeniden aktifleştirilecek</li>
                <li>Paket bitiş tarihleri gerçek dondurma süresine göre güncellenecek</li>
                <li>Kalan ders hakları korunmaya devam edecek</li>
                <li>Aktif olmayan veya iptal edilmiş üyelikler etkilenmeyecek</li>
              </ul>
            </div>
          </div>

          <div className="bulk-unfreeze-footer">
            <button
              type="button"
              className="bulk-unfreeze-cancel"
              onClick={handleClose}
              disabled={isLoading}
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="bulk-unfreeze-confirm"
              disabled={isLoading}
            >
              {isLoading ? 'İşlem Devam Ediyor...' : 'Dondurmayı Kaldır'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkUnfreezeModal;
