const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { readData, writeData } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

async function sendOtpEmail(to, otp) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.warn('GMAIL_USER and GMAIL_PASS are not configured. OTP email will not be sent.');
    return false;
  }

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to,
    subject: 'Mizpah Password Recovery OTP',
    text: `Your OTP for Mizpah password recovery is: ${otp}\n\nIf you did not request this, please ignore this email.`
  };

  await transporter.sendMail(mailOptions);
  return true;
}

const normalize = (value) => (value || '').trim().toLowerCase();

const isElderMember = (member) => (member?.title || '').trim().toLowerCase() === 'elder';

const generateSessionId = () => {
  // Generate a unique session ID: timestamp + random string
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
};

const findMemberByUsername = (data, username) => {
  const normalizedUsername = normalize(username);
  return data.members.find((m) => {
    const normalizedMemberName = normalize(m.firstName);
    const firstNamePart = normalizedMemberName.split(' ')[0];
    const normalizedMemberNumber = normalize(m.memberNumber);
    const normalizedEmail = normalize(m.email);
    const normalizedRecoveryEmail = normalize(m.recoveryEmail);
    return normalizedMemberName === normalizedUsername
      || firstNamePart === normalizedUsername
      || normalizedMemberNumber === normalizedUsername
      || normalizedEmail === normalizedUsername
      || normalizedRecoveryEmail === normalizedUsername;
  });
};

const getMemberEmail = (member) => normalize(member.recoveryEmail || member.email);

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

router.post('/login', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // Temporary hardcoded secretary test login
  if (username === 'MIZPAH' && password === 'Mizpahsec321') {
    const sessionId = generateSessionId();
    const token = jwt.sign({ id: 99, username: 'MIZPAH', role: 'secretary', sessionId }, process.env.JWT_SECRET || 'secret-key', {
      expiresIn: '8h'
    });
    return res.json({ token, user: { id: 99, username: 'MIZPAH', role: 'secretary' } });
  }

  const normalizedUsername = (username || '').trim().toLowerCase();
  const normalizedPassword = (password || '').trim();
  const normalizedRole = (role || '').trim().toLowerCase();

  const data = await readData();

  // Check admins first (pastor / elder / secretary)
  let admin = data.admins.find((item) => item.username.toLowerCase() === normalizedUsername);
  if (!admin && normalizedRole) {
    admin = data.admins.find((item) => item.role.toLowerCase() === normalizedRole);
  }
  
  console.log('Found admin:', admin ? { id: admin.id, username: admin.username, role: admin.role } : 'NOT FOUND');

  if (admin) {
    const passwordMatches = bcrypt.compareSync(password, admin.password);
    const fallbackMatch = (
      admin.username.toLowerCase() === 'pastor' && password === 'password123'
    ) || (
      admin.username.toLowerCase() === 'elder' && password === 'Eldermizpah123'
    ) || (
      admin.role.toLowerCase() === 'secretary' && password === 'Mizpahsec321'
    ) || (
      // Temporary hardcoded check for testing
      admin.username.toLowerCase() === 'mizpah' && password === 'Mizpahsec321'
    );

    console.log('Password check:', { passwordMatches, fallbackMatch });

    if (!passwordMatches && !fallbackMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const sessionId = generateSessionId();
    const token = jwt.sign({ id: admin.id, username: admin.username, role: admin.role, sessionId }, process.env.JWT_SECRET || 'secret-key', {
      expiresIn: '8h'
    });
    return res.json({ token, user: { id: admin.id, username: admin.username, role: admin.role } });
  }

  // Otherwise check members by first name, member number, or recovery email
  const member = findMemberByUsername(data, username);
  if (!member) return res.status(401).json({ error: 'Invalid credentials' });

  const memberRole = isElderMember(member) ? 'elder' : 'member';
  if (normalizedRole === 'elder' && memberRole !== 'elder') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const digitsMatch = (member.memberNumber || '').slice(-3) === normalizedPassword;

  // If member has a stored password and it matches, log them in normally.
  if (member.password && bcrypt.compareSync(normalizedPassword, member.password)) {
    const sessionId = generateSessionId();
    const token = jwt.sign({ id: member.id, username: member.firstName, role: memberRole, sessionId }, process.env.JWT_SECRET || 'secret-key', {
      expiresIn: '8h'
    });
    return res.json({ token, user: { id: member.id, username: member.firstName, role: memberRole } });
  }

  // Allow elder members to login with the last three digits of their member number.
  if (memberRole === 'elder' && digitsMatch) {
    const sessionId = generateSessionId();
    const token = jwt.sign({ id: member.id, username: member.firstName, role: memberRole, sessionId }, process.env.JWT_SECRET || 'secret-key', {
      expiresIn: '8h'
    });
    return res.json({ token, user: { id: member.id, username: member.firstName, role: memberRole }, needPasswordChange: true });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
});

router.post('/forgot-password', async (req, res) => {
  const { username, email } = req.body;
  if (!username || !email) {
    return res.status(400).json({ error: 'Username and email are required' });
  }
  const data = await readData();
  const member = findMemberByUsername(data, username);
  if (!member || getMemberEmail(member) !== normalize(email)) {
    return res.status(404).json({ error: 'Member not found with provided email' });
  }
  const otp = generateOtp();
  member.passwordResetOtp = otp;
  member.passwordResetOtpExpiry = Date.now() + 15 * 60 * 1000;
  await writeData(data);

  let emailSent = false;
  try {
    emailSent = await sendOtpEmail(member.email || member.recoveryEmail, otp);
  } catch (err) {
    console.error('Failed to send OTP email:', err);
  }

  if (!emailSent) {
    return res.status(500).json({ error: 'Unable to send OTP email. Please contact support.' });
  }

  return res.json({ success: true, message: 'OTP sent to recovery email' });
});

router.post('/reset-password', async (req, res) => {
  const { username, email, otp, newPassword, confirmPassword } = req.body;
  if (!username || !email || !otp || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'Username, email, otp, and new password are required' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }
  const data = await readData();
  const member = findMemberByUsername(data, username);
  if (!member || getMemberEmail(member) !== normalize(email)) {
    return res.status(404).json({ error: 'Member not found with provided email' });
  }
  if (!member.passwordResetOtp || member.passwordResetOtp !== otp || !member.passwordResetOtpExpiry || Date.now() > member.passwordResetOtpExpiry) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }
  member.password = bcrypt.hashSync(newPassword, 10);
  member.recoveryEmail = normalize(email);
  delete member.passwordResetOtp;
  delete member.passwordResetOtpExpiry;
  await writeData(data);
  res.json({ success: true });
});

// Set password for member (requires auth)
router.post('/set-password', authMiddleware, async (req, res) => {
  const { newPassword, recoveryEmail } = req.body;
  if (!newPassword) return res.status(400).json({ error: 'New password required' });
  if (!recoveryEmail) return res.status(400).json({ error: 'Recovery email required' });
  const user = req.user;
  if (!user || user.role !== 'elder') return res.status(403).json({ error: 'Forbidden' });
  const data = await readData();
  const member = data.members.find((m) => m.id === Number(user.id));
  if (!member) return res.status(404).json({ error: 'Member not found' });
  member.password = bcrypt.hashSync(newPassword, 10);
  member.recoveryEmail = normalize(recoveryEmail);
  delete member.passwordResetOtp;
  delete member.passwordResetOtpExpiry;
  await writeData(data);
  res.json({ success: true });
});

module.exports = router;
