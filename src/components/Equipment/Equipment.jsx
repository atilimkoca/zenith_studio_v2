import React, { useState, useEffect, useCallback } from 'react';
import equipmentService from '../../services/equipmentService';
import './Equipment.css';

const Equipment = () => {
  const [equipment, setEquipment] = useState([]);
  const [faults, setFaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('equipment');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFaultModal, setShowFaultModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [statistics, setStatistics] = useState({});
  const [notification, setNotification] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Form states
  const [newEquipment, setNewEquipment] = useState({
    name: '',
    brand: '',
    model: '',
    category: '',
    location: '',
    purchaseDate: '',
    warrantyExpiry: '',
    condition: 'excellent',
    description: '',
    serialNumber: '',
    price: ''
  });

  const [newFault, setNewFault] = useState({
    equipmentId: '',
    title: '',
    description: '',
    severity: 'medium',
    priority: 'medium',
    reportedBy: ''
  });

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [equipmentResult, faultsResult, statsResult] = await Promise.all([
        equipmentService.getAllEquipment(),
        equipmentService.getAllFaults(),
        equipmentService.getEquipmentStatistics()
      ]);

      if (equipmentResult.success) {
        setEquipment(equipmentResult.equipment);
      }

      if (faultsResult.success) {
        setFaults(faultsResult.faults);
      }

      if (statsResult.success) {
        setStatistics(statsResult.stats);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      if (setNotification) {
        setNotification({ message: 'Veriler yüklenirken bir hata oluştu', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  }, [setNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleAddEquipment = async (e) => {
    e.preventDefault();
    
    const result = await equipmentService.addEquipment(newEquipment);
    
    if (result.success) {
      showNotification('Ekipman başarıyla eklendi!', 'success');
      setShowAddModal(false);
      setNewEquipment({
        name: '',
        brand: '',
        model: '',
        category: '',
        location: '',
        purchaseDate: '',
        warrantyExpiry: '',
        condition: 'excellent',
        description: '',
        serialNumber: '',
        price: ''
      });
      loadData();
    } else {
      showNotification('Hata: ' + result.error, 'error');
    }
  };

  const handleUpdateEquipment = async (e) => {
    e.preventDefault();
    
    const result = await equipmentService.updateEquipment(editingEquipment.id, editingEquipment);
    
    if (result.success) {
      showNotification('Ekipman başarıyla güncellendi!', 'success');
      setEditingEquipment(null);
      loadData();
    } else {
      showNotification('Hata: ' + result.error, 'error');
    }
  };

  const handleDeleteEquipment = async (equipmentId) => {
    setDeleteConfirm(equipmentId);
  };

  const confirmDelete = async () => {
    const result = await equipmentService.deleteEquipment(deleteConfirm);
    
    if (result.success) {
      showNotification('Ekipman başarıyla silindi!', 'success');
      loadData();
    } else {
      showNotification('Hata: ' + result.error, 'error');
    }
    setDeleteConfirm(null);
  };

  const handleReportFault = async (e) => {
    e.preventDefault();
    
    const result = await equipmentService.reportFault(newFault);
    
    if (result.success) {
      showNotification('Arıza başarıyla kaydedildi!', 'success');
      setShowFaultModal(false);
      setNewFault({
        equipmentId: '',
        title: '',
        description: '',
        severity: 'medium',
        priority: 'medium',
        reportedBy: ''
      });
      loadData();
    } else {
      showNotification('Hata: ' + result.error, 'error');
    }
  };

  const handleUpdateFaultStatus = async (faultId, status) => {
    const resolution = status === 'resolved' ? prompt('Çözüm açıklaması:') : '';
    
    const result = await equipmentService.updateFaultStatus(faultId, status, resolution);
    
    if (result.success) {
      showNotification('Arıza durumu güncellendi!', 'success');
      loadData();
    } else {
      showNotification('Hata: ' + result.error, 'error');
    }
  };

  // Filter and search logic
  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status) => {
    const statusClasses = {
      active: 'badge-success',
      maintenance: 'badge-warning',
      broken: 'badge-danger',
      retired: 'badge-secondary'
    };
    
    const statusTexts = {
      active: 'Aktif',
      maintenance: 'Bakımda',
      broken: 'Bozuk',
      retired: 'Kullanım Dışı'
    };
    
    return (
      <span className={`badge ${statusClasses[status]}`}>
        {statusTexts[status]}
      </span>
    );
  };

  const getConditionBadge = (condition) => {
    const conditionClasses = {
      excellent: 'badge-success',
      good: 'badge-info',
      fair: 'badge-warning',
      poor: 'badge-danger'
    };
    
    const conditionTexts = {
      excellent: 'Mükemmel',
      good: 'İyi',
      fair: 'Orta',
      poor: 'Kötü'
    };
    
    return (
      <span className={`badge ${conditionClasses[condition]}`}>
        {conditionTexts[condition]}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityClasses = {
      low: 'badge-info',
      medium: 'badge-warning',
      high: 'badge-danger',
      critical: 'badge-critical'
    };
    
    const priorityTexts = {
      low: 'Düşük',
      medium: 'Orta',
      high: 'Yüksek',
      critical: 'Kritik'
    };
    
    return (
      <span className={`badge ${priorityClasses[priority]}`}>
        {priorityTexts[priority]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="equipment-container">
        <div className="loading-container">
          <div className="loading-content">
            <div className="modern-spinner"></div>
            <h3>Ekipmanlar Yükleniyor...</h3>
            <p>Lütfen bekleyin, veriler getiriliyor.</p>
            <div className="loading-progress">
              <div className="progress-bar"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="equipment-container">
      {/* Header */}
      <div className="equipment-header">
        <h1>Ekipman Yönetimi</h1>
        <div className="header-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            ➕ Ekipman Ekle
          </button>
          <button 
            className="btn btn-warning"
            onClick={() => setShowFaultModal(true)}
          >
            ⚠️ Arıza Bildir
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{statistics.totalEquipment || 0}</div>
          <div className="stat-label">Toplam Ekipman</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{statistics.byStatus?.active || 0}</div>
          <div className="stat-label">Aktif</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{statistics.byStatus?.maintenance || 0}</div>
          <div className="stat-label">Bakımda</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{statistics.byStatus?.broken || 0}</div>
          <div className="stat-label">Bozuk</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{statistics.faults?.open || 0}</div>
          <div className="stat-label">Açık Arızalar</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-container">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'equipment' ? 'active' : ''}`}
            onClick={() => setActiveTab('equipment')}
          >
            🏋️ Ekipmanlar ({equipment.length})
          </button>
          <button 
            className={`tab ${activeTab === 'faults' ? 'active' : ''}`}
            onClick={() => setActiveTab('faults')}
          >
            ⚠️ Arızalar ({faults.length})
          </button>
        </div>
      </div>

      {/* Equipment Tab */}
      {activeTab === 'equipment' && (
        <div className="tab-content">
          {/* Filters */}
          <div className="filters">
            <div className="search-box">
              <input
                type="text"
                placeholder="Ekipman ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="active">Aktif</option>
              <option value="maintenance">Bakımda</option>
              <option value="broken">Bozuk</option>
              <option value="retired">Kullanım Dışı</option>
            </select>
          </div>

          {/* Equipment List */}
          <div className="equipment-grid">
            {filteredEquipment.map((item) => (
              <div key={item.id} className="equipment-card">
                <div className="equipment-header">
                  <h3>{item.name}</h3>
                  <div className="equipment-actions">
                    <button 
                      className="btn-icon"
                      onClick={() => setEditingEquipment(item)}
                      title="Düzenle"
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn-icon"
                      onClick={() => handleDeleteEquipment(item.id)}
                      title="Sil"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <div className="equipment-details">
                  <p><strong>Marka:</strong> {item.brand}</p>
                  <p><strong>Model:</strong> {item.model}</p>
                  <p><strong>Kategori:</strong> {item.category}</p>
                  <p><strong>Konum:</strong> {item.location}</p>
                  <p><strong>Seri No:</strong> {item.serialNumber}</p>
                </div>
                
                <div className="equipment-status">
                  {getStatusBadge(item.status)}
                  {getConditionBadge(item.condition)}
                </div>
                
                {item.description && (
                  <p className="equipment-description">{item.description}</p>
                )}
                
                <div className="equipment-dates">
                  {item.purchaseDate && (
                    <small>Satın Alma: {new Date(item.purchaseDate).toLocaleDateString('tr-TR')}</small>
                  )}
                  {item.warrantyExpiry && (
                    <small>Garanti Bitiş: {new Date(item.warrantyExpiry).toLocaleDateString('tr-TR')}</small>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {filteredEquipment.length === 0 && (
            <div className="no-data">
              <p>Ekipman bulunamadı.</p>
            </div>
          )}
        </div>
      )}

      {/* Faults Tab */}
      {activeTab === 'faults' && (
        <div className="tab-content">
          <div className="faults-list">
            {faults.map((fault) => {
              const relatedEquipment = equipment.find(e => e.id === fault.equipmentId);
              return (
                <div key={fault.id} className="fault-card">
                  <div className="fault-header">
                    <h3>{fault.title}</h3>
                    <div className="fault-badges">
                      {getPriorityBadge(fault.priority)}
                      <span className={`badge ${fault.status === 'resolved' ? 'badge-success' : 'badge-warning'}`}>
                        {fault.status === 'reported' ? 'Bildirildi' :
                         fault.status === 'in_progress' ? 'İşlemde' : 'Çözüldü'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="fault-details">
                    <p><strong>Ekipman:</strong> {relatedEquipment?.name || 'Bilinmeyen'}</p>
                    <p><strong>Açıklama:</strong> {fault.description}</p>
                    <p><strong>Bildiren:</strong> {fault.reportedBy}</p>
                    <p><strong>Tarih:</strong> {fault.createdAt?.seconds ? 
                      new Date(fault.createdAt.seconds * 1000).toLocaleDateString('tr-TR') : 
                      'Bilinmeyen'}</p>
                  </div>
                  
                  {fault.status !== 'resolved' && (
                    <div className="fault-actions">
                      <button 
                        className="btn btn-info btn-sm"
                        onClick={() => handleUpdateFaultStatus(fault.id, 'in_progress')}
                      >
                        İşleme Al
                      </button>
                      <button 
                        className="btn btn-success btn-sm"
                        onClick={() => handleUpdateFaultStatus(fault.id, 'resolved')}
                      >
                        Çözüldü
                      </button>
                    </div>
                  )}
                  
                  {fault.resolution && (
                    <div className="fault-resolution">
                      <strong>Çözüm:</strong> {fault.resolution}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {faults.length === 0 && (
            <div className="no-data">
              <p>Arıza kaydı bulunamadı.</p>
            </div>
          )}
        </div>
      )}

      {/* Add Equipment Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Yeni Ekipman Ekle</h2>
              <button 
                className="modal-close"
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddEquipment} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Ekipman Adı *</label>
                  <input
                    type="text"
                    value={newEquipment.name}
                    onChange={(e) => setNewEquipment({...newEquipment, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Marka</label>
                  <input
                    type="text"
                    value={newEquipment.brand}
                    onChange={(e) => setNewEquipment({...newEquipment, brand: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Model</label>
                  <input
                    type="text"
                    value={newEquipment.model}
                    onChange={(e) => setNewEquipment({...newEquipment, model: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Kategori</label>
                  <select
                    value={newEquipment.category}
                    onChange={(e) => setNewEquipment({...newEquipment, category: e.target.value})}
                  >
                    <option value="">Seçiniz</option>
                    <option value="Kardiyovasküler">Kardiyovasküler</option>
                    <option value="Ağırlık">Ağırlık</option>
                    <option value="Fonksiyonel">Fonksiyonel</option>
                    <option value="Pilates">Pilates</option>
                    <option value="Yoga">Yoga</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Konum</label>
                  <input
                    type="text"
                    value={newEquipment.location}
                    onChange={(e) => setNewEquipment({...newEquipment, location: e.target.value})}
                    placeholder="Örn: Ana Salon, 2. Kat"
                  />
                </div>
                <div className="form-group">
                  <label>Seri Numarası</label>
                  <input
                    type="text"
                    value={newEquipment.serialNumber}
                    onChange={(e) => setNewEquipment({...newEquipment, serialNumber: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Satın Alma Tarihi</label>
                  <input
                    type="date"
                    value={newEquipment.purchaseDate}
                    onChange={(e) => setNewEquipment({...newEquipment, purchaseDate: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Garanti Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={newEquipment.warrantyExpiry}
                    onChange={(e) => setNewEquipment({...newEquipment, warrantyExpiry: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Durum</label>
                  <select
                    value={newEquipment.condition}
                    onChange={(e) => setNewEquipment({...newEquipment, condition: e.target.value})}
                  >
                    <option value="excellent">Mükemmel</option>
                    <option value="good">İyi</option>
                    <option value="fair">Orta</option>
                    <option value="poor">Kötü</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Fiyat (TL)</label>
                  <input
                    type="number"
                    value={newEquipment.price}
                    onChange={(e) => setNewEquipment({...newEquipment, price: e.target.value})}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Açıklama</label>
                <textarea
                  value={newEquipment.description}
                  onChange={(e) => setNewEquipment({...newEquipment, description: e.target.value})}
                  rows="3"
                  placeholder="Ekipman hakkında ek bilgiler..."
                />
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  İptal
                </button>
                <button type="submit" className="btn btn-primary">
                  Ekipman Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Equipment Modal */}
      {editingEquipment && (
        <div className="modal-overlay" onClick={() => setEditingEquipment(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ekipman Düzenle</h2>
              <button 
                className="modal-close"
                onClick={() => setEditingEquipment(null)}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleUpdateEquipment} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Ekipman Adı *</label>
                  <input
                    type="text"
                    value={editingEquipment.name}
                    onChange={(e) => setEditingEquipment({...editingEquipment, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Marka</label>
                  <input
                    type="text"
                    value={editingEquipment.brand || ''}
                    onChange={(e) => setEditingEquipment({...editingEquipment, brand: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Durum</label>
                  <select
                    value={editingEquipment.status}
                    onChange={(e) => setEditingEquipment({...editingEquipment, status: e.target.value})}
                  >
                    <option value="active">Aktif</option>
                    <option value="maintenance">Bakımda</option>
                    <option value="broken">Bozuk</option>
                    <option value="retired">Kullanım Dışı</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Kondisyon</label>
                  <select
                    value={editingEquipment.condition}
                    onChange={(e) => setEditingEquipment({...editingEquipment, condition: e.target.value})}
                  >
                    <option value="excellent">Mükemmel</option>
                    <option value="good">İyi</option>
                    <option value="fair">Orta</option>
                    <option value="poor">Kötü</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Konum</label>
                <input
                  type="text"
                  value={editingEquipment.location || ''}
                  onChange={(e) => setEditingEquipment({...editingEquipment, location: e.target.value})}
                />
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingEquipment(null)}>
                  İptal
                </button>
                <button type="submit" className="btn btn-primary">
                  Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Fault Modal */}
      {showFaultModal && (
        <div className="modal-overlay" onClick={() => setShowFaultModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Arıza Bildir</h2>
              <button 
                className="modal-close"
                onClick={() => setShowFaultModal(false)}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleReportFault} className="modal-form">
              <div className="form-group">
                <label>Ekipman *</label>
                <select
                  value={newFault.equipmentId}
                  onChange={(e) => setNewFault({...newFault, equipmentId: e.target.value})}
                  required
                >
                  <option value="">Ekipman seçiniz</option>
                  {equipment.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} - {item.brand} {item.model}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Arıza Başlığı *</label>
                <input
                  type="text"
                  value={newFault.title}
                  onChange={(e) => setNewFault({...newFault, title: e.target.value})}
                  required
                  placeholder="Kısa arıza açıklaması"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Öncelik</label>
                  <select
                    value={newFault.priority}
                    onChange={(e) => setNewFault({...newFault, priority: e.target.value})}
                  >
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                    <option value="critical">Kritik</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Şiddet</label>
                  <select
                    value={newFault.severity}
                    onChange={(e) => setNewFault({...newFault, severity: e.target.value})}
                  >
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                    <option value="critical">Kritik</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Bildiren Kişi</label>
                <input
                  type="text"
                  value={newFault.reportedBy}
                  onChange={(e) => setNewFault({...newFault, reportedBy: e.target.value})}
                  placeholder="Adınız veya kullanıcı adınız"
                />
              </div>
              
              <div className="form-group">
                <label>Detaylı Açıklama *</label>
                <textarea
                  value={newFault.description}
                  onChange={(e) => setNewFault({...newFault, description: e.target.value})}
                  required
                  rows="4"
                  placeholder="Arızanın detaylı açıklaması, ne zaman başladığı, nasıl oluştuğu vb."
                />
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowFaultModal(false)}>
                  İptal
                </button>
                <button type="submit" className="btn btn-warning">
                  Arıza Bildir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Component */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-content">
            <span className="notification-icon">
              {notification.type === 'success' ? '✅' : 
               notification.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span className="notification-message">{notification.message}</span>
            <button 
              className="notification-close"
              onClick={() => setNotification(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirmation-header">
              <span className="confirmation-icon">⚠️</span>
              <h3>Ekipmanı Sil</h3>
            </div>
            <div className="confirmation-content">
              <p>Bu ekipmanı silmek istediğinizden emin misiniz?</p>
              <p className="confirmation-warning">Bu işlem geri alınamaz!</p>
            </div>
            <div className="confirmation-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setDeleteConfirm(null)}
              >
                İptal
              </button>
              <button 
                className="btn btn-danger"
                onClick={confirmDelete}
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Equipment;