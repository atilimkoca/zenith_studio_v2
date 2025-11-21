// Authentication Context
import React, { createContext, useContext, useEffect, useState } from 'react';
import authService from '../services/authService';

const AuthContext = createContext({});

// useAuth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange(async (user) => {
      if (user) {
        // User is signed in - get additional user data from Firestore
        try {
          const userData = await authService.getUserData(user.uid);
          
          // Check if user is permanently deleted
          if (userData.status === 'permanently_deleted' || userData.loginDisabled) {
            console.warn('🚫 User is permanently deleted, logging out:', user.email);
            // Force logout the user
            await authService.logout();
            setCurrentUser(null);
            setIsAuthenticated(false);
            setLoading(false);
            return;
          }
          
          const fullUserData = {
            ...user,
            ...userData,
            uid: user.uid,
            email: user.email,
            displayName: user.displayName
          };
          
          setCurrentUser(fullUserData);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Error loading user data:', error);
          // Still set the basic user data if Firestore fails
          setCurrentUser(user);
          setIsAuthenticated(true);
        }
      } else {
        // User is signed out
        setCurrentUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    });

    return unsubscribe; // Cleanup subscription on unmount
  }, []);

  const login = async (email, password) => {
    return await authService.login(email, password);
  };

  const register = async (userData) => {
    return await authService.register(userData);
  };

  const logout = async () => {
    const result = await authService.logout();
    if (result.success) {
      // Clear remembered credentials on logout
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      if (!rememberMe) {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberMe');
      }
      
      setCurrentUser(null);
      setIsAuthenticated(false);
    }
    return result;
  };

  const resetPassword = async (email) => {
    return await authService.resetPassword(email);
  };

  // Role-based access control helpers
  const isAdmin = () => {
    return currentUser?.role === 'admin';
  };

  const isTrainer = () => {
    return currentUser?.role === 'trainer';
  };

  const hasRole = (role) => {
    return currentUser?.role === role;
  };

  const hasAnyRole = (roles) => {
    return roles.includes(currentUser?.role);
  };

  const refreshUserData = async () => {
    if (currentUser?.uid) {
      try {
        const userData = await authService.getUserData(currentUser.uid);
        const fullUserData = {
          ...currentUser,
          ...userData,
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName
        };
        setCurrentUser(fullUserData);
        return fullUserData;
      } catch (error) {
        console.error('Error refreshing user data:', error);
        return currentUser;
      }
    }
    return currentUser;
  };

  const value = {
    currentUser,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    resetPassword,
    refreshUserData,
    // Role helpers
    isAdmin,
    isTrainer,
    hasRole,
    hasAnyRole
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
