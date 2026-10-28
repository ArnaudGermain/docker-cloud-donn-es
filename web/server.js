const http = require('node:http');
const { start } = require('../shared/server');
function upstream(name) {
  const url = new URL(process.env[name]);
  if (url.protocol !== 'http:' || url.username || url.password) {
    throw new Error(`${name} doit être une URL HTTP sans identifiants`);
  }
  return url;
}
const front = upstream('FRONT_URL');
const back = upstream('BACK_URL');
start((req, res) => {
  const target = req.url.startsWith('/api/') ? back : front;
  const proxy = http.request({
    hostname: target.hostname,
    port: target.port || 80,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: target.host }
  }, response => {
    res.writeHead(response.statusCode, response.headers);
    response.pipe(res);
    response.on('error', () => res.destroy());
  });
  proxy.setTimeout(5000, () => proxy.destroy(new Error('Timeout upstream')));
  proxy.on('error', error => {
    console.error(error.message);
    if (res.destroyed) return;
    if (res.headersSent) { res.destroy(); return; }
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Service indisponible');
  });
  req.on('aborted', () => proxy.destroy());
  req.on('error', () => proxy.destroy());
  res.on('close', () => { if (!res.writableFinished) proxy.destroy(); });
  req.pipe(proxy);
});
