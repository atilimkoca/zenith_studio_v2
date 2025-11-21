// Trainers Management Service
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  getDoc,
  query, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

class TrainersService {
  constructor() {
    this.collectionName = 'users';
  }

  // Get all trainers (users with trainer profiles)
  async getAllTrainers() {
    try {
      console.log('🔄 Fetching all trainers...');
      
      const usersCollection = collection(db, this.collectionName);
      
      // Try with orderBy first, fallback to simple query if indexes aren't ready
      let querySnapshot;
      try {
        const q = query(usersCollection, orderBy('createdAt', 'desc'));
        querySnapshot = await getDocs(q);
      } catch {
        console.warn('⚠️ Index not ready, falling back to simple query');
        querySnapshot = await getDocs(usersCollection);
      }
      
      const trainers = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        // Only include users with instructor or admin roles (exclude customers)
        if (userData.role === 'instructor' || userData.role === 'admin') {
          trainers.push({
            id: doc.id,
            ...userData,
            // Ensure trainerProfile exists
            trainerProfile: userData.trainerProfile || {
              bio: '',
              specializations: [],
              certifications: [],
              experience: '',
              isActive: true
            }
          });
        }
      });

      console.log(`✅ Fetched ${trainers.length} trainers`);
      
      return {
        success: true,
        trainers: trainers
      };
    } catch (error) {
      console.error('❌ Error fetching trainers:', error);
      
      // Return empty array on any error
      return {
        success: true,
        trainers: [],
        warning: 'Eğitmenler yüklenirken sorun oluştu, boş liste gösteriliyor.'
      };
    }
  }

  // Get active trainers only
  async getActiveTrainers() {
    try {
      const result = await this.getAllTrainers();
      if (!result.success) {
        return result;
      }

      const activeTrainers = result.trainers.filter(trainer => 
        trainer.status === 'active' && 
        trainer.trainerProfile?.isActive !== false
      );

      return {
        success: true,
        trainers: activeTrainers
      };
    } catch (error) {
      console.error('❌ Error fetching active trainers:', error);
      return {
        success: false,
        error: 'Aktif eğitmenler yüklenirken bir hata oluştu.',
        trainers: []
      };
    }
  }

  // Update trainer profile
  async updateTrainerProfile(trainerId, profileData) {
    try {
      console.log('🔄 Updating trainer profile:', trainerId);
      
      const trainerRef = doc(db, this.collectionName, trainerId);
      
      // Get current user data first
      const currentDoc = await getDoc(trainerRef);
      const currentData = currentDoc.data();
      
      await updateDoc(trainerRef, {
        trainerProfile: {
          ...currentData.trainerProfile, // Keep existing fields
          ...profileData, // Override with new data
          updatedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });

      console.log('✅ Trainer profile updated');
      
      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Error updating trainer profile:', error);
      return {
        success: false,
        error: 'Eğitmen profili güncellenirken bir hata oluştu.'
      };
    }
  }

  // Toggle trainer active status
  async toggleTrainerStatus(trainerId, isActive) {
    try {
      console.log('🔄 Toggling trainer status:', trainerId, isActive);
      
      const trainerRef = doc(db, this.collectionName, trainerId);
      await updateDoc(trainerRef, {
        'trainerProfile.isActive': isActive,
        'trainerProfile.updatedAt': serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('✅ Trainer status updated');
      
      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Error updating trainer status:', error);
      return {
        success: false,
        error: 'Eğitmen durumu güncellenirken bir hata oluştu.'
      };
    }
  }

  // Get trainer statistics
  async getTrainerStatistics() {
    try {
      console.log('🔄 Calculating trainer statistics...');
      
      const result = await this.getAllTrainers();
      if (!result.success) {
        return result;
      }

      const trainers = result.trainers;
      
      const stats = {
        total: trainers.length,
        active: trainers.filter(t => t.status === 'active' && t.trainerProfile?.isActive !== false).length,
        inactive: trainers.filter(t => t.status !== 'active' || t.trainerProfile?.isActive === false).length,
        genderBreakdown: {
          male: trainers.filter(t => t.gender === 'male').length,
          female: trainers.filter(t => t.gender === 'female').length,
          other: trainers.filter(t => t.gender === 'other' || !t.gender).length
        },
        experienceBreakdown: {
          beginner: trainers.filter(t => {
            const exp = t.trainerProfile?.experience || '';
            return exp.includes('yeni') || exp.includes('başlangıç') || exp.includes('1-2');
          }).length,
          intermediate: trainers.filter(t => {
            const exp = t.trainerProfile?.experience || '';
            return exp.includes('orta') || exp.includes('3-5') || exp.includes('2-4');
          }).length,
          expert: trainers.filter(t => {
            const exp = t.trainerProfile?.experience || '';
            return exp.includes('uzman') || exp.includes('5+') || exp.includes('10+');
          }).length
        }
      };

      console.log('✅ Trainer statistics calculated:', stats);
      
      return {
        success: true,
        stats: stats
      };
    } catch (error) {
      console.error('❌ Error calculating trainer statistics:', error);
      return {
        success: false,
        error: 'Eğitmen istatistikleri hesaplanırken bir hata oluştu.',
        stats: {}
      };
    }
  }

  // Search trainers by name or specialization
  async searchTrainers(searchTerm) {
    try {
      console.log('🔍 Searching trainers:', searchTerm);
      
      const result = await this.getAllTrainers();
      if (!result.success) {
        return result;
      }

      const searchLower = searchTerm.toLowerCase();
      const filteredTrainers = result.trainers.filter(trainer => {
        const fullName = `${trainer.firstName || ''} ${trainer.lastName || ''}`.toLowerCase();
        const specializations = (trainer.trainerProfile?.specializations || []).join(' ').toLowerCase();
        const bio = (trainer.trainerProfile?.bio || '').toLowerCase();
        
        return fullName.includes(searchLower) || 
               specializations.includes(searchLower) || 
               bio.includes(searchLower);
      });

      return {
        success: true,
        trainers: filteredTrainers
      };
    } catch (error) {
      console.error('❌ Error searching trainers:', error);
      return {
        success: false,
        error: 'Eğitmen arama işleminde bir hata oluştu.',
        trainers: []
      };
    }
  }

  // Get trainers by specialization
  async getTrainersBySpecialization(specialization) {
    try {
      const result = await this.getAllTrainers();
      if (!result.success) {
        return result;
      }

      const filteredTrainers = result.trainers.filter(trainer => 
        trainer.trainerProfile?.specializations?.includes(specialization)
      );

      return {
        success: true,
        trainers: filteredTrainers
      };
    } catch (error) {
      console.error('❌ Error filtering trainers by specialization:', error);
      return {
        success: false,
        error: 'Uzmanlık alanına göre filtreleme işleminde bir hata oluştu.',
        trainers: []
      };
    }
  }
}

export default new TrainersService();
