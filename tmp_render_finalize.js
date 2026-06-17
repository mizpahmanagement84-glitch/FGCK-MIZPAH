const https = require('https');
const API_KEY = 'rnd_qDeRlIB9gKOzUPfvCmrTNREHYHqO';
const OWNER_ID = 'tea-d8m41geiifgc7385t7e0';
const NEON_DATABASE_URL = process.argv[2] || 'postgresql://fgck_mizpah_user:10B6vMnrJ0t8somfBZcY6o2mVBibjPgU@dpg-d8m5gmq8qa3s73b3i140-a/fgck_mizpah';
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
        let parsed;
        try { parsed = JSON.parse(data || '{}'); } catch (e) { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function createService(body) {
  return request('/v1/services', 'POST', body);
}

async function createEnvVar(serviceId, envVar) {
  return request(`/v1/services/${serviceId}/env-vars`, 'POST', envVar);
}

function genSecret(len = 32) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

(async () => {
  console.log('Using Neon DATABASE_URL:', NEON_DATABASE_URL.replace(/:[^:@]+@/, ':<redacted>@'));
  try {
    console.log('Creating backend service (mizpah-server)...');
    const backendPayload = {
      type: 'web_service',
      name: 'mizpah-server',
      ownerId: OWNER_ID,
      repo: 'https://github.com/fgckmizpah-sudo/FGCK-MIZPAH.git',
      branch: 'main',
      rootDir: 'server',
      serviceDetails: {
        runtime: 'node',
        envSpecificDetails: {
          buildCommand: 'npm install',
          startCommand: 'npm start'
        }
      }
    };
    const backend = await createService(backendPayload);
    console.log('BACKEND CREATE', backend.status);
    if (backend.status >= 400) {
      console.error('Backend create failed:', JSON.stringify(backend.body, null, 2));
      process.exit(1);
    }

    console.log('Creating client service (mizpah-client)...');
    const clientPayload = {
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
    };
    const client = await createService(clientPayload);
    console.log('CLIENT CREATE', client.status);
    if (client.status >= 400) {
      console.error('Client create failed:', JSON.stringify(client.body, null, 2));
      process.exit(1);
    }

    const backendId = backend.body?.id;
    const clientId = client.body?.id;

    if (!backendId) {
      console.warn('No backend ID returned; cannot set env vars automatically. Please set envs manually in Render dashboard.');
      process.exit(1);
    }

    console.log('Setting DATABASE_URL, NODE_ENV, JWT_SECRET on backend...');
    const jwt = genSecret(40);
    const envs = [
      { key: 'DATABASE_URL', value: NEON_DATABASE_URL },
      { key: 'NODE_ENV', value: 'production' },
      { key: 'JWT_SECRET', value: jwt }
    ];
    for (const e of envs) {
      const r = await createEnvVar(backendId, e);
      console.log('ENV SET', e.key, r.status, JSON.stringify(r.body, null, 2));
      if (r.status >= 400) {
        console.error('Failed to set env var', e.key, r.body);
      }
    }

    // Attempt to read backend URL from returned service body
    const backendUrl = backend.body?.serviceDetails?.service?.url || backend.body?.serviceDetails?.serviceURL || backend.body?.externalUrl || null;
    if (backendUrl && clientId) {
      const viteUrl = `${backendUrl.replace(/\/$/, '')}/api`;
      console.log('Setting VITE_API_BASE_URL on client to', viteUrl);
      const r = await createEnvVar(clientId, { key: 'VITE_API_BASE_URL', value: viteUrl });
      console.log('CLIENT ENV SET', r.status, JSON.stringify(r.body, null, 2));
    } else {
      console.warn('Could not determine backend public URL; set VITE_API_BASE_URL manually after deployment.');
    }

    console.log('Done. Backend ID:', backendId, 'Client ID:', clientId);
    console.log('If API calls failed with payment required, add billing in Render and re-run this script.');
  } catch (e) {
    console.error('Script error', e);
    process.exit(1);
  }
})();
