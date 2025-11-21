import React, { useState } from 'react';
import LessonCards from './LessonCards';
import './LessonCards.css';

const LessonCardsDemo = () => {
  const [lessons, setLessons] = useState([
    {
      id: '1',
      title: 'Crear Nueva Clase',
      subtitle: 'Añadir nueva lección al programa',
      type: 'create',
      icon: '✏️',
      color: 'primary',
      action: 'create'
    },
    {
      id: '2', 
      title: 'Pilates Matutino',
      subtitle: 'Clase de pilates para principiantes',
      type: 'lesson',
      icon: '🧘‍♀️',
      color: 'success',
      time: '08:00 - 09:00',
      participants: 8,
      maxParticipants: 12
    },
    {
      id: '3',
      title: 'Yoga Vespertino', 
      subtitle: 'Relajación y estiramiento',
      type: 'lesson',
      icon: '🧘‍♂️',
      color: 'secondary',
      time: '18:00 - 19:00',
      participants: 15,
      maxParticipants: 20
    },
    {
      id: '4',
      title: 'Ver Horarios',
      subtitle: 'Consultar programación completa',
      type: 'schedule',
      icon: '📅',
      color: 'info',
      action: 'schedule'
    },
    {
      id: '5',
      title: 'Reformer Avanzado',
      subtitle: 'Clase con equipamiento especializado',
      type: 'lesson', 
      icon: '🏋️‍♀️',
      color: 'warning',
      time: '12:00 - 13:00',
      participants: 4,
      maxParticipants: 6
    },
    {
      id: '6',
      title: 'Meditación',
      subtitle: 'Sesión de mindfulness y relajación',
      type: 'lesson',
      icon: '🧘',
      color: 'primary',
      time: '07:00 - 07:30',
      participants: 12,
      maxParticipants: 15
    }
  ]);

  const handleCreateLesson = () => {
    console.log('Creating new lesson...');
    // You would typically open a modal or navigate to a form here
    alert('Abrir formulario para crear nueva clase');
  };

  const handleEditLesson = (lesson) => {
    console.log('Editing lesson:', lesson);
    alert(`Editando clase: ${lesson.title}`);
  };

  const handleDeleteLesson = (lesson) => {
    console.log('Deleting lesson:', lesson);
    if (window.confirm(`¿Estás seguro de que quieres eliminar "${lesson.title}"?`)) {
      setLessons(lessons.filter(l => l.id !== lesson.id));
    }
  };

  const handleViewDetails = (lesson) => {
    console.log('Viewing lesson details:', lesson);
    if (lesson.action === 'schedule') {
      alert('Mostrando horarios completos...');
    } else {
      alert(`Detalles de: ${lesson.title}`);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc',
      padding: '20px 0'
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        padding: '0 20px'
      }}>
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '40px',
          background: 'white',
          padding: '40px',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: '700', 
            color: '#1f2937',
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            📚 Gestión de Clases
          </h1>
          <p style={{ 
            fontSize: '1.1rem', 
            color: '#6b7280', 
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Componente de tarjetas optimizado para móviles. Diseñado desde cero para pantallas pequeñas 
            con diseño responsivo y accesible.
          </p>
        </div>

        <LessonCards
          lessons={lessons}
          onCreateLesson={handleCreateLesson}
          onEditLesson={handleEditLesson} 
          onDeleteLesson={handleDeleteLesson}
          onViewDetails={handleViewDetails}
        />

        <div style={{ 
          marginTop: '40px',
          background: 'white',
          padding: '30px',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ 
            color: '#1f2937',
            marginBottom: '16px',
            fontSize: '1.5rem',
            fontWeight: '600'
          }}>
            ✨ Características
          </h3>
          <ul style={{ 
            color: '#6b7280',
            lineHeight: '1.8',
            fontSize: '1rem'
          }}>
            <li>🎯 <strong>Mobile-First:</strong> Diseñado primero para dispositivos móviles</li>
            <li>📱 <strong>Responsivo:</strong> Se adapta desde 320px hasta pantallas grandes</li>
            <li>♿ <strong>Accesible:</strong> Soporte completo para lectores de pantalla</li>
            <li>⚡ <strong>Animaciones Fluidas:</strong> Transiciones suaves con reducción de movimiento</li>
            <li>🎨 <strong>Temas Personalizables:</strong> Múltiples esquemas de color</li>
            <li>👆 <strong>Táctil:</strong> Optimizado para dispositivos touch</li>
            <li>🌙 <strong>Modo Oscuro:</strong> Soporte automático para modo oscuro</li>
            <li>⚡ <strong>Alto Contraste:</strong> Compatible con preferencias de accesibilidad</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LessonCardsDemo;