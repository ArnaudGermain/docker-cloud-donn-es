const http = require('node:http');

function start(handler) {
  const server = http.createServer(handler);
  server.listen(8080, '0.0.0.0', () => {
    console.log('Serveur démarré sur le port 8080');
  });
  return server;
}

module.exports = { start };
