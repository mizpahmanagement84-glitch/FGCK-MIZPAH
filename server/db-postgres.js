const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function initDatabase() {
  try {
    console.log('Initializing database...');
    
    // Health check: verify database connection
    const client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 10000)
      )
    ]);
    
    console.log('✓ Database connection successful');
    client.release();
    
    await query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        member_number TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        title TEXT,
        group_name TEXT,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        notes TEXT,
        gender TEXT,
        password TEXT,
        recovery_email TEXT,
        password_reset_otp TEXT,
        password_reset_otp_expiry BIGINT
      );

      CREATE TABLE IF NOT EXISTS givings (
        id SERIAL PRIMARY KEY,
        member_id INTEGER REFERENCES members(id),
        amount NUMERIC NOT NULL,
        giving_date TIMESTAMP WITH TIME ZONE NOT NULL,
        category TEXT NOT NULL DEFAULT 'General',
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS tithes (
        id SERIAL PRIMARY KEY,
        member_id INTEGER REFERENCES members(id),
        amount NUMERIC NOT NULL,
        giving_date TIMESTAMP WITH TIME ZONE NOT NULL,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        date TIMESTAMP WITH TIME ZONE NOT NULL,
        category TEXT NOT NULL,
        total INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        expense TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        date TIMESTAMP WITH TIME ZONE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        project_name TEXT NOT NULL,
        member_id INTEGER REFERENCES members(id),
        amount NUMERIC NOT NULL,
        date TIMESTAMP WITH TIME ZONE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        item TEXT NOT NULL,
        qty INTEGER NOT NULL,
        storage TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS department_transactions (
        id SERIAL PRIMARY KEY,
        department TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        date TIMESTAMP WITH TIME ZONE NOT NULL,
        transaction_type TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log('✓ Database tables initialized');

    // Add recorded_by columns if they don't exist (migration)
    const tables = ['attendance', 'expenses', 'projects', 'inventory', 'welfare'];
    for (const table of tables) {
      try {
        await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS recorded_by TEXT`);
        await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS recorded_by_name TEXT`);
        await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS recorded_by_member_number TEXT`);
        await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS recorded_by_user_id INTEGER`);
      } catch (e) {
        // Columns might already exist, which is fine
        console.log(`Note: Could not add recorded_by columns to ${table}:`, e.message);
      }
    }
    // Add session_id column to tables that may include session-scoped records
    const sessionTables = ['givings', 'tithes', 'attendance', 'expenses', 'projects', 'inventory', 'departments', 'department_transactions', 'welfare'];
    for (const table of sessionTables) {
      try {
        await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS session_id TEXT`);
      } catch (e) {
        console.log(`Note: Could not add session_id to ${table}:`, e.message);
      }
    }
    console.log('✓ Database migration completed');

    const defaultAdmins = [
      {
        username: 'pastor',
        password: 'password123',
        role: 'pastor',
        seedHash: '$2a$10$WzTgN0xwFjF1Y7dH2QxI5Oza/tgynw0kLJYv2X2BQ1YWnjUXLZkOS'
      },
      {
        username: 'Elder',
        password: 'Eldermizpah123',
        role: 'elder',
        seedHash: '$2a$10$uRFJuYxGe/sQvVHZ7YkIr.9jF1w5oSVt8qj68.EVDswyvRsNf2F.FW'
      },
      {
        username: 'MIZPAH',
        password: 'Mizpahsec321',
        role: 'secretary',
        seedHash: '$2a$10$55l93Qp2Yc5JaVF0h4KF3ui62GSC5ZCeRHjLCdnUpcwtB0BPowSBG',
        previousSeedHashes: ['$2a$10$YQ7ukz7XMoUchVeNuCBIRuIBZbFjQhSOtpfCR9wjmDX21ok7I8kS']
      }
    ];

    const result = await query('SELECT COUNT(*) FROM admins');
    const adminCount = Number(result.rows[0].count);
    if (adminCount === 0) {
      const values = [
        'pastor', bcrypt.hashSync('password123', 10), 'pastor',
        'Elder', bcrypt.hashSync('Eldermizpah123', 10), 'elder',
        'MIZPAH', bcrypt.hashSync('Mizpahsec321', 10), 'secretary'
      ];
      await query(
        'INSERT INTO admins (username, password, role) VALUES ($1, $2, $3), ($4, $5, $6), ($7, $8, $9)',
        values
      );
      console.log('✓ Admin users seeded');
    } else {
      for (const adminDef of defaultAdmins) {
        const adminRow = await query('SELECT id, password FROM admins WHERE LOWER(username) = $1', [adminDef.username.toLowerCase()]);
        if (adminRow.rows.length > 0) {
          const existing = adminRow.rows[0];
          if (existing.password === adminDef.seedHash) {
            const updateHash = bcrypt.hashSync(adminDef.password, 10);
            await query('UPDATE admins SET password = $1 WHERE id = $2', [updateHash, existing.id]);
            console.log(`✓ Updated default admin password for ${adminDef.username}`);
          }
        } else {
          const insertHash = bcrypt.hashSync(adminDef.password, 10);
          await query('INSERT INTO admins (username, password, role) VALUES ($1, $2, $3)', [adminDef.username, insertHash, adminDef.role]);
          console.log(`✓ Seeded missing admin user ${adminDef.username}`);
        }
      }
    }
  } catch (error) {
    console.error('Database initialization error:', error.message);
    throw error;
  }
}

module.exports = { pool, query, initDatabase, transaction };
