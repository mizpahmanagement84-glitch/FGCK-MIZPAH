const https = require('https');
const API_KEY = 'rnd_qDeRlIB9gKOzUPfvCmrTNREHYHqO';
const OWNER_ID = 'tea-d8m41geiifgc7385t7e0';
const host = 'api.render.com';
const headers = {
  Authorization: `Bearer ${API_KEY}`,
  Accept: 'application/json',
  'Content-Type': 'application/json'
};

function request(path, method = 'GET', body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: host, path, method, headers };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const result = { status: res.statusCode, body: null };
        try {
          result.body = JSON.parse(data || '{}');
        } catch (e) {
          result.body = data;
        }
        resolve(result);
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function createService(body) {
  const res = await request('/v1/services', 'POST', body);
  console.log('CREATE SERVICE', body.name, res.status, JSON.stringify(res.body, null, 2));
  return res;
}

async function createPostgres(body) {
  const res = await request('/v1/postgres', 'POST', body);
  console.log('CREATE POSTGRES', res.status, JSON.stringify(res.body, null, 2));
  return res;
}

async function createEnvVar(serviceId, envVar) {
  const res = await request(`/v1/services/${serviceId}/env-vars`, 'POST', envVar);
  console.log('CREATE ENV VAR', serviceId, envVar.key, res.status, JSON.stringify(res.body, null, 2));
  return res;
}

async function getConnectionInfo(postgresId) {
  return request(`/v1/postgres/${postgresId}/connection-info`, 'GET');
}

(async () => {
  try {
    const db = await createPostgres({
      name: 'mizpah-db',
      plan: 'basic_1gb',
      ownerId: OWNER_ID,
      version: '18'
    });
    if (db.status >= 400) return;

    const backend = await createService({
      type: 'web_service',
      name: 'mizpah-server',
      ownerId: OWNER_ID,
      repo: 'https://github.com/fgckmizpah-sudo/FGCK-MIZPAH.git',
      branch: 'main',
      rootDir: 'server',
      serviceDetails: {
        runtime: 'node'
      }
    });
    if (backend.status >= 400) return;

    const client = await createService({
      type: 'static_site',
      name: 'mizpah-client',
      ownerId: OWNER_ID,
      repo: 'https://github.com/fgckmizpah-sudo/FGCK-MIZPAH.git',
      branch: 'main',
      rootDir: 'client',
      serviceDetails: {
        buildCommand: 'npm install && npm run build',
        publishPath: 'dist'
      }
    });
    if (client.status >= 400) return;

    const conn = await getConnectionInfo(db.body.id);
    console.log('DB CONNECTION INFO', conn.status, JSON.stringify(conn.body, null, 2));
    if (conn.status >= 400) return;

    const databaseUrl = conn.body.uri || conn.body.databaseURL || conn.body.connectionString;
    if (!databaseUrl) {
      console.warn('No DATABASE_URL found in connection info. Please set the env var manually.');
    } else {
      await createEnvVar(backend.body.id, { key: 'DATABASE_URL', value: databaseUrl });
    }

    await createEnvVar(backend.body.id, { key: 'NODE_ENV', value: 'production' });
    await createEnvVar(backend.body.id, { key: 'JWT_SECRET', generateValue: true });

    const backendUrl = backend.body.serviceDetails?.service?.url || backend.body.serviceDetails?.service?.externalUrl || backend.body.serviceDetails?.serviceURL || backend.body.serviceDetails?.service?.url || backend.body.id;
    console.log('Deployment summary:', {
      databaseId: db.body.id,
      backendId: backend.body.id,
      clientId: client.body.id,
      backendUrl: backend.body.serviceDetails?.service?.url || backend.body.serviceDetails?.service?.externalUrl || 'unknown'
    });
  } catch (error) {
    console.error('Deployment failed', error);
  }
})();
