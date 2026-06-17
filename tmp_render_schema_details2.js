const https = require('https');
https.get('https://api-docs.render.com/openapi/render-public-api-1.json', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const spec = JSON.parse(data);
    const serviceType = spec.components.schemas.serviceType;
    const web = spec.components.schemas.webServiceDetailsPOST;
    const staticSite = spec.components.schemas.staticSiteDetailsPOST;
    console.log('serviceType', JSON.stringify(serviceType, null, 2));
    console.log('webServiceDetailsPOST', JSON.stringify(web, null, 2));
    console.log('staticSiteDetailsPOST', JSON.stringify(staticSite, null, 2));
  });
}).on('error', e => console.error(e));
