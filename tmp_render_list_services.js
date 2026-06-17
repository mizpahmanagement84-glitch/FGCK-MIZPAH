const https = require('https');
const API_KEY = 'rnd_qDeRlIB9gKOzUPfvCmrTNREHYHqO';
function request(path) {
  return new Promise((resolve, reject) => {
    https.get({ hostname: 'api.render.com', path, method: 'GET', headers: { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data || '{}') }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    }).on('error', reject);
  });
}
(async () => {
  const services = await request('/v1/services?limit=100');
  console.log('SERVICES', services.status);
  console.log(JSON.stringify(services.body, null, 2));
})();
