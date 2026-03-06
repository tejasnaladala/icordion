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

the server starts and prints something like:

```
  > icordion running
  > http://localhost:3000
  > http://192.168.1.42:3000
  > https://localhost:3443
  > https://192.168.1.42:3443  <-- use this on iphone
```

there are two servers - http (port 3000) and https (port 3443). http always works. https is needed on iphone for the accelerometer.

## Playing

1. on your iPhone open the **https** network url in Safari (the one on port 3443)
2. you'll get a cert warning - tap **Advanced** then **Continue**
3. tap the screen to start
4. Safari asks for **motion sensor access** - tap Allow
5. tilt/shake the phone while tapping keys

if you just wanna see the ui without accelerometer (on a laptop or whatever), the http url on port 3000 works fine.

the accelerometer acts as the bellows. no movement = no sound. the harder you shake/tilt, the louder and brighter the tone gets.

bass buttons at the bottom play chords (C, F, G, Dm, Am, E).

live accelerometer values show at the bottom of the screen so you can see whats going on

## Notes

- both your phone and computer need to be on the same wifi network
- the server tries to generate a self-signed SSL cert on first run (needs openssl installed). if openssl isnt available, https wont start but http still works
- iOS requires https for accelerometer access, thats why we need the cert
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
