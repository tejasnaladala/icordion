const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const app = express();
const HTTP_PORT = 3000;
const HTTPS_PORT = 3443;

app.use(express.static(path.join(__dirname, 'public')));

function getAllLocalIPs() {
  const ips = [];
  const interfaces = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const iface of addrs) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ ip: iface.address, name });
      }
    }
  }
  return ips;
}

// http always works
http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => {
  const ips = getAllLocalIPs();
  console.log(`\n  > icordion running`);
  console.log(`  > http://localhost:${HTTP_PORT}`);
  ips.forEach(({ ip, name }) => console.log(`  > http://${ip}:${HTTP_PORT}  (${name})`));
});

// try to start https too (needed for accelerometer on ios)
const CERT_DIR = path.join(__dirname, '.certs');
const KEY_PATH = path.join(CERT_DIR, 'key.pem');
const CERT_PATH = path.join(CERT_DIR, 'cert.pem');

try {
  if (!fs.existsSync(KEY_PATH) || !fs.existsSync(CERT_PATH)) {
    fs.mkdirSync(CERT_DIR, { recursive: true });
    const ips = getAllLocalIPs();
    const san = ['DNS:localhost', 'IP:127.0.0.1', ...ips.map(({ ip }) => `IP:${ip}`)].join(',');
    execFileSync('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048',
      '-keyout', KEY_PATH, '-out', CERT_PATH,
      '-days', '365', '-nodes',
      '-subj', '/CN=icordion',
      '-addext', `subjectAltName=${san}`,
    ], { stdio: 'ignore' });
  }

  const ips = getAllLocalIPs();
  https.createServer({
    key: fs.readFileSync(KEY_PATH),
    cert: fs.readFileSync(CERT_PATH),
  }, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`  > https://localhost:${HTTPS_PORT}`);
    ips.forEach(({ ip, name }) => console.log(`  > https://${ip}:${HTTPS_PORT}  (${name})`));
    console.log(`  > use your Wi-Fi ip on iphone`);
    console.log(`  > (tap Advanced > Continue on the cert warning)\n`);
  });
} catch (e) {
  console.log(`  > https not available (openssl missing?) - accelerometer wont work on ios\n`);
}
