import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import client from '../api';
import { titleCase } from '../utils/string';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

function Members() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ firstName: '', phone: '', group: 'All', title: '', joinedAt: '', gender: 'male' });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(true);
  const [actionMenuId, setActionMenuId] = useState(null);
  const groupFilter = searchParams.get('group');
  const role = localStorage.getItem('role') || 'pastor';

  const loadMembers = async () => {
    const response = await client.get('/members', { params: { search } });
    setMembers(response.data);
  };

  useEffect(() => {
    if (role === 'member') {
      navigate('/dashboard');
      return;
    }
    loadMembers().catch(console.error);
  }, [role, navigate]);

  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const handleChange = (field) => (event) => {
    let value = event.target.value;
    if (field === 'firstName' && value) {
      value = titleCase(value);
    }
    if (field === 'group' && value) {
      value = titleCase(value);
    }
    setForm({ ...form, [field]: value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (editingId) {
      await client.put(`/members/${editingId}`, form);
      setEditingId(null);
    } else {
      await client.post('/members', form);
    }
    setForm({ firstName: '', phone: '', group: 'All', joinedAt: '', gender: 'male' });
    loadMembers();
  };

  const handleEdit = (member) => {
    setEditingId(member.id);
    setForm({
      firstName: member.firstName,
      phone: member.phone,
      group: titleCase(member.group || 'All'),
      title: member.title || '',
      joinedAt: member.joinedAt ? member.joinedAt.split('T')[0] : '',
      gender: member.gender || 'male'
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this member?')) return;
    await client.delete(`/members/${id}`);
    loadMembers();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString();
  };

  const handleGenerateCard = async (member) => {
    if (!member || (!member.firstName && !member.memberNumber && !member.phone && !member.joinedAt)) {
      window.alert('Please select a valid member before generating a card.');
      return;
    }

    const origin = window.location.origin;
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '85mm';
    container.style.height = '55mm';
    container.style.minWidth = '85mm';
    container.style.minHeight = '55mm';
    container.style.padding = '0';
    container.style.margin = '0';
    container.style.overflow = 'hidden';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';

    const style = document.createElement('style');
    style.textContent = `
      .card-page {
        width: 85mm;
        height: 55mm;
        box-sizing: border-box;
        padding: 0;
        margin: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #E1F2F7;
        border: 2px double #000;
        border-radius: 8px;
      }
      .card {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        padding: 0.15cm 0.4cm 0.25cm;
        box-sizing: border-box;
      }
      .card-front {
        padding-top: 0.1cm;
      }
      .member-bottom {
        margin-top: auto;
        width: 100%;
      }
      .member-line {
        font-size: 10px;
        margin-top: 8px;
        display: flex;
        justify-content: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .member-line span {
        display: inline-block;
      }
      .logo img {
        width: 56px;
        height: 56px;
        object-fit: contain;
        margin-bottom: 6px;
      }
      .title,
      .main-title,
      .member-number,
      .member-name,
      .details,
      .back-title {
        text-align: center;
        margin: 1px 0;
        line-height: 1.2;
      }
      .title {
        font-size: 13px;
        font-weight: 700;
      }
      .main-title {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
        margin: 4px 0;
      }
      .member-number {
        font-size: 13px;
        font-weight: 700;
        margin-top: 10px;
      }
      .member-name {
        font-size: 13px;
        font-weight: 600;
      }
      .details {
        font-size: 10px;
        margin-top: 8px;
      }
      .back-title {
        font-size: 14px;
        font-weight: 700;
        margin-bottom: 18px;
      }
      .stamp {
        width: 140px;
        height: auto;
        margin-top: 20px;
      }
    `;

    const logoSrc = `${origin}/logo.png`;
    const memberFullName = `${member.firstName || ''}${member.lastName ? ` ${member.lastName}` : ''}`.trim() || 'Member';

    const front = document.createElement('div');
    front.className = 'card-page';
    front.innerHTML = `
      <div class="card card-front">
        <div class="logo"><img src="${logoSrc}" alt="Logo" /></div>
        <div class="title">FULL GOSPEL CHURCHES OF KENYA</div>
        <div class="title">MIZPAH BRANCH</div>
        <div class="main-title">MEMBERSHIP CARD</div>
        <div class="member-number">${member.memberNumber || ''}</div>
        <div class="member-name">${memberFullName}</div>
        <div class="member-bottom">
          <div class="member-line"><span>Group: ${titleCase(member.group || 'All')}</span><span>Date joined: ${formatDate(member.joinedAt) || 'N/A'}</span></div>
        </div>
      </div>
    `;

    const back = document.createElement('div');
    back.className = 'card-page';
    back.innerHTML = `
      <div class="card">
        <div class="back-title">Resident Pastor: Robert N. Waweru</div>
        <img class="stamp" src="${origin}/stamp.jpeg" alt="Stamp" />
      </div>
    `;

    container.appendChild(style);
    container.appendChild(front);
    container.appendChild(back);
    document.body.appendChild(container);

    const waitForImages = async () => {
      const images = Array.from(container.querySelectorAll('img'));
      await Promise.all(images.map((img) => new Promise((resolve) => {
        if (img.complete && img.naturalWidth !== 0) {
          resolve();
        } else {
          img.onload = img.onerror = resolve;
        }
      })));
    };

    await waitForImages();

    try {
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pages = [front, back];
      const memberName = `${member.firstName || ''}${member.lastName ? ` ${member.lastName}` : ''}`.trim() || member.memberNumber || 'member';
      const fileName = `membership-card-${memberName.replace(/\s+/g, '_')}.pdf`;
      const margin = 20;
      const cardWidth = 85;
      const cardHeight = 55;
      const spacing = 20;
      const x = margin;
      const firstY = margin;
      const secondY = margin + cardHeight + spacing;

      for (let i = 0; i < pages.length; i += 1) {
        const canvas = await html2canvas(pages[i], {
          scale: 3,
          backgroundColor: null,
          useCORS: true,
          scrollX: 0,
          scrollY: 0,
          windowWidth: pages[i].scrollWidth,
          windowHeight: pages[i].scrollHeight
        });
        const imgData = canvas.toDataURL('image/png');
        const y = i === 0 ? firstY : secondY;
        pdf.addImage(imgData, 'PNG', x, y, cardWidth, cardHeight);
      }

      pdf.save(fileName);
    } catch (error) {
      window.alert('Failed to generate PDF card.');
      console.error(error);
    } finally {
      document.body.removeChild(container);
      setActionMenuId(null);
    }
  };

  const toggleActionMenu = (id) => {
    setActionMenuId((current) => (current === id ? null : id));
  };

  const handleSearch = (event) => {
    setSearch(event.target.value);
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    loadMembers();
  };

  const clearGroupFilter = () => {
    setSearchParams({});
  };

  // Filter members based on search and group query parameter
  const filteredMembers = members.filter((member) => {
    const matchesSearch = !search || [member.firstName, member.lastName, member.title, member.phone].some((value) =>
      String(value || '').toLowerCase().includes(search.toLowerCase())
    );
    const matchesGroup = !groupFilter || titleCase(member.group || 'Unassigned') === groupFilter;
    return matchesSearch && matchesGroup;
  });

  return (
    <div>
      <h1 className="page-title">Members</h1>
      {groupFilter && (
        <div className="section-card" style={{ backgroundColor: '#e3f2fd', borderLeft: '4px solid #2196f3', padding: '12px' }}>
          <p>
            Filtering by group: <strong>{groupFilter}</strong>
            <button 
              type="button" 
              className="button-secondary" 
              onClick={clearGroupFilter}
              style={{ marginLeft: '12px' }}
            >
              Clear filter
            </button>
          </p>
        </div>
      )}
      <div className="section-card">
        <form onSubmit={handleSearchSubmit} className="search-row">
          <input value={search} onChange={handleSearch} placeholder="Search members" />
          <button type="submit" className="button-secondary">Search</button>
          <button type="button" className="button-secondary" onClick={() => { setSearch(''); loadMembers(); }}>Clear</button>
        </form>
      </div>
      {role !== 'member' && (
        <div className="section-card">
          <div className="section-card-header">
            <h2>{editingId ? 'Edit member' : 'Add member'}</h2>
            <button className="close-button" type="button" onClick={() => setShowForm((visible) => !visible)}>
              {showForm ? 'Close' : 'Open'}
            </button>
          </div>
          {showForm ? (
            <form onSubmit={handleSubmit}>
              <div className="input-row">
                <div className="form-field">
                  <label>First name</label>
                  <input value={form.firstName} onChange={handleChange('firstName')} required />
                </div>
                <div className="form-field">
                  <label>Phone</label>
                  <input value={form.phone} onChange={handleChange('phone')} />
                </div>
              </div>
              <div className="input-row">
                <div className="form-field">
                  <label>Group</label>
                  <select value={form.group} onChange={handleChange('group')}>
                    <option value="Amani">Amani</option>
                    <option value="Jerusalem">Jerusalem</option>
                    <option value="Warriors Of Christ">Warriors Of Christ</option>
                    <option value="Blessed Zion">Blessed Zion</option>
                    <option value="Macedonia">Macedonia</option>
                    <option value="All">All</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Title</label>
                  <select value={form.title} onChange={handleChange('title')}>
                    <option value="">None</option>
                    <option value="Pastor">Pastor</option>
                    <option value="Mrs Pastor">Mrs Pastor</option>
                    <option value="Elder">Elder</option>
                    <option value="Deacon">Deacon</option>
                    <option value="Deaconess">Deaconess</option>
                    <option value="D.Leader">D.Leader</option>
                  </select>
                </div>
              </div>
              <div className="input-row">
                <div className="form-field">
                  <label>Date joined</label>
                  <input type="date" value={form.joinedAt} onChange={handleChange('joinedAt')} max={getTodayString()} required />
                </div>
              </div>
              <div className="form-field">
                <label>Gender</label>
                <select value={form.gender} onChange={handleChange('gender')}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <button className="button-primary" type="submit">{editingId ? 'Update member' : 'Add member'}</button>
            </form>
          ) : (
            <p>Member form is hidden. Click Open to show the form.</p>
          )}
        </div>
      )}
      <div className="section-card">
        <h2>Member list</h2>
        {role === 'member' ? (
          <div style={{ display: 'grid', gap: '16px' }}>
            {filteredMembers
              .sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''))
              .map((member, index) => (
                <div key={member.id} className="section-card" style={{ padding: '16px' }}>
                  <p><strong>#{index + 1}</strong></p>
                  <p><strong>Member #:</strong> {member.memberNumber}</p>
                  <p><strong>Name:</strong> {member.firstName}</p>
                  <p><strong>Title:</strong> {member.title || 'None'}</p>
                  <p><strong>Phone:</strong> {member.phone || 'N/A'}</p>
                  <p><strong>Group:</strong> {titleCase(member.group || 'All')}</p>
                  <p><strong>Joined:</strong> {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'N/A'}</p>
                </div>
              ))}
          </div>
        ) : (
          <table className="table-list">
            <thead>
              <tr>
                <th>#</th>
                <th>Member #</th>
                <th>Name</th>
                <th>Title</th>
                <th>Phone</th>
                <th>Group</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers
                .sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''))
                .map((member, index) => (
                  <tr key={member.id}>
                    <td>{index + 1}</td>
                    <td>{member.memberNumber}</td>
                    <td>{member.firstName}</td>
                    <td>{member.title || 'None'}</td>
                    <td>{member.phone}</td>
                    <td>{titleCase(member.group || 'All')}</td>
                    <td>{new Date(member.joinedAt).toLocaleDateString()}</td>
                    <td style={{ position: 'relative' }}>
                      <button
                        type="button"
                        className="action-button"
                        onClick={() => toggleActionMenu(member.id)}
                      >
                        Action
                      </button>
                      {actionMenuId === member.id && (
                        <div className="action-menu">
                          {role === 'pastor' && (
                            <>
                              <button type="button" onClick={() => { handleEdit(member); setActionMenuId(null); }}>Edit</button>
                              <button type="button" onClick={() => { handleDelete(member.id); setActionMenuId(null); }}>Delete</button>
                            </>
                          )}
                          <button type="button" onClick={() => handleGenerateCard(member)}>Generate card</button>
                        </div>
                      )}
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Members;
