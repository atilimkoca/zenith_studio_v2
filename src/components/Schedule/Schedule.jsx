// Schedule Management Component
import React, { useState, useEffect, useRef } from 'react';
import './Schedule.css';
import scheduleService from '../../services/scheduleService';
import trainersService from '../../services/trainersService';
import memberService from '../../services/memberService';
import { useAuth } from '../../contexts/AuthContext';

// Helper function to format date as local YYYY-MM-DD string (avoids UTC conversion issues)
const formatDateToLocalString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to parse date string as local time (avoids UTC timezone issues)
const parseDateAsLocal = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value.toDate) return value.toDate(); // Firebase Timestamp
  if (typeof value === 'string') {
    // Handle date-only strings (e.g., "2026-01-09") by parsing as local time
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(value);
  }
  return new Date(value);
};

const Schedule = () => {
  const { currentUser } = useAuth();
  const [schedule, setSchedule] = useState({});
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showLessonDetail, setShowLessonDetail] = useState(false);
  const [selectedLessonForDetail, setSelectedLessonForDetail] = useState(null);
  const [participantDetails, setParticipantDetails] = useState({}); // Store participant names
  const [loadingParticipants, setLoadingParticipants] = useState(false); // Loading state for participants
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [selectedLessonForStudents, setSelectedLessonForStudents] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const isNavigatingRef = useRef(false); // Prevent reload during navigation
  const [deleteCriteria, setDeleteCriteria] = useState({
    dayOfWeek: '',
    trainerId: '',
    startTime: '',
    duration: ''
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletePreview, setDeletePreview] = useState(null);
  
  // Previous week data for comparison
  const [previousWeekData, setPreviousWeekData] = useState({
    totalLessons: 0,
    totalCapacity: 0,
    activeTrainers: 0,
    lessonTypes: 0
  });

  const [lessonForm, setLessonForm] = useState({
    title: '',
    type: '',
    trainerId: '',
    trainerName: '',
    dayOfWeek: 'monday',
    startTime: '',
    endTime: '',
    duration: 45,
    maxParticipants: 12,
    currentParticipants: 0,
    description: '',
    level: 'beginner',
    price: 0,
    scheduledDate: null,
    lessonType: 'group'
  });

  const [recurringForm, setRecurringForm] = useState({
    title: '',
    type: '',
    trainerId: '',
    trainerName: '',
    selectedDays: [],
    startTime: '',
    endTime: '',
    duration: 45,
    maxParticipants: 12,
    description: '',
    level: 'beginner',
    startDate: '',
    endDate: '',
    repeatWeeks: 4,
    lessonType: 'group'
  });

  const daysOfWeek = {
    monday: 'Pazartesi',
    tuesday: 'Salı',
    wednesday: 'Çarşamba',
    thursday: 'Perşembe',
    friday: 'Cuma',
    saturday: 'Cumartesi',
    sunday: 'Pazar'
  };



  const lessonTypes = [
    'Pilates',
    'Yoga',
    'Reformer',
    'Mat Pilates',
    'Yoga Flow',
    'Yin Yoga',
    'Vinyasa',
    'Hatha Yoga',
    'Strength Training',
    'Cardio',
    'Stretching',
    'Meditation'
  ];

  const levels = {
    beginner: 'Başlangıç',
    intermediate: 'Orta',
    advanced: 'İleri',
    all: 'Tüm Seviyeler'
  };

  // Generate time slots from 06:00 to 22:00 in 15-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  // Generate date options for the next 60 days
  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dateString = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      dates.push({
        value: dateString,
        label: displayDate
      });
    }
    
    return dates;
  };

  const timeSlots = generateTimeSlots();
  const dateOptions = generateDateOptions();

  // Get week dates
  const getWeekDates = (date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(startOfWeek.getDate() + mondayOffset);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    
    return week;
  };

  // Calculate percentage change between two values
  const calculatePercentageChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const weekDates = getWeekDates(currentWeek);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Add a simple check for Firebase configuration
        console.log('🔧 Firebase config check:', {
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? 'present' : 'missing'
        });
        
        if (!import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID === 'placeholder-project') {
          console.warn('⚠️ Firebase not configured properly, using demo data');
          // Use demo data when Firebase is not configured
          setSchedule({
            monday: [
              {
                id: 'demo1',
                title: 'Sabah Yoga',
                type: 'Yoga',
                trainerId: 'demo-trainer',
                trainerName: 'Demo Eğitmen',
                dayOfWeek: 'monday',
                startTime: '09:00',
                endTime: '10:00',
                duration: 60,
                maxParticipants: 15,
                currentParticipants: 8,
                level: 'beginner'
              }
            ],
            tuesday: [
              {
                id: 'demo2',
                title: 'Pilates',
                type: 'Pilates',
                trainerId: 'demo-trainer',
                trainerName: 'Demo Eğitmen',
                dayOfWeek: 'tuesday',
                startTime: '10:00',
                endTime: '11:00',
                duration: 60,
                maxParticipants: 12,
                currentParticipants: 5,
                level: 'intermediate'
              }
            ],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: []
          });
          setTrainers([
            {
              id: 'demo-trainer',
              displayName: 'Demo Eğitmen',
              firstName: 'Demo',
              lastName: 'Eğitmen'
            }
          ]);
          setLoading(false);
          return;
        }

        // Calculate week date range for filtering
        const currentWeekDates = getWeekDates(currentWeek);
        const weekStart = new Date(currentWeekDates[0]);
        const weekEnd = new Date(currentWeekDates[6]);
        
        console.log('📅 Current week calculation:', {
          currentWeek: currentWeek.toDateString(),
          currentWeekDates: currentWeekDates.map(d => d.toDateString()),
          weekStart: weekStart.toDateString(),
          weekEnd: weekEnd.toDateString(),
          weekStartISO: weekStart.toISOString().split('T')[0],
          weekEndISO: weekEnd.toISOString().split('T')[0]
        });

        const [scheduleResult, trainersResult] = await Promise.all([
          scheduleService.getWeeklyScheduleByDateRange(weekStart, weekEnd),
          trainersService.getAllTrainers()
        ]);

        console.log('Schedule result:', scheduleResult);
        console.log('Trainers result:', trainersResult);

        if (scheduleResult.success) {
          console.log('📅 Schedule data received:', scheduleResult.schedule);
          setSchedule(scheduleResult.schedule || {
            monday: [], tuesday: [], wednesday: [], thursday: [], 
            friday: [], saturday: [], sunday: []
          });
        } else {
          console.warn('Schedule loading failed, using empty schedule');
          setSchedule({
            monday: [], tuesday: [], wednesday: [], thursday: [], 
            friday: [], saturday: [], sunday: []
          });
          if (scheduleResult.error) {
            showNotification('Program yüklenirken hata oluştu: ' + scheduleResult.error, 'error');
          }
        }

        if (trainersResult.success) {
          setTrainers(trainersResult.trainers || []);
          if (trainersResult.warning) {
            showNotification(trainersResult.warning, 'warning');
          }
        } else {
          console.warn('Trainers loading failed, using empty array');
          setTrainers([]);
        }
      } catch (error) {
        console.error('Error loading schedule data:', error);
        showNotification('Veri yüklenirken beklenmeyen bir hata oluştu.', 'error');
      } finally {
        setLoading(false);
      }
    };

    const loadDataWithComparison = async () => {
      await loadData();
      
      // Fetch previous week data after current week is loaded
      try {
        // Check if Firebase is configured
        if (!import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID === 'placeholder-project') {
          // Calculate current stats directly
          const currentTotalLessons = Object.values(schedule).reduce((total, dayLessons) => total + dayLessons.length, 0);
          const currentTotalCapacity = Object.values(schedule).reduce((total, dayLessons) => 
            total + dayLessons.reduce((dayTotal, lesson) => dayTotal + (lesson.maxParticipants || 0), 0), 0
          );
          const currentLessonTypes = new Set(Object.values(schedule).flat().map(lesson => lesson.type)).size;
          
          // Use mock data for demo mode
          setPreviousWeekData({
            totalLessons: Math.max(0, currentTotalLessons - Math.floor(Math.random() * 3) + 1),
            totalCapacity: Math.max(0, currentTotalCapacity - Math.floor(Math.random() * 20) + 10),
            activeTrainers: Math.max(0, trainers.length - Math.floor(Math.random() * 2)),
            lessonTypes: Math.max(1, currentLessonTypes - Math.floor(Math.random() * 2))
          });
          return;
        }

        // Calculate previous week date range
        const previousWeek = new Date(currentWeek);
        previousWeek.setDate(previousWeek.getDate() - 7);
        const previousWeekDates = getWeekDates(previousWeek);
        const weekStart = new Date(previousWeekDates[0]);
        const weekEnd = new Date(previousWeekDates[6]);

        // Fetch previous week schedule
        const scheduleResult = await scheduleService.getWeeklyScheduleByDateRange(weekStart, weekEnd);
        
        if (scheduleResult.success) {
          const prevSchedule = scheduleResult.schedule || {};
          const totalLessons = Object.values(prevSchedule).reduce((total, dayLessons) => total + dayLessons.length, 0);
          const totalCapacity = Object.values(prevSchedule).reduce((total, dayLessons) => 
            total + dayLessons.reduce((dayTotal, lesson) => dayTotal + (lesson.maxParticipants || 0), 0), 0
          );
          const lessonTypes = new Set(Object.values(prevSchedule).flat().map(lesson => lesson.type)).size;

          setPreviousWeekData({
            totalLessons,
            totalCapacity,
            activeTrainers: trainers.length, // Assume same trainers for now
            lessonTypes
          });
        }
      } catch (error) {
        console.error('Error fetching previous week data:', error);
        // Calculate current stats directly for fallback
        const currentTotalLessons = Object.values(schedule).reduce((total, dayLessons) => total + dayLessons.length, 0);
        const currentTotalCapacity = Object.values(schedule).reduce((total, dayLessons) => 
          total + dayLessons.reduce((dayTotal, lesson) => dayTotal + (lesson.maxParticipants || 0), 0), 0
        );
        const currentLessonTypes = new Set(Object.values(schedule).flat().map(lesson => lesson.type)).size;
        
        setPreviousWeekData({
          totalLessons: Math.max(0, currentTotalLessons - 1),
          totalCapacity: Math.max(0, currentTotalCapacity - 10),
          activeTrainers: Math.max(0, trainers.length),
          lessonTypes: Math.max(1, currentLessonTypes - 1)
        });
      }
    };

    // Skip loading if we're navigating to prevent page refresh
    if (isNavigatingRef.current) {
      // Clear navigation flag after a delay
      setTimeout(() => {
        isNavigatingRef.current = false;
        // Load data silently after navigation is complete
        loadDataWithComparison();
      }, 100);
      return;
    }

    loadDataWithComparison();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeek]);

  const loadScheduleData = async () => {
    setLoading(true);
    try {
      // Check for Firebase configuration
      console.log('🔧 Firebase config check (refresh):', {
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? 'present' : 'missing'
      });
      
      if (!import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID === 'placeholder-project') {
        console.warn('⚠️ Firebase not configured properly, using demo data');
        // Use demo data when Firebase is not configured
        setSchedule({
          monday: [
            {
              id: 'demo1',
              title: 'Sabah Yoga',
              type: 'Yoga',
              trainerId: 'demo-trainer-1',
              trainerName: 'Ayşe Yılmaz',
              dayOfWeek: 'monday',
              startTime: '09:00',
              endTime: '10:00',
              duration: 60,
              maxParticipants: 15,
              currentParticipants: 12,
              level: 'beginner'
            },
            {
              id: 'demo2',
              title: 'Reformer Pilates',
              type: 'Reformer',
              trainerId: 'demo-trainer-2',
              trainerName: 'Mehmet Demir',
              dayOfWeek: 'monday',
              startTime: '18:00',
              endTime: '19:00',
              duration: 60,
              maxParticipants: 8,
              currentParticipants: 6,
              level: 'intermediate'
            }
          ],
          tuesday: [
            {
              id: 'demo3',
              title: 'Mat Pilates',
              type: 'Mat Pilates',
              trainerId: 'demo-trainer-1',
              trainerName: 'Ayşe Yılmaz',
              dayOfWeek: 'tuesday',
              startTime: '10:00',
              endTime: '11:00',
              duration: 60,
              maxParticipants: 12,
              currentParticipants: 4,
              level: 'beginner'
            },
            {
              id: 'demo4',
              title: 'Vinyasa Flow',
              type: 'Vinyasa',
              trainerId: 'demo-trainer-3',
              trainerName: 'Zeynep Kaya',
              dayOfWeek: 'tuesday',
              startTime: '19:00',
              endTime: '20:30',
              duration: 90,
              maxParticipants: 15,
              currentParticipants: 15,
              level: 'advanced'
            }
          ],
          wednesday: [
            {
              id: 'demo5',
              title: 'Yin Yoga',
              type: 'Yin Yoga',
              trainerId: 'demo-trainer-3',
              trainerName: 'Zeynep Kaya',
              dayOfWeek: 'wednesday',
              startTime: '11:00',
              endTime: '12:00',
              duration: 60,
              maxParticipants: 10,
              currentParticipants: 3,
              level: 'all'
            }
          ],
          thursday: [
            {
              id: 'demo6',
              title: 'Strength Training',
              type: 'Strength Training',
              trainerId: 'demo-trainer-2',
              trainerName: 'Mehmet Demir',
              dayOfWeek: 'thursday',
              startTime: '17:00',
              endTime: '18:00',
              duration: 60,
              maxParticipants: 10,
              currentParticipants: 7,
              level: 'intermediate'
            }
          ],
          friday: [
            {
              id: 'demo7',
              title: 'Pilates',
              type: 'Pilates',
              trainerId: 'demo-trainer-1',
              trainerName: 'Ayşe Yılmaz',
              dayOfWeek: 'friday',
              startTime: '09:30',
              endTime: '10:30',
              duration: 60,
              maxParticipants: 12,
              currentParticipants: 9,
              level: 'intermediate'
            }
          ],
          saturday: [
            {
              id: 'demo8',
              title: 'Meditation',
              type: 'Meditation',
              trainerId: 'demo-trainer-3',
              trainerName: 'Zeynep Kaya',
              dayOfWeek: 'saturday',
              startTime: '10:00',
              endTime: '10:45',
              duration: 45,
              maxParticipants: 20,
              currentParticipants: 11,
              level: 'all'
            }
          ],
          sunday: []
        });
        setTrainers([
          {
            id: 'demo-trainer-1',
            displayName: 'Ayşe Yılmaz',
            firstName: 'Ayşe',
            lastName: 'Yılmaz'
          },
          {
            id: 'demo-trainer-2',
            displayName: 'Mehmet Demir',
            firstName: 'Mehmet',
            lastName: 'Demir'
          },
          {
            id: 'demo-trainer-3',
            displayName: 'Zeynep Kaya',
            firstName: 'Zeynep',
            lastName: 'Kaya'
          }
        ]);
        setLoading(false);
        return;
      }

        // Calculate week date range for filtering
        const currentWeekDates = getWeekDates(currentWeek);
        const weekStart = new Date(currentWeekDates[0]);
        const weekEnd = new Date(currentWeekDates[6]);
        
        console.log('🔄 Refresh - Current week calculation:', {
          currentWeek: currentWeek.toDateString(),
          currentWeekDates: currentWeekDates.map(d => d.toDateString()),
          weekStart: weekStart.toDateString(),
          weekEnd: weekEnd.toDateString(),
          weekStartISO: weekStart.toISOString().split('T')[0],
          weekEndISO: weekEnd.toISOString().split('T')[0]
        });

      const [scheduleResult, trainersResult] = await Promise.all([
        scheduleService.getWeeklyScheduleByDateRange(weekStart, weekEnd),
        trainersService.getAllTrainers()
      ]);

      console.log('Refresh - Schedule result:', scheduleResult);
      console.log('Refresh - Trainers result:', trainersResult);

      if (scheduleResult.success) {
        console.log('🔄 Schedule refresh data received:', scheduleResult.schedule);
        
        // Log each day's lessons for debugging
        Object.keys(scheduleResult.schedule).forEach(day => {
          const dayLessons = scheduleResult.schedule[day] || [];
          console.log(`📅 ${day}: ${dayLessons.length} lessons`, dayLessons.map(l => ({
            id: l.id,
            title: l.title,
            dayOfWeek: l.dayOfWeek,
            startTime: l.startTime
          })));
        });
        
        setSchedule(scheduleResult.schedule || {
          monday: [], tuesday: [], wednesday: [], thursday: [], 
          friday: [], saturday: [], sunday: []
        });
      } else {
        console.warn('Schedule refresh failed, keeping current state');
        if (scheduleResult.error) {
          showNotification('Program yüklenirken hata oluştu: ' + scheduleResult.error, 'error');
        }
      }

      if (trainersResult.success) {
        setTrainers(trainersResult.trainers || []);
        if (trainersResult.warning) {
          showNotification(trainersResult.warning, 'warning');
        }
      } else {
        console.warn('Trainers refresh failed, keeping current state');
      }
    } catch (error) {
      console.error('Error loading schedule data:', error);
      showNotification('Veri yüklenirken beklenmeyen bir hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLesson = (dayOfWeek, timeSlot) => {
    setEditingLesson(null);
    
    // Calculate the specific date for this lesson
    const dayIndex = Object.keys(daysOfWeek).indexOf(dayOfWeek);
    const specificDate = weekDates[dayIndex];
    // Use local date string (YYYY-MM-DD) to avoid UTC timezone issues
    const scheduledDate = formatDateToLocalString(specificDate);
    
    console.log('📅 Creating lesson for specific date:', {
      dayOfWeek,
      dayIndex,
      specificDate: specificDate.toDateString(),
      scheduledDate
    });
    
    // Calculate end time based on 45 minute duration
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + 45;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const calculatedEndTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

    setLessonForm({
      title: '',
      type: '',
      trainerId: currentUser?.role === 'instructor' ? currentUser.uid : '',
      trainerName: currentUser?.role === 'instructor' ? currentUser.displayName : '',
      dayOfWeek: dayOfWeek,
      startTime: timeSlot,
      endTime: calculatedEndTime,
      duration: 45,
      maxParticipants: 12,
      currentParticipants: 0,
      description: '',
      level: 'beginner',
      price: 0,
      scheduledDate: scheduledDate,
      lessonType: 'group'
    });
    // No multi-week apply for edits; treat each edit individually
    setShowCreateModal(true);
  };

  const handleEditLesson = (lesson) => {
    console.log('📝 Starting to edit lesson:', {
      id: lesson.id,
      title: lesson.title,
      dayOfWeek: lesson.dayOfWeek,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      duration: lesson.duration,
      trainerId: lesson.trainerId
    });
    
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title || '',
      type: lesson.type || '',
      trainerId: lesson.trainerId || '',
      trainerName: lesson.trainerName || '',
      dayOfWeek: lesson.dayOfWeek || 'monday',
      startTime: lesson.startTime || '',
      endTime: lesson.endTime || '',
      duration: lesson.duration || 45,
      maxParticipants: lesson.maxParticipants || 12,
      currentParticipants: lesson.currentParticipants || 0,
      description: lesson.description || '',
      level: lesson.level || 'beginner',
      price: lesson.price || 0,
      scheduledDate: lesson.scheduledDate || null,
      lessonType: lesson.lessonType || 'group'
    });
    setShowCreateModal(true);
  };

  const handleFormChange = (field, value) => {
    setLessonForm(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate end time when start time or duration changes
      if (field === 'startTime' || field === 'duration') {
        if (updated.startTime && updated.duration) {
          const [hours, minutes] = updated.startTime.split(':').map(Number);
          const startMinutes = hours * 60 + minutes;
          const endMinutes = startMinutes + parseInt(updated.duration);
          const endHours = Math.floor(endMinutes / 60);
          const endMins = endMinutes % 60;
          updated.endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
        }
      }
      
      // Auto-calculate duration when end time changes
      if (field === 'endTime' && updated.startTime && updated.endTime) {
        const [startHours, startMinutes] = updated.startTime.split(':').map(Number);
        const [endHours, endMinutes] = updated.endTime.split(':').map(Number);
        const startTotalMinutes = startHours * 60 + startMinutes;
        const endTotalMinutes = endHours * 60 + endMinutes;
        if (endTotalMinutes > startTotalMinutes) {
          updated.duration = endTotalMinutes - startTotalMinutes;
        }
      }

      if (field === 'trainerId') {
        const selectedTrainer = trainers.find(t => t.id === value);
        updated.trainerName = selectedTrainer ? selectedTrainer.displayName : '';
      }

      return updated;
    });
  };

  const handleDeleteCriteriaChange = (field, value) => {
    setDeleteCriteria(prev => ({ ...prev, [field]: value }));
    setDeletePreview(null);
  };

  const computeDeletePreview = async () => {
    if (!deleteCriteria.dayOfWeek && !deleteCriteria.trainerId && !deleteCriteria.startTime && !deleteCriteria.duration) {
      showNotification('Lütfen en az bir koşul seçin (gün, saat, eğitmen veya süre).', 'warning');
      return null;
    }

    const result = await scheduleService.getAllLessons();
    if (!result.success) {
      showNotification('Dersler alınamadı, lütfen tekrar deneyin.', 'error');
      return null;
    }

    const matches = (result.lessons || []).filter((lesson) => {
      const dayMatch = !deleteCriteria.dayOfWeek || lesson.dayOfWeek === deleteCriteria.dayOfWeek;
      const trainerMatch = !deleteCriteria.trainerId || lesson.trainerId === deleteCriteria.trainerId;
      const startMatch = !deleteCriteria.startTime || lesson.startTime === deleteCriteria.startTime;
      const durationMatch = !deleteCriteria.duration || String(lesson.duration) === String(deleteCriteria.duration);
      return dayMatch && trainerMatch && startMatch && durationMatch;
    });

    setDeletePreview({
      count: matches.length,
      sample: matches.slice(0, 5).map((m) => `${daysOfWeek[m.dayOfWeek] || m.dayOfWeek} • ${m.startTime}-${m.endTime} • ${m.title}`),
    });

    return matches;
  };

  const handleDeleteLessons = async () => {
    try {
      setDeleteLoading(true);
      const matches = await computeDeletePreview();
      if (!matches || matches.length === 0) {
        setDeleteLoading(false);
        return;
      }

      for (const lesson of matches) {
        await scheduleService.deleteLesson(lesson.id);
      }

      showNotification(`${matches.length} ders silindi.`, 'success');
      setShowDeleteModal(false);
      setDeletePreview(null);
      loadScheduleData();
    } catch (error) {
      console.error('Error bulk deleting lessons:', error);
      showNotification('Dersler silinirken bir hata oluştu.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRecurringFormChange = (field, value) => {
    setRecurringForm(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate end time when start time or duration changes
      if (field === 'startTime' || field === 'duration') {
        if (updated.startTime && updated.duration) {
          const [hours, minutes] = updated.startTime.split(':').map(Number);
          const startMinutes = hours * 60 + minutes;
          const endMinutes = startMinutes + parseInt(updated.duration);
          const endHours = Math.floor(endMinutes / 60);
          const endMins = endMinutes % 60;
          updated.endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
        }
      }
      
      // Auto-calculate end date when start date or repeat weeks changes
      if (field === 'startDate' || field === 'repeatWeeks') {
        if (updated.startDate && updated.repeatWeeks) {
          const startDate = new Date(updated.startDate);
          const endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + (updated.repeatWeeks * 7) - 1);
          updated.endDate = endDate.toISOString().split('T')[0];
        }
      }

      if (field === 'trainerId') {
        const selectedTrainer = trainers.find(t => t.id === value);
        updated.trainerName = selectedTrainer ? selectedTrainer.displayName : '';
      }

      // Handle day selection
      if (field === 'selectedDays') {
        updated.selectedDays = value;
      }

      return updated;
    });
  };

  const closeLessonModal = () => {
    setShowCreateModal(false);
    setEditingLesson(null);
  };

  const handleDayToggle = (day) => {
    setRecurringForm(prev => ({
      ...prev,
      selectedDays: prev.selectedDays.includes(day)
        ? prev.selectedDays.filter(d => d !== day)
        : [...prev.selectedDays, day]
    }));
  };

  const generateRecurringLessons = () => {
    const lessons = [];
    const startDate = new Date(recurringForm.startDate);
    const weeksToGenerate = recurringForm.repeatWeeks || 4;
    
    console.log('🔄 Generating recurring lessons:', {
      startDate: startDate.toDateString(),
      selectedDays: recurringForm.selectedDays,
      weeksToGenerate
    });
    
    // For each week
    for (let week = 0; week < weeksToGenerate; week++) {
      // For each selected day of the week
      for (const dayOfWeek of recurringForm.selectedDays) {
        // Calculate the date for this specific day and week
        const dayIndex = Object.keys(daysOfWeek).indexOf(dayOfWeek); // 0=Monday, 1=Tuesday, etc.
        
        // Find Monday of the start week
        const startWeekDay = startDate.getDay(); // 0=Sunday, 1=Monday, etc.
        
        // Get the Monday of the week that contains the start date
        const mondayOfStartWeek = new Date(startDate);
        if (startWeekDay === 0) { // Sunday
          mondayOfStartWeek.setDate(startDate.getDate() + 1); // Next day is Monday
        } else if (startWeekDay === 1) { // Monday
          // Already Monday, no change needed
        } else {
          // Tuesday to Saturday - go back to Monday
          mondayOfStartWeek.setDate(startDate.getDate() - (startWeekDay - 1));
        }
        
        // Calculate the exact date for this lesson
        const lessonDate = new Date(mondayOfStartWeek);
        lessonDate.setDate(mondayOfStartWeek.getDate() + (week * 7) + dayIndex);
        
        console.log('📅 Calculated lesson date:', {
          week,
          dayOfWeek,
          dayIndex,
          startDate: startDate.toDateString(),
          startWeekDay,
          mondayOfStartWeek: mondayOfStartWeek.toDateString(),
          lessonDate: lessonDate.toDateString(),
          lessonDateISO: lessonDate.toISOString()
        });
        
        // Create lesson data
        const lessonData = {
          title: recurringForm.title,
          type: recurringForm.type,
          trainerId: recurringForm.trainerId,
          trainerName: recurringForm.trainerName,
          dayOfWeek: dayOfWeek,
          startTime: recurringForm.startTime,
          endTime: recurringForm.endTime,
          duration: recurringForm.duration,
          maxParticipants: recurringForm.maxParticipants,
          currentParticipants: 0, // Always start at 0 for new classes
          description: recurringForm.description,
          level: recurringForm.level,
          // Use local date string (YYYY-MM-DD) to avoid UTC timezone issues
          scheduledDate: formatDateToLocalString(lessonDate),
          isRecurring: true,
          recurringSeriesId: `series_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          weekNumber: week + 1,
          totalWeeks: weeksToGenerate,
          lessonType: recurringForm.lessonType || 'group'
        };
        lessons.push(lessonData);
      }
    }
    
    console.log('✅ Generated lessons:', lessons.length);
    return lessons;
  };

  const handleOpenRecurringModal = () => {
    const today = new Date();
    const endDateCalc = new Date(today);
    endDateCalc.setDate(today.getDate() + (4 * 7) - 1); // 4 weeks minus 1 day
    
    setRecurringForm({
      title: '',
      type: '',
      trainerId: currentUser?.role === 'instructor' ? currentUser.uid : '',
      trainerName: currentUser?.role === 'instructor' ? currentUser.displayName : '',
      selectedDays: [],
      startTime: '',
      endTime: '',
      duration: 60,
      maxParticipants: 12,
      description: '',
      level: 'beginner',
      startDate: today.toISOString().split('T')[0],
      endDate: endDateCalc.toISOString().split('T')[0],
      repeatWeeks: 4,
      lessonType: 'group'
    });
    setShowRecurringModal(true);
  };

  const handleSaveRecurringLessons = async () => {
    try {
      // Check if Firebase is configured
      if (!import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID === 'placeholder-project') {
        showNotification('Demo modunda ders düzenleme özelliği kullanılamaz. Firebase yapılandırması gerekli.', 'info');
        setShowRecurringModal(false);
        return;
      }

      if (!recurringForm.title || !recurringForm.type || !recurringForm.trainerId || 
          !recurringForm.startTime || !recurringForm.endTime || recurringForm.selectedDays.length === 0) {
        showNotification('Lütfen tüm zorunlu alanları doldurun ve en az bir gün seçin.', 'error');
        return;
      }

      if (!recurringForm.startDate) {
        showNotification('Lütfen başlangıç tarihini seçin.', 'error');
        return;
      }

      const lessonsToCreate = generateRecurringLessons();
      
      console.log('📅 Lessons to create:', lessonsToCreate.length);
      console.log('📋 Selected days:', recurringForm.selectedDays);
      console.log('🔢 Weeks to repeat:', recurringForm.repeatWeeks);
      console.log('📆 Start date:', recurringForm.startDate);
      console.log('📆 End date:', recurringForm.endDate);
      
      if (lessonsToCreate.length === 0) {
        showNotification('Belirtilen ayarlarda oluşturulacak ders bulunamadı.', 'error');
        return;
      }

      // Show confirmation to user
      const totalLessons = lessonsToCreate.length;
      const daysCount = recurringForm.selectedDays.length;
      const weeksCount = recurringForm.repeatWeeks;
      
      if (!window.confirm(
        `${totalLessons} ders oluşturulacak (${daysCount} gün × ${weeksCount} hafta = ${totalLessons} ders).\n\nDevam etmek istiyor musunuz?`
      )) {
        return;
      }

      // Create all lessons using bulk creation
      const bulkResult = await scheduleService.createBulkLessons(lessonsToCreate);
      
      if (bulkResult.success) {
        const { successCount, failCount } = bulkResult;
        if (successCount > 0) {
          showNotification(
            `${successCount} ders başarıyla oluşturuldu${failCount > 0 ? `, ${failCount} ders oluşturulamadı` : ''}.`, 
            failCount > 0 ? 'warning' : 'success'
          );
          setShowRecurringModal(false);
          loadScheduleData();
        } else {
          showNotification('Hiçbir ders oluşturulamadı. Lütfen tekrar deneyin.', 'error');
        }
      } else {
        showNotification('Toplu ders oluşturma işlemi başarısız oldu.', 'error');
      }
    } catch (error) {
      console.error('Error creating recurring lessons:', error);
      showNotification('Beklenmeyen bir hata oluştu.', 'error');
    }
  };

  const handleSaveLesson = async () => {
    try {
      // Check if Firebase is configured
      if (!import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID === 'placeholder-project') {
        showNotification('Demo modunda ders düzenleme özelliği kullanılamaz. Firebase yapılandırması gerekli.', 'info');
        setShowCreateModal(false);
        return;
      }

      if (!lessonForm.title || !lessonForm.type || !lessonForm.trainerId || 
          !lessonForm.startTime || !lessonForm.endTime) {
        showNotification('Lütfen tüm zorunlu alanları doldurun.', 'error');
        return;
      }

      // Only check for conflicts if we're changing time-related fields or trainer
      let shouldCheckConflict = false;
      
      if (editingLesson) {
        // For editing: check conflict only if time, day, or trainer changed
        const timeChanged = (
          lessonForm.startTime !== editingLesson.startTime ||
          lessonForm.endTime !== editingLesson.endTime ||
          lessonForm.duration !== editingLesson.duration
        );
        
        const dayChanged = lessonForm.dayOfWeek !== editingLesson.dayOfWeek;
        const trainerChanged = lessonForm.trainerId !== editingLesson.trainerId;
        
        // Special case: if only extending duration (same start time, later end time, same day, same trainer)
        const isOnlyExtending = (
          lessonForm.startTime === editingLesson.startTime &&
          lessonForm.endTime > editingLesson.endTime &&
          lessonForm.dayOfWeek === editingLesson.dayOfWeek &&
          lessonForm.trainerId === editingLesson.trainerId
        );
        
        shouldCheckConflict = timeChanged || dayChanged || trainerChanged;
        
        console.log('🔍 Edit conflict check decision:', {
          timeChanged,
          dayChanged,
          trainerChanged,
          isOnlyExtending,
          shouldCheckConflict,
          oldTime: `${editingLesson.startTime}-${editingLesson.endTime}`,
          newTime: `${lessonForm.startTime}-${lessonForm.endTime}`,
          oldDay: editingLesson.dayOfWeek,
          newDay: lessonForm.dayOfWeek,
          oldTrainer: editingLesson.trainerId,
          newTrainer: lessonForm.trainerId
        });
        
        // If we're only extending, use special conflict check logic
        if (isOnlyExtending) {
          console.log('🔍 This is a duration extension only - using extended conflict check');
        }
      } else {
        // For new lessons: always check conflict
        shouldCheckConflict = true;
        console.log('🔍 New lesson - checking conflict');
      }

      if (shouldCheckConflict) {
        console.log('🔍 Checking for time conflicts...');
        console.log('🔍 Conflict check parameters:', {
          trainerId: lessonForm.trainerId,
          dayOfWeek: lessonForm.dayOfWeek,
          startTime: lessonForm.startTime,
          endTime: lessonForm.endTime,
          excludeLessonId: editingLesson?.id,
          editingLessonExists: !!editingLesson,
          editingLessonData: editingLesson ? {
            id: editingLesson.id,
            title: editingLesson.title,
            startTime: editingLesson.startTime,
            endTime: editingLesson.endTime
          } : null
        });
        
        let conflictCheck;
        
        // Special case: if only extending duration, use the extension conflict check
        if (editingLesson && 
            lessonForm.startTime === editingLesson.startTime &&
            lessonForm.endTime > editingLesson.endTime &&
            lessonForm.dayOfWeek === editingLesson.dayOfWeek &&
            lessonForm.trainerId === editingLesson.trainerId) {
          
          console.log('🔍 Using extension-specific conflict check');
          conflictCheck = await scheduleService.checkLessonExtensionConflict(
            editingLesson.id,
            lessonForm.endTime
          );
        } else {
          console.log('🔍 Using regular conflict check');
          conflictCheck = await scheduleService.checkTimeConflict(
            lessonForm.trainerId,
            lessonForm.dayOfWeek,
            lessonForm.startTime,
            lessonForm.endTime,
            editingLesson?.id,
            lessonForm.scheduledDate
          );
        }

        if (!conflictCheck.success) {
          showNotification(conflictCheck.error, 'error');
          return;
        }
      } else {
        console.log('ℹ️ Skipping conflict check - only non-time fields changed');
      }

      let result;
      if (editingLesson) {
        console.log('📝 Updating lesson:', editingLesson.id);
        result = await scheduleService.updateLesson(editingLesson.id, lessonForm);
      } else {
        console.log('➕ Creating new lesson');
        const lessonData = { ...lessonForm };
        result = await scheduleService.createLesson(lessonData);
      }

      if (result.success) {
        showNotification(
          editingLesson ? 'Ders başarıyla güncellendi.' : 'Ders başarıyla oluşturuldu.',
          'success'
        );
        closeLessonModal();
        loadScheduleData();
      } else {
        showNotification(result.error, 'error');
      }
    } catch (error) {
      console.error('Error saving lesson:', error);
      showNotification('Beklenmeyen bir hata oluştu.', 'error');
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    // Check if Firebase is configured
    if (!import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID === 'placeholder-project') {
      showNotification('Demo modunda ders silme özelliği kullanılamaz. Firebase yapılandırması gerekli.', 'info');
      return;
    }

    if (window.confirm('Bu dersi silmek istediğinizden emin misiniz?')) {
      try {
        const result = await scheduleService.deleteLesson(lessonId);
        if (result.success) {
          showNotification('Ders başarıyla silindi.', 'success');
          loadScheduleData();
        } else {
          showNotification(result.error, 'error');
        }
      } catch (error) {
        console.error('Error deleting lesson:', error);
        showNotification('Beklenmeyen bir hata oluştu.', 'error');
      }
    }
  };

  const handleShowLessonDetail = async (lesson) => {
    setSelectedLessonForDetail(lesson);
    setShowLessonDetail(true);
    setParticipantDetails({}); // Clear previous details
    
    // Fetch participant details if lesson has participants
    if (Array.isArray(lesson.participants) && lesson.participants.length > 0) {
      setLoadingParticipants(true);
      await fetchParticipantDetails(lesson.participants);
      setLoadingParticipants(false);
    }
  };

  // Fetch participant details (names) by IDs
  const fetchParticipantDetails = async (participantIds) => {
    try {
      console.log('🔄 Fetching participant details for IDs:', participantIds);
      
      const details = {};
      
      for (const participantId of participantIds) {
        try {
          console.log('🔍 Processing participant ID:', participantId);
          
          // Use the improved memberService.getMemberById method
          const memberResult = await memberService.getMemberById(participantId);
          console.log('📊 Member lookup result:', memberResult);
          
          if (memberResult && memberResult.success && memberResult.data) {
            const memberData = memberResult.data;
            const firstName = memberData.firstName || memberData.displayName?.split(' ')[0] || 'Adı';
            const lastName = memberData.lastName || memberData.displayName?.split(' ')[1] || 'Soyadı';
            
            details[participantId] = {
              name: `${firstName} ${lastName}`.trim(),
              email: memberData.email || 'Email bilgisi yok',
              phone: memberData.phone || 'Telefon bilgisi yok',
              membershipType: memberData.membershipType || 'basic',
              status: memberData.status || 'unknown'
            };
            console.log('✅ Successfully processed member:', details[participantId]);
          } else {
            console.log('❌ Member lookup failed for:', participantId);
            details[participantId] = {
              name: 'Bilinmeyen katılımcı',
              email: 'Üye bulunamadı',
              phone: '—'
            };
          }
        } catch (error) {
          console.error('💥 Exception while fetching member:', participantId, error);
          details[participantId] = {
            name: 'Bilinmeyen katılımcı',
            email: 'Veri getirme hatası',
            phone: '—'
          };
        }
      }
      
      console.log('📋 Final participant details object:', details);
      setParticipantDetails(details);
    } catch (error) {
      console.error('💥 Error in fetchParticipantDetails:', error);
      showNotification('Katılımcı bilgileri yüklenirken hata oluştu', 'error');
    }
  };

  // Remove participant from lesson
  const handleRemoveParticipant = async (participantId) => {
    if (!selectedLessonForDetail) return;

    if (window.confirm('Bu katılımcıyı dersten çıkarmak istediğinizden emin misiniz?')) {
      try {
        const result = await scheduleService.removeParticipantFromLesson(
          selectedLessonForDetail.id, 
          participantId
        );
        
        if (result.success) {
          showNotification('Katılımcı dersten çıkarıldı! 🎉', 'success');
          
          // Update the selected lesson data
          const updatedParticipants = selectedLessonForDetail.participants.filter(
            id => id !== participantId
          );
          setSelectedLessonForDetail({
            ...selectedLessonForDetail,
            participants: updatedParticipants,
            currentParticipants: updatedParticipants.length
          });
          
          // Remove from participant details
          const updatedDetails = { ...participantDetails };
          delete updatedDetails[participantId];
          setParticipantDetails(updatedDetails);
          
          // Refresh the main schedule
          loadScheduleData();
        } else {
          showNotification(result.error || 'Katılımcı çıkarılırken hata oluştu', 'error');
        }
      } catch (error) {
        console.error('Error removing participant:', error);
        showNotification('Katılımcı çıkarılırken hata oluştu', 'error');
      }
    }
  };

  // Close lesson detail modal with cleanup
  const closeLessonDetailModal = () => {
    setShowLessonDetail(false);
    setSelectedLessonForDetail(null);
    setParticipantDetails({}); // Clear participant details
    setLoadingParticipants(false); // Clear loading state
  };

  // Load students for adding to lesson
  const loadStudentsForLesson = async (lesson) => {
    if (!lesson) return;
    
    setSelectedLessonForStudents(lesson);
    setLoadingStudents(true);
    setShowAddStudentModal(true);
    
    try {
      const result = await scheduleService.getAllStudents();
      if (result.success) {
        setAllStudents(result.students || []);
      } else {
        alert('Öğrenciler yüklenirken hata oluştu: ' + (result.error || 'Bilinmeyen hata'));
      }
    } catch (error) {
      console.error('Error loading students:', error);
      alert('Öğrenciler yüklenirken hata oluştu');
    } finally {
      setLoadingStudents(false);
    }
  };

  // Add student to lesson
  const handleAddStudentToLesson = async (studentId) => {
    if (!selectedLessonForStudents || !currentUser?.uid) return;
    
    try {
      const result = await scheduleService.addStudentToLesson(
        selectedLessonForStudents.id,
        studentId,
        currentUser.uid
      );
      
      if (result.success) {
        const creditsMessage = result.remainingCredits !== undefined 
          ? `Öğrenci başarıyla eklendi. Kalan ders: ${result.remainingCredits}` 
          : 'Öğrenci başarıyla eklendi';
        alert(creditsMessage);
        
        // Update the lesson locally to reflect the change immediately
        const updatedLesson = {
          ...selectedLessonForStudents,
          participants: [...(selectedLessonForStudents.participants || []), studentId]
        };
        setSelectedLessonForStudents(updatedLesson);
        
        // If lesson detail modal is open, update it too
        if (selectedLessonForDetail && selectedLessonForDetail.id === selectedLessonForStudents.id) {
          setSelectedLessonForDetail(updatedLesson);
        }
        
        // Refresh the schedule to show updated participant count (without closing modal)
        await loadScheduleData();
      } else {
        alert('Öğrenci eklenirken hata oluştu: ' + (result.error || 'Bilinmeyen hata'));
      }
    } catch (error) {
      console.error('Error adding student:', error);
      alert('Öğrenci eklenirken hata oluştu');
    }
  };

  // Remove student from lesson
  const handleRemoveStudentFromLesson = async (studentId) => {
    if (!selectedLessonForStudents || !currentUser?.uid) return;
    
    if (!window.confirm('Bu öğrenciyi dersten çıkarmak istediğinize emin misiniz?')) {
      return;
    }
    
    try {
      const result = await scheduleService.removeStudentFromLesson(
        selectedLessonForStudents.id,
        studentId,
        currentUser.uid
      );
      
      if (result.success) {
        alert('Öğrenci başarıyla çıkarıldı');
        
        // Update the lesson locally to reflect the change immediately
        const updatedLesson = {
          ...selectedLessonForStudents,
          participants: (selectedLessonForStudents.participants || []).filter(id => id !== studentId)
        };
        setSelectedLessonForStudents(updatedLesson);
        
        // If lesson detail modal is open, update it too
        if (selectedLessonForDetail && selectedLessonForDetail.id === selectedLessonForStudents.id) {
          setSelectedLessonForDetail(updatedLesson);
        }
        
        // Refresh the schedule to show updated participant count (without closing modal)
        await loadScheduleData();
      } else {
        alert('Öğrenci çıkarılırken hata oluştu: ' + (result.error || 'Bilinmeyen hata'));
      }
    } catch (error) {
      console.error('Error removing student:', error);
      alert('Öğrenci çıkarılırken hata oluştu');
    }
  };

  // Close add student modal
  const closeAddStudentModal = () => {
    setShowAddStudentModal(false);
    setSelectedLessonForStudents(null);
    setAllStudents([]);
    setStudentSearchTerm('');
  };

  // Test function to debug member fetching
  const testMemberFetch = async (memberId) => {
    console.log('🧪 Testing member fetch for ID:', memberId);
    try {
      const result = await memberService.getMemberById(memberId);
      console.log('🧪 Test result:', result);
      
      // Also test if memberService methods are working
      console.log('🧪 MemberService methods:', Object.getOwnPropertyNames(memberService));
      
      return result;
    } catch (error) {
      console.error('🧪 Test failed:', error);
      return { success: false, error: error.message };
    }
  };

  // Debug function to list all members (for testing)
  const debugListAllMembers = async () => {
    try {
      console.log('🔍 Fetching all members for debugging...');
      
      // We'll use memberService if it has a getAll method, otherwise direct Firebase query
      if (memberService.getAllMembers) {
        const result = await memberService.getAllMembers();
        console.log('📝 All members from service:', result);
        return result;
      } else {
        // Direct Firebase query
        const { collection, getDocs } = await import('firebase/firestore');
        const { db } = await import('../../config/firebase');
        
        const membersSnapshot = await getDocs(collection(db, 'members'));
        const members = [];
        membersSnapshot.forEach((doc) => {
          members.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        console.log('📝 All members (direct query):', members);
        console.log('📝 Member IDs:', members.map(m => m.id));
        
        return { success: true, data: members };
      }
    } catch (error) {
      console.error('🔍 Debug list members failed:', error);
      return { success: false, error: error.message };
    }
  };

  // Add test functions to window for debugging in browser console
  if (typeof window !== 'undefined') {
    window.testMemberFetch = testMemberFetch;
    window.debugListAllMembers = debugListAllMembers;
    window.memberService = memberService;
  }

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Helper function to get participant count from either field or array
  const getParticipantCount = (lesson) => {
    // If participants is an array, return its length
    if (Array.isArray(lesson.participants)) {
      return lesson.participants.length;
    }
    // Otherwise use currentParticipants field
    return lesson.currentParticipants || 0;
  };

  const getLessonColor = (type) => {
    const colors = {
      'Pilates': 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)',
      'Yoga': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      'Reformer': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      'Mat Pilates': 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
      'Yoga Flow': 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
      'Yin Yoga': 'linear-gradient(135deg, #84CC16 0%, #65A30D 100%)',
      'Vinyasa': 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
      'Hatha Yoga': 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
      'Strength Training': 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      'Cardio': 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
      'Stretching': 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
      'Meditation': 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)'
    };
    return colors[type] || 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)';
  };

  const canEditLesson = (lesson) => {
    return currentUser?.role === 'admin' || 
           (currentUser?.role === 'instructor' && lesson.trainerId === currentUser.uid);
  };

  // Check if lesson is in the past
  const isLessonInPast = (lesson) => {
    if (!lesson.scheduledDate || !lesson.startTime) return false;
    
    const now = new Date();
    // Use parseDateAsLocal to handle date-only strings correctly
    let lessonDate = parseDateAsLocal(lesson.scheduledDate);
    if (!lessonDate) return false;
    
    // Parse and set the time (format: "HH:MM")
    const [hours, minutes] = lesson.startTime.split(':').map(Number);
    lessonDate.setHours(hours, minutes, 0, 0);
    
    return lessonDate < now;
  };

  // New function to get ALL lessons at a specific time slot
  const getAllLessonsAtTime = (dayOfWeek, timeSlot) => {
    const dayLessons = schedule[dayOfWeek] || [];
    
    // Get the current week dates
    const currentWeekDates = getWeekDates(currentWeek);
    const dayIndex = Object.keys(daysOfWeek).indexOf(dayOfWeek);
    const currentDayDate = currentWeekDates[dayIndex];
    
    // Filter lessons to only show those for the current week
    const currentWeekLessons = dayLessons.filter(lesson => {
      // If lesson has scheduledDate, check if it matches the current week
      if (lesson.scheduledDate) {
        // Use parseDateAsLocal to handle date-only strings correctly
        const lessonDate = parseDateAsLocal(lesson.scheduledDate);
        const currentDate = new Date(currentDayDate);
        
        // Compare dates (ignore time)
        return lessonDate && lessonDate.toDateString() === currentDate.toDateString();
      }
      
      // For legacy lessons without scheduledDate, show them in all weeks
      return true;
    });
    
    // Return all lessons that cover this time slot
    return currentWeekLessons.filter(lesson => {
      const lessonStart = lesson.startTime;
      const lessonEnd = lesson.endTime;
      return timeSlot >= lessonStart && timeSlot < lessonEnd;
    });
  };

  // Helper function to check if two lessons overlap
  const doLessonsOverlap = (lesson1, lesson2) => {
    return lesson1.startTime < lesson2.endTime && lesson2.startTime < lesson1.endTime;
  };

  // Get all overlapping lessons for a specific lesson
  const getOverlappingLessons = (dayOfWeek, targetLesson) => {
    const dayLessons = schedule[dayOfWeek] || [];

    // Get the current week dates
    const currentWeekDates = getWeekDates(currentWeek);
    const dayIndex = Object.keys(daysOfWeek).indexOf(dayOfWeek);
    const currentDayDate = currentWeekDates[dayIndex];

    // Filter lessons to only show those for the current week
    const currentWeekLessons = dayLessons.filter(lesson => {
      if (lesson.scheduledDate) {
        // Use parseDateAsLocal to handle date-only strings correctly
        const lessonDate = parseDateAsLocal(lesson.scheduledDate);
        const currentDate = new Date(currentDayDate);
        return lessonDate && lessonDate.toDateString() === currentDate.toDateString();
      }
      return true;
    });

    // Find all lessons that overlap with the target lesson
    return currentWeekLessons.filter(lesson =>
      doLessonsOverlap(lesson, targetLesson)
    );
  };

  // Check if this is the first time slot where any of the lessons start
  const getLessonsStartingAtTime = (dayOfWeek, timeSlot) => {
    const allLessons = getAllLessonsAtTime(dayOfWeek, timeSlot);
    return allLessons.filter(lesson => lesson.startTime === timeSlot);
  };

  // Get all lessons that should be displayed at this time slot (including overlapping ones)
  const getLessonsToDisplayAtTime = (dayOfWeek, timeSlot) => {
    const lessonsStartingHere = getLessonsStartingAtTime(dayOfWeek, timeSlot);

    if (lessonsStartingHere.length === 0) {
      return [];
    }

    // For each lesson starting here, find all overlapping lessons
    const allOverlappingLessons = new Set();
    lessonsStartingHere.forEach(lesson => {
      const overlapping = getOverlappingLessons(dayOfWeek, lesson);
      overlapping.forEach(l => allOverlappingLessons.add(l));
    });

    // Convert Set back to array
    const overlappingArray = Array.from(allOverlappingLessons);

    // Only show this group if this is the earliest start time among all overlapping lessons
    const earliestStartTime = overlappingArray.reduce((earliest, lesson) => {
      return lesson.startTime < earliest ? lesson.startTime : earliest;
    }, overlappingArray[0]?.startTime || timeSlot);

    if (timeSlot === earliestStartTime) {
      return overlappingArray.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    return [];
  };

  const calculateLessonHeight = (lesson) => {
    if (!lesson.startTime || !lesson.endTime) return 1;
    const [startHour, startMin] = lesson.startTime.split(':').map(Number);
    const [endHour, endMin] = lesson.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const durationMinutes = endMinutes - startMinutes;
    // Changed from 30 to 15 to match the time slot interval
    return Math.max(1, Math.ceil(durationMinutes / 15));
  };

  // Calculate the top offset for a lesson relative to the earliest lesson in the group
  const calculateLessonTopOffset = (lesson, earliestStartTime) => {
    const [lessonHour, lessonMin] = lesson.startTime.split(':').map(Number);
    const [earliestHour, earliestMin] = earliestStartTime.split(':').map(Number);

    const lessonMinutes = lessonHour * 60 + lessonMin;
    const earliestMinutes = earliestHour * 60 + earliestMin;

    const offsetMinutes = lessonMinutes - earliestMinutes;
    // Each 15-minute slot is 70px tall
    return (offsetMinutes / 15) * 70;
  };

  const navigateWeek = (direction) => {
    isNavigatingRef.current = true; // Prevent data reload
    
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + (direction * 7));
    setCurrentWeek(newWeek);
  };

  const formatWeekRange = () => {
    const start = weekDates[0];
    const end = weekDates[6];
    const startStr = `${start.getDate().toString().padStart(2, '0')}/${(start.getMonth() + 1).toString().padStart(2, '0')}`;
    const endStr = `${end.getDate().toString().padStart(2, '0')}/${(end.getMonth() + 1).toString().padStart(2, '0')}`;
    return `${startStr} - ${endStr} ${start.getFullYear()}`;
  };

  if (loading) {
    return (
      <div className="schedule">
        <div className="loading-container">
          <div className="loading-header">
            <div className="loading-logo">
              <div className="pulse-circle"></div>
              <h2>Zenith Studio</h2>
            </div>
            <div className="loading-progress">
              <div className="progress-bar">
                <div className="progress-fill"></div>
              </div>
              <p>Program yükleniyor...</p>
            </div>
          </div>
          
          <div className="schedule-skeleton">
            <div className="skeleton-header">
              <div className="skeleton-nav">
                <div className="skeleton-button"></div>
                <div className="skeleton-title"></div>
                <div className="skeleton-button"></div>
              </div>
            </div>
            
            <div className="skeleton-calendar">
              <div className="skeleton-time-column">
                {Array(12).fill(0).map((_, i) => (
                  <div key={i} className="skeleton-time-slot"></div>
                ))}
              </div>
              
              {Array(7).fill(0).map((_, dayIndex) => (
                <div key={dayIndex} className="skeleton-day-column">
                  <div className="skeleton-day-header"></div>
                  {Array(12).fill(0).map((_, timeIndex) => (
                    <div key={timeIndex} className="skeleton-time-cell">
                      {Math.random() > 0.7 && (
                        <div className="skeleton-lesson"></div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            
            <div className="loading-tips">
              <div className="tip-animation">
                <div className="tip-icon">💡</div>
                <div className="tip-text">
                  <span>İpucu: Takvimde boş bir alana tıklayarak hızlıca ders ekleyebilirsiniz</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="schedule">
      {/* Demo Mode Banner */}
      {(!import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID === 'placeholder-project') && (
        <div className="demo-banner">
          <div className="demo-content">
            <span className="demo-icon">🚀</span>
            <div className="demo-text">
              <strong>Demo Modu</strong>
              <p>Firebase yapılandırması yapılmamış. Örnek veriler gösteriliyor.</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="schedule-header">
        <div className="schedule-title-section">
          <h1>Ders Programı</h1>
          <p>Haftalık ders programını görüntüleyin ve yönetin</p>
        </div>
        
        <div className="schedule-actions">
          <button 
            className="btn btn-primary" 
            onClick={handleOpenRecurringModal}
            style={{ marginRight: '12px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Sınıf Ekle
          </button>
          <button 
            className="btn btn-danger" 
            onClick={() => {
              setDeleteCriteria({ dayOfWeek: '', trainerId: '', startTime: '', duration: '' });
              setDeletePreview(null);
              setShowDeleteModal(true);
            }}
            style={{ marginRight: '12px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18"/>
              <path d="M8 6V4h8v2"/>
              <path d="M10 11v6"/>
              <path d="M14 11v6"/>
            </svg>
            Ders Sil
          </button>
          <button className="btn btn-secondary" onClick={loadScheduleData}>
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

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon" style={{ background: 'var(--sage-green)', color: 'white' }}>
              📅
            </div>
            <div className={`stat-trend ${calculatePercentageChange(
              Object.values(schedule).reduce((total, dayLessons) => total + dayLessons.length, 0),
              previousWeekData.totalLessons
            ) >= 0 ? 'up' : 'down'}`}>
              {calculatePercentageChange(
                Object.values(schedule).reduce((total, dayLessons) => total + dayLessons.length, 0),
                previousWeekData.totalLessons
              ) >= 0 ? '+' : ''}{calculatePercentageChange(
                Object.values(schedule).reduce((total, dayLessons) => total + dayLessons.length, 0),
                previousWeekData.totalLessons
              )}%
            </div>
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {Object.values(schedule).reduce((total, dayLessons) => total + dayLessons.length, 0)}
            </div>
            <div className="stat-title">Bu Hafta Toplam Ders</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon" style={{ background: 'var(--accent-mint)', color: 'var(--sage-dark)' }}>
              👥
            </div>
            <div className={`stat-trend ${calculatePercentageChange(
              Object.values(schedule).reduce((total, dayLessons) => 
                total + dayLessons.reduce((dayTotal, lesson) => dayTotal + (lesson.maxParticipants || 0), 0), 0
              ),
              previousWeekData.totalCapacity
            ) >= 0 ? 'up' : 'down'}`}>
              {calculatePercentageChange(
                Object.values(schedule).reduce((total, dayLessons) => 
                  total + dayLessons.reduce((dayTotal, lesson) => dayTotal + (lesson.maxParticipants || 0), 0), 0
                ),
                previousWeekData.totalCapacity
              ) >= 0 ? '+' : ''}{calculatePercentageChange(
                Object.values(schedule).reduce((total, dayLessons) => 
                  total + dayLessons.reduce((dayTotal, lesson) => dayTotal + (lesson.maxParticipants || 0), 0), 0
                ),
                previousWeekData.totalCapacity
              )}%
            </div>
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {Object.values(schedule).reduce((total, dayLessons) => 
                total + dayLessons.reduce((dayTotal, lesson) => dayTotal + (lesson.maxParticipants || 0), 0), 0
              )}
            </div>
            <div className="stat-title">Toplam Kapasite</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon" style={{ background: 'var(--accent-terra)', color: 'white' }}>
              🏃‍♀️
            </div>
            <div className={`stat-trend ${calculatePercentageChange(trainers.length, previousWeekData.activeTrainers) >= 0 ? 'up' : 'down'}`}>
              {calculatePercentageChange(trainers.length, previousWeekData.activeTrainers) >= 0 ? '+' : ''}{calculatePercentageChange(trainers.length, previousWeekData.activeTrainers)}%
            </div>
          </div>
          <div className="stat-content">
            <div className="stat-value">{trainers.length}</div>
            <div className="stat-title">Aktif Eğitmen</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon" style={{ background: 'var(--accent-rose)', color: 'white' }}>
              ⭐
            </div>
            <div className={`stat-trend ${calculatePercentageChange(
              new Set(Object.values(schedule).flat().map(lesson => lesson.type)).size,
              previousWeekData.lessonTypes
            ) >= 0 ? 'up' : 'down'}`}>
              {calculatePercentageChange(
                new Set(Object.values(schedule).flat().map(lesson => lesson.type)).size,
                previousWeekData.lessonTypes
              ) >= 0 ? '+' : ''}{calculatePercentageChange(
                new Set(Object.values(schedule).flat().map(lesson => lesson.type)).size,
                previousWeekData.lessonTypes
              )}%
            </div>
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {new Set(Object.values(schedule).flat().map(lesson => lesson.type)).size}
            </div>
            <div className="stat-title">Farklı Ders Türü</div>
          </div>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="week-navigation">
        <button className="nav-button" onClick={() => navigateWeek(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
        </button>
        
        <div className="week-info">
          <h2>{formatWeekRange()}</h2>
          <button 
            className="today-button"
            onClick={() => {
              isNavigatingRef.current = true; // Prevent data reload
              setCurrentWeek(new Date());
            }}
          >
            Bugün
          </button>
        </div>
        
        <button className="nav-button" onClick={() => navigateWeek(1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9,18 15,12 9,6"/>
          </svg>
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-help" style={{
        background: 'var(--gray-50)',
        border: '1px solid var(--gray-200)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 16px',
        marginBottom: '16px',
        fontSize: '14px',
        color: 'var(--gray-600)'
      }}>
        <span style={{ fontWeight: '600', color: 'var(--gray-700)' }}>Nasıl ders oluşturulur:</span>
        <br />
        • <strong>"Sınıf Ekle"</strong> butonu: Tekrarlayan dersler için (haftalık program)
        <br />
        • <strong>Boş saat dilimini tıklayın:</strong> O saatte yeni bir ders oluşturmak için
        <br />
        • <strong>Aynı saatte birden fazla ders:</strong> Yan yana görüntülenir, sayı ile işaretlenir
      </div>
      <div className="calendar-container">
        <div className="calendar-wrapper">
          <div className="calendar-grid">
            {/* Header with days */}
            <div className="calendar-header">
            <div className="time-header">Saat</div>
            {Object.entries(daysOfWeek).map(([day, label], index) => {
              const date = weekDates[index];
              const isToday = new Date().toDateString() === date.toDateString();
              return (
                <div key={day} className={`day-header ${isToday ? 'today' : ''}`}>
                  <div className="day-label">{label}</div>
                  <div className="day-date">
                    {date.getDate().toString().padStart(2, '0')}/{(date.getMonth() + 1).toString().padStart(2, '0')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time slots and lessons */}
          <div className="calendar-body">
            {timeSlots.map((timeSlot) => (
              <div key={timeSlot} className="time-row">
                <div className="time-label">
                  {timeSlot}
                </div>
                {Object.keys(daysOfWeek).map((day) => {
                  const lessonsStartingHere = getLessonsToDisplayAtTime(day, timeSlot);

                  return (
                    <div
                      key={`${day}-${timeSlot}`}
                      className="time-cell"
                    >
                      {/* Add button to create new lesson at this time */}
                      {lessonsStartingHere.length > 0 && (
                        <button
                          onClick={() => handleCreateLesson(day, timeSlot)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            border: '2px solid var(--sage-green)',
                            background: 'white',
                            color: 'var(--sage-green)',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 100,
                            padding: 0,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = 'var(--sage-green)';
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.transform = 'scale(1.1)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.color = 'var(--sage-green)';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                          title="Add another lesson at this time"
                        >
                          +
                        </button>
                      )}
                      {lessonsStartingHere.length > 0 ? (
                        <div className="lessons-container">
                          {lessonsStartingHere.map((lesson, index) => {
                            // Calculate the earliest start time in the group
                            const earliestStartTime = lessonsStartingHere.length > 0
                              ? lessonsStartingHere.reduce((earliest, l) =>
                                  l.startTime < earliest ? l.startTime : earliest,
                                  lessonsStartingHere[0].startTime
                                )
                              : lesson.startTime;

                            // Calculate top offset for this lesson
                            const topOffset = calculateLessonTopOffset(lesson, earliestStartTime);

                            return (
                              <div
                                key={lesson.id}
                                className={`lesson-block ${lessonsStartingHere.length > 1 ? 'multiple-lessons' : ''}`}
                                style={{
                                  background: getLessonColor(lesson.type),
                                  height: `${calculateLessonHeight(lesson) * 70 - 6}px`,
                                  width: lessonsStartingHere.length > 1
                                    ? `calc(${100 / lessonsStartingHere.length}% - ${4 * (lessonsStartingHere.length - 1) / lessonsStartingHere.length}px)`
                                    : 'calc(100% - 12px)',
                                  left: lessonsStartingHere.length > 1
                                    ? `calc(${(index * 100) / lessonsStartingHere.length}% + ${index * 2}px)`
                                    : '6px',
                                  top: `${4 + topOffset}px`,
                                  right: lessonsStartingHere.length === 1 ? '6px' : 'auto',
                                  zIndex: 10 + index
                                }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShowLessonDetail(lesson);
                              }}
                            >
                              <div className="lesson-content">
                                <div className="lesson-header-row">
                                  <div className="lesson-title" title={lesson.title}>
                                    {lessonsStartingHere.length > 1 && lesson.title.length > 8
                                      ? lesson.title.substring(0, 8) + '...'
                                      : lesson.title}
                                  </div>
                                  {lesson.lessonType && (
                                    <span className={`lesson-type-badge-mini ${lesson.lessonType}`}>
                                      {lesson.lessonType === 'one-on-one' ? '👤' : '👥'}
                                    </span>
                                  )}
                                </div>
                                {lessonsStartingHere.length === 1 && (
                                  <div className="lesson-info">
                                    <span className="lesson-participants">
                                      👥 {getParticipantCount(lesson)}/{lesson.maxParticipants}
                                    </span>
                                    <span className="lesson-trainer">
                                      👨‍🏫 {lesson.trainerName?.split(' ')[0]}
                                    </span>
                                  </div>
                                )}
                                {lessonsStartingHere.length > 1 && (
                                  <div className="lesson-info-compact">
                                    <span className="lesson-time">
                                      {lesson.startTime}
                                    </span>
                                    <span className="lesson-participants-compact">
                                      👥 {getParticipantCount(lesson)}/{lesson.maxParticipants}
                                    </span>
                                  </div>
                                )}
                              </div>

                            </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div
                          onClick={() => handleCreateLesson(day, timeSlot)}
                          style={{ width: '100%', height: '100%', cursor: 'pointer' }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>

      {/* Create/Edit Lesson Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingLesson ? 'Ders Düzenle' : 'Ders Oluştur'}</h2>
              <button 
                className="modal-close"
                onClick={closeLessonModal}
              >
                ×
              </button>
            </div>
            
            <div className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Ders Adı *</label>
                  <input
                    type="text"
                    value={lessonForm.title}
                    onChange={(e) => handleFormChange('title', e.target.value)}
                    placeholder="Ders adını girin"
                  />
                </div>
                
                <div className="form-group">
                  <label>Ders Türü *</label>
                  <select
                    value={lessonForm.type}
                    onChange={(e) => handleFormChange('type', e.target.value)}
                  >
                    <option value="">Seçin</option>
                    {lessonTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Ders Tipi *</label>
                  <select
                    value={lessonForm.lessonType}
                    onChange={(e) => {
                      handleFormChange('lessonType', e.target.value);
                      // Auto-adjust max participants when selecting one-on-one
                      if (e.target.value === 'one-on-one') {
                        handleFormChange('maxParticipants', 1);
                      } else if (lessonForm.maxParticipants === 1) {
                        handleFormChange('maxParticipants', 12);
                      }
                    }}
                  >
                    <option value="group">👥 Grup Dersi</option>
                    <option value="one-on-one">👤 Bire Bir Ders</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Seviye</label>
                  <select
                    value={lessonForm.level}
                    onChange={(e) => handleFormChange('level', e.target.value)}
                  >
                    {Object.entries(levels).map(([level, label]) => (
                      <option key={level} value={level}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Eğitmen *</label>
                  <select
                    value={lessonForm.trainerId}
                    onChange={(e) => handleFormChange('trainerId', e.target.value)}
                    disabled={currentUser?.role === 'instructor'}
                  >
                    <option value="">Seçin</option>
                    {trainers.map(trainer => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.displayName}
                      </option>
                    ))}
                  </select>
                  <small style={{
                    display: 'block',
                    marginTop: '6px',
                    color: 'var(--sage-dark)',
                    fontSize: '12px',
                    fontWeight: '500',
                    lineHeight: '1.4'
                  }}>
                    💡 İpucu: Aynı saatte farklı eğitmenlerle birden fazla ders oluşturabilirsiniz
                  </small>
                </div>

                <div className="form-group">
                  <label>Gün *</label>
                  <select
                    value={lessonForm.dayOfWeek}
                    onChange={(e) => handleFormChange('dayOfWeek', e.target.value)}
                  >
                    {Object.entries(daysOfWeek).map(([day, label]) => (
                      <option key={day} value={day}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Başlangıç Saati *</label>
                  <select
                    value={lessonForm.startTime}
                    onChange={(e) => handleFormChange('startTime', e.target.value)}
                  >
                    <option value="">--:--</option>
                    {timeSlots.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Süre (dakika) *</label>
                  <select
                    value={lessonForm.duration}
                    onChange={(e) => handleFormChange('duration', parseInt(e.target.value))}
                  >
                    <option value={45}>45 dakika</option>
                    <option value={60}>60 dakika</option>
                    <option value={75}>75 dakika</option>
                    <option value={90}>90 dakika</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Bitiş Saati (Otomatik)</label>
                  <input
                    type="time"
                    value={lessonForm.endTime}
                    readOnly
                    className="readonly-input"
                    title="Bitiş saati başlangıç saati ve süreye göre otomatik hesaplanır"
                  />
                </div>
                
                <div className="form-group">
                  <label>Maksimum Katılımcı</label>
                  <input
                    type="number"
                    value={lessonForm.maxParticipants}
                    onChange={(e) => handleFormChange('maxParticipants', parseInt(e.target.value))}
                    min="1"
                    max="50"
                  />
                </div>
              </div>

              {editingLesson && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Mevcut Katılımcı Sayısı</label>
                    <input
                      type="number"
                      value={lessonForm.currentParticipants}
                      readOnly
                      className="readonly-input"
                      title="Bu değer öğrenci kayıtları ile otomatik güncellenir"
                    />
                    <small style={{ color: 'var(--gray-600)', fontSize: '12px' }}>
                      🔄 Otomatik güncellenen değer - Öğrenci uygulamasından kayıt olduğunda güncellenir
                    </small>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Açıklama</label>
                <textarea
                  value={lessonForm.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Ders hakkında detaylar..."
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={closeLessonModal}
                >
                  İptal
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleSaveLesson}
                >
                  {editingLesson ? 'Güncelle' : 'Oluştur'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recurring Lesson Modal */}
      {showRecurringModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Sınıf Ekle - Tekrarlanan Program</h2>
              <button 
                className="modal-close"
                onClick={() => setShowRecurringModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Sınıf Adı *</label>
                  <input
                    type="text"
                    value={recurringForm.title}
                    onChange={(e) => handleRecurringFormChange('title', e.target.value)}
                    placeholder="Sınıf adını girin"
                  />
                </div>
                
                <div className="form-group">
                  <label>Sınıf Türü *</label>
                  <select
                    value={recurringForm.type}
                    onChange={(e) => handleRecurringFormChange('type', e.target.value)}
                  >
                    <option value="">Tür seçin</option>
                    {lessonTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Eğitmen *</label>
                  <select
                    value={recurringForm.trainerId}
                    onChange={(e) => handleRecurringFormChange('trainerId', e.target.value)}
                    disabled={currentUser?.role === 'instructor'}
                  >
                    <option value="">Eğitmen seçin</option>
                    {trainers.map(trainer => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Ders Tipi *</label>
                  <select
                    value={recurringForm.lessonType}
                    onChange={(e) => {
                      handleRecurringFormChange('lessonType', e.target.value);
                      // Auto-adjust max participants when selecting one-on-one
                      if (e.target.value === 'one-on-one') {
                        handleRecurringFormChange('maxParticipants', 1);
                      } else if (recurringForm.maxParticipants === 1) {
                        handleRecurringFormChange('maxParticipants', 12);
                      }
                    }}
                  >
                    <option value="group">👥 Grup Dersi</option>
                    <option value="one-on-one">👤 Bire Bir Ders</option>
                  </select>
                </div>
              </div>

              <div className="recurring-section">
                <h3>Günleri Seçin</h3>
                <div className="days-selection">
                  {Object.entries(daysOfWeek).map(([day, label]) => (
                    <label key={day} className="day-checkbox">
                      <input
                        type="checkbox"
                        checked={recurringForm.selectedDays.includes(day)}
                        onChange={() => handleDayToggle(day)}
                      />
                      <span className="day-label">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Başlangıç Saati *</label>
                  <select
                    value={recurringForm.startTime}
                    onChange={(e) => handleRecurringFormChange('startTime', e.target.value)}
                  >
                    <option value="">--:--</option>
                    {timeSlots.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Süre (dakika) *</label>
                  <select
                    value={recurringForm.duration}
                    onChange={(e) => handleRecurringFormChange('duration', parseInt(e.target.value))}
                  >
                    <option value={30}>30 dakika</option>
                    <option value={45}>45 dakika</option>
                    <option value={60}>60 dakika</option>
                    <option value={75}>75 dakika</option>
                    <option value={90}>90 dakika</option>
                    <option value={120}>120 dakika</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Bitiş Saati</label>
                <input
                  type="time"
                  value={recurringForm.endTime}
                  readOnly
                  style={{ 
                    backgroundColor: 'var(--gray-100)',
                    cursor: 'not-allowed',
                    color: 'var(--gray-600)'
                  }}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Maksimum Katılımcı</label>
                  <input
                    type="number"
                    value={recurringForm.maxParticipants}
                    onChange={(e) => handleRecurringFormChange('maxParticipants', parseInt(e.target.value))}
                    min="1"
                    max="50"
                  />
                </div>
                
                <div className="form-group">
                  <label>Seviye</label>
                  <select
                    value={recurringForm.level}
                    onChange={(e) => handleRecurringFormChange('level', e.target.value)}
                  >
                    {Object.entries(levels).map(([level, label]) => (
                      <option key={level} value={level}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Açıklama</label>
                <textarea
                  value={recurringForm.description}
                  onChange={(e) => handleRecurringFormChange('description', e.target.value)}
                  placeholder="Sınıf açıklaması..."
                  rows="3"
                />
              </div>

              <div style={{ 
                border: '1px solid var(--gray-300)', 
                borderRadius: '8px', 
                padding: '16px', 
                marginTop: '16px',
                backgroundColor: 'var(--gray-50)'
              }}>
                <h4 style={{ margin: '0 0 16px 0', color: 'var(--gray-700)' }}>Program Ayarları</h4>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Başlangıç Tarihi *</label>
                    <select
                      value={recurringForm.startDate}
                      onChange={(e) => handleRecurringFormChange('startDate', e.target.value)}
                    >
                      <option value="">Tarih seçin</option>
                      {dateOptions.map(date => (
                        <option key={date.value} value={date.value}>
                          {date.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Bitiş Tarihi</label>
                    <input
                      type="date"
                      value={recurringForm.endDate}
                      readOnly
                      style={{ 
                        backgroundColor: 'var(--gray-100)',
                        cursor: 'not-allowed',
                        color: 'var(--gray-600)'
                      }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Kaç Hafta Tekrarlanacak *</label>
                  <select
                    value={recurringForm.repeatWeeks}
                    onChange={(e) => handleRecurringFormChange('repeatWeeks', parseInt(e.target.value))}
                  >
                    <option value={1}>1 hafta</option>
                    <option value={2}>2 hafta</option>
                    <option value={4}>4 hafta</option>
                    <option value={8}>8 hafta</option>
                    <option value={12}>12 hafta</option>
                    <option value={16}>16 hafta</option>
                    <option value={24}>24 hafta</option>
                    <option value={52}>52 hafta (1 yıl)</option>
                  </select>
                </div>

                <div className="form-info">
                  <p style={{ margin: '0', fontSize: '14px', color: 'var(--gray-600)' }}>
                    Seçilen günlerde {recurringForm.repeatWeeks} hafta boyunca tekrarlanan dersler oluşturulacak. 
                    Toplam {recurringForm.selectedDays.length} gün × {recurringForm.repeatWeeks} hafta = {recurringForm.selectedDays.length * recurringForm.repeatWeeks} ders.
                    Her ders bağımsız olarak düzenlenebilir veya silinebilir.
                  </p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: 'var(--accent-terra)', fontWeight: '500' }}>
                    ℹ️ Katılımcı sayısı: Tüm dersler 0 katılımcı ile başlar ve öğrenci uygulamasından kayıt oldukça otomatik güncellenir.
                  </p>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '24px' }}>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowRecurringModal(false)}
                >
                  İptal
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleSaveRecurringLessons}
                >
                  Sınıfları Oluştur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Lessons Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2>Ders Sil (Koşullu)</h2>
              <button 
                className="modal-close"
                onClick={() => setShowDeleteModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Gün</label>
                  <select
                    value={deleteCriteria.dayOfWeek}
                    onChange={(e) => handleDeleteCriteriaChange('dayOfWeek', e.target.value)}
                  >
                    <option value="">Hepsi</option>
                    {Object.entries(daysOfWeek).map(([day, label]) => (
                      <option key={day} value={day}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Başlangıç Saati</label>
                  <select
                    value={deleteCriteria.startTime}
                    onChange={(e) => handleDeleteCriteriaChange('startTime', e.target.value)}
                  >
                    <option value="">Hepsi</option>
                    {timeSlots.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Eğitmen</label>
                  <select
                    value={deleteCriteria.trainerId}
                    onChange={(e) => handleDeleteCriteriaChange('trainerId', e.target.value)}
                  >
                    <option value="">Hepsi</option>
                    {trainers.map(trainer => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Süre (dk)</label>
                  <input
                    type="number"
                    value={deleteCriteria.duration}
                    onChange={(e) => handleDeleteCriteriaChange('duration', e.target.value)}
                    min="1"
                    placeholder="Örn: 60"
                  />
                </div>
              </div>

              {deletePreview && (
                <div className="info-box">
                  <strong>{deletePreview.count}</strong> ders silinecek.
                  {deletePreview.sample.length > 0 && (
                    <ul style={{ marginTop: '8px', paddingLeft: '18px', color: 'var(--gray-700)' }}>
                      {deletePreview.sample.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                      {deletePreview.count > deletePreview.sample.length && (
                        <li>...ve diğerleri</li>
                      )}
                    </ul>
                  )}
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '12px' }}>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteLoading}
                >
                  İptal
                </button>
                <button 
                  className="btn btn-warning"
                  onClick={computeDeletePreview}
                  disabled={deleteLoading}
                  style={{ color: '#4a4a4a', background: '#f8e1a5' }}
                >
                  Eşleşmeleri Önizle
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={handleDeleteLessons}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Siliniyor...' : 'Eşleşen Dersleri Sil'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Detail Modal */}
      {showLessonDetail && selectedLessonForDetail && (
        <div className="modal-overlay">
          <div className="modal-content lesson-detail-modal" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>Ders Detayları</h2>
              <button 
                className="modal-close"
                onClick={closeLessonDetailModal}
              >
                ×
              </button>
            </div>
            
            <div className="lesson-detail-content">
              <div className="detail-header">
                <h3>{selectedLessonForDetail.title}</h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {selectedLessonForDetail.lessonType && (
                    <span className="lesson-type-badge" style={{
                      background: selectedLessonForDetail.lessonType === 'one-on-one'
                        ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                        : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}>
                      {selectedLessonForDetail.lessonType === 'one-on-one' ? '👤 Bire Bir' : '👥 Grup'}
                    </span>
                  )}
                  <span className="lesson-type-badge" style={{
                    background: getLessonColor(selectedLessonForDetail.type),
                    color: 'white',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}>
                    {selectedLessonForDetail.type}
                  </span>
                </div>
              </div>

              <div className="detail-info-grid" style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginTop: '20px'
              }}>
                <div className="detail-card">
                  <h4>📅 Zaman Bilgileri</h4>
                  <p><strong>Gün:</strong> {daysOfWeek[selectedLessonForDetail.dayOfWeek]}</p>
                  <p><strong>Saat:</strong> {selectedLessonForDetail.startTime} - {selectedLessonForDetail.endTime}</p>
                  <p><strong>Süre:</strong> {selectedLessonForDetail.duration} dakika</p>
                </div>

                <div className="detail-card">
                  <h4>👨‍🏫 Eğitmen Bilgileri</h4>
                  <p><strong>Ad:</strong> {selectedLessonForDetail.trainerName}</p>
                  <p><strong>Seviye:</strong> {levels[selectedLessonForDetail.level]}</p>
                </div>

                <div className="detail-card">
                  <h4>👥 Katılımcı Bilgileri</h4>
                  <p><strong>Mevcut:</strong> {getParticipantCount(selectedLessonForDetail)}</p>
                  <p><strong>Maksimum:</strong> {selectedLessonForDetail.maxParticipants}</p>
                  <p><strong>Uygun Yer:</strong> {(selectedLessonForDetail.maxParticipants - getParticipantCount(selectedLessonForDetail))}</p>
                  
                  {/* Progress bar */}
                  <div style={{ marginTop: '10px' }}>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: 'var(--gray-200)',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${(getParticipantCount(selectedLessonForDetail) / selectedLessonForDetail.maxParticipants) * 100}%`,
                        height: '100%',
                        backgroundColor: getParticipantCount(selectedLessonForDetail) >= selectedLessonForDetail.maxParticipants ? 'var(--error)' : 'var(--sage-green)',
                        transition: 'width 0.3s ease'
                      }}></div>
                    </div>
                  </div>
                </div>

                <div className="detail-card">
                  <h4>📝 Açıklama</h4>
                  <p>{selectedLessonForDetail.description || 'Açıklama bulunmuyor.'}</p>
                </div>
              </div>

              {/* Participants List Section - moved to bottom */}
              {Array.isArray(selectedLessonForDetail.participants) && selectedLessonForDetail.participants.length > 0 && (
                <div className="detail-participants-section" style={{
                  marginTop: '24px',
                  padding: '20px',
                  backgroundColor: 'var(--gray-50)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--gray-200)'
                }}>
                  <h4 style={{ 
                    margin: '0 0 16px 0', 
                    color: 'var(--text-dark)',
                    fontSize: '18px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    👥 Kayıtlı Katılımcılar ({selectedLessonForDetail.participants.length})
                  </h4>
                  
                  <div className="participants-list" style={{
                    display: 'grid',
                    gap: '12px'
                  }}>
                    {selectedLessonForDetail.participants.map((participantId, index) => {
                      const participant = participantDetails[participantId];
                      return (
                        <div key={participantId} className="participant-item" style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          backgroundColor: 'white',
                          borderRadius: 'var(--radius)',
                          border: '1px solid var(--gray-200)',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}>
                          <div className="participant-info" style={{ flex: 1 }}>
                            <div style={{ 
                              fontWeight: '600', 
                              color: 'var(--text-dark)',
                              marginBottom: '4px'
                            }}>
                              {loadingParticipants ? (
                                <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>
                                  Yükleniyor...
                                </span>
                              ) : participant ? (
                                participant.name
                              ) : (
                                `Katılımcı #${index + 1}`
                              )}
                            </div>
                            {!loadingParticipants && participant && (
                              <div style={{ 
                                fontSize: '13px', 
                                color: 'var(--text)',
                                display: 'flex',
                                gap: '16px'
                              }}>
                                <span>📧 {participant.email}</span>
                                <span>📱 {participant.phone}</span>
                              </div>
                            )}
                            {!loadingParticipants && !participant && (
                              <div style={{ 
                                fontSize: '12px', 
                                color: 'var(--text-light)',
                                fontStyle: 'italic'
                              }}>
                                Bilgi getirilemedi
                              </div>
                            )}
                          </div>
                          
                          <button
                            className="btn btn-danger"
                            onClick={() => handleRemoveParticipant(participantId)}
                            disabled={isLessonInPast(selectedLessonForDetail)}
                            style={{
                              fontSize: '12px',
                              padding: '6px 12px',
                              marginLeft: '12px',
                              minWidth: 'auto',
                              cursor: isLessonInPast(selectedLessonForDetail) ? 'not-allowed' : 'pointer',
                              opacity: isLessonInPast(selectedLessonForDetail) ? 0.5 : 1,
                              backgroundColor: isLessonInPast(selectedLessonForDetail) ? '#ccc' : undefined
                            }}
                            title={isLessonInPast(selectedLessonForDetail) ? "Geçmiş dersten öğrenci çıkarılamaz" : "Katılımcıyı Dersten Çıkar"}
                          >
                            🗑️ Çıkar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '24px' }}>
                <button 
                  className="btn btn-secondary"
                  onClick={closeLessonDetailModal}
                >
                  Kapat
                </button>
                {canEditLesson(selectedLessonForDetail) && (
                  <>
                    <button 
                      className="btn btn-success"
                      onClick={() => loadStudentsForLesson(selectedLessonForDetail)}
                      disabled={isLessonInPast(selectedLessonForDetail)}
                      style={{ 
                        background: isLessonInPast(selectedLessonForDetail) ? '#ccc' : 'var(--sage-green)', 
                        color: 'white',
                        cursor: isLessonInPast(selectedLessonForDetail) ? 'not-allowed' : 'pointer',
                        opacity: isLessonInPast(selectedLessonForDetail) ? 0.6 : 1
                      }}
                      title={isLessonInPast(selectedLessonForDetail) ? 'Geçmiş derse öğrenci eklenemez' : 'Derse öğrenci ekle'}
                    >
                      👥 Öğrenci Ekle
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={() => {
                        closeLessonDetailModal();
                        handleEditLesson(selectedLessonForDetail);
                      }}
                    >
                      Düzenle
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => {
                        closeLessonDetailModal();
                        handleDeleteLesson(selectedLessonForDetail.id);
                      }}
                      style={{ background: 'var(--danger)', color: 'white' }}
                    >
                      Sil
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && selectedLessonForStudents && (
        <div className="modal-overlay">
          <div className="modal-content add-student-modal" style={{ maxWidth: '700px', maxHeight: '80vh' }}>
            <div className="modal-header">
              <h2>Derse Öğrenci Ekle</h2>
              <button 
                className="modal-close"
                onClick={closeAddStudentModal}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
              {/* Lesson Info */}
              <div style={{
                padding: '16px',
                backgroundColor: 'var(--gray-50)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--gray-200)'
              }}>
                <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-dark)' }}>
                  {selectedLessonForStudents.title}
                </h3>
                <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: 'var(--text)' }}>
                  <span>📅 {daysOfWeek[selectedLessonForStudents.dayOfWeek]}</span>
                  <span>🕐 {selectedLessonForStudents.startTime}</span>
                  <span>👥 {getParticipantCount(selectedLessonForStudents)}/{selectedLessonForStudents.maxParticipants}</span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Öğrenci ara (ad, email, telefon)..."
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid var(--gray-200)',
                    borderRadius: 'var(--radius)',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    color: 'var(--text-dark)'
                  }}
                />
              </div>

              {/* Students List */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '4px'
              }}>
                {loadingStudents ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
                    Öğrenciler yükleniyor...
                  </div>
                ) : allStudents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
                    Öğrenci bulunamadı
                  </div>
                ) : (
                  allStudents
                    .filter(student => {
                      if (!studentSearchTerm) return true;
                      const searchLower = studentSearchTerm.toLowerCase();
                      return (
                        student.name?.toLowerCase().includes(searchLower) ||
                        student.email?.toLowerCase().includes(searchLower) ||
                        student.phone?.toLowerCase().includes(searchLower)
                      );
                    })
                    .map(student => {
                      const isAlreadyInLesson = selectedLessonForStudents.participants?.includes(student.id);
                      
                      return (
                        <div 
                          key={student.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '16px',
                            backgroundColor: isAlreadyInLesson ? 'var(--sage-green-light)' : 'white',
                            borderRadius: 'var(--radius)',
                            border: `1px solid ${isAlreadyInLesson ? 'var(--sage-green)' : 'var(--gray-200)'}`,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontWeight: '600',
                              color: 'var(--text-dark)',
                              marginBottom: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              {student.name}
                              {isAlreadyInLesson && (
                                <span style={{
                                  fontSize: '12px',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  backgroundColor: 'var(--sage-green)',
                                  color: 'white'
                                }}>
                                  Kayıtlı
                                </span>
                              )}
                              {(student.membershipStatus === 'frozen' || student.status === 'frozen') && (
                                <span style={{
                                  fontSize: '12px',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  backgroundColor: '#3b82f6',
                                  color: 'white'
                                }}>
                                  ❄️ Donduruldu
                                </span>
                              )}
                            </div>
                            <div style={{ 
                              fontSize: '13px', 
                              color: 'var(--text)',
                              display: 'flex',
                              gap: '16px'
                            }}>
                              <span>📧 {student.email}</span>
                              <span>📱 {student.phone}</span>
                            </div>
                          </div>
                          
                          {isAlreadyInLesson ? (
                            <button
                              className="btn btn-danger"
                              onClick={() => handleRemoveStudentFromLesson(student.id)}
                              disabled={isLessonInPast(selectedLessonForStudents)}
                              style={{
                                fontSize: '12px',
                                padding: '8px 16px',
                                marginLeft: '12px',
                                minWidth: 'auto',
                                cursor: isLessonInPast(selectedLessonForStudents) ? 'not-allowed' : 'pointer',
                                opacity: isLessonInPast(selectedLessonForStudents) ? 0.5 : 1,
                                backgroundColor: isLessonInPast(selectedLessonForStudents) ? '#ccc' : undefined
                              }}
                              title={isLessonInPast(selectedLessonForStudents) ? "Geçmiş dersten öğrenci çıkarılamaz" : "Öğrenciyi dersten çıkar"}
                            >
                              🗑️ Çıkar
                            </button>
                          ) : (
                            <button
                              className="btn btn-success"
                              onClick={() => handleAddStudentToLesson(student.id)}
                              disabled={
                                isLessonInPast(selectedLessonForStudents) ||
                                getParticipantCount(selectedLessonForStudents) >= selectedLessonForStudents.maxParticipants ||
                                student.membershipStatus === 'frozen' ||
                                student.status === 'frozen'
                              }
                              style={{
                                fontSize: '12px',
                                padding: '8px 16px',
                                marginLeft: '12px',
                                minWidth: 'auto',
                                background: isLessonInPast(selectedLessonForStudents) ||
                                          getParticipantCount(selectedLessonForStudents) >= selectedLessonForStudents.maxParticipants ||
                                          student.membershipStatus === 'frozen' ||
                                          student.status === 'frozen'
                                          ? '#ccc' : 'var(--sage-green)',
                                color: 'white',
                                cursor: isLessonInPast(selectedLessonForStudents) ||
                                       getParticipantCount(selectedLessonForStudents) >= selectedLessonForStudents.maxParticipants ||
                                       student.membershipStatus === 'frozen' ||
                                       student.status === 'frozen'
                                       ? 'not-allowed' : 'pointer',
                                opacity: isLessonInPast(selectedLessonForStudents) ||
                                        getParticipantCount(selectedLessonForStudents) >= selectedLessonForStudents.maxParticipants ||
                                        student.membershipStatus === 'frozen' ||
                                        student.status === 'frozen'
                                        ? 0.6 : 1
                              }}
                              title={
                                student.membershipStatus === 'frozen' || student.status === 'frozen'
                                  ? "Bu öğrencinin üyeliği dondurulmuş"
                                  : isLessonInPast(selectedLessonForStudents)
                                  ? "Geçmiş derse öğrenci eklenemez"
                                  : getParticipantCount(selectedLessonForStudents) >= selectedLessonForStudents.maxParticipants
                                  ? "Ders dolu"
                                  : "Öğrenciyi derse ekle"
                              }
                            >
                              ➕ Ekle
                            </button>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ marginTop: '16px' }}>
              <button 
                className="btn btn-secondary"
                onClick={closeAddStudentModal}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

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

export default Schedule;
