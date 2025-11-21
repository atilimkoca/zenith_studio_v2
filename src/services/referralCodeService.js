// Referral Code Service for Instructor Registration
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

class ReferralCodeService {
  constructor() {
    this.collectionName = 'referralCodes';
  }

  // Generate a random referral code
  generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Create a new referral code
  async createReferralCode(adminUserId, adminName, instructorName = '', notes = '') {
    try {
      const code = this.generateReferralCode();
      
      // Check if code already exists (very unlikely but just in case)
      const existingCode = await this.getReferralCodeByCode(code);
      if (existingCode) {
        // Recursively try again with a new code
        return await this.createReferralCode(adminUserId, adminName, instructorName, notes);
      }

      const codeData = {
        code: code,
        createdBy: adminUserId,
        createdByName: adminName,
        instructorName: instructorName || '',
        notes: notes || '',
        isUsed: false,
        usedBy: null,
        usedByName: null,
        usedAt: null,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) // 30 days from now
      };

      const docRef = await addDoc(collection(db, this.collectionName), codeData);
      

      return {
        success: true,
        code: code,
        id: docRef.id
      };
    } catch (error) {
      console.error('❌ Error creating referral code:', error);
      return {
        success: false,
        error: 'Referans kodu oluşturulurken bir hata oluştu.'
      };
    }
  }

  // Get referral code by code string
  async getReferralCodeByCode(code) {
    try {
      // Normalize the code to uppercase for comparison
      const normalizedCode = code.toUpperCase().trim();
      
      const q = query(
        collection(db, this.collectionName),
        where('code', '==', normalizedCode)
      );
      
      const querySnapshot = await getDocs(q);
      
      // Debug logging
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          usedAt: data.usedAt?.toDate(),
          expiresAt: data.expiresAt?.toDate()
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting referral code:', error);
      return null;
    }
  }

  // Validate referral code for registration
  async validateReferralCode(code) {
    try {

      // Check if code is provided
      if (!code || code.trim().length === 0) {
        return {
          success: false,
          error: 'Lütfen referans kodu girin.'
        };
      }

      // Check code length
      if (code.trim().length !== 8) {
        return {
          success: false,
          error: 'Referans kodu 8 karakter olmalıdır.'
        };
      }

      const referralCode = await this.getReferralCodeByCode(code);
      
      // Debug logging
      
      if (!referralCode) {
        return {
          success: false,
          error: 'Geçersiz referans kodu. Lütfen kodunuzu kontrol edin.'
        };
      }

      if (referralCode.isUsed) {
        return {
          success: false,
          error: 'Bu referans kodu zaten kullanılmış.'
        };
      }

      // Check if expired
      const now = new Date();
      if (referralCode.expiresAt && now > referralCode.expiresAt) {
        return {
          success: false,
          error: 'Referans kodunun süresi dolmuş.'
        };
      }

      return {
        success: true,
        referralCode: referralCode
      };
    } catch (error) {
      console.error('❌ [validateReferralCode] Exception during validation:', error);
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
      return {
        success: false,
        error: 'Referans kodu doğrulanırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
      };
    }
  }

  // Mark referral code as used
  async useReferralCode(code, userId, userName) {
    try {
      const referralCode = await this.getReferralCodeByCode(code);
      
      if (!referralCode) {
        return {
          success: false,
          error: 'Referans kodu bulunamadı.'
        };
      }

      const codeRef = doc(db, this.collectionName, referralCode.id);
      await updateDoc(codeRef, {
        isUsed: true,
        usedBy: userId,
        usedByName: userName,
        usedAt: serverTimestamp()
      });


      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Error using referral code:', error);
      return {
        success: false,
        error: 'Referans kodu güncellenirken bir hata oluştu.'
      };
    }
  }

  // Get all referral codes (for admin)
  async getAllReferralCodes() {
    try {
      const q = query(
        collection(db, this.collectionName),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const codes = [];
      
      querySnapshot.forEach((doc) => {
        codes.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          usedAt: doc.data().usedAt?.toDate(),
          expiresAt: doc.data().expiresAt?.toDate()
        });
      });

      return {
        success: true,
        codes: codes
      };
    } catch (error) {
      console.error('❌ Error fetching referral codes:', error);
      return {
        success: false,
        error: 'Referans kodları yüklenirken bir hata oluştu.',
        codes: []
      };
    }
  }

  // Delete a referral code
  async deleteReferralCode(codeId) {
    try {
      await deleteDoc(doc(db, this.collectionName, codeId));
      

      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Error deleting referral code:', error);
      return {
        success: false,
        error: 'Referans kodu silinirken bir hata oluştu.'
      };
    }
  }

  // Get statistics
  async getStatistics() {
    try {
      const result = await this.getAllReferralCodes();
      if (!result.success) {
        return result;
      }

      const codes = result.codes;
      const now = new Date();

      // Debug logging for statistics

      const stats = {
        total: codes.length,
        used: codes.filter(code => code.isUsed).length,
        unused: codes.filter(code => !code.isUsed).length,
        expired: codes.filter(code => !code.isUsed && code.expiresAt && now > code.expiresAt).length,
        active: codes.filter(code => !code.isUsed && (!code.expiresAt || now <= code.expiresAt)).length
      };


      return {
        success: true,
        stats: stats
      };
    } catch (error) {
      console.error('❌ Error getting statistics:', error);
      return {
        success: false,
        error: 'İstatistikler yüklenirken bir hata oluştu.'
      };
    }
  }
}

export default new ReferralCodeService();
