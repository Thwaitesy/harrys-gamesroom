# Harry's Gamesroom

A local browser games repo with each game kept in its own named folder.

## Games

- `heroes-journey`: a Phaser platform adventure where the knight jumps, collects coins, and reaches the castle.
- `star-sprinter`: a canvas arcade space shooter copied in from the old Game 2 folder.

## Folder Map

```text
games/
  heroes-journey/
    src/
    public/
  star-sprinter/
    index.html
    game.js
    styles.css
```

When you ask Codex to work on a game, use the folder name:

```text
Work on heroes-journey
Work on star-sprinter
```

## Run Locally

Install dependencies:

```bash
npm install
```

Start the local server:

```bash
npm run dev -- --host 0.0.0.0
```

Open the local URL Vite prints, usually:

```text
http://localhost:5173/
```

The home screen lets you pick either game.

Direct links:

```text
Heroes Journey: http://localhost:5173/?game=heroes-journey
Star Sprinter:  http://localhost:5173/games/star-sprinter/
```

## Editing Heroes Journey

Most easy changes live in `games/heroes-journey/src/config/gameSettings.js`.

Useful values:

- `PLAYER_SPEED`
- `PLAYER_JUMP_FORCE`
- `PLAYER_STARTING_HEARTS`
- `WITCH_SPEED`
- `PLATFORMS`
- `KEY_POSITION`
- `COIN_POSITIONS`
- `DOOR_POSITION`
- `FIREBALL_SPEED`
- `FIREBALL_RELOAD_MS`
- `LEVEL_MESSAGES`
- `BACKGROUND_COLOR`
- `GAME_TITLE_TOP`
- `GAME_TITLE_BOTTOM`
- `WIN_MESSAGE`

## Editing Star Sprinter

The whole game is in:

```text
games/star-sprinter/
```

Use `game.js` for gameplay changes and `styles.css` for layout or visual changes.

## iPad Notes

On the iPad, open the Network URL Vite prints, for example:

```text
http://192.168.1.42:5173/
```

The iPad and computer must be on the same home Wi-Fi network.

Important note: do not use this on public Wi-Fi. This local network approach is intended for home Wi-Fi only.
