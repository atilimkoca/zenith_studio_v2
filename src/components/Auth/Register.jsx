// components/Auth/Register.jsx
import React, { useState } from 'react';
import './Auth.css';
import zenithLogo from '../../assets/zenith_logo_rounded.jpg';
import authService from '../../services/authService';
import referralCodeService from '../../services/referralCodeService';
import PhoneInput from '../UI/PhoneInput';

const Register = ({ onSwitchToLogin, onRegister }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    birthDate: '',
    gender: '',
    referralCode: '',
    acceptTerms: false,
    receiveUpdates: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

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
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermeli';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifre onayı gerekli';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifreler eşleşmiyor';
    }

    if (!formData.phone) {
      newErrors.phone = 'Telefon numarası gerekli';
    } else {
      // Remove country code and spaces to validate the actual phone number
      const phoneDigits = formData.phone.replace(/^\+\d+\s*/, '').replace(/\s/g, '');
      if (!/^\d{10,11}$/.test(phoneDigits)) {
        newErrors.phone = 'Geçerli bir telefon numarası girin';
      }
    }

    if (!formData.gender) {
      newErrors.gender = 'Cinsiyet seçimi gerekli';
    }

    if (!formData.referralCode.trim()) {
      newErrors.referralCode = 'Referans kodu gereklidir';
    } else if (formData.referralCode.length !== 8) {
      newErrors.referralCode = 'Referans kodu 8 karakter olmalıdır';
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
      // Debug logging for referral code
      console.log('🔍 Register component - Referral code validation:', {
        submittedCode: formData.referralCode,
        codeLength: formData.referralCode.length,
        trimmedCode: formData.referralCode.trim(),
        trimmedLength: formData.referralCode.trim().length
      });

      // First validate the referral code
      const referralValidation = await referralCodeService.validateReferralCode(formData.referralCode);
      
      console.log('🔍 Register component - Validation result:', referralValidation);
      
      if (!referralValidation.success) {
        setErrors({ 
          referralCode: referralValidation.error 
        });
        setIsLoading(false);
        return;
      }

      // Register the user with instructor role (staff registration)
      const registrationData = {
        ...formData,
        role: 'instructor' // Staff members get instructor role
      };
      
      const result = await authService.register(registrationData);
      
      if (result.success) {
        // Mark referral code as used
        await referralCodeService.useReferralCode(
          formData.referralCode,
          result.user.uid,
          `${formData.firstName} ${formData.lastName}`
        );

        if (onRegister) {
          onRegister({
            ...formData,
            user: result.user
          });
        }
      } else {
        // Set server error
        setErrors({ 
          submit: result.error 
        });
      }
    } catch (err) {
      console.error('Registration error:', err);
      setErrors({ 
        submit: 'Hesap oluşturma işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.' 
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
            <p className="brand-tagline">Spor & Yoga Stüdyosu</p>
          </div>
          <h2 className="auth-title">Hesap Oluşturun</h2>
          <p className="auth-subtitle">Referans kodunuzla kayıt olun</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName" className="form-label">
                Ad
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`form-input ${errors.firstName ? 'error' : ''}`}
                  placeholder="Adınız"
                />
                <div className="input-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
              </div>
              {errors.firstName && <span className="error-message">{errors.firstName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="lastName" className="form-label">
                Soyad
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`form-input ${errors.lastName ? 'error' : ''}`}
                  placeholder="Soyadınız"
                />
                <div className="input-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
              </div>
              {errors.lastName && <span className="error-message">{errors.lastName}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              E-posta Adresi
            </label>
            <div className="input-wrapper">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="ornek@email.com"
              />
              <div className="input-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
            </div>
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="form-label">
              Telefon Numarası
            </label>
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
            <label htmlFor="gender" className="form-label">
              Cinsiyet
            </label>
            <div className="input-wrapper">
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={`form-input ${errors.gender ? 'error' : ''}`}
              >
                <option value="">Cinsiyet seçiniz</option>
                <option value="male">Erkek</option>
                <option value="female">Kadın</option>
                <option value="other">Diğer</option>
              </select>
              <div className="input-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v6m0 6v6"/>
                  <path d="m21 12-6-6-6 6-6-6"/>
                </svg>
              </div>
            </div>
            {errors.gender && <span className="error-message">{errors.gender}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="referralCode" className="form-label">
              Referans Kodu *
            </label>
            <div className="input-wrapper">
              <input
                type="text"
                id="referralCode"
                name="referralCode"
                value={formData.referralCode}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  referralCode: e.target.value.toUpperCase()
                }))}
                className={`form-input ${errors.referralCode ? 'error' : ''}`}
                placeholder="8 karakterlik referans kodu"
                maxLength={8}
                style={{ 
                  fontFamily: 'monospace', 
                  fontSize: '16px', 
                  textAlign: 'center',
                  letterSpacing: '2px'
                }}
              />
              <div className="input-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
            </div>
            {errors.referralCode && <span className="error-message">{errors.referralCode}</span>}
            <small className="form-help">
              Referans kodunuzu yöneticinizden alabilirsiniz.
            </small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Şifre
              </label>
              <div className="input-wrapper">
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="••••••••"
                />
                <div className="input-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <circle cx="12" cy="16" r="1"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
              </div>
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Şifre Onayı
              </label>
              <div className="input-wrapper">
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                  placeholder="••••••••"
                />
                <div className="input-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <circle cx="12" cy="16" r="1"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
              </div>
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="birthDate" className="form-label">
              Doğum Tarihi (İsteğe bağlı)
            </label>
            <div className="input-wrapper">
              <input
                type="date"
                id="birthDate"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
                className="form-input"
                placeholder="gg.aa.yyyy"
              />
              <div className="input-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="checkbox-group">
            <label className="checkbox-wrapper">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
                className="checkbox-input"
              />
              <span className="checkbox-custom"></span>
              <span className="checkbox-label">
                <button 
                  type="button" 
                  className="link-button"
                  onClick={() => setShowTermsModal(true)}
                >
                  Kullanım Koşulları
                </button>
                {' ve '}
                <button 
                  type="button" 
                  className="link-button"
                  onClick={() => setShowPrivacyModal(true)}
                >
                  Gizlilik Politikası
                </button>
                'nı kabul ediyorum
              </span>
            </label>
            {errors.acceptTerms && <span className="error-message">{errors.acceptTerms}</span>}

            <label className="checkbox-wrapper">
              <input
                type="checkbox"
                name="receiveUpdates"
                checked={formData.receiveUpdates}
                onChange={handleChange}
                className="checkbox-input"
              />
              <span className="checkbox-custom"></span>
              <span className="checkbox-label">
                E-posta ile güncellemeler almak istiyorum
              </span>
            </label>
          </div>

          <button 
            type="submit" 
            className={`auth-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            <div className="auth-button-content">
              <span>{isLoading ? 'Hesap oluşturuluyor...' : 'Hesap Oluştur'}</span>
            </div>
          </button>
          
          {errors.submit && (
            <div className="error-message" style={{ textAlign: 'center', marginTop: '16px' }}>
              {errors.submit}
            </div>
          )}
        </form>

        <div className="auth-footer">
          <p className="switch-auth">
            Zaten hesabınız var mı?{' '}
            <button 
              type="button" 
              className="switch-button"
              onClick={onSwitchToLogin}
            >
              Giriş yapın
            </button>
          </p>
        </div>
      </div>

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="modal-overlay" onClick={() => setShowPrivacyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Gizlilik Politikası</h3>
              <button 
                className="modal-close"
                onClick={() => setShowPrivacyModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <h4>1. Kişisel Verilerin Toplanması</h4>
              <p>Zénith Spor & Yoga Stüdyosu olarak, hizmetlerimizi sunabilmek için gerekli olan kişisel verilerinizi toplamaktayız. Bu veriler arasında:</p>
              <ul>
                <li>İletişim bilgileriniz (ad, soyad, telefon, e-posta)</li>
                <li>Üyelik bilgileriniz</li>
                <li>Antrenman geçmişiniz</li>
                <li>Sağlık durumunuza ilişkin bilgiler</li>
              </ul>

              <h4>2. Verilerin Kullanım Amacı</h4>
              <p>Topladığımız kişisel veriler aşağıdaki amaçlarla kullanılmaktadır:</p>
              <ul>
                <li>Üyelik hizmetlerinin sunulması</li>
                <li>Antrenman programlarının düzenlenmesi</li>
                <li>İletişim kurulması</li>
                <li>Güvenlik önlemlerinin alınması</li>
              </ul>

              <h4>3. Veri Güvenliği</h4>
              <p>Kişisel verileriniz güvenli sunucularda saklanmakta ve yetkisiz erişimlere karşı korunmaktadır. Verileriniz üçüncü şahıslarla paylaşılmamaktadır.</p>

              <h4>4. Haklarınız</h4>
              <p>KVKK kapsamında verilerinize erişim, düzeltme, silme ve işlemeyi durdurma haklarınız bulunmaktadır. Bu konularda bizimle iletişime geçebilirsiniz.</p>
            </div>
          </div>
        </div>
      )}

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div className="modal-overlay" onClick={() => setShowTermsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Kullanım Koşulları</h3>
              <button 
                className="modal-close"
                onClick={() => setShowTermsModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <h4>1. Üyelik Koşulları</h4>
              <p>Zénith Spor & Yoga Stüdyosu'na üye olarak aşağıdaki koşulları kabul etmiş sayılırsınız:</p>
              <ul>
                <li>Stüdyo kurallarına uygun davranmak</li>
                <li>Ekipmanları özenli kullanmak</li>
                <li>Diğer üyelere saygılı olmak</li>
                <li>Sağlık durumunuzla ilgili doğru bilgi vermek</li>
              </ul>

              <h4>2. Ücret ve Ödeme</h4>
              <ul>
                <li>Üyelik ücretleri zamanında ödenmelidir</li>
                <li>Gecikme durumunda ek ücret alınabilir</li>
                <li>İade koşulları ayrıca belirtilmiştir</li>
              </ul>

              <h4>3. İptal ve Dondurma</h4>
              <ul>
                <li>Üyelik iptali 30 gün önceden bildirilmelidir</li>
                <li>Sağlık raporu ile üyelik dondurulabilir</li>
                <li>Dondurma süresi maksimum 6 aydır</li>
              </ul>

              <h4>4. Sorumluluk</h4>
              <p>Stüdyo içerisinde meydana gelebilecek yaralanma ve hasarlardan stüdyo sorumlu değildir. Üyeler kendi sorumluluklarında antrenman yaparlar.</p>

              <h4>5. Güvenlik</h4>
              <p>Stüdyo alanında güvenlik kameraları bulunmaktadır. Üyeler bu durumu kabul etmiş sayılırlar.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
