import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api';
import { formatCurrency } from '../utils/currency';
import { titleCase } from '../utils/string';

function Dashboard() {
  const navigate = useNavigate();
  const role = (localStorage.getItem('role') || '').toLowerCase();
  const [members, setMembers] = useState([]);
  const [givings, setGivings] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const membersRes = await client.get('/members');
        setMembers(membersRes.data);
      } catch (err) {
        console.error('Failed to load members', err);
        setMembers([]);
      }

      try {
        const givingsRes = await client.get('/givings');
        setGivings(givingsRes.data);
      } catch (err) {
        // Elders may be forbidden from viewing givings; ignore error
        console.error('Failed to load givings (may be permission):', err);
        setGivings([]);
      }
    };
    loadData().catch(console.error);
  }, []);

  const totalAmount = givings.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalFemales = members.filter((m) => m.gender === 'female').length;
  const totalMales = members.filter((m) => m.gender === 'male').length;
  const titleSummary = ['Elder', 'Deacon', 'Deaconess', 'D.Leader'].reduce((summary, title) => {
    summary[title] = members.filter((member) => member.title === title);
    return summary;
  }, {});
  const isMember = role === 'member';
  
  const membersByGroup = members.reduce((groups, member) => {
    const groupName = titleCase(member.group || 'Unassigned');
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(member);
    return groups;
  }, {});

  const [selectedMember, setSelectedMember] = useState(null);
  const [memberTithes, setMemberTithes] = useState([]);
  const [memberProjects, setMemberProjects] = useState([]);
  const [loadingMemberDetails, setLoadingMemberDetails] = useState(false);

  const openMemberDetails = async (member) => {
    setSelectedMember(member);
    setLoadingMemberDetails(true);
    try {
      const [tithesRes, projectsRes] = await Promise.all([
        client.get('/tithes', { params: { memberId: member.id } }),
        client.get('/projects', { params: { memberId: member.id } })
      ]);
      setMemberTithes(tithesRes.data || []);
      setMemberProjects(projectsRes.data || []);
    } catch (err) {
      console.error('Failed to load member details', err);
      setMemberTithes([]);
      setMemberProjects([]);
    } finally {
      setLoadingMemberDetails(false);
    }
  };

  const closeMemberDetails = () => {
    setSelectedMember(null);
    setMemberTithes([]);
    setMemberProjects([]);
  };

  const toggleGroupExpand = (groupName) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      {isMember && (
        <div className="section-card" style={{ marginBottom: '20px' }}>
          <h2>Welcome to your member dashboard</h2>
          <p>Here you can see your group activity and access your personal details.</p>
        </div>
      )}
      {!isMember && (
        <>
          <div className="section-card">
            <p>Total members: {members.length}</p>
            <p>Total females: {totalFemales}</p>
            <p>Total males: {totalMales}</p>
            <p>Total elders: {titleSummary.Elder.length}</p>
            <p>Total deacons: {titleSummary.Deacon.length}</p>
            <p>Total deaconess: {titleSummary['Deaconess'].length}</p>
            <p>Total d.leaders: {titleSummary['D.Leader'].length}</p>
          </div>
          <div className="section-card">
            <h2>Leadership Summary</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              {Object.entries(titleSummary).map(([title, membersList]) => (
                <div key={title} style={{ padding: '14px', border: '1px solid #d1d5db', borderRadius: 12, background: '#f8fafc' }}>
                  <button
                    type="button"
                    onClick={() => toggleGroupExpand(title)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#1d4ed8', fontWeight: 700, textAlign: 'left' }}
                  >
                    {expandedGroups[title] ? '▼' : '▶'} {title}
                  </button>
                  <div style={{ marginTop: 8, fontSize: '0.95rem' }}>{membersList.length} member{membersList.length !== 1 ? 's' : ''}</div>
                  {expandedGroups[title] && (
                    <ul style={{ marginTop: 10, paddingLeft: 18 }}>
                      {membersList.map((member) => (
                        <li key={member.id} style={{ marginBottom: 4 }}>{member.firstName} {member.lastName || ''}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      <div className="section-card">
        <h2>Quick summary</h2>
        <h3>Members by Group</h3>
        {Object.keys(membersByGroup).length === 0 ? (
          <p>No members yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
            {Object.entries(membersByGroup).map(([groupName, memberNames]) => (
              <li 
                key={groupName} 
                style={{ marginBottom: '12px' }}
              >
                <div
                  onClick={() => toggleGroupExpand(groupName)}
                  style={{ marginBottom: expandedGroups[groupName] ? '8px' : 0, cursor: 'pointer' }}
                >
                  <strong style={{ color: '#007bff', textDecoration: 'underline' }}>
                    {expandedGroups[groupName] ? '▼' : '▶'} {groupName}:
                  </strong> {memberNames.length} member{memberNames.length !== 1 ? 's' : ''}
                </div>
                {expandedGroups[groupName] && (
                  <ul style={{ listStyle: 'disc', paddingLeft: '24px', margin: 0 }}>
                    {memberNames.map((m) => (
                      <li key={m.id} style={{ marginBottom: '6px', fontSize: '14px' }}>
                        {(role === 'elder' || role === 'secretary') ? (
                          <span style={{ color: '#111827' }}>{m.firstName}</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openMemberDetails(m)}
                            style={{ background: 'none', border: 'none', padding: 0, color: '#111827', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            {m.firstName}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {selectedMember && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal" style={{ background: '#fff', padding: 16, width: 700, borderRadius: 6, maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>{selectedMember.firstName}</h3>
                <p style={{ margin: '4px 0 0', color: '#555' }}>{selectedMember.memberNumber || 'No member number'}</p>
              </div>
              <button type="button" onClick={closeMemberDetails}>Close</button>
            </div>

            {loadingMemberDetails ? (
              <p>Loading...</p>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '6px' }}>
                    <strong>Phone</strong>
                    <p>{selectedMember.phone || 'N/A'}</p>
                  </div>
                  <div style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '6px' }}>
                    <strong>Group</strong>
                    <p>{selectedMember.group || 'Unassigned'}</p>
                  </div>
                  <div style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '6px' }}>
                    <strong>Gender</strong>
                    <p>{selectedMember.gender || 'Unknown'}</p>
                  </div>
                  <div style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '6px' }}>
                    <strong>Joined</strong>
                    <p>{selectedMember.joinedAt ? new Date(selectedMember.joinedAt).toLocaleDateString() : 'Unknown'}</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '6px', background: '#f8fafc' }}>
                    <strong>Total Tithe Contribution</strong>
                    <p style={{ margin: '8px 0 0' }}>{formatCurrency(memberTithes.reduce((sum, t) => sum + Number(t.amount), 0))}</p>
                  </div>
                  <div style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '6px', background: '#f8fafc' }}>
                    <strong>Total Project Contribution</strong>
                    <p style={{ margin: '8px 0 0' }}>{formatCurrency(memberProjects.reduce((sum, p) => sum + Number(p.amount), 0))}</p>
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <h4>Tithes</h4>
                  {memberTithes.length === 0 ? <p>No tithes found.</p> : (
                    <table className="table-list">
                      <thead>
                        <tr><th>Date</th><th>Amount</th><th>Notes</th></tr>
                      </thead>
                      <tbody>
                        {memberTithes.map((t) => (
                          <tr key={t.id}><td>{t.givingDate}</td><td>{formatCurrency(t.amount)}</td><td>{t.notes || '-'}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div>
                  <h4>Projects</h4>
                  {memberProjects.length === 0 ? <p>No projects found.</p> : (
                    <table className="table-list">
                      <thead>
                        <tr><th>Date</th><th>Project</th><th>Amount</th></tr>
                      </thead>
                      <tbody>
                        {memberProjects.map((p) => (
                          <tr key={p.id}><td>{p.date}</td><td>{p.projectName}</td><td>{formatCurrency(p.amount)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
