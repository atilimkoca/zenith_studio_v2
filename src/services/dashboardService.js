// Dashboard service for fetching dashboard statistics and data
import { 
  collection, 
  getDocs, 
  addDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

class DashboardService {
  
  // Get dashboard statistics
  async getDashboardStats() {
    try {
      // Disable automatic package expiration check during dashboard session to prevent refreshes
      // Only run on app startup or manual trigger
      const shouldSkipPackageCheck = sessionStorage.getItem('dashboardSessionActive');
      
      if (!shouldSkipPackageCheck) {
        // Mark dashboard session as active to prevent future auto-checks
        sessionStorage.setItem('dashboardSessionActive', 'true');
        
        // Run package check only once per session
        try {
          const memberService = (await import('./memberService')).default;
          await memberService.autoCheckExpiredPackages();
        } catch {
          // Silent fail - don't disrupt dashboard loading
        }
      }

      // Fetch from both 'users' and 'members' collections
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const membersSnapshot = await getDocs(collection(db, 'members'));
      
      // Combine both collections
      const allUsers = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, source: 'users' };
      });
      
      const allMembers = membersSnapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, source: 'members' };
      });
      
      // Combine all data
      const allData = [...allUsers, ...allMembers];
      
      if (allData.length === 0) {
        return {
          success: true,
          data: {
            totalMembers: { value: 0, change: '+0', trend: 'up' },
            activeLessons: { value: 0, change: '+0', trend: 'up' },
            monthlyIncome: { value: '₺0', change: '+₺0', trend: 'up' },
            occupancyRate: { value: '0%', change: '0%', trend: 'up' }
          }
        };
      }
 
      // Count by status
      const statusCounts = {};
      allData.forEach(item => {
        const status = item.status || 'no-status';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
  
      // Show all roles first
      
      
      // Count by role
      const roleCounts = {};
      allData.forEach(item => {
        const role = item.role || 'no-role';
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      });
      
      // Simple customer count: if role === 'customer', count it
      const customerMembers = allData.filter(item => item.role === 'customer');
      
      // Fetch lessons for today
      const todayLessons = await this.getTodayLessons();
      
      // Fetch this month's transactions
      const monthlyIncome = await this.getMonthlyIncome();
      
      const dashboardData = {
        success: true,
        data: {
          totalMembers: {
            value: customerMembers.length || 0,
            change: this.calculateMemberGrowth(customerMembers),
            trend: 'up'
          },
          activeLessons: {
            value: todayLessons.length,
            change: this.calculateLessonGrowth(todayLessons),
            trend: todayLessons.length > 0 ? 'up' : 'down'
          },
          monthlyIncome: {
            value: `₺${monthlyIncome.toLocaleString('tr-TR')}`,
            change: monthlyIncome >= 0 ? `+₺${Math.floor(Math.abs(monthlyIncome) * 0.15).toLocaleString('tr-TR')}` : `-₺${Math.floor(Math.abs(monthlyIncome) * 0.15).toLocaleString('tr-TR')}`,
            trend: monthlyIncome > 0 ? 'up' : monthlyIncome < 0 ? 'down' : 'up'
          }
        }
      };
      
      return dashboardData;
    } catch (error) {
      return {
        success: false,
        error: 'Dashboard istatistikleri yüklenirken hata oluştu'
      };
    }
  }
  
  // Get today's lessons
  async getTodayLessons() {
    try {
      // Get current date info
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      // Get all lessons from Firebase
      const lessonsSnapshot = await getDocs(collection(db, 'lessons'));
      const allLessons = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Method 1: Lessons with specific scheduledDate for today
      const scheduledTodayLessons = allLessons.filter(lesson => {
        if (lesson.status === 'deleted' || lesson.status === 'cancelled') return false;
        
        const dateField = lesson.scheduledDate || lesson.date;
        if (!dateField) return false;
        
        try {
          const lessonDate = dateField.toDate ? dateField.toDate() : new Date(dateField);
          const isTodayByString = lessonDate.toDateString() === today.toDateString();
          
          if (isTodayByString) {
            return true;
          }
        } catch (error) {
          // Skip invalid dates
        }
        
        return false;
      });
      
      // Method 2: Recurring lessons that should happen today
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayDayName = dayNames[today.getDay()];
      
      const recurringTodayLessons = allLessons.filter(lesson => {
        if (lesson.status === 'deleted' || lesson.status === 'cancelled') return false;
        if (!lesson.dayOfWeek) return false;
        if (lesson.scheduledDate) return false; // Skip lessons with specific dates
        
        const isRecurringToday = lesson.dayOfWeek.toLowerCase() === todayDayName;
        if (isRecurringToday) {
          return true;
        }
        
        return false;
      });
      
      // Combine both types
      const allTodayLessons = [...scheduledTodayLessons, ...recurringTodayLessons];
      
      // Add time information and sort by time
      const lessonsWithTime = allTodayLessons.map(lesson => {
        let time = null;
        
        // Try to get time from various fields
        if (lesson.startTime) {
          // If startTime is already in HH:MM format, use it directly
          if (typeof lesson.startTime === 'string' && lesson.startTime.match(/^\d{1,2}:\d{2}$/)) {
            time = lesson.startTime;
          } else {
            // Try to parse as date/time
            try {
              const timeDate = lesson.startTime.toDate ? lesson.startTime.toDate() : new Date(lesson.startTime);
              if (!isNaN(timeDate.getTime())) {
                time = timeDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
              }
            } catch {
              time = lesson.startTime; // Use as-is if parsing fails
            }
          }
        } else if (lesson.scheduledDate || lesson.date) {
          const dateField = lesson.scheduledDate || lesson.date;
          try {
            const lessonDate = dateField.toDate ? dateField.toDate() : new Date(dateField);
            if (!isNaN(lessonDate.getTime())) {
              time = lessonDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            }
          } catch {
            // Use default time if parsing fails
          }
        }
        
        return {
          ...lesson,
          timeForSorting: time || '00:00',
          displayTime: time
        };
      });
      
      // Sort by time
      const sortedLessons = lessonsWithTime.sort((a, b) => {
        // Convert time strings to comparable format
        const timeA = a.timeForSorting.split(':').join('');
        const timeB = b.timeForSorting.split(':').join('');
        return timeA.localeCompare(timeB);
      });
      
      return sortedLessons;
      
    } catch (error) {
      return [];
    }
  }
  
  // Get monthly net income (income - outcome)
  async getMonthlyIncome() {
    try {
      // Get all transactions first, then filter in JavaScript
      const transactionsSnapshot = await getDocs(collection(db, 'transactions'));
      const allTransactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Show all transaction types for debugging
      
      
      // Filter for this month's transactions
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      
      // Filter transactions for this month
      const monthlyTransactions = allTransactions.filter(transaction => {
        // Check if transaction has a date
        if (!transaction.date && !transaction.createdAt) {
          return false;
        }
        
        // Handle Firestore Timestamp, string dates, and Date objects
        let transactionDate;
        if (transaction.date) {
          if (transaction.date.toDate) {
            // Firestore Timestamp
            transactionDate = transaction.date.toDate();
          } else if (typeof transaction.date === 'string') {
            // String date like "2025-08-29"
            transactionDate = new Date(transaction.date);
          } else {
            // Regular Date object
            transactionDate = new Date(transaction.date);
          }
        } else if (transaction.createdAt) {
          if (transaction.createdAt.toDate) {
            transactionDate = transaction.createdAt.toDate();
          } else {
            transactionDate = new Date(transaction.createdAt);
          }
        }
        
        const isThisMonth = transactionDate >= startOfMonth && transactionDate < endOfMonth;
        
        return isThisMonth;
      });
      
      // Calculate net income: income - outcome
      let totalIncome = 0;
      let totalOutcome = 0;
      
      monthlyTransactions.forEach(transaction => {
        // Handle amount as string or number
        const amount = parseFloat(transaction.amount) || 0;
        
        if (transaction.type === 'income') {
          totalIncome += amount;
        } else if (transaction.type === 'expense' || transaction.type === 'outcome') {
          totalOutcome += amount;
        }
      });
      
      const netIncome = totalIncome - totalOutcome;
      
      // Return net income (can be negative if more expenses than income)
      return netIncome;
    } catch (error) {
      return 0;
    }
  }
  
  // Calculate occupancy rate based on lesson attendance
  async calculateOccupancyRate() {
    try {
      // Get all lessons from this week for better calculation
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7); // Next Monday
      
      // Get all lessons first, then filter for this week
      const lessonsSnapshot = await getDocs(collection(db, 'lessons'));
      const allLessons = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter for this week's lessons
      const weekLessons = allLessons.filter(lesson => {
        if (!lesson.date || lesson.status === 'deleted' || lesson.status === 'cancelled') return false;
        
        const lessonDate = lesson.date.toDate ? lesson.date.toDate() : new Date(lesson.date);
        return lessonDate >= startOfWeek && lessonDate < endOfWeek;
      });
      
      if (weekLessons.length === 0) {
        return 0;
      }
      
      let totalCapacity = 0;
      let totalParticipants = 0;
      
      weekLessons.forEach(lesson => {
        const capacity = lesson.capacity || lesson.maxParticipants || 10; // Default capacity
        const participants = lesson.participants?.length || lesson.attendees?.length || 0;
        
        totalCapacity += capacity;
        totalParticipants += participants;
      });
      
      const occupancyRate = totalCapacity > 0 ? Math.round((totalParticipants / totalCapacity) * 100) : 0;
      
      return occupancyRate;
    } catch (error) {
      return 0;
    }
  }
  
  // Calculate member growth
  calculateMemberGrowth(members) {
    try {
      if (!members || members.length === 0) return '+0';
      
      // Simple calculation - you can make this more sophisticated
      const thisWeek = members.filter(member => {
        if (!member.joinDate && !member.createdAt) return false;
        const dateField = member.joinDate || member.createdAt;
        const joinDate = dateField.toDate ? dateField.toDate() : new Date(dateField);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return joinDate >= weekAgo;
      });
      
      return `+${thisWeek.length}`;
    } catch (error) {
      return '+0';
    }
  }
  
  // Calculate lesson growth (compare today vs yesterday)
  calculateLessonGrowth(todayLessons) {
    try {
      // Simple calculation - you can make this more sophisticated
      // For now, just return a positive number if there are lessons today
      if (todayLessons.length === 0) return '+0';
      return `+${todayLessons.length}`;
    } catch (error) {
      return '+0';
    }
  }
  
  // Calculate occupancy change
  calculateOccupancyChange(currentRate) {
    try {
      // Simple calculation - you can make this more sophisticated
      if (currentRate >= 80) return '+5%';
      if (currentRate >= 60) return '+2%';
      if (currentRate >= 40) return '-1%';
      return '-3%';
    } catch (error) {
      return '0%';
    }
  }
  
  // Get recent activities
  async getRecentActivities() {
    try {
      const activities = [];
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

      // 1. NEW MEMBER REGISTRATIONS
      const membersSnapshot = await getDocs(collection(db, 'members'));
      const allMembers = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Recent member registrations
      const recentMembers = allMembers
        .filter(member => {
          if (!member.createdAt) return false;
          const createdDate = member.createdAt.toDate ? member.createdAt.toDate() : new Date(member.createdAt);
          return createdDate >= sevenDaysAgo;
        })
        .sort((a, b) => {
          const dateA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        });

      recentMembers.forEach(member => {
        const memberName = member.displayName || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Yeni Üye';
        let action = '';
        
        if (member.status === 'pending') {
          action = 'Yeni üyelik başvurusu yaptı';
        } else if (member.status === 'approved' || member.status === 'active') {
          action = 'Üyelik onaylandı';
        } else {
          action = 'Kayıt oldu';
        }

        activities.push({
          name: memberName,
          action: action,
          time: this.formatTimeAgo(member.createdAt),
          type: 'member',
          timestamp: member.createdAt
        });
      });

      // 2. NEW LESSON CREATIONS
      const lessonsSnapshot = await getDocs(collection(db, 'lessons'));
      const allLessons = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const recentLessons = allLessons
        .filter(lesson => {
          if (!lesson.createdAt || lesson.status === 'deleted') return false;
          const createdDate = lesson.createdAt.toDate ? lesson.createdAt.toDate() : new Date(lesson.createdAt);
          return createdDate >= sevenDaysAgo;
        })
        .sort((a, b) => {
          const dateA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        });

      recentLessons.forEach(lesson => {
        const lessonName = lesson.title || lesson.name || lesson.lessonType || 'Yeni Ders';
        const trainerName = lesson.trainerName || lesson.trainer || 'Eğitmen';
        
        activities.push({
          name: trainerName,
          action: `"${lessonName}" dersini oluşturdu`,
          time: this.formatTimeAgo(lesson.createdAt),
          type: 'lesson',
          timestamp: lesson.createdAt
        });
      });

      // 3. EQUIPMENT ADDITIONS
      try {
        const equipmentSnapshot = await getDocs(collection(db, 'equipment'));
        const allEquipment = equipmentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const recentEquipment = allEquipment
          .filter(equipment => {
            if (!equipment.createdAt) return false;
            const createdDate = equipment.createdAt.toDate ? equipment.createdAt.toDate() : new Date(equipment.createdAt);
            return createdDate >= sevenDaysAgo;
          })
          .sort((a, b) => {
            const dateA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB - dateA;
          });

        recentEquipment.forEach(equipment => {
          const equipmentName = equipment.name || equipment.title || 'Yeni Ekipman';
          
          activities.push({
            name: 'Admin',
            action: `"${equipmentName}" ekipmanı eklendi`,
            time: this.formatTimeAgo(equipment.createdAt),
            type: 'equipment',
            timestamp: equipment.createdAt
          });
        });
      } catch {
        // Equipment collection might not exist yet
      }

      // 4. FINANCIAL TRANSACTIONS
      const transactionsSnapshot = await getDocs(collection(db, 'transactions'));
      const allTransactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const recentTransactions = allTransactions
        .filter(transaction => {
          if (!transaction.createdAt) return false;
          const createdDate = transaction.createdAt.toDate ? transaction.createdAt.toDate() : new Date(transaction.createdAt);
          return createdDate >= sevenDaysAgo;
        })
        .sort((a, b) => {
          const dateA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        });

      recentTransactions.forEach(transaction => {
        const memberName = transaction.memberName || 'Üye';
        const amount = `₺${parseFloat(transaction.amount || 0).toLocaleString('tr-TR')}`;
        let action = '';
        
        if (transaction.type === 'income') {
          action = `${amount} ödeme yaptı`;
        } else if (transaction.type === 'expense' || transaction.type === 'outcome') {
          action = `${amount} gider kaydedildi`;
        } else {
          action = `${amount} işlem gerçekleşti`;
        }

        activities.push({
          name: memberName,
          action: action,
          time: this.formatTimeAgo(transaction.createdAt),
          type: transaction.type === 'income' ? 'payment' : 'expense',
          timestamp: transaction.createdAt
        });
      });

      // 5. TRAINER ADDITIONS
      try {
        const trainersSnapshot = await getDocs(collection(db, 'trainers'));
        const allTrainers = trainersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const recentTrainers = allTrainers
          .filter(trainer => {
            if (!trainer.createdAt) return false;
            const createdDate = trainer.createdAt.toDate ? trainer.createdAt.toDate() : new Date(trainer.createdAt);
            return createdDate >= sevenDaysAgo;
          })
          .sort((a, b) => {
            const dateA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB - dateA;
          });

        recentTrainers.forEach(trainer => {
          const trainerName = trainer.displayName || trainer.name || `${trainer.firstName || ''} ${trainer.lastName || ''}`.trim() || 'Yeni Eğitmen';
          
          activities.push({
            name: 'Admin',
            action: `${trainerName} eğitmen olarak eklendi`,
            time: this.formatTimeAgo(trainer.createdAt),
            type: 'trainer',
            timestamp: trainer.createdAt
          });
        });
      } catch {
        // Trainers collection might not exist yet
      }

      // 6. LESSON BOOKINGS/CANCELLATIONS
      try {
        const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
        const allBookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const recentBookings = allBookings
          .filter(booking => {
            if (!booking.createdAt) return false;
            const createdDate = booking.createdAt.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
            return createdDate >= sevenDaysAgo;
          })
          .sort((a, b) => {
            const dateA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB - dateA;
          });

        recentBookings.forEach(booking => {
          const memberName = booking.memberName || booking.userName || 'Üye';
          const lessonName = booking.lessonName || booking.lessonTitle || 'Ders';
          
          let action = '';
          if (booking.status === 'cancelled') {
            action = `${lessonName} dersini iptal etti`;
          } else {
            action = `${lessonName} dersini rezerve etti`;
          }

          activities.push({
            name: memberName,
            action: action,
            time: this.formatTimeAgo(booking.createdAt),
            type: 'booking',
            timestamp: booking.createdAt
          });
        });
      } catch {
        // Bookings collection might not exist yet
      }

      // Sort all activities by timestamp (most recent first)
      const sortedActivities = activities
        .filter(activity => activity.time !== 'Bilinmiyor')
        .sort((a, b) => {
          const timestampA = a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
          const timestampB = b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
          return timestampB - timestampA;
        })
        .slice(0, 15); // Show latest 15 activities

      return sortedActivities;
      
    } catch {
      return [];
    }
  }
  
  // Get weekly attendance data for chart
  async getWeeklyAttendance() {
    try {
      // Get all lessons from Firebase
      const lessonsSnapshot = await getDocs(collection(db, 'lessons'));
      const allLessons = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const weeklyData = [0, 0, 0, 0, 0, 0, 0]; // Mon to Sun
      const today = new Date();
      
      // Calculate the start of current week (Monday)
      const startOfWeek = new Date(today);
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysFromMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days to Monday
      startOfWeek.setDate(today.getDate() + daysFromMonday);
      startOfWeek.setHours(0, 0, 0, 0); // Set to start of day
      
      for (let i = 0; i < 7; i++) {
        const dayStart = new Date(startOfWeek);
        dayStart.setDate(startOfWeek.getDate() + i);
        dayStart.setHours(0, 0, 0, 0); // Start of day
        
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayStart.getDate() + 1);
        dayEnd.setHours(0, 0, 0, 0); // Start of next day (exclusive end)
        
        const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        let dayAttendance = 0;
        
        // Method 1: Check lessons with specific scheduled dates for this day
        const specificDateLessons = allLessons.filter(lesson => {
          if (!lesson.scheduledDate || lesson.status === 'deleted' || lesson.status === 'cancelled') return false;
          
          try {
            // Handle different date formats
            let lessonDate;
            if (lesson.scheduledDate.toDate) {
              lessonDate = lesson.scheduledDate.toDate();
            } else if (typeof lesson.scheduledDate === 'string') {
              lessonDate = new Date(lesson.scheduledDate);
            } else {
              return false;
            }
            
            return lessonDate >= dayStart && lessonDate < dayEnd;
          } catch {
            return false;
          }
        });
        
        specificDateLessons.forEach(lesson => {
          const participants = lesson.participants ? lesson.participants.length : 0;
          dayAttendance += participants;
        });
        
        // Method 2: Check recurring lessons by dayOfWeek
        const dayNamesLower = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const recurringLessons = allLessons.filter(lesson => {
          if (lesson.status === 'deleted' || lesson.status === 'cancelled') return false;
          if (!lesson.dayOfWeek) return false;
          if (lesson.scheduledDate) return false; // Only count recurring lessons without specific dates
          
          return lesson.dayOfWeek.toLowerCase() === dayNamesLower[i];
        });
        
        recurringLessons.forEach(lesson => {
          const participants = lesson.participants ? lesson.participants.length : 0;
          dayAttendance += participants;
        });
        
        weeklyData[i] = dayAttendance;
      }
      
      const totalWeekAttendance = weeklyData.reduce((sum, day) => sum + day, 0);
      
      // If current week has no data, look at recent weeks to provide meaningful data
      if (totalWeekAttendance === 0) {
        // Look at last 4 weeks for recent activity pattern
        for (let weekOffset = 1; weekOffset <= 4; weekOffset++) {
          const recentWeekStart = new Date(startOfWeek);
          recentWeekStart.setDate(startOfWeek.getDate() - (weekOffset * 7));
          
          for (let i = 0; i < 7; i++) {
            const dayStart = new Date(recentWeekStart);
            dayStart.setDate(recentWeekStart.getDate() + i);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayStart.getDate() + 1);
            
            // Count scheduled lessons from that week
            const recentLessons = allLessons.filter(lesson => {
              if (!lesson.scheduledDate || lesson.status === 'deleted' || lesson.status === 'cancelled') return false;
              
              try {
                let lessonDate;
                if (lesson.scheduledDate.toDate) {
                  lessonDate = lesson.scheduledDate.toDate();
                } else {
                  lessonDate = new Date(lesson.scheduledDate);
                }
                return lessonDate >= dayStart && lessonDate < dayEnd;
              } catch {
                return false;
              }
            });
            
            const dayParticipants = recentLessons.reduce((sum, lesson) => 
              sum + (lesson.participants ? lesson.participants.length : 0), 0);
            
            if (dayParticipants > 0) {
              weeklyData[i] += dayParticipants;
            }
          }
          
          // Break if we found some data
          const currentTotal = weeklyData.reduce((sum, day) => sum + day, 0);
          if (currentTotal > 0) break;
        }
      }
      
      const finalTotalAttendance = weeklyData.reduce((sum, day) => sum + day, 0);
      
      // Only use demo data if we still have absolutely no real data
      if (finalTotalAttendance === 0) {
        return [15, 23, 18, 28, 19, 12, 7]; // Monday to Sunday
      }
      
      return weeklyData;
    } catch (error) {
      // Return realistic demo data on error
      return [15, 23, 18, 28, 19, 12, 7];
    }
  }

  // Get daily attendance data for chart (TODAY's lessons by time slots)
  async getDailyAttendance() {
    try {
      const lessonsSnapshot = await getDocs(collection(db, 'lessons'));
      const allLessons = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 7 time slots to match the labels: ['00-04', '04-08', '08-12', '12-16', '16-20', '20-24', 'Diğer']
      const dailyData = [0, 0, 0, 0, 0, 0, 0];
      const timeSlots = [
        { start: 0, end: 4, label: '00:00-04:00' },   // 0: Midnight - 4 AM
        { start: 4, end: 8, label: '04:00-08:00' },   // 1: 4 AM - 8 AM
        { start: 8, end: 12, label: '08:00-12:00' },  // 2: 8 AM - Noon
        { start: 12, end: 16, label: '12:00-16:00' }, // 3: Noon - 4 PM  
        { start: 16, end: 20, label: '16:00-20:00' }, // 4: 4 PM - 8 PM
        { start: 20, end: 24, label: '20:00-24:00' }, // 5: 8 PM - Midnight
        { start: 0, end: 24, label: 'All Day' }       // 6: Fallback for invalid times
      ];
      
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayStart.getDate() + 1);
      
      // Filter TODAY's lessons only
      const todayLessons = allLessons.filter(lesson => {
        if (lesson.status === 'deleted' || lesson.status === 'cancelled') return false;
        
        // Method 1: Check lessons with specific scheduled dates for TODAY
        if (lesson.scheduledDate) {
          try {
            let lessonDate;
            if (lesson.scheduledDate.toDate) {
              lessonDate = lesson.scheduledDate.toDate();
            } else {
              lessonDate = new Date(lesson.scheduledDate);
            }
            const isToday = lessonDate >= todayStart && lessonDate < todayEnd;
            if (isToday) {
              return true;
            }
          } catch {
            // Skip invalid dates
          }
        }
        
        // Method 2: Check recurring lessons for TODAY's day of week
        if (lesson.dayOfWeek && !lesson.scheduledDate) {
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const todayDayName = dayNames[today.getDay()];
          const isRecurringToday = lesson.dayOfWeek.toLowerCase() === todayDayName.toLowerCase();
          if (isRecurringToday) {
            return true;
          }
        }
        
        return false;
      });
      
      // Categorize TODAY's lessons by time slots
      todayLessons.forEach(lesson => {
        const participants = lesson.participants ? lesson.participants.length : 0;
        
        if (participants > 0) {
          if (lesson.startTime) {
            try {
              // Parse time more carefully
              const timeParts = lesson.startTime.split(':');
              const hour = parseInt(timeParts[0]);
              
              // Validate hour is reasonable (0-23)
              if (isNaN(hour) || hour < 0 || hour > 23) {
                throw new Error(`Invalid hour: ${hour}`);
              }
              
              // Find the correct time slot
              let slotIndex = 6; // Default to "All Day" slot
              
              for (let i = 0; i < 6; i++) {
                if (hour >= timeSlots[i].start && hour < timeSlots[i].end) {
                  slotIndex = i;
                  break;
                }
              }
              
              dailyData[slotIndex] += participants;
              
            } catch (error) {
              // Add to "All Day" slot if time parsing fails
              dailyData[6] += participants;
            }
          } else {
            // No start time specified, add to "All Day" slot
            dailyData[6] += participants;
          }
        }
      });
      
      const totalTodayAttendance = dailyData.reduce((sum, block) => sum + block, 0);
      
      // If no lessons today, return empty data (not demo data)
      if (totalTodayAttendance === 0) {
        return [0, 0, 0, 0, 0, 0, 0];
      }
      
      return dailyData;
    } catch (error) {
      // Return empty data on error for today's view
      return [0, 0, 0, 0, 0, 0, 0];
    }
  }

  // Get monthly attendance data for chart (weekly breakdown)
  async getMonthlyAttendance() {
    try {
      const lessonsSnapshot = await getDocs(collection(db, 'lessons'));
      const allLessons = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const monthlyData = [0, 0, 0, 0]; // 4 weeks
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      // Calculate week starts within this month
      const weekStarts = [];
      let weekStart = new Date(startOfMonth);
      let weekIndex = 0;
      
      while (weekStart <= endOfMonth && weekIndex < 4) {
        weekStarts.push(new Date(weekStart));
        weekStart.setDate(weekStart.getDate() + 7);
        weekIndex++;
      }
      
      weekStarts.forEach((weekStart, weekIndex) => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        
        let weekAttendance = 0;
        
        // Count lessons with specific scheduled dates in this week
        const weekSpecificLessons = allLessons.filter(lesson => {
          if (!lesson.scheduledDate || lesson.status === 'deleted' || lesson.status === 'cancelled') return false;
          
          try {
            let lessonDate;
            if (lesson.scheduledDate.toDate) {
              lessonDate = lesson.scheduledDate.toDate();
            } else {
              lessonDate = new Date(lesson.scheduledDate);
            }
            return lessonDate >= weekStart && lessonDate < weekEnd;
          } catch {
            return false;
          }
        });
        
        weekSpecificLessons.forEach(lesson => {
          const participants = lesson.participants ? lesson.participants.length : 0;
          weekAttendance += participants;
        });
        
        // Also include recurring lessons (estimate weekly attendance)
        const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        dayNames.forEach(dayName => {
          const recurringLessons = allLessons.filter(lesson => 
            lesson.dayOfWeek === dayName && 
            lesson.status !== 'deleted' && 
            lesson.status !== 'cancelled' &&
            !lesson.scheduledDate // Only count recurring lessons without specific dates
          );
          
          recurringLessons.forEach(lesson => {
            const participants = lesson.participants ? lesson.participants.length : 0;
            weekAttendance += participants;
          });
        });
        
        monthlyData[weekIndex] = weekAttendance;
      });
      
      const totalMonthlyAttendance = monthlyData.reduce((sum, week) => sum + week, 0);
      
      // If no real data, use demo data
      if (totalMonthlyAttendance === 0) {
        return [72, 85, 78, 91]; // Weekly totals for the month
      }
      
      return monthlyData;
    } catch (error) {
      return [72, 85, 78, 91];
    }
  }
  
  // Format time ago helper
  formatTimeAgo(timestamp) {
    if (!timestamp) return 'Bilinmiyor';
    
    const now = new Date();
    const time = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Az önce';
    if (diffInMinutes < 60) return `${diffInMinutes} dakika önce`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} saat önce`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} gün önce`;
  }
  
  // Send notification (placeholder for now)
  async sendNotification(notificationData) {
    try {
      // Add notification to Firestore
      const notificationDoc = {
        ...notificationData,
        createdAt: serverTimestamp(),
        status: 'sent'
      };
      
      await addDoc(collection(db, 'notifications'), notificationDoc);
      
      return {
        success: true,
        message: 'Bildirim başarıyla gönderildi'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Bildirim gönderilirken hata oluştu'
      };
    }
  }

  // Get individual trainer statistics
  async getIndividualTrainerStats() {
    try {
      const [usersSnapshot, lessonsSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'lessons'))
      ]);

      // Get trainers from users collection with instructor/admin roles
      const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const trainers = allUsers.filter(user => 
        user.role === 'instructor' || user.role === 'admin' || user.role === 'trainer'
      );
      
      const lessons = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Also try to get bookings if collection exists
      let bookings = [];
      try {
        const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
        bookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        // Bookings collection not found, continuing without it
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(today.getDate() - today.getDay()); // Start of this week (Sunday)
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of this month


      // Helper function to get date from Firebase timestamp or string
      const getDateFromField = (field) => {
        if (!field) return null;
        try {
          return field.toDate ? field.toDate() : new Date(field);
        } catch {
          return null;
        }
      };

      // Filter active trainers only
      const activeTrainers = trainers.filter(trainer => 
        trainer.status === 'active' || !trainer.status
      );


      // Create individual trainer statistics
      const trainerStats = activeTrainers.map(trainer => {
        const trainerId = trainer.id;
        
        // Initialize trainer stats
        const stats = {
          id: trainerId,
          name: trainer.firstName && trainer.lastName 
            ? `${trainer.firstName} ${trainer.lastName}`
            : trainer.name || trainer.email?.split('@')[0] || 'Bilinmeyen Eğitmen',
          email: trainer.email || '',
          phone: trainer.phone || '',
          speciality: trainer.speciality || trainer.expertise || trainer.trainerProfile?.specializations?.join(', ') || 'Genel',
          avatar: trainer.photoURL || trainer.avatar || trainer.trainerProfile?.avatar || null,
          
          // Daily stats
          dailyLessons: 0,
          dailyAttendance: 0,
          dailyUniqueStudents: new Set(),
          
          // Weekly stats  
          weeklyLessons: 0,
          weeklyAttendance: 0,
          weeklyUniqueStudents: new Set(),
          
          // Monthly stats
          monthlyLessons: 0,
          monthlyAttendance: 0,
          monthlyUniqueStudents: new Set(),
          
          // Performance metrics
          rating: trainer.rating || 0,
          experience: trainer.experience || 0,
          joinDate: trainer.createdAt || trainer.joinDate || null
        };

        // Process lessons for this trainer
        lessons.forEach(lesson => {
          // Check if this lesson belongs to this trainer - multiple ways to match
          const lessonTrainerId = lesson.trainerId || lesson.instructor || lesson.teacherId;
          const lessonTrainerName = lesson.trainerName || lesson.instructor || lesson.teacher;
          
          // Match by ID first, then by name, then by email
          const trainerMatches = 
            lessonTrainerId === trainerId ||
            lessonTrainerName === trainer.email ||
            lessonTrainerName === `${trainer.firstName} ${trainer.lastName}` ||
            lessonTrainerName === trainer.name ||
            (trainer.firstName && lessonTrainerName && 
             lessonTrainerName.toLowerCase().includes(trainer.firstName.toLowerCase()));
          
          if (!trainerMatches) return;

          const lessonDate = getDateFromField(lesson.scheduledDate || lesson.date || lesson.createdAt);
          if (!lessonDate) return;

          // Skip cancelled or deleted lessons
          if (lesson.status === 'cancelled' || lesson.status === 'deleted') return;

          const isToday = lessonDate.toDateString() === today.toDateString();
          const isThisWeek = lessonDate >= thisWeekStart && lessonDate <= now;
          const isThisMonth = lessonDate >= thisMonthStart && lessonDate <= now;

          // Count lessons
          if (isToday) stats.dailyLessons++;
          if (isThisWeek) stats.weeklyLessons++;
          if (isThisMonth) stats.monthlyLessons++;

          // Count attendance from lesson participants
          const participants = lesson.participants || [];
          const attendees = lesson.attendees || [];
          const attendeeCount = lesson.attendeeCount || Math.max(participants.length, attendees.length) || 0;

          if (isToday) {
            stats.dailyAttendance += attendeeCount;
            participants.forEach(p => stats.dailyUniqueStudents.add(p));
            attendees.forEach(p => stats.dailyUniqueStudents.add(p));
          }
          if (isThisWeek) {
            stats.weeklyAttendance += attendeeCount;
            participants.forEach(p => stats.weeklyUniqueStudents.add(p));
            attendees.forEach(p => stats.weeklyUniqueStudents.add(p));
          }
          if (isThisMonth) {
            stats.monthlyAttendance += attendeeCount;
            participants.forEach(p => stats.monthlyUniqueStudents.add(p));
            attendees.forEach(p => stats.monthlyUniqueStudents.add(p));
          }
        });

        // Process bookings for this trainer
        bookings.forEach(booking => {
          const bookingTrainerId = booking.trainerId || booking.instructorId;
          const bookingTrainerName = booking.trainerName || booking.instructorName;
          
          // Match by ID first, then by name
          const trainerMatches = 
            bookingTrainerId === trainerId ||
            bookingTrainerName === trainer.email ||
            bookingTrainerName === `${trainer.firstName} ${trainer.lastName}` ||
            bookingTrainerName === trainer.name;
          
          if (!trainerMatches) return;

          const bookingDate = getDateFromField(booking.date || booking.scheduledDate || booking.createdAt);
          if (!bookingDate) return;

          // Only count attended bookings
          if (booking.status !== 'attended' && booking.status !== 'completed') return;

          const isToday = bookingDate.toDateString() === today.toDateString();
          const isThisWeek = bookingDate >= thisWeekStart && bookingDate <= now;
          const isThisMonth = bookingDate >= thisMonthStart && bookingDate <= now;

          if (isToday) {
            stats.dailyAttendance += 1;
            if (booking.userId) stats.dailyUniqueStudents.add(booking.userId);
          }
          if (isThisWeek) {
            stats.weeklyAttendance += 1;
            if (booking.userId) stats.weeklyUniqueStudents.add(booking.userId);
          }
          if (isThisMonth) {
            stats.monthlyAttendance += 1;
            if (booking.userId) stats.monthlyUniqueStudents.add(booking.userId);
          }
        });

        // Convert Sets to numbers and calculate additional metrics
        return {
          ...stats,
          dailyUniqueStudents: stats.dailyUniqueStudents.size,
          weeklyUniqueStudents: stats.weeklyUniqueStudents.size,
          monthlyUniqueStudents: stats.monthlyUniqueStudents.size,
          
          // Calculate averages
          dailyAvgAttendance: stats.dailyLessons > 0 ? (stats.dailyAttendance / stats.dailyLessons).toFixed(1) : 0,
          weeklyAvgAttendance: stats.weeklyLessons > 0 ? (stats.weeklyAttendance / stats.weeklyLessons).toFixed(1) : 0,
          monthlyAvgAttendance: stats.monthlyLessons > 0 ? (stats.monthlyAttendance / stats.monthlyLessons).toFixed(1) : 0,
          
          // Performance score (weighted by monthly activity)
          performanceScore: (stats.monthlyLessons * 10) + (stats.monthlyAttendance * 5) + (stats.monthlyUniqueStudents * 2),
          
          // Activity level
          activityLevel: stats.monthlyLessons >= 10 ? 'Yüksek' : stats.monthlyLessons >= 5 ? 'Orta' : stats.monthlyLessons > 0 ? 'Düşük' : 'Pasif'
        };
      });

      // Sort trainers by performance score (most active first)
      const sortedTrainers = trainerStats.sort((a, b) => b.performanceScore - a.performanceScore);


      return {
        success: true,
        data: sortedTrainers
      };

    } catch (error) {
      console.error('Error fetching individual trainer stats:', error);
      return {
        success: false,
        error: 'Eğitmen istatistikleri alınırken hata oluştu: ' + error.message
      };
    }
  }

  // Get top performing trainers
  async getTopTrainers(limit = 5) {
    try {
      const statsResult = await this.getTrainerStats();
      if (!statsResult.success) {
        return statsResult;
      }

      const topTrainers = statsResult.data.trainerDetails
        .slice(0, limit)
        .map(trainer => ({
          id: trainer.id,
          name: trainer.name,
          speciality: trainer.speciality,
          monthlyLessons: trainer.monthlyLessons,
          monthlyAttendance: trainer.monthlyAttendance,
          totalStudents: trainer.totalStudents,
          averageStudentsPerLesson: trainer.averageStudentsPerLesson,
          rating: trainer.rating
        }));

      return {
        success: true,
        data: topTrainers
      };

    } catch (error) {
      console.error('Error fetching top trainers:', error);
      return {
        success: false,
        error: 'En iyi eğitmenler alınırken hata oluştu'
      };
    }
  }
}

const dashboardService = new DashboardService();
export default dashboardService;