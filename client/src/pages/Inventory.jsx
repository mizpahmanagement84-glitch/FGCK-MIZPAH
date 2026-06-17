import { useEffect, useState } from 'react';
import client from '../api';

function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [form, setForm] = useState({ item: '', qty: '', storage: '' });
  const [showForm, setShowForm] = useState(true);
  const [actionMenuId, setActionMenuId] = useState(null);

  useEffect(() => {
    const loadInventory = async () => {
      const response = await client.get('/inventory');
      setInventory(response.data);
    };
    loadInventory().catch(console.error);
  }, []);

  const handleChange = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await client.post('/inventory', form);
    setForm({ item: '', qty: '', storage: '' });
    const response = await client.get('/inventory');
    setInventory(response.data);
  };

  const toggleActionMenu = (id) => {
    setActionMenuId((current) => (current === id ? null : id));
  };

  const handleEdit = async (record) => {
    const item = window.prompt('Enter item name', record.item);
    if (item === null) return;

    const qtyInput = window.prompt('Enter quantity', record.qty);
    if (qtyInput === null) return;
    const qty = Number(qtyInput);
    if (Number.isNaN(qty)) return window.alert('Enter a valid number.');

    const storage = window.prompt('Enter storage location', record.storage);
    if (storage === null) return;

    await client.put(`/inventory/${record.id}`, { item, qty, storage });
    setActionMenuId(null);
    const response = await client.get('/inventory');
    setInventory(response.data);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this inventory item?')) return;
    await client.delete(`/inventory/${id}`);
    setActionMenuId(null);
    const response = await client.get('/inventory');
    setInventory(response.data);
  };

  return (
    <div>
      <h1 className="page-title">Inventory</h1>
      <div className="section-card">
        <div className="section-card-header">
          <h2>Record new inventory item</h2>
          <button className="close-button" type="button" onClick={() => setShowForm((visible) => !visible)}>
            {showForm ? 'Close' : 'Open'}
          </button>
        </div>
        {showForm ? (
          <form onSubmit={handleSubmit}>
            <div className="input-row">
              <div className="form-field">
                <label>Item</label>
                <input value={form.item} onChange={handleChange('item')} required />
              </div>
              <div className="form-field">
                <label>Qty</label>
                <input type="number" value={form.qty} onChange={handleChange('qty')} required />
              </div>
              <div className="form-field">
                <label>Storage</label>
                <input value={form.storage} onChange={handleChange('storage')} required />
              </div>
            </div>
            <button className="button-primary" type="submit">Save item</button>
          </form>
        ) : (
          <p>Inventory form is hidden. Click Open to show the form.</p>
        )}
      </div>
      <div className="section-card">
        <h2>Inventory records</h2>
        <table className="table-list">
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Storage</th>
              <th>Recorded By</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((record, index) => (
              <tr key={record.id}>
                <td>{index + 1}</td>
                <td>{record.item}</td>
                <td>{record.qty}</td>
                <td>{record.storage}</td>
                <td style={{ fontSize: '0.9em', color: '#666' }}>{record.recordedByName || 'Admin'}</td>
                <td style={{ position: 'relative' }}>
                  <button type="button" className="action-button" onClick={() => toggleActionMenu(record.id)}>
                    Action
                  </button>
                  {actionMenuId === record.id && (
                    <div className="action-menu">
                      <button type="button" onClick={() => handleEdit(record)}>Edit</button>
                      <button type="button" onClick={() => handleDelete(record.id)}>Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Inventory;
