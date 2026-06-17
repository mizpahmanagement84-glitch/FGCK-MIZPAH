require('dotenv').config({ path: __dirname + '/.env' });
const { Pool } = require('pg');
(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  try {
    const now = await pool.query('SELECT NOW() AS now');
    console.log('Connected to DB, time:', now.rows[0].now);
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    console.log('Public tables:', tables.rows.map(r => r.table_name));
  } catch (err) {
    console.error('DB error:', err.message || err);
    process.exitCode = 2;
  } finally {
    await pool.end().catch(() => {});
  }
})();
