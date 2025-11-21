// Authentication service for Firebase
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

class AuthService {
  // Register a new customer (gym member)
  async registerCustomer(userData) {
    try {
      const { 
        email, 
        password, 
        firstName, 
        lastName, 
        phone, 
        birthDate, 
        gender,
        membershipType = 'basic',
        emergencyContact = {},
        medicalConditions = [],
        fitnessGoals = []
      } = userData;
      
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update user profile with display name
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`
      });
      
      // Prepare customer data for Firestore
      const userDocData = {
        uid: user.uid,
        email: user.email,
        firstName,
        lastName,
        phone,
        birthDate: birthDate || null,
        gender,
        displayName: `${firstName} ${lastName}`,
        role: 'customer', // Customer role
        status: 'pending', // New customers start as pending
        membershipStatus: 'inactive', // Inactive until approved
        membershipType,
        joinDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        profileComplete: true,
        approvedAt: null,
        approvedBy: null,
        lastVisit: null,
        remainingClasses: 0,
        totalVisits: 0,
        emergencyContact,
        // Customer-specific fields
        customerProfile: {
          medicalConditions: Array.isArray(medicalConditions) ? medicalConditions : 
                            medicalConditions ? [medicalConditions] : [],
          fitnessGoals: Array.isArray(fitnessGoals) ? fitnessGoals : 
                       fitnessGoals ? [fitnessGoals] : [],
          preferences: {},
          notes: ''
        }
      };
      
      // Save user data to Firestore
      await setDoc(doc(db, 'users', user.uid), userDocData);
      
      console.log('✅ Customer registered and data saved to Firestore:', {
        uid: user.uid,
        email: user.email,
        name: `${firstName} ${lastName}`,
        role: 'customer',
        status: 'pending'
      });
      
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: `${firstName} ${lastName}`,
          firstName,
          lastName,
          phone,
          birthDate,
          gender,
          role: 'customer',
          status: 'pending'
        }
      };
    } catch (error) {
      console.error('❌ Customer registration error:', error);
      return {
        success: false,
        error: this.getErrorMessage(error.code)
      };
    }
  }

  // Register a new trainer with referral code
  async register(userData) {
    try {
      const { 
        email, 
        password, 
        firstName, 
        lastName, 
        phone, 
        birthDate, 
        gender,
        referralCode,
        receiveUpdates 
      } = userData;
      
      // Validate referral code first
      const referralCodeService = (await import('./referralCodeService')).default;
      const codeValidation = await referralCodeService.validateReferralCode(referralCode);
      
      if (!codeValidation.success) {
        return {
          success: false,
          error: codeValidation.error
        };
      }

      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update user profile with display name
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`
      });
      
      // Prepare user data for Firestore
      const userDocData = {
        uid: user.uid,
        email: user.email,
        firstName,
        lastName,
        phone,
        birthDate: birthDate || null,
        gender,
        displayName: `${firstName} ${lastName}`,
        receiveUpdates: receiveUpdates || false,
        role: 'instructor', // New registrations are instructors
        status: 'active',
        joinDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        profileComplete: true,
        // Trainer-specific fields
        trainerProfile: {
          bio: '',
          specializations: [],
          certifications: [],
          experience: '',
          isActive: true
        },
        preferences: {
          notifications: receiveUpdates || false,
          language: 'tr'
        },
        referralCode: referralCode
      };
      
      // Save user data to Firestore
      await setDoc(doc(db, 'users', user.uid), userDocData);
      
      // Mark referral code as used
      await referralCodeService.useReferralCode(
        referralCode, 
        user.uid, 
        `${firstName} ${lastName}`
      );
      
