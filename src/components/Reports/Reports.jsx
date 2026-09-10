import React, { useState, useEffect } from 'react';
import reportsService from '../../services/reportsService';
import { MONTH_LABELS_TR, LESSON_CATEGORIES, cellForCategory, totalsForCategory } from '../../services/trainerLessonStats';
import './Reports.css';

const Reports = () => {
  const [currentReport, setCurrentReport] = useState('dashboard');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summaryStats, setSummaryStats] = useState({});
  const [notification, setNotification] = useState(null);
  const [trainerYear, setTrainerYear] = useState(new Date().getFullYear());
  const [trainerCategory, setTrainerCategory] = useState('all');

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
    const allRows = stats?.rows || [];
    const activeRows = allRows.filter((row) => row.totalDone > 0 || row.totalPlanned > 0);
    const idleRows = allRows.filter((row) => row.totalDone === 0 && row.totalPlanned === 0);
    const monthTotals = stats?.monthTotals || [];
    const currentMonthIndex = trainerYear === currentYear ? new Date().getMonth() : -1;
    const showSplit = trainerCategory === 'all';
    const grand = totalsForCategory(stats, trainerCategory);
    const minYear = currentYear - 2;
    const maxYear = currentYear + 1;

    const maxDone = activeRows.reduce((max, row) => (
      row.months.reduce((m, cell) => Math.max(m, cellForCategory(cell, trainerCategory).done), max)
    ), 0);

    const percent = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);
    const groupShare = stats ? percent(stats.groupDone, stats.totalDone) : 0;

    const cellTitle = (label, cell) => {
      const done = cellForCategory(cell, trainerCategory).done;
      const planned = cellForCategory(cell, trainerCategory).planned;
      const parts = [`${label}: ${done} ders yapıldı`];
      if (showSplit) parts.push(`Grup ${cell.group.done}, birebir ${cell.individual.done}`);
      if (planned) parts.push(`${planned} ders planlı`);
      return parts.join('\n');
    };

    const renderCell = (cell, label, { heat = true } = {}) => {
      const { done, planned } = cellForCategory(cell, trainerCategory);
      const tint = heat && done > 0 && maxDone > 0 ? 0.06 + 0.26 * (done / maxDone) : 0;
      const split = cell.group.done + cell.individual.done;
      return (
        <div className="tl-cell" style={tint ? { '--tl-tint': tint } : undefined} title={cellTitle(label, cell)}>
          <div className="tl-cell-line">
            {done > 0 ? (
              <span className="tl-num">{done}</span>
            ) : planned > 0 ? null : (
              <span className="tl-num tl-num--empty">–</span>
            )}
            {planned > 0 && <span className="tl-planned">+{planned}</span>}
          </div>
          {showSplit && split > 0 && (
            <div className="tl-split" aria-hidden="true">
              <span className="tl-split-group" style={{ flexGrow: cell.group.done }} />
              <span className="tl-split-individual" style={{ flexGrow: cell.individual.done }} />
            </div>
          )}
        </div>
      );
    };

    const rowTotalCell = (totals) => ({
      done: totals.totalDone,
      planned: totals.totalPlanned,
      group: { done: totals.groupDone, planned: totals.groupPlanned },
      individual: { done: totals.individualDone, planned: totals.individualPlanned }
    });

    return (
      <section className="tl">
        <header className="tl-head">
          <div className="tl-title">
            <h3>Eğitmen dersleri</h3>
            <p>
              {stats
                ? `${trainerYear} yılında ${grand.done} ders yapıldı${grand.planned ? `, ${grand.planned} ders planlı` : ''}.`
                : 'Veri yükleniyor.'}
            </p>
          </div>
          <div className="tl-tools">
            <div className="tl-segmented" role="tablist" aria-label="Ders kategorisi">
              {LESSON_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  role="tab"
                  aria-selected={trainerCategory === category.id}
                  className={`tl-seg ${trainerCategory === category.id ? 'is-active' : ''}`}
                  onClick={() => setTrainerCategory(category.id)}
                >
                  {category.id !== 'all' && <span className={`tl-dot tl-dot--${category.id}`} aria-hidden="true" />}
                  {category.label}
                </button>
              ))}
            </div>
            <div className="tl-year" aria-label="Yıl">
              <button type="button" onClick={() => setTrainerYear((y) => y - 1)} disabled={trainerYear <= minYear} aria-label="Önceki yıl">‹</button>
              <span>{trainerYear}</span>
              <button type="button" onClick={() => setTrainerYear((y) => y + 1)} disabled={trainerYear >= maxYear} aria-label="Sonraki yıl">›</button>
            </div>
            <button type="button" className="tl-export" onClick={exportReport} disabled={!activeRows.length}>
              CSV indir
            </button>
          </div>
        </header>

        {stats && stats.totalDone > 0 && (
          <div className="tl-share" role="img" aria-label={`Grup ${stats.groupDone} ders, birebir ${stats.individualDone} ders`}>
            <span className="tl-share-label"><span className="tl-dot tl-dot--group" aria-hidden="true" />Grup <strong>{stats.groupDone}</strong> <em>%{groupShare}</em></span>
            <div className="tl-share-bar">
              <span className="tl-split-group" style={{ flexGrow: stats.groupDone }} />
              <span className="tl-split-individual" style={{ flexGrow: stats.individualDone }} />
            </div>
            <span className="tl-share-label tl-share-label--end"><em>%{100 - groupShare}</em> <strong>{stats.individualDone}</strong> Birebir<span className="tl-dot tl-dot--individual" aria-hidden="true" /></span>
          </div>
        )}

        {activeRows.length === 0 ? (
          <div className="tl-empty">
            <p>{trainerYear} yılında ders kaydı yok.</p>
            <small>Başka bir yıl seçin ya da ders programından ders ekleyin.</small>
          </div>
        ) : (
          <div className="tl-scroll">
            <table className="tl-table">
              <thead>
                <tr>
                  <th scope="col" className="tl-col-name">Eğitmen</th>
                  {MONTH_LABELS_TR.map((label, index) => (
                    <th
                      key={label}
                      scope="col"
                      className={`tl-col-month ${index === currentMonthIndex ? 'is-current' : ''}`}
                      title={index === currentMonthIndex ? 'Bu ay' : undefined}
                    >
                      {label}
                    </th>
                  ))}
                  <th scope="col" className="tl-col-total">{trainerYear}</th>
                </tr>
              </thead>
              <tbody>
                {activeRows.map((row) => (
                  <tr key={row.trainerId || row.trainerName}>
                    <th scope="row" className="tl-col-name">{row.trainerName}</th>
                    {row.months.map((cell, index) => (
                      <td key={index} className={`tl-col-month ${index === currentMonthIndex ? 'is-current' : ''}`}>
                        {renderCell(cell, `${row.trainerName}, ${MONTH_LABELS_TR[index]} ${trainerYear}`)}
                      </td>
                    ))}
                    <td className="tl-col-total">
                      {renderCell(rowTotalCell(row), `${row.trainerName}, ${trainerYear}`, { heat: false })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className="tl-col-name">Toplam</th>
                  {monthTotals.map((cell, index) => (
                    <td key={index} className={`tl-col-month ${index === currentMonthIndex ? 'is-current' : ''}`}>
                      {renderCell(cell, `Tüm eğitmenler, ${MONTH_LABELS_TR[index]} ${trainerYear}`, { heat: false })}
                    </td>
                  ))}
                  <td className="tl-col-total">
                    {renderCell(rowTotalCell(stats), `Tüm eğitmenler, ${trainerYear}`, { heat: false })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <footer className="tl-foot">
          <p>
            Sayılar yapılan dersleri gösterir: tamamlanmış ya da tarihi geçmiş, iptal edilmemiş dersler.
            {' '}<span className="tl-planned">+N</span> henüz yapılmamış planlı ders sayısıdır.
            {showSplit && ' Sayının altındaki çubuk grup ve birebir dersin payını gösterir.'}
          </p>
          {idleRows.length > 0 && (
            <p>Bu yıl ders kaydı olmayan eğitmenler: {idleRows.map((row) => row.trainerName).join(', ')}.</p>
          )}
          {stats?.skippedWithoutDate > 0 && (
            <p>{stats.skippedWithoutDate} ders tarih bilgisi olmadığı için sayılmadı.</p>
          )}
          <small>Rapor tarihi: {reportData?.generatedAt || '-'}</small>
        </footer>
      </section>
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