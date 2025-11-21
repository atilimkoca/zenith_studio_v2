// components/Auth/Login.jsx
import React, { useState, useEffect } from 'react';
import './Auth.css';
import zenithLogo from '../../assets/zenith_logo_rounded.jpg';
import authService from '../../services/authService';

const Login = ({ onSwitchToRegister, onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Load remembered credentials on component mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    
    if (rememberedEmail && rememberMe) {
      setFormData(prev => ({
        ...prev,
        email: rememberedEmail,
        rememberMe: true
      }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // If unchecking remember me, clear stored credentials
    if (name === 'rememberMe' && !checked) {
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberMe');
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

    if (!formData.email) {
      newErrors.email = 'E-posta adresi gerekli';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi girin';
    }

    if (!formData.password) {
      newErrors.password = 'Şifre gerekli';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Şifre en az 6 karakter olmalı';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const result = await authService.login(formData.email, formData.password);
      
      if (result.success) {
        // Handle remember me functionality
        if (formData.rememberMe) {
          localStorage.setItem('rememberedEmail', formData.email);
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('rememberedEmail');
          localStorage.removeItem('rememberMe');
        }

        if (onLogin) {
          onLogin({
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
    } catch (error) {
      setErrors({ 
        submit: 'Giriş işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-logo">
            <div className="logo-icon">
              <img src={zenithLogo} alt="Zenith Logo" className="logo-image" />
            </div>
            <h1 className="brand-name">Zénith</h1>
            <p className="brand-tagline">Spor & Yoga Stüdyosu</p>
          </div>
          <h2 className="auth-title">Hoş Geldiniz</h2>
          <p className="auth-subtitle">Hesabınıza giriş yapın</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
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

          <div className="form-row">
            <button type="button" className="forgot-password">
              Şifrenizi mi unuttunuz?
            </button>
            
            <label className="checkbox-wrapper">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="checkbox-input"
              />
              <span className="checkbox-custom"></span>
              <span className="checkbox-label">Beni hatırla</span>
            </label>
          </div>

          <button 
            type="submit" 
            className={`auth-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            <div className="auth-button-content">
              <span>{isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}</span>
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
            Hesabınız yok mu?{' '}
            <button 
              type="button" 
              className="switch-button"
              onClick={onSwitchToRegister}
            >
              Kayıt olun
            </button>
          </p>
        </div>


      </div>
    </div>
  );
};

export default Login;
