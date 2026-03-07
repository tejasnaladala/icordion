const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const selfsigned = require('selfsigned');

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

(async () => {
  try {
    let key, cert;

    if (fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH)) {
      key = fs.readFileSync(KEY_PATH, 'utf8');
      cert = fs.readFileSync(CERT_PATH, 'utf8');
    } else {
      const ip = getLocalIP();
      const pems = await selfsigned.generate(
        [{ name: 'commonName', value: 'icordion' }],
        {
          days: 365,
          keySize: 2048,
          algorithm: 'sha256',
          extensions: [
            { name: 'subjectAltName', altNames: [
              { type: 2, value: 'localhost' },
              { type: 7, ip: '127.0.0.1' },
              { type: 7, ip: ip },
            ]},
          ],
        }
      );
      fs.mkdirSync(CERT_DIR, { recursive: true });
      fs.writeFileSync(KEY_PATH, pems.private);
      fs.writeFileSync(CERT_PATH, pems.cert);
      key = pems.private;
      cert = pems.cert;
    }

    https.createServer({ key, cert }, app).listen(HTTPS_PORT, '0.0.0.0', () => {
      const ip = getLocalIP();
      console.log(`  > https://localhost:${HTTPS_PORT}`);
      console.log(`  > https://${ip}:${HTTPS_PORT}  <-- use this on iphone`);
      console.log(`  > (tap Advanced > Continue on the cert warning)\n`);
    });
  } catch (e) {
    console.log(`  > https failed: ${e.message}`);
    console.log(`  > accelerometer wont work on ios without https\n`);
  }
})();
