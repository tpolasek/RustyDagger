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

Open the local URL printed by esbuild. Browser saves are stored in `localStorage`.

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
