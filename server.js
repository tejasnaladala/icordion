const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
const HTTP_PORT = 3000;
const HTTPS_PORT = 3443;

app.use(express.static(path.join(__dirname, 'public')));

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// http always works
http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log(`\n  > icordion running`);
  console.log(`  > http://localhost:${HTTP_PORT}`);
  console.log(`  > http://${ip}:${HTTP_PORT}`);
});

// try to start https too (needed for accelerometer on ios)
const CERT_DIR = path.join(__dirname, '.certs');
const KEY_PATH = path.join(CERT_DIR, 'key.pem');
const CERT_PATH = path.join(CERT_DIR, 'cert.pem');

try {
  if (!fs.existsSync(KEY_PATH)) {
    fs.mkdirSync(CERT_DIR, { recursive: true });
    execSync(
      `openssl req -x509 -newkey rsa:2048 -keyout "${KEY_PATH}" -out "${CERT_PATH}" -days 365 -nodes -subj "/CN=accordion"`,
      { stdio: 'ignore' }
    );
  }

  https.createServer({
    key: fs.readFileSync(KEY_PATH),
    cert: fs.readFileSync(CERT_PATH),
  }, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    const ip = getLocalIP();
    console.log(`  > https://localhost:${HTTPS_PORT}`);
    console.log(`  > https://${ip}:${HTTPS_PORT}  <-- use this on iphone`);
    console.log(`  > (tap Advanced > Continue on the cert warning)\n`);
  });
} catch (e) {
  console.log(`  > https not available (openssl missing?) - accelerometer wont work on ios`);
  console.log(`  > install openssl and restart to fix\n`);
}
