// Initial Admin Setup Component
// This component should be used ONLY for creating the first admin user
// Remove or disable this component after creating the initial admin

import React, { useState } from 'react';
import './Auth.css';
import zenithLogo from '../../assets/zenith_logo_rounded.jpg';
import authService from '../../services/authService';
import PhoneInput from '../UI/PhoneInput';

const InitialSetup = ({ onSetupComplete, onBackToLogin }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    birthDate: '',
    gender: '',
    acceptTerms: false
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Ad gerekli';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Soyad gerekli';
    }
    if (!formData.email) {
      newErrors.email = 'E-posta adresi gerekli';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi girin';
    }
    if (!formData.password) {
      newErrors.password = 'Şifre gerekli';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Şifre en az 8 karakter olmalı';
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifre onayı gerekli';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifreler eşleşmiyor';
    }
    if (!formData.phone) {
      newErrors.phone = 'Telefon numarası gerekli';
    }
    if (!formData.gender) {
      newErrors.gender = 'Cinsiyet seçimi gerekli';
    }
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'Kullanım koşullarını kabul etmelisiniz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      // Register the initial admin (bypasses referral code requirement)
      const result = await authService.registerInitialAdmin(formData);
      
      if (result.success) {
        alert('İlk admin kullanıcı başarıyla oluşturuldu! Artık giriş yapabilir ve referans kodları oluşturabilirsiniz.');
        
        if (onSetupComplete) {
          onSetupComplete({
            ...formData,
            user: result.user
          });
        }
      } else {
        setErrors({ 
          submit: result.error 
        });
      }
    } catch (error) {
      setErrors({ 
        submit: 'Admin kullanıcı oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card register-card">
        <div className="auth-header">
          <div className="brand-logo">
            <div className="logo-icon">
              <img src={zenithLogo} alt="Zenith Logo" className="logo-image" />
            </div>
            <h1 className="brand-name">Zénith</h1>
            <p className="brand-tagline">İlk Kurulum</p>
          </div>
          <h2 className="auth-title">Admin Hesabı Oluştur</h2>
          <p className="auth-subtitle">Sistem yöneticisi hesabınızı oluşturun</p>
        </div>

        <div className="setup-warning">
          <div className="warning-box">
            <h4>⚠️ Önemli Uyarı</h4>
            <p>Bu form sadece ilk admin kullanıcıyı oluşturmak için kullanılmalıdır. Admin oluşturduktan sonra bu sayfayı devre dışı bırakın.</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">Ad *</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={errors.firstName ? 'form-input error' : 'form-input'}
                placeholder="Adınız"
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
                className={errors.lastName ? 'form-input error' : 'form-input'}
                placeholder="Soyadınız"
              />
              {errors.lastName && <span className="error-message">{errors.lastName}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">E-posta *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'form-input error' : 'form-input'}
              placeholder="admin@zenithyoga.com"
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Şifre *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'form-input error' : 'form-input'}
                placeholder="En az 8 karakter"
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Şifre Tekrarı *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={errors.confirmPassword ? 'form-input error' : 'form-input'}
                placeholder="Şifrenizi tekrar girin"
              />
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone">Telefon *</label>
              <PhoneInput
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                error={!!errors.phone}
                placeholder="5XX XXX XX XX"
                defaultCountry="TR"
                required
              />
              {errors.phone && <span className="error-message">{errors.phone}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="birthDate">Doğum Tarihi</label>
              <input
                type="date"
                id="birthDate"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="gender">Cinsiyet *</label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className={errors.gender ? 'form-input error' : 'form-input'}
            >
              <option value="">Cinsiyet Seçin</option>
              <option value="female">Kadın</option>
              <option value="male">Erkek</option>
              <option value="other">Diğer</option>
            </select>
            {errors.gender && <span className="error-message">{errors.gender}</span>}
          </div>

          <div className="form-group">
            <label className="checkbox-container">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
                className="checkbox-input"
              />
              <span className="checkmark"></span>
              <span className="checkbox-text">
                Kullanım koşullarını kabul ediyorum *
              </span>
            </label>
            {errors.acceptTerms && <span className="error-message">{errors.acceptTerms}</span>}
          </div>

          {errors.submit && (
            <div className="error-message submit-error">
              {errors.submit}
            </div>
          )}

          <button 
            type="submit" 
            className={`auth-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            <div className="auth-button-content">
              <span>{isLoading ? 'Admin oluşturuluyor...' : 'Admin Hesabı Oluştur'}</span>
            </div>
          </button>
        </form>

        <div className="auth-footer">
          <p className="switch-auth">
            Zaten hesabınız var mı?{' '}
            <button 
              type="button" 
              className="switch-button"
              onClick={onBackToLogin}
            >
              Giriş yapın
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default InitialSetup;
