// components/Members/Members.jsx
import React, { useState, useEffect } from 'react';
import './Members.css';
import memberService from '../../services/memberService';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext.jsx';
import EditMemberModal from './EditMemberModal';
import DeleteMemberModal from './DeleteMemberModal';
import ApprovalModal from './ApprovalModal';
import CancelMembershipModal from './CancelMembershipModal';
import FreezeMembershipModal from './FreezeMembershipModal';
import RenewPackageModal from './RenewPackageModal';
import BulkFreezeModal from './BulkFreezeModal';
import BulkUnfreezeModal from './BulkUnfreezeModal';

const PACKAGE_NAME_PLACEHOLDERS = [
  'paket atanmadı',
  'üyelik bulunamadı',
  'tanımsız paket',
  'paket bulunamadı'
];

const sanitizePackageName = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const normalized = trimmed.toLowerCase();
  if (PACKAGE_NAME_PLACEHOLDERS.includes(normalized)) {
    return null;
  }
  return trimmed;
};

const normalizePackageType = (value) => {
  if (!value) return '';
  const normalized = String(value)
    .toLowerCase()
    .replace(/[_\s]+/g, '-');

  if (['one-on-one', 'one-onone', 'oneonone', 'birebir', 'private', 'personal'].includes(normalized)) {
    return 'one-on-one';
  }
  if (['duo', 'partner', 'semi-private', 'semi-private', 'ikili'].includes(normalized)) {
    return 'duo';
  }
  if (['group', 'group-class', 'group-lesson', 'class', 'grup'].includes(normalized)) {
    return 'group';
  }
  return normalized;
};

const PACKAGE_TYPE_BADGES = {
  'one-on-one': { label: '🤝 Bire Bir', className: 'one-on-one' },
  duo: { label: '🧑‍🤝‍🧑 Duo', className: 'duo' },
  group: { label: '👯 Grup Dersi', className: 'group' }
};

// Helper to get the active package from packages array
const getActivePackageFromArray = (member) => {
  const packages = member.packages || [];
  if (packages.length === 0) return null;
  
  // Find active package, or the first non-cancelled one
  const activePackage = packages.find(pkg => pkg.status === 'active') 
    || packages.find(pkg => pkg.status !== 'cancelled');
  
  return activePackage || null;
};

const getMembershipBadgeInfo = (member = {}) => {
  // First check packages array (new multi-package system)
  const activePackage = getActivePackageFromArray(member);
  if (activePackage?.packageName) {
    const pkgName = sanitizePackageName(activePackage.packageName);
    if (pkgName) {
      return { label: pkgName, className: 'custom' };
    }
  }

  // Then check root level and packageInfo (legacy)
  const packageName =
    sanitizePackageName(member.packageName) ||
    sanitizePackageName(member.packageInfo?.packageName);

  if (packageName) {
    return { label: packageName, className: 'custom' };
  }

  // Check package type from active package, packageInfo, or root
  const packageType = normalizePackageType(
    activePackage?.packageType || 
    member.packageInfo?.packageType || 
    member.packageType
  );
  if (packageType && PACKAGE_TYPE_BADGES[packageType]) {
    return PACKAGE_TYPE_BADGES[packageType];
  }

  const membershipType = (member.membershipType || '').toLowerCase();
  if (membershipType === 'premium') {
    return { label: '⭐ Premium', className: 'premium' };
  }
  if (membershipType === 'unlimited') {
    return { label: '♾️ Sınırsız', className: 'unlimited' };
  }
  return { label: '🎯 Temel', className: 'basic' };
};

