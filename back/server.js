const { start } = require('../shared/server');
start((req, res) => {
  if (req.url.split('?')[0] !== '/api/hello') {
    res.writeHead(404); res.end('Route introuvable'); return;
  }
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({
    message: process.env.HELLO_MESSAGE || 'Bonjour depuis mon cloud Docker !',
    service: 'back'
  }));
});
