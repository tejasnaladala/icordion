// Accordion sound synthesis using Web Audio API
// Uses multiple detuned oscillators to simulate musette tuning (the characteristic accordion shimmer)

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNoteName(midi) {
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[midi % 12];
  return `${name}${octave}`;
}

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bellowsGain = null;
    this.compressor = null;
    this.analyser = null;
    this.activeNotes = new Map();
    this.bellowsPressure = 0;
  }

  init() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Signal chain: notes -> bellows gain -> compressor -> master -> analyser -> destination
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -20;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = 4;

    this.bellowsGain = this.ctx.createGain();
    this.bellowsGain.gain.value = 0;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.7;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;

    this.bellowsGain.connect(this.compressor);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    return this;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  noteOn(midi, type = 'treble') {
    if (this.activeNotes.has(midi)) return;
    if (!this.ctx) return;

    const freq = midiToFreq(midi);
    const noteGain = this.ctx.createGain();
    noteGain.gain.value = 0;

    // Musette tuning: 3 reeds slightly detuned for the characteristic shimmer
    const detuneCents = type === 'treble' ? [-5, 0, 5] : [-2, 0, 2];
    const oscNodes = [];

    for (const detune of detuneCents) {
      const osc = this.ctx.createOscillator();

      // Use periodic wave for a more accordion-like timbre
      const real = new Float32Array([0, 1, 0.8, 0.5, 0.3, 0.2, 0.15, 0.1, 0.05]);
      const imag = new Float32Array(real.length);
      const wave = this.ctx.createPeriodicWave(real, imag);
      osc.setPeriodicWave(wave);

      osc.frequency.value = freq;
      osc.detune.value = detune;

      // Tone shaping filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = type === 'treble' ? 4000 : 1800;
      filter.Q.value = 0.7;

      osc.connect(filter);
      filter.connect(noteGain);
      osc.start();

      oscNodes.push({ osc, filter });
    }

    noteGain.connect(this.bellowsGain);

    // Attack
    const perOscGain = type === 'treble' ? 0.18 : 0.25;
    noteGain.gain.setTargetAtTime(perOscGain, this.ctx.currentTime, 0.015);

    this.activeNotes.set(midi, { oscNodes, noteGain, type });
  }

  noteOff(midi) {
    const note = this.activeNotes.get(midi);
    if (!note) return;

    const now = this.ctx.currentTime;
    note.noteGain.gain.cancelScheduledValues(now);
    note.noteGain.gain.setTargetAtTime(0, now, 0.04);

    // Cleanup after release
    setTimeout(() => {
      note.oscNodes.forEach(({ osc }) => {
        try { osc.stop(); } catch {}
      });
      note.noteGain.disconnect();
    }, 200);

    this.activeNotes.delete(midi);
  }

  // Play a chord (array of MIDI notes)
  chordOn(midis, label) {
    const key = `chord_${label}`;
    if (this.activeNotes.has(key)) return;
    midis.forEach(m => this.noteOn(m, 'bass'));
    this.activeNotes.set(key, { chordNotes: midis });
  }

  chordOff(label) {
    const key = `chord_${label}`;
    const chord = this.activeNotes.get(key);
    if (!chord) return;
    chord.chordNotes.forEach(m => this.noteOff(m));
    this.activeNotes.delete(key);
  }

  setBellows(pressure) {
    this.bellowsPressure = pressure;
    if (this.bellowsGain) {
      this.bellowsGain.gain.setTargetAtTime(
        Math.pow(pressure, 0.7), // Slight curve for more natural feel
        this.ctx.currentTime,
        0.04
      );
    }
  }

  getAnalyserData() {
    if (!this.analyser) return null;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    return data;
  }

  getFrequencyData() {
    if (!this.analyser) return null;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }
}
