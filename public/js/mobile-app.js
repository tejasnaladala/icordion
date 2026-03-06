import { AudioEngine, midiToNoteName } from './audio-engine.js';
import { BellowsController } from './bellows.js';
import { DeviceConnection } from './connection.js';

// Note layout configuration
const TREBLE_ROWS = [
  // Row 1: sharps (octave 4)
  { type: 'sharp', notes: [
    { midi: 61, label: 'C#' },
    { midi: 63, label: 'D#' },
    { midi: 66, label: 'F#' },
    { midi: 68, label: 'G#' },
    { midi: 70, label: 'A#' },
  ]},
  // Row 2: naturals (octave 4)
  { type: 'natural', notes: [
    { midi: 60, label: 'C' },
    { midi: 62, label: 'D' },
    { midi: 64, label: 'E' },
    { midi: 65, label: 'F' },
    { midi: 67, label: 'G' },
    { midi: 69, label: 'A' },
    { midi: 71, label: 'B' },
  ]},
  // Row 3: sharps (octave 5)
  { type: 'sharp', notes: [
    { midi: 73, label: 'C#' },
    { midi: 75, label: 'D#' },
    { midi: 78, label: 'F#' },
    { midi: 80, label: 'G#' },
    { midi: 82, label: 'A#' },
  ]},
  // Row 4: naturals (octave 5)
  { type: 'natural', notes: [
    { midi: 72, label: 'C' },
    { midi: 74, label: 'D' },
    { midi: 76, label: 'E' },
    { midi: 77, label: 'F' },
    { midi: 79, label: 'G' },
    { midi: 81, label: 'A' },
    { midi: 83, label: 'B' },
  ]},
];

const BASS_BUTTONS = [
  { label: 'C',  midis: [36, 48, 52, 55] },  // C major
  { label: 'F',  midis: [41, 53, 57, 60] },  // F major
  { label: 'G',  midis: [43, 55, 59, 62] },  // G major
  { label: 'Dm', midis: [38, 50, 53, 57] },  // D minor
  { label: 'Am', midis: [33, 45, 48, 52] },  // A minor
  { label: 'E',  midis: [40, 52, 56, 59] },  // E major
];

// State
let audio = null;
let bellows = null;
let connection = null;
let bellowsFill = null;

// Build the accordion key UI
function buildKeys() {
  const rowIds = ['sharps-row', 'naturals-row-1', 'sharps-row-2', 'naturals-row-2'];

  TREBLE_ROWS.forEach((row, i) => {
    const container = document.getElementById(rowIds[i]);
    row.notes.forEach(note => {
      const btn = document.createElement('div');
      btn.className = `acc-key ${row.type}`;
      btn.textContent = note.label;
      btn.dataset.midi = note.midi;
      container.appendChild(btn);
    });
  });

  const bassRow = document.getElementById('bass-row');
  BASS_BUTTONS.forEach(chord => {
    const btn = document.createElement('div');
    btn.className = 'bass-key';
    btn.textContent = chord.label;
    btn.dataset.chord = chord.label;
    btn.dataset.midis = JSON.stringify(chord.midis);
    bassRow.appendChild(btn);
  });
}

