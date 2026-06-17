const express = require('express');
const { attachRecordedBy } = require('../utils/audit');
const { readData, writeData } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const data = await readData();
  const members = data.members || [];
  // elders should not access tithes
  if (req.user && req.user.role === 'elder') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  let results = (data.tithes || []).map((tithe) => {
    const member = members.find((m) => m.id === tithe.memberId) || {};
    return {
      ...tithe,
      firstName: member.firstName || '',
      lastName: member.lastName || ''
    };
  });
  // allow filtering by memberId via query
  if (req.query && req.query.memberId) {
    const mid = Number(req.query.memberId);
    results = results.filter((r) => r.memberId === mid);
  }
  // members should only see their own tithes
  if (req.user && req.user.role === 'member') {
    results = results.filter((r) => r.memberId === Number(req.user.id));
  }
  res.json(results);
});

router.post('/', async (req, res) => {
  const { memberId, amount, givingDate, notes } = req.body;
  if (!amount || !givingDate) {
    return res.status(400).json({ error: 'amount and givingDate are required' });
  }

  const data = await readData();
  data.tithes = data.tithes || [];
  data.lastTitheId = data.lastTitheId || 0;

  const newTithe = {
    id: ++data.lastTitheId,
    memberId: memberId ? Number(memberId) : null,
    amount: Number(amount),
    givingDate,
    notes: notes || ''
  };
  const recordedTithe = attachRecordedBy(newTithe, req, data);

  data.tithes.push(recordedTithe);
  await writeData(data);
  res.json(recordedTithe);
});

router.put('/:id', async (req, res) => {
  const { amount, givingDate, notes, memberId } = req.body;
  const data = await readData();
  data.tithes = data.tithes || [];
  const tithe = data.tithes.find((item) => item.id === Number(req.params.id));
  if (!tithe) {
    return res.status(404).json({ error: 'Tithe record not found' });
  }

  tithe.memberId = Number(memberId);
  tithe.amount = Number(amount);
  tithe.givingDate = givingDate;
  tithe.notes = notes || '';
  Object.assign(tithe, attachRecordedBy(tithe, req, data));

  await writeData(data);
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const data = await readData();
  data.tithes = data.tithes || [];
  data.tithes = data.tithes.filter((item) => item.id !== Number(req.params.id));
  await writeData(data);
  res.json({ success: true });
});

module.exports = router;
