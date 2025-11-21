import React, { useState, useEffect } from 'react';
import './Packages.css';
import packageService from '../../services/packageService';
import { useNotification } from '../../contexts/NotificationContext';
import PackageModal from './PackageModal';
import DeletePackageModal from './DeletePackageModal';

const Packages = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const { showSuccess, showError } = useNotification();
  
  // Modal states
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const result = await packageService.getAllPackages();
      
      if (result.success) {
        setPackages(result.data);
      } else {
        showError('Paketler yüklenirken hata oluştu');
      }
    } catch (error) {
      console.error('Load packages error:', error);
      showError('Paketler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreatePackage = () => {
    setSelectedPackage(null);
    setPackageModalOpen(true);
  };

  const handleEditPackage = (pkg) => {
    setSelectedPackage(pkg);
    setPackageModalOpen(true);
  };

  const handleDeleteClick = (pkg) => {
    setSelectedPackage(pkg);
    setDeleteModalOpen(true);
  };

  const handleToggleStatus = async (pkg) => {
    try {
      const updatedPackage = {
        ...pkg,
        isActive: !pkg.isActive
      };

      const result = await packageService.updatePackage(pkg.id, updatedPackage);
      
      if (result.success) {
        await loadPackages();
        showSuccess(`Paket ${updatedPackage.isActive ? 'aktif' : 'pasif'} edildi`);
      } else {
        showError('Paket durumu güncellenirken hata oluştu');
      }
    } catch (error) {
      console.error('Toggle status error:', error);
      showError('Paket durumu güncellenirken hata oluştu');
    }
  };

  const handleSavePackage = async (packageData) => {
    try {
      setIsProcessing(true);
      let result;

      if (selectedPackage) {
        result = await packageService.updatePackage(selectedPackage.id, packageData);
      } else {
        result = await packageService.createPackage(packageData);
      }

      if (result.success) {
        setPackageModalOpen(false);
        setSelectedPackage(null);
        await loadPackages();
        showSuccess(selectedPackage ? 'Paket güncellendi' : 'Paket oluşturuldu');
      } else {
        showError(result.error || 'İşlem başarısız');
      }
    } catch (error) {
      console.error('Save package error:', error);
      showError('Paket kaydedilirken hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedPackage) return;

    try {
      setIsProcessing(true);
      const result = await packageService.deletePackage(selectedPackage.id);

      if (result.success) {
        setDeleteModalOpen(false);
        setSelectedPackage(null);
        await loadPackages();
        showSuccess('Paket silindi');
      } else {
        showError(result.error || 'Silme işlemi başarısız');
      }
    } catch (error) {
      console.error('Delete package error:', error);
      showError('Paket silinirken hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pkg.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' ||
                         (filterType === 'active' && pkg.isActive) ||
                         (filterType === 'inactive' && !pkg.isActive);
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="packages-container">
        <div className="loading-container">
          <div className="loading-header">
            <div className="loading-skeleton skeleton-header"></div>
            <div className="loading-skeleton skeleton-subtitle"></div>
          </div>
          
          <div className="loading-controls">
            <div className="loading-skeleton skeleton-search"></div>
            <div className="loading-skeleton skeleton-filter"></div>
          </div>

          <div className="loading-grid">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="loading-card">
                <div className="loading-card-header">
                  <div className="loading-skeleton skeleton-badge"></div>
                  <div className="loading-skeleton skeleton-toggle"></div>
                </div>
                <div className="loading-skeleton skeleton-title"></div>
                <div className="loading-skeleton skeleton-text"></div>
                <div className="loading-skeleton skeleton-text" style={{ width: '70%' }}></div>
                <div className="loading-details">
                  <div className="loading-skeleton skeleton-detail"></div>
                  <div className="loading-skeleton skeleton-detail"></div>
                  <div className="loading-skeleton skeleton-detail"></div>
                </div>
                <div className="loading-actions">
                  <div className="loading-skeleton skeleton-button"></div>
                  <div className="loading-skeleton skeleton-button"></div>
                </div>
              </div>
            ))}
          </div>

          <div className="loading-overlay">
            <div className="loading-spinner-modern">
              <div className="spinner-dot spinner-dot-1"></div>
              <div className="spinner-dot spinner-dot-2"></div>
              <div className="spinner-dot spinner-dot-3"></div>
            </div>
            <p className="loading-text">Paketler yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="packages-container">
      <div className="packages-header">
        <div className="header-left">
          <h1>Paket Yönetimi</h1>
          <p className="header-subtitle">
            {packages.length} paket • {packages.filter(p => p.isActive).length} aktif
          </p>
        </div>
        <button className="create-btn" onClick={handleCreatePackage}>
          <span>+</span> Yeni Paket
        </button>
      </div>

      <div className="packages-toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Paket ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-tabs">
          <button
            className={`filter-tab ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            Tümü ({packages.length})
          </button>
          <button
            className={`filter-tab ${filterType === 'active' ? 'active' : ''}`}
            onClick={() => setFilterType('active')}
          >
            Aktif ({packages.filter(p => p.isActive).length})
          </button>
          <button
            className={`filter-tab ${filterType === 'inactive' ? 'active' : ''}`}
            onClick={() => setFilterType('inactive')}
          >
            Pasif ({packages.filter(p => !p.isActive).length})
          </button>
        </div>
      </div>

      {filteredPackages.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>Paket bulunamadı</h3>
          <p>
            {searchTerm
              ? 'Arama kriterlerinize uygun paket bulunamadı'
              : 'Henüz paket eklenmemiş. Hemen bir paket oluşturun!'}
          </p>
          {!searchTerm && (
            <button className="create-btn" onClick={handleCreatePackage}>
              <span>+</span> İlk Paketi Oluştur
            </button>
          )}
        </div>
      ) : (
        <div className="packages-grid">
          {filteredPackages.map((pkg) => (
            <div key={pkg.id} className={`package-card ${!pkg.isActive ? 'inactive' : ''}`}>
              <div className="package-card-inner">
                <div className="package-header">
                  <span className={`package-type-badge ${pkg.packageType === 'one-on-one' ? 'one-on-one' : 'group'}`}>
                    {pkg.packageType === 'one-on-one' ? '👤 Bire Bir' : '👥 Grup'}
                  </span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={pkg.isActive}
                      onChange={() => handleToggleStatus(pkg)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="package-content">
                  <h3 className="package-name">{pkg.name}</h3>
                  <p className="package-description">{pkg.description}</p>

                  <div className="package-details">
                    <div className="detail-item">
                      <span className="detail-icon">📋</span>
                      <div className="detail-info">
                        <span className="detail-label">Paket Tipi</span>
                        <span className="detail-value">
                          {pkg.packageType === 'one-on-one' ? 'Bire Bir Ders' : 'Grup Dersi'}
                        </span>
                      </div>
                    </div>

                    <div className="detail-item">
                      <span className="detail-icon">📅</span>
                      <div className="detail-info">
                        <span className="detail-label">Aylık Ders</span>
                        <span className="detail-value">
                          {pkg.classes === 999 ? 'Sınırsız' : `${pkg.classes} ders`}
                        </span>
                      </div>
                    </div>

                    <div className="detail-item">
                      <span className="detail-icon">💰</span>
                      <div className="detail-info">
                        <span className="detail-label">Ücret</span>
                        <span className="detail-value">₺{pkg.price?.toLocaleString('tr-TR')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="package-actions">
                  <button
                    className="action-btn edit-btn"
                    onClick={() => handleEditPackage(pkg)}
                  >
                    Düzenle
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={() => handleDeleteClick(pkg)}
                  >
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PackageModal
        isOpen={packageModalOpen}
        onClose={() => setPackageModalOpen(false)}
        package={selectedPackage}
        onSave={handleSavePackage}
        isLoading={isProcessing}
      />

      <DeletePackageModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        package={selectedPackage}
        onConfirm={handleConfirmDelete}
        isLoading={isProcessing}
      />
    </div>
  );
};

export default Packages;