const Members = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  
  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [bulkFreezeModalOpen, setBulkFreezeModalOpen] = useState(false);
  const [bulkUnfreezeModalOpen, setBulkUnfreezeModalOpen] = useState(false);

  // Load members data
  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await memberService.getAllMembers();
      
      if (result.success) {
        setMembers(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error loading members:', err);
      setError('Üyeler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Open approval modal
  const handleOpenApprovalModal = (member) => {
    setSelectedMember(member);
    setShowApprovalModal(true);
  };

  // Approve member with details
  const handleApproveMember = async (memberId, memberName, membershipDetails) => {
    try {
      const result = await memberService.approveMember(memberId, currentUser.uid, membershipDetails);

      if (result.success) {
        // Refresh the members list
        await loadMembers();
        setShowApprovalModal(false);
        setSelectedMember(null);
        showSuccess(`${memberName} başarıyla onaylandı!`);
      } else {
        showError(`Hata: ${result.error}`);
      }
    } catch (err) {
      console.error('Error approving member:', err);
      showError('Üye onaylanırken bir hata oluştu');
    }
  };

  // Reject member
  const handleRejectMember = async (memberId, memberName, reason) => {
    try {
      const result = await memberService.rejectMember(memberId, currentUser.uid, reason);

      if (result.success) {
        // Refresh the members list
        await loadMembers();
        setShowApprovalModal(false);
        setSelectedMember(null);
        showSuccess(`${memberName} reddedildi.`);
      } else {
        showError(`Hata: ${result.error}`);
      }
    } catch (err) {
      console.error('Error rejecting member:', err);
      showError('Üye reddedilirken bir hata oluştu');
    }
  };

  // Delete member
  const handleDeleteMember = (member) => {
    setSelectedMember(member);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (memberId, memberName) => {
    try {
      setIsProcessing(true);
      
      // Use soft delete - mark as deleted but keep in Firebase Auth
      const result = await memberService.deleteMember(memberId);

      if (result.success) {
        await loadMembers();
        setDeleteModalOpen(false);
        setSelectedMember(null);
        showSuccess(`${memberName} silindi ve raporlar bölümüne taşındı.`);
      } else {
        showError(`Hata: ${result.error}`);
      }
    } catch (err) {
      console.error('Error deleting member:', err);
      showError('Üye silinirken bir hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  };

  // Edit member
  const handleEditMember = (member) => {
    setSelectedMember(member);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (formData) => {
    try {
      setIsProcessing(true);
      const result = await memberService.updateMember(selectedMember.id, formData);

      if (result.success) {
        await loadMembers();
        setEditModalOpen(false);
        setSelectedMember(null);
        showSuccess('Üye bilgileri başarıyla güncellendi');
      } else {
        showError(`Hata: ${result.error}`);
      }
    } catch (err) {
      console.error('Error updating member:', err);
      showError('Üye güncellenirken bir hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancel membership
  const handleCancelMembership = (member) => {
    setSelectedMember(member);
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async (memberId, cancellationData) => {
    try {
      setIsProcessing(true);
      
      const result = await memberService.cancelMembership(memberId, {
        reason: cancellationData.reason,
        refundAmount: cancellationData.refundAmount,
        cancelledBy: currentUser.uid
      });

      if (result.success) {
        await loadMembers();
        setCancelModalOpen(false);
        setSelectedMember(null);
        showSuccess(`${cancellationData.memberName} üyeliği iptal edildi. İade tutarı: ₺${cancellationData.refundAmount}`);
      } else {
        showError(`Hata: ${result.error}`);
      }
    } catch (err) {
      console.error('Error cancelling membership:', err);
      showError('Üyelik iptal edilirken bir hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  };

  // Freeze membership
  const handleFreezeMembership = (member) => {
    setSelectedMember(member);
    setFreezeModalOpen(true);
  };

  const handleConfirmFreeze = async (memberId, freezeData) => {
    try {
      setIsProcessing(true);
      
      const result = await memberService.freezeMembership(memberId, {
        reason: freezeData.reason,
        freezeEndDate: freezeData.freezeEndDate,
        frozenBy: currentUser.uid
      });

      if (result.success) {
        await loadMembers();
        setFreezeModalOpen(false);
        setSelectedMember(null);
        const endDate = new Date(freezeData.freezeEndDate).toLocaleDateString('tr-TR');
        showSuccess(`${freezeData.memberName} üyeliği ${endDate} tarihine kadar donduruldu.`);
      } else {
        showError(`Hata: ${result.error}`);
      }
    } catch (err) {
      console.error('Error freezing membership:', err);
      showError('Üyelik dondurulurken bir hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenBulkFreeze = () => {
    setBulkFreezeModalOpen(true);
  };

  const handleConfirmBulkFreeze = async (bulkData) => {
    try {
      setIsProcessing(true);

      const result = await memberService.freezeAllMembers({
        reason: bulkData.reason,
        freezeEndDate: bulkData.freezeEndDate,
        frozenBy: currentUser.uid
      });

      if (result.success) {
        await loadMembers();
        setBulkFreezeModalOpen(false);
        const summaryMessage =
          result.message ||
          `Toplu dondurma işlemi tamamlandı. ${result.data?.frozenCount || 0} üye donduruldu.`;
        showSuccess(summaryMessage);

        if (result.data?.errors?.length) {
          console.warn('Bulk freeze errors:', result.data.errors);
          showError(
            `${result.data.errors.length} üye dondurulamadı. Ayrıntılar için log kayıtlarını kontrol edin.`
          );
        }
      } else {
        const errorMessage =
          result.error ||
          result.errorMessage ||
          'Toplu dondurma işlemi tamamlanamadı. Lütfen tekrar deneyin.';
        showError(errorMessage);
      }
    } catch (err) {
      console.error('Error freezing all members:', err);
      showError('Toplu dondurma işlemi sırasında bir hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenBulkUnfreeze = () => {
    setBulkUnfreezeModalOpen(true);
  };

  const handleConfirmBulkUnfreeze = async (bulkData) => {
    try {
      setIsProcessing(true);

      const result = await memberService.unfreezeAllMembers({
        reason: bulkData.reason,
        unfrozenBy: currentUser.uid
      });

      if (result.success) {
        await loadMembers();
        setBulkUnfreezeModalOpen(false);
        const summaryMessage =
          result.message ||
          `Toplu dondurma kaldırma tamamlandı. ${result.data?.unfrozenCount || 0} üye aktifleştirildi.`;
        showSuccess(summaryMessage);

        if (result.data?.errors?.length) {
          console.warn('Bulk unfreeze errors:', result.data.errors);
          showError(
            `${result.data.errors.length} üye için dondurma kaldırılamadı. Ayrıntılar için log kayıtlarını kontrol edin.`
          );
        }
      } else {
        const errorMessage =
          result.error ||
          result.errorMessage ||
          'Toplu dondurma kaldırma işlemi tamamlanamadı. Lütfen tekrar deneyin.';
        showError(errorMessage);
      }
    } catch (err) {
      console.error('Error unfreezing memberships:', err);
      showError('Toplu dondurma kaldırma işlemi sırasında bir hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reactivate cancelled membership
  const handleReactivateMembership = async (member) => {
    if (!window.confirm(`${member.displayName || `${member.firstName} ${member.lastName}`} adlı üyenin üyeliğini yeniden aktifleştirmek istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      setIsProcessing(true);
      
      const result = await memberService.reactivateMembership(member.id, currentUser.uid);

      if (result.success) {
        await loadMembers();
        showSuccess(`${member.displayName || `${member.firstName} ${member.lastName}`} üyeliği yeniden aktifleştirildi.`);
      } else {
        showError(`Hata: ${result.error}`);
      }
    } catch (err) {
      console.error('Error reactivating membership:', err);
      showError('Üyelik aktifleştirilirken bir hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  };

  // Unfreeze membership
  const handleUnfreezeMembership = async (member) => {
    if (!window.confirm(`${member.displayName || `${member.firstName} ${member.lastName}`} adlı üyenin üyelik dondurmasını kaldırmak istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      setIsProcessing(true);

      const result = await memberService.unfreezeMembership(member.id, currentUser.uid);

      if (result.success) {
        await loadMembers();
        showSuccess(`${member.displayName || `${member.firstName} ${member.lastName}`} üyelik dondurması kaldırıldı.`);
      } else {
        showError(`Hata: ${result.error}`);
      }
    } catch (err) {
      console.error('Error unfreezing membership:', err);
      showError('Üyelik dondurma kaldırılırken bir hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  };

  // Renew package
  const handleRenewPackage = (member) => {
    setSelectedMember(member);
    setRenewModalOpen(true);
  };

  const handleConfirmRenew = async (userId, packageId, startDate) => {
    try {
      setIsProcessing(true);

      // Use addPackageToUser to add a new package (multi-package support)
      const result = await memberService.addPackageToUser(
        userId,
        {
          packageId: packageId,
          startDate: startDate
        },
        currentUser?.uid || 'admin'
      );

      if (result.success) {
        await loadMembers();
        setRenewModalOpen(false);
        setSelectedMember(null);
        showSuccess(result.message || `Paket başarıyla eklendi. Toplam ${result.totalPackages} paket.`);
      } else {
        showError(`Hata: ${result.error}`);
      }
    } catch (err) {
      console.error('Error adding package:', err);
      showError('Paket eklenirken bir hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  };

  const getPackageExpiryDate = (member) => {
    // First check packages array (new multi-package system)
    const activePackage = getActivePackageFromArray(member);
    let rawExpiry = activePackage?.expiryDate;
    
    // Fallback to legacy fields
    if (!rawExpiry) {
      rawExpiry = member.packageExpiryDate || member.packageInfo?.expiryDate;
    }
    
    if (!rawExpiry) return null;

    try {
      const date =
        typeof rawExpiry?.toDate === 'function'
          ? rawExpiry.toDate()
          : new Date(rawExpiry);

      if (Number.isNaN(date?.getTime())) {
        return null;
      }
      return date;
    } catch (err) {
      console.warn('Paket bitiş tarihi parse edilemedi:', err);
      return null;
    }
  };

  const filteredMembers = members.filter(member => {
    // First, filter out permanently deleted members
    if (member.status === 'permanently_deleted') {
      return false;
    }
    
    const matchesSearch = member.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (filterStatus === 'pending') {
      matchesStatus = member.status === 'pending';
    } else if (filterStatus === 'active') {
      // More flexible active status check - exclude frozen members
      matchesStatus = (member.status === 'approved' || 
                      member.membershipStatus === 'active' ||
                      (!member.status && member.membershipStatus !== 'inactive' && member.membershipStatus !== 'cancelled')) &&
                      member.membershipStatus !== 'frozen' && member.status !== 'frozen';
    } else if (filterStatus === 'inactive') {
      matchesStatus = member.membershipStatus === 'inactive' || 
                      member.membershipStatus === 'cancelled' ||
                      member.status === 'rejected';
    } else if (filterStatus === 'frozen') {
      matchesStatus = member.membershipStatus === 'frozen' || member.status === 'frozen';
    }
    
    return matchesSearch && matchesStatus;
  });

  const hasFrozenMembers = members.some(member => member.membershipStatus === 'frozen' || member.status === 'frozen');

  // Migration function for fixing package data
  const handleMigratePackageData = async () => {
    if (!window.confirm('Bu işlem tüm üyelerin paket verilerini düzeltecek. Devam etmek istiyor musunuz?')) {
      return;
    }
    
    try {
      setIsProcessing(true);
      showSuccess('Migrasyon başlatıldı... Lütfen bekleyin.');
      
      const result = await memberService.migrateAllUsersPackageData();
      
      if (result.success) {
        showSuccess(`Migrasyon tamamlandı! ${result.migrated} üye güncellendi, ${result.skipped} üye zaten günceldi.`);
        await loadMembers(); // Refresh the list
      } else {
        showError(`Migrasyon hatası: ${result.error}`);
      }
    } catch (err) {
      console.error('Migration error:', err);
      showError('Migrasyon sırasında bir hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="members-page">
      <div className="members-header">
        <div className="header-left">
          <h1 className="page-title">Üye Yönetimi</h1>
          <p className="page-subtitle">
            Toplam {members.filter(m => m.status !== 'permanently_deleted').length} üye
            {filterStatus !== 'all' && ` • ${filteredMembers.length} ${
              filterStatus === 'pending' ? 'bekleyen' : 
              filterStatus === 'active' ? 'aktif' : 
              filterStatus === 'frozen' ? 'dondurulmuş' : 'pasif'
            } üye`}
          </p>
        </div>
        <div className="header-right">
          <button
            className="migrate-btn"
            onClick={handleMigratePackageData}
            disabled={isProcessing}
            title="Eski paket verilerini düzelt"
            style={{
              padding: '8px 16px',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            🔧 Paket Verilerini Düzelt
          </button>
        </div>
      </div>

      <div className="members-controls">
        <div className="search-box">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Üye ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="controls-right">
          <div className="filter-tabs">
            <button
              className={`filter-tab ${filterStatus === 'active' ? 'active' : ''}`}
              onClick={() => setFilterStatus('active')}
            >
              Aktif
            </button>
            <button
              className={`filter-tab ${filterStatus === 'pending' ? 'active' : ''}`}
              onClick={() => setFilterStatus('pending')}
            >
              Bekleyenler
            </button>
            <button
              className={`filter-tab ${filterStatus === 'inactive' ? 'active' : ''}`}
              onClick={() => setFilterStatus('inactive')}
            >
              Pasif
            </button>
            <button
              className={`filter-tab frozen ${filterStatus === 'frozen' ? 'active' : ''}`}
              onClick={() => setFilterStatus('frozen')}
            >
              ❄️ Dondurulmuş
            </button>
          </div>

          <div className="bulk-actions">
            <button
              className="freeze-all-btn"
              onClick={handleOpenBulkFreeze}
              disabled={isProcessing || members.length === 0}
              type="button"
            >
              <span>❄️</span>
              Toplu Dondur
            </button>
            <button
              className="unfreeze-all-btn"
              onClick={handleOpenBulkUnfreeze}
              disabled={isProcessing || !hasFrozenMembers}
              type="button"
            >
              <span>☀️</span>
              Dondurmayı Kaldır
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="loading-header">
            <div className="loading-skeleton skeleton-header"></div>
            <div className="loading-skeleton skeleton-subtitle"></div>
          </div>
          
          <div className="loading-controls">
            <div className="loading-skeleton skeleton-search"></div>
            <div className="loading-skeleton skeleton-filter"></div>
          </div>

          <div className="loading-table">
            <div className="loading-table-header">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="loading-skeleton skeleton-th"></div>
              ))}
            </div>
            
            <div className="loading-table-body">
              {Array.from({ length: 5 }).map((_, rowIndex) => (
                <div key={rowIndex} className="loading-table-row">
                  <div className="loading-skeleton skeleton-avatar"></div>
                  <div className="loading-skeleton skeleton-contact"></div>
                  <div className="loading-skeleton skeleton-badge"></div>
                  <div className="loading-skeleton skeleton-date"></div>
                  <div className="loading-skeleton skeleton-number"></div>
                  <div className="loading-skeleton skeleton-status"></div>
                  <div className="loading-skeleton skeleton-actions"></div>
                </div>
              ))}
            </div>
          </div>

          <div className="loading-overlay">
            <div className="loading-spinner-modern">
              <div className="spinner-dot spinner-dot-1"></div>
              <div className="spinner-dot spinner-dot-2"></div>
              <div className="spinner-dot spinner-dot-3"></div>
            </div>
            <p className="loading-text">Üyeler yükleniyor...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button onClick={loadMembers} className="retry-btn">Tekrar Dene</button>
        </div>
      )}

      {!loading && !error && (
        <div className="members-table-wrapper">
          <div className="members-table-container">
            {filteredMembers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <h3 className="empty-title">Henüz üye bulunmuyor</h3>
                <p className="empty-text">
                  {searchTerm ? 'Arama kriterlerinize uygun üye bulunamadı.' : 'İlk üyeniz mobil uygulamadan kayıt olduğunda burada görünecek.'}
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="members-table">
                  <thead>
                    <tr>
                      <th>Üye Adı</th>
                      <th>İletişim</th>
                      <th>Üyelik Tipi</th>
                      <th>Paket Bitiş Tarihi</th>
                      <th>Kalan Ders</th>
                      <th>Durum</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => {
                      const { label: membershipBadgeLabel, className: membershipBadgeClass } = getMembershipBadgeInfo(member);

                      return (
                        <tr key={member.id} className={member.status === 'pending' ? 'pending-row' : ''}>
                          <td data-label="Üye Adı">
                            <div className="member-name">
                              <div className="member-avatar">
                                {member.displayName ? member.displayName.split(' ').map((n) => n[0]).join('') : 'ÜY'}
                              </div>
                              <span>{member.displayName || `${member.firstName} ${member.lastName}`}</span>
                            </div>
                          </td>
                          <td data-label="İletişim">
                            <div className="member-contact">
                              <span className="email">{member.email}</span>
                              <span className="phone">{member.phone}</span>
                            </div>
                          </td>
                          <td data-label="Üyelik Tipi">
                            <div className="membership-type-container">
                              <span className={`membership-type-badge ${membershipBadgeClass}`}>
                                {membershipBadgeLabel}
                              </span>
                            </div>
                          </td>
                          <td data-label="Paket Bitiş Tarihi">
                            {(() => {
                              const expiryDate = getPackageExpiryDate(member);
                              return expiryDate ? expiryDate.toLocaleDateString('tr-TR') : '-';
                            })()}
                          </td>
                          <td data-label="Kalan Ders">
                            <div className="remaining-classes">
                              <span className={member.remainingClasses < 5 ? 'low' : ''}>
                                {member.remainingClasses === 999
                                  ? 'Sınırsız'
                                  : member.remainingClasses === 0
                                  ? '0'
                                  : member.remainingClasses || 0}
                              </span>
                            </div>
                          </td>
                          <td data-label="Durum">
                            <div className="status-container">
                              <span className={`status-badge ${member.membershipStatus || member.status}`}>
                                {member.status === 'pending'
                                  ? 'Bekliyor'
                                  : member.membershipStatus === 'cancelled'
                                  ? 'İptal Edildi'
                                  : member.membershipStatus === 'frozen'
                                  ? 'Donduruldu'
                                  : member.status === 'rejected'
                                  ? 'Reddedildi'
                                  : member.status === 'approved' || member.membershipStatus === 'active'
                                  ? 'Onaylandı'
                                  : 'Onaylandı'}
                              </span>
                            </div>
                          </td>
                          <td data-label="İşlemler">
                          <div className="action-buttons">
                            {member.status === 'pending' ? (
                              <>
                                <button 
                                  className="action-btn approve-btn" 
                                  title="Onayla"
                                  onClick={() => handleOpenApprovalModal(member)}
                                >
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M20 6L9 17l-5-5"/>
                                  </svg>
                                </button>
                                <button 
                                  className="action-btn reject-btn" 
                                  title="Reddet"
                                  onClick={() => {
                                    if (window.confirm(`${member.displayName || `${member.firstName} ${member.lastName}`} adlı üyeyi reddetmek istediğinizden emin misiniz?`)) {
                                      handleRejectMember(member.id, member.displayName || `${member.firstName} ${member.lastName}`, 'Admin tarafından reddedildi');
                                    }
                                  }}
                                >
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="15" y1="9" x2="9" y2="15"/>
                                    <line x1="9" y1="9" x2="15" y2="15"/>
                                  </svg>
                                </button>
                              </>
                            ) : member.membershipStatus === 'cancelled' ? (
                              <>
                                <button 
                                  className="action-btn reactivate-btn" 
                                  title="Üyeliği Yeniden Aktifleştir"
                                  onClick={() => handleReactivateMembership(member)}
                                  disabled={isProcessing}
                                >
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                                  </svg>
                                </button>
                                <button 
                                  className="action-btn edit-btn" 
                                  title="Düzenle"
                                  onClick={() => handleEditMember(member)}
                                >
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                  </svg>
                                </button>
                                <button 
                                  className="action-btn delete-btn" 
                                  title="Sil"
                                  onClick={() => handleDeleteMember(member)}
                                >
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="3,6 5,6 21,6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                  </svg>
                                </button>
                              </>
                            ) : member.membershipStatus === 'frozen' ? (
                              <>
                                <button 
                                  className="action-btn unfreeze-btn" 
                                  title="Dondurma Kaldır"
                                  onClick={() => handleUnfreezeMembership(member)}
                                  disabled={isProcessing}
                                >
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                                  </svg>
                                </button>
                                <button 
                                  className="action-btn edit-btn" 
                                  title="Düzenle"
                                  onClick={() => handleEditMember(member)}
                                >
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                  </svg>
                                </button>
                                <button 
                                  className="action-btn delete-btn" 
                                  title="Sil"
                                  onClick={() => handleDeleteMember(member)}
                                >
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="3,6 5,6 21,6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                  </svg>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="action-btn renew-btn"
                                  title="Paketi Yenile"
                                  onClick={() => handleRenewPackage(member)}
                                  disabled={isProcessing}
                                >
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                                  </svg>
                                </button>
                                <button
                                  className="action-btn freeze-btn"
                                  title="Üyeliği Dondur"
                                  onClick={() => handleFreezeMembership(member)}
                                  disabled={isProcessing}
                                >
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M12 2L9 6h6l-3-4z"/>
                                    <path d="M12 22l3-4H9l3 4z"/>
                                    <path d="M2 12l4-3v6l-4-3z"/>
                                    <path d="M22 12l-4 3V9l4 3z"/>
                                    <path d="M7.5 7.5L9 9"/>
                                    <path d="M15 15l1.5 1.5"/>
                                    <path d="M16.5 7.5L15 9"/>
                                    <path d="M9 15l-1.5 1.5"/>
                                  </svg>
                                </button>
                                <button
                                  className="action-btn cancel-btn"
                                  title="Üyeliği İptal Et"
                                  onClick={() => handleCancelMembership(member)}
                                  disabled={isProcessing}
                                >
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="m15 9-6 6"/>
                                    <path d="m9 9 6 6"/>
                                  </svg>
                                </button>
                                <button
                                  className="action-btn edit-btn"
                                  title="Düzenle"
                                  onClick={() => handleEditMember(member)}
                                >
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                  </svg>
                                </button>
                                <button
                                  className="action-btn delete-btn"
                                  title="Sil"
                                  onClick={() => handleDeleteMember(member)}
                                >
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="3,6 5,6 21,6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedMember && (
        <ApprovalModal
          member={selectedMember}
          onApprove={handleApproveMember}
          onReject={handleRejectMember}
          onClose={() => {
            setShowApprovalModal(false);
            setSelectedMember(null);
          }}
        />
      )}

      {/* Edit Member Modal */}
      <EditMemberModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
        onSave={handleSaveEdit}
        isLoading={isProcessing}
      />

      {/* Delete Member Modal */}
      <DeleteMemberModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
        onConfirm={handleConfirmDelete}
        isLoading={isProcessing}
      />

      {/* Cancel Membership Modal */}
      <CancelMembershipModal
        isOpen={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
        onConfirm={handleConfirmCancel}
        isLoading={isProcessing}
      />

      {/* Freeze Membership Modal */}
      <FreezeMembershipModal
        isOpen={freezeModalOpen}
        onClose={() => {
          setFreezeModalOpen(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
        onConfirm={handleConfirmFreeze}
        isLoading={isProcessing}
      />

      {/* Bulk Freeze Modal */}
      <BulkFreezeModal
        isOpen={bulkFreezeModalOpen}
        onClose={() => setBulkFreezeModalOpen(false)}
        onConfirm={handleConfirmBulkFreeze}
        isLoading={isProcessing}
      />

      {/* Bulk Unfreeze Modal */}
      <BulkUnfreezeModal
        isOpen={bulkUnfreezeModalOpen}
        onClose={() => setBulkUnfreezeModalOpen(false)}
        onConfirm={handleConfirmBulkUnfreeze}
        isLoading={isProcessing}
      />

      {/* Renew Package Modal */}
      {renewModalOpen && selectedMember && (
        <RenewPackageModal
          member={selectedMember}
          onRenew={handleConfirmRenew}
          onClose={() => {
            setRenewModalOpen(false);
            setSelectedMember(null);
          }}
        />
      )}
    </div>
  );
};

export default Members;
