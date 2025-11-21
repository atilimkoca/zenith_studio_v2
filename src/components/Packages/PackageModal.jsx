import React, { useState, useEffect } from 'react';
import './PackageModal.css';

const PackageModal = ({ isOpen, onClose, package: pkg, onSave, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    classes: '12',
    price: '',
    description: '',
    packageType: 'group'
  });

  useEffect(() => {
    if (pkg) {
      setFormData({
        name: pkg.name || '',
        classes: pkg.classes?.toString() || '12',
        price: pkg.price?.toString() || '',
        description: pkg.description || '',
        packageType: pkg.packageType || 'group'
      });
    } else {
      setFormData({
        name: '',
        classes: '12',
        price: '',
        description: '',
        packageType: 'group'
      });
    }
  }, [pkg, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const classes = parseInt(formData.classes);
    const price = parseFloat(formData.price) || 0;
    const packageName = formData.name.trim() || (classes === 999 ? 'Sınırsız Paket' : `${classes} Ders Paketi`);
    
    const packageData = {
      name: packageName,
      description: formData.description.trim(),
      sessions: classes, // Same as classes for monthly
      classes: classes,
      price: price,
      duration: 1, // Always 1 month
      features: [],
      isActive: true,
      packageType: formData.packageType
    };

    await onSave(packageData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{pkg ? 'Paketi Düzenle' : 'Yeni Paket Oluştur'}</h3>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="packageName">Paket Adı *</label>
              <input
                type="text"
                id="packageName"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Örn: Premium Üyelik"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="classes">Aylık Ders Hakkı *</label>
              <input
                type="number"
                id="classes"
                value={formData.classes}
                onChange={(e) => setFormData(prev => ({ ...prev, classes: e.target.value }))}
                placeholder="12"
                min="1"
                max="999"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="price">Ücret (₺) *</label>
              <input
                type="number"
                id="price"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="600"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="packageType">Paket Tipi *</label>
              <select
                id="packageType"
                value={formData.packageType}
                onChange={(e) => setFormData(prev => ({ ...prev, packageType: e.target.value }))}
                required
              >
                <option value="group">Grup Dersi Paketi</option>
                <option value="one-on-one">Bire Bir Ders Paketi</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="description">Açıklama</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Paket hakkında kısa açıklama"
                rows={4}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={isLoading}
            >
              İptal
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Kaydediliyor...' : pkg ? 'Güncelle' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PackageModal;