// Touch handling for treble keys
function setupTouchHandlers() {
  const keysSection = document.querySelector('.keys-section');
  const bassSection = document.querySelector('.bass-section');
  const activeTouches = new Map(); // touchId -> element

  function findKeyFromTouch(touch) {
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el && (el.classList.contains('acc-key') || el.classList.contains('bass-key'))) {
      return el;
    }
    return null;
  }

  function handleTouchStart(e) {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      const key = findKeyFromTouch(touch);
      if (!key) continue;

      activeTouches.set(touch.identifier, key);
      key.classList.add('active');

      if (key.classList.contains('bass-key')) {
        const label = key.dataset.chord;
        const midis = JSON.parse(key.dataset.midis);
        audio.chordOn(midis, label);
        connection?.sendChordOn(label, midis);
      } else {
        const midi = parseInt(key.dataset.midi);
        audio.noteOn(midi);
        connection?.sendNoteOn(midi);
      }
    }
  }

  function handleTouchEnd(e) {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      const key = activeTouches.get(touch.identifier);
      if (!key) continue;

      key.classList.remove('active');
      activeTouches.delete(touch.identifier);

      if (key.classList.contains('bass-key')) {
        const label = key.dataset.chord;
        audio.chordOff(label);
        connection?.sendChordOff(label);
      } else {
        const midi = parseInt(key.dataset.midi);
        audio.noteOff(midi);
        connection?.sendNoteOff(midi);
      }
    }
  }

  function handleTouchMove(e) {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      const currentKey = activeTouches.get(touch.identifier);
      const newKey = findKeyFromTouch(touch);

      if (newKey !== currentKey) {
        // Release old key
        if (currentKey) {
          currentKey.classList.remove('active');
          if (currentKey.classList.contains('bass-key')) {
            audio.chordOff(currentKey.dataset.chord);
            connection?.sendChordOff(currentKey.dataset.chord);
          } else {
            const midi = parseInt(currentKey.dataset.midi);
            audio.noteOff(midi);
            connection?.sendNoteOff(midi);
          }
        }

        // Press new key
        if (newKey) {
          newKey.classList.add('active');
          activeTouches.set(touch.identifier, newKey);
          if (newKey.classList.contains('bass-key')) {
            const label = newKey.dataset.chord;
            const midis = JSON.parse(newKey.dataset.midis);
            audio.chordOn(midis, label);
            connection?.sendChordOn(label, midis);
          } else {
            const midi = parseInt(newKey.dataset.midi);
            audio.noteOn(midi);
            connection?.sendNoteOn(midi);
          }
        } else {
          activeTouches.delete(touch.identifier);
        }
      }
    }
  }

  [keysSection, bassSection].forEach(section => {
    section.addEventListener('touchstart', handleTouchStart, { passive: false });
    section.addEventListener('touchend', handleTouchEnd, { passive: false });
    section.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    section.addEventListener('touchmove', handleTouchMove, { passive: false });
  });

  // Mouse fallback for desktop testing
  let mouseDown = false;
  let mouseTarget = null;

  document.addEventListener('mousedown', (e) => {
    const key = e.target.closest('.acc-key, .bass-key');
    if (!key) return;
    mouseDown = true;
    mouseTarget = key;
    key.classList.add('active');

    if (key.classList.contains('bass-key')) {
      const label = key.dataset.chord;
      const midis = JSON.parse(key.dataset.midis);
      audio.chordOn(midis, label);
    } else {
      audio.noteOn(parseInt(key.dataset.midi));
    }
  });

  document.addEventListener('mouseup', () => {
    if (!mouseDown || !mouseTarget) return;
    mouseDown = false;
    mouseTarget.classList.remove('active');

    if (mouseTarget.classList.contains('bass-key')) {
      audio.chordOff(mouseTarget.dataset.chord);
    } else {
      audio.noteOff(parseInt(mouseTarget.dataset.midi));
    }
    mouseTarget = null;
  });
}

// Bellows pressure update
function onBellowsChange(pressure) {
  audio?.setBellows(pressure);
  bellowsFill.style.width = `${pressure * 100}%`;

  // Throttle network sends
  if (connection?.connected && Math.random() < 0.3) {
    connection.sendBellows(pressure);
  }
}

// Initialize
async function init() {
  bellowsFill = document.getElementById('bellows-fill');

  buildKeys();

  const startBtn = document.getElementById('start-btn');
  const startScreen = document.getElementById('start-screen');
  const accordionUI = document.getElementById('accordion-ui');
  const joinBtn = document.getElementById('join-btn');
  const roomInput = document.getElementById('room-code-input');
  const statusDot = document.getElementById('connection-status');

  startBtn.addEventListener('click', async () => {
    // Init audio (must be triggered by user gesture)
    audio = new AudioEngine();
    audio.init();

    // Init bellows
    bellows = new BellowsController(onBellowsChange);
    try {
      await bellows.start();
    } catch (err) {
      // Accelerometer not available - use fallback
      console.log('Accelerometer not available, using manual bellows');
      bellows.setManual(0.7);
    }

    // Setup touch handlers
    setupTouchHandlers();

    // Show accordion UI
    startScreen.style.display = 'none';
    accordionUI.classList.remove('hidden');
  });

  // Room joining
  connection = new DeviceConnection({
    type: 'mobile',
    onMessage: (msg) => {
      if (msg.type === 'joined') {
        statusDot.className = 'connection-dot connected';
      } else if (msg.type === 'room-closed') {
        statusDot.className = 'connection-dot disconnected';
      } else if (msg.type === 'error') {
        alert(msg.message);
      }
    },
    onConnect: () => {},
    onDisconnect: () => {
      statusDot.className = 'connection-dot disconnected';
    }
  });

  joinBtn.addEventListener('click', () => {
    const code = roomInput.value.trim().toUpperCase();
    if (code.length !== 4) {
      alert('Enter a 4-character room code');
      return;
    }
    connection.connect();
    // Wait for connection before joining
    const checkInterval = setInterval(() => {
      if (connection.connected) {
        clearInterval(checkInterval);
        connection.joinRoom(code);
      }
    }, 100);
  });
}

init();
