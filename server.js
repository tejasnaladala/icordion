const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const os = require('os');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Room management
const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

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

wss.on('connection', (ws) => {
  let clientRoom = null;
  let clientId = null;
  let clientType = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'create-room': {
        const code = generateRoomCode();
        rooms.set(code, { host: ws, clients: new Map(), created: Date.now() });
        clientRoom = code;
        clientId = msg.deviceId;
        clientType = 'desktop';
        ws.send(JSON.stringify({ type: 'room-created', code, ip: getLocalIP(), port: PORT }));
        break;
      }

      case 'join-room': {
        const room = rooms.get(msg.code);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
          return;
        }
        clientRoom = msg.code;
        clientId = msg.deviceId;
        clientType = msg.deviceType || 'mobile';
        room.clients.set(clientId, { ws, type: clientType });
        ws.send(JSON.stringify({ type: 'joined', code: msg.code }));
        // Notify host
        if (room.host.readyState === 1) {
          room.host.send(JSON.stringify({
            type: 'device-connected',
            deviceId: clientId,
            deviceType: clientType,
            count: room.clients.size
          }));
        }
        break;
      }

      case 'note-on':
      case 'note-off':
      case 'bellows':
      case 'chord-on':
      case 'chord-off': {
        if (!clientRoom) return;
        const room = rooms.get(clientRoom);
        if (!room) return;
        const payload = JSON.stringify({ ...msg, deviceId: clientId });
        // Send to host (desktop)
        if (room.host && room.host !== ws && room.host.readyState === 1) {
          room.host.send(payload);
        }
        // Broadcast to other clients in the room
        room.clients.forEach((client, id) => {
          if (id !== clientId && client.ws.readyState === 1) {
            client.ws.send(payload);
          }
        });
        break;
      }
    }
  });

  ws.on('close', () => {
    if (!clientRoom) return;
    const room = rooms.get(clientRoom);
    if (!room) return;

    if (clientType === 'desktop') {
      // Host disconnected - notify clients and remove room
      room.clients.forEach((client) => {
        if (client.ws.readyState === 1) {
          client.ws.send(JSON.stringify({ type: 'room-closed' }));
        }
      });
      rooms.delete(clientRoom);
    } else {
      room.clients.delete(clientId);
      if (room.host && room.host.readyState === 1) {
        room.host.send(JSON.stringify({
          type: 'device-disconnected',
          deviceId: clientId,
          count: room.clients.size
        }));
      }
    }
  });
});

// Cleanup stale rooms every 30 minutes
setInterval(() => {
  const now = Date.now();
  rooms.forEach((room, code) => {
    if (now - room.created > 3600000 && room.clients.size === 0) {
      rooms.delete(code);
    }
  });
}, 1800000);

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log(`\n  Accordion Server running!\n`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://${ip}:${PORT}\n`);
  console.log(`  Open the network URL on your iPhone to play!\n`);
});
