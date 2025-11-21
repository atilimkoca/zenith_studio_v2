import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

class PackageService {
  constructor() {
    this.packagesCollection = 'packages';
  }

  // Get all packages
  async getAllPackages() {
    try {
      const packagesRef = collection(db, this.packagesCollection);
      const q = query(packagesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const packages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        success: true,
        data: packages
      };
    } catch (error) {
      console.error('❌ Error fetching packages:', error);
      return {
        success: false,
        error: 'Paketler alınamadı'
      };
    }
  }

  // Get active packages only
  async getActivePackages() {
    try {
      const packagesRef = collection(db, this.packagesCollection);
      // Query only by isActive to avoid composite index requirement
      const q = query(
        packagesRef, 
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(q);
      
      // Filter and sort in memory
      const packages = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort((a, b) => (a.price || 0) - (b.price || 0)); // Sort by price ascending

      return {
        success: true,
        data: packages
      };
    } catch (error) {
      console.error('❌ Error fetching active packages:', error);
      return {
        success: false,
        error: 'Aktif paketler alınamadı'
      };
    }
  }

  // Get package by ID
  async getPackageById(packageId) {
    try {
      const packageRef = doc(db, this.packagesCollection, packageId);
      const packageDoc = await getDoc(packageRef);

      if (!packageDoc.exists()) {
        return {
          success: false,
          error: 'Paket bulunamadı'
        };
      }

      return {
        success: true,
        data: {
          id: packageDoc.id,
          ...packageDoc.data()
        }
      };
    } catch (error) {
      console.error('❌ Error fetching package:', error);
      return {
        success: false,
        error: 'Paket alınamadı'
      };
    }
  }

  // Create new package
  async createPackage(packageData) {
    try {
      const newPackage = {
        ...packageData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, this.packagesCollection), newPackage);

      return {
        success: true,
        data: {
          id: docRef.id,
          ...newPackage
        }
      };
    } catch (error) {
      console.error('❌ Error creating package:', error);
      return {
        success: false,
        error: 'Paket oluşturulamadı'
      };
    }
  }

  // Update package
  async updatePackage(packageId, packageData) {
    try {
      const packageRef = doc(db, this.packagesCollection, packageId);
      
      const updateData = {
        ...packageData,
        updatedAt: serverTimestamp()
      };

      await updateDoc(packageRef, updateData);

      return {
        success: true,
        data: {
          id: packageId,
          ...updateData
        }
      };
    } catch (error) {
      console.error('❌ Error updating package:', error);
      return {
        success: false,
        error: 'Paket güncellenemedi'
      };
    }
  }

  // Delete package
  async deletePackage(packageId) {
    try {
      const packageRef = doc(db, this.packagesCollection, packageId);
      await deleteDoc(packageRef);

      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Error deleting package:', error);
      return {
        success: false,
        error: 'Paket silinemedi'
      };
    }
  }

  // Get packages by type
  async getPackagesByType(type) {
    try {
      const packagesRef = collection(db, this.packagesCollection);
      const q = query(
        packagesRef, 
        where('type', '==', type),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(q);
      
      const packages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        success: true,
        data: packages
      };
    } catch (error) {
      console.error('❌ Error fetching packages by type:', error);
      return {
        success: false,
        error: 'Paketler alınamadı'
      };
    }
  }
}

const packageService = new PackageService();
export default packageService;
