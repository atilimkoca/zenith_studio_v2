// Equipment Management Service
import { 
  collection, 
  getDocs, 
  addDoc,
  doc, 
  updateDoc, 
  deleteDoc,
  query, 
  orderBy,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

class EquipmentService {
  constructor() {
    this.equipmentCollection = 'equipment';
    this.faultsCollection = 'equipment_faults';
  }

  // Get all equipment
  async getAllEquipment() {
    try {
      
      const equipmentCollection = collection(db, this.equipmentCollection);
      
      let querySnapshot;
      try {
        const q = query(equipmentCollection, orderBy('createdAt', 'desc'));
        querySnapshot = await getDocs(q);
      } catch {
        querySnapshot = await getDocs(equipmentCollection);
      }
      
      const equipment = [];
      
      querySnapshot.forEach((doc) => {
        equipment.push({
          id: doc.id,
          ...doc.data()
        });
      });

      
      return {
        success: true,
        equipment: equipment
      };
    } catch (error) {
      console.error('❌ Error fetching equipment:', error);
      
      return {
        success: false,
        error: 'Ekipmanlar yüklenirken bir hata oluştu.',
        equipment: []
      };
    }
  }

  // Add new equipment
  async addEquipment(equipmentData) {
    try {
      
      const equipmentCollection = collection(db, this.equipmentCollection);
      
      const newEquipment = {
        ...equipmentData,
        status: 'active', // active, maintenance, broken, retired
        condition: equipmentData.condition || 'excellent', // excellent, good, fair, poor
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(equipmentCollection, newEquipment);
      
      
      return {
        success: true,
        id: docRef.id
      };
    } catch (error) {
      console.error('❌ Error adding equipment:', error);
      return {
        success: false,
        error: 'Ekipman eklenirken bir hata oluştu.'
      };
    }
  }

  // Update equipment
  async updateEquipment(equipmentId, updateData) {
    try {
      
      const equipmentRef = doc(db, this.equipmentCollection, equipmentId);
      
      await updateDoc(equipmentRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });

      
      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Error updating equipment:', error);
      return {
        success: false,
        error: 'Ekipman güncellenirken bir hata oluştu.'
      };
    }
  }

  // Delete equipment
  async deleteEquipment(equipmentId) {
    try {
      
      const equipmentRef = doc(db, this.equipmentCollection, equipmentId);
      await deleteDoc(equipmentRef);

      
      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Error deleting equipment:', error);
      return {
        success: false,
        error: 'Ekipman silinirken bir hata oluştu.'
      };
    }
  }

  // Report equipment fault/malfunction
  async reportFault(faultData) {
    try {
      
      const faultsCollection = collection(db, this.faultsCollection);
      
      const newFault = {
        ...faultData,
        status: 'reported', // reported, in_progress, resolved
        priority: faultData.priority || 'medium', // low, medium, high, critical
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(faultsCollection, newFault);
      
      // Update equipment status if it's broken
      if (faultData.severity === 'critical' || faultData.severity === 'high') {
        await this.updateEquipment(faultData.equipmentId, {
          status: 'broken',
          lastFaultDate: serverTimestamp()
        });
      } else {
        await this.updateEquipment(faultData.equipmentId, {
          status: 'maintenance',
          lastFaultDate: serverTimestamp()
        });
      }
      
      
      return {
        success: true,
        id: docRef.id
      };
    } catch (error) {
      console.error('❌ Error reporting fault:', error);
      return {
        success: false,
        error: 'Arıza kaydedilirken bir hata oluştu.'
      };
    }
  }

  // Get all faults
  async getAllFaults() {
    try {
      
      const faultsCollection = collection(db, this.faultsCollection);
      
      let querySnapshot;
      try {
        const q = query(faultsCollection, orderBy('createdAt', 'desc'));
        querySnapshot = await getDocs(q);
      } catch {
        querySnapshot = await getDocs(faultsCollection);
      }
      
      const faults = [];
      
      querySnapshot.forEach((doc) => {
        faults.push({
          id: doc.id,
          ...doc.data()
        });
      });

      
      return {
        success: true,
        faults: faults
      };
    } catch (error) {
      console.error('❌ Error fetching faults:', error);
      
      return {
        success: false,
        error: 'Arızalar yüklenirken bir hata oluştu.',
        faults: []
      };
    }
  }

  // Get faults for specific equipment
  async getFaultsByEquipment(equipmentId) {
    try {
      
      const faultsCollection = collection(db, this.faultsCollection);
      const q = query(
        faultsCollection, 
        where('equipmentId', '==', equipmentId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const faults = [];
      
      querySnapshot.forEach((doc) => {
        faults.push({
          id: doc.id,
          ...doc.data()
        });
      });

      
      return {
        success: true,
        faults: faults
      };
    } catch (error) {
      console.error('❌ Error fetching equipment faults:', error);
      
      return {
        success: false,
        error: 'Ekipman arızaları yüklenirken bir hata oluştu.',
        faults: []
      };
    }
  }

  // Update fault status
  async updateFaultStatus(faultId, status, resolution = '') {
    try {
      
      const faultRef = doc(db, this.faultsCollection, faultId);
      
      const updateData = {
        status: status,
        updatedAt: serverTimestamp()
      };
      
      if (resolution) {
        updateData.resolution = resolution;
        updateData.resolvedAt = serverTimestamp();
      }
      
      await updateDoc(faultRef, updateData);

      
      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Error updating fault status:', error);
      return {
        success: false,
        error: 'Arıza durumu güncellenirken bir hata oluştu.'
      };
    }
  }

  // Get equipment statistics
  async getEquipmentStatistics() {
    try {
      
      const equipmentResult = await this.getAllEquipment();
      const faultsResult = await this.getAllFaults();
      
      if (!equipmentResult.success || !faultsResult.success) {
        return {
          success: false,
          error: 'İstatistikler hesaplanırken bir hata oluştu.'
        };
      }

      const equipment = equipmentResult.equipment;
      const faults = faultsResult.faults;
      
      const stats = {
        totalEquipment: equipment.length,
        byStatus: {
          active: equipment.filter(e => e.status === 'active').length,
          maintenance: equipment.filter(e => e.status === 'maintenance').length,
          broken: equipment.filter(e => e.status === 'broken').length,
          retired: equipment.filter(e => e.status === 'retired').length
        },
        byCondition: {
          excellent: equipment.filter(e => e.condition === 'excellent').length,
          good: equipment.filter(e => e.condition === 'good').length,
          fair: equipment.filter(e => e.condition === 'fair').length,
          poor: equipment.filter(e => e.condition === 'poor').length
        },
        faults: {
          total: faults.length,
          open: faults.filter(f => f.status === 'reported' || f.status === 'in_progress').length,
          resolved: faults.filter(f => f.status === 'resolved').length,
          byPriority: {
            low: faults.filter(f => f.priority === 'low').length,
            medium: faults.filter(f => f.priority === 'medium').length,
            high: faults.filter(f => f.priority === 'high').length,
            critical: faults.filter(f => f.priority === 'critical').length
          }
        }
      };

      
      return {
        success: true,
        stats: stats
      };
    } catch (error) {
      console.error('❌ Error calculating equipment statistics:', error);
      return {
        success: false,
        error: 'Ekipman istatistikleri hesaplanırken bir hata oluştu.',
        stats: {}
      };
    }
  }

  // Search equipment
  async searchEquipment(searchTerm) {
    try {
      
      const result = await this.getAllEquipment();
      if (!result.success) {
        return result;
      }

      const searchLower = searchTerm.toLowerCase();
      const filteredEquipment = result.equipment.filter(equipment => {
        const name = (equipment.name || '').toLowerCase();
        const brand = (equipment.brand || '').toLowerCase();
        const model = (equipment.model || '').toLowerCase();
        const category = (equipment.category || '').toLowerCase();
        const location = (equipment.location || '').toLowerCase();
        
        return name.includes(searchLower) || 
               brand.includes(searchLower) || 
               model.includes(searchLower) ||
               category.includes(searchLower) ||
               location.includes(searchLower);
      });

      return {
        success: true,
        equipment: filteredEquipment
      };
    } catch (error) {
      console.error('❌ Error searching equipment:', error);
      return {
        success: false,
        error: 'Ekipman arama işleminde bir hata oluştu.',
        equipment: []
      };
    }
  }
}

export default new EquipmentService();
