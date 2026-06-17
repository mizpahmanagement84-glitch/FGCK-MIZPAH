const https = require('https');
https.get('https://api-docs.render.com/openapi/render-public-api-1.json', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const spec = JSON.parse(data);
    console.log('nativeEnvironmentDetailsPOST');
    console.log(JSON.stringify(spec.components.schemas.nativeEnvironmentDetailsPOST, null, 2));
    console.log('\ndockerDetailsPOST');
    console.log(JSON.stringify(spec.components.schemas.dockerDetailsPOST, null, 2));
  });
}).on('error', console.error);
