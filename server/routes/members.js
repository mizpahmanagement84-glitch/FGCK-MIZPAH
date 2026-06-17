const express = require('express');
const { readData, writeData } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const allowedTitles = ['Pastor', 'Mrs Pastor', 'Elder', 'Deacon', 'Deaconess', 'D.Leader'];

router.get('/', async (req, res) => {
  const search = (req.query.search || '').toLowerCase();
  const data = await readData();
  // If a member is logged in, only return their own record
  if (req.user && req.user.role === 'member') {
    const member = data.members.find((m) => m.id === Number(req.user.id));
    return res.json(member ? [member] : []);
  }
  const members = data.members.filter((member) => {
    return (
      (member.firstName || '').toLowerCase().includes(search) ||
      (member.lastName || '').toLowerCase().includes(search) ||
      (member.email || '').toLowerCase().includes(search) ||
      (member.phone || '').toLowerCase().includes(search) ||
      (member.group || '').toLowerCase().includes(search) ||
      (member.title || '').toLowerCase().includes(search) ||
      (member.memberNumber || '').toLowerCase().includes(search)
    );
  }).sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt));
  res.json(members);
});

function buildMemberNumber(data) {
  let number;
  do {
    const randomDigits = Math.floor(100 + Math.random() * 900);
    number = `MIZ-26/${randomDigits}`;
  } while (data.members.some((member) => member.memberNumber === number));
  return number;
}

router.post('/', async (req, res) => {
  const { firstName, lastName, phone, email, notes, group, joinedAt, gender, title } = req.body;
  const data = await readData();
  const newMember = {
    id: ++data.lastMemberId,
    memberNumber: buildMemberNumber(data),
    firstName: firstName || '',
    lastName: lastName || '',
    phone: phone || '',
    email: email || '',
    title: allowedTitles.includes(title) ? title : '',
    group: group || 'all',
    joinedAt: joinedAt ? new Date(joinedAt).toISOString() : new Date().toISOString(),
    notes: notes || '',
    gender: gender || 'male'
  };
  data.members.push(newMember);
  await writeData(data);
  res.json(newMember);
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, phone, email, notes, group, joinedAt, gender, title } = req.body;
  const data = await readData();
  const member = data.members.find((item) => item.id === Number(id));
  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }
  // Only pastor can edit member details
  if (!req.user || req.user.role !== 'pastor') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  member.firstName = firstName || member.firstName || '';
  member.lastName = lastName || member.lastName || '';
  member.phone = phone || member.phone || '';
  member.email = email || member.email || '';
  member.title = allowedTitles.includes(title) ? title : member.title || '';
  member.group = group || member.group || 'all';
  member.joinedAt = joinedAt ? new Date(joinedAt).toISOString() : member.joinedAt;
  member.notes = notes || member.notes || '';
  member.gender = gender || member.gender || 'male';
  await writeData(data);
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  // Only pastor can delete members
  if (!req.user || req.user.role !== 'pastor') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const data = await readData();
  data.members = data.members.filter((item) => item.id !== Number(req.params.id));
  await writeData(data);
  res.json({ success: true });
});

module.exports = router;
