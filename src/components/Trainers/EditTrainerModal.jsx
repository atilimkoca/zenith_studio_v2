// Edit Trainer Modal Component
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import PhoneInput from '../UI/PhoneInput';

const EditTrainerModal = ({ trainer, isOpen, onClose, onSave }) => {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    specializations: [],
    certifications: [],
    experience: '',
    isActive: true,
    role: 'instructor'
  });
  const [loading, setSaving] = useState(false);
  const [newSpecialization, setNewSpecialization] = useState('');
  const [newCertification, setNewCertification] = useState('');

  useEffect(() => {
    if (trainer) {
      setFormData({
        firstName: trainer.firstName || '',
        lastName: trainer.lastName || '',
        email: trainer.email || '',
        phone: trainer.phone || '',
        bio: trainer.trainerProfile?.bio || '',
        specializations: trainer.trainerProfile?.specializations || [],
        certifications: trainer.trainerProfile?.certifications || [],
        experience: trainer.trainerProfile?.experience || '',
        isActive: trainer.trainerProfile?.isActive !== false,
        role: trainer.role || 'instructor'
      });
    }
  }, [trainer]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const addSpecialization = () => {
    if (newSpecialization.trim() && !formData.specializations.includes(newSpecialization.trim())) {
      setFormData(prev => ({
        ...prev,
        specializations: [...prev.specializations, newSpecialization.trim()]
      }));
      setNewSpecialization('');
    }
  };

  const removeSpecialization = (index) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.filter((_, i) => i !== index)
    }));
  };

  const addCertification = () => {
    if (newCertification.trim() && !formData.certifications.includes(newCertification.trim())) {
      setFormData(prev => ({
        ...prev,
        certifications: [...prev.certifications, newCertification.trim()]
      }));
      setNewCertification('');
    }
  };

  const removeCertification = (index) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await onSave(trainer.id, formData);
      onClose();
    } catch (error) {
      console.error('Error saving trainer:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Eğitmen Bilgilerini Düzenle</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Ad</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Soyad</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>E-posta</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Telefon</label>
              <PhoneInput
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="5XX XXX XX XX"
                defaultCountry="TR"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Hakkında</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={3}
              placeholder="Eğitmen hakkında bilgi..."
            />
          </div>

          <div className="form-group">
            <label>Deneyim</label>
            <input
              type="text"
              name="experience"
              value={formData.experience}
              onChange={handleChange}
              placeholder="Örn: 5+ yıl yoga eğitmenliği"
            />
          </div>

          <div className="form-group">
            <label>Uzmanlık Alanları</label>
            <div className="tag-input">
              <input
                type="text"
                value={newSpecialization}
                onChange={(e) => setNewSpecialization(e.target.value)}
                placeholder="Yeni uzmanlık alanı ekle"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialization())}
              />
              <button type="button" onClick={addSpecialization}>Ekle</button>
            </div>
            <div className="tags-list">
              {formData.specializations.map((spec, index) => (
                <span key={index} className="tag">
                  {spec}
                  <button type="button" onClick={() => removeSpecialization(index)}>×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Sertifikalar</label>
            <div className="tag-input">
              <input
                type="text"
                value={newCertification}
                onChange={(e) => setNewCertification(e.target.value)}
                placeholder="Yeni sertifika ekle"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
              />
              <button type="button" onClick={addCertification}>Ekle</button>
            </div>
            <div className="tags-list">
              {formData.certifications.map((cert, index) => (
                <span key={index} className="tag">
                  {cert}
                  <button type="button" onClick={() => removeCertification(index)}>×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
              />
              Aktif Eğitmen
            </label>
          </div>

          {/* Role Management - Only for Admins */}
          {currentUser?.role === 'admin' && (
            <div className="form-group">
              <label>Kullanıcı Rolü</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="role-select"
              >
                <option value="instructor">Eğitmen</option>
                <option value="admin">Yönetici</option>
              </select>
              <small className="form-hint">
                {formData.role === 'admin' 
                  ? '⚠️ Yönetici rolü tam sisteme erişim sağlar' 
                  : 'ℹ️ Eğitmen rolü sınırlı erişim sağlar'
                }
              </small>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              İptal
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTrainerModal;
