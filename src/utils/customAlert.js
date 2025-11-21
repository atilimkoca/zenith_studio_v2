// Custom Alert Utility - Slide-in notifications without React context
import React from 'react';

let alertContainer = null;
let alertId = 0;

// Utility function to show custom alerts
export const showCustomAlert = (message, type = 'success', duration = 4000) => {
  // Create container if it doesn't exist
  if (!alertContainer) {
    alertContainer = document.createElement('div');
    alertContainer.id = 'custom-alert-container';
    alertContainer.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      z-index: 10000;
      pointer-events: none;
    `;
    document.body.appendChild(alertContainer);
  }

  // Create unique alert element
  const alertElement = document.createElement('div');
  const currentAlertId = ++alertId;
  alertElement.id = `custom-alert-${currentAlertId}`;
  alertElement.className = 'custom-alert-wrapper';

  // Add to container
  alertContainer.appendChild(alertElement);

  // Create and render the alert directly with vanilla JS
  alertElement.innerHTML = `
    <div class="custom-alert-overlay">
      <div class="custom-alert ${type} custom-alert-enter">
        <div class="custom-alert-icon">${getIcon(type)}</div>
        <div class="custom-alert-message">${message}</div>
        <button class="custom-alert-close" aria-label="Close notification">×</button>
      </div>
    </div>
  `;

  // Get alert and close button elements
  const alertDiv = alertElement.querySelector('.custom-alert');
  const closeButton = alertElement.querySelector('.custom-alert-close');

  // Handle close function
  const handleClose = () => {
    alertDiv.classList.remove('custom-alert-enter-active');
    alertDiv.classList.add('custom-alert-exit-active');
    
    setTimeout(() => {
      if (alertElement && alertElement.parentNode) {
        alertElement.parentNode.removeChild(alertElement);
      }
    }, 300);
  };

  // Add event listener to close button
  closeButton.addEventListener('click', handleClose);

  // Enter animation
  setTimeout(() => {
    alertDiv.classList.remove('custom-alert-enter');
    alertDiv.classList.add('custom-alert-enter-active');
  }, 10);

  // Auto close timer
  setTimeout(() => {
    handleClose();
  }, duration);

  return currentAlertId;
};

// Helper function to get icon based on type
const getIcon = (type) => {
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