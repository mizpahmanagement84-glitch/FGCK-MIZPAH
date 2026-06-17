const https = require('https');
const fs = require('fs');
const API_KEY = 'rnd_qDeRlIB9gKOzUPfvCmrTNREHYHqO';
function request(opts, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({status: res.statusCode, body: JSON.parse(data || '{}')});
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
  const user = await request({hostname:'api.render.com', path:'/v1/users', method:'GET', headers:{Authorization:'Bearer '+API_KEY, Accept:'application/json'}});
  console.log('USER', user.status);
  console.log(JSON.stringify(user.body, null, 2));
  const spec = await request({hostname:'api-docs.render.com', path:'/openapi/render-public-api-1.json', method:'GET'});
  const schema = spec.body.components.schemas.servicePOST;
  const pgSchema = spec.body.components.schemas.postgresPOSTInput;
  console.log('SERVICE KEYS', Object.keys(schema.properties));
  console.log('SERVICE REQUIRED', schema.required);
  console.log('PG KEYS', Object.keys(pgSchema.properties));
  console.log('PG REQUIRED', pgSchema.required);
  console.log('service ownerID schema', JSON.stringify(schema.properties.ownerID || 'missing', null, 2));
  console.log('postgres environmentId schema', JSON.stringify(pgSchema.properties.environmentId || 'missing', null, 2));
})();
