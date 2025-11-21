import React from 'react';
import './LessonCards.css';

const LessonCards = ({ lessons = [], onCreateLesson, onEditLesson, onDeleteLesson, onViewDetails }) => {
  // Default lessons for demo if none provided
  const defaultLessons = [
    {
      id: '1',
      title: 'Crear Nueva Clase',
      type: 'create',
      icon: '✏️',
      color: 'primary',
      action: 'create'
    },
    {
      id: '2', 
      title: 'Ver Horarios',
      type: 'schedule',
      icon: '📅',
      color: 'secondary',
      action: 'schedule'
    }
  ];

  const displayLessons = lessons.length > 0 ? lessons : defaultLessons;

  const handleCardClick = (lesson) => {
    switch (lesson.action || lesson.type) {
      case 'create':
        onCreateLesson && onCreateLesson();
        break;
      case 'schedule':
        onViewDetails && onViewDetails(lesson);
        break;
      case 'edit':
        onEditLesson && onEditLesson(lesson);
        break;
      default:
        onViewDetails && onViewDetails(lesson);
    }
  };

  const getCardClass = (lesson) => {
    const baseClass = 'lesson-card';
    const colorClass = lesson.color || 'primary';
    const typeClass = lesson.type || '';
    return `${baseClass} ${baseClass}--${colorClass} ${typeClass ? `${baseClass}--${typeClass}` : ''}`;
  };

  return (
    <div className="lesson-cards-container">
      <div className="lesson-cards-grid">
        {displayLessons.map((lesson) => (
          <div 
            key={lesson.id} 
            className={getCardClass(lesson)}
            onClick={() => handleCardClick(lesson)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCardClick(lesson);
              }
            }}
          >
            <div className="lesson-card__content">
              <div className="lesson-card__icon">
                {lesson.icon || '📚'}
              </div>
              <div className="lesson-card__info">
                <h3 className="lesson-card__title">
                  {lesson.title || lesson.name || 'Untitled'}
                </h3>
                {lesson.subtitle && (
                  <p className="lesson-card__subtitle">
                    {lesson.subtitle}
                  </p>
                )}
                {lesson.time && (
                  <div className="lesson-card__time">
                    🕐 {lesson.time}
                  </div>
                )}
                {lesson.participants !== undefined && (
                  <div className="lesson-card__participants">
                    👥 {lesson.participants}/{lesson.maxParticipants || '∞'}
                  </div>
                )}
              </div>
            </div>

            {(onEditLesson || onDeleteLesson) && lesson.type !== 'create' && (
              <div className="lesson-card__actions">
                {onEditLesson && (
                  <button
                    className="lesson-card__action lesson-card__action--edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditLesson(lesson);
                    }}
                    aria-label="Edit lesson"
                  >
                    ✏️
                  </button>
                )}
                {onDeleteLesson && (
                  <button
                    className="lesson-card__action lesson-card__action--delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLesson(lesson);
                    }}
                    aria-label="Delete lesson"
                  >
                    🗑️
                  </button>
                )}
              </div>
            )}

            <div className="lesson-card__ripple"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LessonCards;