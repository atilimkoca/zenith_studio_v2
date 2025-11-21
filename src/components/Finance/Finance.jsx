// components/Finance/Finance.jsx
import React, { useState, useEffect } from 'react';
import './Finance.css';
import financeService from '../../services/financeService';

const Finance = () => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all',
    startDate: '',
    endDate: '',
    month: '',
    year: new Date().getFullYear().toString(),
    category: '',
    paymentMethod: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showMemberPaymentModal, setShowMemberPaymentModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [notification, setNotification] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Form states
  const [incomeForm, setIncomeForm] = useState({
    amount: '',
    description: '',
    category: 'Üyelik Ödemeleri',
    paymentMethod: 'Nakit',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    description: '',
    category: 'Kira',
    paymentMethod: 'Nakit',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [memberPaymentForm, setMemberPaymentForm] = useState({
    memberName: '',
    amount: '',
    paymentMethod: 'Nakit',
    serviceType: 'Üyelik Ödemesi',
    membershipType: 'Standart',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

    useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Add some test data for demonstration
  const addTestData = async () => {
    const testTransactions = [
      {
        type: 'income',
        amount: 500,
        description: 'Üyelik Ödemesi - Test Üye 1',
        category: 'Üyelik Ödeme',
        paymentMethod: 'Nakit',
        date: '2025-08-15'
      },
      {
        type: 'expense',
        amount: 1200,
        description: 'Aylık Kira Ödemesi',
        category: 'Kira',
        paymentMethod: 'Banka Transferi',
        date: '2025-08-01'
      },
      {
        type: 'income',
        amount: 300,
        description: 'Üyelik Ödemesi - Test Üye 2',
        category: 'Üyelik Ödeme',
        paymentMethod: 'Kredi Kartı',
        date: '2025-07-20'
      },
      {
        type: 'expense',
        amount: 150,
        description: 'Elektrik Faturası',
        category: 'Elektrik',
        paymentMethod: 'Banka Transferi',
        date: '2025-08-10'
      }
    ];

    for (const transaction of testTransactions) {
      await financeService.addTransaction(transaction);
    }
    
    showNotification('Test verileri eklendi!', 'success');
    loadData();
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all transactions for client-side filtering
      console.log('Loading all transactions for client-side filtering...');
      const transactionsResult = await financeService.getTransactions({});
      if (transactionsResult.success) {
        setTransactions(transactionsResult.transactions);
        console.log('✅ Loaded transactions:', transactionsResult.transactions.length);
      } else {
        console.error('Failed to load transactions:', transactionsResult.error);
        setTransactions([]);
        showNotification('İşlemler yüklenirken hata oluştu: ' + transactionsResult.error, 'error');
      }

      // Load financial summary
      const summaryResult = await financeService.getFinancialSummary({});
      if (summaryResult.success) {
        setSummary(summaryResult.summary);
      } else {
        console.error('Failed to load summary:', summaryResult.error);
        setSummary({});
      }
    } catch (error) {
      console.error('Error loading finance data:', error);
      setTransactions([]);
      setSummary({});
      showNotification('Veriler yüklenirken beklenmeyen bir hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddIncome = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let result;
      
      if (editingTransaction) {
        // Update existing transaction
        result = await handleUpdateTransaction(incomeForm, 'income');
      } else {
        // Create new transaction
        result = await financeService.addTransaction({
          type: 'income',
          ...incomeForm
        });
        
        if (result.success) {
          setShowIncomeModal(false);
          setIncomeForm({
            amount: '',
            description: '',
            category: 'Üyelik Ödemeleri',
            paymentMethod: 'Nakit',
            notes: '',
            date: new Date().toISOString().split('T')[0]
          });
          loadData();
          showNotification('Gelir kaydı başarıyla eklendi!', 'success');
        } else {
          showNotification('Hata: ' + result.error, 'error');
        }
      }
    } catch (error) {
      console.error('Error adding income:', error);
      showNotification('Beklenmeyen bir hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let result;
      
      if (editingTransaction) {
        // Update existing transaction
        result = await handleUpdateTransaction(expenseForm, 'expense');
      } else {
        // Create new transaction
        result = await financeService.addTransaction({
          type: 'expense',
          ...expenseForm
        });
        
        if (result.success) {
          setShowExpenseModal(false);
          setExpenseForm({
            amount: '',
            description: '',
            category: 'Kira',
            paymentMethod: 'Nakit',
            notes: '',
            date: new Date().toISOString().split('T')[0]
          });
          loadData();
          showNotification('Gider kaydı başarıyla eklendi!', 'success');
        } else {
          showNotification('Hata: ' + result.error, 'error');
        }
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      showNotification('Beklenmeyen bir hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMemberPayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await financeService.addMemberPayment({
        memberId: `member_${Date.now()}`, // Temporary ID generation
        ...memberPaymentForm
      });
      
      if (result.success) {
        setShowMemberPaymentModal(false);
        setMemberPaymentForm({
          memberName: '',
          amount: '',
          paymentMethod: 'Nakit',
          serviceType: 'Üyelik Ödemesi',
          membershipType: 'Standart',
          notes: '',
          date: new Date().toISOString().split('T')[0]
        });
        loadData();
        showNotification('Üye ödemesi başarıyla kaydedildi!', 'success');
      } else {
        showNotification('Hata: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Error adding member payment:', error);
      showNotification('Beklenmeyen bir hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    if (transaction.type === 'income') {
      setIncomeForm({
        amount: transaction.amount.toString(),
        description: transaction.description,
        category: transaction.category,
        paymentMethod: transaction.paymentMethod,
        notes: transaction.notes || '',
        date: new Date(transaction.date).toISOString().split('T')[0]
      });
      setShowIncomeModal(true);
    } else {
      setExpenseForm({
        amount: transaction.amount.toString(),
        description: transaction.description,
        category: transaction.category,
        paymentMethod: transaction.paymentMethod,
        notes: transaction.notes || '',
        date: new Date(transaction.date).toISOString().split('T')[0]
      });
      setShowExpenseModal(true);
    }
  };

  const handleDeleteTransaction = async (transactionId, description) => {
    setConfirmDialog({
      title: 'İşlemi Sil',
      message: `"${description}" işlemini silmek istediğinizden emin misiniz?`,
      onConfirm: async () => {
        setLoading(true);
        try {
          const result = await financeService.deleteTransaction(transactionId);
          
          if (result.success) {
            loadData();
            showNotification('İşlem başarıyla silindi!', 'success');
          } else {
            showNotification('Hata: ' + result.error, 'error');
          }
        } catch (error) {
          console.error('Error deleting transaction:', error);
          showNotification('İşlem silinirken bir hata oluştu.', 'error');
        } finally {
          setLoading(false);
        }
        setConfirmDialog(null);
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const handleUpdateTransaction = async (formData, type) => {
    setLoading(true);
    
    try {
      const result = await financeService.updateTransaction(editingTransaction.id, {
        type,
        ...formData
      });
      
      if (result.success) {
        setShowIncomeModal(false);
        setShowExpenseModal(false);
        setEditingTransaction(null);
        loadData();
        showNotification('İşlem başarıyla güncellendi!', 'success');
      } else {
        showNotification('Hata: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      showNotification('İşlem güncellenirken bir hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    // Search filter
    const matchesSearch = !searchTerm || 
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.memberName && transaction.memberName.toLowerCase().includes(searchTerm.toLowerCase()));

    // Type filter (gelir/gider) - this is the main filter
    const matchesType = filters.type === 'all' || transaction.type === filters.type;

    // Date range filters
    const transactionDate = new Date(transaction.date);
    const matchesStartDate = !filters.startDate || transactionDate >= new Date(filters.startDate);
    const matchesEndDate = !filters.endDate || transactionDate <= new Date(filters.endDate);

    // Month filter
    const matchesMonth = !filters.month || transactionDate.getMonth() === parseInt(filters.month);
    
    // Year filter
    const matchesYear = !filters.year || transactionDate.getFullYear() === parseInt(filters.year);

    // Category filter
    const matchesCategory = !filters.category || 
      transaction.category === filters.category;

    // Payment method filter
    const matchesPaymentMethod = !filters.paymentMethod || 
      transaction.paymentMethod === filters.paymentMethod;

    const result = matchesSearch && matchesType && matchesStartDate && matchesEndDate && 
           matchesMonth && matchesYear && matchesCategory && matchesPaymentMethod;

    // Debug logging for first few transactions
    if (transactions.indexOf(transaction) < 3) {
      console.log('Filter check for transaction:', {
        description: transaction.description,
        type: transaction.type,
        date: transactionDate.toLocaleDateString(),
        filterType: filters.type,
        matchesType,
        matchesMonth,
        matchesYear,
        result
      });
    }

    return result;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('tr-TR');
  };

  return (
    <div className="finance-page">
      {/* Header */}
      <div className="finance-header">
        <div>
          <h1 className="page-title">Finansal Yönetim</h1>
          <p className="page-subtitle">Gelir, gider ve finansal raporları yönetin</p>
        </div>
        <div className="finance-actions">
          <button 
            className="action-btn add-income-btn"
            onClick={() => {
              setEditingTransaction(null);
              setIncomeForm({
                amount: '',
                description: '',
                category: 'Üyelik Ödemeleri',
                paymentMethod: 'Nakit',
                notes: '',
                date: new Date().toISOString().split('T')[0]
              });
              setShowIncomeModal(true);
            }}
          >
            <span className="btn-icon">💰</span>
            <span className="btn-label">Gelir Ekle</span>
          </button>
          <button 
            className="action-btn add-expense-btn"
            onClick={() => {
              setEditingTransaction(null);
              setExpenseForm({
                amount: '',
                description: '',
                category: 'Kira',
                paymentMethod: 'Nakit',
                notes: '',
                date: new Date().toISOString().split('T')[0]
              });
              setShowExpenseModal(true);
            }}
          >
            <span className="btn-icon">💸</span>
            <span className="btn-label">Gider Ekle</span>
          </button>
          <button 
            className="action-btn add-income-btn"
            onClick={() => setShowMemberPaymentModal(true)}
          >
            <span className="btn-icon">👤</span>
            <span className="btn-label">Üye Ödemesi</span>
          </button>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="finance-overview">
        <div className="overview-card">
          <div className="card-icon income-icon">💰</div>
          <div className="card-title">Toplam Gelir</div>
          <div className="card-amount positive">{formatCurrency(summary.totalIncome || 0)}</div>
          <div className="card-change positive">
            <span>📈</span>
            {summary.incomeTransactions || 0} işlem
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon expense-icon">💸</div>
          <div className="card-title">Toplam Gider</div>
          <div className="card-amount negative">{formatCurrency(summary.totalExpenses || 0)}</div>
          <div className="card-change negative">
            <span>📉</span>
            {summary.expenseTransactions || 0} işlem
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon profit-icon">📊</div>
          <div className="card-title">Net Kar/Zarar</div>
          <div className={`card-amount ${(summary.netProfit || 0) >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(summary.netProfit || 0)}
          </div>
          <div className={`card-change ${(summary.netProfit || 0) >= 0 ? 'positive' : 'negative'}`}>
            <span>{(summary.netProfit || 0) >= 0 ? '📈' : '📉'}</span>
            {(summary.netProfit || 0) >= 0 ? 'Kar' : 'Zarar'}
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon pending-icon">⏳</div>
          <div className="card-title">Bekleyen Ödemeler</div>
          <div className="card-amount">{formatCurrency(summary.pendingPayments || 0)}</div>
          <div className="card-change">
            <span>⏰</span>
            Takip edilecek
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="finance-controls">
        <div className="filter-section">
          <div className="filter-row">
            <div className="type-filter">
              <button
                className={`filter-tab ${filters.type === 'all' ? 'active' : ''}`}
                onClick={() => setFilters({...filters, type: 'all'})}
              >
                Tümü
              </button>
              <button
                className={`filter-tab ${filters.type === 'income' ? 'active' : ''}`}
                onClick={() => setFilters({...filters, type: 'income'})}
              >
                Gelir
              </button>
              <button
                className={`filter-tab ${filters.type === 'expense' ? 'active' : ''}`}
                onClick={() => setFilters({...filters, type: 'expense'})}
              >
                Gider
              </button>
            </div>

            <div className="date-filter">
              <input
                type="date"
                className="date-input"
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                title="Başlangıç tarihi seçin"
              />
              <span>-</span>
              <input
                type="date"
                className="date-input"
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                title="Bitiş tarihi seçin"
              />
            </div>
          </div>

          <div className="filter-row">
            <div className="additional-filters">
              <select
                className="filter-select"
                value={filters.month}
                onChange={(e) => setFilters({...filters, month: e.target.value})}
              >
                <option value="">Tüm Aylar</option>
                <option value="0">Ocak</option>
                <option value="1">Şubat</option>
                <option value="2">Mart</option>
                <option value="3">Nisan</option>
                <option value="4">Mayıs</option>
                <option value="5">Haziran</option>
                <option value="6">Temmuz</option>
                <option value="7">Ağustos</option>
                <option value="8">Eylül</option>
                <option value="9">Ekim</option>
                <option value="10">Kasım</option>
                <option value="11">Aralık</option>
              </select>

              <select
                className="filter-select"
                value={filters.year}
                onChange={(e) => setFilters({...filters, year: e.target.value})}
              >
                <option value="">Tüm Yıllar</option>
                <option value="2023">2023</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>

              <select
                className="filter-select"
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
              >
                <option value="">Tüm Kategoriler</option>
                <option value="Üyelik Ödeme">Üyelik Ödeme</option>
                <option value="Kira">Kira</option>
                <option value="Elektrik">Elektrik</option>
                <option value="Su">Su</option>
                <option value="İnternet">İnternet</option>
                <option value="Ekipman">Ekipman</option>
                <option value="Temizlik">Temizlik</option>
                <option value="Diğer">Diğer</option>
              </select>

              <select
                className="filter-select"
                value={filters.paymentMethod}
                onChange={(e) => setFilters({...filters, paymentMethod: e.target.value})}
              >
                <option value="">Tüm Ödeme Yöntemleri</option>
                <option value="Nakit">Nakit</option>
                <option value="Kredi Kartı">Kredi Kartı</option>
                <option value="Banka Transferi">Banka Transferi</option>
                <option value="Çek">Çek</option>
              </select>
            </div>
          </div>
        </div>

        <div className="search-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="İşlem ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="finance-table-container">
        <table className="finance-table">
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Tür</th>
              <th>Açıklama</th>
              <th>Kategori</th>
              <th>Üye</th>
              <th>Ödeme Yöntemi</th>
              <th>Tutar</th>
              <th>Durum</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>
                  Yükleniyor...
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>
                  Henüz işlem kaydı bulunmuyor.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{formatDate(transaction.date)}</td>
                  <td>
                    <div className="transaction-type">
                      <div className={`type-icon ${transaction.type === 'income' ? 'type-income' : 'type-expense'}`}>
                        {transaction.type === 'income' ? '💰' : '💸'}
                      </div>
                      <span>{transaction.type === 'income' ? 'Gelir' : 'Gider'}</span>
                    </div>
                  </td>
                  <td>{transaction.description}</td>
                  <td>{transaction.category}</td>
                  <td>
                    {transaction.memberName ? (
                      <div className="member-info">
                        <div className="member-avatar">
                          {transaction.memberName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span>{transaction.memberName}</span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>{transaction.paymentMethod}</td>
                  <td>
                    <span className={`transaction-amount ${transaction.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </span>
                  </td>
                  <td>
                    <span className={`transaction-status status-${transaction.status}`}>
                      {transaction.status === 'paid' ? 'Ödendi' : 
                       transaction.status === 'pending' ? 'Bekliyor' : 
                       transaction.status === 'completed' ? 'Tamamlandı' : transaction.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="action-button" 
                        title="Düzenle"
                        onClick={() => handleEditTransaction(transaction)}
                      >
                        ✏️
                      </button>
                      <button 
                        className="action-button" 
                        title="Sil"
                        onClick={() => handleDeleteTransaction(transaction.id, transaction.description)}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Income Modal */}
      {showIncomeModal && (
        <div className="modal-overlay" onClick={() => setShowIncomeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingTransaction ? 'Gelir Düzenle' : 'Gelir Ekle'}
              </h2>
              <p className="modal-subtitle">
                {editingTransaction ? 'Gelir kaydını güncelleyin' : 'Yeni gelir kaydı oluşturun'}
              </p>
            </div>
            <form onSubmit={handleAddIncome}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tutar (TL)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={incomeForm.amount}
                    onChange={(e) => setIncomeForm({...incomeForm, amount: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Açıklama</label>
                  <input
                    type="text"
                    className="form-input"
                    value={incomeForm.description}
                    onChange={(e) => setIncomeForm({...incomeForm, description: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Kategori</label>
                  <select
                    className="form-select"
                    value={incomeForm.category}
                    onChange={(e) => setIncomeForm({...incomeForm, category: e.target.value})}
                  >
                    {financeService.getIncomeCategories().map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Ödeme Yöntemi</label>
                  <select
                    className="form-select"
                    value={incomeForm.paymentMethod}
                    onChange={(e) => setIncomeForm({...incomeForm, paymentMethod: e.target.value})}
                  >
                    {financeService.getPaymentMethods().map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Tarih</label>
                  <input
                    type="date"
                    className="form-input"
                    value={incomeForm.date}
                    onChange={(e) => setIncomeForm({...incomeForm, date: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notlar</label>
                  <textarea
                    className="form-textarea"
                    value={incomeForm.notes}
                    onChange={(e) => setIncomeForm({...incomeForm, notes: e.target.value})}
                    placeholder="Ek notlar..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowIncomeModal(false);
                    setEditingTransaction(null);
                  }}
                >
                  İptal
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 
                    (editingTransaction ? 'Güncelleniyor...' : 'Ekleniyor...') : 
                    (editingTransaction ? 'Gelir Güncelle' : 'Gelir Ekle')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingTransaction ? 'Gider Düzenle' : 'Gider Ekle'}
              </h2>
              <p className="modal-subtitle">
                {editingTransaction ? 'Gider kaydını güncelleyin' : 'Yeni gider kaydı oluşturun'}
              </p>
            </div>
            <form onSubmit={handleAddExpense}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tutar (TL)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Açıklama</label>
                  <input
                    type="text"
                    className="form-input"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Kategori</label>
                  <select
                    className="form-select"
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
                  >
                    {financeService.getExpenseCategories().map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Ödeme Yöntemi</label>
                  <select
                    className="form-select"
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm({...expenseForm, paymentMethod: e.target.value})}
                  >
                    {financeService.getPaymentMethods().map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Tarih</label>
                  <input
                    type="date"
                    className="form-input"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notlar</label>
                  <textarea
                    className="form-textarea"
                    value={expenseForm.notes}
                    onChange={(e) => setExpenseForm({...expenseForm, notes: e.target.value})}
                    placeholder="Ek notlar..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowExpenseModal(false);
                    setEditingTransaction(null);
                  }}
                >
                  İptal
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 
                    (editingTransaction ? 'Güncelleniyor...' : 'Ekleniyor...') : 
                    (editingTransaction ? 'Gider Güncelle' : 'Gider Ekle')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Payment Modal */}
      {showMemberPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowMemberPaymentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Üye Ödemesi</h2>
              <p className="modal-subtitle">Üye ödeme kaydı oluşturun</p>
            </div>
            <form onSubmit={handleAddMemberPayment}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Üye Adı</label>
                  <input
                    type="text"
                    className="form-input"
                    value={memberPaymentForm.memberName}
                    onChange={(e) => setMemberPaymentForm({...memberPaymentForm, memberName: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tutar (TL)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={memberPaymentForm.amount}
                    onChange={(e) => setMemberPaymentForm({...memberPaymentForm, amount: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Hizmet Türü</label>
                  <select
                    className="form-select"
                    value={memberPaymentForm.serviceType}
                    onChange={(e) => setMemberPaymentForm({...memberPaymentForm, serviceType: e.target.value})}
                  >
                    <option value="Üyelik Ödemesi">Üyelik Ödemesi</option>
                    <option value="Grup Dersi">Grup Dersi</option>
                    <option value="Kişisel Antrenman">Kişisel Antrenman</option>
                    <option value="Yoga Dersi">Yoga Dersi</option>
                    <option value="Pilates Dersi">Pilates Dersi</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Üyelik Türü</label>
                  <select
                    className="form-select"
                    value={memberPaymentForm.membershipType}
                    onChange={(e) => setMemberPaymentForm({...memberPaymentForm, membershipType: e.target.value})}
                  >
                    <option value="Standart">Standart</option>
                    <option value="Premium">Premium</option>
                    <option value="Unlimited">Unlimited</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Ödeme Yöntemi</label>
                  <select
                    className="form-select"
                    value={memberPaymentForm.paymentMethod}
                    onChange={(e) => setMemberPaymentForm({...memberPaymentForm, paymentMethod: e.target.value})}
                  >
                    {financeService.getPaymentMethods().map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Tarih</label>
                  <input
                    type="date"
                    className="form-input"
                    value={memberPaymentForm.date}
                    onChange={(e) => setMemberPaymentForm({...memberPaymentForm, date: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notlar</label>
                  <textarea
                    className="form-textarea"
                    value={memberPaymentForm.notes}
                    onChange={(e) => setMemberPaymentForm({...memberPaymentForm, notes: e.target.value})}
                    placeholder="Ek notlar..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowMemberPaymentModal(false)}>
                  İptal
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Kaydediliyor...' : 'Ödeme Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className={`notification-toast ${notification.type}`}>
          <div className="notification-content">
            <div className="notification-icon">
              {notification.type === 'success' ? '✅' : 
               notification.type === 'error' ? '❌' : 
               notification.type === 'warning' ? '⚠️' : 'ℹ️'}
            </div>
            <span className="notification-message">{notification.message}</span>
            <button 
              className="notification-close"
              onClick={() => setNotification(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="modal-overlay" onClick={() => setConfirmDialog(null)}>
          <div className="confirmation-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3 className="dialog-title">{confirmDialog.title}</h3>
            </div>
            <div className="dialog-body">
              <p className="dialog-message">{confirmDialog.message}</p>
            </div>
            <div className="dialog-footer">
              <button 
                className="btn btn-secondary"
                onClick={confirmDialog.onCancel}
              >
                İptal
              </button>
              <button 
                className="btn btn-danger"
                onClick={confirmDialog.onConfirm}
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
