const https = require('https');
https.get('https://api-docs.render.com/openapi/render-public-api-1.json', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const spec = JSON.parse(data);
    console.log('webServiceDetailsPOST');
    console.log(JSON.stringify(spec.components.schemas.webServiceDetailsPOST, null, 2));
    console.log('\nenvSpecificDetailsPOST');
    console.log(JSON.stringify(spec.components.schemas.envSpecificDetailsPOST, null, 2));
  });
}).on('error', console.error);
