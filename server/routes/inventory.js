const express = require('express');
const { readData, writeData } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const data = await readData();
  let records = data.inventory || [];
  
  res.json(records);
});

router.post('/', async (req, res) => {
  const { item, qty, storage } = req.body;
  if (!item || !qty || !storage) {
    return res.status(400).json({ error: 'item, qty, and storage are required' });
  }

  const data = await readData();
  data.inventory = data.inventory || [];
  data.lastInventoryId = data.lastInventoryId || 0;

  const newRecord = {
    id: ++data.lastInventoryId,
    item,
    qty: Number(qty),
    storage
  };
  
  // Attach sessionId if secretary
  if (req.user?.role === 'secretary') {
    newRecord.sessionId = req.user?.sessionId || 'unknown';
    newRecord.recordedByName = req.user?.recordedByName || 'Secretary';
  }

  data.inventory.push(newRecord);
  await writeData(data);
  res.json(newRecord);
});

router.put('/:id', async (req, res) => {
  const { item, qty, storage } = req.body;
  const data = await readData();
  data.inventory = data.inventory || [];
  const record = data.inventory.find((entry) => entry.id === Number(req.params.id));
  if (!record) {
    return res.status(404).json({ error: 'Inventory record not found' });
  }

  record.item = item || record.item;
  record.qty = qty !== undefined ? Number(qty) : record.qty;
  record.storage = storage || record.storage;
  
  // Attach sessionId if secretary
  if (req.user?.role === 'secretary') {
    record.sessionId = req.user?.sessionId || 'unknown';
    record.recordedByName = req.user?.recordedByName || 'Secretary';
  }

  await writeData(data);
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const data = await readData();
  data.inventory = data.inventory || [];
  data.inventory = data.inventory.filter((entry) => entry.id !== Number(req.params.id));
  await writeData(data);
  res.json({ success: true });
});

module.exports = router;
