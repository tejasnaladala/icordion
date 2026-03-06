# iPhone Accordion

Turn your iPhone into a virtual accordion. Uses the device accelerometer as bellows and the touchscreen as keys, with multi-device support for connecting phones to a laptop dashboard.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Accelerometer Bellows** - Tilt and move your phone to simulate accordion bellows. The rate of motion controls volume and expression, just like a real accordion.
- **Touch Keyboard** - Two octaves of treble buttons in a chromatic layout, plus six bass/chord buttons (C, F, G, Dm, Am, E major).
- **Musette Tuning** - Authentic accordion sound using Web Audio API synthesis with three slightly-detuned oscillators per note, creating the characteristic accordion shimmer.
- **Multi-Device Mode** - Open the Dashboard on your laptop, connect your phone via room code or QR code. Multiple phones can join for ensemble playing.
- **Desktop Keyboard** - Play directly from your computer keyboard with `A-L` keys mapping to notes and `Space` for bellows.
- **Live Visualizer** - Real-time waveform and frequency visualization on the desktop dashboard.
- **Low Latency** - WebSocket-based communication for responsive multi-device coordination.

## Quick Start

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/iphone-accordion.git
cd iphone-accordion

# Install dependencies
npm install

# Start the server
npm start
```

The server starts on port 3000 and displays both local and network URLs.

## How to Play

### Solo Mode (Phone Only)
1. Open the network URL on your iPhone (e.g., `http://192.168.x.x:3000`)
2. Tap **Play Accordion** → **Start Playing**
3. Grant motion sensor permission when prompted
4. Tilt/move your phone to activate the bellows
5. Tap the circular buttons to play notes

### Multi-Device Mode
1. Open `http://localhost:3000` on your laptop and click **Dashboard**
2. A room code and QR code will appear
3. On your iPhone, scan the QR code or enter the room code
4. Notes played on the phone will appear on the dashboard with live visualization

### Desktop Keyboard
On the dashboard, you can also play using your computer keyboard:

| Key | Note | Key | Note |
|-----|------|-----|------|
| A | C4 | F | F4 |
| W | C#4 | T | F#4 |
| S | D4 | G | G4 |
| E | D#4 | Y | G#4 |
| D | E4 | H | A4 |
| | | U | A#4 |
| | | J | B4 |
| | | K | C5 |

Hold **Space** to activate the bellows.

## Architecture

```
├── server.js          # Express + WebSocket server with room management
└── public/
    ├── index.html     # Landing page with device detection
    ├── mobile.html    # Mobile accordion interface
    ├── desktop.html   # Desktop dashboard with visualizer
    ├── css/style.css  # All styles
    └── js/
        ├── audio-engine.js  # Web Audio synthesis (musette tuning)
        ├── bellows.js       # Accelerometer → bellows pressure
        ├── connection.js    # WebSocket client wrapper
        ├── mobile-app.js    # Mobile UI and touch handling
        └── desktop-app.js   # Dashboard, visualizer, keyboard input
```

## Tech Stack

- **Web Audio API** - Real-time accordion sound synthesis with custom periodic waves
- **DeviceMotion API** - Accelerometer access for bellows simulation
- **WebSocket** - Low-latency multi-device communication
- **Express** - Static file serving and HTTP server
- **Canvas API** - Waveform and frequency visualization

## Browser Support

- **iPhone**: Safari 13+ (requires iOS 13+ for DeviceMotion permission API)
- **Desktop**: Chrome, Firefox, Safari, Edge (latest versions)

## Network Requirements

For multi-device mode, both devices must be on the same local network. The server binds to `0.0.0.0` so it's accessible from any device on the network.

## License

MIT
