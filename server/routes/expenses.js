const express = require('express');
const { readData, writeData } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  // elders should not see expenditure summary
  if (req.user && req.user.role === 'elder') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const data = await readData();
  let records = data.expenses || [];
  
  // Secretaries should not see expense history (they can still record)
  if (req.user && req.user.role === 'secretary') {
    return res.json([]);
  }
  
  res.json(records);
});

router.post('/', async (req, res) => {
  const { expense, amount, date } = req.body;
  if (!expense || amount === undefined || !date) {
    return res.status(400).json({ error: 'expense, amount, and date are required' });
  }

  const data = await readData();
  data.expenses = data.expenses || [];
  data.lastExpenseId = data.lastExpenseId || 0;

  const record = {
    id: ++data.lastExpenseId,
    expense,
    amount: Number(amount),
    date
  };
  
  // Attach sessionId if secretary
  if (req.user?.role === 'secretary') {
    record.sessionId = req.user?.sessionId || 'unknown';
    record.recordedByName = req.user?.recordedByName || req.user?.username || 'Admin';
  }

  const recordedRecord = record;
  data.expenses.push(recordedRecord);
  await writeData(data);
  res.json(recordedRecord);
});

router.put('/:id', async (req, res) => {
  const { expense, amount, date } = req.body;
  const data = await readData();
  data.expenses = data.expenses || [];
  const record = data.expenses.find((item) => item.id === Number(req.params.id));
  if (!record) {
    return res.status(404).json({ error: 'Expense record not found' });
  }

  // Only pastor can edit expense records
  if (!req.user || req.user.role !== 'pastor') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  record.expense = expense || record.expense;
  record.amount = amount !== undefined ? Number(amount) : record.amount;
  record.date = date || record.date;
  
  // Attach sessionId if secretary (though pastor is required for edit)
  if (req.user?.role === 'secretary') {
    record.sessionId = req.user?.sessionId || 'unknown';
    record.recordedByName = req.user?.recordedByName || req.user?.username || 'Admin';
  }

  await writeData(data);
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  // Only pastor can delete expense records
  if (!req.user || req.user.role !== 'pastor') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const data = await readData();
  data.expenses = data.expenses || [];
  data.expenses = data.expenses.filter((item) => item.id !== Number(req.params.id));
  await writeData(data);
  res.json({ success: true });
});

module.exports = router;
