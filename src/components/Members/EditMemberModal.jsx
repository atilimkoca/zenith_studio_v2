import React, { useState, useEffect } from 'react';
import './EditMemberModal.css';
import PhoneInput from '../UI/PhoneInput';
import packageService from '../../services/packageService';

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
    if (validateForm()) {
      onSave(formData);
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

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="remainingClasses">Kalan Ders Sayısı</label>
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
