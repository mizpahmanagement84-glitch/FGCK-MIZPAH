const express = require('express');
const { readData, writeData } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const data = await readData();
  const members = data.members || [];
  let projects = (data.projects || []).map((project) => {
    const member = members.find((m) => m.id === project.memberId) || {};
    return {
      ...project,
      memberName: member.firstName || 'Unknown',
      memberNumber: member.memberNumber || ''
    };
  });
  if (req.query && req.query.memberId) {
    const mid = Number(req.query.memberId);
    projects = projects.filter((p) => p.memberId === mid);
  }
  res.json(projects);
});

router.post('/', async (req, res) => {
  const { projectName, memberId, amount, date } = req.body;
  if (!projectName || !memberId || !amount || !date) {
    return res.status(400).json({ error: 'projectName, memberId, amount, and date are required' });
  }

  const data = await readData();
  data.projects = data.projects || [];
  data.lastProjectId = data.lastProjectId || 0;

  const newProject = {
    id: ++data.lastProjectId,
    projectName,
    memberId: Number(memberId),
    amount: Number(amount),
    date
  };

  const recordedProject = newProject;
  data.projects.push(recordedProject);
  await writeData(data);
  res.json(recordedProject);
});

router.put('/:id', async (req, res) => {
  const { projectName, memberId, amount, date } = req.body;
  const data = await readData();
  data.projects = data.projects || [];
  const project = data.projects.find((item) => item.id === Number(req.params.id));
  if (!project) {
    return res.status(404).json({ error: 'Project record not found' });
  }

  project.projectName = projectName || project.projectName;
  project.memberId = memberId ? Number(memberId) : project.memberId;
  project.amount = amount ? Number(amount) : project.amount;
  project.date = date || project.date;

  await writeData(data);
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const data = await readData();
  data.projects = data.projects || [];
  data.projects = data.projects.filter((item) => item.id !== Number(req.params.id));
  await writeData(data);
  res.json({ success: true });
});

module.exports = router;
