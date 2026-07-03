import { useEffect, useMemo, useState } from 'react';
import client from '../api';
import { formatCurrency } from '../utils/currency';

function Projects() {
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ projectName: '', memberId: '', amount: '', date: '' });
  const [showForm, setShowForm] = useState(true);
  const [openProjects, setOpenProjects] = useState({});
  const [actionMenuId, setActionMenuId] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [editingForm, setEditingForm] = useState({ projectName: '', memberId: '', amount: '', date: '' });
  const [editError, setEditError] = useState('');
  const role = localStorage.getItem('role') || '';

  const formatRecordedBy = (record) => {
    const name = record?.recordedByName || 'Admin';
    if (role === 'pastor' && record?.recordedByMemberNumber) {
      return `${name} (${record.recordedByMemberNumber})`;
    }
    return name;
  };

  useEffect(() => {
    const loadData = async () => {
      const [membersRes, projectsRes] = await Promise.all([
        client.get('/members'),
        client.get('/projects')
      ]);
      setMembers(membersRes.data);
      setProjects(projectsRes.data);
    };
    loadData().catch(console.error);
  }, []);

  const handleChange = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
  };

  const groupedProjects = useMemo(() => {
    const grouped = {};
    projects.forEach((project) => {
      const key = project.projectName || 'Unknown project';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(project);
    });
    return grouped;
  }, [projects]);

  const toggleProject = (projectName) => {
    setOpenProjects((current) => ({ ...current, [projectName]: !current[projectName] }));
    setActionMenuId(null);
  };

  const toggleActionMenu = (id) => {
    setActionMenuId((current) => (current === id ? null : id));
  };

  const handleEditProject = (project) => {
    if (role !== 'pastor') return;
    setEditingProject(project);
    setEditingForm({
      projectName: project.projectName || '',
      memberId: project.memberId || '',
      amount: String(project.amount || ''),
      date: project.date || ''
    });
    setEditError('');
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Delete this project record?')) return;
    await client.delete(`/projects/${id}`);
    setActionMenuId(null);
    const projectsRes = await client.get('/projects');
    setProjects(projectsRes.data);
  };

  const handleEditChange = (field) => (event) => {
    setEditingForm({ ...editingForm, [field]: event.target.value });
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editingProject) return;

    if (!editingForm.projectName || !editingForm.memberId || !editingForm.amount || !editingForm.date) {
      setEditError('All fields are required.');
      return;
    }

    const amount = Number(editingForm.amount);
    if (Number.isNaN(amount)) {
      setEditError('Amount must be a valid number.');
      return;
    }

    try {
      await client.put(`/projects/${editingProject.id}`, {
        projectName: editingForm.projectName,
        memberId: Number(editingForm.memberId),
        amount,
        date: editingForm.date
      });
      const projectsRes = await client.get('/projects');
      setProjects(projectsRes.data);
      setEditingProject(null);
      setEditingForm({ projectName: '', memberId: '', amount: '', date: '' });
      setEditError('');
    } catch (err) {
      setEditError('Failed to save project details.');
      console.error(err);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await client.post('/projects', form);
    setForm({ projectName: '', memberId: '', amount: '', date: '' });
    const projectsRes = await client.get('/projects');
    setProjects(projectsRes.data);
  };

  return (
    <div>
      <h1 className="page-title">Projects</h1>
      <div className="section-card">
        <div className="section-card-header">
          <h2>Record new project</h2>
          <button className="close-button" type="button" onClick={() => setShowForm((visible) => !visible)}>
            {showForm ? 'Close' : 'Open'}
          </button>
        </div>
        {showForm ? (
          <form onSubmit={handleSubmit}>
            <div className="input-row">
              <div className="form-field">
                <label>Project name</label>
                <input value={form.projectName} onChange={handleChange('projectName')} required />
              </div>
              <div className="form-field">
                <label>Member</label>
                <select value={form.memberId} onChange={handleChange('memberId')} required>
                  <option value="">Select member</option>
                  {[...members].sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)).map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.firstName}{member.memberNumber ? ` (${member.memberNumber})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="input-row">
              <div className="form-field">
                <label>Amount</label>
                <input type="number" step="0.01" value={form.amount} onChange={handleChange('amount')} required />
              </div>
              <div className="form-field">
                <label>Date</label>
                <input type="date" value={form.date} onChange={handleChange('date')} max={new Date().toISOString().split('T')[0]} required />
              </div>
            </div>
            <button className="button-primary" type="submit">Save project</button>
          </form>
        ) : (
          <p>Project form is hidden. Click Open to show the form.</p>
        )}
      </div>
      {editingProject && (
        <div className="section-card edit-modal">
          <h2>Edit project record</h2>
          <form onSubmit={handleEditSubmit}>
            <div className="input-row">
              <div className="form-field">
                <label>Project name</label>
                <input value={editingForm.projectName} onChange={handleEditChange('projectName')} required />
              </div>
              <div className="form-field">
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
            </div>
            <div className="input-row">
              <div className="form-field">
                <label>Amount</label>
                <input type="number" step="0.01" value={editingForm.amount} onChange={handleEditChange('amount')} required />
              </div>
              <div className="form-field">
                <label>Date</label>
                <input type="date" value={editingForm.date} onChange={handleEditChange('date')} max={new Date().toISOString().split('T')[0]} required />
              </div>
            </div>
            {editError && <p className="error-text">{editError}</p>}
            <div className="button-row">
              <button type="submit" className="button-primary">Save changes</button>
              <button type="button" className="button-secondary" onClick={() => setEditingProject(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
      {role !== 'secretary' && (
        <div className="section-card">
          <h2>Project records</h2>
          {Object.entries(groupedProjects).length === 0 ? (
            <p>No project records yet.</p>
          ) : (
            Object.entries(groupedProjects).map(([projectName, entries], projectIndex) => {
              const projectTotal = entries.reduce((sum, item) => sum + Number(item.amount), 0);
              return (
                <div key={projectName} style={{ marginBottom: 16 }}>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '12px 0' }}
                    onClick={() => toggleProject(projectName)}
                  >
                    <div>
                      <strong>{projectName}</strong>
                      <div style={{ color: '#6b7280', fontSize: '0.95rem' }}>{entries.length} member(s)</div>
                    </div>
                    <span>{formatCurrency(projectTotal)}</span>
                  </div>
                  {openProjects[projectName] && (
                    <table className="table-list">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Member</th>
                          <th>Amount</th>
                          <th>Date</th>
                          <th>Recorded By</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((project, index) => (
                          <tr key={project.id}>
                            <td>{index + 1}</td>
                            <td>{project.memberName || 'Unknown'}</td>
                            <td>{formatCurrency(project.amount)}</td>
                            <td>{new Date(project.date).toLocaleDateString()}</td>
                            <td style={{ fontSize: '0.9em', color: '#666' }}>{formatRecordedBy(project)}</td>
                            <td style={{ position: 'relative' }}>
                              <button
                                type="button"
                                className="action-button"
                                onClick={() => toggleActionMenu(project.id)}
                              >
                                Action
                              </button>
                              {actionMenuId === project.id && (
                                <div className="action-menu">
                                  {role === 'pastor' && (
                                    <button type="button" onClick={() => handleEditProject(project)}>Edit</button>
                                  )}
                                  <button type="button" onClick={() => handleDeleteProject(project.id)}>Delete</button>
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
      )}
    </div>
  );
}

export default Projects;
