const http = require('node:http');
const req = http.get('http://127.0.0.1:8080/healthz', res => {
  res.resume(); process.exit(res.statusCode === 200 ? 0 : 1);
});
req.setTimeout(2000, () => { req.destroy(); process.exit(1); });
req.on('error', () => process.exit(1));
