// Member Registration Component for Mobile App
import React, { useState } from 'react';
import authService from '../../services/authService';
import './MemberRegister.css';
import PhoneInput from '../UI/PhoneInput';

const MemberRegister = ({ onRegistrationComplete }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    birthDate: '',
    gender: '',
    membershipType: 'basic',
    emergencyContact: {
      name: '',
      phone: '',
      relation: ''
    },
    medicalConditions: '',
    fitnessGoals: '',
    acceptTerms: false
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('emergencyContact.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        emergencyContact: {
          ...prev.emergencyContact,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }

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
      const registrationData = {
        ...formData,
        medicalConditions: formData.medicalConditions,
        fitnessGoals: formData.fitnessGoals
      };

      const result = await authService.registerCustomer(registrationData);
      
      if (result.success) {
        setSuccess(true);
        if (onRegistrationComplete) {
          onRegistrationComplete(result.data);
        }
      } else {
        setErrors({ submit: result.error });
      }
    } catch (err) {
      console.error('Member registration error:', err);
      setErrors({ submit: 'Kayıt işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="member-register-success">
        <div className="success-icon">✅</div>
        <h2>Kayıt Başarılı!</h2>
        <p>Üyelik başvurunuz alındı. Yönetici onayından sonra üyeliğiniz aktif hale gelecektir.</p>
        <div className="success-info">
          <p><strong>Ad Soyad:</strong> {formData.firstName} {formData.lastName}</p>
          <p><strong>E-posta:</strong> {formData.email}</p>
          <p><strong>Telefon:</strong> {formData.phone}</p>
        </div>
        <p className="success-note">
          Onay durumunuzla ilgili e-posta ve SMS ile bilgilendirileceksiniz.
        </p>
      </div>
    );
  }

  return (
    <div className="member-register-container">
      <div className="member-register-header">
        <h1>Üyelik Başvurusu</h1>
        <p>Zénith Spor & Yoga Stüdyosu'na katılmak için bilgilerinizi doldurun</p>
      </div>

      <form className="member-register-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>Kişisel Bilgiler</h3>
          
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
                className={errors.lastName ? 'error' : ''}
                placeholder="Soyadınız"
              />
              {errors.lastName && <span className="error-message">{errors.lastName}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">E-posta Adresi *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
              placeholder="ornek@email.com"
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
                className={errors.password ? 'error' : ''}
                placeholder="En az 8 karakter"
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Şifre Onayı *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={errors.confirmPassword ? 'error' : ''}
                placeholder="Şifreyi tekrar girin"
              />
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone">Telefon Numarası *</label>
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
              <label htmlFor="gender">Cinsiyet *</label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={errors.gender ? 'error' : ''}
              >
                <option value="">Seçiniz</option>
                <option value="male">Erkek</option>
                <option value="female">Kadın</option>
                <option value="other">Diğer</option>
              </select>
              {errors.gender && <span className="error-message">{errors.gender}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="birthDate">Doğum Tarihi</label>
            <input
              type="date"
              id="birthDate"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Üyelik Tercihi</h3>
          
          <div className="form-group">
            <label htmlFor="membershipType">Üyelik Tipi</label>
            <select
              id="membershipType"
              name="membershipType"
              value={formData.membershipType}
              onChange={handleChange}
            >
              <option value="basic">Temel (8 ders/ay)</option>
              <option value="premium">Premium (16 ders/ay)</option>
              <option value="unlimited">Sınırsız</option>
            </select>
          </div>
        </div>

        <div className="form-section">
          <h3>Acil Durum İletişim</h3>
          
          <div className="form-group">
            <label htmlFor="emergencyContact.name">Ad Soyad</label>
            <input
              type="text"
              id="emergencyContact.name"
              name="emergencyContact.name"
              value={formData.emergencyContact.name}
              onChange={handleChange}
              placeholder="Acil durumda aranacak kişi"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="emergencyContact.phone">Telefon</label>
              <PhoneInput
                id="emergencyContact.phone"
                name="emergencyContact.phone"
                value={formData.emergencyContact.phone}
                onChange={handleChange}
                placeholder="5XX XXX XX XX"
                defaultCountry="TR"
              />
            </div>

            <div className="form-group">
              <label htmlFor="emergencyContact.relation">Yakınlık</label>
              <input
                type="text"
                id="emergencyContact.relation"
                name="emergencyContact.relation"
                value={formData.emergencyContact.relation}
                onChange={handleChange}
                placeholder="Anne, Baba, Eş vb."
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Sağlık ve Hedefler</h3>
          
          <div className="form-group">
            <label htmlFor="medicalConditions">Bilmemizde fayda olan sağlık durumları</label>
            <textarea
              id="medicalConditions"
              name="medicalConditions"
              value={formData.medicalConditions}
              onChange={handleChange}
              placeholder="Kronik hastalık, yaralanma geçmişi, kullandığınız ilaçlar vb."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="fitnessGoals">Fitness hedefleriniz</label>
            <textarea
              id="fitnessGoals"
              name="fitnessGoals"
              value={formData.fitnessGoals}
              onChange={handleChange}
              placeholder="Kilo verme, kas kazanma, esneklik artırma, stres azaltma vb."
              rows="3"
            />
          </div>
        </div>

        <div className="form-section">
          <div className="checkbox-group">
            <label className="checkbox-wrapper">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
              />
              <span className="checkbox-custom"></span>
              <span className="checkbox-label">
                Kullanım Koşulları ve Gizlilik Politikası'nı okudum ve kabul ediyorum *
              </span>
            </label>
            {errors.acceptTerms && <span className="error-message">{errors.acceptTerms}</span>}
          </div>
        </div>

        <button 
          type="submit" 
          className={`submit-btn ${isLoading ? 'loading' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? 'Başvuru Gönderiliyor...' : 'Üyelik Başvurusunu Gönder'}
        </button>

        {errors.submit && (
          <div className="error-message" style={{ textAlign: 'center', marginTop: '16px' }}>
            {errors.submit}
          </div>
        )}
      </form>
    </div>
  );
};

export default MemberRegister;
