let query;
let transaction;
let initDatabase;

if (process.env.DATABASE_URL) {
  try {
    const dbpg = require('./db-postgres');
    query = dbpg.query;
    transaction = dbpg.transaction;
    initDatabase = dbpg.initDatabase;
  } catch (e) {
    // ignore and fall back to file-based store
  }
} else {
  initDatabase = async () => Promise.resolve();
}

const memberColumns = [
  'id',
  'member_number AS "memberNumber"',
  'first_name AS "firstName"',
  'last_name AS "lastName"',
  'phone',
  'email',
  'title',
  'group_name AS "group"',
  'joined_at AS "joinedAt"',
  'notes',
  'gender',
  'password',
  'recovery_email AS "recoveryEmail"',
  'password_reset_otp AS "passwordResetOtp"',
  'password_reset_otp_expiry AS "passwordResetOtpExpiry"'
];

function mapRow(row) {
  return row;
}

async function readData() {
  // If a Postgres-based implementation is available, use it
  if (query) {
    const [admins, members, givings, tithes, attendance, expenses, projects, inventory, departments, departmentTransactions] = await Promise.all([
      query('SELECT id, username, password, role FROM admins ORDER BY id').then((r) => r.rows),
      query(`SELECT ${memberColumns.join(', ')} FROM members ORDER BY id`).then((r) => r.rows),
      query('SELECT id, member_id AS "memberId", amount, giving_date AS "givingDate", category, notes FROM givings ORDER BY id').then((r) => r.rows),
      query('SELECT id, member_id AS "memberId", amount, giving_date AS "givingDate", notes FROM tithes ORDER BY id').then((r) => r.rows),
      query('SELECT id, date, category, total FROM attendance ORDER BY id').then((r) => r.rows),
      query('SELECT id, expense, amount, date FROM expenses ORDER BY id').then((r) => r.rows),
      query('SELECT id, project_name AS "projectName", member_id AS "memberId", amount, date FROM projects ORDER BY id').then((r) => r.rows),
      query('SELECT id, item, qty, storage FROM inventory ORDER BY id').then((r) => r.rows),
      query('SELECT id, name, description, created_at AS "createdAt" FROM departments ORDER BY id').then((r) => r.rows),
      query('SELECT id, department, amount, date, transaction_type AS "transactionType", created_at AS "createdAt" FROM department_transactions ORDER BY id').then((r) => r.rows)
    ]);

    const lastId = (items) => (items && items.length ? Math.max(...items.map((item) => Number(item.id))) : 0);

    return {
      admins,
      members,
      givings,
      tithes,
      attendance,
      expenses,
      projects,
      inventory,
      departments,
      departmentTransactions,
      lastAdminId: lastId(admins),
      lastMemberId: lastId(members),
      lastGivingId: lastId(givings),
      lastTitheId: lastId(tithes),
      lastProjectId: lastId(projects),
      lastInventoryId: lastId(inventory),
      lastAttendanceId: lastId(attendance),
      lastExpenseId: lastId(expenses),
      lastDepartmentId: lastId(departments),
      lastTransactionId: lastId(departmentTransactions)
    };
  }

  // Fallback: file-based data store (church-data.json)
  const dataPath = require('path').join(__dirname, 'church-data.json');
  const fs = require('fs');
  const raw = fs.readFileSync(dataPath, 'utf8');
  const json = JSON.parse(raw || '{}');
  return json;
}

function buildInsertStatement(table, columns, row) {
  const keys = Object.keys(row);
  const values = keys.map((key) => row[key]);
  const params = keys.map((_, index) => `$${index + 1}`);
  return {
    text: `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${params.join(', ')})`,
    values
  };
}

async function writeData(data) {
  // If a DB transaction implementation exists, use it
  if (transaction) {
    await transaction(async (client) => {
    const deleteOrder = [
      'department_transactions',
      'departments',
      'inventory',
      'projects',
      'tithes',
      'givings',
      'attendance',
      'expenses',
      'members',
      'admins'
    ];

    for (const table of deleteOrder) {
      await client.query(`DELETE FROM ${table}`);
    }

    const insertRows = async (table, rows) => {
      if (!Array.isArray(rows) || rows.length === 0) {
        return;
      }
      
      // Filter out recorded_by audit columns that may not exist in all tables
      const auditColumns = ['recordedBy', 'recordedByName', 'recordedByMemberNumber', 'recordedByUserId', 'recorded_by', 'recorded_by_name', 'recorded_by_member_number', 'recorded_by_user_id'];
      
      for (const row of rows) {
        const cleanRow = { ...row };
        auditColumns.forEach(col => delete cleanRow[col]);
        const insert = buildInsertStatement(table, Object.keys(cleanRow), cleanRow);
        await client.query(insert.text, insert.values);
      }
      const maxId = Math.max(...rows.map((row) => Number(row.id)));
      if (!Number.isNaN(maxId)) {
        await client.query(`SELECT setval(pg_get_serial_sequence($1, 'id'), $2, true)`, [table, maxId]);
      }
    };

    await insertRows('admins', data.admins || []);
    await insertRows('members', (data.members || []).map((member) => ({
      id: member.id,
      member_number: member.memberNumber || `MIZ-26/${Math.floor(100 + Math.random() * 900)}`,
      first_name: member.firstName || '',
      last_name: member.lastName || '',
      phone: member.phone || '',
      email: member.email || '',
      title: member.title || '',
      group_name: member.group || 'all',
      joined_at: member.joinedAt || new Date().toISOString(),
      notes: member.notes || '',
      gender: member.gender || 'male',
      password: member.password || '',
      recovery_email: member.recoveryEmail || '',
      password_reset_otp: member.passwordResetOtp || '',
      password_reset_otp_expiry: member.passwordResetOtpExpiry || null
    })));
    await insertRows('givings', (data.givings || []).map((item) => ({
      id: item.id,
      member_id: item.memberId,
      amount: item.amount,
      giving_date: item.givingDate,
      category: item.category,
      notes: item.notes
    })));
    await insertRows('tithes', (data.tithes || []).map((item) => ({
      id: item.id,
      member_id: item.memberId,
      amount: item.amount,
      giving_date: item.givingDate,
      notes: item.notes
    })));
    await insertRows('attendance', data.attendance || []);
    await insertRows('expenses', data.expenses || []);
    await insertRows('projects', (data.projects || []).map((item) => ({
      id: item.id,
      project_name: item.projectName,
      member_id: item.memberId,
      amount: item.amount,
      date: item.date
    })));
    await insertRows('inventory', data.inventory || []);
    await insertRows('departments', (data.departments || []).map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      created_at: item.createdAt
    })));
      await insertRows('department_transactions', (data.departmentTransactions || []).map((item) => ({
        id: item.id,
        department: item.department,
        amount: item.amount,
        date: item.date,
        transaction_type: item.transactionType,
        created_at: item.createdAt
      })));
    });
    // emit realtime event when DB-backed write completes
    try {
      const { getIo } = require('./realtime');
      const io = getIo();
      if (io) io.emit('data-changed', data);
    } catch (e) {
      // ignore
    }
    return;
  }

  // Fallback: write to church-data.json
  const fs = require('fs');
  const path = require('path');
  const dataPath = path.join(__dirname, 'church-data.json');
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
  try {
    const { getIo } = require('./realtime');
    const io = getIo();
    if (io) io.emit('data-changed', data);
  } catch (e) {
    // ignore
  }
}

module.exports = {
  query,
  transaction,
  initDatabase,
  readData,
  writeData
};
