const express = require('express');
const { readData, writeData } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const search = (req.query.search || '').toLowerCase();
  const from = req.query.from ? new Date(req.query.from) : new Date('1970-01-01');
  const to = req.query.to ? new Date(req.query.to) : new Date();

  const data = await readData();
  const members = data.members;

  // elders should not view offering history
  if (req.user && req.user.role === 'elder') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Secretaries should not see offering history (they can still record)
  if (req.user && req.user.role === 'secretary') {
    return res.json([]);
  }

  let results = data.givings
    .map((giving) => {
      const member = members.find((m) => m.id === giving.memberId) || {};
      return {
        ...giving,
        firstName: member.firstName || '',
        lastName: member.lastName || ''
      };
    })
    .filter((item) => {
      const textMatch =
        item.firstName.toLowerCase().includes(search) ||
        item.lastName.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search) ||
        item.notes.toLowerCase().includes(search);
      const date = new Date(item.givingDate);
      return textMatch && date >= from && date <= to;
    })
    .sort((a, b) => new Date(b.givingDate) - new Date(a.givingDate));

  // members should only see their own givings
  if (req.user && req.user.role === 'member') {
    // members should only see their own givings
    results = results.filter((r) => r.memberId === Number(req.user.id));
  }

  res.json(results);
});

router.post('/', async (req, res) => {
  const { memberId, amount, givingDate, category, notes } = req.body;
  if (!amount || !givingDate) {
    return res.status(400).json({ error: 'amount and givingDate are required' });
  }

  const data = await readData();
  const newGiving = {
    id: ++data.lastGivingId,
    memberId: memberId ? Number(memberId) : null,
    amount: Number(amount),
    givingDate,
    category: category || 'General',
    notes: notes || ''
  };
  
  // Attach sessionId if secretary
  if (req.user?.role === 'secretary') {
    newGiving.sessionId = req.user?.sessionId || 'unknown';
    newGiving.recordedByName = req.user?.recordedByName || req.user?.username || 'Admin';
  }
  
  const recordedGiving = newGiving;
  data.givings.push(recordedGiving);
  await writeData(data);
  res.json(recordedGiving);
});

router.put('/:id', async (req, res) => {
  const { amount, givingDate, category, notes, memberId } = req.body;
  const data = await readData();
  const giving = data.givings.find((item) => item.id === Number(req.params.id));
  if (!giving) {
    return res.status(404).json({ error: 'Giving record not found' });
  }
  giving.memberId = Number(memberId);
  giving.amount = Number(amount);
  giving.givingDate = givingDate;
  giving.category = category || 'General';
  giving.notes = notes || '';
  
  // Attach sessionId if secretary
  if (req.user?.role === 'secretary') {
    giving.sessionId = req.user?.sessionId || 'unknown';
    giving.recordedByName = req.user?.recordedByName || req.user?.username || 'Admin';
  }

  await writeData(data);
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const data = await readData();
  data.givings = data.givings.filter((item) => item.id !== Number(req.params.id));
  await writeData(data);
  res.json({ success: true });
});

module.exports = router;
