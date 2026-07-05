import { useEffect, useState } from 'react';
import api from '../api';
import { formatCurrency } from '../utils/currency';

export default function Welfare() {
  const [members, setMembers] = useState([]);
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [beneficiarySearch, setBeneficiarySearch] = useState('');
  const [contributorId, setContributorId] = useState('');
  const [contributorSearch, setContributorSearch] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [entries, setEntries] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(false);
  const role = localStorage.getItem('role') || 'pastor';
  const isMember = role === 'member';

  useEffect(() => {
    fetchMembers();
    fetchEntries();
  }, []);

  async function fetchMembers() {
    try {
      const res = await api.get('/members');
      setMembers(res.data || []);
    } catch (e) {
      console.error('Failed to load members', e);
    }
  }

  async function fetchEntries() {
    try {
      const res = await api.get('/welfare');
      setEntries(res.data || []);
    } catch (e) {
      console.error('Failed to load welfare entries', e);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/welfare', {
        beneficiaryId: Number(beneficiaryId),
        memberId: contributorId ? Number(contributorId) : null,
        amount: Number(amount),
        date
      });
      setBeneficiaryId('');
      setBeneficiarySearch('');
      setContributorId('');
      setContributorSearch('');
      setAmount('');
      setDate(new Date().toISOString().slice(0, 10));
      await fetchEntries();
    } catch (err) {
      console.error('Submit welfare failed', err);
    } finally {
      setLoading(false);
    }
  }

  const byBeneficiary = entries.reduce((acc, cur) => {
    const beneficiaryName = cur.beneficiaryName || cur.beneficiary || 'Unknown';
    acc[beneficiaryName] = acc[beneficiaryName] || { name: beneficiaryName, total: 0, items: [] };
    acc[beneficiaryName].total += Number(cur.amount || 0);
    acc[beneficiaryName].items.push(cur);
    return acc;
  }, {});

  const beneficiaries = Object.values(byBeneficiary);

  const beneficiaryOptions = members.map((m) => ({
    id: m.id,
    label: `${m.firstName} ${m.lastName}${m.memberNumber ? ` (${m.memberNumber})` : ''}`
  }));

  const contributorOptions = beneficiaryOptions;

  const beneficiaryQuery = beneficiarySearch.trim().toLowerCase();
  const contributorQuery = contributorSearch.trim().toLowerCase();

  const filteredBeneficiaries = beneficiaryOptions.filter((option) => {
    if (!beneficiaryQuery) return true;
    return option.label.toLowerCase().includes(beneficiaryQuery);
  });

  const filteredContributors = contributorOptions.filter((option) => {
    if (!contributorQuery) return true;
    return option.label.toLowerCase().includes(contributorQuery);
  });

  return (
    <div>
      <h2>Welfare</h2>

      {!isMember && (
        <div className="section-card">
          <h3>Record Welfare Contribution</h3>
          <form onSubmit={handleSubmit}>
            <div className="input-row">
              <div className="form-field">
                <label>Search member</label>
                <input
                  type="text"
                  placeholder="Type member name or number"
                  value={beneficiarySearch}
                  onChange={(e) => setBeneficiarySearch(e.target.value)}
                />
                <select value={beneficiaryId} onChange={(e) => setBeneficiaryId(e.target.value)} required>
                  <option value="">-- select beneficiary --</option>
                  {[...filteredBeneficiaries].sort((a, b) => a.label.localeCompare(b.label)).map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Search member</label>
                <input
                  type="text"
                  placeholder="Type member name or number"
                  value={contributorSearch}
                  onChange={(e) => setContributorSearch(e.target.value)}
                />
                <select value={contributorId} onChange={(e) => setContributorId(e.target.value)}>
                  <option value="">-- select contributor --</option>
                  {[...filteredContributors].sort((a, b) => a.label.localeCompare(b.label)).map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="input-row">
              <div className="form-field">
                <label>Amount</label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  required
                />
              </div>
              <div className="form-field">
                <label>Date</label>
                <input value={date} onChange={(e) => setDate(e.target.value)} type="date" />
              </div>
            </div>

            <button className="button-primary" type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Add Contribution'}
            </button>
          </form>
        </div>
      )}

      <div className="section-card">
        <h3>{isMember ? 'Your Welfare Contributions' : 'Welfare history'}</h3>
        {beneficiaries.length === 0 ? (
          <p>No contributions recorded yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {beneficiaries.map((b) => (
              <div key={b.name} style={{ border: '1px solid #e8edf7', borderRadius: 12, padding: 14, background: '#fafbff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === b.name ? null : b.name)}
                    style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontSize: 16, fontWeight: 700, textAlign: 'left' }}
                  >
                    {b.name}
                  </button>
                  <div style={{ fontWeight: 700 }}>{formatCurrency(b.total)}</div>
                </div>

                {expanded === b.name && (
                  <div style={{ marginTop: 12 }}>
                    <table className="table-list">
                      <thead>
                        <tr>
                          <th>Member log in</th>
                          <th style={{ textAlign: 'right' }}>Contribution</th>
                          <th style={{ textAlign: 'right' }}>Date</th>
                          <th>Recorded By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {b.items.map((it) => (
                          <tr key={it.id}>
                              <td>
                                {(it.contributorFirstName || it.contributorLastName)
                                  ? `${it.contributorFirstName || ''}${it.contributorFirstName && it.contributorLastName ? ' ' : ''}${it.contributorLastName || ''}`.trim()
                                  : 'Anonymous'}
                              </td>
                            <td style={{ textAlign: 'right' }}>{formatCurrency(it.amount)}</td>
                            <td style={{ textAlign: 'right' }}>{new Date(it.date).toLocaleDateString()}</td>
                            <td style={{ fontSize: '0.9em', color: '#666' }}>{formatRecordedBy(it)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
