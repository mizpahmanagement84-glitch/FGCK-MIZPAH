const express = require('express');
const { attachRecordedBy } = require('../utils/audit');
const { readData, writeData } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const data = await readData();
  const transactions = (data.departmentTransactions || [])
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(transactions);
});

router.post('/', async (req, res) => {
  const { department, amount, date, transactionType } = req.body;
  const data = await readData();
  if (!data.departmentTransactions) {
    data.departmentTransactions = [];
  }
  if (!data.lastTransactionId) {
    data.lastTransactionId = 0;
  }
  const newTransaction = {
    id: ++data.lastTransactionId,
    department,
    amount: Number(amount),
    date: new Date(date).toISOString(),
    transactionType,
    createdAt: new Date().toISOString()
  };
  const recordedTransaction = attachRecordedBy(newTransaction, req, data);
  data.departmentTransactions.push(recordedTransaction);
  await writeData(data);
  res.json(recordedTransaction);
});

router.put('/:id', async (req, res) => {
  const { department, amount, date, transactionType } = req.body;
  const data = await readData();
  if (!data.departmentTransactions) {
    data.departmentTransactions = [];
  }
  const transaction = data.departmentTransactions.find((item) => item.id === Number(req.params.id));
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  transaction.department = department || transaction.department;
  transaction.amount = amount !== undefined ? Number(amount) : transaction.amount;
  transaction.date = date ? new Date(date).toISOString() : transaction.date;
  transaction.transactionType = transactionType || transaction.transactionType;
  Object.assign(transaction, attachRecordedBy(transaction, req, data));
  await writeData(data);
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const data = await readData();
  if (!data.departmentTransactions) {
    data.departmentTransactions = [];
  }
  data.departmentTransactions = data.departmentTransactions.filter((item) => item.id !== Number(req.params.id));
  await writeData(data);
  res.json({ success: true });
});

module.exports = router;
