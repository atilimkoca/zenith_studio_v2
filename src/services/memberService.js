// Member service for gym customer management
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
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const parseDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value?.toDate === 'function') {
    try {
      const converted = value.toDate();
      return Number.isNaN(converted.getTime()) ? null : converted;
    } catch (error) {
      console.warn('Failed to convert Firestore timestamp to Date:', error);
      return null;
    }
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const resolvePackageType = (packageData) => {
  if (!packageData || typeof packageData !== 'object') {
    return 'group';
  }

  if (packageData.packageType) {
    return packageData.packageType;
  }

  if (packageData.type) {
    return packageData.type;
  }

  if (packageData.category) {
    return packageData.category;
  }

  if (packageData.isOneOnOne) {
    return 'one-on-one';
  }

  return 'group';
};

class MemberService {
  constructor() {
    this.membersCollection = 'members';
  }

  // Register a new member (gym customer)
  async registerMember(memberData) {
    try {
      const {
        firstName,
        lastName,
        email,
        phone,
        birthDate,
        gender,
        membershipType = 'basic',
        emergencyContact = {}
      } = memberData;

      const memberId = `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const memberDocData = {
        id: memberId,
        firstName,
        lastName,
        email,
        phone,
        birthDate: birthDate || null,
        gender,
        displayName: `${firstName} ${lastName}`,
        membershipType,
        emergencyContact,
        status: 'pending', // New members start as pending
        membershipStatus: 'inactive', // Inactive until approved
        joinDate: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        approvedAt: null,
        approvedBy: null,
        lastVisit: null,
        remainingClasses: 0,
        totalVisits: 0,
        // Member specific fields
        memberProfile: {
          medicalConditions: [],
          fitnessGoals: [],
          preferences: {},
          notes: ''
        }
      };

      await setDoc(doc(db, this.membersCollection, memberId), memberDocData);


      return {
        success: true,
        data: memberDocData
      };
    } catch (error) {
      console.error('❌ Error registering member:', error);
      return {
        success: false,
        error: 'Üye kaydı sırasında bir hata oluştu'
      };
    }
  }

  // Get all members with optional filtering
  async getAllMembers(filters = {}) {
    try {
      // First, automatically check and reset expired packages
      await this.autoCheckExpiredPackages();

      const membersCollection = collection(db, this.membersCollection);
      // Simplify query to avoid index requirements
      const querySnapshot = await getDocs(membersCollection);
      const members = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamp to readable date
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
      }));

      // Also get users with role 'customer' from users collection
      const usersCollection = collection(db, 'users');
      // Remove orderBy to avoid composite index requirement
      const customerQuery = query(usersCollection, where('role', '==', 'customer'));
      const customerSnapshot = await getDocs(customerQuery);
      
      const customerUsers = customerSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Normalize customer data to match member structure
        membershipType: doc.data().membershipType || 'basic',
        status: doc.data().status === 'active' ? 'approved' : doc.data().status || 'pending',
        membershipStatus: doc.data().status || 'inactive',
        remainingClasses: doc.data().remainingClasses || 0,
        totalVisits: doc.data().totalVisits || 0,
        lastVisit: doc.data().lastVisit || null,
        joinDate: doc.data().joinDate || doc.data().createdAt,
        createdAt: doc.data().createdAt,
        updatedAt: doc.data().updatedAt
      }));

      // Combine both arrays
      const allMembers = [...members, ...customerUsers];
      
      // Apply filters if provided (client-side filtering)
      let filteredMembers = allMembers;
      if (filters.status) {
        filteredMembers = allMembers.filter(member => member.status === filters.status);
      }
      
      // Sort by creation date (client-side sorting)
      filteredMembers.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.joinDate);
        const dateB = new Date(b.createdAt || b.joinDate);
        return dateB - dateA;
      });

      return {
        success: true,
        data: filteredMembers
      };
    } catch (error) {
      console.error('❌ Error getting members:', error);
      return {
        success: false,
        error: 'Üyeler alınamadı'
      };
    }
  }

  // Get pending members (for admin approval)
  async getPendingMembers() {
    try {
      const membersCollection = collection(db, this.membersCollection);
      const q = query(
        membersCollection, 
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const pendingMembers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
      }));

      return {
        success: true,
        data: pendingMembers
      };
    } catch (error) {
      console.error('❌ Error getting pending members:', error);
      return {
        success: false,
        error: 'Bekleyen üyeler alınamadı'
      };
    }
  }

  // Approve a member
  async approveMember(memberId, approvedBy, membershipDetails = {}) {
    try {
      // Check if it's in members collection first
      const memberRef = doc(db, this.membersCollection, memberId);
      const memberDoc = await getDoc(memberRef);
      
      if (memberDoc.exists()) {
        // It's in members collection
        const approvalDate = new Date();

        // Use startDate from membershipDetails if provided, otherwise use approvalDate
        const packageStartDate = membershipDetails.startDate
          ? new Date(membershipDetails.startDate)
          : approvalDate;

        // Calculate expiry from start date (not approval date)
        // Use 30 days per month for consistent expiry calculation across all platforms
        const durationMonths = membershipDetails.duration || 1;
        const packageExpiryDate = new Date(packageStartDate);
        packageExpiryDate.setDate(packageExpiryDate.getDate() + (durationMonths * 30));

        // Determine remaining classes and package name
        let remainingClasses = 0;
        let packageName = 'Standart Paket';
        
        // PRIORITY 1: If packageId is provided, fetch actual package details from database
        if (membershipDetails.packageId) {
          try {
            const packageRef = doc(db, 'packages', membershipDetails.packageId);
            const packageDoc = await getDoc(packageRef);
            
            if (packageDoc.exists()) {
              const packageData = packageDoc.data();
              packageName = packageData.name || 'Standart Paket';
              // Try different field names for lesson count
              remainingClasses = packageData.lessonCount || packageData.lessons || packageData.classes || packageData.sessionCount || membershipDetails.remainingClasses || 8;
            } else {
              console.warn('Package not found, using provided details');
              remainingClasses = membershipDetails.remainingClasses || 8;
            }
          } catch (error) {
            console.error('Error fetching package details:', error);
            remainingClasses = membershipDetails.remainingClasses || 8;
          }
        }
        // PRIORITY 2: Use remainingClasses if provided
        else if (membershipDetails.remainingClasses) {
          remainingClasses = membershipDetails.remainingClasses;

          // Also set package name if provided or based on membershipType
          if (membershipDetails.packageName) {
            packageName = membershipDetails.packageName;
          } else if (membershipDetails.membershipType) {
            const packageNames = {
              'basic': 'Temel Paket',
              'premium': 'Premium Paket',
              'unlimited': 'Sınırsız Paket'
            };
            packageName = packageNames[membershipDetails.membershipType] || 'Standart Paket';
          }
        }
        // PRIORITY 3: Fall back to membershipType
        else if (membershipDetails.membershipType) {
          const classLimits = {
            'basic': 8,
            'premium': 16,
            'unlimited': 999
          };
          remainingClasses = classLimits[membershipDetails.membershipType] || 8;

          // Set package name based on type
          const packageNames = {
            'basic': 'Temel Paket (8 Ders)',
            'premium': 'Premium Paket (16 Ders)',
            'unlimited': 'Sınırsız Paket'
          };
          packageName = packageNames[membershipDetails.membershipType] || 'Standart Paket';
        }
        // PRIORITY 4: Default fallback
        else {
          remainingClasses = 8;
        }

        const updateData = {
          status: 'approved',
          membershipStatus: 'active',
          isActive: true,
          approvedAt: approvalDate.toISOString(),
          approvedBy: approvedBy,
          updatedAt: serverTimestamp(),
          packageStartDate: packageStartDate.toISOString(),
          packageExpiryDate: packageExpiryDate.toISOString(),
          remainingClasses: remainingClasses,
          lessonCredits: remainingClasses, // For mobile app compatibility
          packageType: membershipDetails.packageType || 'group', // Store package type at root level
          // Add packageInfo object for mobile app compatibility
          packageInfo: {
            packageId: membershipDetails.packageId || `pkg_${Date.now()}`,
            packageName: packageName,
            packageType: membershipDetails.packageType || 'group', // CRITICAL: Include packageType for mobile
            lessonCount: remainingClasses,
            assignedAt: packageStartDate.toISOString(),
            expiryDate: packageExpiryDate.toISOString()
          },
          ...membershipDetails
        };

        await updateDoc(memberRef, updateData);
      } else {
        // Check if it's a user in users collection
        const userRef = doc(db, 'users', memberId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          return {
            success: false,
            error: 'Üye bulunamadı'
          };
        }

        const approvalDate = new Date();
        
        // Use startDate from membershipDetails if provided, otherwise use approvalDate
        const packageStartDate = membershipDetails.startDate 
          ? new Date(membershipDetails.startDate)
          : approvalDate;

        // Calculate expiry from start date (not approval date)
        // Use 30 days per month for consistent expiry calculation across all platforms
        const durationMonths = membershipDetails.duration || 1;
        const packageExpiryDate = new Date(packageStartDate);
        packageExpiryDate.setDate(packageExpiryDate.getDate() + (durationMonths * 30));

        // Determine remaining classes and package name
        let remainingClasses = 0;
        let packageName = 'Standart Paket';

        // PRIORITY 1: If packageId is provided, fetch actual package details from database
        if (membershipDetails.packageId) {
          try {
            const packageRef = doc(db, 'packages', membershipDetails.packageId);
            const packageDoc = await getDoc(packageRef);

            if (packageDoc.exists()) {
              const packageData = packageDoc.data();
              packageName = packageData.name || 'Standart Paket';
              // Try different field names for lesson count
              remainingClasses = packageData.lessonCount || packageData.lessons || packageData.classes || packageData.sessionCount || membershipDetails.remainingClasses || 8;
            } else {
              console.warn('Package not found, using provided details');
              remainingClasses = membershipDetails.remainingClasses || 8;
            }
          } catch (error) {
            console.error('Error fetching package details:', error);
            remainingClasses = membershipDetails.remainingClasses || 8;
          }
        }
        // PRIORITY 2: Use remainingClasses if provided
        else if (membershipDetails.remainingClasses) {
          remainingClasses = membershipDetails.remainingClasses;

          // Also set package name if provided or based on membershipType
          if (membershipDetails.packageName) {
            packageName = membershipDetails.packageName;
          } else if (membershipDetails.membershipType) {
            const packageNames = {
              'basic': 'Temel Paket',
              'premium': 'Premium Paket',
              'unlimited': 'Sınırsız Paket'
            };
            packageName = packageNames[membershipDetails.membershipType] || 'Standart Paket';
          }
        }
        // PRIORITY 3: Fall back to membershipType
        else if (membershipDetails.membershipType) {
          const classLimits = {
            'basic': 8,
            'premium': 16,
            'unlimited': 999
          };
          remainingClasses = classLimits[membershipDetails.membershipType] || 8;

          // Set package name based on type
          const packageNames = {
            'basic': 'Temel Paket (8 Ders)',
            'premium': 'Premium Paket (16 Ders)',
            'unlimited': 'Sınırsız Paket'
          };
          packageName = packageNames[membershipDetails.membershipType] || 'Standart Paket';
        }
        // PRIORITY 4: Default fallback
        else {
          remainingClasses = 8;
        }

        const updateData = {
          status: 'approved',
          membershipStatus: 'active',
          isActive: true,
          approvedAt: approvalDate.toISOString(),
          approvedBy: approvedBy,
          updatedAt: new Date().toISOString(),
          packageStartDate: packageStartDate.toISOString(),
          packageExpiryDate: packageExpiryDate.toISOString(),
          remainingClasses: remainingClasses,
          lessonCredits: remainingClasses, // For mobile app compatibility
          packageType: membershipDetails.packageType || 'group', // Store package type at root level
          // Add packageInfo object for mobile app compatibility
          packageInfo: {
            packageId: membershipDetails.packageId || `pkg_${Date.now()}`,
            packageName: packageName,
            packageType: membershipDetails.packageType || 'group', // CRITICAL: Include packageType for mobile
            lessonCount: remainingClasses,
            assignedAt: packageStartDate.toISOString(),
            expiryDate: packageExpiryDate.toISOString()
          },
          ...membershipDetails
        };

        await updateDoc(userRef, updateData);
      }


      return {
        success: true,
        data: { status: 'approved' }
      };
    } catch (error) {
      console.error('❌ Error approving member:', error);
      return {
        success: false,
        error: 'Üye onaylanamadı'
      };
    }
  }

  // Renew member package
  async renewPackage(memberId, renewedBy, packageDetails = {}) {
    try {
      // Check if it's in members collection first
      const memberRef = doc(db, this.membersCollection, memberId);
      const memberDoc = await getDoc(memberRef);
      
      const renewalDate = new Date();
      const packageExpiryDate = new Date(renewalDate);
      // Use 30 days for consistent expiry calculation across all platforms
      packageExpiryDate.setDate(packageExpiryDate.getDate() + 30);

      // Determine remaining classes based on package details
      let remainingClasses = 0;
      let packageName = 'Yenilenen Paket';
      
      if (packageDetails.remainingClasses) {
        remainingClasses = packageDetails.remainingClasses;
      } else if (packageDetails.membershipType) {
        const classLimits = {
          'basic': 8,
          'premium': 16,
          'unlimited': 999
        };
        remainingClasses = classLimits[packageDetails.membershipType] || 8;
        
        // Set package name based on type
        const packageNames = {
          'basic': 'Temel Paket (8 Ders)',
          'premium': 'Premium Paket (16 Ders)',
          'unlimited': 'Sınırsız Paket'
        };
        packageName = packageNames[packageDetails.membershipType] || 'Yenilenen Paket';
      } else {
        // Default to 8 classes
        remainingClasses = 8;
      }

      const updateData = {
        packageStartDate: renewalDate.toISOString(),
        packageExpiryDate: packageExpiryDate.toISOString(),
        packageType: packageDetails.membershipType || packageDetails.packageType || 'group',
        updatedAt: serverTimestamp(),
        lastPackageRenewal: renewalDate.toISOString(),
        renewedBy: renewedBy,
        remainingClasses: remainingClasses,
        lessonCredits: remainingClasses, // For mobile app compatibility
        // Add/update packageInfo object for mobile app compatibility
        packageInfo: {
          packageId: packageDetails.packageId || `pkg_${Date.now()}`,
          packageName: packageName,
          packageType: packageDetails.membershipType || packageDetails.packageType || 'group',
          lessonCount: remainingClasses,
          assignedAt: renewalDate.toISOString(),
          expiryDate: packageExpiryDate.toISOString(),
          renewedBy: renewedBy
        },
        ...packageDetails
      };

      if (memberDoc.exists()) {
        // It's in members collection
        await updateDoc(memberRef, updateData);
      } else {
        // Check if it's a user in users collection
        const userRef = doc(db, 'users', memberId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          return {
            success: false,
            error: 'Üye bulunamadı'
          };
        }

        updateData.updatedAt = new Date().toISOString();
        await updateDoc(userRef, updateData);
      }

      return {
        success: true,
        data: { packageRenewed: true }
      };
    } catch (error) {
      console.error('❌ Error renewing package:', error);
      return {
        success: false,
        error: 'Paket yenilenemedi'
      };
    }
  }

  // Reject a member
  async rejectMember(memberId, rejectedBy, reason = '') {
    try {
      // Check if it's in members collection first
      const memberRef = doc(db, this.membersCollection, memberId);
      const memberDoc = await getDoc(memberRef);
      
      if (memberDoc.exists()) {
        // It's in members collection
        const updateData = {
          status: 'rejected',
          membershipStatus: 'inactive',
          rejectedAt: new Date().toISOString(),
          rejectedBy: rejectedBy,
          rejectionReason: reason,
          updatedAt: serverTimestamp()
        };

        await updateDoc(memberRef, updateData);
      } else {
        // Check if it's a user in users collection
        const userRef = doc(db, 'users', memberId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          return {
            success: false,
            error: 'Üye bulunamadı'
          };
        }

        const updateData = {
          status: 'rejected',
          membershipStatus: 'inactive',
          rejectedAt: new Date().toISOString(),
          rejectedBy: rejectedBy,
          rejectionReason: reason,
          updatedAt: new Date().toISOString()
        };

        await updateDoc(userRef, updateData);
      }


      return {
        success: true,
        data: { status: 'rejected' }
      };
    } catch (error) {
      console.error('❌ Error rejecting member:', error);
      return {
        success: false,
        error: 'Üye reddedilemedi'
      };
    }
  }

  // Update member information
  async updateMember(memberId, updateData = {}) {
    try {
      // Determine which collection the member belongs to
      const memberRef = doc(db, this.membersCollection, memberId);
      const memberDoc = await getDoc(memberRef);
      
      let targetRef = memberRef;
      let currentData = null;
      let usesMembersCollection = false;

      if (memberDoc.exists()) {
        currentData = memberDoc.data();
        usesMembersCollection = true;
      } else {
        const userRef = doc(db, 'users', memberId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          return {
            success: false,
            error: 'Üye bulunamadı'
          };
        }

        targetRef = userRef;
        currentData = userDoc.data();
      }

      // Clean payload (Firestore rejects undefined)
      const sanitizedData = {};
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === 'remainingClasses') {
            const numericValue = Number(value);
            sanitizedData.remainingClasses = Number.isFinite(numericValue) ? numericValue : 0;
          } else {
            sanitizedData[key] = value;
          }
        }
      });

      // Keep displayName consistent
      const firstName = sanitizedData.firstName ?? currentData?.firstName ?? '';
      const lastName = sanitizedData.lastName ?? currentData?.lastName ?? '';
      const displayName = `${firstName} ${lastName}`.trim();
      if (displayName) {
        sanitizedData.displayName = displayName;
      }

      const hasPackageId = Object.prototype.hasOwnProperty.call(sanitizedData, 'packageId');

      if (hasPackageId) {
        if (sanitizedData.packageId) {
          const packageRef = doc(db, 'packages', sanitizedData.packageId);
          const packageDoc = await getDoc(packageRef);

          let packageName = sanitizedData.packageName || currentData?.packageName || 'Standart Paket';
          let packageType = sanitizedData.packageType || currentData?.packageType || 'group';
          let durationInMonths = 1;
          let classCount = typeof sanitizedData.remainingClasses === 'number'
            ? sanitizedData.remainingClasses
            : Number(currentData?.remainingClasses ?? 0);

          if (packageDoc.exists()) {
            const packageData = packageDoc.data();
            packageName = packageData.name || packageName;
            const resolvedType = resolvePackageType(packageData);
            if (resolvedType) {
              packageType = resolvedType;
            }
            durationInMonths = Number(packageData.duration) || 1;

            const packageClasses = packageData.classes ?? packageData.lessonCount ?? packageData.lessons ?? packageData.sessions;
            // Only override if classCount is NaN or negative, NOT if it's 0 (0 is valid - user used all credits)
            if (!Number.isFinite(classCount) || classCount < 0) {
              classCount = Number(packageClasses);
            }
          }

          if (!Number.isFinite(classCount) || classCount < 0) {
            classCount = 0;
          }

          if (!Object.prototype.hasOwnProperty.call(sanitizedData, 'membershipType')) {
            if (classCount === 999) {
              sanitizedData.membershipType = 'unlimited';
            } else if (classCount >= 12) {
              sanitizedData.membershipType = 'premium';
            } else {
              sanitizedData.membershipType = 'basic';
            }
          }

          sanitizedData.packageName = packageName;
          sanitizedData.packageType = packageType;
          sanitizedData.remainingClasses = classCount;
          sanitizedData.lessonCredits = classCount;

          let packageStartDate = sanitizedData.packageStartDate
            ? new Date(sanitizedData.packageStartDate)
            : null;
          if (!packageStartDate || Number.isNaN(packageStartDate.getTime())) {
            packageStartDate = new Date();
          }

          let packageExpiryDate = sanitizedData.packageExpiryDate
            ? new Date(sanitizedData.packageExpiryDate)
            : null;
          if (!packageExpiryDate || Number.isNaN(packageExpiryDate.getTime())) {
            packageExpiryDate = new Date(packageStartDate);
            // Use 30 days per month for consistent expiry calculation across all platforms
            packageExpiryDate.setDate(packageExpiryDate.getDate() + (durationInMonths * 30));
          }

          sanitizedData.packageStartDate = packageStartDate.toISOString();
          sanitizedData.packageExpiryDate = packageExpiryDate.toISOString();

          if (!Object.prototype.hasOwnProperty.call(sanitizedData, 'membershipStatus')) {
            sanitizedData.membershipStatus = 'active';
          }
          if (!Object.prototype.hasOwnProperty.call(sanitizedData, 'status')) {
            sanitizedData.status = 'approved';
          }
          if (!Object.prototype.hasOwnProperty.call(sanitizedData, 'isActive')) {
            sanitizedData.isActive = true;
          }

          sanitizedData.packageInfo = {
            packageId: sanitizedData.packageId,
            packageName,
            packageType,
            lessonCount: classCount,
            assignedAt: sanitizedData.packageStartDate,
            expiryDate: sanitizedData.packageExpiryDate
          };
        } else {
          sanitizedData.packageId = null;
          sanitizedData.packageName = null;
          sanitizedData.packageType = null;
          sanitizedData.packageStartDate = null;
          sanitizedData.packageExpiryDate = null;
          sanitizedData.packageInfo = null;
          sanitizedData.remainingClasses = sanitizedData.remainingClasses ?? 0;
          sanitizedData.lessonCredits = sanitizedData.remainingClasses;

          if (!Object.prototype.hasOwnProperty.call(sanitizedData, 'membershipStatus')) {
            sanitizedData.membershipStatus = 'inactive';
          }
        }
      } else if (Object.prototype.hasOwnProperty.call(sanitizedData, 'remainingClasses')) {
        sanitizedData.lessonCredits = sanitizedData.remainingClasses;
      }

      sanitizedData.updatedAt = usesMembersCollection ? serverTimestamp() : new Date().toISOString();

      await updateDoc(targetRef, sanitizedData);

      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Error updating member:', error);
      return {
        success: false,
        error: 'Üye güncellenemedi'
      };
    }
  }

  // Get member by ID
  async getMemberById(memberId) {
    try {
      // First try members collection
      const memberDoc = await getDoc(doc(db, this.membersCollection, memberId));
      
      if (memberDoc.exists()) {
        const data = memberDoc.data();
        return {
          success: true,
          data: {
            id: memberDoc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
          }
        };
      }

      // If not found in members collection, try users collection
      const userDoc = await getDoc(doc(db, 'users', memberId));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Normalize user data to match member structure
        return {
          success: true,
          data: {
            id: userDoc.id,
            ...userData,
            // Ensure displayName exists
            displayName: userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email,
            // Normalize membership fields
            membershipType: userData.membershipType || 'basic',
            membershipStatus: userData.status || 'active',
            status: userData.status === 'approved' || userData.status === 'active' ? 'approved' : userData.status || 'pending',
            createdAt: userData.createdAt?.toDate?.()?.toISOString() || userData.createdAt,
            updatedAt: userData.updatedAt?.toDate?.()?.toISOString() || userData.updatedAt
          }
        };
      }

      // Not found in either collection
      return {
        success: false,
        error: 'Üye bulunamadı'
      };
    } catch (error) {
      console.error('❌ Error getting member:', error);
      return {
        success: false,
        error: 'Üye bilgileri alınamadı'
      };
    }
  }

  // Delete member (marks as permanently deleted instead of actual deletion)
  async deleteMember(memberId) {
    try {
      let memberData = null;
      let memberRef = null;
      
      // Check if it's in members collection first
      const memberDocRef = doc(db, this.membersCollection, memberId);
      const memberDoc = await getDoc(memberDocRef);
      
      if (memberDoc.exists()) {
        // It's in members collection
        memberData = memberDoc.data();
        memberRef = memberDocRef;
      } else {
        // Check if it's a user in users collection
        const userRef = doc(db, 'users', memberId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          return {
            success: false,
            error: 'Üye bulunamadı'
          };
        }

        memberData = userDoc.data();
        memberRef = userRef;
      }

      // Instead of deleting, mark as permanently deleted
      const deleteData = {
        status: 'permanently_deleted',
        membershipStatus: 'deleted',
        deletedAt: new Date().toISOString(),
        deletedBy: 'admin', // You can pass this as a parameter if needed
        deletionReason: 'Admin panel deletion',
        // Keep original data for audit purposes
        originalData: memberData,
        // Disable login
        loginDisabled: true,
        updatedAt: serverTimestamp()
      };

      await updateDoc(memberRef, deleteData);
      

      return {
        success: true,
        data: { 
          status: 'permanently_deleted',
          message: 'Üye kalıcı olarak silindi ve giriş yapması engellendi'
        }
      };
    } catch (error) {
      console.error('❌ Error deleting member:', error);
      return {
        success: false,
        error: 'Üye silinemedi'
      };
    }
  }

  // Hard delete member (permanent deletion from database - use with caution)
  async hardDeleteMember(memberId) {
    try {
      // Check if it's in members collection first
      const memberRef = doc(db, this.membersCollection, memberId);
      const memberDoc = await getDoc(memberRef);
      
      if (memberDoc.exists()) {
        // It's in members collection
        await deleteDoc(memberRef);
      } else {
        // Check if it's a user in users collection
        const userRef = doc(db, 'users', memberId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          return {
            success: false,
            error: 'Üye bulunamadı'
          };
        }

        await deleteDoc(userRef);
      }
      

      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Error hard deleting member:', error);
      return {
        success: false,
        error: 'Üye silinemedi'
      };
    }
  }

  // Get member statistics
  async getMemberStatistics() {
    try {
      const membersCollection = collection(db, this.membersCollection);
      const querySnapshot = await getDocs(membersCollection);
      const members = querySnapshot.docs.map(doc => doc.data());

      const stats = {
        total: members.length,
        pending: members.filter(m => m.status === 'pending').length,
        approved: members.filter(m => m.status === 'approved').length,
        rejected: members.filter(m => m.status === 'rejected').length,
        active: members.filter(m => m.membershipStatus === 'active').length,
        inactive: members.filter(m => m.membershipStatus === 'inactive').length,
        membershipTypes: {
          basic: members.filter(m => m.membershipType === 'basic').length,
          premium: members.filter(m => m.membershipType === 'premium').length,
          unlimited: members.filter(m => m.membershipType === 'unlimited').length
        },
        genderBreakdown: {
          male: members.filter(m => m.gender === 'male').length,
          female: members.filter(m => m.gender === 'female').length,
          other: members.filter(m => m.gender === 'other').length
        }
      };

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('❌ Error getting member statistics:', error);
      return {
        success: false,
        error: 'Üye istatistikleri alınamadı'
      };
    }
  }

  // Record member visit
  async recordVisit(memberId) {
    try {
      let memberData = null;
      let memberRef = null;
      
      // Check if it's in members collection first
      const memberDocRef = doc(db, this.membersCollection, memberId);
      const memberDoc = await getDoc(memberDocRef);
      
      if (memberDoc.exists()) {
        // It's in members collection
        memberData = memberDoc.data();
        memberRef = memberDocRef;
      } else {
        // Check if it's a user in users collection
        const userRef = doc(db, 'users', memberId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          return {
            success: false,
            error: 'Üye bulunamadı'
          };
        }

        memberData = userDoc.data();
        memberRef = userRef;
      }

      const newRemainingClasses = Math.max(0, (memberData.remainingClasses || 0) - 1);

      await updateDoc(memberRef, {
        lastVisit: new Date().toISOString(),
        totalVisits: (memberData.totalVisits || 0) + 1,
        remainingClasses: memberData.membershipType === 'unlimited' ? 999 : newRemainingClasses,
        updatedAt: serverTimestamp()
      });


      return {
        success: true,
        remainingClasses: memberData.membershipType === 'unlimited' ? 999 : newRemainingClasses
      };
    } catch (error) {
      console.error('❌ Error recording visit:', error);
      return {
        success: false,
        error: 'Ziyaret kaydedilemedi'
      };
    }
  }

  // Cancel membership with refund
  async cancelMembership(memberId, cancellationData) {
    try {
      const { reason, refundAmount, cancelledBy } = cancellationData;
      
      let memberData = null;
      let memberRef = null;
      
      // Check if it's in members collection first
      const memberDocRef = doc(db, this.membersCollection, memberId);
      const memberDoc = await getDoc(memberDocRef);
      
      if (memberDoc.exists()) {
        memberData = memberDoc.data();
        memberRef = memberDocRef;
      } else {
        // Check if it's a user in users collection
        const userRef = doc(db, 'users', memberId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          return {
            success: false,
            error: 'Üye bulunamadı'
          };
        }

        memberData = userDoc.data();
        memberRef = userRef;
      }

      // Cancel membership
      const cancelData = {
        membershipStatus: 'cancelled',
        status: 'cancelled',
        cancellationDate: new Date().toISOString(),
        cancellationReason: reason,
        refundAmount: refundAmount || 0,
        cancelledBy: cancelledBy || 'admin',
        // Clear remaining classes and credits
        remainingClasses: 0,
        lessonCredits: 0,
        // Clear package information
        packageId: null,
        packageName: null,
        membershipType: null,
        // Keep original data for audit purposes
        originalMembershipData: {
          membershipType: memberData.membershipType || null,
          remainingClasses: memberData.remainingClasses || 0,
          lessonCredits: memberData.lessonCredits || 0,
          packageId: memberData.packageId || null,
          packageName: memberData.packageName || null,
          membershipStatus: memberData.membershipStatus
        },
        updatedAt: serverTimestamp()
      };

      await updateDoc(memberRef, cancelData);
      

      return {
        success: true,
        data: { 
          status: 'cancelled',
          message: 'Üyelik iptal edildi',
          refundAmount
        }
      };
    } catch (error) {
      console.error('❌ Error cancelling membership:', error);
      return {
        success: false,
        error: 'Üyelik iptal edilemedi'
      };
    }
  }

  // Freeze membership
  async freezeMembership(memberId, freezeData) {
    try {
      const { reason, freezeEndDate, frozenBy, freezeType = 'individual' } = freezeData;
      
      let memberData = null;
      let memberRef = null;
      
      // Check if it's in members collection first
      const memberDocRef = doc(db, this.membersCollection, memberId);
      const memberDoc = await getDoc(memberDocRef);
      
      if (memberDoc.exists()) {
        memberData = memberDoc.data();
        memberRef = memberDocRef;
      } else {
        // Check if it's a user in users collection
        const userRef = doc(db, 'users', memberId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          return {
            success: false,
            error: 'Üye bulunamadı'
          };
        }

        memberData = userDoc.data();
        memberRef = userRef;
      }

      const freezeStartDate = new Date();
      const freezeStartDateISO = freezeStartDate.toISOString();
      let freezeEndDateObj = parseDateValue(freezeEndDate);
      if (!freezeEndDateObj) {
        console.warn('Invalid freeze end date provided, defaulting to freeze start date');
        freezeEndDateObj = new Date(freezeStartDate);
      }

      // Calculate freeze duration in days (inclusive of the end date)
      const normalizedStart = new Date(freezeStartDate);
      normalizedStart.setHours(0, 0, 0, 0);
      const normalizedEnd = new Date(freezeEndDateObj);
      normalizedEnd.setHours(23, 59, 59, 999);
      let freezeDurationDays = Math.ceil((normalizedEnd.getTime() - normalizedStart.getTime()) / MS_PER_DAY);
      if (!Number.isFinite(freezeDurationDays) || freezeDurationDays < 0) {
        freezeDurationDays = 0;
      }

      // Determine current package expiry and extend it by freeze duration
      const currentExpiryRaw = memberData.packageExpiryDate || memberData.packageInfo?.expiryDate || null;
      let extendedExpiryISO = null;
      if (currentExpiryRaw) {
        const expiryDate = parseDateValue(currentExpiryRaw);
        if (expiryDate) {
          if (freezeDurationDays > 0) {
            const extendedExpiry = new Date(expiryDate);
            extendedExpiry.setDate(extendedExpiry.getDate() + freezeDurationDays);
            extendedExpiryISO = extendedExpiry.toISOString();
          } else {
            // Keep the original expiry if duration calculation failed
            extendedExpiryISO = expiryDate.toISOString();
          }
        }
      }

      let updatedPackageInfo = memberData.packageInfo ? { ...memberData.packageInfo } : null;
      if (extendedExpiryISO) {
        if (!updatedPackageInfo) {
          const packageStartRaw = memberData.packageStartDate || memberData.packageInfo?.assignedAt || freezeStartDateISO;
          const normalizedPackageStart = parseDateValue(packageStartRaw) || freezeStartDate;
          updatedPackageInfo = {
            packageId: memberData.packageId || null,
            packageName: memberData.packageName || null,
            lessonCount: memberData.lessonCredits || memberData.remainingClasses || 0,
            assignedAt: normalizedPackageStart.toISOString()
          };
        }
        updatedPackageInfo.expiryDate = extendedExpiryISO;
      }

      // Freeze membership
      const freezeDataObj = {
        membershipStatus: 'frozen',
        status: 'frozen',
        freezeStartDate: freezeStartDateISO,
        freezeEndDate: freezeEndDate,
        freezeReason: reason,
        frozenBy: frozenBy || 'admin',
        freezeType: freezeType, // 'individual' or 'group'
        freezeDurationDays: freezeDurationDays || null,
        // Keep original data for audit purposes - only include defined values
        originalMembershipData: {
          membershipType: memberData.membershipType || 'basic',
          remainingClasses: memberData.remainingClasses || 0,
          membershipStatus: memberData.membershipStatus || memberData.status || 'active',
          packageExpiryDate: memberData.packageExpiryDate || memberData.packageInfo?.expiryDate || null
        },
        updatedAt: serverTimestamp()
      };

      if (extendedExpiryISO) {
        freezeDataObj.packageExpiryDate = extendedExpiryISO;
        freezeDataObj.packageInfo = updatedPackageInfo;
      }

      await updateDoc(memberRef, freezeDataObj);
      

      return {
        success: true,
        data: { 
          status: 'frozen',
          message: 'Üyelik donduruldu',
          freezeEndDate
        }
      };
    } catch (error) {
      console.error('❌ Error freezing membership:', error);
      return {
        success: false,
        error: 'Üyelik dondurulamadı'
      };
    }
  }

  // Freeze membership for all active customers
  async freezeAllMembers(bulkFreezeData = {}) {
    try {
      const { reason, freezeEndDate, frozenBy } = bulkFreezeData;

      if (!reason || !reason.trim()) {
        return {
          success: false,
          error: 'Dondurma sebebi zorunludur'
        };
      }

      const parsedEndDate = parseDateValue(freezeEndDate);
      if (!parsedEndDate) {
        return {
          success: false,
          error: 'Geçerli bir dondurma bitiş tarihi seçiniz'
        };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsedEndDate <= today) {
        return {
          success: false,
          error: 'Dondurma bitiş tarihi bugünden sonraki bir tarih olmalıdır'
        };
      }

      const sanitizedPayload = {
        reason: reason.trim(),
        freezeEndDate: parsedEndDate.toISOString(),
        frozenBy: frozenBy || 'admin',
        freezeType: 'group' // Mark as group freeze
      };

      const processedIds = new Set();
      let eligibleCount = 0;
      let frozenCount = 0;
      let alreadyFrozenCount = 0;
      let skippedCount = 0;
      const errors = [];

      const membersSnapshot = await getDocs(collection(db, this.membersCollection));
      const usersSnapshot = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'customer'))
      );

      const snapshots = [
        { docs: membersSnapshot.docs },
        { docs: usersSnapshot.docs }
      ];

      for (const { docs } of snapshots) {
        for (const docSnap of docs) {
          const memberId = docSnap.id;
          if (processedIds.has(memberId)) {
            continue;
          }
          processedIds.add(memberId);

          const data = docSnap.data() || {};

          if (data.status === 'permanently_deleted' || data.membershipStatus === 'permanently_deleted') {
            skippedCount += 1;
            continue;
          }

          if (data.membershipStatus === 'cancelled' || data.status === 'cancelled') {
            skippedCount += 1;
            continue;
          }

          if (data.membershipStatus === 'frozen' || data.status === 'frozen') {
            alreadyFrozenCount += 1;
            continue;
          }

          eligibleCount += 1;

          const freezeResult = await this.freezeMembership(memberId, sanitizedPayload);
          if (freezeResult.success) {
            frozenCount += 1;
          } else {
            errors.push({
              memberId,
              error: freezeResult.error || 'Bilinmeyen hata'
            });
          }
        }
      }

      const messageParts = [];
      messageParts.push(`Toplam ${frozenCount} üye donduruldu`);
      if (alreadyFrozenCount > 0) {
        messageParts.push(`${alreadyFrozenCount} üye zaten dondurulmuştu`);
      }
      if (skippedCount > 0) {
        messageParts.push(`${skippedCount} üye aktif olmadığı için atlandı`);
      }
      if (errors.length > 0) {
        messageParts.push(`${errors.length} üyede hata oluştu`);
      }

      return {
        success: frozenCount > 0 && errors.length === 0,
        data: {
          eligibleCount,
          frozenCount,
          alreadyFrozenCount,
          skippedCount,
          errors,
          hasErrors: errors.length > 0
        },
        message: messageParts.join('. ') + '.',
        errorMessage: errors.length ? `${errors.length} üye dondurulamadı` : undefined
      };
    } catch (error) {
      console.error('❌ Error freezing all members:', error);
      return {
        success: false,
        error: 'Toplu dondurma işlemi gerçekleştirilemedi'
      };
    }
  }

  async unfreezeAllMembers(bulkUnfreezeData = {}) {
    try {
      const { reason, unfrozenBy } = bulkUnfreezeData || {};
      const sanitizedReason = typeof reason === 'string' ? reason.trim() : '';
      const actor = unfrozenBy || 'admin';

      const processedIds = new Set();
      let frozenCount = 0;
      let unfrozenCount = 0;
      let skippedCount = 0;
      let individualFreezeCount = 0; // Track individually frozen members that are skipped
      const errors = [];

      const membersSnapshot = await getDocs(collection(db, this.membersCollection));
      const usersSnapshot = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'customer'))
      );

      const snapshots = [
        { docs: membersSnapshot.docs },
        { docs: usersSnapshot.docs }
      ];

      for (const { docs } of snapshots) {
        for (const docSnap of docs) {
          const memberId = docSnap.id;
          if (processedIds.has(memberId)) {
            continue;
          }
          processedIds.add(memberId);

          const data = docSnap.data() || {};

          if (data.status === 'permanently_deleted' || data.membershipStatus === 'permanently_deleted') {
            skippedCount += 1;
            continue;
          }

          if (data.membershipStatus !== 'frozen' && data.status !== 'frozen') {
            skippedCount += 1;
            continue;
          }

          // Skip members with individual freeze - only unfreeze group freezes
          if (data.freezeType === 'individual') {
            individualFreezeCount += 1;
            skippedCount += 1;
            continue;
          }

          frozenCount += 1;

          const options = sanitizedReason ? { reason: sanitizedReason } : {};
          const unfreezeResult = await this.unfreezeMembership(memberId, actor, options);
          if (unfreezeResult.success) {
            unfrozenCount += 1;
          } else {
            errors.push({
              memberId,
              error: unfreezeResult.error || 'Bilinmeyen hata'
            });
          }
        }
      }

      const messageParts = [];
      messageParts.push(`Toplam ${unfrozenCount} üye yeniden aktifleştirildi`);
      if (individualFreezeCount > 0) {
        messageParts.push(`${individualFreezeCount} üye bireysel dondurulmuş olduğu için atlandı`);
      }
      if (skippedCount - individualFreezeCount > 0) {
        messageParts.push(`${skippedCount - individualFreezeCount} üye dondurulmuş olmadığı için atlandı`);
      }
      if (errors.length > 0) {
        messageParts.push(`${errors.length} üyede hata oluştu`);
      }

      return {
        success: unfrozenCount > 0 && errors.length === 0,
        data: {
          frozenCount,
          unfrozenCount,
          skippedCount,
          individualFreezeCount,
          errors,
          hasErrors: errors.length > 0
        },
        message: messageParts.join('. ') + '.',
        errorMessage: errors.length ? `${errors.length} üyenin dondurması kaldırılamadı` : undefined
      };
    } catch (error) {
      console.error('❌ Error unfreezing all members:', error);
      return {
        success: false,
        error: 'Toplu dondurma kaldırma işlemi gerçekleştirilemedi'
      };
    }
  }

  // Unfreeze membership
  async unfreezeMembership(memberId, unfrozenBy, options = {}) {
    try {
      const { reason } = options || {};
      let memberData = null;
      let memberRef = null;
      
      // Check if it's in members collection first
      const memberDocRef = doc(db, this.membersCollection, memberId);
      const memberDoc = await getDoc(memberDocRef);
      
      if (memberDoc.exists()) {
        memberData = memberDoc.data();
        memberRef = memberDocRef;
      } else {
        // Check if it's a user in users collection
        const userRef = doc(db, 'users', memberId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          return {
            success: false,
            error: 'Üye bulunamadı'
          };
        }

        memberData = userDoc.data();
        memberRef = userRef;
      }

      if (memberData.membershipStatus !== 'frozen') {
        return {
          success: false,
          error: 'Üyelik zaten dondurulmuş değil'
        };
      }

      const originalData = memberData.originalMembershipData || {};

      // Calculate actual frozen days to adjust expiry
      const now = new Date();
      const freezeStart = parseDateValue(memberData.freezeStartDate);
      const recordedDuration = Number.isFinite(memberData.freezeDurationDays)
        ? memberData.freezeDurationDays
        : null;

      let actualFrozenDays = 0;
      if (freezeStart) {
        const normalizedStart = new Date(freezeStart);
        normalizedStart.setHours(0, 0, 0, 0);
        const normalizedNow = new Date(now);
        normalizedNow.setHours(23, 59, 59, 999);
        actualFrozenDays = Math.ceil((normalizedNow.getTime() - normalizedStart.getTime()) / MS_PER_DAY);
        if (actualFrozenDays < 0) {
          actualFrozenDays = 0;
        }
        if (recordedDuration !== null) {
          actualFrozenDays = Math.min(actualFrozenDays, recordedDuration);
        }
      } else if (recordedDuration !== null) {
        actualFrozenDays = Math.max(0, recordedDuration);
      }

      // Get the original expiry date (before freeze was applied)
      const originalExpiryDate = parseDateValue(originalData.packageExpiryDate);
      let recalculatedExpiryISO = null;

      if (originalExpiryDate) {
        // Calculate how many days were NOT used from the planned freeze
        const plannedFreezeDays = recordedDuration || 0;
        const unusedFreezeDays = Math.max(0, plannedFreezeDays - actualFrozenDays);

        // Start from original expiry + actual frozen days (what we should have)
        const recalculatedExpiry = new Date(originalExpiryDate);
        recalculatedExpiry.setDate(recalculatedExpiry.getDate() + actualFrozenDays);

        recalculatedExpiryISO = recalculatedExpiry.toISOString();

        console.log(`📅 Unfreeze calculation:
          Original expiry: ${originalExpiryDate.toISOString()}
          Planned freeze days: ${plannedFreezeDays}
          Actual frozen days: ${actualFrozenDays}
          Unused freeze days: ${unusedFreezeDays}
          New expiry: ${recalculatedExpiryISO}
        `);
      } else {
        const fallbackExpiry = parseDateValue(memberData.packageExpiryDate || memberData.packageInfo?.expiryDate);
        recalculatedExpiryISO = fallbackExpiry ? fallbackExpiry.toISOString() : null;
      }

      let updatedPackageInfo = memberData.packageInfo ? { ...memberData.packageInfo } : null;
      if (recalculatedExpiryISO) {
        if (!updatedPackageInfo) {
          const packageStartRaw = memberData.packageStartDate || memberData.packageInfo?.assignedAt || now.toISOString();
          const normalizedPackageStart = parseDateValue(packageStartRaw) || now;
          updatedPackageInfo = {
            packageId: memberData.packageId || null,
            packageName: memberData.packageName || null,
            lessonCount: memberData.lessonCredits || memberData.remainingClasses || 0,
            assignedAt: normalizedPackageStart.toISOString(),
            expiryDate: recalculatedExpiryISO
          };
        } else {
          updatedPackageInfo.expiryDate = recalculatedExpiryISO;
        }
      }

      // Restore original membership data
      const unfreezeData = {
        membershipStatus: originalData.membershipStatus || 'active',
        status: 'approved',
        unfreezeDate: new Date().toISOString(),
        unfrozenBy: unfrozenBy || 'admin',
        unfreezeReason: reason || null,
        // Remove freeze-related fields
        freezeStartDate: null,
        freezeEndDate: null,
        freezeReason: null,
        frozenBy: null,
        freezeType: null, // Clear freeze type
        freezeDurationDays: null,
        originalMembershipData: null,
        updatedAt: serverTimestamp()
      };

      if (recalculatedExpiryISO) {
        unfreezeData.packageExpiryDate = recalculatedExpiryISO;
        unfreezeData.packageInfo = updatedPackageInfo;
      }

      await updateDoc(memberRef, unfreezeData);
      

      return {
        success: true,
        data: { 
          status: 'active',
          message: 'Üyelik dondurma kaldırıldı'
        }
      };
    } catch (error) {
      console.error('❌ Error unfreezing membership:', error);
      return {
        success: false,
        error: 'Üyelik dondurma kaldırılamadı'
      };
    }
  }

  // Reactivate cancelled membership
  async reactivateMembership(memberId, reactivatedBy) {
    try {
      let memberData = null;
      let memberRef = null;
      
      // Check if it's in members collection first
      const memberDocRef = doc(db, this.membersCollection, memberId);
      const memberDoc = await getDoc(memberDocRef);
      
      if (memberDoc.exists()) {
        memberData = memberDoc.data();
        memberRef = memberDocRef;
      } else {
        // Check if it's a user in users collection
        const userRef = doc(db, 'users', memberId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          return {
            success: false,
            error: 'Üye bulunamadı'
          };
        }

        memberData = userDoc.data();
        memberRef = userRef;
      }

      if (memberData.membershipStatus !== 'cancelled') {
        return {
          success: false,
          error: 'Üyelik zaten iptal edilmiş değil'
        };
      }

      // Restore original membership data
      const originalData = memberData.originalMembershipData || {};
      const reactivateData = {
        membershipStatus: originalData.membershipStatus || 'active',
        status: 'approved',
        reactivationDate: new Date().toISOString(),
        reactivatedBy: reactivatedBy || 'admin',
        // Remove cancellation-related fields
        cancellationDate: null,
        cancellationReason: null,
        refundAmount: null,
        cancelledBy: null,
        updatedAt: serverTimestamp()
      };

      await updateDoc(memberRef, reactivateData);
      

      return {
        success: true,
        data: { 
          status: 'active',
          message: 'Üyelik yeniden aktifleştirildi'
        }
      };
    } catch (error) {
      console.error('❌ Error reactivating membership:', error);
      return {
        success: false,
        error: 'Üyelik yeniden aktifleştirilemedi'
      };
    }
  }

  // Check for expired packages and reset credits
  async checkAndResetExpiredPackages() {
    try {
      console.log('🔄 Checking for expired packages...');
      
      const today = new Date();
      const expiredMembers = [];
      const processedMembers = [];

      // Check both collections for expired packages
      const [membersSnapshot, usersSnapshot] = await Promise.all([
        getDocs(collection(db, this.membersCollection)),
        getDocs(collection(db, 'users'))
      ]);

      // Process members collection
      for (const doc of membersSnapshot.docs) {
        const memberData = doc.data();
        if (await this.processExpiredMember(doc.id, memberData, today, 'members')) {
          expiredMembers.push({...memberData, id: doc.id});
        }
        processedMembers.push(doc.id);
      }

      // Process users collection (avoid duplicates)
      for (const doc of usersSnapshot.docs) {
        if (!processedMembers.includes(doc.id)) {
          const userData = doc.data();
          if (await this.processExpiredMember(doc.id, userData, today, 'users')) {
            expiredMembers.push({...userData, id: doc.id});
          }
        }
      }

      console.log(`✅ Processed package expiration check. Found ${expiredMembers.length} expired packages`);
      
      return {
        success: true,
        expiredCount: expiredMembers.length,
        expiredMembers: expiredMembers.map(m => ({
          id: m.id,
          name: m.displayName || `${m.firstName} ${m.lastName}`,
          remainingClasses: m.remainingClasses,
          packageExpiryDate: m.packageExpiryDate
        }))
      };
    } catch (error) {
      console.error('❌ Error checking expired packages:', error);
      return {
        success: false,
        error: 'Paket süre dolumu kontrolü sırasında hata oluştu'
      };
    }
  }

  // Silent automatic check for expired packages and frozen memberships (no console logs)
  async autoCheckExpiredPackages() {
    try {
      const today = new Date();
      const processedMembers = [];

      // Check both collections for expired packages and frozen memberships
      const [membersSnapshot, usersSnapshot] = await Promise.all([
        getDocs(collection(db, this.membersCollection)),
        getDocs(collection(db, 'users'))
      ]);

      // Process members collection
      for (const doc of membersSnapshot.docs) {
        const memberData = doc.data();
        await this.processExpiredMemberSilent(doc.id, memberData, today, 'members');
        // Check for expired freeze
        await this.autoUnfreezeIfExpired(doc.id, memberData, today);
        processedMembers.push(doc.id);
      }

      // Process users collection (avoid duplicates)
      for (const doc of usersSnapshot.docs) {
        if (!processedMembers.includes(doc.id)) {
          const userData = doc.data();
          await this.processExpiredMemberSilent(doc.id, userData, today, 'users');
          // Check for expired freeze
          await this.autoUnfreezeIfExpired(doc.id, userData, today);
        }
      }
    } catch (error) {
      // Silent fail - don't disrupt normal operations
      console.error('Silent package check error:', error);
    }
  }

  // Auto-unfreeze members whose freeze end date has passed
  async autoUnfreezeIfExpired(memberId, memberData, today) {
    try {
      // Only process frozen members
      if (memberData.membershipStatus !== 'frozen' && memberData.status !== 'frozen') {
        return false;
      }

      // Check if freeze end date has passed
      const freezeEndDate = parseDateValue(memberData.freezeEndDate);
      if (!freezeEndDate) {
        return false;
      }

      // Normalize dates for comparison (compare end of freeze day)
      const normalizedFreezeEnd = new Date(freezeEndDate);
      normalizedFreezeEnd.setHours(23, 59, 59, 999);
      
      const normalizedToday = new Date(today);
      normalizedToday.setHours(0, 0, 0, 0);

      // If freeze end date has passed, auto-unfreeze
      if (normalizedFreezeEnd < normalizedToday) {
        console.log(`🔄 Auto-unfreezing member ${memberData.displayName || memberData.firstName} - freeze period ended`);
        await this.unfreezeMembership(memberId, 'system-auto', { reason: 'Dondurma süresi doldu - Otomatik aktifleştirildi' });
        return true;
      }

      return false;
    } catch (error) {
      // Silent fail
      console.error(`Error auto-unfreezing member ${memberId}:`, error);
      return false;
    }
  }

  // Helper function to process individual member expiration
  async processExpiredMember(memberId, memberData, today, collection) {
    try {
      const packageExpiryDate = memberData.packageExpiryDate ? new Date(memberData.packageExpiryDate) : null;
      const remainingClasses = memberData.remainingClasses || 0;
      
      // Skip unlimited memberships and already expired members
      if (memberData.membershipType === 'unlimited' || remainingClasses === 0) {
        return false;
      }

      // Check if package has expired
      if (packageExpiryDate && packageExpiryDate < today && remainingClasses > 0) {
        console.log(`📋 Resetting credits for expired member: ${memberData.displayName || memberData.firstName}`);
        
        const updateData = {
          remainingClasses: 0,
          packageExpiredAt: today.toISOString(),
          lastPackageResetReason: 'Package expired after 1 month',
          updatedAt: collection === 'members' ? serverTimestamp() : new Date().toISOString()
        };

        const docRef = doc(db, collection, memberId);
        await updateDoc(docRef, updateData);
        
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ Error processing member ${memberId}:`, error);
      return false;
    }
  }

  // Silent version for automatic background checks
  async processExpiredMemberSilent(memberId, memberData, today, collection) {
    try {
      const packageExpiryDate = memberData.packageExpiryDate ? new Date(memberData.packageExpiryDate) : null;
      const remainingClasses = memberData.remainingClasses || 0;
      
      // Skip unlimited memberships and already expired members
      if (memberData.membershipType === 'unlimited' || remainingClasses === 0) {
        return false;
      }

      // Check if package has expired
      if (packageExpiryDate && packageExpiryDate < today && remainingClasses > 0) {
        const updateData = {
          remainingClasses: 0,
          packageExpiredAt: today.toISOString(),
          lastPackageResetReason: 'Package expired after 1 month - Auto reset',
          updatedAt: collection === 'members' ? serverTimestamp() : new Date().toISOString()
        };

        const docRef = doc(db, collection, memberId);
        await updateDoc(docRef, updateData);
        
        return true;
      }

      return false;
    } catch {
      // Silent fail
      return false;
    }
  }

  // Manual reset for specific member
  async resetMemberPackageCredits(memberId, resetBy, reason = 'Manual reset - Package expired') {
    try {
      // Try members collection first
      let memberRef = doc(db, this.membersCollection, memberId);
      let memberDoc = await getDoc(memberRef);
      
      if (!memberDoc.exists()) {
        // Try users collection
        memberRef = doc(db, 'users', memberId);
        memberDoc = await getDoc(memberRef);
        
        if (!memberDoc.exists()) {
          return {
            success: false,
            error: 'Üye bulunamadı'
          };
        }
      }

      const memberData = memberDoc.data();
      const updateData = {
        remainingClasses: 0,
        packageExpiredAt: new Date().toISOString(),
        lastPackageResetReason: reason,
        packageResetBy: resetBy,
        updatedAt: memberRef.path.includes('members') ? serverTimestamp() : new Date().toISOString()
      };

      await updateDoc(memberRef, updateData);

      return {
        success: true,
        message: `${memberData.displayName || memberData.firstName} adlı üyenin paket kredileri sıfırlandı`,
        resetData: {
          previousCredits: memberData.remainingClasses || 0,
          resetDate: updateData.packageExpiredAt,
          reason: reason
        }
      };
    } catch (error) {
      console.error('❌ Error resetting member package credits:', error);
      return {
        success: false,
        error: 'Paket kredileri sıfırlanamadı'
      };
    }
  }

  // Get members with packages expiring soon (within X days)
  async getMembersWithExpiringPackages(daysAhead = 7) {
    try {
      const today = new Date();
      const warningDate = new Date(today);
      warningDate.setDate(warningDate.getDate() + daysAhead);
      
      const expiringMembers = [];
      
      const [membersSnapshot, usersSnapshot] = await Promise.all([
        getDocs(collection(db, this.membersCollection)),
        getDocs(collection(db, 'users'))
      ]);

      // Check members collection
      membersSnapshot.forEach((doc) => {
        const memberData = doc.data();
        if (this.isPackageExpiringSoon(memberData, today, warningDate)) {
          expiringMembers.push({
            id: doc.id,
            ...memberData,
            daysUntilExpiry: Math.ceil((new Date(memberData.packageExpiryDate) - today) / (1000 * 60 * 60 * 24))
          });
        }
      });

      // Check users collection
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        if (this.isPackageExpiringSoon(userData, today, warningDate)) {
          expiringMembers.push({
            id: doc.id,
            ...userData,
            daysUntilExpiry: Math.ceil((new Date(userData.packageExpiryDate) - today) / (1000 * 60 * 60 * 24))
          });
        }
      });

      return {
        success: true,
        expiringMembers: expiringMembers,
        warningDays: daysAhead
      };
    } catch (error) {
      console.error('❌ Error getting expiring packages:', error);
      return {
        success: false,
        error: 'Süresi dolacak paketler getirilemedi'
      };
    }
  }

  // Helper function to check if package is expiring soon
  isPackageExpiringSoon(memberData, today, warningDate) {
    const packageExpiryDate = memberData.packageExpiryDate ? new Date(memberData.packageExpiryDate) : null;
    const remainingClasses = memberData.remainingClasses || 0;

    return packageExpiryDate &&
           packageExpiryDate > today &&
           packageExpiryDate <= warningDate &&
           remainingClasses > 0 &&
           memberData.membershipType !== 'unlimited' &&
           memberData.membershipStatus === 'active';
  }

  // Renew a package for a user
  async renewPackage(userId, packageId, startDateString = null) {
    try {
      console.log(`🔄 Renewing package ${packageId} for user ${userId}, start date: ${startDateString}`);

      // Get the package details
      const packageRef = doc(db, 'packages', packageId);
      const packageDoc = await getDoc(packageRef);

      if (!packageDoc.exists()) {
        return {
          success: false,
          error: 'Paket bulunamadı'
        };
      }

      const packageData = packageDoc.data();
      const packageName = packageData.name || 'Standart Paket';
      const remainingClasses = packageData.classes || packageData.lessonCount || packageData.lessons || 8;
      const durationMonths = packageData.duration || 1;

      // Check if user exists in users collection
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      let targetRef;
      let targetExists = false;

      if (userDoc.exists()) {
        targetRef = userRef;
        targetExists = true;
      } else {
        // Check members collection
        const memberRef = doc(db, 'members', userId);
        const memberDoc = await getDoc(memberRef);

        if (memberDoc.exists()) {
          targetRef = memberRef;
          targetExists = true;
        }
      }

      if (!targetExists) {
        return {
          success: false,
          error: 'Kullanıcı bulunamadı'
        };
      }

      // Calculate new package dates
      // Use provided start date or default to now
      const parsedStart = startDateString ? new Date(startDateString) : null;
      const renewalDate = parsedStart && !Number.isNaN(parsedStart.getTime()) ? parsedStart : new Date();
      const packageExpiryDate = new Date(renewalDate);
      // Add duration in days (months * 30)
      packageExpiryDate.setDate(packageExpiryDate.getDate() + (durationMonths * 30));

      // Update user with renewed package - update ALL package-related fields
      const updateData = {
        packageId: packageId,
        packageName: packageName,
        packageStartDate: renewalDate.toISOString(),
        packageExpiryDate: packageExpiryDate.toISOString(),
        remainingClasses: remainingClasses,
        lessonCredits: remainingClasses,
        membershipStatus: 'active',
        isActive: true,
        status: 'approved',
        packageInfo: {
          packageId: packageId,
          packageName: packageName,
          packageType: resolvePackageType(packageData),
          lessonCount: remainingClasses,
          assignedAt: renewalDate.toISOString(),
          expiryDate: packageExpiryDate.toISOString(),
          duration: durationMonths,
          price: packageData.price || 0
        },
        updatedAt: serverTimestamp()
      };

      await updateDoc(targetRef, updateData);

      console.log(`✅ Package renewed successfully for user ${userId}`);

      return {
        success: true,
        message: 'Paket başarıyla yenilendi',
        data: {
          packageName,
          remainingClasses,
          expiryDate: packageExpiryDate.toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Error renewing package:', error);
      return {
        success: false,
        error: 'Paket yenilenirken bir hata oluştu'
      };
    }
  }

  // ============================================
  // MULTI-PACKAGE SYSTEM
  // ============================================

  /**
   * Add a new package to user's packages array
   * @param {string} userId - User ID
   * @param {object} packageDetails - Package details
   * @param {string} assignedBy - Admin who assigned the package
   */
  async addPackageToUser(userId, packageDetails, assignedBy) {
    try {
      console.log(`📦 Adding package to user ${userId}:`, packageDetails);

      // Find user in members or users collection
      let targetRef = doc(db, this.membersCollection, userId);
      let targetDoc = await getDoc(targetRef);

      if (!targetDoc.exists()) {
        targetRef = doc(db, 'users', userId);
        targetDoc = await getDoc(targetRef);
      }

      if (!targetDoc.exists()) {
        return { success: false, error: 'Kullanıcı bulunamadı' };
      }

      const userData = targetDoc.data();

      // Get package details from database if packageId provided
      let packageName = packageDetails.packageName || 'Standart Paket';
      let lessonCount = packageDetails.lessonCount || packageDetails.remainingClasses || 8;
      let packageType = packageDetails.packageType || 'group';

      if (packageDetails.packageId && !packageDetails.packageId.startsWith('fallback_')) {
        const packageRef = doc(db, 'packages', packageDetails.packageId);
        const packageDoc = await getDoc(packageRef);
        if (packageDoc.exists()) {
          const pkgData = packageDoc.data();
          packageName = pkgData.name || packageName;
          lessonCount = pkgData.lessonCount || pkgData.lessons || pkgData.classes || lessonCount;
          packageType = pkgData.packageType || packageType;
        }
      }

      // Calculate dates
      const startDate = packageDetails.startDate
        ? new Date(packageDetails.startDate)
        : new Date();
      const durationMonths = packageDetails.duration || 1;
      const expiryDate = new Date(startDate);
      // Use 30 days per month for consistent expiry calculation across all platforms
      expiryDate.setDate(expiryDate.getDate() + (durationMonths * 30));

      // Create new package entry
      const newPackage = {
        id: `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        packageId: packageDetails.packageId || null,
        packageName: packageName,
        packageType: packageType,
        startDate: startDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        totalLessons: lessonCount,
        remainingLessons: lessonCount,
        assignedAt: new Date().toISOString(),
        assignedBy: assignedBy,
        status: 'active',
        price: packageDetails.price || 0,
        duration: durationMonths
      };

      // Get existing packages array or initialize
      const existingPackages = userData.packages || [];

      // Migrate legacy packageInfo if exists and packages array is empty
      if (existingPackages.length === 0 && userData.packageInfo) {
        const legacyPackage = this.migrateLegacyPackage(userData);
        if (legacyPackage) {
          existingPackages.push(legacyPackage);
        }
      }

      // Add new package
      existingPackages.push(newPackage);

      // Calculate total remaining lessons across all active packages
      const now = new Date();
      const totalRemainingClasses = existingPackages.reduce((sum, pkg) => {
        const pkgStart = new Date(pkg.startDate);
        const pkgExpiry = new Date(pkg.expiryDate);
        if (pkgStart <= now && pkgExpiry >= now && pkg.status === 'active') {
          return sum + (pkg.remainingLessons || 0);
        }
        return sum;
      }, 0);

      // Find the latest expiry date among active packages
      const latestExpiry = existingPackages
        .filter(pkg => pkg.status === 'active')
        .reduce((latest, pkg) => {
          const expiry = new Date(pkg.expiryDate);
          return expiry > latest ? expiry : latest;
        }, new Date(0));

      // Update user document
      const updateData = {
        packages: existingPackages,
        remainingClasses: totalRemainingClasses,
        lessonCredits: totalRemainingClasses,
        packageExpiryDate: latestExpiry.toISOString(),
        // Keep packageInfo for backward compatibility (use latest package)
        packageInfo: {
          packageId: newPackage.id,
          packageName: newPackage.packageName,
          packageType: newPackage.packageType,
          lessonCount: newPackage.totalLessons,
          assignedAt: newPackage.startDate,
          expiryDate: newPackage.expiryDate
        },
        updatedAt: serverTimestamp()
      };

      // If user status is pending, also approve them
      if (userData.status === 'pending') {
        updateData.status = 'approved';
        updateData.membershipStatus = 'active';
        updateData.isActive = true;
        updateData.approvedAt = new Date().toISOString();
        updateData.approvedBy = assignedBy;
        updateData.packageStartDate = startDate.toISOString();
      }

      await updateDoc(targetRef, updateData);

      console.log(`✅ Package added successfully to user ${userId}`);

      return {
        success: true,
        message: 'Paket başarıyla eklendi',
        package: newPackage,
        totalPackages: existingPackages.length,
        totalRemainingClasses
      };
    } catch (error) {
      console.error('❌ Error adding package to user:', error);
      return { success: false, error: 'Paket eklenirken bir hata oluştu' };
    }
  }

  /**
   * Get all packages for a user
   */
  async getUserPackages(userId) {
    try {
      let targetRef = doc(db, this.membersCollection, userId);
      let targetDoc = await getDoc(targetRef);

      if (!targetDoc.exists()) {
        targetRef = doc(db, 'users', userId);
        targetDoc = await getDoc(targetRef);
      }

      if (!targetDoc.exists()) {
        return { success: false, error: 'Kullanıcı bulunamadı' };
      }

      const userData = targetDoc.data();
      let packages = userData.packages || [];

      // Migrate legacy packageInfo if packages array is empty
      if (packages.length === 0 && userData.packageInfo) {
        const legacyPackage = this.migrateLegacyPackage(userData);
        if (legacyPackage) {
          packages = [legacyPackage];
        }
      }

      // Update package statuses based on current date
      const now = new Date();
      packages = packages.map(pkg => {
        const expiryDate = new Date(pkg.expiryDate);
        const startDate = new Date(pkg.startDate);

        let status = pkg.status;
        if (expiryDate < now) {
          status = 'expired';
        } else if (startDate > now) {
          status = 'upcoming';
        } else if (pkg.remainingLessons <= 0) {
          status = 'depleted';
        } else {
          status = 'active';
        }

        return { ...pkg, status };
      });

      return {
        success: true,
        packages,
        totalPackages: packages.length
      };
    } catch (error) {
      console.error('❌ Error getting user packages:', error);
      return { success: false, error: 'Paketler getirilemedi' };
    }
  }

  /**
   * Get packages that cover a specific date
   */
  getPackagesForDate(packages, targetDate) {
    const date = new Date(targetDate);
    date.setHours(12, 0, 0, 0); // Normalize to noon to avoid timezone issues

    return packages.filter(pkg => {
      const startDate = new Date(pkg.startDate);
      startDate.setHours(0, 0, 0, 0);
      const expiryDate = new Date(pkg.expiryDate);
      expiryDate.setHours(23, 59, 59, 999);

      return startDate <= date && expiryDate >= date &&
             pkg.status !== 'cancelled' &&
             pkg.remainingLessons > 0;
    });
  }

  /**
   * Deduct a lesson from the appropriate package based on lesson date
   */
  async deductLessonFromPackage(userId, lessonDate, lessonInfo = '') {
    try {
      const packagesResult = await this.getUserPackages(userId);
      if (!packagesResult.success) {
        return { success: false, error: packagesResult.error };
      }

      const eligiblePackages = this.getPackagesForDate(packagesResult.packages, lessonDate);

      if (eligiblePackages.length === 0) {
        return {
          success: false,
          error: 'Bu tarih için geçerli bir paket bulunamadı',
          noPackageForDate: true
        };
      }

      // Use the first eligible package (could be enhanced to let user choose)
      const targetPackage = eligiblePackages[0];

      if (targetPackage.remainingLessons <= 0) {
        return { success: false, error: 'Pakette kalan ders yok' };
      }

      // Find user document
      let targetRef = doc(db, this.membersCollection, userId);
      let targetDoc = await getDoc(targetRef);

      if (!targetDoc.exists()) {
        targetRef = doc(db, 'users', userId);
        targetDoc = await getDoc(targetRef);
      }

      if (!targetDoc.exists()) {
        return { success: false, error: 'Kullanıcı bulunamadı' };
      }

      const userData = targetDoc.data();
      const packages = userData.packages || [];

      // Update the specific package
      const updatedPackages = packages.map(pkg => {
        if (pkg.id === targetPackage.id) {
          return {
            ...pkg,
            remainingLessons: pkg.remainingLessons - 1,
            lastUsedAt: new Date().toISOString(),
            lastUsedFor: lessonInfo
          };
        }
        return pkg;
      });

      // Calculate new total remaining
      const now = new Date();
      const totalRemainingClasses = updatedPackages.reduce((sum, pkg) => {
        const pkgStart = new Date(pkg.startDate);
        const pkgExpiry = new Date(pkg.expiryDate);
        if (pkgStart <= now && pkgExpiry >= now && pkg.status !== 'cancelled') {
          return sum + (pkg.remainingLessons || 0);
        }
        return sum;
      }, 0);

      await updateDoc(targetRef, {
        packages: updatedPackages,
        remainingClasses: totalRemainingClasses,
        lessonCredits: totalRemainingClasses,
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        deductedFromPackage: targetPackage.id,
        packageName: targetPackage.packageName,
        remainingInPackage: targetPackage.remainingLessons - 1,
        totalRemaining: totalRemainingClasses
      };
    } catch (error) {
      console.error('❌ Error deducting lesson from package:', error);
      return { success: false, error: 'Ders düşülürken bir hata oluştu' };
    }
  }

  /**
   * Refund a lesson to the appropriate package based on lesson date (for cancellations)
   */
  async refundLessonToPackage(userId, lessonDate, lessonInfo = '') {
    try {
      // Find user document
      let targetRef = doc(db, this.membersCollection, userId);
      let targetDoc = await getDoc(targetRef);

      if (!targetDoc.exists()) {
        targetRef = doc(db, 'users', userId);
        targetDoc = await getDoc(targetRef);
      }

      if (!targetDoc.exists()) {
        return { success: false, error: 'Kullanıcı bulunamadı' };
      }

      const userData = targetDoc.data();
      let packages = userData.packages || [];

      // If no packages array, try to use legacy packageInfo
      if (packages.length === 0 && userData.packageInfo) {
        const legacyPackage = this.migrateLegacyPackage(userData);
        if (legacyPackage) {
          packages = [legacyPackage];
        }
      }

      if (packages.length === 0) {
        // Fallback: just increment the legacy fields
        const currentCredits = userData.remainingClasses || userData.lessonCredits || 0;
        await updateDoc(targetRef, {
          remainingClasses: currentCredits + 1,
          lessonCredits: currentCredits + 1,
          updatedAt: serverTimestamp()
        });
        return {
          success: true,
          message: 'Ders kredisi iade edildi (legacy)',
          usedLegacyRefund: true
        };
      }

      // Find the package that covers the lesson date
      const date = new Date(lessonDate);
      date.setHours(12, 0, 0, 0);

      let targetPackage = packages.find(pkg => {
        const startDate = new Date(pkg.startDate);
        startDate.setHours(0, 0, 0, 0);
        const expiryDate = new Date(pkg.expiryDate);
        expiryDate.setHours(23, 59, 59, 999);

        return startDate <= date && expiryDate >= date && pkg.status !== 'cancelled';
      });

      // If no package covers the date, use the most recent active package
      if (!targetPackage) {
        const now = new Date();
        const activePackages = packages.filter(pkg => {
          const expiryDate = new Date(pkg.expiryDate);
          return expiryDate >= now && pkg.status !== 'cancelled';
        });

        if (activePackages.length > 0) {
          activePackages.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
          targetPackage = activePackages[0];
        } else {
          targetPackage = packages[packages.length - 1];
        }
      }

      // Update the specific package
      const updatedPackages = packages.map(pkg => {
        if (pkg.id === targetPackage.id) {
          const newRemaining = (pkg.remainingLessons || 0) + 1;
          const maxLessons = pkg.totalLessons || newRemaining;
          return {
            ...pkg,
            remainingLessons: Math.min(newRemaining, maxLessons),
            lastRefundAt: new Date().toISOString(),
            lastRefundFor: lessonInfo
          };
        }
        return pkg;
      });

      // Calculate new total remaining
      const now = new Date();
      const totalRemainingClasses = updatedPackages.reduce((sum, pkg) => {
        const pkgStart = new Date(pkg.startDate);
        const pkgExpiry = new Date(pkg.expiryDate);
        if (pkgStart <= now && pkgExpiry >= now && pkg.status !== 'cancelled') {
          return sum + (pkg.remainingLessons || 0);
        }
        return sum;
      }, 0);

      await updateDoc(targetRef, {
        packages: updatedPackages,
        remainingClasses: totalRemainingClasses,
        lessonCredits: totalRemainingClasses,
        updatedAt: serverTimestamp()
      });

      const refundedPackage = updatedPackages.find(p => p.id === targetPackage.id);

      return {
        success: true,
        refundedToPackage: targetPackage.id,
        packageName: targetPackage.packageName,
        remainingInPackage: refundedPackage?.remainingLessons || 0,
        totalRemaining: totalRemainingClasses,
        message: 'Ders kredisi pakete iade edildi'
      };
    } catch (error) {
      console.error('❌ Error refunding lesson to package:', error);
      return { success: false, error: 'Ders iade edilirken bir hata oluştu' };
    }
  }

  /**
   * Check if user can book a lesson on a specific date
   */
  async canBookLessonOnDate(userId, lessonDate) {
    try {
      const packagesResult = await this.getUserPackages(userId);
      if (!packagesResult.success) {
        return { canBook: false, error: packagesResult.error };
      }

      const eligiblePackages = this.getPackagesForDate(packagesResult.packages, lessonDate);

      if (eligiblePackages.length === 0) {
        return {
          canBook: false,
          reason: 'noPackageForDate',
          message: 'Bu tarih için geçerli bir paketiniz bulunmuyor'
        };
      }

      const hasCredits = eligiblePackages.some(pkg => pkg.remainingLessons > 0);
      if (!hasCredits) {
        return {
          canBook: false,
          reason: 'noCredits',
          message: 'Bu tarih aralığındaki paketinizde kalan ders yok'
        };
      }

      return {
        canBook: true,
        eligiblePackages,
        message: 'Ders rezervasyonu yapılabilir'
      };
    } catch (error) {
      console.error('❌ Error checking booking eligibility:', error);
      return { canBook: false, error: 'Kontrol yapılırken bir hata oluştu' };
    }
  }

  /**
   * Migrate legacy single packageInfo to packages array format
   */
  migrateLegacyPackage(userData) {
    if (!userData.packageInfo && !userData.packageExpiryDate) {
      return null;
    }

    const packageInfo = userData.packageInfo || {};
    const remainingClasses = userData.remainingClasses || userData.lessonCredits || 0;

    // Don't migrate if no remaining classes and no valid expiry
    if (remainingClasses <= 0 && !userData.packageExpiryDate) {
      return null;
    }

    return {
      id: packageInfo.packageId || `legacy_${userData.id || Date.now()}`,
      packageId: packageInfo.packageId || null,
      packageName: packageInfo.packageName || 'Mevcut Paket',
      packageType: packageInfo.packageType || userData.packageType || 'group',
      startDate: userData.packageStartDate || packageInfo.assignedAt || userData.approvedAt || new Date().toISOString(),
      expiryDate: userData.packageExpiryDate || packageInfo.expiryDate || new Date().toISOString(),
      totalLessons: packageInfo.lessonCount || remainingClasses,
      remainingLessons: remainingClasses,
      assignedAt: packageInfo.assignedAt || userData.approvedAt || new Date().toISOString(),
      assignedBy: userData.approvedBy || 'system_migration',
      status: 'active',
      isLegacy: true
    };
  }

  /**
   * Get visible date range for user (union of all package date ranges)
   */
  async getVisibleDateRange(userId) {
    try {
      const packagesResult = await this.getUserPackages(userId);
      if (!packagesResult.success || packagesResult.packages.length === 0) {
        return { success: false, ranges: [] };
      }

      const ranges = packagesResult.packages
        .filter(pkg => pkg.status !== 'cancelled')
        .map(pkg => ({
          packageId: pkg.id,
          packageName: pkg.packageName,
          startDate: pkg.startDate,
          expiryDate: pkg.expiryDate,
          hasCredits: pkg.remainingLessons > 0
        }));

      return { success: true, ranges };
    } catch (error) {
      console.error('❌ Error getting visible date range:', error);
      return { success: false, error: 'Tarih aralığı getirilemedi' };
    }
  }
}

// Export a single instance
export default new MemberService();
