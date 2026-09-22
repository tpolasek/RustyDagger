# RustyDagger
![](Splash.png)

Dragon Court, the classic 90's game by Fred Haslam (Ffiends.com). A Quest to reverse-swashbuckle Yon Soursse Cewd...

## Links

- [Reddit](https://reddit.com/r/DragonCourt)

## Browser (TypeScript)

### Requirements

- Node.js 25
- npm

### Build & Run

```sh
npm install
npm run serve
```

This builds the bundle and starts the game server at http://127.0.0.1:8000.
Hero saves and accounts are stored on the server, in `data/db.json` (created on
first run; delete it to reset all saves).

Login requires a hero name and a password: the first login with a name creates
the account, later logins need the same password.

`npm run serve` rebuilds before starting; use `npm run build && npm start` while
iterating. Opening the page from anything other than the game server (e.g. a
plain static host) falls back to saving in the browser's `localStorage`.

To create a production bundle or run the logic tests:

```sh
npm run build
npm test
```

## Java

### Requirements

- gradle
- java 11

### Build & Run

```sh
gradle build
java -jar build/lib/RustyDagger.jar
```

## Limitations

- Multiplayer was removed
- Hero data is saved in current directory (hero's name)
