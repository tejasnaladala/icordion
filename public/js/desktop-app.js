import { AudioEngine, midiToNoteName } from './audio-engine.js';
import { BellowsController } from './bellows.js';
import { DeviceConnection } from './connection.js';

let audio = null;
let bellows = null;
let connection = null;
let visualizerCtx = null;
let visualizerCanvas = null;
let activeNoteSet = new Set();
let animFrameId = null;

// Desktop keyboard -> MIDI mapping
const KEY_MAP = {
  'a': 60, 'w': 61, 's': 62, 'e': 63, 'd': 64,
  'f': 65, 't': 66, 'g': 67, 'y': 68, 'h': 69,
  'u': 70, 'j': 71, 'k': 72, 'o': 73, 'l': 74,
};

const connectedDevices = new Map();

function updateActiveNotes() {
  const container = document.getElementById('active-notes');
  if (activeNoteSet.size === 0) {
    container.innerHTML = '<p class="no-notes">Waiting for input...</p>';
    return;
  }
  container.innerHTML = '';
  activeNoteSet.forEach(midi => {
    const badge = document.createElement('span');
    badge.className = 'note-badge';
    badge.textContent = midiToNoteName(midi);
    container.appendChild(badge);
  });
}

function updateDevicesList() {
  const container = document.getElementById('devices-list');
  if (connectedDevices.size === 0) {
    container.innerHTML = '<p class="no-devices">No devices connected</p>';
    return;
  }
  container.innerHTML = '';
  connectedDevices.forEach((info, id) => {
    const div = document.createElement('div');
    div.className = 'device-item';
    div.innerHTML = `<span class="dot"></span> ${info.type} (${id.substr(0, 6)})`;
    container.appendChild(div);
  });
}

// Waveform visualizer
function drawVisualizer() {
  if (!visualizerCtx || !audio) return;

  const width = visualizerCanvas.width;
  const height = visualizerCanvas.height;

  // Get frequency data
  const freqData = audio.getFrequencyData();
  const waveData = audio.getAnalyserData();

  visualizerCtx.fillStyle = '#12122a';
  visualizerCtx.fillRect(0, 0, width, height);

  if (freqData) {
    // Draw frequency bars
    const barCount = 64;
    const barWidth = width / barCount;
    const step = Math.floor(freqData.length / barCount);

    for (let i = 0; i < barCount; i++) {
      const value = freqData[i * step] / 255;
      const barHeight = value * height * 0.8;

      const hue = 340 + (i / barCount) * 40; // red to pink gradient
      visualizerCtx.fillStyle = `hsla(${hue}, 80%, 55%, ${0.3 + value * 0.7})`;
      visualizerCtx.fillRect(
        i * barWidth + 1,
        height - barHeight,
        barWidth - 2,
        barHeight
      );
    }
  }

  if (waveData) {
    // Draw waveform overlay
    visualizerCtx.strokeStyle = '#e94560';
    visualizerCtx.lineWidth = 2;
    visualizerCtx.beginPath();

    const sliceWidth = width / waveData.length;
    let x = 0;

    for (let i = 0; i < waveData.length; i++) {
      const v = waveData[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        visualizerCtx.moveTo(x, y);
      } else {
        visualizerCtx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    visualizerCtx.stroke();
  }

  animFrameId = requestAnimationFrame(drawVisualizer);
}

function setupVisualizer() {
  visualizerCanvas = document.getElementById('visualizer');
  visualizerCtx = visualizerCanvas.getContext('2d');

  const resize = () => {
    const rect = visualizerCanvas.getBoundingClientRect();
    visualizerCanvas.width = rect.width * window.devicePixelRatio;
    visualizerCanvas.height = rect.height * window.devicePixelRatio;
    visualizerCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
  };

  resize();
  window.addEventListener('resize', resize);
  drawVisualizer();
}

// Keyboard playing
function setupKeyboard() {
  const pressedKeys = new Set();

  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;

    if (e.code === 'Space') {
      e.preventDefault();
      bellows.setManual(0.85);
      audio.setBellows(0.85);
      document.getElementById('dash-bellows-fill').style.width = '85%';
      return;
    }

    const midi = KEY_MAP[e.key.toLowerCase()];
    if (midi && !pressedKeys.has(e.key)) {
      pressedKeys.add(e.key);
      audio.noteOn(midi);
      activeNoteSet.add(midi);
      updateActiveNotes();
      connection?.sendNoteOn(midi);
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      bellows.setManual(0);
      audio.setBellows(0);
      document.getElementById('dash-bellows-fill').style.width = '0%';
      return;
    }

    const midi = KEY_MAP[e.key.toLowerCase()];
    if (midi) {
      pressedKeys.delete(e.key);
      audio.noteOff(midi);
      activeNoteSet.delete(midi);
      updateActiveNotes();
      connection?.sendNoteOff(midi);
    }
  });
}

// Initialize
function init() {
  // Init audio engine
  audio = new AudioEngine();
  audio.init();

  // Manual bellows for desktop
  bellows = new BellowsController((p) => {
    audio.setBellows(p);
    document.getElementById('dash-bellows-fill').style.width = `${p * 100}%`;
  });

  // Setup visualizer
  setupVisualizer();

  // Setup keyboard
  setupKeyboard();

  // Setup WebSocket connection
  connection = new DeviceConnection({
    type: 'desktop',
    onMessage: (msg) => {
      switch (msg.type) {
        case 'room-created': {
          const code = msg.code;
          const url = `http://${msg.ip}:${msg.port}/mobile.html`;

          document.getElementById('room-code').textContent = code;
          document.getElementById('display-code').textContent = code;
          document.getElementById('room-status').textContent = 'Room active';
          document.getElementById('connect-url').textContent = url;

          // Generate QR code
          if (typeof QRCode !== 'undefined') {
            QRCode.toCanvas(document.getElementById('qr-canvas'), url, {
              width: 200,
              margin: 2,
              color: { dark: '#e94560', light: '#1a1a2e' }
            });
          }
          break;
        }

        case 'device-connected':
          connectedDevices.set(msg.deviceId, { type: msg.deviceType });
          updateDevicesList();
          break;

        case 'device-disconnected':
          connectedDevices.delete(msg.deviceId);
          updateDevicesList();
          break;

        case 'note-on':
          audio.noteOn(msg.midi);
          activeNoteSet.add(msg.midi);
          updateActiveNotes();
          break;

        case 'note-off':
          audio.noteOff(msg.midi);
          activeNoteSet.delete(msg.midi);
          updateActiveNotes();
          break;

        case 'chord-on':
          audio.chordOn(msg.midis, msg.label);
          break;

        case 'chord-off':
          audio.chordOff(msg.label);
          break;

        case 'bellows':
          audio.setBellows(msg.pressure);
          document.getElementById('dash-bellows-fill').style.width =
            `${msg.pressure * 100}%`;
          break;
      }
    },
    onConnect: () => {
      connection.createRoom();
    },
    onDisconnect: () => {
      document.getElementById('room-status').textContent = 'Disconnected';
    }
  });

  connection.connect();
}

init();