      console.log('✅ Trainer registered and data saved to Firestore:', {
        uid: user.uid,
        email: user.email,
        name: `${firstName} ${lastName}`,
        gender,
        phone,
        referralCode
      });
      
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: `${firstName} ${lastName}`,
          firstName,
          lastName,
          phone,
          birthDate,
          gender,
          receiveUpdates,
          role: 'instructor',
          status: 'active'
        }
      };
    } catch (error) {
      console.error('❌ Registration error:', error);
      return {
        success: false,
        error: this.getErrorMessage(error.code)
      };
    }
  }
  
  // Sign in user
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get additional user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      // Check if user is permanently deleted
      if (userData.status === 'permanently_deleted' || userData.loginDisabled) {
        // Log out the user immediately
        await signOut(auth);
        console.warn('🚫 Login blocked for deleted user:', email);
        return {
          success: false,
          error: 'Bu hesap kalıcı olarak silinmiş. Giriş yapılamaz.'
        };
      }
      
      console.log('✅ User logged in and data retrieved from Firestore:', {
        uid: user.uid,
        email: user.email,
        name: userData.displayName || user.displayName,
        status: userData.status,
        hasFirestoreData: userDoc.exists()
      });
      
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          ...userData
        }
      };
    } catch (error) {
      console.error('❌ Login error:', error);
      return {
        success: false,
        error: this.getErrorMessage(error.code)
      };
    }
  }
  
  // Sign out user
  async logout() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error.code)
      };
    }
  }
  
  // Reset password
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error.code)
      };
    }
  }
  
  // Get current user
  getCurrentUser() {
    return auth.currentUser;
  }
  
  // Get user data from Firestore
  async getUserData(uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return {};
    } catch (error) {
      console.error('Error getting user data:', error);
      return {};
    }
  }
  
  // Listen to auth state changes
  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
  }
  
  // Register initial admin (bypasses referral code requirement)
  async registerInitialAdmin(userData) {
    try {
      const { 
        email, 
        password, 
        firstName, 
        lastName, 
        phone, 
        birthDate, 
        gender
      } = userData;
      
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update user profile with display name
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`
      });
      
      // Prepare admin user data for Firestore
      const userDocData = {
        uid: user.uid,
        email: user.email,
        firstName,
        lastName,
        phone,
        birthDate: birthDate || null,
        gender,
        displayName: `${firstName} ${lastName}`,
        role: 'admin', // Admin role
        status: 'active',
        joinDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        profileComplete: true,
        isInitialAdmin: true, // Mark as initial admin
        // Admin permissions
        permissions: {
          manageUsers: true,
          manageReferralCodes: true,
          manageClasses: true,
          manageFinance: true,
          manageReports: true,
          manageSettings: true
        }
      };
      
      // Save user data to Firestore
      await setDoc(doc(db, 'users', user.uid), userDocData);
      
      console.log('✅ Initial admin registered and data saved to Firestore:', {
        uid: user.uid,
        email: user.email,
        name: `${firstName} ${lastName}`,
        role: 'admin'
      });
      
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: `${firstName} ${lastName}`,
          firstName,
          lastName,
          phone,
          birthDate,
          gender,
          role: 'admin',
          status: 'active'
        }
      };
    } catch (error) {
      console.error('❌ Initial admin registration error:', error);
      return {
        success: false,
        error: this.getErrorMessage(error.code)
      };
    }
  }

  // Get user-friendly error messages
  getErrorMessage(errorCode) {
    const errorMessages = {
      'auth/user-not-found': 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.',
      'auth/wrong-password': 'Hatalı şifre girdiniz.',
      'auth/email-already-in-use': 'Bu e-posta adresi zaten kullanımda.',
      'auth/weak-password': 'Şifre çok zayıf. En az 6 karakter olmalı.',
      'auth/invalid-email': 'Geçersiz e-posta adresi.',
      'auth/user-disabled': 'Bu kullanıcı hesabı devre dışı bırakılmış.',
      'auth/too-many-requests': 'Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.',
      'auth/network-request-failed': 'Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.',
      'auth/invalid-credential': 'Geçersiz kimlik bilgileri.',
      'auth/missing-password': 'Şifre alanı boş bırakılamaz.',
      'auth/invalid-login-credentials': 'Geçersiz giriş bilgileri. E-posta ve şifrenizi kontrol edin.',
      'auth/account-deleted': 'Bu hesap kalıcı olarak silinmiş. Giriş yapılamaz.'
    };
    
    return errorMessages[errorCode] || 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
  }
}

// Export a single instance
export default new AuthService();
