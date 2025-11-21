// components/Auth/AuthContainer.jsx
import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';
import InitialSetup from './InitialSetup';
// Removed trainer request components - using direct registration with referral codes
import { useAuth } from '../../contexts/AuthContext';

const AuthContainer = ({ onAuthSuccess }) => {
  const [currentView, setCurrentView] = useState('login'); // login, register, initialSetup
  const { login, register } = useAuth();

  // Navigation handlers
  const handleSwitchToLogin = () => setCurrentView('login');
  const handleSwitchToRegister = () => setCurrentView('register');
  const handleSwitchToInitialSetup = () => setCurrentView('initialSetup');

  const handleLogin = async (loginData) => {
    console.log('Login successful:', loginData);
    // Firebase auth state change will be handled by AuthContext
    if (onAuthSuccess && loginData.user) {
      onAuthSuccess({
        type: 'login',
        user: loginData.user
      });
    }
  };

  const handleRegister = async (registerData) => {
    console.log('Registration successful:', registerData);
    // Firebase auth state change will be handled by AuthContext
    if (onAuthSuccess && registerData.user) {
      onAuthSuccess({
        type: 'register',
        user: registerData.user
      });
    }
  };

  const handleInitialSetupComplete = async (setupData) => {
    console.log('Initial setup completed:', setupData);
    // Firebase auth state change will be handled by AuthContext
    if (onAuthSuccess && setupData.user) {
      onAuthSuccess({
        type: 'initialSetup',
        user: setupData.user
      });
    }
  };

  // Render current view
  const renderCurrentView = () => {
    switch (currentView) {
      case 'login':
        return (
          <Login 
            onSwitchToRegister={handleSwitchToRegister}
            onSwitchToInitialSetup={handleSwitchToInitialSetup}
            onLogin={handleLogin}
          />
        );
      case 'register':
        return (
          <Register 
            onSwitchToLogin={handleSwitchToLogin}
            onRegister={handleRegister}
          />
        );
      case 'initialSetup':
        return (
          <InitialSetup
            onBackToLogin={handleSwitchToLogin}
            onSetupComplete={handleInitialSetupComplete}
          />
        );
      default:
        return (
          <Login 
            onSwitchToRegister={handleSwitchToRegister}
            onSwitchToInitialSetup={handleSwitchToInitialSetup}
            onLogin={handleLogin}
          />
        );
    }
  };

  return renderCurrentView();
};

export default AuthContainer;
