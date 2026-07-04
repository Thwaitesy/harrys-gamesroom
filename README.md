# Knight vs Witches: The Dark Castle Adventure

A small local 2D browser platform game built with Vite, Phaser, and JavaScript.

The brave knight jumps through a magical forest path, dodges a silly flying witch and broom fire, collects a golden key, and opens the door to the Dark Castle in the Clouds.

## Run Locally

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Start the Local Server

```bash
npm run dev -- --host 0.0.0.0
```

Vite should show something like:

```text
Local:   http://localhost:5173/
Network: http://192.168.1.42:5173/
```

Open the `Local` URL on the parent computer.

The game does not auto-refresh when Codex changes the code. If an update is ready, a green `Update Ready - Tap to Refresh` button appears at the top of the game. Tap it when the player is ready to load the new version.

### Step 3: Open on iPad

On the iPad:

```text
Open Safari
Enter the Network URL
Play the game
```

The iPad and computer must be on the same home Wi-Fi network.

## Controls

Desktop:

```text
Left arrow  = move left
Right arrow = move right
Space or up = jump
F          = shoot sparkle blaster
R          = restart the level
```

iPad:

```text
Use the large left, right, jump, and ZAP buttons on the screen.
Tap Restart in the top-right corner to start the level again.
```

## Dad Edit Guide

Most easy changes live in `src/config/gameSettings.js`.

To make the knight faster, change `PLAYER_SPEED`.

To make the knight jump higher, change `PLAYER_JUMP_FORCE`.

To change starting health, change `PLAYER_STARTING_HEARTS`.

To make the witch slower, change `WITCH_SPEED`.

To move the platforms, edit `PLATFORMS`.

To move the key, change `KEY_POSITION`.

To move the coins, edit `COIN_POSITIONS`.

To move the door, change `DOOR_POSITION`.

To make the broom fire slower, change `FIREBALL_SPEED`.

To change how often the witch shoots, change `FIREBALL_RELOAD_MS`.

To move where the fire comes out of the broom, change `FIREBALL_BROOM_OFFSET`.

To change the level messages, edit `LEVEL_MESSAGES`.

To change the background colour, edit `BACKGROUND_COLOR`.

To change the game title, edit `GAME_TITLE_TOP` and `GAME_TITLE_BOTTOM`.

To change the win message, edit `WIN_MESSAGE`.

Example platform:

```js
{ x: 650, y: 335, width: 175, height: 28 }
```

Lower `y` numbers move things up. Higher `x` numbers move things to the right.

## Finding Your Computer IP Address

### Windows

Open PowerShell and run:

```powershell
ipconfig
```

Look for:

```text
IPv4 Address
```

Example:

```text
192.168.1.42
```

Then open this on the iPad:

```text
http://192.168.1.42:5173
```

### macOS

Open Terminal and run:

```bash
ipconfig getifaddr en0
```

Then open this on the iPad:

```text
http://YOUR-IP-HERE:5173
```

## Troubleshooting

If the iPad cannot connect, check:

- The iPad and computer are on the same Wi-Fi.
- The dev server is running.
- The server was started with `--host 0.0.0.0`.
- The iPad is using the computer's network IP, not `localhost`.
- Windows Firewall is allowing Node/Vite on private networks.
- The router does not have client isolation enabled.
- Try refreshing Safari on the iPad.
- Try restarting the dev server.

Important note: do not use this on public Wi-Fi. This local network approach is intended for home Wi-Fi only.

## Kid Review Questions

```text
What should the knight look like?
What colour should the witch be?
What should the witch throw?
What are the knight's two friends?
Should there be a dragon?
What treasure is inside the castle?
Should the wrong door send the knight back to the start?
Should the castle be spooky, funny, or both?
What should Level 2 be called?
What is the silliest enemy we can add?
```
