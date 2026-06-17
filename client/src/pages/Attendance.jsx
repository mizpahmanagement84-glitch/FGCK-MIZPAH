import { useEffect, useState } from 'react';
import client from '../api';

function Attendance() {
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({ date: '', category: 'Adults', total: '' });
  const [showForm, setShowForm] = useState(true);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [expandedMonths, setExpandedMonths] = useState({});
  const role = localStorage.getItem('role');

  const formatRecordedBy = (record) => {
    const name = record?.recordedByName || 'Admin';
    if (role === 'pastor' && record?.recordedByMemberNumber) {
      return `${name} (${record.recordedByMemberNumber})`;
    }
    return name;
  };

  useEffect(() => {
    const loadAttendance = async () => {
      const response = await client.get('/attendance');
      setRecords(response.data);
    };
    loadAttendance().catch(console.error);
  }, []);

  const handleChange = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await client.post('/attendance', form);
    setForm({ date: '', category: 'Adults', total: '' });
    const response = await client.get('/attendance');
    setRecords(response.data);
  };

  const toggleActionMenu = (id) => {
    setActionMenuId((current) => (current === id ? null : id));
  };

  const handleEdit = async (record) => {
    const date = window.prompt('Enter date', record.date);
    if (date === null) return;

    const category = window.prompt('Enter category (Adults, Teens, Sunday school)', record.category);
    if (category === null) return;

    const totalInput = window.prompt('Enter total', record.total);
    if (totalInput === null) return;
    const total = Number(totalInput);
    if (Number.isNaN(total)) return window.alert('Enter a valid total.');

    await client.put(`/attendance/${record.id}`, { date, category, total });
    setActionMenuId(null);
    const response = await client.get('/attendance');
    setRecords(response.data);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this attendance record?')) return;
    await client.delete(`/attendance/${id}`);
    setActionMenuId(null);
    const response = await client.get('/attendance');
    setRecords(response.data);
  };

  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
  const attendanceByMonth = records
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .reduce((groups, record) => {
      const monthLabel = record.date ? monthFormatter.format(new Date(record.date)) : 'Unknown month';
      if (!groups[monthLabel]) {
        groups[monthLabel] = {};
      }

      const dateKey = record.date || 'Unknown date';
      if (!groups[monthLabel][dateKey]) {
        groups[monthLabel][dateKey] = {
          date: dateKey,
          adults: 0,
          teens: 0,
          sundaySchool: 0,
          total: 0,
          records: []
        };
      }

      const group = groups[monthLabel][dateKey];
      const value = Number(record.total) || 0;
      group.total += value;
      if (record.category === 'Adults') group.adults += value;
      if (record.category === 'Teens') group.teens += value;
      if (record.category === 'Sunday school') group.sundaySchool += value;
      group.records.push(record);
      return groups;
    }, {});
  const monthLabels = Object.keys(attendanceByMonth);

  const handleEditDateGroup = async (group) => {
    const adultsInput = window.prompt('Adults total', group.adults);
    if (adultsInput === null) return;
    const teensInput = window.prompt('Teens total', group.teens);
    if (teensInput === null) return;
    const sundaySchoolInput = window.prompt('Sunday school total', group.sundaySchool);
    if (sundaySchoolInput === null) return;

    const adults = Number(adultsInput);
    const teens = Number(teensInput);
    const sundaySchool = Number(sundaySchoolInput);
    if (Number.isNaN(adults) || Number.isNaN(teens) || Number.isNaN(sundaySchool)) {
      return window.alert('Enter valid numbers for all categories.');
    }

    const updateOrCreateCategory = async (category, value) => {
      const existing = group.records.find((item) => item.category === category);
      if (existing) {
        await client.put(`/attendance/${existing.id}`, { date: group.date, category, total: value });
      } else if (value > 0) {
        await client.post('/attendance', { date: group.date, category, total: value });
      }
    };

    await updateOrCreateCategory('Adults', adults);
    await updateOrCreateCategory('Teens', teens);
    await updateOrCreateCategory('Sunday school', sundaySchool);

    setActionMenuId(null);
    const response = await client.get('/attendance');
    setRecords(response.data);
  };

  const handleDeleteDateGroup = async (group) => {
    if (!window.confirm(`Delete all attendance records for ${group.date}?`)) return;
    await Promise.all(group.records.map((record) => client.delete(`/attendance/${record.id}`)));
    setActionMenuId(null);
    const response = await client.get('/attendance');
    setRecords(response.data);
  };

  const formatDisplayDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const toggleMonth = (monthLabel) => {
    setExpandedMonths((current) => ({
      ...current,
      [monthLabel]: !current[monthLabel]
    }));
  };

  return (
    <div>
      <h1 className="page-title">Attendance</h1>
      <div className="section-card">
        <div className="section-card-header">
          <h2>Record attendance</h2>
          <button className="close-button" type="button" onClick={() => setShowForm((visible) => !visible)}>
            {showForm ? 'Close' : 'Open'}
          </button>
        </div>
        {showForm ? (
          <form onSubmit={handleSubmit}>
            <div className="input-row">
              <div className="form-field">
                <label>Date</label>
                <input type="date" value={form.date} onChange={handleChange('date')} max={getTodayString()} required />
              </div>
              <div className="form-field">
                <label>Category</label>
                <select value={form.category} onChange={handleChange('category')}>
                  <option value="Adults">Adults</option>
                  <option value="Teens">Teens</option>
                  <option value="Sunday school">Sunday school</option>
                </select>
              </div>
              <div className="form-field">
                <label>Total</label>
                <input type="number" value={form.total} onChange={handleChange('total')} required />
              </div>
            </div>
            <button className="button-primary" type="submit">Save attendance</button>
          </form>
        ) : (
          <p>Attendance form is hidden. Click Open to show the form.</p>
        )}
      </div>
      <div className="section-card">
        <h2>Attendance records</h2>
        {monthLabels.length === 0 ? (
          <p>No attendance records yet.</p>
        ) : (
          monthLabels.map((monthLabel) => {
            const monthGroups = Object.values(attendanceByMonth[monthLabel]);
            const monthTotal = monthGroups.reduce((sum, group) => sum + group.total, 0);

            return (
              <div key={monthLabel} className="attendance-month-group">
                <div
                  className="section-card-header"
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleMonth(monthLabel)}
                  onKeyPress={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') toggleMonth(monthLabel);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <h3>{monthLabel}</h3>
                  <span className="summary-text">Total: {monthTotal}</span>
                  <span className="summary-text">{expandedMonths[monthLabel] ? '▲' : '▼'}</span>
                </div>
                {expandedMonths[monthLabel] && (
                  <table className="table-list">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Adults</th>
                        <th>Teens</th>
                        <th>Sunday school</th>
                        <th>Total</th>
                        <th>Recorded By</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthGroups.map((group) => (
                        <tr key={group.date}>
                          <td>{formatDisplayDate(group.date)}</td>
                          <td>{group.adults || ''}</td>
                          <td>{group.teens || ''}</td>
                          <td>{group.sundaySchool || ''}</td>
                          <td>{group.total}</td>
                          <td style={{ fontSize: '0.9em', color: '#666' }}>{formatRecordedBy(group.records[0])}</td>
                          <td style={{ position: 'relative' }}>
                            <button
                              type="button"
                              className="action-button"
                              onClick={() => toggleActionMenu(group.date)}
                              style={{ backgroundColor: 'red', color: '#fff' }}
                            >
                              Action
                            </button>
                            {actionMenuId === group.date && (
                              <div className="action-menu">
                                <button type="button" onClick={() => handleEditDateGroup(group)}>Edit</button>
                                <button type="button" onClick={() => handleDeleteDateGroup(group)}>Delete</button>
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
    </div>
  );
}

export default Attendance;
