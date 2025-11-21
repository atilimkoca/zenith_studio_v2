// Firestore service for database operations
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../config/firebase';

class FirestoreService {
  // Get user data by UID
  async getUserData(uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return {
          success: true,
          data: userDoc.data()
        };
      } else {
        return {
          success: false,
          error: 'Kullanıcı bulunamadı'
        };
      }
    } catch (error) {
      console.error('Error getting user data:', error);
      return {
        success: false,
        error: 'Kullanıcı bilgileri alınamadı'
      };
    }
  }

  // Update user data
  async updateUserData(uid, userData) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        ...userData,
        updatedAt: new Date().toISOString()
      });
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error updating user data:', error);
      return {
        success: false,
        error: 'Kullanıcı bilgileri güncellenemedi'
      };
    }
  }

  // Get all users (for admin purposes)
  async getAllUsers() {
    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return {
        success: true,
        data: users
      };
    } catch (error) {
      console.error('Error getting users:', error);
      return {
        success: false,
        error: 'Kullanıcılar alınamadı'
      };
    }
  }

  // Get users by gender (for statistics)
  async getUsersByGender(gender) {
    try {
      const usersCollection = collection(db, 'users');
      const q = query(usersCollection, where('gender', '==', gender));
      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return {
        success: true,
        data: users,
        count: users.length
      };
    } catch (error) {
      console.error('Error getting users by gender:', error);
      return {
        success: false,
        error: 'Kullanıcılar alınamadı'
      };
    }
  }

  // Get recent members
  async getRecentMembers(limitCount = 10) {
    try {
      const usersCollection = collection(db, 'users');
      const q = query(
        usersCollection, 
        orderBy('createdAt', 'desc'), 
        limit(limitCount)
      );
      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return {
        success: true,
        data: users
      };
    } catch (error) {
      console.error('Error getting recent members:', error);
      return {
        success: false,
        error: 'Son üyeler alınamadı'
      };
    }
  }

  // Delete user data (for GDPR compliance)
  async deleteUserData(uid) {
    try {
      await deleteDoc(doc(db, 'users', uid));
      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting user data:', error);
      return {
        success: false,
        error: 'Kullanıcı bilgileri silinemedi'
      };
    }
  }

  // Get user statistics
  async getUserStatistics() {
    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const users = usersSnapshot.docs.map(doc => doc.data());
      
      const stats = {
        totalUsers: users.length,
        activeMembers: users.filter(u => u.membershipStatus === 'active').length,
        genderBreakdown: {
          male: users.filter(u => u.gender === 'male').length,
          female: users.filter(u => u.gender === 'female').length,
          other: users.filter(u => u.gender === 'other').length
        },
        membershipTypes: {
          basic: users.filter(u => u.membershipType === 'basic').length,
          premium: users.filter(u => u.membershipType === 'premium').length,
          vip: users.filter(u => u.membershipType === 'vip').length
        }
      };
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting user statistics:', error);
      return {
        success: false,
        error: 'İstatistikler alınamadı'
      };
    }
  }
}

// Export a single instance
export default new FirestoreService();
