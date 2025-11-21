import React from 'react';
import './NotificationSystem.css';
import { useNotification } from '../../contexts/NotificationContext.jsx';

const NotificationSystem = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
          onClick={() => removeNotification(notification.id)}
        >
          <div className="notification-content">
            <div className="notification-icon">
              {notification.type === 'success' && '✓'}
              {notification.type === 'error' && '✕'}
              {notification.type === 'warning' && '⚠'}
              {notification.type === 'info' && 'ℹ'}
            </div>
            <div className="notification-message">
              {notification.message}
            </div>
          </div>
          <button
            className="notification-close"
            onClick={(e) => {
              e.stopPropagation();
              removeNotification(notification.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;
