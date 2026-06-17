import { useEffect, useState, useMemo } from 'react';
import client from '../api';
import { formatCurrency } from '../utils/currency';
import { titleCase } from '../utils/string';

function Reports() {
  const [members, setMembers] = useState([]);
  const [tithes, setTithes] = useState([]);
  const [form, setForm] = useState({ memberId: '', amount: '', givingDate: '' });
  const [memberSearch, setMemberSearch] = useState('');
  const [showForm, setShowForm] = useState(true);
  const [openMonths, setOpenMonths] = useState({});
  const [openGroups, setOpenGroups] = useState({});
  const [actionMenuId, setActionMenuId] = useState(null);
  const [editingTithe, setEditingTithe] = useState(null);
  const [editingForm, setEditingForm] = useState({ memberId: '', amount: '', givingDate: '', notes: '' });
  const [editError, setEditError] = useState('');
  const role = localStorage.getItem('role') || '';

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const query = memberSearch.trim().toLowerCase();
    return members.filter((member) => {
      const name = (member.firstName || '').toLowerCase();
      const number = String(member.memberNumber || '');
      const lastThree = number.slice(-3);
      return name.includes(query) || number.includes(query) || lastThree.includes(query);
    });
  }, [members, memberSearch]);

  useEffect(() => {
    const loadReports = async () => {
      const [membersRes, tithesRes] = await Promise.all([
        client.get('/members'),
        client.get('/tithes')
      ]);
      setMembers(membersRes.data);
      setTithes(tithesRes.data);
    };
    loadReports().catch(console.error);
  }, []);

  const totalAmount = useMemo(() => tithes.reduce((sum, item) => sum + Number(item.amount), 0), [tithes]);
  const groupedByMonth = useMemo(() => {
    const groups = {};
    tithes.forEach((item) => {
      const date = new Date(item.givingDate);
      const monthKey = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(item);
    });
    return groups;
  }, [tithes]);

  const toggleMonth = (monthKey) => {
    setOpenMonths((current) => ({ ...current, [monthKey]: !current[monthKey] }));
    setActionMenuId(null);
  };

  const toggleActionMenu = (id) => {
    setActionMenuId((current) => (current === id ? null : id));
  };

  const handleEditTithe = (tithe) => {
    if (role !== 'pastor') return;
    setEditingTithe(tithe);
    setEditingForm({
      memberId: tithe.memberId || '',
      amount: String(tithe.amount || ''),
      givingDate: tithe.givingDate || '',
      notes: tithe.notes || ''
    });
    setEditError('');
  };

  const handleDeleteTithe = async (id) => {
    if (!window.confirm('Delete this tithe record?')) return;
    await client.delete(`/tithes/${id}`);
    setActionMenuId(null);
    const tithesRes = await client.get('/tithes');
    setTithes(tithesRes.data);
  };

  const handleEditChange = (field) => (event) => {
    setEditingForm({ ...editingForm, [field]: event.target.value });
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editingTithe) return;

    if (!editingForm.memberId || !editingForm.amount || !editingForm.givingDate) {
      setEditError('Member, amount, and date are required.');
      return;
    }

    const amount = Number(editingForm.amount);
    if (Number.isNaN(amount)) {
      setEditError('Amount must be a valid number.');
      return;
    }

    try {
      await client.put(`/tithes/${editingTithe.id}`, {
        memberId: Number(editingForm.memberId),
        amount,
        givingDate: editingForm.givingDate,
        notes: editingForm.notes || ''
      });
      const tithesRes = await client.get('/tithes');
      setTithes(tithesRes.data);
      setEditingTithe(null);
      setEditingForm({ memberId: '', amount: '', givingDate: '', notes: '' });
      setEditError('');
    } catch (err) {
      setEditError('Failed to save tithe details.');
      console.error(err);
    }
  };

  const groupedTithesByGroup = useMemo(() => {
    const memberMap = members.reduce((map, member) => {
      map[member.id] = member;
      return map;
    }, {});
    return tithes.reduce((groups, tithe) => {
      const member = memberMap[tithe.memberId] || {};
      const groupName = titleCase(member.group || 'Unassigned');
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push({
        ...tithe,
        memberName: member.firstName || tithe.firstName || 'Unknown',
        memberGroup: groupName
      });
      return groups;
    }, {});
  }, [tithes, members]);

  const toggleGroup = (groupName) => {
    setOpenGroups((current) => ({ ...current, [groupName]: !current[groupName] }));
    setActionMenuId(null);
  };

  const handleChange = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
  };

  const handleMemberSearch = (event) => {
    setMemberSearch(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await client.post('/tithes', form);
    setForm({ memberId: '', amount: '', givingDate: '' });
    const tithesRes = await client.get('/tithes');
    setTithes(tithesRes.data);
  };

  return (
    <div>
      <h1 className="page-title">Tithe</h1>
      <div className="section-card">
        <div className="section-card-header">
          <h2>Record new tithe</h2>
          <button className="close-button" type="button" onClick={() => setShowForm((visible) => !visible)}>
            {showForm ? 'Close' : 'Open'}
          </button>
        </div>
        {showForm ? (
          <form onSubmit={handleSubmit}>
            <div className="input-row">
              <div className="form-field">
                <label>Search member</label>
                <input
                  value={memberSearch}
                  onChange={handleMemberSearch}
                  placeholder="Name or last 3 digits"
                />
              </div>
            </div>
            <div className="input-row">
              <div className="form-field">
                <label>Name</label>
                <select value={form.memberId} onChange={handleChange('memberId')} required>
                  <option value="">Select member</option>
                  {[...filteredMembers].sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)).map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.firstName}{member.memberNumber ? ` (${member.memberNumber})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={handleChange('amount')}
                  required
                />
              </div>
              <div className="form-field">
                <label>Date</label>
                <input
                  type="date"
                  value={form.givingDate}
                  onChange={handleChange('givingDate')}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>
            <button className="button-primary" type="submit">Save tithe</button>
          </form>
        ) : (
          <p>Recording form is hidden. Click Open to show the form.</p>
        )}
      </div>
      <div className="section-card">
        <h2>Tithe history</h2>
        {Object.keys(groupedByMonth).length === 0 ? (
          <p>No tithe records yet.</p>
        ) : (
          Object.entries(groupedByMonth).map(([month, entries]) => {
            const monthTotal = entries.reduce((sum, item) => sum + Number(item.amount), 0);
            return (
              <div key={month} style={{ marginBottom: 16 }}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', padding: '12px 0' }}
                  onClick={() => toggleMonth(month)}
                >
                  <strong>{month}</strong>
                  <span>Total: {formatCurrency(monthTotal)}</span>
                </div>
                {openMonths[month] && (
                  <table className="table-list">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th>Recorded By</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((tithe, index) => (
                        <tr key={tithe.id}>
                          <td>{index + 1}</td>
                          <td>{tithe.firstName || 'Unknown'}</td>
                          <td>{formatCurrency(tithe.amount)}</td>
                          <td>{new Date(tithe.givingDate).toLocaleDateString()}</td>
                          <td style={{ fontSize: '0.9em', color: '#666' }}>{tithe.recordedByName || 'Admin'}</td>
                          <td style={{ position: 'relative' }}>
                            <button
                              type="button"
                              onClick={() => toggleActionMenu(tithe.id)}
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
                            {actionMenuId === tithe.id && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                backgroundColor: '#fff',
                                border: '1px solid #ddd',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
                                zIndex: 10,
                                width: 140
                              }}>
                                {role === 'pastor' && (
                                  <button
                                    type="button"
                                    onClick={() => handleEditTithe(tithe)}
                                    style={{
                                      display: 'block',
                                      width: '100%',
                                      textAlign: 'left',
                                      padding: '8px 10px',
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Edit
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTithe(tithe.id)}
                                  style={{
                                    display: 'block',
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '8px 10px',
                                    background: 'none',
                                    border: 'none',
                                    color: '#c0392b',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })
        )}
      </div>
      <div className="section-card">
        <h2>Quick Summary</h2>
        {Object.keys(groupedTithesByGroup).length === 0 ? (
          <p>No tithe records yet.</p>
        ) : (
          Object.entries(groupedTithesByGroup).map(([groupName, entries]) => (
            <div key={groupName} style={{ marginBottom: 16 }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', padding: '12px 0' }}
                onClick={() => toggleGroup(groupName)}
              >
                <strong>{groupName}</strong>
                <span>{entries.length} record{entries.length !== 1 ? 's' : ''}</span>
              </div>
              {openGroups[groupName] && (
                <table className="table-list">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Recorded By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((tithe, index) => (
                      <tr key={tithe.id}>
                        <td>{index + 1}</td>
                        <td>{tithe.memberName}</td>
                        <td>{new Date(tithe.givingDate).toLocaleDateString()}</td>
                        <td>{formatCurrency(tithe.amount)}</td>
                        <td style={{ fontSize: '0.9em', color: '#666' }}>{tithe.recordedByName || 'Admin'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))
        )}
      </div>
      {editingTithe && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal" style={{ background: '#fff', padding: 24, width: 440, borderRadius: 8, boxShadow: '0 0 20px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Edit Tithe</h3>
              <button type="button" onClick={() => setEditingTithe(null)} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="form-field" style={{ marginBottom: 12 }}>
                <label>Member</label>
                <select value={editingForm.memberId} onChange={handleEditChange('memberId')} required>
                  <option value="">Select member</option>
                  {[...members].sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)).map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.firstName}{member.memberNumber ? ` (${member.memberNumber})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field" style={{ marginBottom: 12 }}>
                <label>Amount</label>
                <input type="number" step="0.01" value={editingForm.amount} onChange={handleEditChange('amount')} required />
              </div>
              <div className="form-field" style={{ marginBottom: 12 }}>
                <label>Date</label>
                <input type="date" value={editingForm.givingDate} onChange={handleEditChange('givingDate')} required />
              </div>
              <div className="form-field" style={{ marginBottom: 12 }}>
                <label>Notes</label>
                <textarea rows="3" value={editingForm.notes} onChange={handleEditChange('notes')} />
              </div>
              {editError && <div className="alert" style={{ marginBottom: 12 }}>{editError}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="button-secondary" onClick={() => setEditingTithe(null)}>Cancel</button>
                <button type="submit" className="button-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
