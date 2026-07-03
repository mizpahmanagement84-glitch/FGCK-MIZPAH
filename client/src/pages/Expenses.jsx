import { useEffect, useState } from 'react';
import client from '../api';

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [form, setForm] = useState({ expense: '', amount: '', date: '' });
  const [showForm, setShowForm] = useState(true);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [actionType, setActionType] = useState(null); // 'edit' or 'delete'
  const [editingRecord, setEditingRecord] = useState(null);
  const [editingForm, setEditingForm] = useState({ expense: '', amount: '', date: '' });
  const role = localStorage.getItem('role');

  const formatRecordedBy = (record) => {
    const name = record?.recordedByName || 'Admin';
    if (role === 'pastor' && record?.recordedByMemberNumber) {
      return `${name} (${record.recordedByMemberNumber})`;
    }
    return name;
  };

  useEffect(() => {
    const loadData = async () => {
      const role = localStorage.getItem('role');
      // elders should not fetch expense summary
      if (role === 'elder') {
        const offeringsRes = await client.get('/givings');
        setExpenses([]);
        setOfferings(offeringsRes.data);
        return;
      }
      const [expensesRes, offeringsRes] = await Promise.all([
        client.get('/expenses'),
        client.get('/givings')
      ]);
      setExpenses(expensesRes.data);
      setOfferings(offeringsRes.data);
    };
    loadData().catch(console.error);
  }, []);

  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Number(value || 0));

  const handleChange = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await client.post('/expenses', form);
    setForm({ expense: '', amount: '', date: '' });
    const response = await client.get('/expenses');
    setExpenses(response.data);
  };

  const [expandedHistoryMonth, setExpandedHistoryMonth] = useState(null);
  const [expandedSummaryMonth, setExpandedSummaryMonth] = useState(null);

  const monthGroups = expenses.reduce((groups, item) => {
    const dateKey = item.date || 'Unknown date';
    const monthKey = item.date ? item.date.slice(0, 7) : 'Unknown date';
    const monthLabel = item.date
      ? new Date(`${monthKey}-01`).toLocaleString('default', { month: 'long', year: 'numeric' })
      : 'Unknown date';

    if (!groups[monthKey]) {
      groups[monthKey] = {
        monthKey,
        monthLabel,
        total: 0,
        dateGroups: {}
      };
    }

    const month = groups[monthKey];
    month.total += Number(item.amount);

    if (!month.dateGroups[dateKey]) {
      month.dateGroups[dateKey] = {
        date: dateKey,
        expenses: {},
        total: 0,
        records: []
      };
    }

    const dateGroup = month.dateGroups[dateKey];
    dateGroup.total += Number(item.amount);
    if (!dateGroup.expenses[item.expense]) {
      dateGroup.expenses[item.expense] = 0;
    }
    dateGroup.expenses[item.expense] += Number(item.amount);
    dateGroup.records.push(item);

    return groups;
  }, {});

  const monthKeys = Object.keys(monthGroups).sort((a, b) => (a > b ? -1 : 1));
  const allExpenseNames = new Set();
  Object.values(monthGroups).forEach((month) => {
    Object.values(month.dateGroups).forEach((group) => {
      Object.keys(group.expenses).forEach((expenseName) => {
        allExpenseNames.add(expenseName);
      });
    });
  });
  const sortedExpenseNames = Array.from(allExpenseNames).sort();

  const offeringsByMonth = offerings.reduce((groups, item) => {
    const monthKey = item.givingDate ? item.givingDate.slice(0, 7) : 'Unknown date';
    if (!groups[monthKey]) {
      groups[monthKey] = { total: 0, records: [] };
    }
    groups[monthKey].total += Number(item.amount || 0);
    groups[monthKey].records.push(item);
    return groups;
  }, {});

  const expensesByMonth = expenses.reduce((groups, item) => {
    const monthKey = item.date ? item.date.slice(0, 7) : 'Unknown date';
    if (!groups[monthKey]) {
      groups[monthKey] = { total: 0, records: [] };
    }
    groups[monthKey].total += Number(item.amount || 0);
    groups[monthKey].records.push(item);
    return groups;
  }, {});

  const summaryMonthKeys = Array.from(new Set([...Object.keys(offeringsByMonth), ...Object.keys(expensesByMonth)])).sort((a, b) => (a > b ? -1 : 1));
  const summaryMonths = summaryMonthKeys.map((monthKey) => {
    const monthLabel = monthKey === 'Unknown date'
      ? 'Unknown date'
      : new Date(`${monthKey}-01`).toLocaleString('default', { month: 'long', year: 'numeric' });
    return {
      monthKey,
      monthLabel,
      offeringTotal: offeringsByMonth[monthKey]?.total || 0,
      expenseTotal: expensesByMonth[monthKey]?.total || 0
    };
  });

  const summaryRows = summaryMonths
    .slice()
    .sort((a, b) => (a.monthKey > b.monthKey ? 1 : -1))
    .map((month, index, array) => {
      const previous = array[index - 1];
      const previousBalance = previous ? previous.balance : 0;
      const balanceBroughtForward = previous ? previous.balance : 0;
      const cumulativeTotal = balanceBroughtForward + month.offeringTotal;
      const balance = cumulativeTotal - month.expenseTotal;
      return {
        ...month,
        balanceBroughtForward,
        cumulativeTotal,
        balance
      };
    })
    .sort((a, b) => (a.monthKey > b.monthKey ? -1 : 1));

  const offeringsByDate = offerings.reduce((groups, item) => {
    const dateKey = item.givingDate || 'Unknown date';
    if (!groups[dateKey]) {
      groups[dateKey] = { total: 0, records: [] };
    }
    groups[dateKey].total += Number(item.amount || 0);
    groups[dateKey].records.push(item);
    return groups;
  }, {});

  const expensesByDate = expenses.reduce((groups, item) => {
    const dateKey = item.date || 'Unknown date';
    if (!groups[dateKey]) {
      groups[dateKey] = { total: 0, records: [] };
    }
    groups[dateKey].total += Number(item.amount || 0);
    groups[dateKey].records.push(item);
    return groups;
  }, {});

  const handleEditRecord = (record) => {
    setEditingRecord(record);
    setEditingForm({ expense: record.expense, amount: String(record.amount), date: record.date || '' });
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    if (!editingRecord) return;
    const amount = Number(editingForm.amount);
    if (Number.isNaN(amount)) return window.alert('Enter a valid amount.');
    await client.put(`/expenses/${editingRecord.id}`, { expense: editingForm.expense, amount, date: editingForm.date });
    setEditingRecord(null);
    setActionMenuId(null);
    setActionType(null);
    const response = await client.get('/expenses');
    setExpenses(response.data);
  };

  const cancelEdit = () => {
    setEditingRecord(null);
    setEditingForm({ expense: '', amount: '', date: '' });
  };

  const handleDeleteRecord = async (record) => {
    if (!window.confirm(`Delete ${record.expense} - ${record.amount}?`)) return;
    await client.delete(`/expenses/${record.id}`);
    setActionMenuId(null);
    setActionType(null);
    const response = await client.get('/expenses');
    setExpenses(response.data);
  };

  return (
    <div>
      <h1 className="page-title">Expenses</h1>
      <div className="section-card">
        <div className="section-card-header">
          <h2>Record expense</h2>
          <button className="close-button" type="button" onClick={() => setShowForm((visible) => !visible)}>
            {showForm ? 'Close' : 'Open'}
          </button>
        </div>
        {showForm ? (
          <form onSubmit={handleSubmit}>
            <div className="input-row">
              <div className="form-field">
                <label>Expense</label>
                <input value={form.expense} onChange={handleChange('expense')} required />
              </div>
              <div className="form-field">
                <label>Amount</label>
                <input type="number" value={form.amount} onChange={handleChange('amount')} required />
              </div>
              <div className="form-field">
                <label>Date</label>
                <input type="date" value={form.date} onChange={handleChange('date')} max={getTodayString()} required />
              </div>
            </div>
            <button className="button-primary" type="submit">Save expense</button>
          </form>
        ) : (
          <p>Expense form is hidden. Click Open to show the form.</p>
        )}
      </div>
      {role !== 'secretary' && (
        <div className="section-card">
          <h2>Expense history</h2>
          {monthKeys.length === 0 ? (
            <p>No expense records yet.</p>
          ) : (
            monthKeys.map((monthKey) => {
              const month = monthGroups[monthKey];
              const dateKeys = Object.keys(month.dateGroups).sort((a, b) => (a > b ? -1 : 1));
              return (
                <div key={monthKey} style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderRadius: 6,
                      background: '#f1f1f1',
                      cursor: 'pointer'
                    }}
                    onClick={() => setExpandedHistoryMonth((current) => (current === monthKey ? null : monthKey))}
                  >
                    <div>{month.monthLabel}</div>
                    <div><strong>Total: {month.total}</strong></div>
                  </div>
                  {expandedHistoryMonth === monthKey && (
                    <div style={{ marginTop: 12 }}>
                      {dateKeys.map((dateKey) => {
                        const group = month.dateGroups[dateKey];
                        return (
                          <div key={dateKey} style={{ marginBottom: 16 }}>
                            <table className="table-list">
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  {sortedExpenseNames.map((expenseName) => (
                                    <th key={expenseName}>{expenseName}</th>
                                  ))}
                                  <th>Total</th>
                                  <th>Recorded By</th>
                                  <th>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td>{group.date}</td>
                                  {sortedExpenseNames.map((expenseName) => (
                                    <td key={expenseName}>{group.expenses[expenseName] || ''}</td>
                                  ))}
                                  <td>{group.total}</td>
                                  <td style={{ fontSize: '0.9em', color: '#666' }}>{formatRecordedBy(group.records[0])}</td>
                                  <td style={{ position: 'relative' }}>
                                    <button
                                      type="button"
                                      className="action-button"
                                      onClick={() => setActionMenuId((current) => (current === dateKey ? null : dateKey))}
                                      style={{ backgroundColor: 'red', color: '#fff' }}
                                    >
                                      Action
                                    </button>
                                    {actionMenuId === dateKey && (
                                      <div className="action-menu">
                                        <div style={{ marginBottom: 8 }}>
                                          <button type="button" onClick={() => { setActionType('edit'); }} style={{ marginRight: 8 }}>Edit</button>
                                          <button type="button" onClick={() => { setActionType('delete'); }}>Delete</button>
                                        </div>

                                        {actionType === 'edit' && (
                                          <div className="action-submenu">
                                            {group.records.map((rec) => (
                                              <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                                                <div>{rec.expense} — {rec.amount}</div>
                                                <div>
                                                  <button type="button" onClick={() => handleEditRecord(rec)}>Edit this</button>
                                                </div>
                                              </div>
                                            ))}
                                            <div>
                                              <button type="button" onClick={() => { setActionMenuId(null); setActionType(null); }}>Close</button>
                                            </div>
                                          </div>
                                        )}

                                        {actionType === 'delete' && (
                                          <div className="action-submenu">
                                            {group.records.map((rec) => (
                                              <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                                                <div>{rec.expense} — {rec.amount}</div>
                                                <div>
                                                  <button type="button" onClick={() => handleDeleteRecord(rec)} style={{ color: 'red' }}>Delete</button>
                                                </div>
                                              </div>
                                            ))}
                                            <div>
                                              <button type="button" onClick={() => { setActionMenuId(null); setActionType(null); }}>Close</button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {role !== 'elder' && role !== 'secretary' && (
        <div className="section-card">
          <h2>Expenditure Summary</h2>
          {summaryRows.length === 0 ? (
            <p>No expenditure summary data yet.</p>
          ) : (
            summaryRows.map((month) => {
              const dateKeys = Array.from(
                new Set([
                  ...Object.keys(offeringsByDate).filter((date) => date.startsWith(month.monthKey)),
                  ...Object.keys(expensesByDate).filter((date) => date.startsWith(month.monthKey))
                ])
              ).sort((a, b) => (a > b ? -1 : 1));

              return (
                <div key={month.monthKey} style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderRadius: 6,
                      background: '#f1f1f1',
                      cursor: 'pointer'
                    }}
                    onClick={() => setExpandedSummaryMonth((current) => (current === month.monthKey ? null : month.monthKey))}
                  >
                    <div>{month.monthLabel}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12 }}>
                      <span><strong>Balance:</strong> {formatCurrency(month.balance)}</span>
                      <span style={{ opacity: 0.7 }}>(click to expand)</span>
                    </div>
                  </div>
                  {expandedSummaryMonth === month.monthKey && (
                    <div style={{ marginTop: 12 }}>
                      <table className="table-list">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Total Income</th>
                            <th>Expenses</th>
                            <th>Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dateKeys.map((dateKey) => {
                            const income = offeringsByDate[dateKey]?.total || 0;
                            const expense = expensesByDate[dateKey]?.total || 0;
                            return (
                              <tr key={dateKey}>
                                <td>{dateKey}</td>
                                <td>{formatCurrency(income)}</td>
                                <td>{formatCurrency(expense)}</td>
                                <td>{formatCurrency(income - expense)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {editingRecord && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal" style={{ background: '#fff', padding: 16, width: 420, borderRadius: 6 }}>
            <h3>Edit expense</h3>
            <form onSubmit={submitEdit}>
              <div style={{ marginBottom: 8 }}>
                <label>Expense</label>
                <input style={{ width: '100%' }} value={editingForm.expense} onChange={(e) => setEditingForm({ ...editingForm, expense: e.target.value })} required />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label>Amount</label>
                <input style={{ width: '100%' }} value={editingForm.amount} onChange={(e) => setEditingForm({ ...editingForm, amount: e.target.value })} required />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label>Date</label>
                <input type="date" style={{ width: '100%' }} value={editingForm.date} onChange={(e) => setEditingForm({ ...editingForm, date: e.target.value })} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={cancelEdit}>Cancel</button>
                <button className="button-primary" type="submit">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Expenses;
