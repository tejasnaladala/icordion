import { AudioEngine } from './audio-engine.js';
import { BellowsController } from './bellows.js';

const ROWS = [
  { cls: 'sharps', notes: [
    { midi: 61, label: 'C#' }, { midi: 63, label: 'D#' },
    { midi: 66, label: 'F#' }, { midi: 68, label: 'G#' }, { midi: 70, label: 'A#' },
  ]},
  { cls: '', notes: [
    { midi: 60, label: 'C' }, { midi: 62, label: 'D' }, { midi: 64, label: 'E' },
    { midi: 65, label: 'F' }, { midi: 67, label: 'G' }, { midi: 69, label: 'A' },
    { midi: 71, label: 'B' },
  ]},
  { cls: 'sharps', notes: [
    { midi: 73, label: 'C#' }, { midi: 75, label: 'D#' },
    { midi: 78, label: 'F#' }, { midi: 80, label: 'G#' }, { midi: 82, label: 'A#' },
  ]},
  { cls: '', notes: [
    { midi: 72, label: 'C' }, { midi: 74, label: 'D' }, { midi: 76, label: 'E' },
    { midi: 77, label: 'F' }, { midi: 79, label: 'G' }, { midi: 81, label: 'A' },
    { midi: 83, label: 'B' },
  ]},
];

const BASS = [
  { label: 'C',  midis: [36, 48, 52, 55] },
  { label: 'F',  midis: [41, 53, 57, 60] },
  { label: 'G',  midis: [43, 55, 59, 62] },
  { label: 'Dm', midis: [38, 50, 53, 57] },
  { label: 'Am', midis: [33, 45, 48, 52] },
  { label: 'E',  midis: [40, 52, 56, 59] },
];

let audio, bellows;

function build() {
  const keysEl = document.getElementById('keys');
  ROWS.forEach(row => {
    const r = document.createElement('div');
    r.className = 'row' + (row.cls ? ` ${row.cls}` : '');
    row.notes.forEach(n => {
      const k = document.createElement('div');
      k.className = 'key' + (row.cls === 'sharps' ? ' s' : '');
      k.textContent = n.label;
      k.dataset.midi = n.midi;
      r.appendChild(k);
    });
    keysEl.appendChild(r);
  });

  const bassEl = document.getElementById('bass');
  const br = document.createElement('div');
  br.className = 'row';
  BASS.forEach(c => {
    const k = document.createElement('div');
    k.className = 'bkey';
    k.textContent = c.label;
    k.dataset.chord = c.label;
    k.dataset.midis = JSON.stringify(c.midis);
    br.appendChild(k);
  });
  bassEl.appendChild(br);
}

function setupTouch() {
  const active = new Map();

  function keyAt(touch) {
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el && (el.classList.contains('key') || el.classList.contains('bkey'))) return el;
    return null;
  }

  function press(el) {
    el.classList.add('on');
    if (el.classList.contains('bkey')) {
      audio.chordOn(JSON.parse(el.dataset.midis), el.dataset.chord);
    } else {
      audio.noteOn(parseInt(el.dataset.midi));
    }
  }

  function release(el) {
    el.classList.remove('on');
    if (el.classList.contains('bkey')) {
      audio.chordOff(el.dataset.chord);
    } else {
      audio.noteOff(parseInt(el.dataset.midi));
    }
  }

  function onStart(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const k = keyAt(t);
      if (!k) continue;
      active.set(t.identifier, k);
      press(k);
    }
  }

  function onEnd(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const k = active.get(t.identifier);
      if (!k) continue;
      release(k);
      active.delete(t.identifier);
    }
  }

  function onMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const cur = active.get(t.identifier);
      const next = keyAt(t);
      if (next !== cur) {
        if (cur) { release(cur); }
        if (next) { active.set(t.identifier, next); press(next); }
        else { active.delete(t.identifier); }
      }
    }
  }

  const opts = { passive: false };
  document.addEventListener('touchstart', onStart, opts);
  document.addEventListener('touchend', onEnd, opts);
  document.addEventListener('touchcancel', onEnd, opts);
  document.addEventListener('touchmove', onMove, opts);

  // mouse fallback
  let mdown = false, mkey = null;
  document.addEventListener('mousedown', e => {
    const k = e.target.closest('.key, .bkey');
    if (!k) return;
    mdown = true; mkey = k; press(k);
  });
  document.addEventListener('mouseup', () => {
    if (mdown && mkey) { release(mkey); mdown = false; mkey = null; }
  });
}

function init() {
  const bfill = document.getElementById('bfill');
  const bpct = document.getElementById('bellows-pct');

  build();

  document.getElementById('boot').addEventListener('click', async () => {
    audio = new AudioEngine();
    audio.init();

    const ax = document.getElementById('ax');
    const ay = document.getElementById('ay');
    const az = document.getElementById('az');
    const aj = document.getElementById('aj');
    const ap = document.getElementById('ap');

    bellows = new BellowsController((p) => {
      audio.setBellows(p);
      bfill.style.width = `${p * 100}%`;
      bpct.textContent = `${Math.round(p * 100)}%`;
      ax.textContent = bellows.rawAcc.x.toFixed(2);
      ay.textContent = bellows.rawAcc.y.toFixed(2);
      az.textContent = bellows.rawAcc.z.toFixed(2);
      aj.textContent = bellows.jerk.toFixed(2);
      ap.textContent = p.toFixed(3);
    });

    try {
      await bellows.start();
      ap.textContent = 'LIVE';
    } catch (err) {
      ap.textContent = 'FAIL';
      aj.textContent = err.message || 'no sensor';
      bellows.setManual(0.7);
    }

    setupTouch();

    document.getElementById('boot').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
  });
}

init();
