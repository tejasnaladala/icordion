# icordion

Turn your iPhone into a virtual accordion. Tilt the phone to work the bellows, tap the keys to play notes.

Inspired by my bestfriend's mac-cordian.

## How It Works

- **Bellows** - the accelerometer detects phone movement. tilt/shake = louder and brighter tone. still = silence, you can clearly hear the filter open up as you move
- **Keys** - two octaves of treble notes (chromatic) plus six bass/chord buttons
- **Sound** - musette tuning via three detuned oscillators per note. bellows control both volume and a filter sweep (dark to bright) for expressive playing

## Setup

you need Node.js (v18 or higher) and an iPhone on the same wifi as your computer.

```bash
git clone https://github.com/tejasnaladala/icordion.git
cd icordion
npm install
npm start
```

the server starts and prints something like this:

```
  > accordion server running (https)
  > local:   https://localhost:3000
  > network: https://192.168.1.42:3000
  > open network url on your iphone
```

## Playing

1. copy the **network** url (the one with your local ip, not localhost)
2. open it in **Safari** on your iPhone
3. you'll get a security warning because of the self-signed cert - tap **Advanced** then **Continue**
4. tap the screen to start
5. Safari will ask for **motion sensor access** - tap Allow
6. hold the phone and tilt/shake it while tapping the keys

the accelerometer acts as the bellows. no movement = no sound. the harder you shake/tilt, the louder and brighter the tone gets.

bass buttons at the bottom play chords (C, F, G, Dm, Am, E).

live accelerometer values show at the bottom of the screen so you can see whats going on

## Notes

- both your phone and computer need to be on the same wifi network
- the server generates a self-signed SSL cert on first run (stored in `.certs/`). this is needed because iOS requires https for accelerometer access
- works on any computer that has node - mac, windows, linux
- only tested on iPhone/Safari. android might work but the accelerometer api is a bit different

## Files

```
server.js              - express https server, generates ssl cert
public/
  index.html           - the ui
  css/style.css        - terminal/crt theme
  js/
    audio-engine.js    - web audio synthesis, musette tuning
    bellows.js         - accelerometer to bellows pressure mapping
    mobile-app.js      - touch handling, key layout, ui wiring
```

## License

MIT
