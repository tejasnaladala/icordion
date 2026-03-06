# iPhone Accordion

Turn your iPhone into a virtual accordion. Tilt the phone to work the bellows, tap the keys to play notes.

Inspired by my bestfriend's mac-cordian.

## How It Works

- **Bellows** — The accelerometer detects phone movement. Tilt/shake = louder and brighter tone. Still = silence. You can clearly hear the filter open up as you move.
- **Keys** — Two octaves of treble notes (chromatic) plus six bass/chord buttons.
- **Sound** — Musette tuning via three detuned oscillators per note. Bellows control both volume and a filter sweep (dark → bright) for expressive playing.

## Setup

```bash
npm install
npm start
```

Open the network URL on your iPhone in Safari. Tap to start. Allow motion access.

## Files

```
├── server.js              # Express server
└── public/
    ├── index.html          # CRT-themed accordion UI
    ├── css/style.css       # Terminal styles
    └── js/
        ├── audio-engine.js # Web Audio synthesis
        ├── bellows.js      # Accelerometer → pressure
        └── mobile-app.js   # Touch handling + UI
```

## License

MIT
