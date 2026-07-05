export const GAME_WIDTH = 984;
export const GAME_HEIGHT = 540;
export const WORLD_WIDTH = 2300;
export const BACKGROUND_COLOR = '#77c8f2';

export const GAME_TITLE_TOP = 'Heroes Journey';
export const GAME_TITLE_BOTTOM = 'The Dark Castle Adventure';
export const LEVEL_NAME = 'Level 1: The Forest Path';
export const WIN_MESSAGE = 'You did it!\nThe knight reached the Dark Castle!';
export const GAME_OVER_MESSAGE = 'Oh no!\nThe witches got you.\nTry again!';

export const PLAYER_SPEED = 215;
export const PLAYER_JUMP_FORCE = 650;
export const PLAYER_STARTING_HEARTS = 5;
export const PLAYER_RESPAWN_POSITION = { x: 285, y: 442 };
export const PLAYER_INVINCIBLE_MS = 1000;
export const PLAYER_COYOTE_MS = 170;
export const PLAYER_JUMP_BUFFER_MS = 170;
export const BLASTER_SPEED = 520;
export const BLASTER_COOLDOWN_MS = 420;
export const BLASTER_RANGE = 620;
export const BLASTER_OFFSET = { x: 34, y: 8 };

export const WITCH_SPEED = 38;
export const WITCH_START_POSITION = { x: 1190, y: 250 };
export const WITCH_PATROL_DISTANCE = 170;

export const MONSTER_CHASE_DISTANCE = 230;
export const MONSTER_POSITIONS = [];

export const FIREBALL_SPEED = 85;
export const FIREBALL_DAMAGE = 1;
export const FIREBALL_RELOAD_MS = 1300;
export const FIREBALL_TRAVEL_DISTANCE = 520;
export const FIREBALL_BROOM_OFFSET = { x: -44, y: 22 };

export const MAGIC_SPEED = FIREBALL_SPEED;
export const MAGIC_DAMAGE = FIREBALL_DAMAGE;

export const KEY_POSITION = { x: 700, y: 326 };
export const DOOR_POSITION = { x: 2110, y: 375 };

export const COIN_POSITIONS = [
  { x: 365, y: 402 },
  { x: 715, y: 334 },
  { x: 1095, y: 374 },
  { x: 1485, y: 330 },
  { x: 1845, y: 378 }
];

export const LEVEL_MESSAGES = {
  keyFound: 'You found the golden key!',
  doorLocked: 'The door is locked. Find the golden key!'
};

export const PLATFORMS = [
  { x: 0, y: 500, width: 670, height: 40 },
  { x: 735, y: 500, width: 495, height: 40 },
  { x: 1300, y: 500, width: 470, height: 40 },
  { x: 1840, y: 500, width: 460, height: 40 },
  { x: 315, y: 400, width: 235, height: 30 },
  { x: 635, y: 350, width: 265, height: 30 },
  { x: 1010, y: 390, width: 255, height: 30 },
  { x: 1385, y: 345, width: 260, height: 30 },
  { x: 1745, y: 395, width: 270, height: 30 }
];
