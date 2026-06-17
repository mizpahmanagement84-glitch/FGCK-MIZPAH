import { useEffect, useState, useMemo } from 'react';
import client from '../api';

function Givings() {
  const [members, setMembers] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [tithes, setTithes] = useState([]);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [form, setForm] = useState({ memberId: '', amount: '', givingDate: '', category: 'Offering', notes: '', customCategory: '' });
  const [openMonths, setOpenMonths] = useState({});
  const [showForm, setShowForm] = useState(true);
  const [editingOffering, setEditingOffering] = useState(null);
  const [editOfferingForm, setEditOfferingForm] = useState({ memberId: '', amount: '', givingDate: '', category: 'Offering', notes: '', customCategory: '' });
  const [actionMenuId, setActionMenuId] = useState(null);
  const role = localStorage.getItem('role');

  const categories = [
    'Offering',
    'Mission',
    'Thanksgiving',
    'Sunday school',
    'Kifurushi',
    'Seed',
    'Special offering',
    'Teens',
    'kesha',
    'Wednesday offering',
    'Other'
  ];

  const loadData = async () => {
    const role = localStorage.getItem('role');
    const membersRes = await client.get('/members');
    setMembers(membersRes.data);
    // elders should not load offering history or tithes
    if (role === 'elder') {
      setOfferings([]);
      setTithes([]);
      return;
    }
    const [givingsRes, tithesRes] = await Promise.all([
      client.get('/givings', { params: { search, from, to } }),
      client.get('/tithes')
    ]);
    setOfferings(givingsRes.data);
    setTithes(tithesRes.data);
  };

  useEffect(() => { loadData().catch(console.error); }, []);

  const handleFormChange = (field) => (event) => {
    const value = event.target.value;
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'category' && value !== 'Other') {
        next.customCategory = '';
      }
      return next;
    });
  };

  const handleCustomCategoryChange = (event) => {
    setForm({ ...form, customCategory: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const category = form.category === 'Other' ? (form.customCategory || 'Other') : form.category;
    await client.post('/givings', { ...form, category });
    setForm({ memberId: '', amount: '', givingDate: '', category: 'Offering', notes: '', customCategory: '' });
    loadData();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this offering record?')) return;
    await client.delete(`/givings/${id}`);
    if (actionMenuId === id) {
      setActionMenuId(null);
    }
    if (editingOffering && editingOffering.id === id) {
      setEditingOffering(null);
    }
    loadData();
  };

  const handleEditChange = (field) => (event) => {
    setEditOfferingForm({ ...editOfferingForm, [field]: event.target.value });
  };

  const handleEditOffering = (item) => {
    setActionMenuId(null);
    setEditingOffering(item);
    setEditOfferingForm({
      memberId: item.memberId ? String(item.memberId) : '',
      amount: String(item.amount),
      givingDate: item.givingDate?.slice(0, 10) || new Date().toISOString().split('T')[0],
      category: item.category || 'Offering',
      notes: item.notes || ''
    });
  };

  const submitEditOffering = async (event) => {
    event.preventDefault();
    if (!editingOffering) return;
    await client.put(`/givings/${editingOffering.id}`, {
      memberId: editOfferingForm.memberId || null,
      amount: Number(editOfferingForm.amount),
      givingDate: editOfferingForm.givingDate,
      category: editOfferingForm.category,
      notes: editOfferingForm.notes
    });
    setEditingOffering(null);
    setEditOfferingForm({ memberId: '', amount: '', givingDate: '', category: 'Offering', notes: '' });
    loadData();
  };

  const cancelEditOffering = () => {
    setEditingOffering(null);
    setEditOfferingForm({ memberId: '', amount: '', givingDate: '', category: 'Offering', notes: '' });
  };

  const grouped = useMemo(() => {
    // group by month -> date -> items
    const map = {};
    offerings.forEach((item) => {
      const d = new Date(item.givingDate);
      const monthKey = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      const dateKey = d.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!map[monthKey]) map[monthKey] = {};
      if (!map[monthKey][dateKey]) map[monthKey][dateKey] = [];
      map[monthKey][dateKey].push(item);
    });
    return map;
  }, [offerings]);

  const titheTotalsByDate = useMemo(() => {
    const map = {};
    tithes.forEach((item) => {
      const dateKey = item.givingDate;
      map[dateKey] = (map[dateKey] || 0) + Number(item.amount);
    });
    return map;
  }, [tithes]);

  const toggleMonth = (key) => {
    setOpenMonths((s) => ({ ...s, [key]: !s[key] }));
    setPendingAction(null);
    setSelectedCategory('');
  };

  const monthTotal = (items) => items.reduce((s,i)=>s+Number(i.amount),0);

  const [actionMenuDate, setActionMenuDate] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');

  const formatCurrency = (value) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(value);

  const handleActionButton = (dateKey) => {
    if (actionMenuDate === dateKey) {
      setActionMenuDate(null);
      setPendingAction(null);
      setSelectedCategory('');
      return;
    }
    setActionMenuDate(dateKey);
    setPendingAction(null);
    setSelectedCategory('');
  };

  const startPendingAction = (dateKey, action) => {
    setPendingAction({ dateKey, action });
    setActionMenuDate(null);
    setSelectedCategory('');
  };

  const handlePerformAction = async (dateKey, action, category, itemsForDate) => {
    if (!category) {
      return window.alert('Please select a recorded category.');
    }

    const matching = itemsForDate.filter((it) => it.category.toLowerCase() === category.toLowerCase());
    if (!matching.length) {
      return window.alert(`No records found for category ${category} on that date.`);
    }

    if (action === 'delete') {
      if (!window.confirm(`Delete all ${category} records for ${new Date(dateKey).toLocaleDateString()}?`)) return;
      for (const rec of matching) {
        await client.delete(`/givings/${rec.id}`);
      }
    } else if (action === 'edit') {
      const totalAmount = matching.reduce((sum, it) => sum + Number(it.amount), 0).toFixed(2);
      const amountInput = window.prompt(`Enter new amount for ${category} on ${new Date(dateKey).toLocaleDateString()}:`, totalAmount);
      if (amountInput === null) return;
      const newAmount = Number(amountInput);
      if (Number.isNaN(newAmount)) {
        return window.alert('Please enter a valid number.');
      }
      const notesInput = window.prompt('Enter notes (optional):', matching[0].notes || '');
      for (const rec of matching) {
        await client.put(`/givings/${rec.id}`, {
          memberId: rec.memberId,
          amount: newAmount,
          givingDate: rec.givingDate,
          category: rec.category,
          notes: notesInput || ''
        });
      }
    }

    setPendingAction(null);
    setSelectedCategory('');
    loadData();
  };

  return (
    <div>
      <h1 className="page-title">Offerings</h1>

      <div className="section-card">
        <form onSubmit={(e)=>{e.preventDefault(); loadData();}} className="search-row">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search offerings" />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button className="button-secondary" type="button" onClick={loadData}>Filter</button>
          <button className="button-secondary" type="button" onClick={() => { setSearch(''); setFrom(''); setTo(''); loadData(); }}>Clear</button>
        </form>
      </div>

      {role !== 'member' && (
        <div className="section-card">
          <div className="section-card-header">
            <h2>Record new offering</h2>
            <button className="close-button" type="button" onClick={() => setShowForm((visible) => !visible)}>
              {showForm ? 'Close' : 'Open'}
            </button>
          </div>
          {showForm ? (
            <form onSubmit={handleSubmit}>
              <div className="input-row">
                <div className="form-field">
                  <label>Category</label>
                  <select value={form.category} onChange={handleFormChange('category')}>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="input-row">
                <div className="form-field">
                  <label>Date</label>
                  <input type="date" value={form.givingDate} onChange={handleFormChange('givingDate')} max={new Date().toISOString().split('T')[0]} required />
                </div>
                <div className="form-field">
                  <label>Amount</label>
                  <input type="number" step="0.01" value={form.amount} onChange={handleFormChange('amount')} required />
                </div>
              </div>
              {form.category === 'Other' && (
                <div className="form-field">
                  <label>Other category</label>
                  <input
                    type="text"
                    value={form.customCategory}
                    onChange={handleCustomCategoryChange}
                    placeholder="Enter custom offering category"
                    required
                  />
                </div>
              )}
              <div className="form-field">
                <label>Notes</label>
                <textarea rows="2" value={form.notes} onChange={handleFormChange('notes')} />
              </div>
              <button className="button-primary" type="submit">Save offering</button>
            </form>
          ) : (
            <p>Offering form is hidden. Click Open to show the form.</p>
          )}
        </div>
      )}

      {localStorage.getItem('role') !== 'elder' && (
        <div className="section-card">
          <h2>Offering history</h2>
          {Object.keys(grouped).length === 0 && <p>No records</p>}
          {Object.entries(grouped).map(([month, dates]) => {
            const allItems = Object.values(dates).flat();
            const monthSum = monthTotal(allItems);
            return (
              <div key={month} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => toggleMonth(month)}>
                  <strong>{month}</strong>
                  <span>Total: {formatCurrency(monthSum)}</span>
                </div>
                {openMonths[month] && (
                  <div style={{ marginTop: 8 }}>
                    {Object.entries(dates).map(([dateKey, itemsForDate]) => {
                      const dateSum = itemsForDate.reduce((s, it) => s + Number(it.amount), 0);
                      return (
                        <div key={dateKey} style={{ marginBottom: 8 }}>
                          <table className="table-list">
                            <thead>
                              <tr>
                                <th style={{ minWidth: 160 }}>Date</th>
                                {itemsForDate.map((it) => (
                                  <th key={it.id} style={{ textAlign: 'center' }}>{it.category}</th>
                                ))}
                                <th style={{ minWidth: 120 }}>Recorded By</th>
                                <th style={{ minWidth: 140 }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td style={{ verticalAlign: 'middle' }}>{new Date(dateKey).toLocaleDateString()}</td>
                                {itemsForDate.map((it) => (
                                  <td key={it.id} style={{ textAlign: 'center', verticalAlign: 'middle' }}>{formatCurrency(it.amount)}</td>
                                ))}
                                <td style={{ verticalAlign: 'middle', fontSize: '0.9em', color: '#666' }}>
                                  {itemsForDate[0]?.recordedByName ? `${itemsForDate[0].recordedByName}` : 'Admin'}
                                </td>
                                <td style={{ position: 'relative' }}>
                                  <button
                                    type="button"
                                    onClick={() => setActionMenuDate(actionMenuDate === dateKey ? null : dateKey)}
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
                                  {actionMenuDate === dateKey && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '100%',
                                      right: 0,
                                      backgroundColor: '#fff',
                                      border: '1px solid #ddd',
                                      boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
                                      zIndex: 10,
                                      padding: 8,
                                      width: 320
                                    }}>
                                      {itemsForDate.map((it) => (
                                        <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '6px 4px', borderBottom: '1px solid #f0f0f0' }}>
                                          <div style={{ flex: 1 }}>{it.category} — {formatCurrency(it.amount)}</div>
                                          <div style={{ display: 'flex', gap: 6 }}>
                                            <button type="button" onClick={() => { handleEditOffering(it); setActionMenuDate(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                                            <button type="button" onClick={() => { handleDelete(it.id); setActionMenuDate(null); }} style={{ background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer' }}>Delete</button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <td><strong>Date total</strong></td>
                                <td colSpan={Math.max(1, itemsForDate.length)} style={{ textAlign: 'right' }}><strong>{formatCurrency(dateSum)}</strong></td>
                                <td />
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
          })}
        </div>
      )}
      {editingOffering && (
        <div className="section-card" style={{ marginTop: 16 }}>
          <h2>Edit offering</h2>
          <form onSubmit={submitEditOffering}>
            <div className="input-row">
              <div className="form-field">
                <label>Category</label>
                <select value={editOfferingForm.category} onChange={handleEditChange('category')} required>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Date</label>
                <input type="date" value={editOfferingForm.givingDate} onChange={handleEditChange('givingDate')} required />
              </div>
            </div>
            <div className="input-row">
              <div className="form-field">
                <label>Amount</label>
                <input type="number" step="0.01" value={editOfferingForm.amount} onChange={handleEditChange('amount')} required />
              </div>
              <div className="form-field">
                <label>Member ID</label>
                <input type="text" value={editOfferingForm.memberId} onChange={handleEditChange('memberId')} />
              </div>
            </div>
            <div className="form-field">
              <label>Notes</label>
              <textarea rows="3" value={editOfferingForm.notes} onChange={handleEditChange('notes')} />
            </div>
            {editingOffering?.recordedByName && (
              <div className="form-field" style={{ color: '#666', fontSize: '0.9em' }}>
                <label>Recorded By</label>
                <p style={{ margin: '8px 0 0', color: '#333' }}>{editingOffering.recordedByName}</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="button-primary" type="submit">Save changes</button>
              <button type="button" onClick={cancelEditOffering}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Givings;
