// Finance service for managing income and expenses
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

class FinanceService {
  constructor() {
    this.transactionsCollection = 'transactions';
    this.membersCollection = 'members';
  }

  // Add a new transaction (income or expense)
  async addTransaction(transactionData) {
    try {
      const { 
        type, // 'income' or 'expense'
        amount,
        description,
        category,
        memberId,
        memberName,
        paymentMethod,
        serviceType,
        notes,
        date
      } = transactionData;


      const docData = {
        type,
        amount: parseFloat(amount),
        description,
        category,
        memberId: memberId || null,
        memberName: memberName || null,
        paymentMethod,
        serviceType: serviceType || null,
        notes: notes || '',
        date: date ? Timestamp.fromDate(new Date(date)) : serverTimestamp(),
        status: type === 'income' ? 'paid' : 'completed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, this.transactionsCollection), docData);

      
      return {
        success: true,
        transactionId: docRef.id,
        message: type === 'income' ? 'Gelir kaydı eklendi' : 'Gider kaydı eklendi'
      };
    } catch (error) {
      console.error('❌ Error adding transaction:', error);
      return {
        success: false,
        error: 'İşlem eklenirken bir hata oluştu.'
      };
    }
  }

  // Get all transactions with optional filters
  async getTransactions(filters = {}) {
    try {
      
      let q = collection(db, this.transactionsCollection);
      
      // Apply filters
      const constraints = [];
      
      if (filters.type && filters.type !== 'all') {
        constraints.push(where('type', '==', filters.type));
      }
      
      if (filters.startDate) {
        constraints.push(where('date', '>=', Timestamp.fromDate(new Date(filters.startDate))));
      }
      
      if (filters.endDate) {
        constraints.push(where('date', '<=', Timestamp.fromDate(new Date(filters.endDate))));
      }
      
      if (filters.memberId) {
        constraints.push(where('memberId', '==', filters.memberId));
      }
      
      if (filters.category) {
        constraints.push(where('category', '==', filters.category));
      }

      // Add ordering
      constraints.push(orderBy('date', 'desc'));
      
      if (constraints.length > 0) {
        q = query(q, ...constraints);
      }

      const querySnapshot = await getDocs(q);
      const transactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() || new Date()
      }));

      
      return {
        success: true,
        transactions: transactions
      };
    } catch (error) {
      console.error('❌ Error getting transactions:', error);
      return {
        success: false,
        error: 'İşlemler alınırken bir hata oluştu.',
        transactions: []
      };
    }
  }

  // Update transaction
  async updateTransaction(transactionId, updateData) {
    try {
      
      const transactionRef = doc(db, this.transactionsCollection, transactionId);
      await updateDoc(transactionRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });

      
      return {
        success: true,
        message: 'İşlem güncellendi'
      };
    } catch (error) {
      console.error('❌ Error updating transaction:', error);
      return {
        success: false,
        error: 'İşlem güncellenirken bir hata oluştu.'
      };
    }
  }

  // Delete transaction
  async deleteTransaction(transactionId) {
    try {
      
      await deleteDoc(doc(db, this.transactionsCollection, transactionId));

      
      return {
        success: true,
        message: 'İşlem silindi'
      };
    } catch (error) {
      console.error('❌ Error deleting transaction:', error);
      return {
        success: false,
        error: 'İşlem silinirken bir hata oluştu.'
      };
    }
  }

  // Get financial summary
  async getFinancialSummary(filters = {}) {
    try {
      
      const result = await this.getTransactions(filters);
      
      if (!result.success) {
        return result;
      }

      const transactions = result.transactions;
      
      const summary = {
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0,
        transactionCount: transactions.length,
        incomeTransactions: 0,
        expenseTransactions: 0,
        pendingPayments: 0,
        categoryBreakdown: {},
        monthlyData: {}
      };

      transactions.forEach(transaction => {
        const amount = parseFloat(transaction.amount) || 0;
        
        if (transaction.type === 'income') {
          summary.totalIncome += amount;
          summary.incomeTransactions++;
          
          if (transaction.status === 'pending') {
            summary.pendingPayments += amount;
          }
        } else if (transaction.type === 'expense') {
          summary.totalExpenses += amount;
          summary.expenseTransactions++;
        }
        
        // Category breakdown
        const category = transaction.category || 'Diğer';
        if (!summary.categoryBreakdown[category]) {
          summary.categoryBreakdown[category] = { income: 0, expense: 0 };
        }
        
        if (transaction.type === 'income') {
          summary.categoryBreakdown[category].income += amount;
        } else {
          summary.categoryBreakdown[category].expense += amount;
        }
        
        // Monthly data
        const monthKey = transaction.date.toISOString().substring(0, 7); // YYYY-MM
        if (!summary.monthlyData[monthKey]) {
          summary.monthlyData[monthKey] = { income: 0, expense: 0 };
        }
        
        if (transaction.type === 'income') {
          summary.monthlyData[monthKey].income += amount;
        } else {
          summary.monthlyData[monthKey].expense += amount;
        }
      });

      summary.netProfit = summary.totalIncome - summary.totalExpenses;

      
      return {
        success: true,
        summary: summary
      };
    } catch (error) {
      console.error('❌ Error calculating financial summary:', error);
      return {
        success: false,
        error: 'Finansal özet hesaplanırken bir hata oluştu.',
        summary: {}
      };
    }
  }

  // Add member payment
  async addMemberPayment(paymentData) {
    try {
      const {
        memberId,
        memberName,
        amount,
        paymentMethod,
        serviceType,
        membershipType,
        notes,
        date
      } = paymentData;


      const transactionData = {
        type: 'income',
        amount: parseFloat(amount),
        description: `${memberName} - ${serviceType || membershipType || 'Üyelik Ödemesi'}`,
        category: 'Üyelik Ödemeleri',
        memberId,
        memberName,
        paymentMethod,
        serviceType: serviceType || membershipType,
        notes: notes || '',
        date: date ? Timestamp.fromDate(new Date(date)) : serverTimestamp(),
        status: 'paid',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, this.transactionsCollection), transactionData);

      
      return {
        success: true,
        transactionId: docRef.id,
        message: 'Üye ödemesi kaydedildi'
      };
    } catch (error) {
      console.error('❌ Error adding member payment:', error);
      return {
        success: false,
        error: 'Üye ödemesi eklenirken bir hata oluştu.'
      };
    }
  }

  // Get member payment history
  async getMemberPayments(memberId) {
    try {
      
      const q = query(
        collection(db, this.transactionsCollection),
        where('memberId', '==', memberId),
        where('type', '==', 'income'),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const payments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() || new Date()
      }));

      
      return {
        success: true,
        payments: payments
      };
    } catch (error) {
      console.error('❌ Error getting member payments:', error);
      return {
        success: false,
        error: 'Üye ödemeleri alınırken bir hata oluştu.',
        payments: []
      };
    }
  }

  // Get common expense categories
  getExpenseCategories() {
    return [
      'Kira',
      'Elektrik',
      'Su',
      'İnternet',
      'Temizlik',
      'Ekipman',
      'Bakım',
      'Maaş',
      'Pazarlama',
      'Sigorta',
      'Vergi',
      'Diğer'
    ];
  }

  // Get common income categories
  getIncomeCategories() {
    return [
      'Üyelik Ödemeleri',
      'Ders Ödemeleri',
      'Kişisel Antrenman',
      'Grup Dersleri',
      'Yoga Dersleri',
      'Pilates Dersleri',
      'Ürün Satışı',
      'Diğer'
    ];
  }

  // Get payment methods
  getPaymentMethods() {
    return [
      'Nakit',
      'Kredi Kartı',
      'Banka Kartı',
      'Havale/EFT',
      'Mobil Ödeme',
      'Çek'
    ];
  }
}

export default new FinanceService();
