// Renew Package Modal Component
import React, { useState, useEffect } from 'react';
import './RenewPackageModal.css';
import packageService from '../../services/packageService';

const RenewPackageModal = ({ member, onRenew, onClose }) => {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Load packages on mount
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoadingPackages(true);
        const result = await packageService.getActivePackages();
        
        if (result.success) {
          setPackages(result.data);
        }
      } catch (error) {
        console.error('Error loading packages:', error);
      } finally {
        setLoadingPackages(false);
      }
    };
    
    fetchPackages();
  }, []);

  const handleRenew = async () => {
    if (!selectedPackage) {
      alert('Lütfen bir paket seçin');
      return;
    }

    setLoading(true);
    try {
      await onRenew(member.id, selectedPackage.id, startDate);
    } catch (error) {
      console.error('Renewal error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay members-modal-overlay" onClick={onClose}>
      <div className="renew-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Paket Yenile</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="member-info">
            <div className="member-avatar">
              {member.displayName ? member.displayName.split(' ').map(n => n[0]).join('') : 'ÜY'}
            </div>
            <div>
              <h3>{member.displayName || `${member.firstName} ${member.lastName}`}</h3>
              <p>{member.email}</p>
            </div>
          </div>

          <div className="renew-form">
            <div className="form-section">
              <h4>Başlangıç Tarihi</h4>
              <input
                type="date"
                className="date-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="date-help-text">
                Paket bu tarihte başlayacak ve bitiş tarihi otomatik hesaplanacaktır.
              </p>
            </div>

            <div className="form-section">
              <h4>Yeni Paket Seçimi</h4>
              {loadingPackages ? (
                <div className="loading-packages">
                  <p>Paketler yükleniyor...</p>
                </div>
              ) : packages.length > 0 ? (
                <div className="package-options">
                  {packages.map((pkg) => {
                    const lessonCount = pkg.lessonCount || pkg.lessons || pkg.classes || pkg.sessionCount || 0;
                    return (
                      <label key={pkg.id} className="package-option">
                        <input
                          type="radio"
                          name="packageId"
                          value={pkg.id}
                          checked={selectedPackage?.id === pkg.id}
                          onChange={() => setSelectedPackage(pkg)}
                        />
                        <div className="option-content">
                          <span className="option-name">{pkg.name}</span>
                          <span className="option-details">
                            {lessonCount} Ders - {pkg.price || 0} ₺
                          </span>
                          {pkg.description && (
                            <span className="option-description">{pkg.description}</span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="no-packages">
                  <p>Aktif paket bulunamadı. Lütfen önce paket oluşturun.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button 
            className="cancel-btn" 
            onClick={onClose}
            disabled={loading}
          >
            İptal
          </button>
          <button 
            className="renew-btn" 
            onClick={handleRenew}
            disabled={loading || !selectedPackage}
          >
            {loading ? 'Yenileniyor...' : 'Paketi Yenile'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RenewPackageModal;
