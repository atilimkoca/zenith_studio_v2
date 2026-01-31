// components/Dashboard/Dashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Dashboard.css';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext.jsx';
import dashboardService from '../../services/dashboardService';
import NotificationModal from '../UI/NotificationModal';
import { showCustomAlert } from '../../utils/customAlert';
import '../UI/CustomAlert.css';

const Dashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [animateCards, setAnimateCards] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const isProcessingNotificationRef = useRef(false);
  const showErrorRef = useRef();
  
  // Dynamic data states
  const [dashboardStats, setDashboardStats] = useState({
    totalMembers: { value: 0, change: '+0', trend: 'up' },
    activeLessons: { value: 0, change: '+0', trend: 'up' },
    monthlyIncome: { value: '₺0', change: '+₺0', trend: 'up' }
  });
  const [todayLessons, setTodayLessons] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [weeklyAttendance, setWeeklyAttendance] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [dailyAttendance, setDailyAttendance] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [monthlyAttendance, setMonthlyAttendance] = useState([0, 0, 0, 0]);
  
  // Participant statistics by lesson type
  const [participantStats, setParticipantStats] = useState({
    today: { group: 0, oneOnOne: 0, total: 0 },
    thisWeek: { group: 0, oneOnOne: 0, total: 0 },
    thisMonth: { group: 0, oneOnOne: 0, total: 0 }
  });
  
  // Trainer statistics states
  const [individualTrainers, setIndividualTrainers] = useState([]);
  
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  
  // Keep showError in ref to avoid dependencies
  showErrorRef.current = showError;
  
  // Get user first name for welcome message
  const getUserFirstName = () => {
    if (currentUser?.firstName) {
      return currentUser.firstName;
    }
    if (currentUser?.displayName) {
      return currentUser.displayName.split(' ')[0];
    }
    return 'Admin';
  };

  const loadDashboardData = useCallback(async () => {
    // Skip loading if we're processing a notification to prevent refresh
    if (isProcessingNotificationRef.current) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Load all data in parallel instead of sequential
      const [
        statsResult,
        lessons,
        activities,
        trainerStatsResult,
        attendance,
        daily,
        monthly,
        participantStatsResult
      ] = await Promise.all([
        dashboardService.getDashboardStats(),
        dashboardService.getTodayLessons(),
        dashboardService.getRecentActivities(),
        dashboardService.getIndividualTrainerStats(),
        dashboardService.getWeeklyAttendance(),
        dashboardService.getDailyAttendance(),
        dashboardService.getMonthlyAttendance(),
        dashboardService.getParticipantStatsByType()
      ]);
      
      // Update states with results
      if (statsResult.success) {
        setDashboardStats(statsResult.data);
      } else {
        showErrorRef.current(statsResult.error);
      }
      
      setTodayLessons(lessons);
      setRecentActivities(activities);
      setWeeklyAttendance(attendance);
      setDailyAttendance(daily);
      setMonthlyAttendance(monthly);
      
      if (trainerStatsResult.success) {
        setIndividualTrainers(trainerStatsResult.data);
      }
      
      if (participantStatsResult.success) {
        setParticipantStats(participantStatsResult.data);
      }
      
    } catch {
      showErrorRef.current('Dashboard verileri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies to prevent any re-creation

  useEffect(() => {
    // Only run on initial mount
    setAnimateCards(true);
    loadDashboardData();
  }, [loadDashboardData]);

  const handleSendNotification = async (notificationData) => {
    isProcessingNotificationRef.current = true; // Prevent any dashboard reloads
    
    try {
      const result = await dashboardService.sendNotification(notificationData);
      if (result.success) {
        setShowNotificationModal(false);
        
        // Use custom slide-in alert instead of browser alert
        showCustomAlert('📬 Bildirim başarıyla gönderildi!', 'success', 4000);
        
        // Log to console as well
        console.log('Bildirim başarıyla gönderildi!');
        
        // Explicitly prevent any automatic refresh
      } else {
        showError(result.error || 'Bildirim gönderilirken hata oluştu');
      }
    } catch {
      showError('Bildirim gönderilirken hata oluştu');
    } finally {
      // Keep processing flag active for longer to prevent any refresh
      setTimeout(() => {
        isProcessingNotificationRef.current = false;
      }, 5000); // 5 second delay to prevent any refresh
    }
  };

  const formatLessonTime = (timestamp) => {
    if (!timestamp) return '--:--';
    
    // If it's already a time string (like "14:30" or "11:30"), return as is
    if (typeof timestamp === 'string' && timestamp.match(/^\d{1,2}:\d{2}$/)) {
      return timestamp;
    }
    
    // If it's a string that might contain unwanted data, filter it out
    if (typeof timestamp === 'string') {
      // Check if it looks like participant count (e.g., "1/12")
      if (timestamp.includes('/') && timestamp.match(/^\d+\/\d+$/)) {
        return '--:--';
      }
      
      // Try to extract time from string if it contains time-like pattern
      const timeMatch = timestamp.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
      }
    }
    
    try {
      // Try to convert to date and format
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      if (isNaN(date.getTime())) {
        return '--:--';
      }
      return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const stats = [
    {
      id: 1,
      title: 'Toplam Üye',
      value: dashboardStats.totalMembers.value,
      change: dashboardStats.totalMembers.change,
      trend: dashboardStats.totalMembers.trend,
      icon: '👥',
      color: 'sage',
      bgGradient: 'linear-gradient(135deg, #5A6B5B 0%, #4A5B4B 100%)'
    },
    {
      id: 2,
      title: 'Bugünün Dersleri',
      value: dashboardStats.activeLessons.value,
      change: dashboardStats.activeLessons.change,
      trend: dashboardStats.activeLessons.trend,
      icon: '🧘‍♀️',
      color: 'mint',
      bgGradient: 'linear-gradient(135deg, #B4D4C8 0%, #8FB4A4 100%)'
    },
    {
      id: 3,
      title: 'Bu Ay Gelir',
      value: dashboardStats.monthlyIncome.value,
      change: dashboardStats.monthlyIncome.change,
      trend: dashboardStats.monthlyIncome.trend,
      icon: '💰',
      color: 'gold',
      bgGradient: 'linear-gradient(135deg, #D4B896 0%, #B49876 100%)'
    }
  ];

  const getChartData = () => {
    switch (selectedPeriod) {
      case 'day':
        return {
          labels: ['00-04', '04-08', '08-12', '12-16', '16-20', '20-24', 'Diğer'],
          datasets: [
            {
              label: 'Zaman Dilimi Katılımı',
              data: dailyAttendance,
            }
          ]
        };
      case 'month':
        return {
          labels: ['Hafta 1', 'Hafta 2', 'Hafta 3', 'Hafta 4'],
          datasets: [
            {
              label: 'Haftalık Katılım',
              data: monthlyAttendance,
            }
          ]
        };
      default: // 'week'
        return {
          labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
          datasets: [
            {
              label: 'Katılım',
              data: weeklyAttendance,
            }
          ]
        };
    }
  };

  const getChartTitle = () => {
    switch (selectedPeriod) {
      case 'day':
        return 'Bugünkü Katılım';
      case 'month':
        return 'Aylık Katılım';
      default:
        return 'Haftalık Katılım';
    }
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    // Note: Data is already loaded, just switching the display
  };

  const chartData = getChartData();

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-loading">
          <div className="loading-spinner-large"></div>
          <p>Dashboard yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="header-title">Hoşgeldin {getUserFirstName()}!</h1>
            <p className="header-subtitle">Bugün {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="header-actions">
            <button 
              className="header-btn create-notification-btn"
              onClick={() => setShowNotificationModal(true)}
            >
              <span className="notification-icon">📢</span>
              <span>Bildirim Oluştur</span>
            </button>
          </div>
        </div>
      </header>

      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div
            key={stat.id}
            className={`stat-card ${animateCards ? 'animate-in' : ''}`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="stat-header">
              <div className="stat-icon" style={{ background: stat.bgGradient }}>
                <span>{stat.icon}</span>
              </div>
              <div className={`stat-trend ${stat.trend}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {stat.trend === 'up' ? (
                    <path d="M12 19V5M5 12l7-7 7 7"/>
                  ) : (
                    <path d="M12 5v14M19 12l-7 7-7-7"/>
                  )}
                </svg>
              </div>
            </div>
            <div className="stat-content">
              <h3 className="stat-value">{stat.value}</h3>
              <p className="stat-title">{stat.title}</p>
              <p className="stat-change">{stat.change} bu hafta</p>
            </div>
          </div>
        ))}
      </div>

      {/* Participant Statistics by Lesson Type Section */}
      <div className="participant-type-stats-section">
        <div className="section-header">
          <h2 className="section-title">Katılımcı İstatistikleri</h2>
          <div className="stats-summary">
            <span className="summary-label">Ders Tipine Göre Dağılım</span>
          </div>
        </div>
        
        <div className="participant-type-grid">
          {/* Today Stats */}
          <div className="participant-type-card">
            <div className="type-card-header">
              <span className="type-card-icon">📅</span>
              <h3 className="type-card-title">Bugün</h3>
            </div>
            <div className="type-stats-row">
              <div className="type-stat group-stat">
                <span className="type-stat-icon">👥</span>
                <div className="type-stat-content">
                  <span className="type-stat-value">{participantStats.today.group}</span>
                  <span className="type-stat-label">Grup</span>
                </div>
              </div>
              <div className="type-stat individual-stat">
                <span className="type-stat-icon">👤</span>
                <div className="type-stat-content">
                  <span className="type-stat-value">{participantStats.today.oneOnOne}</span>
                  <span className="type-stat-label">Bireysel</span>
                </div>
              </div>
              <div className="type-stat total-stat">
                <span className="type-stat-icon">📊</span>
                <div className="type-stat-content">
                  <span className="type-stat-value">{participantStats.today.total}</span>
                  <span className="type-stat-label">Toplam</span>
                </div>
              </div>
            </div>
          </div>

          {/* This Week Stats */}
          <div className="participant-type-card">
            <div className="type-card-header">
              <span className="type-card-icon">📆</span>
              <h3 className="type-card-title">Bu Hafta</h3>
            </div>
            <div className="type-stats-row">
              <div className="type-stat group-stat">
                <span className="type-stat-icon">👥</span>
                <div className="type-stat-content">
                  <span className="type-stat-value">{participantStats.thisWeek.group}</span>
                  <span className="type-stat-label">Grup</span>
                </div>
              </div>
              <div className="type-stat individual-stat">
                <span className="type-stat-icon">👤</span>
                <div className="type-stat-content">
                  <span className="type-stat-value">{participantStats.thisWeek.oneOnOne}</span>
                  <span className="type-stat-label">Bireysel</span>
                </div>
              </div>
              <div className="type-stat total-stat">
                <span className="type-stat-icon">📊</span>
                <div className="type-stat-content">
                  <span className="type-stat-value">{participantStats.thisWeek.total}</span>
                  <span className="type-stat-label">Toplam</span>
                </div>
              </div>
            </div>
          </div>

          {/* This Month Stats */}
          <div className="participant-type-card">
            <div className="type-card-header">
              <span className="type-card-icon">🗓️</span>
              <h3 className="type-card-title">Bu Ay</h3>
            </div>
            <div className="type-stats-row">
              <div className="type-stat group-stat">
                <span className="type-stat-icon">👥</span>
                <div className="type-stat-content">
                  <span className="type-stat-value">{participantStats.thisMonth.group}</span>
                  <span className="type-stat-label">Grup</span>
                </div>
              </div>
              <div className="type-stat individual-stat">
                <span className="type-stat-icon">👤</span>
                <div className="type-stat-content">
                  <span className="type-stat-value">{participantStats.thisMonth.oneOnOne}</span>
                  <span className="type-stat-label">Bireysel</span>
                </div>
              </div>
              <div className="type-stat total-stat">
                <span className="type-stat-icon">📊</span>
                <div className="type-stat-content">
                  <span className="type-stat-value">{participantStats.thisMonth.total}</span>
                  <span className="type-stat-label">Toplam</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Trainer Statistics Section */}
      <div className="trainer-stats-section">
        <div className="section-header">
          <h2 className="section-title">Eğitmen Performansı</h2>
          <div className="stats-summary">
            <span className="total-trainers">Toplam {individualTrainers.length} Eğitmen</span>
          </div>
        </div>
        
        <div className="trainers-stats-container">
          {individualTrainers.length === 0 ? (
            <div className="empty-trainers-message">
              <p>Henüz eğitmen verisi bulunmuyor</p>
            </div>
          ) : (
            individualTrainers.map((trainer) => (
              <div key={trainer.id} className="trainer-stats-card">
                <div className="trainer-info">
                  <div className="trainer-avatar">
                    {trainer.avatar ? (
                      <img src={trainer.avatar} alt={trainer.name} />
                    ) : (
                      <div className="avatar-placeholder">
                        {trainer.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="trainer-details">
                    <h3 className="trainer-name">{trainer.name}</h3>
                    <p className="trainer-speciality">{trainer.speciality}</p>
                  </div>
                </div>

                <div className="trainer-metrics">
                  <div className="metric-group">
                    <div className="metric-label">Bugün</div>
                    <div className="metric-values">
                      <span className="metric-primary">{trainer.dailyLessons}</span>
                      <span className="metric-secondary">ders</span>
                      <span className="metric-primary">{trainer.dailyUniqueStudents}</span>
                      <span className="metric-secondary">katılımcı</span>
                    </div>
                    <div className="metric-type-breakdown">
                      <span className="type-group">👥 {trainer.dailyGroupParticipants || 0}</span>
                      <span className="type-one-on-one">👤 {trainer.dailyOneOnOneParticipants || 0}</span>
                    </div>
                  </div>
                  
                  <div className="metric-group">
                    <div className="metric-label">Bu Hafta</div>
                    <div className="metric-values">
                      <span className="metric-primary">{trainer.weeklyLessons}</span>
                      <span className="metric-secondary">ders</span>
                      <span className="metric-primary">{trainer.weeklyUniqueStudents}</span>
                      <span className="metric-secondary">katılımcı</span>
                    </div>
                    <div className="metric-type-breakdown">
                      <span className="type-group">👥 {trainer.weeklyGroupParticipants || 0}</span>
                      <span className="type-one-on-one">👤 {trainer.weeklyOneOnOneParticipants || 0}</span>
                    </div>
                  </div>
                  
                  <div className="metric-group">
                    <div className="metric-label">Bu Ay</div>
                    <div className="metric-values">
                      <span className="metric-primary">{trainer.monthlyLessons}</span>
                      <span className="metric-secondary">ders</span>
                      <span className="metric-primary">{trainer.monthlyUniqueStudents}</span>
                      <span className="metric-secondary">katılımcı</span>
                    </div>
                    <div className="metric-type-breakdown">
                      <span className="type-group">👥 {trainer.monthlyGroupParticipants || 0}</span>
                      <span className="type-one-on-one">👤 {trainer.monthlyOneOnOneParticipants || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="chart-card">
          <div className="card-header">
            <h2 className="card-title">{getChartTitle()}</h2>
            <div className="period-selector">
              <button
                className={`period-btn ${selectedPeriod === 'day' ? 'active' : ''}`}
                onClick={() => handlePeriodChange('day')}
              >
                Gün
              </button>
              <button
                className={`period-btn ${selectedPeriod === 'week' ? 'active' : ''}`}
                onClick={() => handlePeriodChange('week')}
              >
                Hafta
              </button>
              <button
                className={`period-btn ${selectedPeriod === 'month' ? 'active' : ''}`}
                onClick={() => handlePeriodChange('month')}
              >
                Ay
              </button>
            </div>
          </div>
          <div className="chart-container">
            <div className="chart-bars">
              {chartData.labels.map((label, index) => (
                <div key={label} className="chart-bar-wrapper">
                  <div className="chart-bar-container">
                    <div
                      className="chart-bar"
                      style={{
                        height: `${Math.min((chartData.datasets[0].data[index] / Math.max(...chartData.datasets[0].data)) * 100, 100)}%`,
                        animationDelay: `${index * 0.1}s`
                      }}
                    >
                      <span className="chart-value">{chartData.datasets[0].data[index]}</span>
                    </div>
                  </div>
                  <span className="chart-label">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="upcoming-classes-card">
          <div className="card-header">
            <h2 className="card-title">Bugünün Dersleri</h2>
            <button 
              className="see-all-btn" 
              onClick={() => {
                // Navigate to schedule page
                // Since this is state-based navigation, we need to get the setActiveView function
                // For now, we'll use a custom event to communicate with the parent
                window.dispatchEvent(new CustomEvent('navigate-to-schedule'));
              }}
            >
              Tümünü Gör
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
          <div className="classes-list">
            {todayLessons.length === 0 ? (
              <div className="empty-lessons">
                <p>Bugün için planlanmış ders bulunmuyor.</p>
              </div>
            ) : (
              todayLessons.slice(0, 5).map((lesson) => {
                // Better trainer name extraction
                const getTrainerName = (lessonData) => {
                  // Priority order for trainer fields
                  const trainerFields = ['trainerName', 'trainer', 'instructorName', 'teacherName'];
                  
                  for (const field of trainerFields) {
                    if (lessonData[field] && typeof lessonData[field] === 'string' && lessonData[field].trim() !== '') {
                      return lessonData[field].trim();
                    }
                  }
                  
                  return 'Eğitmen Belirtilmemiş';
                };
                
                // Get lesson type/title - prioritize lesson type
                const getLessonTitle = (lessonData) => {
                  // First try lesson type fields
                  if (lessonData.lessonType && lessonData.lessonType.trim()) {
                    return lessonData.lessonType.trim();
                  }
                  if (lessonData.type && lessonData.type.trim()) {
                    return lessonData.type.trim();
                  }
                  
                  // Then try title/name fields (including test data like "sss")
                  const titleFields = ['title', 'name', 'lessonName', 'className', 'subject'];
                  for (const field of titleFields) {
                    if (lessonData[field] && typeof lessonData[field] === 'string' && lessonData[field].trim() !== '') {
                      return lessonData[field].trim();
                    }
                  }
                  
                  return 'Ders';
                };
                
                return (
                <div key={lesson.id} className="class-item">
                  <div className="class-time">
                    {formatLessonTime(
                      lesson.displayTime || 
                      lesson.startTime || 
                      lesson.scheduledDate || 
                      lesson.date
                    )}
                  </div>
                  <div className="class-info">
                    <h4 className="class-name">{getLessonTitle(lesson)}</h4>
                    <p className="class-trainer">{getTrainerName(lesson)}</p>
                  </div>
                  <div className="class-meta">
                    <span className="class-spots">
                      {lesson.participants?.length || 0}/{lesson.capacity || lesson.maxParticipants || 10}
                    </span>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="activities-card">
        <div className="card-header">
          <h2 className="card-title">Son Aktiviteler</h2>
          <button className="filter-btn" onClick={loadDashboardData}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6"/>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
            </svg>
            Yenile
          </button>
        </div>
        <div className="activities-list">
          {recentActivities.length === 0 ? (
            <div className="empty-activities">
              <p>Henüz aktivite bulunmuyor.</p>
            </div>
          ) : (
            recentActivities.map((activity, index) => {
              // Function to get activity icon SVG
              const getActivityIcon = (type) => {
                switch (type) {
                  case 'member':
                    return (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    );
                  case 'lesson':
                    return (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                      </svg>
                    );
                  case 'equipment':
                    return (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6.5 6.5h11"/>
                        <path d="M6.5 17.5h11"/>
                        <path d="M6.5 12h11"/>
                        <path d="m16 8-1.5 1.5L16 11"/>
                        <path d="m8 16 1.5-1.5L8 13"/>
                      </svg>
                    );
                  case 'trainer':
                    return (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <line x1="22" x2="16" y1="11" y2="13"/>
                        <line x1="16" x2="22" y1="11" y2="13"/>
                      </svg>
                    );
                  case 'booking':
                    return (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                        <line x1="16" x2="16" y1="2" y2="6"/>
                        <line x1="8" x2="8" y1="2" y2="6"/>
                        <line x1="3" x2="21" y1="10" y2="10"/>
                        <path d="M8 14h.01"/>
                        <path d="M12 14h.01"/>
                        <path d="M16 14h.01"/>
                        <path d="M8 18h.01"/>
                        <path d="M12 18h.01"/>
                        <path d="M16 18h.01"/>
                      </svg>
                    );
                  case 'payment':
                    return (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect width="20" height="14" x="2" y="5" rx="2"/>
                        <line x1="2" x2="22" y1="10" y2="10"/>
                      </svg>
                    );
                  case 'expense':
                    return (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" x2="12" y1="2" y2="22"/>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        <path d="M9 9l3-3 3 3"/>
                        <path d="M15 15l-3 3-3-3"/>
                      </svg>
                    );
                  case 'cancel':
                    return (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M15 9l-6 6"/>
                        <path d="M9 9l6 6"/>
                      </svg>
                    );
                  case 'renewal':
                    return (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 4v6h6"/>
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                      </svg>
                    );
                  default:
                    return (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                    );
                }
              };

              return (
              <div key={index} className="activity-item">
                <div className={`activity-icon ${activity.type}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="activity-content">
                  <p className="activity-text">
                    <strong>{activity.name}</strong> {activity.action}
                  </p>
                  <span className="activity-time">{activity.time}</span>
                </div>
              </div>
              );
            })
          )}
        </div>
      </div>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        onSend={handleSendNotification}
      />
    </div>
  );
};

export default Dashboard;