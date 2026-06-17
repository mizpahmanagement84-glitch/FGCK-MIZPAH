const https = require('https');
const fs = require('fs');
https.get('https://api-docs.render.com/openapi/render-public-api-1.json', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const spec = JSON.parse(data);
    const service = spec.components.schemas.servicePOST;
    const postgres = spec.components.schemas.postgresPOSTInput;
    console.log('SERVICE schema:', JSON.stringify(service, null, 2));
    console.log('POSTGRES schema:', JSON.stringify(postgres, null, 2));
  });
}).on('error', e => console.error(e));
