// Notification Modal Component
import React, { useState, useEffect } from 'react';
import './NotificationModal.css';
import RecipientSelector from './RecipientSelector';
import manualNotificationService from '../../services/manualNotificationService';
import { resolveRecipients } from '../../utils/recipientResolver';

const NotificationModal = ({ isOpen, onClose, onSend }) => {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info' // info, success, warning, error
  });
  const [spec, setSpec] = useState({ mode: 'all' });
  const [audience, setAudience] = useState([]);

  // Reset form + load audience when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({ title: '', message: '', type: 'info' });
      setSpec({ mode: 'all' });
      manualNotificationService.getAudience().then((res) => {
        if (res.success) setAudience(res.users);
      });
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const recipientCount = resolveRecipients(spec, audience).count;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.message.trim()) {
      return;
    }
    if (spec.mode !== 'all' && recipientCount === 0) {
      return;
    }

    try {
      // Pass the targeting spec up; Dashboard sends via manualNotificationService.
      await onSend({ ...formData, spec });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="notification-modal-overlay" onClick={handleBackdropClick}>
      <div className="notification-modal">
        <div className="notification-modal-header">
          <h3>Bildirim Oluştur</h3>
          <button 
            className="notification-modal-close" 
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="notification-modal-form">
          <div className="notification-modal-body">
            <div className="form-group">
              <label htmlFor="title">Başlık *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Bildirim başlığı"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="message">Mesaj *</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Bildirim mesajı"
                rows="4"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="type">Bildirim Türü</label>
              <select id="type" name="type" value={formData.type} onChange={handleChange}>
                <option value="info">Bilgi</option>
                <option value="success">Başarı</option>
                <option value="warning">Uyarı</option>
                <option value="error">Hata</option>
              </select>
            </div>

            <div className="form-group">
              <label>Alıcılar</label>
              <RecipientSelector audience={audience} spec={spec} onChange={setSpec} />
            </div>
          </div>
          
          <div className="notification-modal-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
            >
              İptal
            </button>
            <button
              type="submit"
              className="btn-send"
              disabled={
                !formData.title.trim() ||
                !formData.message.trim() ||
                (spec.mode !== 'all' && recipientCount === 0)
              }
            >
              {spec.mode === 'all' ? 'Bildirim Gönder' : `${recipientCount} kişiye gönder`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NotificationModal;
