// Referral Codes Management Component (Admin Only)
import React, { useState, useEffect } from 'react';
import './ReferralCodes.css';
import referralCodeService from '../../services/referralCodeService';
import { useAuth } from '../../contexts/AuthContext';

const ReferralCodes = () => {
  const { currentUser } = useAuth();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCodeData, setNewCodeData] = useState({
    instructorName: '',
    notes: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [codesResult, statsResult] = await Promise.all([
        referralCodeService.getAllReferralCodes(),
        referralCodeService.getStatistics()
      ]);
      
      if (codesResult.success) {
        setCodes(codesResult.codes);
        
        // TEMPORARY: Auto-create a test code if none exist
        if (codesResult.codes.length === 0 && currentUser) {
          console.log('🔄 No referral codes found, creating test code...');
          const testResult = await referralCodeService.createReferralCode(
            currentUser.uid || 'test-admin',
            `${currentUser.firstName || 'Test'} ${currentUser.lastName || 'Admin'}`,
            'Test Instructor',
            'Auto-created test code for debugging'
          );
          
          if (testResult.success) {
            console.log('✅ Test referral code created:', testResult.code);
            showNotification(`Test kodu oluşturuldu: ${testResult.code}`, 'success');
            // Reload data to show the new code
            const newCodesResult = await referralCodeService.getAllReferralCodes();
            if (newCodesResult.success) {
              setCodes(newCodesResult.codes);
            }
          }
        }
      }
      
      if (statsResult.success) {
        setStatistics(statsResult.stats);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCreateCode = async () => {
    if (!currentUser) return;

    setIsCreating(true);
    try {
      const result = await referralCodeService.createReferralCode(
        currentUser.uid,
        `${currentUser.firstName} ${currentUser.lastName}`,
        newCodeData.instructorName,
        newCodeData.notes
      );
      
      if (result.success) {
        showNotification(`Referans kodu oluşturuldu: ${result.code}`, 'success');
        setShowCreateModal(false);
        setNewCodeData({ instructorName: '', notes: '' });
        loadData(); // Refresh data
      } else {
        showNotification('Hata: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Error creating code:', error);
      showNotification('Kod oluşturulurken bir hata oluştu.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCode = async (codeId, code) => {
    setShowDeleteConfirm({ codeId, code });
  };

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return;

    try {
      const result = await referralCodeService.deleteReferralCode(showDeleteConfirm.codeId);
      
      if (result.success) {
        showNotification('Referans kodu silindi.', 'success');
        loadData(); // Refresh data
      } else {
        showNotification('Hata: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Error deleting code:', error);
      showNotification('Kod silinirken bir hata oluştu.', 'error');
    } finally {
      setShowDeleteConfirm(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (code) => {
    const now = new Date();
    
    if (code.isUsed) {
      return <span className="status-badge status-used">Kullanıldı</span>;
    } else if (code.expiresAt && now > code.expiresAt) {
      return <span className="status-badge status-expired">Süresi Doldu</span>;
    } else {
      return <span className="status-badge status-active">Aktif</span>;
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showNotification('Referans kodu panoya kopyalandı!', 'success');
    }).catch(() => {
      showNotification('Kopyalama başarısız oldu.', 'error');
    });
  };



  return (
    <div className="referral-codes">
      <div className="page-header">
        <h1>Referans Kodları</h1>
        <p>Yeni eğitmenler için referans kodları oluşturun ve yönetin</p>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          Yeni Kod Oluştur
        </button>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="statistics-grid">
          <div className="stat-card">
            <div className="stat-number">{statistics.total}</div>
            <div className="stat-label">Toplam Kod</div>
          </div>
          <div className="stat-card active">
            <div className="stat-number">{statistics.active}</div>
            <div className="stat-label">Aktif Kod</div>
          </div>
          <div className="stat-card used">
            <div className="stat-number">{statistics.used}</div>
            <div className="stat-label">Kullanılan</div>
          </div>
          <div className="stat-card expired">
            <div className="stat-number">{statistics.expired}</div>
            <div className="stat-label">Süresi Dolmuş</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">Yükleniyor...</div>
      ) : (
        <div className="codes-list">
          {codes.length === 0 ? (
            <div className="empty-state">
              <p>Henüz referans kodu oluşturulmamış.</p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                İlk Kodu Oluştur
              </button>
            </div>
          ) : (
            <div className="codes-table">
              <div className="table-header">
                <div className="col-code">Kod</div>
                <div className="col-instructor">Eğitmen</div>
                <div className="col-status">Durum</div>
                <div className="col-created">Oluşturan</div>
                <div className="col-date">Tarih</div>
                <div className="col-actions">İşlemler</div>
              </div>
              
              {codes.map(code => (
                <div key={code.id} className="table-row">
                  <div className="col-code">
                    <code 
                      className="referral-code"
                      onClick={() => copyToClipboard(code.code)}
                      title="Kopyalamak için tıklayın"
                    >
                      {code.code}
                    </code>
                  </div>
                  <div className="col-instructor">
                    <div className="instructor-info">
                      <div className="instructor-name">
                        {code.instructorName || 'Belirtilmemiş'}
                      </div>
                      {code.notes && (
                        <div className="instructor-notes">{code.notes}</div>
                      )}
                      {code.isUsed && code.usedByName && (
                        <div className="used-by">
                          Kullanan: {code.usedByName}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-status">
                    {getStatusBadge(code)}
                  </div>
                  <div className="col-created">
                    <div className="creator-info">
                      <div className="creator-name">{code.createdByName}</div>
                    </div>
                  </div>
                  <div className="col-date">
                    <div className="date-info">
                      <div className="created-date">{formatDate(code.createdAt)}</div>
                      {code.isUsed && (
                        <div className="used-date">
                          Kullanıldı: {formatDate(code.usedAt)}
                        </div>
                      )}
                      {!code.isUsed && code.expiresAt && (
                        <div className="expires-date">
                          Bitiş: {formatDate(code.expiresAt)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-actions">
                    {!code.isUsed && (
                      <button 
                        className="btn btn-danger btn-small"
                        onClick={() => handleDeleteCode(code.id, code.code)}
                      >
                        Sil
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Code Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Yeni Referans Kodu Oluştur</h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="instructorName">Eğitmen Adı (Opsiyonel)</label>
                <input
                  type="text"
                  id="instructorName"
                  value={newCodeData.instructorName}
                  onChange={(e) => setNewCodeData(prev => ({
                    ...prev,
                    instructorName: e.target.value
                  }))}
                  placeholder="Örn: Ayşe Yılmaz"
                />
                <small>Bu kod hangi eğitmen için oluşturuluyor?</small>
              </div>
              
              <div className="form-group">
                <label htmlFor="notes">Notlar (Opsiyonel)</label>
                <textarea
                  id="notes"
                  value={newCodeData.notes}
                  onChange={(e) => setNewCodeData(prev => ({
                    ...prev,
                    notes: e.target.value
                  }))}
                  placeholder="Bu kod hakkında not ekleyin..."
                  rows={3}
                />
              </div>
              
              <div className="info-box">
                <p><strong>Bilgi:</strong></p>
                <ul>
                  <li>Kod otomatik olarak 8 karakter uzunluğunda oluşturulacak</li>
                  <li>Kod 30 gün boyunca geçerli olacak</li>
                  <li>Kod yalnızca bir kez kullanılabilir</li>
                </ul>
              </div>
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewCodeData({ instructorName: '', notes: '' });
                }}
                disabled={isCreating}
              >
                İptal
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleCreateCode}
                disabled={isCreating}
              >
                {isCreating ? 'Oluşturuluyor...' : 'Kodu Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-content">
            {notification.message}
          </div>
          <button 
            className="notification-close"
            onClick={() => setNotification(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal small-modal">
            <div className="modal-header">
              <h3>Kodu Sil</h3>
            </div>
            <div className="modal-body">
              <p>
                <strong>"{showDeleteConfirm.code}"</strong> kodunu silmek istediğinizden emin misiniz?
              </p>
              <p className="warning-text">Bu işlem geri alınamaz.</p>
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(null)}
              >
                İptal
              </button>
              <button 
                className="btn btn-danger"
                onClick={confirmDelete}
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralCodes;