// components/Auth/AuthDemo.jsx
import React, { useState } from 'react';
import AuthContainer from './AuthContainer';

const AuthDemo = () => {
  const [showAuth, setShowAuth] = useState(true);
  const [authResult, setAuthResult] = useState(null);

  const handleAuthSuccess = (authData) => {
    setAuthResult(authData);
    setShowAuth(false);
  };

  const handleBackToAuth = () => {
    setShowAuth(true);
    setAuthResult(null);
  };

  if (showAuth) {
    return <AuthContainer onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div style={{ 
      padding: '40px', 
      maxWidth: '600px', 
      margin: '0 auto',
      textAlign: 'center',
      fontFamily: 'Inter, sans-serif'
    }}>
      <h1 style={{ color: '#4A5B4B', marginBottom: '24px' }}>
        🎉 Giriş Başarılı!
      </h1>
      
      <div style={{
        background: 'white',
        padding: '32px',
        borderRadius: '16px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        marginBottom: '24px'
      }}>
        <h3 style={{ marginBottom: '16px', color: '#374151' }}>
          Kullanıcı Bilgileri
        </h3>
        <pre style={{ 
          background: '#F3F4F6', 
          padding: '16px', 
          borderRadius: '8px',
          textAlign: 'left',
          fontSize: '14px'
        }}>
          {JSON.stringify(authResult, null, 2)}
        </pre>
      </div>

      <button
        onClick={handleBackToAuth}
        style={{
          background: 'linear-gradient(135deg, #5A6B5B 0%, #4A5B4B 100%)',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        Giriş Sayfasına Dön
      </button>
    </div>
  );
};

export default AuthDemo;
