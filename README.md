# icordion

Turn your iPhone into a virtual accordion. Tilt the phone to work the bellows, tap the keys to play notes.

Inspired by my bestfriend's mac-cordian.

## How It Works

- **Bellows** - the accelerometer detects phone movement. tilt/shake = louder and brighter tone. still = silence, you can clearly hear the filter open up as you move
- **Keys** - two octaves of treble notes (chromatic) plus six bass/chord buttons
- **Sound** - musette tuning via three detuned oscillators per note. bellows control both volume and a filter sweep (dark to bright) for expressive playing

## Setup

```bash
npm install
npm start
```

Open the network URL on your iPhone in Safari, tap to start and allow motion access.

## Files

```
├── server.js              # Express server
└── public/
    ├── index.html          # CRT-themed accordion UI
    ├── css/style.css       # Terminal styles
    └── js/
        ├── audio-engine.js # Web Audio synthesis
        ├── bellows.js      # Accelerometer to pressure
        └── mobile-app.js   # Touch handling + UI
```

## License

MIT
