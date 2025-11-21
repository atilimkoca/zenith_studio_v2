// Trainers Management Component
import React, { useState, useEffect } from 'react';
import './Trainers.css';
import trainersService from '../../services/trainersService';
import firestoreService from '../../services/firestoreService';
import userRoleService from '../../services/userRoleService';
import { useAuth } from '../../contexts/AuthContext';
import RoleGuard from '../RoleGuard';
import EditTrainerModal from './EditTrainerModal';

const Trainers = () => {
  const { currentUser } = useAuth();
  const [trainers, setTrainers] = useState([]);
  const [filteredTrainers, setFilteredTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [notification, setNotification] = useState(null);
  const [editingTrainer, setEditingTrainer] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadTrainersData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    filterTrainers();
  }, [trainers, searchTerm, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTrainersData = async () => {
    setLoading(true);
    try {
      const [trainersResult, statsResult] = await Promise.all([
        trainersService.getAllTrainers(),
        trainersService.getTrainerStatistics()
      ]);
      
      if (trainersResult.success) {
        setTrainers(trainersResult.trainers);
      } else {
        showNotification('Eğitmenler yüklenirken hata oluştu: ' + trainersResult.error, 'error');
      }
      
      if (statsResult.success) {
        setStatistics(statsResult.stats);
      }
    } catch (error) {
      console.error('Error loading trainers data:', error);
      showNotification('Veri yüklenirken beklenmeyen bir hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterTrainers = () => {
    let filtered = [...trainers];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(trainer => {
        const fullName = `${trainer.firstName || ''} ${trainer.lastName || ''}`.toLowerCase();
        const email = (trainer.email || '').toLowerCase();
        const specializations = (trainer.trainerProfile?.specializations || []).join(' ').toLowerCase();
        
        return fullName.includes(searchLower) || 
               email.includes(searchLower) || 
               specializations.includes(searchLower);
      });
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(trainer => {
        if (statusFilter === 'active') {
          return trainer.status === 'active' && trainer.trainerProfile?.isActive !== false;
        } else if (statusFilter === 'inactive') {
          return trainer.status !== 'active' || trainer.trainerProfile?.isActive === false;
        }
        return true;
      });
    }
    
    setFilteredTrainers(filtered);
  };

  const handleToggleTrainerStatus = async (trainerId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      const result = await trainersService.toggleTrainerStatus(trainerId, newStatus);
      
      if (result.success) {
        showNotification(
          `Eğitmen durumu ${newStatus ? 'aktif' : 'pasif'} olarak güncellendi.`, 
          'success'
        );
        loadTrainersData(); // Reload data
      } else {
        showNotification('Durum güncellenirken hata oluştu: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Error toggling trainer status:', error);
      showNotification('Beklenmeyen bir hata oluştu.', 'error');
    }
  };

  const handleEditTrainer = (trainer) => {
    setEditingTrainer(trainer);
    setShowEditModal(true);
  };

  const handleSaveTrainer = async (trainerId, formData) => {
    try {
      // Check if role changed
      const roleChanged = editingTrainer && editingTrainer.role !== formData.role;
      
      // Update user basic info
      const userUpdateResult = await firestoreService.updateUserData(trainerId, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        displayName: `${formData.firstName} ${formData.lastName}`
      });

      // Update trainer profile
      const profileUpdateResult = await trainersService.updateTrainerProfile(trainerId, {
        bio: formData.bio,
        specializations: formData.specializations,
        certifications: formData.certifications,
        experience: formData.experience,
        isActive: formData.isActive
      });

      // Update role if it changed (admin only)
      let roleUpdateResult = { success: true };
      if (roleChanged && currentUser?.role === 'admin') {
        const userRoleService = (await import('../../services/userRoleService')).default;
        roleUpdateResult = await userRoleService.changeUserRole(trainerId, formData.role);
      }

      if (userUpdateResult.success && profileUpdateResult.success && roleUpdateResult.success) {
        const messages = ['Eğitmen bilgileri başarıyla güncellendi.'];
        if (roleChanged && roleUpdateResult.message) {
          messages.push(roleUpdateResult.message);
        }
        showNotification(messages.join(' '), 'success');
        loadTrainersData(); // Refresh data
      } else {
        const errors = [];
        if (!userUpdateResult.success) errors.push('Temel bilgiler güncellenemedi');
        if (!profileUpdateResult.success) errors.push('Profil güncellenemedi');
        if (!roleUpdateResult.success) errors.push('Rol güncellenemedi');
        showNotification('Güncelleme sırasında hata: ' + errors.join(', '), 'error');
      }
    } catch (error) {
      console.error('Error saving trainer:', error);
      showNotification('Beklenmeyen bir hata oluştu.', 'error');
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingTrainer(null);
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Bilinmiyor';
    try {
      return new Date(dateString).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Geçersiz tarih';
    }
  };

  const getInitials = (firstName, lastName) => {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last || '?';
  };

  const getStatusBadge = (trainer) => {
    const isActive = trainer.status === 'active' && trainer.trainerProfile?.isActive !== false;
    return (
      <span className={`status-badge ${isActive ? 'status-active' : 'status-inactive'}`}>
        {isActive ? 'Aktif' : 'Pasif'}
      </span>
    );
  };

  const renderSpecializations = (specializations) => {
    if (!specializations || specializations.length === 0) {
      return <span className="specialization-tag">Belirtilmemiş</span>;
    }
    
    return specializations.map((spec, index) => (
      <span key={index} className="specialization-tag">
        {spec}
      </span>
    ));
  };

  return (
    <div className="trainers">
      {/* Header */}
      <div className="trainers-header">
        <div className="trainers-title-section">
          <h1>
            {currentUser?.role === 'admin' ? 'Eğitmen Yönetimi' : 'Eğitmenler'}
          </h1>
          {currentUser?.role === 'admin' && (
            <p>
              Tüm eğitmenlerin bilgilerini görüntüleyin ve yönetin
            </p>
          )}
        </div>
        
        <div className="trainers-actions">
          <div className="search-box">
            <div className="search-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <input
              type="text"
              className="search-input"
              placeholder="Eğitmen ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="filter-dropdown"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tüm Durumlar</option>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </select>
          
          <button className="btn btn-secondary" onClick={loadTrainersData}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M3 21v-5h5"/>
            </svg>
            Yenile
          </button>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <RoleGuard allowedRoles={['admin']}>
          <div className="statistics-grid">
            <div className="stat-card total">
              <div className="stat-number">{statistics.total}</div>
              <div className="stat-label">Toplam Eğitmen</div>
            </div>
            <div className="stat-card active">
              <div className="stat-number">{statistics.active}</div>
              <div className="stat-label">Aktif Eğitmen</div>
            </div>
            <div className="stat-card inactive">
              <div className="stat-number">{statistics.inactive}</div>
              <div className="stat-label">Pasif Eğitmen</div>
            </div>
          </div>
        </RoleGuard>
      )}

      {/* Content */}
      <div className="trainers-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-header">
              <div className="loading-skeleton skeleton-title"></div>
              <div className="loading-skeleton skeleton-subtitle"></div>
            </div>
            
            <div className="loading-controls">
              <div className="loading-skeleton skeleton-search"></div>
              <div className="loading-skeleton skeleton-filter"></div>
              <div className="loading-skeleton skeleton-button"></div>
            </div>

            <div className="loading-stats">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="loading-stat-card">
                  <div className="loading-skeleton skeleton-stat-number"></div>
                  <div className="loading-skeleton skeleton-stat-label"></div>
                </div>
              ))}
            </div>

            <div className="loading-grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="loading-trainer-card">
                  <div className="loading-skeleton skeleton-badge"></div>
                  <div className="loading-trainer-header">
                    <div className="loading-skeleton skeleton-avatar"></div>
                    <div className="loading-trainer-info">
                      <div className="loading-skeleton skeleton-name"></div>
                      <div className="loading-skeleton skeleton-email"></div>
                    </div>
                  </div>
                  <div className="loading-trainer-details">
                    {Array.from({ length: 3 }).map((_, detailIndex) => (
                      <div key={detailIndex} className="loading-detail-row">
                        <div className="loading-skeleton skeleton-detail-label"></div>
                        <div className="loading-skeleton skeleton-detail-value"></div>
                      </div>
                    ))}
                  </div>
                  <div className="loading-specializations">
                    {Array.from({ length: 2 }).map((_, specIndex) => (
                      <div key={specIndex} className="loading-skeleton skeleton-spec-tag"></div>
                    ))}
                  </div>
                  <div className="loading-actions">
                    <div className="loading-skeleton skeleton-action-btn"></div>
                    <div className="loading-skeleton skeleton-action-btn"></div>
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
              <p className="loading-text">Eğitmenler yükleniyor...</p>
            </div>
          </div>
        ) : filteredTrainers.length === 0 ? (
          <div className="empty-state">
            <h3>Eğitmen Bulunamadı</h3>
            <p>
              {searchTerm || statusFilter !== 'all' 
                ? 'Arama kriterlerinize uygun eğitmen bulunamadı.' 
                : 'Henüz sisteme kayıtlı eğitmen bulunmuyor.'}
            </p>
            {(searchTerm || statusFilter !== 'all') && (
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
              >
                Filtreleri Temizle
              </button>
            )}
          </div>
        ) : (
          <div className="trainers-grid">
            {filteredTrainers.map(trainer => (
              <div key={trainer.id} className="trainer-card">
                <div className="trainer-status">
                  {getStatusBadge(trainer)}
                </div>
                
                <div className="trainer-header">
                  <div className="trainer-avatar">
                    {getInitials(trainer.firstName, trainer.lastName)}
                  </div>
                  <div className="trainer-info">
                    <h3>{trainer.displayName || `${trainer.firstName || ''} ${trainer.lastName || ''}`.trim()}</h3>
                    <p className="trainer-email">{trainer.email}</p>
                  </div>
                </div>

                <div className="trainer-details">
                  <div className="detail-row">
                    <span className="detail-label">Telefon:</span>
                    <span className="detail-value phone-number">{trainer.phone || 'Belirtilmemiş'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Cinsiyet:</span>
                    <span className="detail-value">
                      {trainer.gender === 'male' ? 'Erkek' : 
                       trainer.gender === 'female' ? 'Kadın' : 
                       trainer.gender === 'other' ? 'Diğer' : 'Belirtilmemiş'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Katılım:</span>
                    <span className="detail-value join-date">{formatDate(trainer.createdAt)}</span>
                  </div>
                </div>

                <div className="trainer-profile">
                  <div className="profile-section">
                    <h4>Uzmanlık Alanları</h4>
                    <div className="specializations">
                      {renderSpecializations(trainer.trainerProfile?.specializations)}
                    </div>
                  </div>

                  {trainer.trainerProfile?.bio && (
                    <div className="profile-section">
                      <h4>Hakkında</h4>
                      <p className="bio">{trainer.trainerProfile.bio}</p>
                    </div>
                  )}

                  {trainer.trainerProfile?.experience && (
                    <div className="profile-section">
                      <h4>Deneyim</h4>
                      <p className="experience">{trainer.trainerProfile.experience}</p>
                    </div>
                  )}
                </div>

                <RoleGuard allowedRoles={['admin']}>
                  <div className="trainer-actions">
                    <button 
                      className="btn btn-edit btn-small"
                      onClick={() => handleEditTrainer(trainer)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Düzenle
                    </button>
                    
                    <button 
                      className={`btn btn-toggle btn-small ${
                        trainer.status === 'active' && trainer.trainerProfile?.isActive !== false 
                          ? '' : 'activate'
                      }`}
                      onClick={() => handleToggleTrainerStatus(
                        trainer.id, 
                        trainer.status === 'active' && trainer.trainerProfile?.isActive !== false
                      )}
                    >
                      {trainer.status === 'active' && trainer.trainerProfile?.isActive !== false 
                        ? 'Pasif Yap' : 'Aktif Yap'}
                    </button>
                  </div>
                </RoleGuard>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <EditTrainerModal
        trainer={editingTrainer}
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        onSave={handleSaveTrainer}
      />

      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`} style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '16px 20px',
          borderRadius: '12px',
          background: notification.type === 'success' ? '#D1FAE5' : '#FEE2E2',
          color: notification.type === 'success' ? '#065F46' : '#DC2626',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          maxWidth: '400px'
        }}>
          {notification.message}
          <button 
            onClick={() => setNotification(null)}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: 'inherit'
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default Trainers;