// User Role Management Service
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

class UserRoleService {
  constructor() {
    this.collectionName = 'users';
  }

  // Change user role (admin only operation)
  async changeUserRole(userId, newRole) {
    try {
      console.log('🔄 Changing user role:', userId, 'to', newRole);
      
      // Validate role
      const validRoles = ['admin', 'instructor'];
      if (!validRoles.includes(newRole)) {
        return {
          success: false,
          error: 'Geçersiz rol. Sadece admin veya instructor rolleri geçerlidir.'
        };
      }

      const userRef = doc(db, this.collectionName, userId);
      
      const updateData = {
        role: newRole,
        updatedAt: serverTimestamp()
      };

      // If changing to admin, add admin permissions
      if (newRole === 'admin') {
        updateData.permissions = {
          manageUsers: true,
          manageReferralCodes: true,
          manageClasses: true,
          manageFinance: true,
          manageReports: true,
          manageSettings: true
        };
      }

      await updateDoc(userRef, updateData);

      console.log('✅ User role updated successfully');
      
      return {
        success: true,
        message: `Kullanıcı rolü ${newRole === 'admin' ? 'yönetici' : 'eğitmen'} olarak güncellendi.`
      };
    } catch (error) {
      console.error('❌ Error updating user role:', error);
      return {
        success: false,
        error: 'Kullanıcı rolü güncellenirken bir hata oluştu.'
      };
    }
  }

  // Get role statistics
  async getRoleStatistics() {
    try {
      // We'll get this from the trainers service since it already loads all users
      const trainersService = (await import('./trainersService')).default;
      const result = await trainersService.getAllTrainers();
      
      if (!result.success) {
        return result;
      }

      const users = result.trainers;
      
      const stats = {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        instructors: users.filter(u => u.role === 'instructor').length,
        activeAdmins: users.filter(u => u.role === 'admin' && u.status === 'active').length,
        activeInstructors: users.filter(u => u.role === 'instructor' && u.status === 'active').length
      };

      return {
        success: true,
        stats: stats
      };
    } catch (error) {
      console.error('❌ Error getting role statistics:', error);
      return {
        success: false,
        error: 'Rol istatistikleri hesaplanırken bir hata oluştu.',
        stats: {}
      };
    }
  }

  // Bulk role change (for multiple users)
  async bulkChangeRoles(userIds, newRole) {
    try {
      console.log('🔄 Bulk changing roles for users:', userIds, 'to', newRole);
      
      const results = await Promise.all(
        userIds.map(userId => this.changeUserRole(userId, newRole))
      );

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return {
        success: true,
        message: `${successful} kullanıcının rolü güncellendi. ${failed > 0 ? `${failed} kullanıcı güncellenemedi.` : ''}`,
        details: {
          successful,
          failed,
          results
        }
      };
    } catch (error) {
      console.error('❌ Error in bulk role change:', error);
      return {
        success: false,
        error: 'Toplu rol değişikliği sırasında bir hata oluştu.'
      };
    }
  }
}

export default new UserRoleService();
