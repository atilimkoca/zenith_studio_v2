import React, { useState, useEffect } from 'react';
import reportsService from '../../services/reportsService';
import { MONTH_LABELS_TR } from '../../services/trainerLessonStats';
import './Reports.css';

const Reports = () => {
  const [currentReport, setCurrentReport] = useState('dashboard');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summaryStats, setSummaryStats] = useState({});
  const [notification, setNotification] = useState(null);
  const [trainerYear, setTrainerYear] = useState(new Date().getFullYear());

  const reportTypes = [
    { id: 'dashboard', name: 'Rapor Özeti', icon: '📊' },
    { id: 'memberDetails', name: 'Üyelik Detay', icon: '👥' },
    { id: 'deletedMembers', name: 'Silinen Üyeler', icon: '🗑️' },
    { id: 'expiredMembers', name: 'Biten Üyelik', icon: '⏰' },
    { id: 'frozenMembers', name: 'Durdurulan Üyelik', icon: '❄️' },
    { id: 'cancelledMembers', name: 'İptal Edilen Üyelik', icon: '❌' },
    { id: 'trainerLessons', name: 'Eğitmen Dersleri', icon: '🧘' },
    { id: 'notifications', name: 'Bildirimler', icon: '🔔' }
  ];

  const currentYear = new Date().getFullYear();
  const trainerYearOptions = Array.from({ length: 4 }, (_, i) => currentYear + 1 - i);

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const loadSummaryStats = async () => {
    try {
      const result = await reportsService.getSummaryStatistics();
      if (result.success) {
        setSummaryStats(result.data);
      }
    } catch (error) {
      console.error('Error loading summary stats:', error);
    }
  };

  const loadReportData = async (reportType) => {
    setLoading(true);
    try {
      let result;
      
      switch (reportType) {
        case 'memberDetails':
          result = await reportsService.getMemberDetailsReport();
          break;
        case 'deletedMembers':
          result = await reportsService.getDeletedMembersReport();
          break;
        case 'expiredMembers':
          result = await reportsService.getExpiredMembersReport();
          break;
        case 'frozenMembers':
          result = await reportsService.getFrozenMembersReport();
          break;
        case 'cancelledMembers':
          result = await reportsService.getCancelledMembersReport();
          break;
        case 'notifications':
          result = await reportsService.getNotificationsReport();
          break;
        case 'trainerLessons':
          result = await reportsService.getTrainerMonthlyLessonReport(trainerYear);
          break;
        default:
          result = { success: false, error: 'Bilinmeyen rapor türü' };
      }

      if (result.success) {
        setReportData(result);
      } else {
        showNotification(result.error, 'error');
        setReportData(null);
      }
    } catch (error) {
      console.error('Error loading report data:', error);
      showNotification('Rapor yüklenirken bir hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentReport === 'dashboard') {
      loadSummaryStats();
    } else {
      loadReportData(currentReport);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentReport, trainerYear]);

  const exportReport = async () => {
    if (!reportData || !reportData.data) {
      showNotification('Dışa aktarılacak veri bulunmuyor', 'warning');
      return;
    }

    if (reportData.reportType === 'trainerLessons') {
      const result = reportsService.exportTrainerLessonsToCSV(reportData.data);
      showNotification(result.success ? 'Rapor başarıyla dışa aktarıldı' : result.error, result.success ? 'success' : 'error');
      return;
    }

    // Handle different data structures
    let dataToExport = reportData.data;
    
    // For packageExpiration, flatten the nested structure
    if (reportData.reportType === 'packageExpiration') {
      const { expiredWithCredits = [], expiringSoon = [], recentlyExpired = [] } = reportData.data;
      dataToExport = [...expiredWithCredits, ...expiringSoon, ...recentlyExpired];
    }
    
    // Check if there's data to export
    if (Array.isArray(dataToExport) && dataToExport.length === 0) {
      showNotification('Dışa aktarılacak veri bulunmuyor', 'warning');
      return;
    }

    const result = reportsService.exportToCSV(dataToExport, reportData.reportType);
    
    if (result.success) {
      showNotification('Rapor başarıyla dışa aktarıldı', 'success');
    } else {
      showNotification(result.error, 'error');
    }
  };

  const renderDashboard = () => (
    <div className="dashboard-container">
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">{summaryStats.totalMembers || 0}</div>
            <div className="stat-label">Toplam Üye</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{summaryStats.activeMembers || 0}</div>
            <div className="stat-label">Aktif Üye</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">⏰</div>
          <div className="stat-content">
            <div className="stat-value">{summaryStats.expiredMembers || 0}</div>
            <div className="stat-label">Süresi Biten</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🆕</div>
          <div className="stat-content">
            <div className="stat-value">{summaryStats.newMembers || 0}</div>
            <div className="stat-label">Yeni Üye (30 gün)</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">❄️</div>
          <div className="stat-content">
            <div className="stat-value">{summaryStats.frozenMembers || 0}</div>
            <div className="stat-label">Dondurulmuş</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <div className="stat-value">{summaryStats.cancelledMembers || 0}</div>
            <div className="stat-label">İptal Edilmiş</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🗑️</div>
          <div className="stat-content">
            <div className="stat-value">{summaryStats.deletedMembers || 0}</div>
            <div className="stat-label">Silinmiş Üye</div>
          </div>
        </div>
      </div>

      <div className="quick-reports">
        <h3>Hızlı Raporlar</h3>
        <div className="quick-report-grid">
          {reportTypes.slice(1).map((report) => (
            <div 
              key={report.id} 
              className="quick-report-card"
              onClick={() => setCurrentReport(report.id)}
            >
              <div className="quick-report-icon">{report.icon}</div>
              <div className="quick-report-name">{report.name}</div>
              <div className="quick-report-arrow">→</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTrainerLessons = () => {
    const stats = reportData?.data;
    const rows = stats?.rows || [];
    const monthTotals = stats?.monthTotals || [];
    const currentMonthIndex = trainerYear === currentYear ? new Date().getMonth() : -1;

    const renderCount = (cell) => {
      if (!cell || (cell.done === 0 && cell.planned === 0)) {
        return <span className="lesson-count zero">–</span>;
      }
      return (
        <>
          <span className={`lesson-count ${cell.done > 0 ? '' : 'zero'}`}>{cell.done}</span>
          {cell.planned > 0 && <span className="lesson-planned" title="Planlı (henüz yapılmamış) ders">+{cell.planned}</span>}
        </>
      );
    };

    return (
      <div className="table-container">
        <div className="table-header">
          <div className="table-info">
            <h3>🧘 Eğitmen Dersleri</h3>
            <p>
              {stats ? `${stats.totalDone} ders yapıldı` : 'Veri yok'}
              {stats?.totalPlanned ? ` · ${stats.totalPlanned} planlı ders` : ''}
              {rows.length ? ` · ${rows.length} eğitmen` : ''}
            </p>
            <small>Rapor tarihi: {reportData?.generatedAt || '-'}</small>
          </div>
          <div className="table-actions">
            <label className="year-select">
              <span>Yıl</span>
              <select value={trainerYear} onChange={(e) => setTrainerYear(Number(e.target.value))}>
                {trainerYearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>
            <button className="export-btn" onClick={exportReport} disabled={!rows.length}>
              📊 CSV'ye Aktar
            </button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="no-data">
            <p>{trainerYear} yılı için ders kaydı bulunamadı.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="report-table trainer-lessons-table">
              <thead>
                <tr>
                  <th className="sticky-col">Eğitmen</th>
                  {MONTH_LABELS_TR.map((label, index) => (
                    <th key={label} className={`month-col ${index === currentMonthIndex ? 'current-month' : ''}`}>{label}</th>
                  ))}
                  <th className="total-col">Toplam</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.trainerId || row.trainerName}>
                    <td className="sticky-col trainer-name">{row.trainerName}</td>
                    {row.months.map((cell, index) => (
                      <td key={index} className={`month-col ${index === currentMonthIndex ? 'current-month' : ''}`}>
                        {renderCount(cell)}
                      </td>
                    ))}
                    <td className="total-col">
                      <span className="lesson-count total">{row.totalDone}</span>
                      {row.totalPlanned > 0 && <span className="lesson-planned">+{row.totalPlanned}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="sticky-col">Toplam</td>
                  {monthTotals.map((cell, index) => (
                    <td key={index} className={`month-col ${index === currentMonthIndex ? 'current-month' : ''}`}>
                      {renderCount(cell)}
                    </td>
                  ))}
                  <td className="total-col">
                    <span className="lesson-count total">{stats.totalDone}</span>
                    {stats.totalPlanned > 0 && <span className="lesson-planned">+{stats.totalPlanned}</span>}
                  </td>
                </tr>
              </tfoot>
            </table>
            <div className="table-legend">
              <span><strong>Sayı</strong>: yapılan ders (tamamlanan veya tarihi geçmiş, iptal edilmemiş)</span>
              <span><span className="lesson-planned">+N</span>: planlı, henüz yapılmamış ders</span>
              {stats.skippedWithoutDate > 0 && (
                <span>{stats.skippedWithoutDate} ders tarih bilgisi olmadığı için sayılmadı</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!reportData || !reportData.data) {
      return (
        <div className="no-data">
          <p>Bu rapor için veri bulunamadı.</p>
        </div>
      );
    }

    // Regular table rendering for other reports
    if (!reportData.data.length) {
      return (
        <div className="no-data">
          <p>Bu rapor için veri bulunamadı.</p>
        </div>
      );
    }

    return (
      <div className="table-container">
        <div className="table-header">
          <div className="table-info">
            <h3>{reportTypes.find(r => r.id === currentReport)?.name}</h3>
            <p>{reportData.data.length} kayıt bulundu</p>
            <small>Rapor tarihi: {reportData.generatedAt}</small>
          </div>
          <button className="export-btn" onClick={exportReport}>
            📊 CSV'ye Aktar
          </button>
        </div>
        
        <div className="table-wrapper">
          <table className="report-table">
            <thead>
              <tr>
                {getTableHeaders(currentReport).map((header, index) => (
                  <th key={index}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportData.data.map((row, index) => (
                <tr key={index}>
                  {getTableRow(row, currentReport).map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const getTableHeaders = (reportType) => {
    const headers = {
      memberDetails: ['Üye', 'Telefon', 'E-posta', 'Paket Adı', 'Kalan Ders', 'Paket Bitiş', 'Onay Tarihi'],
      deletedMembers: ['Üye', 'Telefon', 'E-posta', 'Silinme Tarihi', 'Silen', 'Silme Sebebi', 'Üyelik Türü', 'Son Ziyaret'],
      expiredMembers: ['Üye', 'Telefon', 'E-posta', 'Bitiş Tarihi', 'Geçen Süre', 'Sebep'],
      frozenMembers: ['Üye', 'Dondurma Başlangıç', 'Dondurma Bitiş', 'Sebep'],
      cancelledMembers: ['Üye', 'İptal Tarihi', 'İptal Sebebi', 'İade Tutarı'],
      notifications: ['Üye', 'Tip', 'Mesaj', 'Öncelik', 'Tarih']
    };
    
    return headers[reportType] || ['Veri'];
  };

  const getTableRow = (data, reportType) => {
    const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.displayName || 'İsimsiz';
    
    const rows = {
      memberDetails: [
        fullName,
        data.phone || '-',
        data.email || '-',
        data.packageName || '-',
        data.remainingClasses || 0,
        data.packageExpiryDate || '-',
        data.approvedAt || data.registrationDate || '-'
      ],
      deletedMembers: [
        fullName,
        data.phone || '',
        data.email || '',
        data.deletedAt || '',
        data.deletedByLabel || 'Bilinmiyor',
        data.deletionReason || 'Belirtilmemiş',
        data.membershipType || '',
        data.lastVisit || 'Hiç'
      ],
      expiredMembers: [
        fullName,
        data.phone || '',
        data.email || '',
        data.membershipEndDate || '',
        `${data.daysExpired || 0} gün önce`,
        data.expiredReason || 'Belirtilmemiş'
      ],
      packageExpiration: [
        data.name || fullName,
        data.phone || '',
        data.email || '',
        data.remainingClasses || 0,
        data.packageExpiryDate || '',
        data.actionRequired || '',
        'İşlem'
      ],
      frozenMembers: [
        fullName,
        data.freezeStartDate || '',
        data.freezeEndDate || '',
        data.freezeReason || ''
      ],
      cancelledMembers: [
        fullName,
        data.cancellationDate || '',
        data.cancellationReason || '',
        data.refundAmount ? `₺${data.refundAmount}` : '₺0'
      ],
      notifications: [
        data.memberName || '',
        getNotificationTypeLabel(data.type),
        data.message || '',
        getPriorityBadge(data.priority),
        data.date || ''
      ]
    };
    
    return rows[reportType] || [JSON.stringify(data)];
  };

  const getNotificationTypeLabel = (type) => {
    const types = {
      membership_expiry: '⏰ Üyelik Bitiş',
      payment_reminder: '💰 Ödeme Hatırlatma',
      birthday: '🎂 Doğum Günü',
      class_reminder: '📅 Ders Hatırlatma'
    };
    return types[type] || type;
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      low: '🟢 Düşük',
      medium: '🟡 Orta',
      high: '🟠 Yüksek',
      critical: '🔴 Kritik'
    };
    return badges[priority] || priority;
  };

  return (
    <div className="reports-container">
      {/* Header */}
      <div className="reports-header">
        <h1>📊 Raporlar</h1>
        <p>Detaylı üyelik analitiği ve raporları</p>
      </div>

      {/* Navigation */}
      <div className="reports-nav">
        {reportTypes.map((report) => (
          <button
            key={report.id}
            className={`nav-btn ${currentReport === report.id ? 'active' : ''}`}
            onClick={() => setCurrentReport(report.id)}
          >
            <span className="nav-icon">{report.icon}</span>
            <span className="nav-text">{report.name}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="reports-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-content">
              <div className="modern-spinner"></div>
              <h3>Rapor Hazırlanıyor...</h3>
              <p>Veriler işleniyor, lütfen bekleyin.</p>
            </div>
          </div>
        ) : currentReport === 'dashboard' ? (
          renderDashboard()
        ) : currentReport === 'trainerLessons' ? (
          renderTrainerLessons()
        ) : (
          renderTable()
        )}
      </div>

      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-content">
            <span className="notification-icon">
              {notification.type === 'success' ? '✅' : 
               notification.type === 'error' ? '❌' : 
               notification.type === 'warning' ? '⚠️' : 'ℹ️'}
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
    </div>
  );
};

export default Reports;