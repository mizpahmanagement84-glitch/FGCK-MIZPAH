const https = require('https');
const API_KEY = 'rnd_qDeRlIB9gKOzUPfvCmrTNREHYHqO';
const paths = ['/v1/accounts', '/v1/organizations', '/v1/environments', '/v1/owners', '/v1/services?limit=1'];
const request = (path) => new Promise((resolve, reject) => {
  https.get({ hostname: 'api.render.com', path, method: 'GET', headers: { Authorization: 'Bearer ' + API_KEY, Accept: 'application/json' } }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try { resolve({ status: res.statusCode, body: JSON.parse(data || '{}') }); }
      catch (e) { resolve({ status: res.statusCode, body: data }); }
    });
  }).on('error', reject);
});
(async () => {
  for (const path of paths) {
    const res = await request(path);
    console.log('PATH', path, 'STATUS', res.status);
    console.log(JSON.stringify(res.body, null, 2));
  }
})();
