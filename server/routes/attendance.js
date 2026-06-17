const express = require('express');
const { attachRecordedBy } = require('../utils/audit');
const { readData, writeData } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const data = await readData();
  res.json(data.attendance || []);
});

router.post('/', async (req, res) => {
  const { date, category, total } = req.body;
  if (!date || !category || total === undefined) {
    return res.status(400).json({ error: 'date, category, and total are required' });
  }

  const data = await readData();
  data.attendance = data.attendance || [];
  data.lastAttendanceId = data.lastAttendanceId || 0;

  const record = {
    id: ++data.lastAttendanceId,
    date,
    category,
    total: Number(total)
  };

  const recordedRecord = attachRecordedBy(record, req, data);
  data.attendance.push(recordedRecord);
  await writeData(data);
  res.json(recordedRecord);
});

router.put('/:id', async (req, res) => {
  const { date, category, total } = req.body;
  const data = await readData();
  data.attendance = data.attendance || [];
  const record = data.attendance.find((item) => item.id === Number(req.params.id));
  if (!record) {
    return res.status(404).json({ error: 'Attendance record not found' });
  }

  record.date = date || record.date;
  record.category = category || record.category;
  record.total = total !== undefined ? Number(total) : record.total;
  Object.assign(record, attachRecordedBy(record, req, data));

  await writeData(data);
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const data = await readData();
  data.attendance = data.attendance || [];
  data.attendance = data.attendance.filter((item) => item.id !== Number(req.params.id));
  await writeData(data);
  res.json({ success: true });
});

module.exports = router;
