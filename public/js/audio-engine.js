// Accordion sound synthesis using Web Audio API
// Musette tuning with bellows-controlled filter sweep for dramatic expression

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNoteName(midi) {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
}

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bellowsGain = null;
    this.bellowsFilter = null;
    this.compressor = null;
    this.activeNotes = new Map();
    this.bellowsPressure = 0;
  }

  init() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Signal chain: notes -> bellowsFilter -> bellowsGain -> compressor -> master -> dest
    this.bellowsFilter = this.ctx.createBiquadFilter();
    this.bellowsFilter.type = 'lowpass';
    this.bellowsFilter.frequency.value = 300; // Nearly muffled when no bellows
    this.bellowsFilter.Q.value = 1.5;

    this.bellowsGain = this.ctx.createGain();
    this.bellowsGain.gain.value = 0;

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -15;
    this.compressor.knee.value = 8;
    this.compressor.ratio.value = 4;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.85;

    this.bellowsFilter.connect(this.bellowsGain);
    this.bellowsGain.connect(this.compressor);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

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

    // Musette tuning: 3 reeds slightly detuned
    const detuneCents = type === 'treble' ? [-6, 0, 6] : [-3, 0, 3];
    const oscNodes = [];

    for (const detune of detuneCents) {
      const osc = this.ctx.createOscillator();

      // Rich accordion timbre via custom periodic wave
      const real = new Float32Array([0, 1, 0.85, 0.6, 0.4, 0.25, 0.18, 0.12, 0.08, 0.05]);
      const imag = new Float32Array(real.length);
      const wave = this.ctx.createPeriodicWave(real, imag);
      osc.setPeriodicWave(wave);

      osc.frequency.value = freq;
      osc.detune.value = detune;

      osc.connect(noteGain);
      osc.start();
      oscNodes.push({ osc });
    }

    noteGain.connect(this.bellowsFilter);

    // Attack envelope
    const gain = type === 'treble' ? 0.2 : 0.28;
    noteGain.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.012);

    this.activeNotes.set(midi, { oscNodes, noteGain, type });
  }

  noteOff(midi) {
    const note = this.activeNotes.get(midi);
    if (!note) return;

    const now = this.ctx.currentTime;
    note.noteGain.gain.cancelScheduledValues(now);
    note.noteGain.gain.setTargetAtTime(0, now, 0.035);

    setTimeout(() => {
      note.oscNodes.forEach(({ osc }) => {
        try { osc.stop(); } catch {}
      });
      note.noteGain.disconnect();
    }, 180);

    this.activeNotes.delete(midi);
  }

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
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Volume: silence at 0, full at 1
    this.bellowsGain.gain.setTargetAtTime(
      Math.pow(pressure, 0.5), // Square root curve = louder faster
      now, 0.03
    );

    // filter sweep: 300hz (muffled) to 7000hz (bright and open)
    // this is the main audible difference - tone goes from dark to bright
    const minFreq = 300;
    const maxFreq = 7000;
    const filterFreq = minFreq + (maxFreq - minFreq) * Math.pow(pressure, 0.6);
    this.bellowsFilter.frequency.setTargetAtTime(filterFreq, now, 0.03);

    // Resonance peak increases slightly with pressure for expressiveness
    this.bellowsFilter.Q.setTargetAtTime(
      1.0 + pressure * 3.0,
      now, 0.05
    );
  }
}
