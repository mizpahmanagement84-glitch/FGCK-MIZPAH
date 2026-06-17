const https = require('https');
const fs = require('fs');
https.get('https://api-docs.render.com/openapi/render-public-api-1.json', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const spec = JSON.parse(data);
    const paths = Object.keys(spec.paths);
    const useful = paths.filter(p => p.includes('/v1/') || p.includes('/services') || p.includes('/postgres') || p.includes('/accounts') || p.includes('/users') || p.includes('/env-groups') || p.includes('/static-sites'));
    console.log('useful paths count', useful.length);
    useful.slice(0, 200).forEach(p => console.log(p));
    const createPaths = paths.filter(p => (p.includes('/services') || p.includes('/postgres') || p.includes('/accounts') || p.includes('/ops')) && spec.paths[p].post);
    console.log('create candidates:', createPaths);
    createPaths.forEach(p => {
      try {
        const schema = spec.paths[p].post.requestBody?.content?.['application/json']?.schema;
        if (schema) {
          console.log('---', p);
          console.log(JSON.stringify(schema, null, 2).slice(0, 2000));
        }
      } catch (e) { }
    });
  });
}).on('error', e => console.error(e));
