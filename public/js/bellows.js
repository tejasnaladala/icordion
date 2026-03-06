// Bellows simulation using device accelerometer
// More aggressive sensitivity so the effect is clearly audible

export class BellowsController {
  constructor(onChange) {
    this.onChange = onChange;
    this.pressure = 0;
    this.lastAcc = null;
    this.smoothing = 0.35;      // Faster response
    this.sensitivity = 5.0;     // Much more sensitive
    this.decay = 0.92;          // Faster decay so you feel the stop
    this.enabled = false;
    this.rawAcc = { x: 0, y: 0, z: 0 };
    this.jerk = 0;
    this._boundHandler = this._handleMotion.bind(this);
  }

  async start() {
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {
      const permission = await DeviceMotionEvent.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Motion sensor permission denied');
      }
    }

    this.enabled = true;
    window.addEventListener('devicemotion', this._boundHandler);
    this._decayLoop();
  }

  stop() {
    this.enabled = false;
    window.removeEventListener('devicemotion', this._boundHandler);
  }

  _handleMotion(event) {
    if (!this.enabled) return;

    // Use gravity-subtracted acceleration so stationary = 0
    const acc = event.acceleration || event.accelerationIncludingGravity;
    if (!acc || acc.x === null) return;

    if (!this.lastAcc) {
      this.lastAcc = { x: acc.x, y: acc.y, z: acc.z };
      return;
    }

    const dx = acc.x - this.lastAcc.x;
    const dy = acc.y - this.lastAcc.y;
    const dz = acc.z - this.lastAcc.z;

    const rawJerk = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Dead zone — ignore sensor noise when phone is still
    const DEAD_ZONE = 0.4;
    this.jerk = rawJerk < DEAD_ZONE ? 0 : rawJerk;
    this.rawAcc = this.jerk === 0 ? this.rawAcc : { x: acc.x, y: acc.y, z: acc.z };

    // Aggressive mapping — small tilts register clearly
    const target = Math.min(1, (this.jerk * this.sensitivity) / 10);

    // Fast attack, moderate release
    if (target > this.pressure) {
      this.pressure += (target - this.pressure) * this.smoothing;
    } else {
      this.pressure += (target - this.pressure) * 0.12;
    }

    this.lastAcc = { x: acc.x, y: acc.y, z: acc.z };
  }

  _decayLoop() {
    if (!this.enabled) return;

    this.pressure *= this.decay;
    if (this.pressure < 0.008) this.pressure = 0;

    this.onChange(this.pressure);
    requestAnimationFrame(() => this._decayLoop());
  }

  setManual(value) {
    this.pressure = Math.max(0, Math.min(1, value));
    this.onChange(this.pressure);
  }
}
