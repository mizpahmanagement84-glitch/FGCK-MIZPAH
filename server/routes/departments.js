const express = require('express');
const { readData, writeData } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const search = (req.query.search || '').toLowerCase();
  const data = await readData();
  const departments = (data.departments || []).filter((dept) => {
    return (
      dept.name.toLowerCase().includes(search) ||
      (dept.description || '').toLowerCase().includes(search)
    );
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  // Ensure recordedByName is visible to viewers
  const mappedDepartments = departments.map((d) => ({ ...d, recordedByName: d.recordedByName || d.recorded_by_name || '' }));
  res.json(mappedDepartments);
});

router.post('/', async (req, res) => {
  const { name, description } = req.body;
  const data = await readData();
  if (!data.departments) {
    data.departments = [];
  }
  if (!data.lastDepartmentId) {
    data.lastDepartmentId = 0;
  }
  const newDepartment = {
    id: ++data.lastDepartmentId,
    name,
    description: description || '',
    createdAt: new Date().toISOString()
  };
  // Attach sessionId if secretary
  if (req.user?.role === 'secretary') {
    newDepartment.sessionId = req.user?.sessionId || 'unknown';
    newDepartment.recordedByName = req.user?.recordedByName || req.user?.username || 'Admin';
  }
  data.departments.push(newDepartment);
  await writeData(data);
  res.json(newDepartment);
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const data = await readData();
  if (!data.departments) {
    data.departments = [];
  }
  const department = data.departments.find((item) => item.id === Number(id));
  if (!department) {
    return res.status(404).json({ error: 'Department not found' });
  }
  department.name = name;
  department.description = description || '';
  await writeData(data);
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const data = await readData();
  if (!data.departments) {
    data.departments = [];
  }
  data.departments = data.departments.filter((item) => item.id !== Number(req.params.id));
  await writeData(data);
  res.json({ success: true });
});

module.exports = router;
