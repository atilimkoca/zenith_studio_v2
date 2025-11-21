// Custom Alert Component - Slide-in notification without React context
import React, { useState, useEffect, useCallback } from 'react';
import './CustomAlert.css';

const CustomAlert = ({ message, type = 'success', duration = 4000, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose && onClose();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    // Enter animation
    setTimeout(() => setIsVisible(true), 10);

    // Auto close timer
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, handleClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div className="custom-alert-overlay">
      <div
        className={`custom-alert ${type} ${
          isVisible && !isExiting
            ? 'custom-alert-enter-active'
            : isExiting
            ? 'custom-alert-exit-active'
            : 'custom-alert-enter'
        }`}
      >
        <div className="custom-alert-icon">{getIcon()}</div>
        <div className="custom-alert-message">{message}</div>
        <button
          className="custom-alert-close"
          onClick={handleClose}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default CustomAlert;