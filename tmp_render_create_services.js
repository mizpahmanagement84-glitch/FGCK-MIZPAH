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
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let body;
        try { body = JSON.parse(data || '{}'); }
        catch (e) { body = data; }
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function createService(serviceData) {
  const res = await request('/v1/services', 'POST', serviceData);
  console.log(`CREATE SERVICE ${serviceData.name}:`, res.status, JSON.stringify(res.body, null, 2));
  return res;
}

async function createEnvVar(serviceId, envVar) {
  const res = await request(`/v1/services/${serviceId}/env-vars`, 'POST', envVar);
  console.log(`CREATE ENV VAR ${serviceId} ${envVar.key}:`, res.status, JSON.stringify(res.body, null, 2));
  return res;
}

(async () => {
  try {
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
    if (backend.status >= 400) {
      console.error('Backend service creation failed.');
      return;
    }

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
    if (client.status >= 400) {
      console.error('Client service creation failed.');
      return;
    }

    const backendId = backend.body?.id;
    if (backendId) {
      await createEnvVar(backendId, { key: 'NODE_ENV', value: 'production' });
      await createEnvVar(backendId, { key: 'JWT_SECRET', generateValue: true });
      await createEnvVar(backendId, { key: 'DATABASE_URL', value: 'postgresql://<username>:<password>@<your-neon-host>:5432/<database>?sslmode=require' });
    }

    console.log('Render services created. Replace DATABASE_URL with your Neon connection string in mizpah-server env vars.');
    console.log('Backend service ID:', backendId);
    console.log('Client service ID:', client.body?.id);
    console.log('Neon connection string format: postgresl://<username>:<password>@<host>:5432/<database>?sslmode=require');
  } catch (error) {
    console.error('Deployment failed:', error);
  }
})();
