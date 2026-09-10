// Reports Service
import { 
  collection, 
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';
import trainersService from './trainersService';
import { buildTrainerMonthlyStats, trainerStatsToCsvRows } from './trainerLessonStats';
import { lessonDateKey } from './lessonDateKey';

// Mirrors scheduleService.normalizeDate for the date shapes stored on lessons.
const normalizeLessonDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object' && typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'object' && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

class ReportsService {
  constructor() {
    this.usersCollection = 'users';
    this.equipmentCollection = 'equipment';
    this.faultsCollection = 'equipment_faults';
    this.transactionsCollection = 'transactions';
    this.trainersCollection = 'users'; // trainers are also users
  }

  // Get member details report
  async getMemberDetailsReport() {
    try {
      console.log('🔄 Generating member details report...');
      
      const usersCollection = collection(db, this.usersCollection);
      const querySnapshot = await getDocs(usersCollection);
      
      const members = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        
        // Filter: Only include customers (skip instructors and admins)
        if (userData.role && userData.role !== 'customer') {
          return; // Skip non-customer users
        }
        
        // Get expiry date from packageInfo or direct field
        const expiryDate = userData.packageExpiryDate || userData.packageInfo?.expiryDate;
        const expiryDateObj = expiryDate ? new Date(expiryDate) : null;
        
        members.push({
          id: doc.id,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          displayName: userData.displayName || '',
          email: userData.email || '',
          phone: userData.phone || '',
          status: userData.status || '',
          membershipStatus: userData.membershipStatus || '',
          remainingClasses: userData.remainingClasses || 0,
          packageName: userData.packageInfo?.packageName || userData.packageName || '-',
          packageExpiryDate: expiryDateObj ? expiryDateObj.toLocaleDateString('tr-TR') : '-',
          membershipType: userData.membershipType || '-',
          // Format dates for display
          registrationDate: userData.createdAt?.seconds ? 
            new Date(userData.createdAt.seconds * 1000).toLocaleDateString('tr-TR') : 
            userData.createdAt ? new Date(userData.createdAt).toLocaleDateString('tr-TR') : '-',
          approvedAt: userData.approvedAt ? 
            new Date(userData.approvedAt).toLocaleDateString('tr-TR') : '-'
        });
      });

      console.log(`✅ Generated report for ${members.length} members (customers only)`);
      
      return {
        success: true,
        data: members,
        reportType: 'memberDetails',
        generatedAt: new Date().toLocaleString('tr-TR')
      };
    } catch (error) {
      console.error('❌ Error generating member details report:', error);
      return {
        success: false,
        error: 'Üye detay raporu oluşturulurken bir hata oluştu.'
      };
    }
  }

  // Get expired members report
  async getExpiredMembersReport() {
    try {
      console.log('🔄 Generating expired members report...');
      
      // Check both users and members collections
      const usersCollection = collection(db, this.usersCollection);
      const membersCollection = collection(db, 'members');
      
      const [usersSnapshot, membersSnapshot] = await Promise.all([
        getDocs(usersCollection),
        getDocs(membersCollection)
      ]);
      
      const expiredMembers = [];
      const today = new Date();
      
      // Check users collection
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        
        // Only show customers (not instructors or admins)
        const isCustomer = !userData.role || userData.role === 'customer';
        if (!isCustomer) return;
        
        const membershipEndDate = userData.membershipEndDate ? new Date(userData.membershipEndDate) : null;
        const packageExpiryDate = userData.packageExpiryDate ? new Date(userData.packageExpiryDate) : null;
        const remainingClasses = userData.remainingClasses || 0;
        
        // Consider expired if:
        // 1. Has membershipEndDate and it's past
        // 2. Has 0 remaining classes (but not unlimited membership)
        // 3. Has packageExpiryDate and it's past with remaining classes > 0
        const isExpiredByDate = membershipEndDate && membershipEndDate < today;
        const isExpiredByClasses = remainingClasses === 0 && userData.membershipType !== 'unlimited';
        const isExpiredByPackage = packageExpiryDate && packageExpiryDate < today && remainingClasses > 0 && userData.membershipType !== 'unlimited';
        
        if (isExpiredByDate || isExpiredByClasses || isExpiredByPackage) {
          let expiredReason = 'Ders sayısı bitti';
          let expiryDate = membershipEndDate;
          
          if (isExpiredByPackage) {
            expiredReason = 'Paket süresi doldu (kullanılmayan krediler var)';
            expiryDate = packageExpiryDate;
          } else if (isExpiredByDate) {
            expiredReason = 'Üyelik süresi doldu';
          }
          
          expiredMembers.push({
            id: doc.id,
            ...userData,
            membershipEndDate: membershipEndDate ? membershipEndDate.toLocaleDateString('tr-TR') : 'Tarih belirtilmemiş',
            packageExpiryDate: packageExpiryDate ? packageExpiryDate.toLocaleDateString('tr-TR') : 'Tarih belirtilmemiş',
            daysExpired: expiryDate ? Math.floor((today - expiryDate) / (1000 * 60 * 60 * 24)) : 0,
            expiredReason: expiredReason,
            membershipType: this.getMembershipTypeLabel(userData.membershipType),
            hasUnusedCredits: isExpiredByPackage ? remainingClasses : 0
          });
        }
      });
      
      // Check members collection
      membersSnapshot.forEach((doc) => {
        const memberData = doc.data();
        
        // Only show customers (not instructors or admins)
        const isCustomer = !memberData.role || memberData.role === 'customer';
        if (!isCustomer) return;
        
        const membershipEndDate = memberData.membershipEndDate ? new Date(memberData.membershipEndDate) : null;
        const packageExpiryDate = memberData.packageExpiryDate ? new Date(memberData.packageExpiryDate) : null;
        const remainingClasses = memberData.remainingClasses || 0;
        
        const isExpiredByDate = membershipEndDate && membershipEndDate < today;
        const isExpiredByClasses = remainingClasses === 0 && memberData.membershipType !== 'unlimited';
        const isExpiredByPackage = packageExpiryDate && packageExpiryDate < today && remainingClasses > 0 && memberData.membershipType !== 'unlimited';
        
        if (isExpiredByDate || isExpiredByClasses || isExpiredByPackage) {
          // Avoid duplicates by checking if ID already exists
          const existingMember = expiredMembers.find(m => m.id === doc.id);
          if (!existingMember) {
            let expiredReason = 'Ders sayısı bitti';
            let expiryDate = membershipEndDate;
            
            if (isExpiredByPackage) {
              expiredReason = 'Paket süresi doldu (kullanılmayan krediler var)';
              expiryDate = packageExpiryDate;
            } else if (isExpiredByDate) {
              expiredReason = 'Üyelik süresi doldu';
            }
            
            expiredMembers.push({
              id: doc.id,
              ...memberData,
              membershipEndDate: membershipEndDate ? membershipEndDate.toLocaleDateString('tr-TR') : 'Tarih belirtilmemiş',
              packageExpiryDate: packageExpiryDate ? packageExpiryDate.toLocaleDateString('tr-TR') : 'Tarih belirtilmemiş',
              daysExpired: expiryDate ? Math.floor((today - expiryDate) / (1000 * 60 * 60 * 24)) : 0,
              expiredReason: expiredReason,
              membershipType: this.getMembershipTypeLabel(memberData.membershipType),
              hasUnusedCredits: isExpiredByPackage ? remainingClasses : 0
            });
          }
        }
      });

      console.log(`✅ Found ${expiredMembers.length} expired members`);
      
      return {
        success: true,
        data: expiredMembers,
        reportType: 'expiredMembers',
        generatedAt: new Date().toLocaleString('tr-TR')
      };
    } catch (error) {
      console.error('❌ Error generating expired members report:', error);
      return {
        success: false,
        error: 'Biten üyelik raporu oluşturulurken bir hata oluştu.'
      };
    }
  }

  // Get new members report
  async getNewMembersReport(days = 30) {
    try {
      console.log(`🔄 Generating new members report for last ${days} days...`);
      
      const usersCollection = collection(db, this.usersCollection);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const querySnapshot = await getDocs(usersCollection);
      
      const newMembers = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        const createdAt = userData.createdAt?.seconds ? new Date(userData.createdAt.seconds * 1000) : null;
        
        if (createdAt && createdAt >= cutoffDate) {
          newMembers.push({
            id: doc.id,
            ...userData,
            registrationDate: createdAt.toLocaleDateString('tr-TR'),
            daysAgo: Math.floor((new Date() - createdAt) / (1000 * 60 * 60 * 24))
          });
        }
      });

      console.log(`✅ Found ${newMembers.length} new members`);
      
      return {
        success: true,
        data: newMembers,
        reportType: 'newMembers',
        generatedAt: new Date().toLocaleString('tr-TR'),
        period: `Son ${days} gün`
      };
    } catch (error) {
      console.error('❌ Error generating new members report:', error);
      return {
        success: false,
        error: 'Başlayan üyelik raporu oluşturulurken bir hata oluştu.'
      };
    }
  }

  // Get transferred members report
  async getTransferredMembersReport() {
    try {
      console.log('🔄 Generating transferred members report...');
      
      const usersCollection = collection(db, this.usersCollection);
      const querySnapshot = await getDocs(usersCollection);
      
      const transferredMembers = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        
        // Check if member has transfer history or is marked as transferred
        if (userData.transferHistory || userData.status === 'transferred' || userData.isTransferred) {
          transferredMembers.push({
            id: doc.id,
            ...userData,
            transferDate: userData.transferDate ? 
              new Date(userData.transferDate).toLocaleDateString('tr-TR') : '',
            previousLocation: userData.transferHistory?.from || '',
            currentLocation: userData.transferHistory?.to || userData.location || ''
          });
        }
      });

      console.log(`✅ Found ${transferredMembers.length} transferred members`);
      
      return {
        success: true,
        data: transferredMembers,
        reportType: 'transferredMembers',
        generatedAt: new Date().toLocaleString('tr-TR')
      };
    } catch (error) {
      console.error('❌ Error generating transferred members report:', error);
      return {
        success: false,
        error: 'Devredilen üyelik raporu oluşturulurken bir hata oluştu.'
      };
    }
  }

  // Get frozen members report
  async getFrozenMembersReport() {
    try {
      console.log('🔄 Generating frozen members report...');
      
      // Check both users and members collections for frozen users
      const usersCollection = collection(db, this.usersCollection);
      const membersCollection = collection(db, 'members');
      
      const [usersSnapshot, membersSnapshot] = await Promise.all([
        getDocs(usersCollection),
        getDocs(membersCollection)
      ]);
      
      const frozenMembers = [];
      
      // Check users collection
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        
        if (userData.membershipStatus === 'frozen' || userData.status === 'frozen' || userData.isFrozen) {
          frozenMembers.push({
            id: doc.id,
            ...userData,
            freezeStartDate: userData.freezeStartDate ? 
              new Date(userData.freezeStartDate).toLocaleDateString('tr-TR') : 'Tarih belirtilmemiş',
            freezeEndDate: userData.freezeEndDate ? 
              new Date(userData.freezeEndDate).toLocaleDateString('tr-TR') : 'Süresiz',
            freezeReason: userData.freezeReason || 'Sebep belirtilmemiş',
            membershipType: this.getMembershipTypeLabel(userData.membershipType)
          });
        }
      });
      
      // Check members collection
      membersSnapshot.forEach((doc) => {
        const memberData = doc.data();
        
        if (memberData.membershipStatus === 'frozen' || memberData.status === 'frozen' || memberData.isFrozen) {
          // Avoid duplicates by checking if ID already exists
          const existingMember = frozenMembers.find(m => m.id === doc.id);
          if (!existingMember) {
            frozenMembers.push({
              id: doc.id,
              ...memberData,
              freezeStartDate: memberData.freezeStartDate ? 
                new Date(memberData.freezeStartDate).toLocaleDateString('tr-TR') : 'Tarih belirtilmemiş',
              freezeEndDate: memberData.freezeEndDate ? 
                new Date(memberData.freezeEndDate).toLocaleDateString('tr-TR') : 'Süresiz',
              freezeReason: memberData.freezeReason || 'Sebep belirtilmemiş',
              membershipType: this.getMembershipTypeLabel(memberData.membershipType)
            });
          }
        }
      });

      console.log(`✅ Found ${frozenMembers.length} frozen members`);
      
      return {
        success: true,
        data: frozenMembers,
        reportType: 'frozenMembers',
        generatedAt: new Date().toLocaleString('tr-TR')
      };
    } catch (error) {
      console.error('❌ Error generating frozen members report:', error);
      return {
        success: false,
        error: 'Durdurulan üyelik raporu oluşturulurken bir hata oluştu.'
      };
    }
  }

  // Get deleted members report
  async getDeletedMembersReport() {
    try {
      console.log('🔄 Generating deleted members report...');
      
      // Check both users and members collections for deleted users
      const usersCollection = collection(db, this.usersCollection);
      const membersCollection = collection(db, 'members');
      
      const [usersSnapshot, membersSnapshot] = await Promise.all([
        getDocs(usersCollection),
        getDocs(membersCollection)
      ]);
      
      const deletedMembers = [];
      
      // Check users collection
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        
        // Only show deleted customers (not instructors or admins)
        const isDeleted = userData.status === 'permanently_deleted' || 
                          userData.membershipStatus === 'deleted' ||
                          userData.loginDisabled === true;
        
        const isCustomer = !userData.role || userData.role === 'customer';
        
        if (isDeleted && isCustomer) {
          deletedMembers.push({
            id: doc.id,
            ...userData,
            deletedAt: userData.deletedAt ? 
              new Date(userData.deletedAt).toLocaleDateString('tr-TR') : 'Tarih belirtilmemiş',
            deletionReason: userData.deletionReason || 'Sebep belirtilmemiş',
            // Who performed the deletion. Records written before 2026-09-08 only
            // carry the literal string 'admin', so there is no name to show.
            deletedByLabel: userData.deletedByName
              || (userData.deletedBy && userData.deletedBy !== 'admin' ? userData.deletedBy : 'Bilinmiyor (eski kayıt)'),
            lastVisit: userData.lastVisit ? 
              new Date(userData.lastVisit).toLocaleDateString('tr-TR') : 'Hiç ziyaret etmedi',
            membershipType: this.getMembershipTypeLabel(userData.membershipType)
          });
        }
      });
      
      // Check members collection
      membersSnapshot.forEach((doc) => {
        const memberData = doc.data();
        
        const isDeleted = memberData.status === 'permanently_deleted' || 
                          memberData.membershipStatus === 'deleted';
        
        const isCustomer = !memberData.role || memberData.role === 'customer';
        
        if (isDeleted && isCustomer) {
          // Avoid duplicates by checking if ID already exists
          const existingMember = deletedMembers.find(m => m.id === doc.id);
          if (!existingMember) {
            deletedMembers.push({
              id: doc.id,
              ...memberData,
              deletedAt: memberData.deletedAt ? 
                new Date(memberData.deletedAt).toLocaleDateString('tr-TR') : 'Tarih belirtilmemiş',
              deletionReason: memberData.deletionReason || 'Sebep belirtilmemiş',
              deletedByLabel: memberData.deletedByName
                || (memberData.deletedBy && memberData.deletedBy !== 'admin' ? memberData.deletedBy : 'Bilinmiyor (eski kayıt)'),
              lastVisit: memberData.lastVisit ? 
                new Date(memberData.lastVisit).toLocaleDateString('tr-TR') : 'Hiç ziyaret etmedi',
              membershipType: this.getMembershipTypeLabel(memberData.membershipType)
            });
          }
        }
      });

      // Sort by deletion date (newest first)
      deletedMembers.sort((a, b) => {
        const dateA = a.deletedAt === 'Tarih belirtilmemiş' ? new Date(0) : new Date(a.deletedAt);
        const dateB = b.deletedAt === 'Tarih belirtilmemiş' ? new Date(0) : new Date(b.deletedAt);
        return dateB - dateA;
      });

      console.log(`✅ Found ${deletedMembers.length} deleted members`);
      
      return {
        success: true,
        data: deletedMembers,
        reportType: 'deletedMembers',
        generatedAt: new Date().toLocaleString('tr-TR')
      };
    } catch (error) {
      console.error('❌ Error generating deleted members report:', error);
      return {
        success: false,
        error: 'Silinen üyeler raporu oluşturulurken bir hata oluştu.'
      };
    }
  }

  // Helper method to get membership type label
  getMembershipTypeLabel(membershipType) {
    const types = {
      'basic': 'Temel',
      'premium': 'Premium', 
      'unlimited': 'Sınırsız'
    };
    return types[membershipType] || membershipType || 'Belirtilmemiş';
  }
  async getCancelledMembersReport() {
    try {
      console.log('🔄 Generating cancelled members report...');
      
      // Check both users and members collections for cancelled users
      const usersCollection = collection(db, this.usersCollection);
      const membersCollection = collection(db, 'members');
      
      const [usersSnapshot, membersSnapshot] = await Promise.all([
        getDocs(usersCollection),
        getDocs(membersCollection)
      ]);
      
      const cancelledMembers = [];
      
      // Check users collection
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        
        if (userData.membershipStatus === 'cancelled' || userData.status === 'cancelled') {
          cancelledMembers.push({
            id: doc.id,
            ...userData,
            cancellationDate: userData.cancellationDate ? 
              new Date(userData.cancellationDate).toLocaleDateString('tr-TR') : 'Tarih belirtilmemiş',
            cancellationReason: userData.cancellationReason || 'Sebep belirtilmemiş',
            refundAmount: userData.refundAmount || 0,
            membershipType: this.getMembershipTypeLabel(userData.membershipType)
          });
        }
      });
      
      // Check members collection
      membersSnapshot.forEach((doc) => {
        const memberData = doc.data();
        
        if (memberData.membershipStatus === 'cancelled' || memberData.status === 'cancelled') {
          // Avoid duplicates by checking if ID already exists
          const existingMember = cancelledMembers.find(m => m.id === doc.id);
          if (!existingMember) {
            cancelledMembers.push({
              id: doc.id,
              ...memberData,
              cancellationDate: memberData.cancellationDate ? 
                new Date(memberData.cancellationDate).toLocaleDateString('tr-TR') : 'Tarih belirtilmemiş',
              cancellationReason: memberData.cancellationReason || 'Sebep belirtilmemiş',
              refundAmount: memberData.refundAmount || 0,
              membershipType: this.getMembershipTypeLabel(memberData.membershipType)
            });
          }
        }
      });

      console.log(`✅ Found ${cancelledMembers.length} cancelled members`);
      
      return {
        success: true,
        data: cancelledMembers,
        reportType: 'cancelledMembers',
        generatedAt: new Date().toLocaleString('tr-TR')
      };
    } catch (error) {
      console.error('❌ Error generating cancelled members report:', error);
      return {
        success: false,
        error: 'İptal edilen üyelik raporu oluşturulurken bir hata oluştu.'
      };
    }
  }

  // Get notifications report
  async getNotificationsReport() {
    try {
      console.log('🔄 Fetching notifications from Firebase...');
      
      // Fetch actual notifications from Firebase
      const notificationsCollection = collection(db, 'notifications');
      const querySnapshot = await getDocs(notificationsCollection);
      
      const notifications = [];
      
      querySnapshot.forEach((doc) => {
        const notificationData = doc.data();
        
        // Format notification data
        notifications.push({
          id: doc.id,
          memberName: notificationData.recipientName || notificationData.title || 'Bilinmeyen',
          type: notificationData.type || 'general',
          message: notificationData.body || notificationData.message || 'Mesaj yok',
          priority: notificationData.priority || 'medium',
          date: notificationData.createdAt ? 
            (notificationData.createdAt.seconds ? 
              new Date(notificationData.createdAt.seconds * 1000).toLocaleString('tr-TR') : 
              new Date(notificationData.createdAt).toLocaleString('tr-TR')
            ) : 'Tarih belirtilmemiş',
          status: notificationData.status || 'sent',
          recipientId: notificationData.recipientId || notificationData.userId || '-'
        });
      });

      // Sort by date (newest first)
      notifications.sort((a, b) => {
        const dateA = a.date === 'Tarih belirtilmemiş' ? new Date(0) : new Date(a.date);
        const dateB = b.date === 'Tarih belirtilmemiş' ? new Date(0) : new Date(b.date);
        return dateB - dateA;
      });

      console.log(`✅ Fetched ${notifications.length} notifications from Firebase`);
      
      return {
        success: true,
        data: notifications,
        reportType: 'notifications',
        generatedAt: new Date().toLocaleString('tr-TR')
      };
    } catch (error) {
      console.error('❌ Error fetching notifications report:', error);
      return {
        success: false,
        error: 'Bildirimler raporu oluşturulurken bir hata oluştu.'
      };
    }
  }

  // Get summary statistics for dashboard
  async getSummaryStatistics() {
    try {
      console.log('🔄 Generating summary statistics...');
      
      const [
        memberDetails,
        expiredMembers,
        newMembers,
        frozenMembers,
        cancelledMembers,
        deletedMembers
      ] = await Promise.all([
        this.getMemberDetailsReport(),
        this.getExpiredMembersReport(),
        this.getNewMembersReport(),
        this.getFrozenMembersReport(),
        this.getCancelledMembersReport(),
        this.getDeletedMembersReport()
      ]);

      const stats = {
        totalMembers: memberDetails.success ? memberDetails.data.length : 0,
        activeMembers: memberDetails.success ? 
          memberDetails.data.filter(m => m.membershipStatus === 'active').length : 0,
        expiredMembers: expiredMembers.success ? expiredMembers.data.length : 0,
        newMembers: newMembers.success ? newMembers.data.length : 0,
        frozenMembers: frozenMembers.success ? frozenMembers.data.length : 0,
        cancelledMembers: cancelledMembers.success ? cancelledMembers.data.length : 0,
        deletedMembers: deletedMembers.success ? deletedMembers.data.length : 0
      };

      return {
        success: true,
        data: stats,
        generatedAt: new Date().toLocaleString('tr-TR')
      };
    } catch (error) {
      console.error('❌ Error generating summary statistics:', error);
      return {
        success: false,
        error: 'Özet istatistikler oluşturulurken bir hata oluştu.'
      };
    }
  }

  // Get package expiration management report
  async getPackageExpirationReport() {
    try {
      console.log('🔄 Generating package expiration management report...');
      
      const today = new Date();
      const expirationData = {
        expiredWithCredits: [],
        expiringSoon: [],
        recentlyExpired: []
      };
      
      // Check both collections
      const [membersSnapshot, usersSnapshot] = await Promise.all([
        getDocs(collection(db, 'members')),
        getDocs(collection(db, 'users'))
      ]);
      
      const processedIds = new Set();
      
      console.log(`📋 Found ${membersSnapshot.size} documents in members collection`);
      console.log(`📋 Found ${usersSnapshot.size} documents in users collection`);
      
      // Process members collection
      membersSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`\n--- Processing from members collection: ${doc.id} ---`);
        this.categorizePackageExpiration(doc.id, data, today, expirationData, processedIds);
      });
      
      // Process users collection (avoid duplicates)
      usersSnapshot.forEach((doc) => {
        if (!processedIds.has(doc.id)) {
          const data = doc.data();
          console.log(`\n--- Processing from users collection: ${doc.id} ---`);
          this.categorizePackageExpiration(doc.id, data, today, expirationData, processedIds);
        } else {
          console.log(`⏭️ Skipping duplicate user: ${doc.id}`);
        }
      });
      
      console.log(`✅ Package expiration report generated successfully`);
      console.log(`📊 Results:`, {
        expiredWithCredits: expirationData.expiredWithCredits.length,
        expiringSoon: expirationData.expiringSoon.length,
        recentlyExpired: expirationData.recentlyExpired.length,
        totalProcessed: processedIds.size
      });
      
      return {
        success: true,
        data: expirationData,
        reportType: 'packageExpiration',
        generatedAt: new Date().toLocaleString('tr-TR'),
        summary: {
          expiredWithCredits: expirationData.expiredWithCredits.length,
          expiringSoon: expirationData.expiringSoon.length,
          recentlyExpired: expirationData.recentlyExpired.length
        }
      };
    } catch (error) {
      console.error('❌ Error generating package expiration report:', error);
      return {
        success: false,
        error: 'Paket süre dolumu raporu oluşturulurken hata oluştu.'
      };
    }
  }

  // Helper function to categorize package expiration status
  categorizePackageExpiration(memberId, memberData, today, expirationData, processedIds) {
    processedIds.add(memberId);
    
    const userName = memberData.displayName || memberData.firstName || memberData.email || memberId;
    
    // Only process customers (not instructors or admins)
    const isCustomer = !memberData.role || memberData.role === 'customer';
    if (!isCustomer) {
      console.log(`❌ SKIP: ${userName} - Not a customer (role: ${memberData.role})`);
      return;
    }
    
    console.log(`✅ Processing customer: ${userName}`);
    
    // Try both packageExpiryDate and packageInfo.expiryDate
    const packageExpiryDate = memberData.packageExpiryDate 
      ? new Date(memberData.packageExpiryDate) 
      : (memberData.packageInfo?.expiryDate ? new Date(memberData.packageInfo.expiryDate) : null);
    
    const remainingClasses = memberData.remainingClasses || memberData.lessonCredits || 0;
    const membershipType = memberData.membershipType;
    
    // Check status - handle both web (membershipStatus) and mobile (status) fields
    const membershipStatus = memberData.membershipStatus || memberData.status;
    const isActive = memberData.isActive;
    
    // Debug logging
    console.log(`   📦 Package expiry: ${packageExpiryDate ? packageExpiryDate.toLocaleDateString('tr-TR') : '❌ NOT SET'}`);
    console.log(`   🎓 Remaining classes: ${remainingClasses}`);
    console.log(`   📊 Membership type: ${membershipType || '❌ NOT SET'}`);
    console.log(`   ✓ Status: ${membershipStatus || '❌ NOT SET'} | isActive: ${isActive}`);
    console.log(`   📅 Today: ${today.toLocaleDateString('tr-TR')}`);
    
    // Skip unlimited memberships
    if (membershipType === 'unlimited') {
      console.log(`   ❌ SKIP: Unlimited membership`);
      return;
    }
    
    // Only skip if explicitly inactive
    const inactiveStatuses = ['deleted', 'frozen', 'cancelled', 'permanently_deleted', 'inactive', 'rejected'];
    
    if (membershipStatus && inactiveStatuses.includes(membershipStatus)) {
      console.log(`   ❌ SKIP: Inactive status (${membershipStatus})`);
      return;
    }
    
    // For mobile app users: skip if isActive is explicitly false
    if (isActive === false) {
      console.log(`   ❌ SKIP: isActive is false`);
      return;
    }
    
    const memberInfo = {
      id: memberId,
      name: memberData.displayName || `${memberData.firstName || ''} ${memberData.lastName || ''}`.trim() || 'İsimsiz',
      email: memberData.email || '-',
      phone: memberData.phone || '-',
      remainingClasses: remainingClasses,
      packageExpiryDate: packageExpiryDate ? packageExpiryDate.toLocaleDateString('tr-TR') : 'Belirtilmemiş',
      membershipType: this.getMembershipTypeLabel(membershipType),
      joinDate: memberData.joinDate || memberData.createdAt
    };
    
    if (packageExpiryDate) {
      const daysDifference = Math.ceil((packageExpiryDate - today) / (1000 * 60 * 60 * 24));
      
      console.log(`   ⏱️  Days until expiry: ${daysDifference} (negative = expired)`);
      
      if (daysDifference < 0 && remainingClasses > 0) {
        // Expired with unused credits
        console.log(`   ✅ ADDED TO: 🚨 Expired with Credits (expired ${Math.abs(daysDifference)} days ago)`);
        expirationData.expiredWithCredits.push({
          ...memberInfo,
          daysExpired: Math.abs(daysDifference),
          actionRequired: 'Reset credits to zero'
        });
      } else if (daysDifference >= 0 && daysDifference <= 7 && remainingClasses > 0) {
        // Expiring soon
        console.log(`   ✅ ADDED TO: ⚠️  Expiring Soon (${daysDifference} days left)`);
        expirationData.expiringSoon.push({
          ...memberInfo,
          daysUntilExpiry: daysDifference,
          actionRequired: daysDifference === 0 ? 'Expires today' : `Expires in ${daysDifference} days`
        });
      } else if (daysDifference < 0 && remainingClasses === 0) {
        // Recently expired (already processed)
        console.log(`   ✅ ADDED TO: ✔️  Recently Expired (already processed)`);
        expirationData.recentlyExpired.push({
          ...memberInfo,
          daysExpired: Math.abs(daysDifference),
          actionRequired: 'Already processed'
        });
      } else {
        console.log(`   ❌ NOT ADDED: daysDiff=${daysDifference}, remainingClasses=${remainingClasses}`);
        console.log(`   💡 Criteria: (expired + has credits) OR (0-7 days + has credits) OR (expired + 0 credits)`);
      }
    } else {
      console.log(`   ❌ SKIP: No package expiry date set`);
    }
  }

  // Trainer x month lesson counts for one calendar year.
  // Uses the scheduledDateKey single-field range so we don't download every lesson.
  async getTrainerMonthlyLessonReport(year) {
    try {
      const reportYear = Number(year) || new Date().getFullYear();
      console.log(`🔄 Generating trainer lesson report for ${reportYear}...`);

      const lessonsQuery = query(
        collection(db, 'lessons'),
        where('scheduledDateKey', '>=', `${reportYear}-01-01`),
        where('scheduledDateKey', '<=', `${reportYear}-12-31`)
      );

      const [lessonsSnapshot, trainersResult] = await Promise.all([
        getDocs(lessonsQuery),
        trainersService.getAllTrainers()
      ]);

      const lessons = [];
      lessonsSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        lessons.push({
          id: docSnap.id,
          ...data,
          // Old documents may lack the key; derive it from scheduledDate.
          scheduledDateKey: data.scheduledDateKey || lessonDateKey(data.scheduledDate, normalizeLessonDate)
        });
      });

      const trainers = (trainersResult.trainers || []).filter(
        (trainer) => trainer.role === 'instructor' && trainer.status !== 'deleted' && trainer.status !== 'permanently_deleted'
      );

      const stats = buildTrainerMonthlyStats(lessons, {
        year: reportYear,
        todayKey: lessonDateKey(new Date(), normalizeLessonDate),
        trainers
      });

      console.log(`✅ Trainer lesson report: ${stats.rows.length} trainers, ${stats.totalDone} lessons held`);

      return {
        success: true,
        data: stats,
        reportType: 'trainerLessons',
        generatedAt: new Date().toLocaleString('tr-TR')
      };
    } catch (error) {
      console.error('❌ Error generating trainer lesson report:', error);
      return {
        success: false,
        error: 'Eğitmen ders raporu oluşturulurken bir hata oluştu.'
      };
    }
  }

  exportTrainerLessonsToCSV(stats) {
    try {
      if (!stats || !stats.rows || !stats.rows.length) {
        throw new Error('No data to export');
      }
      const csvContent = trainerStatsToCsvRows(stats)
        .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      this.downloadCSV(csvContent, `egitmen_dersleri_${stats.year}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error exporting trainer lessons to CSV:', error);
      return {
        success: false,
        error: 'CSV export işleminde bir hata oluştu.'
      };
    }
  }

  // Trigger a browser download of `csvContent` (adds the UTF-8 BOM for Excel).
  downloadCSV(csvContent, baseName) {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${baseName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Export report to CSV format
  exportToCSV(reportData, reportType) {
    try {
      if (!reportData || !reportData.length) {
        throw new Error('No data to export');
      }

      const headers = this.getCSVHeaders(reportType);
      const csvContent = [
        headers.join(','),
        ...reportData.map(row => this.formatCSVRow(row, reportType))
      ].join('\n');

      this.downloadCSV(csvContent, reportType);

      return { success: true };
    } catch (error) {
      console.error('❌ Error exporting to CSV:', error);
      return {
        success: false,
        error: 'CSV export işleminde bir hata oluştu.'
      };
    }
  }

  getCSVHeaders(reportType) {
    const headers = {
      memberDetails: ['Ad Soyad', 'Cinsiyet', 'Telefon', 'E-posta', 'Üyelik Türü', 'Ders Adı', 'Tarih', 'İşlem Tarihi', 'Başlama Tarihi'],
      deletedMembers: ['Ad Soyad', 'Telefon', 'E-posta', 'Silinme Tarihi', 'Silme Sebebi', 'Üyelik Türü', 'Son Ziyaret'],
      expiredMembers: ['Ad Soyad', 'Telefon', 'E-posta', 'Bitiş Tarihi', 'Geçen Gün'],
      newMembers: ['Ad Soyad', 'Telefon', 'E-posta', 'Kayıt Tarihi', 'Üyelik Türü', 'Durum'],
      transferredMembers: ['Ad Soyad', 'Önceki Lokasyon', 'Mevcut Lokasyon', 'Transfer Tarihi'],
      frozenMembers: ['Ad Soyad', 'Dondurma Başlangıç', 'Dondurma Bitiş', 'Sebep'],
      cancelledMembers: ['Ad Soyad', 'İptal Tarihi', 'İptal Sebebi'],
      notifications: ['Üye', 'Tip', 'Mesaj', 'Öncelik', 'Tarih']
    };
    
    return headers[reportType] || ['Data'];
  }

  formatCSVRow(data, reportType) {
    const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'İsimsiz';
    
    const formatters = {
      memberDetails: (d) => [
        fullName, d.gender || '', 
        d.phone || '', d.email || '', d.membershipType || '', 
        d.courseName || '', d.registrationDate || '', d.processDate || '', d.membershipStartDate || ''
      ],
      deletedMembers: (d) => [
        fullName, d.phone || '', 
        d.email || '', d.deletedAt || '', d.deletionReason || '', 
        d.membershipType || '', d.lastVisit || ''
      ],
      expiredMembers: (d) => [
        fullName, d.phone || '', 
        d.email || '', d.membershipEndDate || '', d.daysExpired || ''
      ],
      newMembers: (d) => [
        fullName, d.phone || '', 
        d.email || '', d.registrationDate || '', d.membershipType || '', 
        d.membershipStatus === 'active' ? 'Aktif' : 'Pasif'
      ],
      transferredMembers: (d) => [
        fullName, d.previousLocation || '', 
        d.currentLocation || '', d.transferDate || ''
      ],
      frozenMembers: (d) => [
        fullName, d.freezeStartDate || '', 
        d.freezeEndDate || '', d.freezeReason || ''
      ],
      cancelledMembers: (d) => [
        fullName, d.cancellationDate || '', 
        d.cancellationReason || ''
      ],
      notifications: (d) => [
        d.memberName || '', d.type || '', d.message || '', 
        d.priority || '', d.date || ''
      ]
    };
    
    const formatter = formatters[reportType] || ((d) => [JSON.stringify(d)]);
    return formatter(data).map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
  }
}

export default new ReportsService();
