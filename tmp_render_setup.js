const https = require('https');
const API_KEY='rnd_qDeRlIB9gKOzUPfvCmrTNREHYHqO';
function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data='';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data || '{}');
          resolve({status: res.statusCode, body: json});
        } catch (e) {
          resolve({status: res.statusCode, body: data});
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}
(async () => {
  const host = 'api.render.com';
  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };

  const create = async (path, body) => {
    const res = await request({hostname: host, path, method: 'POST', headers}, body);
    console.log('CREATE', path, res.status, JSON.stringify(res.body, null, 2));
    return res;
  };

  console.log('Creating backend service...');
  const backend = await create('/v1/services', {
    name: 'mizpah-server',
    serviceDetails: {
      env: 'node',
      repo: 'https://github.com/fgckmizpah-sudo/FGCK-MIZPAH.git',
      branch: 'main',
      buildCommand: 'npm --prefix server install',
      startCommand: 'npm --prefix server start'
    }
  });

  console.log('Creating client service...');
  const client = await create('/v1/services', {
    name: 'mizpah-client',
    serviceDetails: {
      env: 'static',
      repo: 'https://github.com/fgckmizpah-sudo/FGCK-MIZPAH.git',
      branch: 'main',
      buildCommand: 'npm --prefix client install && npm --prefix client run build',
      publishPath: 'client/dist'
    }
  });

  console.log('Creating Postgres DB...');
  const db = await create('/v1/postgres', {
    name: 'mizpah-db',
    plan: 'starter',
    region: 'oregon'
  });

  console.log(JSON.stringify({backend: backend.body, client: client.body, db: db.body}, null, 2));
})();
