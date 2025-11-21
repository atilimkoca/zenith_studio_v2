// Role-based access control component
import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const RoleGuard = ({ allowedRoles, children, fallback = null }) => {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return fallback;
  }
  
  if (!allowedRoles.includes(currentUser.role)) {
    return fallback;
  }
  
  return children;
};

export default RoleGuard;
