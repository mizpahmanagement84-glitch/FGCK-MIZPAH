import { useEffect, useState } from 'react';
import client from '../api';

function Departments() {
  const [transactions, setTransactions] = useState([]);
  const [expandedDepartment, setExpandedDepartment] = useState(null);
  const [transactionForm, setTransactionForm] = useState({
    department: 'Men',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    transactionType: 'deposit'
  });
  const [showTransactionForm, setShowTransactionForm] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editTransactionForm, setEditTransactionForm] = useState({
    department: 'Men',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    transactionType: 'deposit'
  });
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const role = localStorage.getItem('role');

  const formatRecordedBy = (record) => {
    const name = record?.recordedByName || 'Admin';
    if (role === 'pastor' && record?.recordedByMemberNumber) {
      return `${name} (${record.recordedByMemberNumber})`;
    }
    return name;
  };

  const departmentOptions = ['Men', 'Ladies', 'Youth', 'Teens', 'Sunday School', 'Choir', 'Praise & Worship', 'Intercessory', 'Welfare'];

  const formatNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const loadTransactions = async () => {
    try {
      const response = await client.get('/department-transactions');
      setTransactions(response.data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  useEffect(() => {
    loadTransactions().catch(console.error);
  }, []);

  const handleTransactionChange = (field) => (event) => {
    setTransactionForm({ ...transactionForm, [field]: event.target.value });
  };

  const handleEditChange = (field) => (event) => {
    setEditTransactionForm({ ...editTransactionForm, [field]: event.target.value });
  };

  const handleEditTransaction = (transaction) => {
    setActiveActionMenuId(null);
    setEditingTransaction(transaction);
    setEditTransactionForm({
      department: transaction.department,
      amount: String(transaction.amount),
      date: new Date(transaction.date).toISOString().split('T')[0],
      transactionType: transaction.transactionType
    });
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await client.delete(`/department-transactions/${id}`);
      if (activeActionMenuId === id) {
        setActiveActionMenuId(null);
      }
      if (editingTransaction && editingTransaction.id === id) {
        setEditingTransaction(null);
      }
      loadTransactions();
    } catch (error) {
      window.alert('Failed to delete transaction');
      console.error(error);
    }
  };

  const submitEditTransaction = async (event) => {
    event.preventDefault();
    if (!editingTransaction) return;
    if (!editTransactionForm.amount) {
      window.alert('Please enter an amount');
      return;
    }
    try {
      await client.put(`/department-transactions/${editingTransaction.id}`, {
        department: editTransactionForm.department,
        amount: Number(editTransactionForm.amount),
        date: editTransactionForm.date,
        transactionType: editTransactionForm.transactionType
      });
      setEditingTransaction(null);
      setEditTransactionForm({
        department: 'Men',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        transactionType: 'deposit'
      });
      loadTransactions();
    } catch (error) {
      window.alert('Failed to update transaction');
      console.error(error);
    }
  };

  const toggleActionMenu = (id) => {
    setActiveActionMenuId(activeActionMenuId === id ? null : id);
  };

  const cancelEdit = () => {
    setEditingTransaction(null);
    setEditTransactionForm({
      department: 'Men',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      transactionType: 'deposit'
    });
  };

  const handleTransactionSubmit = async (event) => {
    event.preventDefault();
    if (!transactionForm.amount) {
      window.alert('Please enter an amount');
      return;
    }
    try {
      await client.post('/department-transactions', {
        department: transactionForm.department,
        amount: Number(transactionForm.amount),
        date: transactionForm.date,
        transactionType: transactionForm.transactionType
      });
      setTransactionForm({
        department: 'Men',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        transactionType: 'deposit'
      });
      loadTransactions();
    } catch (error) {
      window.alert('Failed to record transaction');
      console.error(error);
    }
  };

  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getDepartmentBalance = (dept) => {
    let balance = 0;
    transactions
      .filter((t) => t.department === dept)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach((t) => {
        const amount = formatNumber(t.amount);
        if (t.transactionType === 'deposit') {
          balance += amount;
        } else {
          balance -= amount;
        }
      });
    return balance;
  };

  const getDepartmentTransactions = (dept) => {
    return transactions
      .filter((t) => t.department === dept)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const getTransactionsWithBalance = (dept) => {
    let balance = 0;
    return getDepartmentTransactions(dept)
      .map((t) => {
        const amount = formatNumber(t.amount);
        if (t.transactionType === 'deposit') {
          balance += amount;
        } else {
          balance -= amount;
        }
        return { ...t, amount, balance };
      })
      .reverse();
  };

  const uniqueDepartments = [...new Set(transactions.map((t) => t.department))].sort();

  return (
    <div>
      <h1 className="page-title">Departments</h1>
      <div className="section-card">
        <div className="section-card-header">
          <h2>Record Transaction</h2>
          <button className="close-button" type="button" onClick={() => setShowTransactionForm((visible) => !visible)}>
            {showTransactionForm ? 'Close' : 'Open'}
          </button>
        </div>
        {showTransactionForm ? (
          <form onSubmit={handleTransactionSubmit}>
            <div className="input-row">
              <div className="form-field">
                <label>Department</label>
                <select value={transactionForm.department} onChange={handleTransactionChange('department')} required>
                  {departmentOptions.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Amount</label>
                <input type="number" value={transactionForm.amount} onChange={handleTransactionChange('amount')} step="0.01" required />
              </div>
            </div>
            <div className="input-row">
              <div className="form-field">
                <label>Date</label>
                <input type="date" value={transactionForm.date} onChange={handleTransactionChange('date')} max={getTodayString()} required />
              </div>
              <div className="form-field">
                <label>Transaction Type</label>
                <select value={transactionForm.transactionType} onChange={handleTransactionChange('transactionType')} required>
                  <option value="deposit">Deposit</option>
                  <option value="withdraw">Withdraw</option>
                </select>
              </div>
            </div>
            <button className="button-primary" type="submit">Record Transaction</button>
          </form>
        ) : (
          <p>Transaction form is hidden. Click Open to show the form.</p>
        )}
      </div>
      <div className="section-card">
        <h2>Transaction History</h2>
        {uniqueDepartments.length === 0 ? (
          <p>No transactions recorded yet.</p>
        ) : (
          <div>
            {uniqueDepartments.map((dept) => (
              <div key={dept} style={{ marginBottom: '16px', border: '1px solid #ddd', borderRadius: '4px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f5f5f5',
                    cursor: 'pointer'
                  }}
                  onClick={() => setExpandedDepartment(expandedDepartment === dept ? null : dept)}
                >
                  <span style={{ fontWeight: '600', fontSize: '16px' }}>
                    {expandedDepartment === dept ? '▼' : '▶'} {dept}
                  </span>
                  <span style={{
                    fontWeight: 'bold',
                    fontSize: '16px',
                    color: getDepartmentBalance(dept) >= 0 ? '#27ae60' : '#e74c3c'
                  }}>
                    Balance: {formatNumber(getDepartmentBalance(dept)).toFixed(2)}
                  </span>
                </div>
                {expandedDepartment === dept && (
                  <table className="table-list" style={{ margin: 0, borderTop: 'none' }}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Amount</th>
                        <th>Type</th>
                        <th>Date</th>
                        <th>Balance</th>
                        <th>Recorded By</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getTransactionsWithBalance(dept).map((transaction, index) => (
                        <tr
                          key={transaction.id}
                          style={{
                            backgroundColor: transaction.transactionType === 'deposit' ? '#e3f2fd' : '#ffebee'
                          }}
                        >
                          <td>{index + 1}</td>
                          <td>{formatNumber(transaction.amount).toFixed(2)}</td>
                          <td style={{ textTransform: 'capitalize' }}>{transaction.transactionType}</td>
                          <td>{new Date(transaction.date).toLocaleDateString()}</td>
                          <td style={{ fontWeight: 'bold', color: transaction.balance >= 0 ? '#27ae60' : '#e74c3c' }}>
                            {formatNumber(transaction.balance).toFixed(2)}
                          </td>
                          <td style={{ fontSize: '0.9em', color: '#666' }}>{formatRecordedBy(transaction)}</td>
                          <td style={{ position: 'relative', minWidth: '120px' }}>
                            <div style={{ display: 'inline-block' }}>
                              <button
                                type="button"
                                onClick={() => toggleActionMenu(transaction.id)}
                                style={{
                                  backgroundColor: '#c0392b',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: 4,
                                  cursor: 'pointer'
                                }}
                              >
                                Actions
                              </button>
                              {activeActionMenuId === transaction.id && (
                                <div style={{
                                  position: 'absolute',
                                  top: '100%',
                                  right: 0,
                                  backgroundColor: '#fff',
                                  border: '1px solid #ddd',
                                  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.12)',
                                  zIndex: 1,
                                  width: '140px'
                                }}>
                                  <button type="button" onClick={() => handleEditTransaction(transaction)} style={{
                                    display: 'block',
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '8px 10px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer'
                                  }}>
                                    Edit
                                  </button>
                                  <button type="button" onClick={() => handleDeleteTransaction(transaction.id)} style={{
                                    display: 'block',
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '8px 10px',
                                    background: 'none',
                                    border: 'none',
                                    color: '#c0392b',
                                    cursor: 'pointer'
                                  }}>
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {editingTransaction && (
        <div className="section-card">
          <h2>Edit Transaction</h2>
          <form onSubmit={submitEditTransaction}>
            <div className="input-row">
              <div className="form-field">
                <label>Department</label>
                <select value={editTransactionForm.department} onChange={handleEditChange('department')} required>
                  {departmentOptions.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Amount</label>
                <input type="number" value={editTransactionForm.amount} onChange={handleEditChange('amount')} step="0.01" required />
              </div>
            </div>
            <div className="input-row">
              <div className="form-field">
                <label>Date</label>
                <input type="date" value={editTransactionForm.date} onChange={handleEditChange('date')} max={getTodayString()} required />
              </div>
              <div className="form-field">
                <label>Transaction Type</label>
                <select value={editTransactionForm.transactionType} onChange={handleEditChange('transactionType')} required>
                  <option value="deposit">Deposit</option>
                  <option value="withdraw">Withdraw</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button className="button-primary" type="submit">Save Changes</button>
              <button type="button" onClick={cancelEdit}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Departments;
