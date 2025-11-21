import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import scheduleService from '../../services/scheduleService';
import './UserLessons.css';

/**
 * UserLessons Component
 *
 * This component displays lessons filtered by the user's package type.
 * - If user has a "group" package → shows only group lessons
 * - If user has a "one-on-one" package → shows only one-on-one lessons
 *
 * Usage in mobile app or user portal:
 * <UserLessons />
 */
const UserLessons = () => {
  const { currentUser } = useAuth();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [packageType, setPackageType] = useState('group');
  const [remainingClasses, setRemainingClasses] = useState(0);
  const [error, setError] = useState(null);

  const daysOfWeek = {
    monday: 'Pazartesi',
    tuesday: 'Salı',
    wednesday: 'Çarşamba',
    thursday: 'Perşembe',
    friday: 'Cuma',
    saturday: 'Cumartesi',
    sunday: 'Pazar'
  };

  useEffect(() => {
    loadUserLessons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const loadUserLessons = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch lessons filtered by user's package type
      const result = await scheduleService.getAvailableLessonsForUser(currentUser.uid);

      if (result.success) {
        setLessons(result.lessons);
        setPackageType(result.packageType);
        setRemainingClasses(result.remainingClasses);
      } else {
        setError(result.error || 'Dersler yüklenemedi');
      }
    } catch (err) {
      console.error('Error loading lessons:', err);
      setError('Dersler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollLesson = async (lessonId) => {
    if (!currentUser) return;

    try {
      const result = await scheduleService.addStudentToLesson(lessonId, currentUser.uid);

      if (result.success) {
        // Reload lessons to update enrollment status
        await loadUserLessons();
        alert('✅ Derse başarıyla kaydoldunuz!');
      } else {
        alert('❌ ' + (result.error || 'Kayıt başarısız oldu'));
      }
    } catch (err) {
      console.error('Error enrolling in lesson:', err);
      alert('❌ Kayıt sırasında bir hata oluştu');
    }
  };

  const handleCancelLesson = async (lessonId) => {
    if (!currentUser) return;

    if (!window.confirm('Bu dersten çıkmak istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const result = await scheduleService.removeStudentFromLesson(lessonId, currentUser.uid);

      if (result.success) {
        // Reload lessons to update enrollment status
        await loadUserLessons();
        alert('✅ Dersten başarıyla çıkıldı. Ders krediniz iade edildi.');
      } else {
        alert('❌ ' + (result.error || 'İptal başarısız oldu'));
      }
    } catch (err) {
      console.error('Error canceling lesson:', err);
      alert('❌ İptal sırasında bir hata oluştu');
    }
  };

  if (loading) {
    return (
      <div className="user-lessons-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Dersler yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-lessons-container">
        <div className="error-state">
          <p>❌ {error}</p>
          <button onClick={loadUserLessons} className="retry-btn">
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="user-lessons-container">
        <div className="error-state">
          <p>🔒 Lütfen giriş yapın</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-lessons-container">
      {/* Header with package info */}
      <div className="user-lessons-header">
        <h1>Derslerim</h1>
        <div className="package-info">
          <span className={`package-badge ${packageType}`}>
            {packageType === 'one-on-one' ? '👤 Bire Bir Paket' : '👥 Grup Paketi'}
          </span>
          <span className="credits-badge">
            🎫 {remainingClasses} Ders Hakkı
          </span>
        </div>
      </div>

      {/* Info message */}
      <div className="info-message">
        <p>
          {packageType === 'one-on-one'
            ? '📌 Bire bir paketinizle sadece özel derslerinizi görüyorsunuz.'
            : '📌 Grup paketinizle sadece grup derslerini görüyorsunuz.'}
        </p>
      </div>

      {/* Lessons grid */}
      {lessons.length === 0 ? (
        <div className="empty-state">
          <p>📅 Henüz {packageType === 'one-on-one' ? 'bire bir' : 'grup'} ders bulunmuyor.</p>
        </div>
      ) : (
        <div className="lessons-grid">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="lesson-card">
              {/* Lesson Type Badge */}
              <div className="lesson-card-header">
                <span className={`lesson-type-badge ${lesson.lessonType}`}>
                  {lesson.lessonType === 'one-on-one' ? '👤 Bire Bir' : '👥 Grup'}
                </span>
                {lesson.isEnrolled && (
                  <span className="enrolled-badge">✓ Kayıtlı</span>
                )}
              </div>

              {/* Lesson Info */}
              <h3 className="lesson-title">{lesson.title}</h3>
              <div className="lesson-meta">
                <span className="lesson-type">{lesson.type}</span>
                <span className="lesson-level">{lesson.level}</span>
              </div>

              <div className="lesson-details">
                <div className="detail-row">
                  <span>📅 {daysOfWeek[lesson.dayOfWeek]}</span>
                </div>
                <div className="detail-row">
                  <span>🕐 {lesson.startTime} - {lesson.endTime}</span>
                </div>
                <div className="detail-row">
                  <span>👨‍🏫 {lesson.trainerName}</span>
                </div>
                <div className="detail-row">
                  <span>
                    👥 {lesson.currentParticipants || 0}/{lesson.maxParticipants}
                    {lesson.isFull && ' (Dolu)'}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="lesson-actions">
                {lesson.isEnrolled ? (
                  <button
                    className="btn btn-cancel"
                    onClick={() => handleCancelLesson(lesson.id)}
                  >
                    İptal Et
                  </button>
                ) : lesson.isFull ? (
                  <button className="btn btn-disabled" disabled>
                    Dolu
                  </button>
                ) : !lesson.canEnroll ? (
                  <button className="btn btn-disabled" disabled>
                    Ders Hakkı Yok
                  </button>
                ) : (
                  <button
                    className="btn btn-enroll"
                    onClick={() => handleEnrollLesson(lesson.id)}
                  >
                    Kayıt Ol
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserLessons;
