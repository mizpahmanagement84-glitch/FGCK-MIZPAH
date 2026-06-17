require('express-async-errors');
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const membersRoutes = require('./routes/members');
const givingsRoutes = require('./routes/givings');
const tithesRoutes = require('./routes/tithes');
const projectsRoutes = require('./routes/projects');
const inventoryRoutes = require('./routes/inventory');
const attendanceRoutes = require('./routes/attendance');
const expensesRoutes = require('./routes/expenses');
const departmentsRoutes = require('./routes/departments');
const departmentTransactionsRoutes = require('./routes/department-transactions');
const bulkSmsRoutes = require('./routes/bulk-sms');
const welfareRoutes = require('./routes/welfare');
const { initDatabase } = require('./db');

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Log environment on startup
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: port,
  DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
  JWT_SECRET: process.env.JWT_SECRET ? '[SET]' : '[NOT SET]',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'not set'
});

app.use(cors());
app.use(express.json());

// expose routes after the database is ready
app.use('/api/auth', authRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/givings', givingsRoutes);
app.use('/api/tithes', tithesRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/department-transactions', departmentTransactionsRoutes);
app.use('/api/bulk-sms', bulkSmsRoutes);
app.use('/api/welfare', welfareRoutes);

if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
  if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(clientBuildPath, 'index.html'));
      }
    });
  }
}

app.get('/api', (req, res) => {
  res.json({ message: 'Mizpah church management API' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const http = require('http');
const { setIo } = require('./realtime');

async function startServer() {
  const server = http.createServer(app);
  // initialize realtime sockets (allows CORS to frontend)
  try {
    setIo(server, { origin: process.env.CORS_ORIGIN || '*' });
  } catch (err) {
    console.error('Socket.io initialization failed:', err);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
  server.on('error', (err) => {
    console.error('Server error:', err);
  });
}

initDatabase().then(() => {
  startServer();
}).catch((err) => {
  console.error('Database initialization failed:', err);
  console.warn('Continuing startup using file-based store. Database features may be limited.');
  // proceed to start server even if DB init failed
  startServer();
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // do not exit immediately on uncaught exception in production; log and allow process manager to decide
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
