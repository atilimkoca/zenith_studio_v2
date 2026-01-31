// Approval Modal Component
import React, { useState, useEffect } from 'react';
import './RenewPackageModal.css';
import './ApprovalModal.css';
import packageService from '../../services/packageService';

const ApprovalModal = ({ member, onApprove, onReject, onClose }) => {
  const [approvalData, setApprovalData] = useState({
    membershipType: 'basic',
    packageId: '',
    sessions: '2',
    price: '',
    classes: '8',
    duration: '1', // months
    paymentType: 'monthly',
    notes: ''
  });
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
          // Set default package if available
          if (result.data.length > 0) {
            const defaultPackage = result.data[0];
            setApprovalData(prev => ({
              ...prev,
              packageId: defaultPackage.id,
              membershipType: defaultPackage.sessions >= 5 ? 'unlimited' : defaultPackage.sessions >= 3 ? 'premium' : 'basic',
              sessions: defaultPackage.sessions.toString(),
              price: defaultPackage.price.toString(),
              classes: defaultPackage.classes.toString(),
              duration: defaultPackage.duration.toString()
            }));
          }
        }
      } catch (error) {
        console.error('Error loading packages:', error);
      } finally {
        setLoadingPackages(false);
      }
    };
    
    fetchPackages();
  }, []);

  // Fallback to hardcoded options if no packages in database
  const membershipOptions = {
    basic: { name: 'Temel', defaultClasses: 8, defaultPrice: 500 },
    premium: { name: 'Premium', defaultClasses: 16, defaultPrice: 800 },
    unlimited: { name: 'Sınırsız', defaultClasses: 999, defaultPrice: 1200 }
  };

  const formatCurrency = (value) => {
    const number = Number(value);
    if (Number.isNaN(number)) {
      return '₺0';
    }
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0
    }).format(number);
  };

  const memberName = member.displayName || [member.firstName, member.lastName].filter(Boolean).join(' ') || 'Üye';
  const memberEmail = member.email || 'E-posta bulunmuyor';
  const memberPhone = member.phone || 'Telefon bulunmuyor';
  const memberInitials = memberName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'ÜY';

  const handlePackageChange = (packageId) => {
    const selectedPackage = packages.find(pkg => pkg.id === packageId);

    if (selectedPackage) {
      // Handle different field names for lesson count
      const lessonCount = selectedPackage.lessonCount || selectedPackage.lessons || selectedPackage.classes || selectedPackage.sessionCount || 8;
      const sessions = selectedPackage.sessions || Math.ceil(lessonCount / 4) || 2;
      const duration = selectedPackage.duration || 1;
      const packageType = selectedPackage.packageType || 'group'; // Get package type

      setApprovalData(prev => ({
        ...prev,
        packageId: packageId,
        packageType: packageType, // Store package type
        packageName: selectedPackage.name,
        membershipType: sessions >= 5 ? 'unlimited' : sessions >= 3 ? 'premium' : 'basic',
        sessions: sessions.toString(),
        classes: lessonCount.toString(),
        price: (selectedPackage.price || 0).toString(),
        duration: duration.toString()
      }));
    }
  };

  const handleMembershipChange = (type) => {
    // If using database packages, find by sessions equivalent
    if (packages.length > 0) {
      const sessionMap = { 'basic': 2, 'premium': 4, 'unlimited': 5 };
      const packageBySessions = packages.find(pkg => pkg.sessions === sessionMap[type]);
      if (packageBySessions) {
        handlePackageChange(packageBySessions.id);
        return;
      }
    }
    
    // Fallback to hardcoded options
    const option = membershipOptions[type];
    const sessionMap = { 'basic': '2', 'premium': '4', 'unlimited': '5' };
    setApprovalData(prev => ({
      ...prev,
      membershipType: type,
      packageId: `fallback_${type}`, // Set a fallback packageId
      packageType: 'group', // Default to group for fallback packages
      packageName: option.name, // Set package name (Temel, Premium, Sınırsız)
      sessions: sessionMap[type],
      classes: option.defaultClasses.toString(),
      price: option.defaultPrice.toString()
    }));
  };

  const handleApprove = async () => {
    if (!approvalData.price || !approvalData.classes) {
      alert('Lütfen fiyat ve ders hakkı bilgilerini doldurun');
      return;
    }

    setLoading(true);
    try {
      const membershipDetails = {
        membershipType: approvalData.membershipType,
        packageId: approvalData.packageId || null,
        packageType: approvalData.packageType || 'group', // Include package type
        packageName: approvalData.packageName || '',
        sessions: parseInt(approvalData.sessions),
        price: parseFloat(approvalData.price),
        remainingClasses: parseInt(approvalData.classes),
        duration: parseInt(approvalData.duration),
        paymentType: approvalData.paymentType,
        approvalNotes: approvalData.notes,
        approvalDate: new Date().toISOString(),
        startDate: startDate // Include start date
      };

      await onApprove(member.id, member.displayName || `${member.firstName} ${member.lastName}`, membershipDetails);
    } catch (error) {
      console.error('Approval error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = approvalData.notes || 'Onaylanmadı';
    setLoading(true);
    try {
      await onReject(member.id, member.displayName || `${member.firstName} ${member.lastName}`, reason);
    } catch (error) {
      console.error('Rejection error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay members-modal-overlay" onClick={onClose}>
      <div className="renew-modal approval-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Üye Onayı</h2>
          <button className="close-btn" onClick={onClose} aria-label="Kapat">×</button>
        </div>

        <div className="modal-content">
          <div className="member-info-card">
            <div className="member-avatar">{memberInitials}</div>
            <div>
              <h3>{memberName}</h3>
              <p>{memberEmail}</p>
              <p>{memberPhone}</p>
              <span className="chip chip-pending">Onay bekliyor</span>
            </div>
          </div>

          <div className="approval-form">
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
                Üyelik bu tarihte başlayacak ve bitiş tarihi otomatik hesaplanacaktır.
              </p>
            </div>

            <div className="form-section">
              <h4>Paket Seçimi</h4>
              {loadingPackages ? (
                <div className="loading-packages">
                  <p>Paketler yükleniyor...</p>
                </div>
              ) : packages.length > 0 ? (
                <div className="package-options">
                  {packages.map((pkg) => {
                    const lessonCount = pkg.lessonCount || pkg.lessons || pkg.classes || pkg.sessionCount || 0;
                    const isSelected = approvalData.packageId === pkg.id;
                    return (
                      <label key={pkg.id} className={`package-option ${isSelected ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="packageId"
                          value={pkg.id}
                          checked={isSelected}
                          onChange={(e) => handlePackageChange(e.target.value)}
                        />
                        <div className="option-content">
                          <span className="option-name">{pkg.name}</span>
                          <span className="option-details">
                            {lessonCount} Ders - {formatCurrency(pkg.price || 0)}
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
                <div className="package-options">
                  {Object.entries(membershipOptions).map(([key, option]) => {
                    const isSelected = approvalData.membershipType === key;
                    return (
                      <label key={key} className={`package-option ${isSelected ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="membershipType"
                          value={key}
                          checked={isSelected}
                          onChange={(e) => handleMembershipChange(e.target.value)}
                        />
                        <div className="option-content">
                          <span className="option-name">{option.name}</span>
                          <span className="option-details">
                            {option.defaultClasses === 999 ? 'Sınırsız' : `${option.defaultClasses} Ders`} - {formatCurrency(option.defaultPrice)}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
              {packages.length === 0 && !loadingPackages && (
                <p className="no-packages-warning">
                  <small>ℹ️ Henüz paket tanımlanmamış. Varsayılan paketler kullanılıyor. <a href="#" onClick={(e) => { e.preventDefault(); }}>Paket Yönetimi</a>'ne gidin.</small>
                </p>
              )}
            </div>

            <div className="form-section">
              <h4>Ücret ve Ders Detayları</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Aylık Ücret (₺)</label>
                  <input
                    type="number"
                    value={approvalData.price}
                    onChange={(e) => setApprovalData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="500"
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Ders Hakkı</label>
                  <input
                    type="number"
                    value={approvalData.classes}
                    onChange={(e) => setApprovalData(prev => ({ ...prev, classes: e.target.value }))}
                    placeholder="8"
                    min="1"
                    max="999"
                    disabled={approvalData.membershipType === 'unlimited'}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Süre (Ay)</label>
                  <select
                    value={approvalData.duration}
                    onChange={(e) => setApprovalData(prev => ({ ...prev, duration: e.target.value }))}
                  >
                    <option value="1">1 Ay</option>
                    <option value="3">3 Ay</option>
                    <option value="6">6 Ay</option>
                    <option value="12">12 Ay</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Ödeme Tipi</label>
                  <select
                    value={approvalData.paymentType}
                    onChange={(e) => setApprovalData(prev => ({ ...prev, paymentType: e.target.value }))}
                  >
                    <option value="monthly">Aylık</option>
                    <option value="quarterly">3 Aylık</option>
                    <option value="yearly">Yıllık</option>
                    <option value="cash">Nakit</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Notlar (İsteğe Bağlı)</h4>
              <textarea
                className="notes-input"
                value={approvalData.notes}
                onChange={(e) => setApprovalData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Özel notlar, koşullar vb."
                rows="3"
              />
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button 
            className="cancel-btn" 
            onClick={handleReject}
            disabled={loading}
          >
            Reddet
          </button>
          <button 
            className="renew-btn" 
            onClick={handleApprove}
            disabled={loading}
          >
            {loading ? 'Onaylanıyor...' : 'Onayla'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalModal;
