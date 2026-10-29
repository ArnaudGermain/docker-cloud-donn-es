const http = require('node:http');

function start(handler) {
  const args = process.argv.slice(2);
  if (args.some(arg => !/^--port=\d+$/.test(arg)) || args.length > 1) {
    throw new Error('Argument attendu : --port=8080');
  }
  const port = Number(args[0]?.split('=')[1] ?? 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Port invalide');
  }
  const server = http.createServer((req, res) => {
    if (req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok\n');
      return;
    }
    handler(req, res);
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 5000;
  server.keepAliveTimeout = 5000;
  server.on('error', error => { console.error(error); process.exit(1); });
  server.listen(port, '0.0.0.0', () => console.log(`Écoute sur :${port}`));

  let stopping = false;
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => {
      if (stopping) return;
      stopping = true;
      console.log(`${signal} : arrêt propre`);
      const timer = setTimeout(() => {
        console.error('Délai d’arrêt dépassé');
        server.closeAllConnections();
        process.exit(1);
      }, 8000);
      server.close(() => {
        clearTimeout(timer);
        console.log('Arrêt terminé');
      });
    });
  }
  return server;
}
module.exports = { start };
