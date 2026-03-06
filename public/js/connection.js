// WebSocket connection for multi-device communication

export class DeviceConnection {
  constructor({ type = 'mobile', onMessage, onConnect, onDisconnect } = {}) {
    this.ws = null;
    this.deviceType = type;
    this.deviceId = 'dev_' + Math.random().toString(36).substr(2, 8);
    this.onMessage = onMessage || (() => {});
    this.onConnect = onConnect || (() => {});
    this.onDisconnect = onDisconnect || (() => {});
    this.connected = false;
    this._reconnectTimer = null;
    this._intentionalClose = false;
  }

  connect() {
    if (this.ws && this.ws.readyState <= 1) return;

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${location.host}`);

    this.ws.onopen = () => {
      this.connected = true;
      this.onConnect();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onMessage(data);
      } catch {}
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.onDisconnect();

      if (!this._intentionalClose) {
        this._reconnectTimer = setTimeout(() => this.connect(), 2000);
      }
    };

    this.ws.onerror = () => {};
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        ...data,
        deviceId: this.deviceId
      }));
    }
  }

  createRoom() {
    this.send({ type: 'create-room' });
  }

  joinRoom(code) {
    this.send({
      type: 'join-room',
      code: code.toUpperCase(),
      deviceType: this.deviceType
    });
  }

  // Send note events
  sendNoteOn(midi) {
    this.send({ type: 'note-on', midi });
  }

  sendNoteOff(midi) {
    this.send({ type: 'note-off', midi });
  }

  sendBellows(pressure) {
    this.send({ type: 'bellows', pressure });
  }

  sendChordOn(label, midis) {
    this.send({ type: 'chord-on', label, midis });
  }

  sendChordOff(label) {
    this.send({ type: 'chord-off', label });
  }

  disconnect() {
    this._intentionalClose = true;
    clearTimeout(this._reconnectTimer);
    if (this.ws) {
      this.ws.close();
    }
  }
}
