const fs = require('node:fs');
const path = require('node:path');
const { start } = require('../shared/server');
const html = fs.readFileSync(path.join(__dirname, 'index.html'));
start((req, res) => {
  if (req.url.split('?')[0] !== '/') {
    res.writeHead(404); res.end('Page introuvable'); return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});
