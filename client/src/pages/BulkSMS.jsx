import { useEffect, useState } from 'react';
import client from '../api';
import { titleCase } from '../utils/string';

function BulkSMS() {
  const [members, setMembers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedTitles, setSelectedTitles] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const role = localStorage.getItem('role') || '';

  useEffect(() => {
    if (role !== 'pastor') return;
    const loadMembers = async () => {
      try {
        const response = await client.get('/members');
        setMembers(response.data);
      } catch (err) {
        console.error('Could not load members', err);
      }
    };
    loadMembers();
  }, [role]);

  const handleToggleMember = (memberId) => {
    if (selectAll) {
      setSelectAll(false);
    }
    setSelectedIds((current) => {
      if (current.includes(memberId)) {
        return current.filter((id) => id !== memberId);
      }
      return [...current, memberId];
    });
  };

  const handleToggleSelectAll = () => {
    if (selectAll) {
      setSelectAll(false);
      setSelectedIds([]);
      setSelectedTitles([]);
      setSelectedGroups([]);
    } else {
      setSelectAll(true);
      setSelectedIds([]);
      setSelectedTitles([]);
      setSelectedGroups([]);
    }
  };

  const handleToggleTitle = (title) => {
    setSelectedTitles((current) => {
      if (current.includes(title)) {
        return current.filter((item) => item !== title);
      }
      return [...current, title];
    });
    setSelectAll(false);
  };

  const handleToggleGroup = (groupName) => {
    setSelectedGroups((current) => {
      if (current.includes(groupName)) {
        return current.filter((item) => item !== groupName);
      }
      return [...current, groupName];
    });
    setSelectAll(false);
  };

  const handleMessageChange = (event) => {
    setMessage(event.target.value);
    setError('');
    setStatus('');
  };

  const handleSend = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');

    if (!message.trim()) {
      setError('Please enter a message to send.');
      return;
    }

    if (!selectAll && selectedIds.length === 0 && selectedTitles.length === 0 && selectedGroups.length === 0) {
      setError('Select members, titles, groups, or choose All Members before sending.');
      return;
    }

    const recipientIds = selectAll
      ? []
      : Array.from(new Set([
          ...selectedIds,
          ...members.filter((member) => selectedTitles.includes(member.title)).map((member) => member.id),
          ...members.filter((member) => selectedGroups.includes(titleCase(member.group || 'All'))).map((member) => member.id)
        ]));

    try {
      const payload = {
        all: selectAll,
        memberIds: selectAll ? [] : recipientIds,
        message: message.trim()
      };
      const response = await client.post('/bulk-sms', payload);
      setStatus(`Message sent to ${response.data.count} member(s).`);
      setMessage('');
      setSelectedIds([]);
      setSelectedTitles([]);
      setSelectedGroups([]);
      setSelectAll(false);
    } catch (err) {
      const messageText = err.response?.data?.error || 'Failed to send SMS.';
      setError(messageText);
      console.error(err);
    }
  };

  if (role !== 'pastor') {
    return <div className="section-card"><h1>Bulk SMS</h1><p>You are not authorized to access this page.</p></div>;
  }

  return (
    <div>
      <h1 className="page-title">Bulk SMS</h1>
      <div className="section-card">
        <h2>Send message to members</h2>
        <p>Send a message to all members or choose selected members below.</p>
        <form onSubmit={handleSend}>
          <div className="form-field">
            <label>Message</label>
            <textarea
              rows="6"
              value={message}
              onChange={handleMessageChange}
              placeholder="Type your message here..."
              required
            />
          </div>
          <div className="form-field" style={{ alignItems: 'center', display: 'flex', gap: 12 }}>
            <input
              id="selectAllMembers"
              type="checkbox"
              checked={selectAll}
              onChange={handleToggleSelectAll}
            />
            <label htmlFor="selectAllMembers">Send to all members</label>
          </div>
          <div className="form-field">
            <label>Titles</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
              {['Elder', 'Deacon', 'Deaconess', 'D.Leader'].map((title) => (
                <label key={title} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={selectedTitles.includes(title)}
                    onChange={() => handleToggleTitle(title)}
                  />
                  <span>{title}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="form-field">
            <label>Groups</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
              {Array.from(new Set(members.map((member) => titleCase(member.group || 'All')))).sort().map((groupName) => (
                <label key={groupName} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(groupName)}
                    onChange={() => handleToggleGroup(groupName)}
                  />
                  <span>{groupName}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="form-field">
            <label>Members</label>
            <div className="member-list" style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #d1d5db', borderRadius: 6, padding: 10 }}>
              {members.length === 0 ? (
                <p>No members available.</p>
              ) : (
                [...members].sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)).map((member) => (
                  <label key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <input
                      type="checkbox"
                      checked={selectAll || selectedIds.includes(member.id)}
                      onChange={() => handleToggleMember(member.id)}
                    />
                    <span>{member.firstName} {member.lastName}{member.memberNumber ? ` (${member.memberNumber})` : ''} - {member.phone || 'No phone'}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          {error && <div className="alert" style={{ marginBottom: 12 }}>{error}</div>}
          {status && <div className="success-text" style={{ marginBottom: 12 }}>{status}</div>}
          <button className="button-primary" type="submit">Send Message</button>
        </form>
      </div>
    </div>
  );
}

export default BulkSMS;
