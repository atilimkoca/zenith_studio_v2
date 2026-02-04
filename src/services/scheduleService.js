// Schedule Service for Lesson Management
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  query,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import memberService from './memberService';

class ScheduleService {
  normalizeDate(value) {
    if (!value) return null;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (value instanceof Timestamp) {
      const date = value.toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === 'object' && typeof value.seconds === 'number') {
      const date = new Date(value.seconds * 1000);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === 'string') {
      // Handle date-only strings (e.g., "2026-01-07") by parsing as local time
      // This prevents timezone issues where UTC midnight becomes previous day in some timezones
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        const date = new Date(year, month - 1, day); // Local time constructor
        return Number.isNaN(date.getTime()) ? null : date;
      }
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  // Normalize a date to midnight local time for date-only comparisons
  normalizeDateToMidnight(value) {
    const date = this.normalizeDate(value);
    if (!date) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
  
  // Create a new lesson
  async createLesson(lessonData) {
    try {
      const lesson = {
        ...lessonData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'active'
      };
      
      const docRef = await addDoc(collection(db, 'lessons'), lesson);
      
      return {
        success: true,
        lessonId: docRef.id
      };
    } catch (error) {
      console.error('❌ Error creating lesson:', error);
      return {
        success: false,
        error: 'Ders oluşturulurken hata oluştu'
      };
    }
  }

  // Get all lessons
  async getAllLessons() {
    try {
      
      const lessonsCollection = collection(db, 'lessons');
      // Simple query without composite index requirement
      const querySnapshot = await getDocs(lessonsCollection);
      
      const lessons = [];
      querySnapshot.forEach((doc) => {
        lessons.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort in JavaScript instead of Firestore
      lessons.sort((a, b) => {
        // First sort by day of week
        const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayA = dayOrder.indexOf(a.dayOfWeek || 'monday');
        const dayB = dayOrder.indexOf(b.dayOfWeek || 'monday');
        
        if (dayA !== dayB) {
          return dayA - dayB;
        }
        
        // Then sort by start time
        const timeA = a.startTime || '00:00';
        const timeB = b.startTime || '00:00';
        return timeA.localeCompare(timeB);
      });
      
      
      return {
        success: true,
        lessons
      };
    } catch (error) {
      console.error('❌ Error getting lessons:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'failed-precondition') {
        console.warn('⚠️ Firestore indexes not ready, trying simple query...');
        try {
          // Try a simple query without ordering
          const simpleQuery = await getDocs(collection(db, 'lessons'));
          const lessons = [];
          simpleQuery.forEach((doc) => {
            lessons.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          return {
            success: true,
            lessons
          };
        } catch (simpleError) {
          console.error('❌ Simple query also failed:', simpleError);
          return {
            success: true,
            lessons: []
          };
        }
      }
      
      return {
        success: false,
        error: 'Dersler alınırken hata oluştu: ' + error.message,
        lessons: []
      };
    }
  }

  // Get lessons for a specific trainer
  async getLessonsByTrainer(trainerId) {
    try {
      const lessonsCollection = collection(db, 'lessons');
      const q = query(
        lessonsCollection, 
        where('trainerId', '==', trainerId)
      );
      const querySnapshot = await getDocs(q);
      const lessons = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort in JavaScript
      lessons.sort((a, b) => {
        const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayA = dayOrder.indexOf(a.dayOfWeek || 'monday');
        const dayB = dayOrder.indexOf(b.dayOfWeek || 'monday');
        
        if (dayA !== dayB) {
          return dayA - dayB;
        }
        
        const timeA = a.startTime || '00:00';
        const timeB = b.startTime || '00:00';
        return timeA.localeCompare(timeB);
      });
      
      return {
        success: true,
        lessons
      };
    } catch (error) {
      console.error('❌ Error getting trainer lessons:', error);
      return {
        success: false,
        error: 'Eğitmen dersleri alınırken hata oluştu'
      };
    }
  }

  // Get lessons for a specific day
  async getLessonsByDay(dayOfWeek) {
    try {
      const lessonsCollection = collection(db, 'lessons');
      const q = query(
        lessonsCollection, 
        where('dayOfWeek', '==', dayOfWeek)
      );
      const querySnapshot = await getDocs(q);
      const lessons = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by start time in JavaScript
      lessons.sort((a, b) => {
        const timeA = a.startTime || '00:00';
        const timeB = b.startTime || '00:00';
        return timeA.localeCompare(timeB);
      });
      
      return {
        success: true,
        lessons
      };
    } catch (error) {
      console.error('❌ Error getting lessons by day:', error);
      return {
        success: false,
        error: 'Günlük dersler alınırken hata oluştu'
      };
    }
  }

  // Update lesson
  async updateLesson(lessonId, updates) {
    try {
      const lessonRef = doc(db, 'lessons', lessonId);
      
      await updateDoc(lessonRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Error updating lesson:', error);
      return {
        success: false,
        error: 'Ders güncellenirken hata oluştu: ' + error.message
      };
    }
  }


  // Delete lesson
  async deleteLesson(lessonId) {
    try {
      // First get the lesson to refund participants
      const lessonRef = doc(db, 'lessons', lessonId);
      const lessonDoc = await getDoc(lessonRef);
      
      if (lessonDoc.exists()) {
        const lessonData = lessonDoc.data();
        const participants = lessonData.participants || [];
        const lessonScheduledDate = lessonData.scheduledDate || lessonData.date;
        
        // Refund credits to all participants before deleting
        if (participants.length > 0 && lessonScheduledDate) {
          for (const participantId of participants) {
            try {
              await memberService.refundLessonToPackage(
                participantId,
                lessonScheduledDate,
                `Ders silindi: ${lessonData.title || 'İsimsiz Ders'}`
              );
              console.log(`✅ Credit refunded for participant: ${participantId}`);
            } catch (refundError) {
              console.error(`❌ Failed to refund credit for participant ${participantId}:`, refundError);
            }
          }
        }
      }
      
      await deleteDoc(lessonRef);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Error deleting lesson:', error);
      return {
        success: false,
        error: 'Ders silinirken hata oluştu'
      };
    }
  }

  // Cancel lesson (soft delete)
  async cancelLesson(lessonId, adminId) {
    try {
      const lessonRef = doc(db, 'lessons', lessonId);
      const lessonDoc = await getDoc(lessonRef);
      
      if (!lessonDoc.exists()) {
        return {
          success: false,
          error: 'Ders bulunamadı'
        };
      }
      
      const lessonData = lessonDoc.data();
      const participants = lessonData.participants || [];
      const lessonScheduledDate = lessonData.scheduledDate || lessonData.date;
      
      // Refund credits to all participants
      if (participants.length > 0 && lessonScheduledDate) {
        for (const participantId of participants) {
          try {
            await memberService.refundLessonToPackage(
              participantId,
              lessonScheduledDate,
              `Ders iptal edildi: ${lessonData.title || 'İsimsiz Ders'}`
            );
            console.log(`✅ Credit refunded for participant: ${participantId}`);
          } catch (refundError) {
            console.error(`❌ Failed to refund credit for participant ${participantId}:`, refundError);
          }
        }
      }
      
      await updateDoc(lessonRef, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledBy: adminId,
        updatedAt: serverTimestamp()
      });
      
      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Error cancelling lesson:', error);
      return {
        success: false,
        error: 'Ders iptal edilirken hata oluştu'
      };
    }
  }

  // Get lesson by ID
  async getLessonById(lessonId) {
    try {
      const lessonDoc = await getDoc(doc(db, 'lessons', lessonId));
      
      if (lessonDoc.exists()) {
        return {
          success: true,
          lesson: {
            id: lessonDoc.id,
            ...lessonDoc.data()
          }
        };
      } else {
        return {
          success: false,
          error: 'Ders bulunamadı'
        };
      }
    } catch (error) {
      console.error('❌ Error getting lesson:', error);
      return {
        success: false,
        error: 'Ders alınırken hata oluştu'
      };
    }
  }

  // Check if a lesson extension conflicts with other lessons
  async checkLessonExtensionConflict(lessonId, newEndTime) {
    try {
      // First get the lesson being extended
      const lessonResult = await this.getLessonById(lessonId);
      if (!lessonResult.success) {
        return {
          success: false,
          error: 'Ders bulunamadı'
        };
      }
      
      const lesson = lessonResult.lesson;
      
      // Only check the extended portion for conflicts
      const extensionStartTime = lesson.endTime; // The old end time becomes the start of extension
      
      // Get all other lessons for same trainer and day
      const lessonsCollection = collection(db, 'lessons');
      let q = query(
        lessonsCollection,
        where('trainerId', '==', lesson.trainerId),
        where('dayOfWeek', '==', lesson.dayOfWeek)
      );
      
      const querySnapshot = await getDocs(q);
      const allLessons = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Exclude the lesson being extended
      const otherLessons = allLessons.filter(l => l.id !== lessonId);
      
      // Check if the extension period conflicts with any other lesson
      const getMinutes = (time) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      const extensionStartMin = getMinutes(extensionStartTime);
      const extensionEndMin = getMinutes(newEndTime);
      
      const conflictingLessons = otherLessons.filter(otherLesson => {
        const otherStartMin = getMinutes(otherLesson.startTime);
        const otherEndMin = getMinutes(otherLesson.endTime);
        
        // Check if extension period overlaps with other lesson
        const hasOverlap = (extensionStartMin < otherEndMin && otherStartMin < extensionEndMin);
        
        
        return hasOverlap;
      });
      
      if (conflictingLessons.length > 0) {
        const conflictingLesson = conflictingLessons[0];
        return {
          success: false,
          error: `Dersinizi ${newEndTime}'a kadar uzatamazsınız çünkü ${conflictingLesson.startTime}-${conflictingLesson.endTime} saatinde "${conflictingLesson.title}" dersiniz var. Lütfen önce o dersi taşıyın veya daha kısa bir süre seçin.`
        };
      }
      
      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Error checking extension conflict:', error);
      return {
        success: false,
        error: 'Ders uzatma kontrolü yapılırken hata oluştu'
      };
    }
  }

  // Check if a lesson can be extended to a specific end time
  async checkLessonExtension(lessonId, newEndTime) {
    try {
      // First get the lesson being extended
      const lessonResult = await this.getLessonById(lessonId);
      if (!lessonResult.success) {
        return {
          success: false,
          error: 'Ders bulunamadı'
        };
      }
      
      const lesson = lessonResult.lesson;
      
      // Check for conflicts with the new end time
      return await this.checkTimeConflict(
        lesson.trainerId,
        lesson.dayOfWeek,
        lesson.startTime,
        newEndTime,
        lessonId,
        lesson.scheduledDate
      );
    } catch (error) {
      console.error('❌ Error checking lesson extension:', error);
      return {
        success: false,
        error: 'Ders uzatma kontrolü yapılırken hata oluştu'
      };
    }
  }

  // Check for time conflicts
  async checkTimeConflict(trainerId, dayOfWeek, startTime, endTime, excludeLessonId = null, scheduledDate = null) {
    try {

      const lessonsCollection = collection(db, 'lessons');
      let q = query(
        lessonsCollection,
        where('trainerId', '==', trainerId),
        where('dayOfWeek', '==', dayOfWeek)
      );
      
      const querySnapshot = await getDocs(q);
      const lessons = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));


      // Filter out the lesson being updated (if any) and constrain by date if provided
      let relevantLessons = lessons;

      if (scheduledDate) {
        const targetDate = this.normalizeDate(scheduledDate);
        if (targetDate) {
          targetDate.setHours(0, 0, 0, 0);
          relevantLessons = relevantLessons.filter((lesson) => {
            const lessonDate = this.normalizeDate(lesson.scheduledDate);
            if (!lessonDate) return false;
            lessonDate.setHours(0, 0, 0, 0);
            return lessonDate.getTime() === targetDate.getTime();
          });
        }
      }

      if (excludeLessonId && excludeLessonId !== null && excludeLessonId !== undefined) {
        relevantLessons = relevantLessons.filter(lesson => {
          // Convert both IDs to strings for comparison to handle any type differences
          const lessonIdStr = String(lesson.id).trim();
          const excludeIdStr = String(excludeLessonId).trim();
          const shouldExclude = lessonIdStr === excludeIdStr;
          return !shouldExclude;
        });
      }


      // Check for time overlaps
      const conflictingLessons = relevantLessons.filter(lesson => {
        const lessonStart = lesson.startTime;
        const lessonEnd = lesson.endTime;
        
        // Convert times to minutes for easier comparison
        const getMinutes = (time) => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };
        
        const requestedStartMin = getMinutes(startTime);
        const requestedEndMin = getMinutes(endTime);
        const lessonStartMin = getMinutes(lessonStart);
        const lessonEndMin = getMinutes(lessonEnd);
        
        // Check if times overlap (more precise logic)
        // Overlap occurs if: start1 < end2 AND start2 < end1
        const hasOverlap = (requestedStartMin < lessonEndMin && lessonStartMin < requestedEndMin);
        
        
        return hasOverlap;
      });

      if (conflictingLessons.length > 0) {
        const conflictingLesson = conflictingLessons[0];

        // Provide more helpful error messages based on the type of conflict
        let errorMessage = `Bu saatte "${conflictingLesson.title}" dersiniz bulunmaktadır (${conflictingLesson.startTime} - ${conflictingLesson.endTime}).`;

        // Check if it's a duration extension conflict
        const getMinutes = (time) => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };

        const requestedStartMin = getMinutes(startTime);
        const requestedEndMin = getMinutes(endTime);
        const lessonStartMin = getMinutes(conflictingLesson.startTime);
        const lessonEndMin = getMinutes(conflictingLesson.endTime);

        if (requestedStartMin === lessonStartMin && requestedEndMin > lessonEndMin) {
          errorMessage += ` Dersinizin süresini uzatmak istiyorsanız, önce "${conflictingLesson.title}" dersini farklı bir saate taşıyın.`;
        } else if (requestedStartMin < lessonStartMin && requestedEndMin > lessonStartMin) {
          errorMessage += ` Lütfen bitiş saatinizi ${conflictingLesson.startTime} olarak ayarlayın veya "${conflictingLesson.title}" dersini farklı bir saate taşıyın.`;
        } else {
          errorMessage += ` Aynı saatte ders vermek için lütfen FARKLI BİR EĞİTMEN seçin.`;
        }

        return {
          success: false,
          error: errorMessage
        };
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Error checking time conflict:', error);
      return {
        success: false,
        error: 'Zaman çakışması kontrol edilirken hata oluştu'
      };
    }
  }

  // Get schedule statistics
  async getScheduleStatistics() {
    try {
      const lessonsCollection = collection(db, 'lessons');
      const querySnapshot = await getDocs(lessonsCollection);
      const lessons = querySnapshot.docs.map(doc => doc.data());
      
      const stats = {
        totalLessons: lessons.length,
        activeLessons: lessons.filter(l => l.status === 'active').length,
        lessonsByDay: {
          monday: lessons.filter(l => l.dayOfWeek === 'monday').length,
          tuesday: lessons.filter(l => l.dayOfWeek === 'tuesday').length,
          wednesday: lessons.filter(l => l.dayOfWeek === 'wednesday').length,
          thursday: lessons.filter(l => l.dayOfWeek === 'thursday').length,
          friday: lessons.filter(l => l.dayOfWeek === 'friday').length,
          saturday: lessons.filter(l => l.dayOfWeek === 'saturday').length,
          sunday: lessons.filter(l => l.dayOfWeek === 'sunday').length
        },
        lessonTypes: {}
      };

      // Count lesson types
      lessons.forEach(lesson => {
        if (lesson.type) {
          stats.lessonTypes[lesson.type] = (stats.lessonTypes[lesson.type] || 0) + 1;
        }
      });

      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('❌ Error getting schedule statistics:', error);
      return {
        success: false,
        error: 'Program istatistikleri alınırken hata oluştu'
      };
    }
  }

  // Get lessons for a specific week range
  async getWeeklyScheduleByDateRange(startDate, endDate) {
    try {
      const result = await this.getAllLessons();
      
      if (!result.success) {
        return {
          success: true,
          schedule: {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: []
          }
        };
      }

      const weeklySchedule = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
      };

      // Filter lessons by date range
      if (result.lessons && Array.isArray(result.lessons)) {
        // Normalize dates to local midnight for accurate comparison
        const startDateLocal = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const endDateLocal = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        const startTimestamp = startDateLocal.getTime();
        const endTimestamp = endDateLocal.getTime();
        
        result.lessons.forEach(lesson => {
          // Check if lesson falls within the specified week
          let includeLesson = false;
          
          if (lesson.scheduledDate) {
            // For recurring lessons, check if the scheduled date is in this week
            // Use normalizeDate to handle date-only strings correctly (as local time)
            const lessonDate = this.normalizeDate(lesson.scheduledDate);
            
            if (lessonDate) {
              // Normalize lesson date to local midnight
              const lessonDateLocal = new Date(lessonDate.getFullYear(), lessonDate.getMonth(), lessonDate.getDate());
              const lessonTimestamp = lessonDateLocal.getTime();
              
              // Compare timestamps for accurate date comparison
              includeLesson = lessonTimestamp >= startTimestamp && lessonTimestamp <= endTimestamp;
            }
          } else {
            // For legacy lessons without specific dates, include them in all weeks
            includeLesson = true;
          }
          
          if (includeLesson && lesson.dayOfWeek && weeklySchedule[lesson.dayOfWeek]) {
            weeklySchedule[lesson.dayOfWeek].push(lesson);
          }
        });
      }

      // Sort each day by start time
      Object.keys(weeklySchedule).forEach(day => {
        weeklySchedule[day].sort((a, b) => {
          if (!a.startTime || !b.startTime) return 0;
          return a.startTime.localeCompare(b.startTime);
        });
      });
      
      return {
        success: true,
        schedule: weeklySchedule
      };
    } catch (error) {
      console.error('❌ Error getting weekly schedule by date range:', error);
      return {
        success: false,
        error: 'Haftalık program alınırken hata oluştu: ' + error.message,
        schedule: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: []
        }
      };
    }
  }

  // Get weekly schedule (organized by days)
  async getWeeklySchedule() {
    try {
      
      const result = await this.getAllLessons();
      if (!result.success) {
        return {
          success: true,
          schedule: {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: []
          }
        };
      }

      const weeklySchedule = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
      };

      // Safely handle lessons array
      if (result.lessons && Array.isArray(result.lessons)) {
        result.lessons.forEach(lesson => {
          if (lesson.dayOfWeek && weeklySchedule[lesson.dayOfWeek]) {
            weeklySchedule[lesson.dayOfWeek].push(lesson);
          }
        });
      }

      // Sort each day by start time
      Object.keys(weeklySchedule).forEach(day => {
        weeklySchedule[day].sort((a, b) => {
          if (!a.startTime || !b.startTime) return 0;
          return a.startTime.localeCompare(b.startTime);
        });
      });

      
      return {
        success: true,
        schedule: weeklySchedule
      };
    } catch (error) {
      console.error('❌ Error getting weekly schedule:', error);
      return {
        success: false,
        error: 'Haftalık program alınırken hata oluştu: ' + error.message,
        schedule: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: []
        }
      };
    }
  }

  // Update participant count for a lesson (used by student app)
  async updateParticipantCount(lessonId, newCount) {
    try {
      
      const lessonRef = doc(db, 'lessons', lessonId);
      
      // Get current lesson data for validation
      const lessonDoc = await getDoc(lessonRef);
      if (!lessonDoc.exists()) {
        return {
          success: false,
          error: 'Ders bulunamadı'
        };
      }

      const lessonData = lessonDoc.data();
      const maxParticipants = lessonData.maxParticipants || 0;
      
      // Validate that new count doesn't exceed max participants
      if (newCount > maxParticipants) {
        return {
          success: false,
          error: `Katılımcı sayısı maksimum limit olan ${maxParticipants}'i aşamaz`
        };
      }

      if (newCount < 0) {
        return {
          success: false,
          error: 'Katılımcı sayısı negatif olamaz'
        };
      }

      await updateDoc(lessonRef, {
        currentParticipants: newCount,
        updatedAt: serverTimestamp()
      });
      
      return {
        success: true,
        newCount: newCount
      };
    } catch (error) {
      console.error('❌ Error updating participant count:', error);
      return {
        success: false,
        error: 'Katılımcı sayısı güncellenirken hata oluştu: ' + error.message
      };
    }
  }

  // Increment participant count (when student enrolls)
  async incrementParticipantCount(lessonId) {
    try {
      const lessonDoc = await getDoc(doc(db, 'lessons', lessonId));
      if (!lessonDoc.exists()) {
        return {
          success: false,
          error: 'Ders bulunamadı'
        };
      }

      const lessonData = lessonDoc.data();
      const currentCount = lessonData.currentParticipants || 0;
      const maxParticipants = lessonData.maxParticipants || 0;

      if (currentCount >= maxParticipants) {
        return {
          success: false,
          error: 'Ders dolu - daha fazla katılımcı eklenemez'
        };
      }

      return await this.updateParticipantCount(lessonId, currentCount + 1);
    } catch (error) {
      console.error('❌ Error incrementing participant count:', error);
      return {
        success: false,
        error: 'Katılımcı sayısı artırılırken hata oluştu'
      };
    }
  }

  // Decrement participant count (when student cancels)
  async decrementParticipantCount(lessonId) {
    try {
      const lessonDoc = await getDoc(doc(db, 'lessons', lessonId));
      if (!lessonDoc.exists()) {
        return {
          success: false,
          error: 'Ders bulunamadı'
        };
      }

      const lessonData = lessonDoc.data();
      const currentCount = lessonData.currentParticipants || 0;

      if (currentCount <= 0) {
        return {
          success: false,
          error: 'Zaten hiç katılımcı yok'
        };
      }

      return await this.updateParticipantCount(lessonId, currentCount - 1);
    } catch (error) {
      console.error('❌ Error decrementing participant count:', error);
      return {
        success: false,
        error: 'Katılımcı sayısı azaltılırken hata oluştu'
      };
    }
  }

  // Create multiple lessons in bulk (for recurring lessons)
  async createBulkLessons(lessonsData) {
    try {
      const results = [];
      const batchSize = 10; // Process in batches to avoid overwhelming Firebase
      
      for (let i = 0; i < lessonsData.length; i += batchSize) {
        const batch = lessonsData.slice(i, i + batchSize);
        const batchPromises = batch.map(lessonData => this.createLesson(lessonData));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches
        if (i + batchSize < lessonsData.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      return {
        success: true,
        results,
        successCount: results.filter(r => r.success).length,
        failCount: results.filter(r => !r.success).length
      };
    } catch (error) {
      console.error('❌ Error creating bulk lessons:', error);
      return {
        success: false,
        error: 'Toplu ders oluşturma işlemi başarısız oldu',
        results: []
      };
    }
  }

  // Add a participant to a lesson and reduce their remaining classes
  async addParticipantToLesson(lessonId, participantId) {
    try {
      
      const lessonRef = doc(db, 'lessons', lessonId);
      const lessonDoc = await getDoc(lessonRef);
      
      if (!lessonDoc.exists()) {
        return {
          success: false,
          error: 'Ders bulunamadı'
        };
      }

      const lessonData = lessonDoc.data();
      let participants = lessonData.participants || [];
      const maxParticipants = lessonData.maxParticipants || 0;

      // Check if participant is already in the lesson
      if (participants.includes(participantId)) {
        return {
          success: false,
          error: 'Katılımcı zaten bu derste kayıtlı'
        };
      }

      // Check if lesson is full
      if (participants.length >= maxParticipants) {
        return {
          success: false,
          error: 'Ders dolu - daha fazla katılımcı eklenemez'
        };
      }

      // Get lesson date for package deduction
      let lessonDateForDeduction = lessonData.scheduledDate;
      if (typeof lessonDateForDeduction === 'object' && lessonDateForDeduction.toDate) {
        lessonDateForDeduction = lessonDateForDeduction.toDate().toISOString();
      }

      // Deduct lesson from the appropriate package using multi-package system
      const memberService = (await import('./memberService')).default;
      const deductResult = await memberService.deductLessonFromPackage(
        participantId,
        lessonDateForDeduction,
        `${lessonData.title} - ${lessonData.scheduledDate}`
      );

      if (!deductResult.success) {
        return {
          success: false,
          error: deductResult.error || 'Ders kredisi düşülürken bir hata oluştu'
        };
      }

      // Add participant to lesson
      participants.push(participantId);

      await updateDoc(lessonRef, {
        participants: participants,
        currentParticipants: participants.length,
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        message: `Katılımcı derse eklendi (${deductResult.packageName || 'Paket'} - Kalan: ${deductResult.totalRemaining})`,
        remainingClasses: deductResult.totalRemaining,
        deductedFromPackage: deductResult.packageName
      };
    } catch (error) {
      console.error('❌ Error adding participant to lesson:', error);
      return {
        success: false,
        error: 'Katılımcı eklenirken hata oluştu'
      };
    }
  }

  // Mark lesson as completed and reduce remaining classes for all participants
  // Mark lesson as completed and record attendance for all participants
  // NOTE: This does NOT deduct credits - credits are already deducted when participants join the lesson
  // This function only marks the lesson as completed and records attendance history
  async completeLessonAndRecordAttendance(lessonId) {
    try {
      
      const lessonRef = doc(db, 'lessons', lessonId);
      const lessonDoc = await getDoc(lessonRef);
      
      if (!lessonDoc.exists()) {
        return {
          success: false,
          error: 'Ders bulunamadı'
        };
      }

      const lessonData = lessonDoc.data();
      const participants = lessonData.participants || [];

      if (participants.length === 0) {
        return {
          success: false,
          error: 'Derste katılımcı bulunmuyor'
        };
      }

      // Record attendance history for all participants (without deducting credits)
      const memberService = (await import('./memberService')).default;
      const attendanceResults = [];
      
      for (const participantId of participants) {
        try {
          // Get member data to record attendance history
          let memberRef = null;
          let memberData = null;
          
          const memberDocRef = doc(db, 'members', participantId);
          const memberDoc = await getDoc(memberDocRef);
          
          if (memberDoc.exists()) {
            memberData = memberDoc.data();
            memberRef = memberDocRef;
          } else {
            const userRef = doc(db, 'users', participantId);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
              memberData = userDoc.data();
              memberRef = userRef;
            }
          }
          
          if (memberRef && memberData) {
            // Update lastVisit and totalVisits for attendance history (but NOT remainingClasses)
            await updateDoc(memberRef, {
              lastVisit: new Date().toISOString(),
              totalVisits: (memberData.totalVisits || 0) + 1,
              updatedAt: serverTimestamp()
            });
          }
          
          attendanceResults.push({
            participantId,
            success: true,
            remainingClasses: memberData?.remainingClasses
          });
        } catch (err) {
          console.error(`Error recording attendance for ${participantId}:`, err);
          attendanceResults.push({
            participantId,
            success: false,
            error: err.message
          });
        }
      }

      // Mark lesson as completed
      await updateDoc(lessonRef, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        attendanceRecorded: true,
        updatedAt: serverTimestamp()
      });

      const successfulAttendance = attendanceResults.filter(result => result.success).length;
      const failedAttendance = attendanceResults.filter(result => !result.success).length;


      return {
        success: true,
        message: `Ders tamamlandı. ${successfulAttendance} katılımcının dersi kaydedildi.`,
        attendanceResults,
        successfulAttendance,
        failedAttendance
      };
    } catch (error) {
      console.error('❌ Error completing lesson and recording attendance:', error);
      return {
        success: false,
        error: 'Ders tamamlanırken hata oluştu'
      };
    }
  }

  // Remove a participant from a lesson
  async removeParticipantFromLesson(lessonId, participantId) {
    try {
      
      const lessonRef = doc(db, 'lessons', lessonId);
      const lessonDoc = await getDoc(lessonRef);
      
      if (!lessonDoc.exists()) {
        return {
          success: false,
          error: 'Ders bulunamadı'
        };
      }

      const lessonData = lessonDoc.data();
      let participants = lessonData.participants || [];

      // Check if participant is in the lesson
      if (!participants.includes(participantId)) {
        return {
          success: false,
          error: 'Katılımcı bu derste kayıtlı değil'
        };
      }

      // Get lesson date for package refund
      let lessonDateForRefund = lessonData.scheduledDate;
      if (typeof lessonDateForRefund === 'object' && lessonDateForRefund.toDate) {
        lessonDateForRefund = lessonDateForRefund.toDate().toISOString();
      }

      // Refund credit to the appropriate package using multi-package system
      const memberService = (await import('./memberService')).default;
      const refundResult = await memberService.refundLessonToPackage(
        participantId,
        lessonDateForRefund,
        `Katılımcı çıkarıldı: ${lessonData.title} - ${lessonData.scheduledDate}`
      );

      if (!refundResult.success) {
        console.warn('⚠️ Credit refund failed:', refundResult.error);
        // Continue with removal even if refund fails
      }

      // Remove participant from array
      participants = participants.filter(id => id !== participantId);

      await updateDoc(lessonRef, {
        participants: participants,
        currentParticipants: participants.length,
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        message: refundResult.success 
          ? `Katılımcı dersten çıkarıldı (${refundResult.packageName || 'Paket'} - Kalan: ${refundResult.totalRemaining})`
          : 'Katılımcı dersten çıkarıldı (Kredi iadesi yapılamadı)',
        remainingClasses: refundResult.totalRemaining
      };
    } catch (error) {
      console.error('❌ Error removing participant from lesson:', error);
      return {
        success: false,
        error: 'Katılımcı çıkarılırken hata oluştu'
      };
    }
  }

  // Get all students (users with role 'customer')
  async getAllStudents() {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'customer')
      );
      
      const querySnapshot = await getDocs(q);
      const students = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        students.push({
          id: doc.id,
          name: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
          email: data.email,
          phone: data.phone,
          firstName: data.firstName,
          lastName: data.lastName,
          ...data
        });
      });
      
      // Sort by name
      students.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
      
      return {
        success: true,
        students
      };
    } catch (error) {
      console.error('❌ Error getting students:', error);
      return {
        success: false,
        error: 'Öğrenciler yüklenirken hata oluştu.'
      };
    }
  }

  // Manually add student to lesson (admin/instructor only)
  async addStudentToLesson(lessonId, userId) {
    try {
      // First, check user's remaining credits
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return {
          success: false,
          error: 'Kullanıcı bulunamadı.'
        };
      }
      
      const userData = userDoc.data();
      const remainingCredits = userData.remainingClasses || userData.lessonCredits || 0;

      if (remainingCredits <= 0) {
        return {
          success: false,
          error: 'Öğrencinin kalan dersi yok. Lütfen paket satın almasını sağlayın.'
        };
      }

      // Check if user is deleted
      if (userData.status === 'deleted' || userData.status === 'permanently_deleted') {
        return {
          success: false,
          error: 'Bu öğrenci silinmiş. Silinen üyeler derse eklenemez.'
        };
      }

      // Check if user is cancelled
      if (userData.status === 'cancelled' || userData.membershipStatus === 'cancelled') {
        return {
          success: false,
          error: 'Bu öğrencinin üyeliği iptal edilmiş. İptal edilen üyeler derse eklenemez.'
        };
      }

      // Check if user is frozen
      if (userData.membershipStatus === 'frozen' || userData.status === 'frozen') {
        return {
          success: false,
          error: 'Bu öğrencinin üyeliği dondurulmuş. Dondurulmuş üyeler derse eklenemez.'
        };
      }

      const lessonRef = doc(db, 'lessons', lessonId);
      const lessonDoc = await getDoc(lessonRef);
      
      if (!lessonDoc.exists()) {
        return {
          success: false,
          error: 'Ders bulunamadı.'
        };
      }
      
      const lessonData = lessonDoc.data();
      const currentParticipants = lessonData.participants || [];
      const maxParticipants = lessonData.maxParticipants || lessonData.maxStudents || 0;
      
      // Check if lesson is in the past
      const now = new Date();
      let lessonDateTime;
      
      if (lessonData.scheduledDate && lessonData.startTime) {
        // Create a date object for the lesson
        let lessonDate;
        if (typeof lessonData.scheduledDate === 'string') {
          lessonDate = new Date(lessonData.scheduledDate);
        } else if (lessonData.scheduledDate.toDate) {
          // Firestore Timestamp
          lessonDate = lessonData.scheduledDate.toDate();
        } else {
          lessonDate = new Date(lessonData.scheduledDate);
        }
        
        // Parse the time (format: "HH:MM")
        const [hours, minutes] = lessonData.startTime.split(':').map(Number);
        lessonDate.setHours(hours, minutes, 0, 0);
        lessonDateTime = lessonDate;
        
        // Check if lesson is in the past
        if (lessonDateTime < now) {
          return {
            success: false,
            error: 'Geçmiş bir derse öğrenci eklenemez. Bu ders zaten gerçekleşti.'
          };
        }

        // Check if user has a package that covers this lesson date using multi-package system
        const canBookResult = await memberService.canBookLessonOnDate(userId, lessonDate);
        if (!canBookResult.canBook) {
          return {
            success: false,
            error: canBookResult.message || 'Bu ders tarihi için geçerli bir paketiniz bulunmuyor.'
          };
        }
      }

      // Check if lesson is full
      if (currentParticipants.length >= maxParticipants) {
        return {
          success: false,
          error: 'Ders dolu. Maksimum katılımcı sayısına ulaşıldı.'
        };
      }

      // Check if user is already registered
      if (currentParticipants.includes(userId)) {
        return {
          success: false,
          error: 'Öğrenci zaten bu derse kayıtlı.'
        };
      }

      // Get the lesson date for deduction
      let lessonDateForDeduction = lessonData.scheduledDate;
      if (typeof lessonDateForDeduction === 'object' && lessonDateForDeduction.toDate) {
        lessonDateForDeduction = lessonDateForDeduction.toDate().toISOString();
      }

      // Deduct lesson from the appropriate package using multi-package system
      const deductResult = await memberService.deductLessonFromPackage(
        userId,
        lessonDateForDeduction,
        `${lessonData.title} - ${lessonData.scheduledDate}`
      );

      if (!deductResult.success) {
        return {
          success: false,
          error: deductResult.error || 'Ders kredisi düşülürken bir hata oluştu.'
        };
      }

      // Add user to participants
      const updatedParticipants = [...currentParticipants, userId];

      await updateDoc(lessonRef, {
        participants: updatedParticipants,
        currentParticipants: updatedParticipants.length,
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        message: `Öğrenci derse başarıyla eklendi. (${deductResult.packageName} paketinden düşüldü)`,
        remainingCredits: deductResult.totalRemaining,
        deductedFromPackage: deductResult.packageName
      };
    } catch (error) {
      console.error('❌ Error adding student to lesson:', error);
      return {
        success: false,
        error: 'Öğrenci eklenirken hata oluştu.'
      };
    }
  }

  // Remove student from lesson (admin/instructor only)
  async removeStudentFromLesson(lessonId, userId) {
    try {
      const lessonRef = doc(db, 'lessons', lessonId);
      const lessonDoc = await getDoc(lessonRef);
      
      if (!lessonDoc.exists()) {
        return {
          success: false,
          error: 'Ders bulunamadı.'
        };
      }
      
      const lessonData = lessonDoc.data();
      const currentParticipants = lessonData.participants || [];
      
      // Check if lesson is in the past
      const now = new Date();
      if (lessonData.scheduledDate && lessonData.startTime) {
        let lessonDate;
        if (typeof lessonData.scheduledDate === 'string') {
          lessonDate = new Date(lessonData.scheduledDate);
        } else if (lessonData.scheduledDate.toDate) {
          lessonDate = lessonData.scheduledDate.toDate();
        } else {
          lessonDate = new Date(lessonData.scheduledDate);
        }
        
        const [hours, minutes] = lessonData.startTime.split(':').map(Number);
        lessonDate.setHours(hours, minutes, 0, 0);
        
        if (lessonDate < now) {
          return {
            success: false,
            error: 'Geçmiş bir dersten öğrenci çıkarılamaz. Bu ders zaten gerçekleşti.'
          };
        }
      }
      
      // Check if user is registered
      if (!currentParticipants.includes(userId)) {
        return {
          success: false,
          error: 'Öğrenci bu derse kayıtlı değil.'
        };
      }
      
      // Refund credit to the appropriate package
      let lessonDateForRefund = lessonData.scheduledDate;
      if (typeof lessonDateForRefund === 'object' && lessonDateForRefund.toDate) {
        lessonDateForRefund = lessonDateForRefund.toDate().toISOString();
      }

      const refundResult = await memberService.refundLessonToPackage(
        userId,
        lessonDateForRefund,
        `Ders iptali: ${lessonData.title} - ${lessonData.scheduledDate}`
      );

      if (!refundResult.success) {
        console.warn('⚠️ Could not refund credit to package:', refundResult.error);
      } else {
        console.log('✅ Lesson credit refunded to package:', refundResult.packageName);
      }

      // Remove user from participants
      const updatedParticipants = currentParticipants.filter(id => id !== userId);
      
      await updateDoc(lessonRef, {
        participants: updatedParticipants,
        currentParticipants: updatedParticipants.length,
        updatedAt: serverTimestamp()
      });
      
      return {
        success: true,
        message: 'Öğrenci dersten başarıyla çıkarıldı. Ders kredisi iade edildi.'
      };
    } catch (error) {
      console.error('❌ Error removing student from lesson:', error);
      return {
        success: false,
        error: 'Öğrenci çıkarılırken hata oluştu.'
      };
    }
  }

  // Get lessons filtered by package type (for mobile app users)
  async getLessonsByPackageType(packageType) {
    try {
      console.log('🔍 Fetching lessons for package type:', packageType);

      const lessonsCollection = collection(db, 'lessons');

      // Query lessons where lessonType matches the user's packageType
      // and status is active
      const q = query(
        lessonsCollection,
        where('lessonType', '==', packageType),
        where('status', '==', 'active')
      );

      const querySnapshot = await getDocs(q);
      const lessons = [];

      querySnapshot.forEach((doc) => {
        lessons.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Sort by day of week and time
      lessons.sort((a, b) => {
        const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayA = dayOrder.indexOf(a.dayOfWeek || 'monday');
        const dayB = dayOrder.indexOf(b.dayOfWeek || 'monday');

        if (dayA !== dayB) {
          return dayA - dayB;
        }

        const timeA = a.startTime || '00:00';
        const timeB = b.startTime || '00:00';
        return timeA.localeCompare(timeB);
      });

      console.log(`✅ Found ${lessons.length} ${packageType} lessons`);

      return {
        success: true,
        lessons
      };
    } catch (error) {
      console.error('❌ Error getting lessons by package type:', error);
      return {
        success: false,
        error: 'Dersler alınırken hata oluştu',
        lessons: []
      };
    }
  }

  // Get available lessons for a specific user based on their package type
  async getAvailableLessonsForUser(userId) {
    try {
      console.log('🔍 Fetching available lessons for user:', userId);

      // First, get the user's package info
      const userDoc = await getDoc(doc(db, 'users', userId));

      if (!userDoc.exists()) {
        return {
          success: false,
          error: 'Kullanıcı bulunamadı',
          lessons: []
        };
      }

      const userData = userDoc.data();
      const packageType = userData.packageInfo?.packageType || 'group';
      const remainingClasses = userData.remainingClasses || 0;

      console.log('📦 User package type:', packageType);
      console.log('🎫 Remaining classes:', remainingClasses);

      // Get lessons matching the user's package type
      const result = await this.getLessonsByPackageType(packageType);

      if (!result.success) {
        return result;
      }

      // Filter out lessons that the user is already enrolled in
      const userLessons = result.lessons.map(lesson => ({
        ...lesson,
        isEnrolled: Array.isArray(lesson.participants) && lesson.participants.includes(userId),
        isFull: lesson.currentParticipants >= lesson.maxParticipants,
        canEnroll: remainingClasses > 0 &&
                   (!Array.isArray(lesson.participants) || !lesson.participants.includes(userId)) &&
                   (lesson.currentParticipants < lesson.maxParticipants)
      }));

      return {
        success: true,
        lessons: userLessons,
        packageType,
        remainingClasses
      };
    } catch (error) {
      console.error('❌ Error getting available lessons for user:', error);
      return {
        success: false,
        error: 'Kullanıcı dersleri alınırken hata oluştu',
        lessons: []
      };
    }
  }
}

export default new ScheduleService();
