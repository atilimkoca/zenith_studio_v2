import React, { useState, useEffect } from 'react';
import './EditMemberModal.css';
import PhoneInput from '../UI/PhoneInput';
import packageService from '../../services/packageService';
import memberService from '../../services/memberService';

const EditMemberModal = ({ isOpen, onClose, member, onSave, isLoading = false }) => {
  const [formData, setFormData] = useState({
    firstName: member?.firstName || '',
    lastName: member?.lastName || '',
    email: member?.email || '',
    phone: member?.phone || '',
    membershipType: member?.membershipType || 'basic',
    packageId: member?.packageId || '',
    packageName: member?.packageName || '',
    remainingClasses: member?.remainingClasses || 0,
    membershipStatus: member?.membershipStatus || 'active'
  });

  const [errors, setErrors] = useState({});
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(true);

  // State for all user packages (multi-package support)
  const [userPackages, setUserPackages] = useState([]);
  const [loadingUserPackages, setLoadingUserPackages] = useState(false);

  // State for package selection when editing (multi-package support)
  const [activePackages, setActivePackages] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [showPackageSelection, setShowPackageSelection] = useState(false);

  // Load packages on mount
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoadingPackages(true);
        const result = await packageService.getAllPackages();

        if (result.success) {
          setPackages(result.data);
        }
      } catch (error) {
        console.error('Error loading packages:', error);
      } finally {
        setLoadingPackages(false);
      }
    };

    if (isOpen) {
      fetchPackages();
    }
  }, [isOpen]);

  // Load user's packages (multi-package support)
  useEffect(() => {
    const fetchUserPackages = async () => {
      if (!member?.id) return;

      try {
        setLoadingUserPackages(true);
        const result = await memberService.getUserPackages(member.id);
        if (result.success) {
          setUserPackages(result.packages);
        }
      } catch (error) {
        console.error('Error loading user packages:', error);
      } finally {
        setLoadingUserPackages(false);
      }
    };

    if (isOpen && member?.id) {
      fetchUserPackages();
    }
  }, [isOpen, member?.id]);

  // Calculate active packages (non-expired, non-cancelled) for edit selection
  useEffect(() => {
    if (userPackages.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const active = userPackages.filter(pkg => {
        if (pkg.status === 'cancelled') return false;
        if (!pkg.expiryDate) return true; // No expiry date means still active

        try {
          const expiryDate = new Date(pkg.expiryDate);
          expiryDate.setHours(23, 59, 59, 999);
          return expiryDate >= today;
        } catch {
          return false;
        }
      });

      setActivePackages(active);

      // If more than one active package, show selection
      if (active.length > 1) {
        setShowPackageSelection(true);
        setSelectedPackageId(null); // Reset selection
      } else if (active.length === 1) {
        // Auto-select the only active package
        setSelectedPackageId(active[0].id);
        setShowPackageSelection(false);
      } else {
        setSelectedPackageId(null);
        setShowPackageSelection(false);
      }
    } else {
      setActivePackages([]);
      setSelectedPackageId(null);
      setShowPackageSelection(false);
    }
  }, [userPackages]);

  useEffect(() => {
    if (member) {
      setFormData({
        firstName: member.firstName || '',
        lastName: member.lastName || '',
        email: member.email || '',
        phone: member.phone || '',
        membershipType: member.membershipType || 'basic',
        packageId: member.packageId || '',
        packageName: member.packageName || '',
        remainingClasses: member.remainingClasses || 0,
        membershipStatus: member.membershipStatus || 'active'
      });
      setErrors({});
    }
  }, [member]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Ad gereklidir';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Soyad gereklidir';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-posta gereklidir';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi giriniz';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefon numarası gereklidir';
    }

    if (formData.remainingClasses < 0) {
      newErrors.remainingClasses = 'Kalan ders sayısı 0\'dan küçük olamaz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'remainingClasses' ? parseInt(value) || 0 : value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // If multiple active packages exist and none selected, show error
    if (showPackageSelection && !selectedPackageId) {
      setErrors(prev => ({
        ...prev,
        packageSelection: 'Lütfen düzenlemek istediğiniz paketi seçin'
      }));
      return;
    }

    if (validateForm()) {
      // Include selected package ID for updating the correct package
      onSave({
        ...formData,
        selectedPackageId: selectedPackageId
      });
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="edit-modal-overlay" onClick={handleBackdropClick}>
      <div className="edit-modal">
        <div className="edit-modal-header">
          <h3>Üye Bilgilerini Düzenle</h3>
          <button 
            className="edit-modal-close" 
            onClick={onClose}
            disabled={isLoading}
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="edit-modal-form">
          <div className="edit-modal-body">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">Ad *</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={errors.firstName ? 'error' : ''}
                  disabled={isLoading}
                />
                {errors.firstName && <span className="error-message">{errors.firstName}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="lastName">Soyad *</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={errors.lastName ? 'error' : ''}
                  disabled={isLoading}
                />
                {errors.lastName && <span className="error-message">{errors.lastName}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">E-posta *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? 'error' : ''}
                  disabled={isLoading}
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="phone">Telefon *</label>
                <PhoneInput
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  error={!!errors.phone}
                  disabled={isLoading}
                  placeholder="5XX XXX XX XX"
                  defaultCountry="TR"
                  required
                />
                {errors.phone && <span className="error-message">{errors.phone}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="packageId">Üyelik Tipi / Paket</label>
                {loadingPackages ? (
                  <div className="loading-packages-small">Paketler yükleniyor...</div>
                ) : packages.length > 0 ? (
                  <select
                    id="packageId"
                    name="packageId"
                    value={formData.packageId}
                    onChange={(e) => {
                      const selectedPackage = packages.find(pkg => pkg.id === e.target.value);
                      setFormData(prev => {
                        if (!selectedPackage) {
                          return {
                            ...prev,
                            packageId: '',
                            packageName: '',
                            membershipType: 'basic',
                            remainingClasses: 0
                          };
                        }

                        const rawClassCount = Number(
                          selectedPackage.classes ??
                          selectedPackage.lessonCount ??
                          selectedPackage.lessons ??
                          selectedPackage.sessions ??
                          0
                        );
                        const isUnlimitedPackage = rawClassCount === 999;
                        const normalizedClasses = isUnlimitedPackage
                          ? 999
                          : Number.isFinite(rawClassCount) && rawClassCount > 0
                            ? rawClassCount
                            : prev.remainingClasses || 0;
                        const derivedMembershipType = isUnlimitedPackage
                          ? 'unlimited'
                          : rawClassCount >= 12
                            ? 'premium'
                            : 'basic';

                        return {
                          ...prev,
                          packageId: e.target.value,
                          packageName: selectedPackage.name || '',
                          membershipType: derivedMembershipType,
                          remainingClasses: normalizedClasses
                        };
                      });
                    }}
                    disabled={isLoading}
                  >
                    <option value="">Paket Seçiniz</option>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} - {pkg.classes === 999 ? 'Sınırsız' : `${pkg.classes} ders`} - ₺{pkg.price}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    id="membershipType"
                    name="membershipType"
                    value={formData.membershipType}
                    onChange={handleChange}
                    disabled={isLoading}
                  >
                    <option value="basic">🎯 Temel</option>
                    <option value="premium">⭐ Premium</option>
                    <option value="unlimited">♾️ Sınırsız</option>
                  </select>
                )}
                {formData.packageName && (
                  <small className="package-info">Mevcut: {formData.packageName}</small>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="membershipStatus">Üyelik Durumu</label>
                <select
                  id="membershipStatus"
                  name="membershipStatus"
                  value={formData.membershipStatus}
                  onChange={handleChange}
                  disabled={isLoading}
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                </select>
              </div>
            </div>

            {/* Package Selection for Multi-Package Edit */}
            {showPackageSelection && activePackages.length > 1 && (
              <div className="form-row">
                <div className="form-group package-selection-group">
                  <label>Hangi Paketi Düzenlemek İstiyorsunuz? *</label>
                  <div className="package-selection-cards">
                    {activePackages.map((pkg) => {
                      const formatDate = (dateStr) => {
                        if (!dateStr) return '-';
                        try {
                          return new Date(dateStr).toLocaleDateString('tr-TR');
                        } catch {
                          return '-';
                        }
                      };

                      const isSelected = selectedPackageId === pkg.id;

                      return (
                        <div
                          key={pkg.id}
                          className={`package-selection-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedPackageId(pkg.id);
                            // Update remainingClasses to show selected package's remaining
                            setFormData(prev => ({
                              ...prev,
                              remainingClasses: pkg.remainingLessons || 0
                            }));
                            // Clear selection error
                            if (errors.packageSelection) {
                              setErrors(prev => ({
                                ...prev,
                                packageSelection: ''
                              }));
                            }
                          }}
                        >
                          <div className="selection-card-header">
                            <span className="selection-card-name">{pkg.packageName}</span>
                            {isSelected && <span className="selection-checkmark">✓</span>}
                          </div>
                          <div className="selection-card-info">
                            <span>📅 {formatDate(pkg.startDate)} - {formatDate(pkg.expiryDate)}</span>
                          </div>
                          <div className="selection-card-stats">
                            <span><strong>{pkg.remainingLessons}</strong> Kalan</span>
                            <span><strong>{pkg.totalLessons}</strong> Toplam</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {errors.packageSelection && <span className="error-message">{errors.packageSelection}</span>}
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="remainingClasses">
                  Kalan Ders Sayısı
                  {selectedPackageId && activePackages.length > 1 && (
                    <span className="selected-package-label">
                      {' '}(Seçili Paket)
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  id="remainingClasses"
                  name="remainingClasses"
                  value={formData.remainingClasses}
                  onChange={handleChange}
                  min="0"
                  max="999"
                  className={errors.remainingClasses ? 'error' : ''}
                  disabled={isLoading}
                />
                {errors.remainingClasses && <span className="error-message">{errors.remainingClasses}</span>}
              </div>
            </div>

            {/* All Packages Section */}
            {userPackages.length > 0 && (
              <div className="user-packages-section">
                <h4 className="packages-section-title">
                  Tüm Paketler ({userPackages.length})
                </h4>
                <div className="user-packages-list">
                  {userPackages.map((pkg, index) => {
                    const isActive = pkg.status === 'active';
                    const isExpired = pkg.status === 'expired';
                    const isUpcoming = pkg.status === 'upcoming';

                    const statusClass = isActive ? 'active' : isExpired ? 'expired' : isUpcoming ? 'upcoming' : 'depleted';
                    const statusText = isActive ? 'Aktif' : isExpired ? 'Süresi Doldu' : isUpcoming ? 'Yaklaşan' : 'Tükendi';

                    const formatDate = (dateStr) => {
                      if (!dateStr) return '-';
                      try {
                        return new Date(dateStr).toLocaleDateString('tr-TR');
                      } catch {
                        return '-';
                      }
                    };

                    return (
                      <div key={pkg.id || index} className={`user-package-card ${statusClass}`}>
                        <div className="package-card-header">
                          <span className="package-card-name">{pkg.packageName}</span>
                          <span className={`package-status-badge ${statusClass}`}>{statusText}</span>
                        </div>
                        <div className="package-card-dates">
                          📅 {formatDate(pkg.startDate)} - {formatDate(pkg.expiryDate)}
                        </div>
                        <div className="package-card-stats">
                          <span className="stat">
                            <strong>{pkg.remainingLessons}</strong> Kalan
                          </span>
                          <span className="stat">
                            <strong>{(pkg.totalLessons || 0) - (pkg.remainingLessons || 0)}</strong> Kullanılan
                          </span>
                          <span className="stat">
                            <strong>{pkg.totalLessons}</strong> Toplam
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {loadingUserPackages && (
              <div className="loading-packages-section">
                <span>Paketler yükleniyor...</span>
              </div>
            )}
          </div>
          
          <div className="edit-modal-footer">
            <button
              type="button"
              className="edit-btn-cancel"
              onClick={onClose}
              disabled={isLoading}
            >
              İptal
            </button>
            <button
              type="submit"
              className="edit-btn-save"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading-spinner-small"></span>
                  Kaydediliyor...
                </>
              ) : (
                'Kaydet'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMemberModal;
