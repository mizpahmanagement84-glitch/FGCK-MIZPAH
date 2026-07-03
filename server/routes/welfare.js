const express = require('express');
const { readData, writeData } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const data = await readData();
  const members = data.members || [];
  const welfare = data.welfare || [];

  let results = welfare.map((w) => {
    const beneficiary = members.find((m) => m.id === w.beneficiaryId) || {};
    const contributor = members.find((m) => m.id === w.memberId) || {};
    return {
      ...w,
      beneficiaryName: beneficiary.firstName && beneficiary.lastName ? `${beneficiary.firstName} ${beneficiary.lastName}` : beneficiary.firstName || beneficiary.lastName || 'Unknown',
      contributorFirstName: contributor.firstName || '',
      contributorLastName: contributor.lastName || '',
      recordedByName: w.recordedByName || w.recorded_by_name || ''
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date));


  // members should only see their own contributions
  if (req.user && req.user.role === 'member') {
    results = results.filter((r) => r.memberId === Number(req.user.id));
  }

  // Secretaries should only see welfare records from their current session
  // Secretaries can view full welfare history

  res.json(results);
});

router.post('/', async (req, res) => {
  const { beneficiaryId, memberId, amount, date } = req.body;
  if (!beneficiaryId || !amount) {
    return res.status(400).json({ error: 'beneficiary and amount are required' });
  }

  const data = await readData();
  data.welfare = data.welfare || [];
  const newId = data.welfare.length ? Math.max(...data.welfare.map((i) => Number(i.id))) + 1 : 1;
  const entry = {
    id: newId,
    beneficiaryId: Number(beneficiaryId),
    memberId: memberId ? Number(memberId) : null,
    amount: Number(amount),
    date: date || new Date().toISOString()
  };
  // Attach sessionId if secretary
  if (req.user?.role === 'secretary') {
    entry.sessionId = req.user?.sessionId || 'unknown';
    entry.recordedByName = req.user?.recordedByName || req.user?.username || 'Admin';
  }
  data.welfare.push(entry);
  await writeData(data);
  res.json(entry);
});

module.exports = router;
