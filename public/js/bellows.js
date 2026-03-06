// Bellows simulation using device accelerometer
// Detects phone movement/tilting to simulate accordion bellows

export class BellowsController {
  constructor(onChange) {
    this.onChange = onChange;
    this.pressure = 0;
    this.lastAcc = null;
    this.smoothing = 0.2;
    this.sensitivity = 3.0;
    this.decay = 0.95;
    this.enabled = false;
    this._boundHandler = this._handleMotion.bind(this);
  }

  async start() {
    // iOS 13+ requires explicit permission
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {
      const permission = await DeviceMotionEvent.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Motion sensor permission denied');
      }
    }

    this.enabled = true;
    window.addEventListener('devicemotion', this._boundHandler);

    // Start decay loop
    this._decayLoop();
  }

  stop() {
    this.enabled = false;
    window.removeEventListener('devicemotion', this._boundHandler);
  }

  _handleMotion(event) {
    if (!this.enabled) return;

    const acc = event.accelerationIncludingGravity;
    if (!acc || acc.x === null) return;

    if (!this.lastAcc) {
      this.lastAcc = { x: acc.x, y: acc.y, z: acc.z };
      return;
    }

    // Calculate change in acceleration (jerk)
    const dx = acc.x - this.lastAcc.x;
    const dy = acc.y - this.lastAcc.y;
    const dz = acc.z - this.lastAcc.z;

    const jerk = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Map jerk to bellows pressure
    const target = Math.min(1, (jerk * this.sensitivity) / 15);

    // Smooth towards target (fast attack, slow release)
    if (target > this.pressure) {
      this.pressure += (target - this.pressure) * this.smoothing;
    } else {
      this.pressure += (target - this.pressure) * 0.08;
    }

    this.lastAcc = { x: acc.x, y: acc.y, z: acc.z };
  }

  _decayLoop() {
    if (!this.enabled) return;

    // Natural decay
    this.pressure *= this.decay;

    // Clamp
    if (this.pressure < 0.005) this.pressure = 0;

    this.onChange(this.pressure);
    requestAnimationFrame(() => this._decayLoop());
  }

  // For desktop: set pressure directly (e.g., from spacebar)
  setManual(value) {
    this.pressure = Math.max(0, Math.min(1, value));
    this.onChange(this.pressure);
  }
}
