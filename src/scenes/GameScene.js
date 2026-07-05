import Phaser from 'phaser';
import {
  BLASTER_COOLDOWN_MS,
  BLASTER_OFFSET,
  BLASTER_RANGE,
  BLASTER_SPEED,
  COIN_POSITIONS,
  DOOR_POSITION,
  FIREBALL_BROOM_OFFSET,
  FIREBALL_DAMAGE,
  FIREBALL_RELOAD_MS,
  FIREBALL_SPEED,
  FIREBALL_TRAVEL_DISTANCE,
  GAME_HEIGHT,
  GAME_WIDTH,
  KEY_POSITION,
  LEVEL_MESSAGES,
  MONSTER_POSITIONS,
  PLATFORMS,
  PLAYER_INVINCIBLE_MS,
  PLAYER_RESPAWN_POSITION,
  PLAYER_STARTING_HEARTS,
  WITCH_START_POSITION,
  WORLD_WIDTH
} from '../config/gameSettings.js';
import Player from '../objects/Player.js';
import Witch from '../objects/Witch.js';
import Monster from '../objects/Monster.js';

function assetPath(fileName) {
  return `${import.meta.env.BASE_URL}assets/${fileName}`;
}

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    this.load.image('ui-reference-target', assetPath('ui-reference-target-1280.png'));
    this.load.image('knight-art', assetPath('hero-robot.png'));
    this.load.image('witch-art', assetPath('witch-cute.png'));
    this.load.image('fireball-art', assetPath('fireball-glow.png'));
    this.load.image('coin-art', assetPath('coin-target.png'));
    this.load.image('ui-hud-target', assetPath('ui-hud-target.png'));
    this.load.image('ui-restart-target', assetPath('ui-restart-target.png'));
    this.load.image('ui-left-target', assetPath('ui-left-target.png'));
    this.load.image('ui-right-target', assetPath('ui-right-target.png'));
    this.load.image('ui-zap-target', assetPath('ui-zap-target.png'));
    this.load.image('ui-jump-target', assetPath('ui-jump-target.png'));
    this.createTextures();
  }

  create() {
    this.uiShotMode = new URLSearchParams(window.location.search).has('uiShot');
    this.hearts = PLAYER_STARTING_HEARTS;
    this.hasKey = this.uiShotMode;
    this.coinsCollected = this.uiShotMode ? 3 : 0;
    this.totalCoins = COIN_POSITIONS.length;
    this.nextBlasterAt = 0;
    this.shootWasDown = false;
    this.witchDefeated = false;
    this.isInvincible = false;
    this.lastDoorMessageAt = 0;
    this.touchControls = { left: false, right: false, jump: false, shoot: false };
    this.controlPointers = {
      left: new Set(),
      right: new Set(),
      jump: new Set(),
      shoot: new Set()
    };
    this.boundReleasePointerFromAllControls = (pointer) => this.releasePointerFromAllControls(pointer);
    this.boundClearTouchControls = () => this.clearTouchControls();
    this.input.addPointer(4);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.boundClearTouchControls);

    if (this.uiShotMode && this.textures.exists('ui-reference-target')) {
      this.referenceShotMode = true;
      this.add.image(0, 0, 'ui-reference-target')
        .setOrigin(0)
        .setDisplaySize(this.scale.width, this.scale.height);
      return;
    }

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT + 300);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);

    this.createBackground();
    this.createPlatforms();

    const playerStart = this.uiShotMode ? { x: 1110, y: 330 } : PLAYER_RESPAWN_POSITION;
    this.player = new Player(this, playerStart.x, playerStart.y);
    this.witch = new Witch(this, WITCH_START_POSITION.x, WITCH_START_POSITION.y);
    if (this.uiShotMode) {
      this.witch.sprite.setPosition(playerStart.x + 254, 225);
      this.witch.sprite.setVelocityX(0);
    }
    this.monsters = this.physics.add.group();
    this.monsterControllers = this.uiShotMode
      ? []
      : MONSTER_POSITIONS.map((monsterConfig) => {
        const monster = new Monster(this, monsterConfig);
        this.monsters.add(monster.sprite);
        return monster;
      });
    const broomTip = this.getBroomTipPosition();
    this.fireball = this.physics.add.image(broomTip.x, broomTip.y, this.getTextureKey('fireball-art', 'fireball'));
    this.fireball.body.allowGravity = false;
    if (this.fireball.texture.key === 'fireball-art') {
      this.fireball.setScale(0.72);
      this.fireball.body.setSize(96, 58).setOffset(44, 24);
    }
    this.fireball.setVelocityX(-FIREBALL_SPEED);
    if (this.uiShotMode) {
      this.fireball.setPosition(playerStart.x + 121, playerStart.y - 104);
      this.fireball.setVelocity(0, 0);
    }
    this.fireballStartX = broomTip.x;
    this.nextFireballAt = 0;

    this.key = this.physics.add.image(KEY_POSITION.x, KEY_POSITION.y, 'key');
    this.key.body.allowGravity = false;
    this.coins = this.physics.add.staticGroup();
    COIN_POSITIONS.forEach((coinPosition, index) => {
      const coin = this.coins.create(coinPosition.x, coinPosition.y, this.getTextureKey('coin-art', 'coin'));
      if (coin.texture.key === 'coin-art') {
        coin.setScale(0.74);
      }
      coin.body.setSize(28, 28).setOffset(10, 10);
      if (this.uiShotMode && index < this.coinsCollected) {
        coin.disableBody(true, true);
        return;
      }
      this.animateCoin(coin);
    });
    if (this.uiShotMode) {
      this.key.disableBody(true, true);
    }
    this.bolts = this.physics.add.group({ allowGravity: false });

    this.door = this.physics.add.staticImage(DOOR_POSITION.x, DOOR_POSITION.y, 'door').setOrigin(0.5, 1);
    this.door.body.setSize(70, 115).setOffset(12, 13);
    this.doorBlocker = this.add.rectangle(DOOR_POSITION.x, DOOR_POSITION.y - 55, 30, 110, 0xffffff, 0);
    this.physics.add.existing(this.doorBlocker, true);

    this.physics.add.collider(this.player.sprite, this.platforms);
    this.physics.add.collider(this.monsters, this.platforms);
    this.physics.add.collider(this.player.sprite, this.doorBlocker, null, () => !this.hasKey, this);
    this.physics.add.overlap(this.player.sprite, this.witch.sprite, () => this.damagePlayer(1, 'A witch bumped you! Lost one heart.'), null, this);
    this.physics.add.overlap(this.player.sprite, this.monsters, () => this.damagePlayer(1, 'A green monster got you! Lost one heart.'), null, this);
    this.physics.add.overlap(this.player.sprite, this.fireball, () => this.handleFireballHit(), null, this);
    this.physics.add.overlap(this.player.sprite, this.coins, (_player, coin) => this.collectCoin(coin), null, this);
    this.physics.add.overlap(this.player.sprite, this.key, () => this.collectKey(), null, this);
    this.physics.add.overlap(this.player.sprite, this.door, () => this.touchDoor(), null, this);

    this.cameras.main.startFollow(this.player.sprite, true, 0.09, 0.09);
    this.cameras.main.setDeadzone(120, 80);
    if (this.uiShotMode) {
      this.cameras.main.centerOn(this.player.sprite.x, this.player.sprite.y);
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.shootKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    this.createHud();
    this.createTouchControls();
  }

  update() {
    if (this.referenceShotMode) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.restartGame();
      return;
    }

    this.player.update(this.cursors, this.touchControls, this.jumpKey);
    if (!this.witchDefeated) {
      this.witch.update();
    }
    this.monsterControllers.forEach((monster) => monster.update(this.player.sprite.x));
    this.handleShooting();
    this.updateBolts();
    this.updateFireball();

    if (this.player.sprite.y > GAME_HEIGHT + 15) {
      this.damagePlayer(1, 'You fell in a gap! Lost one heart.');
    }
  }

  createTextures() {
    if (this.textures.exists('knight')) {
      return;
    }

    const knight = this.make.graphics({ x: 0, y: 0, add: false });
    knight.fillStyle(0x173259, 0.28).fillEllipse(38, 68, 48, 12);
    knight.lineStyle(4, 0x617486).lineBetween(22, 10, 15, 0);
    knight.lineStyle(4, 0x617486).lineBetween(53, 10, 60, 0);
    knight.fillStyle(0xdce8f2).fillCircle(14, 0, 4);
    knight.fillStyle(0xdce8f2).fillCircle(61, 0, 4);
    knight.lineStyle(4, 0x315f8e).strokeRoundedRect(14, 11, 48, 27, 10);
    knight.fillStyle(0xb8c6d8).fillRoundedRect(13, 10, 50, 29, 10);
    knight.fillStyle(0xf2f7ff).fillRoundedRect(18, 12, 40, 11, 6);
    knight.fillStyle(0x163256).fillRoundedRect(21, 23, 34, 12, 5);
    knight.fillStyle(0xffd43b).fillRoundedRect(28, 25, 5, 8, 3);
    knight.fillStyle(0xffd43b).fillRoundedRect(44, 25, 5, 8, 3);
    knight.fillStyle(0x237ee0).fillRoundedRect(21, 38, 34, 26, 8);
    knight.fillStyle(0x74c9ff).fillRoundedRect(28, 41, 18, 13, 5);
    knight.fillStyle(0xffffff, 0.24).fillRoundedRect(25, 39, 25, 5, 3);
    knight.lineStyle(2, 0x0f5fa8, 0.8).strokeRoundedRect(24, 39, 28, 22, 7);
    knight.fillStyle(0x0f5fa8).fillRoundedRect(19, 61, 13, 9, 3);
    knight.fillStyle(0x0f5fa8).fillRoundedRect(44, 61, 13, 9, 3);
    knight.fillStyle(0x083a7a).fillRoundedRect(12, 39, 12, 18, 5);
    knight.fillStyle(0x083a7a).fillRoundedRect(53, 39, 12, 17, 5);
    knight.fillStyle(0xcfefff).fillCircle(20, 49, 16);
    knight.fillStyle(0x72bcff).fillCircle(20, 49, 12);
    knight.fillStyle(0xffffff, 0.42).fillCircle(15, 44, 4);
    knight.lineStyle(3, 0x2d6db5).strokeCircle(20, 49, 16);
    knight.fillStyle(0xffffff).fillTriangle(20, 39, 24, 48, 34, 49);
    knight.fillTriangle(20, 39, 16, 48, 6, 49);
    knight.fillTriangle(24, 48, 28, 61, 20, 54);
    knight.fillTriangle(16, 48, 12, 61, 20, 54);
    knight.fillStyle(0x1a2750).fillRoundedRect(57, 43, 15, 10, 4);
    knight.fillStyle(0xcfefff).fillRoundedRect(66, 41, 10, 6, 3);
    knight.fillStyle(0x4be9ff).fillCircle(77, 44, 4);
    knight.fillStyle(0x7ee7ff, 0.28).fillCircle(77, 44, 10);
    knight.fillStyle(0x9d2238).fillTriangle(59, 54, 74, 64, 58, 69);
    knight.generateTexture('knight', 82, 74);

    const witch = this.make.graphics({ x: 0, y: 0, add: false });
    witch.lineStyle(6, 0x8b5a2b).lineBetween(6, 66, 89, 58);
    witch.lineStyle(4, 0xd49a46).lineBetween(75, 50, 92, 64);
    witch.fillStyle(0x5532a3, 0.3).fillEllipse(45, 72, 54, 13);
    witch.fillStyle(0x6f37c9).fillCircle(47, 47, 25);
    witch.fillStyle(0x9f62f0).fillCircle(39, 39, 14);
    witch.fillStyle(0x7a32bd).fillEllipse(39, 58, 30, 16);
    witch.fillStyle(0x8b4de2).fillCircle(30, 54, 7);
    witch.fillStyle(0x8b4de2).fillCircle(62, 56, 6);
    witch.fillStyle(0x7d35cf).fillCircle(30, 46, 11);
    witch.fillStyle(0x7d35cf).fillCircle(64, 50, 10);
    witch.fillStyle(0x2d1a68).fillTriangle(25, 30, 51, 0, 76, 30);
    witch.fillStyle(0x44228a).fillTriangle(33, 28, 52, 7, 69, 28);
    witch.lineStyle(6, 0xffc34d).lineBetween(24, 31, 80, 31);
    witch.fillStyle(0xff8c1a).fillRoundedRect(52, 19, 15, 10, 2);
    witch.fillStyle(0xffc34d).fillRoundedRect(55, 21, 9, 6, 2);
    witch.fillStyle(0xffc7ec).fillCircle(53, 43, 12);
    witch.fillStyle(0xff9fe3).fillCircle(48, 49, 3);
    witch.fillStyle(0xffffff).fillCircle(49, 40, 3);
    witch.fillStyle(0xffffff).fillCircle(57, 40, 3);
    witch.fillStyle(0x22304e).fillCircle(50, 41, 1.5);
    witch.fillStyle(0x22304e).fillCircle(58, 41, 1.5);
    witch.lineStyle(2, 0x70204e).arc(54, 47, 5, 0, Phaser.Math.PI, false);
    witch.fillStyle(0xffffff, 0.3).fillCircle(47, 37, 2);
    witch.fillStyle(0xff74d4, 0.55).fillCircle(62, 36, 3);
    witch.fillStyle(0x47228e).fillRoundedRect(36, 55, 27, 13, 6);
    witch.fillStyle(0xffc34d).fillCircle(73, 55, 8);
    witch.fillStyle(0xffe18a).fillCircle(73, 55, 4);
    witch.fillStyle(0xff74d4, 0.62).fillCircle(22, 31, 2);
    witch.fillStyle(0xff74d4, 0.62).fillCircle(82, 46, 2);
    witch.fillStyle(0xff74d4, 0.55).fillCircle(33, 35, 3);
    witch.fillStyle(0xff74d4, 0.45).fillCircle(69, 40, 2);
    witch.generateTexture('witch', 98, 82);

    const monster = this.make.graphics({ x: 0, y: 0, add: false });
    monster.fillStyle(0x173b22, 0.22).fillEllipse(32, 38, 54, 10);
    monster.fillStyle(0x0f5f2d).fillEllipse(32, 25, 58, 29);
    monster.fillStyle(0x1d9a48).fillEllipse(29, 21, 54, 27);
    monster.fillStyle(0x69d56b).fillEllipse(22, 15, 22, 14);
    monster.fillStyle(0x0c4425).fillCircle(17, 16, 4);
    monster.fillStyle(0x0c4425).fillCircle(33, 16, 4);
    monster.fillStyle(0xffffff).fillCircle(16, 15, 1.6);
    monster.fillStyle(0xffffff).fillCircle(32, 15, 1.6);
    monster.lineStyle(3, 0x0c4425).lineBetween(42, 27, 55, 34);
    monster.lineStyle(3, 0x0c4425).lineBetween(30, 30, 42, 38);
    monster.lineStyle(3, 0x0c4425).lineBetween(20, 30, 10, 38);
    monster.fillStyle(0xb8ff70, 0.55).fillCircle(43, 18, 4);
    monster.fillStyle(0xb8ff70, 0.45).fillCircle(49, 24, 3);
    monster.lineStyle(2, 0xd9ff9f, 0.72).strokeEllipse(25, 18, 30, 17);
    monster.generateTexture('monster', 64, 44);

    const key = this.make.graphics({ x: 0, y: 0, add: false });
    key.lineStyle(8, 0xa96e00, 0.32);
    key.strokeCircle(15, 17, 11);
    key.lineBetween(25, 17, 51, 17);
    key.lineStyle(6, 0xffd43b);
    key.strokeCircle(14, 16, 10);
    key.lineBetween(24, 16, 50, 16);
    key.lineBetween(40, 16, 40, 28);
    key.lineBetween(50, 16, 50, 25);
    key.lineStyle(2, 0xfff1a8);
    key.strokeCircle(11, 13, 4);
    key.generateTexture('key', 58, 36);

    const coin = this.make.graphics({ x: 0, y: 0, add: false });
    coin.fillStyle(0x7c4e00, 0.22).fillEllipse(32, 55, 34, 8);
    coin.fillStyle(0x9a6500).fillEllipse(32, 34, 42, 34);
    coin.fillStyle(0xf3a80e).fillEllipse(30, 30, 42, 34);
    coin.fillStyle(0xffd85a).fillEllipse(28, 27, 32, 25);
    coin.fillStyle(0xfff3b0).fillEllipse(21, 20, 12, 7);
    coin.lineStyle(4, 0x9a6500, 0.82).strokeEllipse(30, 30, 40, 32);
    coin.lineStyle(3, 0xd18400).strokeEllipse(30, 30, 22, 18);
    coin.lineStyle(2, 0xfff1a8).lineBetween(30, 18, 30, 42);
    coin.generateTexture('coin', 64, 64);

    const hudHeart = this.make.graphics({ x: 0, y: 0, add: false });
    hudHeart.fillStyle(0x6b123f, 0.24).fillEllipse(18, 28, 32, 10);
    hudHeart.fillStyle(0xff4f8d).fillCircle(11, 12, 10);
    hudHeart.fillCircle(25, 12, 10);
    hudHeart.fillTriangle(2, 16, 34, 16, 18, 34);
    hudHeart.fillStyle(0xff9fc5, 0.95).fillCircle(9, 8, 4);
    hudHeart.fillStyle(0xffffff, 0.35).fillEllipse(16, 10, 21, 9);
    hudHeart.lineStyle(2, 0xd92669, 0.72).strokeCircle(11, 12, 10);
    hudHeart.strokeCircle(25, 12, 10);
    hudHeart.generateTexture('hud-heart', 36, 38);

    const bolt = this.make.graphics({ x: 0, y: 0, add: false });
    bolt.fillStyle(0x4be9ff, 0.24).fillCircle(18, 12, 16);
    bolt.fillStyle(0x7ee7ff).fillRoundedRect(3, 7, 31, 10, 5);
    bolt.fillStyle(0xffffff).fillRoundedRect(9, 9, 16, 4, 2);
    bolt.fillStyle(0xfff1a8).fillTriangle(30, 4, 45, 12, 30, 20);
    bolt.generateTexture('bolt', 48, 24);

    const fireball = this.make.graphics({ x: 0, y: 0, add: false });
    fireball.fillStyle(0xffb81f, 0.18).fillTriangle(20, 22, 78, 4, 52, 24);
    fireball.fillStyle(0xff4f21, 0.26).fillTriangle(24, 24, 82, 15, 50, 31);
    fireball.fillStyle(0xff3118, 0.6).fillCircle(24, 24, 23);
    fireball.fillStyle(0xff6b21, 0.98).fillCircle(22, 24, 18);
    fireball.fillStyle(0xffb81f, 0.96).fillCircle(18, 22, 13);
    fireball.fillStyle(0xfff1a8, 0.96).fillCircle(15, 20, 7);
    fireball.fillStyle(0xff6b21, 0.92).fillTriangle(37, 24, 64, 7, 55, 24);
    fireball.fillStyle(0xe83a1b, 0.86).fillTriangle(37, 26, 66, 39, 55, 24);
    fireball.fillStyle(0xffd43b, 0.88).fillTriangle(32, 24, 54, 14, 51, 32);
    fireball.fillStyle(0xfff1a8, 0.82).fillCircle(60, 11, 2);
    fireball.fillCircle(70, 24, 1.5);
    fireball.fillCircle(52, 36, 1.8);
    fireball.lineStyle(3, 0xfff1a8, 0.75).strokeCircle(18, 22, 10);
    fireball.generateTexture('fireball', 84, 48);

    const door = this.make.graphics({ x: 0, y: 0, add: false });
    door.fillStyle(0x211936, 0.28).fillEllipse(48, 128, 76, 16);
    door.fillStyle(0x6b3f28).fillRoundedRect(12, 12, 72, 116, 16);
    door.fillStyle(0x8b5a35).fillRoundedRect(16, 16, 64, 108, 13);
    door.fillStyle(0x321d2d).fillRoundedRect(23, 27, 50, 96, 10);
    door.lineStyle(3, 0x5b3724).lineBetween(34, 31, 34, 120);
    door.lineStyle(3, 0x5b3724).lineBetween(52, 31, 52, 120);
    door.fillStyle(0x211936).fillRoundedRect(35, 38, 8, 16, 2);
    door.fillStyle(0x211936).fillRoundedRect(55, 38, 8, 16, 2);
    door.fillStyle(0xffd43b).fillCircle(64, 72, 6);
    door.fillStyle(0xfff1a8).fillCircle(62, 70, 2);
    door.fillStyle(0xc7b2ff).fillTriangle(48, 0, 12, 20, 84, 20);
    door.fillStyle(0x7c65c7).fillTriangle(48, 5, 20, 20, 76, 20);
    door.generateTexture('door', 96, 132);
  }

  getTextureKey(primaryKey, fallbackKey) {
    return this.textures.exists(primaryKey) ? primaryKey : fallbackKey;
  }

  createBackground() {
    const sky = this.add.graphics().setScrollFactor(0.25);
    sky.fillGradientStyle(0x16a8f3, 0x16a8f3, 0x98e1f4, 0x98e1f4, 1, 1, 1, 1);
    sky.fillRect(0, 0, WORLD_WIDTH, GAME_HEIGHT);
    this.add.circle(150, 80, 44, 0xfff1a8, 0.88).setScrollFactor(0.15);
    this.add.circle(135, 65, 16, 0xffffff, 0.25).setScrollFactor(0.15);

    for (let i = 0; i < 18; i += 1) {
      const x = 80 + i * 135;
      const y = 38 + ((i * 73) % 260);
      this.add.star(x, y, 4, 2, 6, 0xffffff, i % 3 === 0 ? 0.9 : 0.55).setScrollFactor(0.28);
    }

    for (let i = 0; i < 8; i += 1) {
      const x = 200 + i * 300;
      const y = 110 + (i % 2) * 42;
      this.add.ellipse(x, y, 170, 50, 0xffffff, 0.6).setScrollFactor(0.35);
      this.add.ellipse(x - 50, y + 7, 88, 36, 0xffffff, 0.44).setScrollFactor(0.35);
      this.add.ellipse(x + 56, y + 5, 94, 34, 0xffffff, 0.42).setScrollFactor(0.35);
      this.add.ellipse(x, y - 8, 90, 36, 0xffffff, 0.3).setScrollFactor(0.35);
    }

    for (let i = 0; i < 7; i += 1) {
      const x = 420 + i * 340;
      this.add.triangle(x, 500, x + 145, 292, x + 290, 500, 0x628e8f, 0.28).setScrollFactor(0.18);
      this.add.triangle(x + 52, 500, x + 170, 335, x + 286, 500, 0x365f73, 0.2).setScrollFactor(0.2);
    }

    for (let i = 0; i < 11; i += 1) {
      const x = 80 + i * 220;
      this.add.rectangle(x, 486, 24, 94, 0x6f4b2c).setOrigin(0.5, 1);
      this.add.rectangle(x - 5, 486, 5, 94, 0x8a6039).setOrigin(0.5, 1);
      this.add.circle(x, 418, 46, 0x3c8f50);
      this.add.circle(x - 30, 438, 32, 0x4ca85f);
      this.add.circle(x + 31, 438, 32, 0x2f7d48);
      this.add.circle(x + 6, 398, 28, 0x5fb96a);
      this.add.circle(x - 17, 417, 8, 0xffd43b, 0.45);
    }

    this.add.ellipse(1970, 238, 340, 74, 0xffffff, 0.42).setScrollFactor(0.55);
    this.add.rectangle(1960, 190, 160, 210, 0x3a3158, 0.78).setOrigin(0.5, 1);
    this.add.rectangle(1885, 230, 70, 170, 0x2c2547, 0.8).setOrigin(0.5, 1);
    this.add.rectangle(2038, 230, 70, 170, 0x2c2547, 0.8).setOrigin(0.5, 1);
    this.add.triangle(1960, 55, 1875, 190, 2045, 190, 0x211936, 0.84);
    this.add.triangle(1885, 104, 1844, 230, 1926, 230, 0x211936, 0.78);
    this.add.triangle(2038, 104, 1997, 230, 2079, 230, 0x211936, 0.78);
    this.add.rectangle(1938, 145, 18, 34, 0xfff1a8, 0.45);
    this.add.rectangle(1984, 145, 18, 34, 0xfff1a8, 0.45);
    this.add.rectangle(1885, 175, 14, 28, 0xfff1a8, 0.36);
    this.add.rectangle(2038, 175, 14, 28, 0xfff1a8, 0.36);
    this.add.text(1910, 262, 'Dark Castle', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#f5e6ff',
      fontStyle: 'bold'
    });

    this.add.rectangle(WORLD_WIDTH / 2, 532, WORLD_WIDTH, 118, 0x1d7d32).setOrigin(0.5);
    this.add.rectangle(WORLD_WIDTH / 2, 506, WORLD_WIDTH, 32, 0x78d955, 0.95).setOrigin(0.5);
    this.add.rectangle(WORLD_WIDTH / 2, 500, WORLD_WIDTH, 8, 0xb9ef73, 0.86).setOrigin(0.5);
    for (let x = 0; x < WORLD_WIDTH + 28; x += 28) {
      this.add.circle(x, 516, 18, 0x55bd43, 0.95).setOrigin(0.5);
      this.add.circle(x + 14, 532, 18, 0x16812e, 0.88).setOrigin(0.5);
    }
  }

  createPlatforms() {
    this.platforms = this.physics.add.staticGroup();
    PLATFORMS.forEach((platform) => {
      const block = this.add.rectangle(
        platform.x + platform.width / 2,
        platform.y + platform.height / 2,
        platform.width,
        platform.height,
        0x063f2f
      );
      block.setStrokeStyle(4, 0x06301f);
      this.add.rectangle(
        platform.x + platform.width / 2,
        platform.y + platform.height / 2 + 8,
        platform.width - 12,
        platform.height - 12,
        0x15783a,
        0.86
      );
      this.add.rectangle(
        platform.x + platform.width / 2,
        platform.y + 4,
        platform.width - 8,
        8,
        0x6ee046
      );
      this.add.rectangle(
        platform.x + platform.width / 2,
        platform.y + 12,
        platform.width - 18,
        5,
        0xc6f365,
        0.88
      );
      this.add.rectangle(
        platform.x + platform.width / 2,
        platform.y + platform.height - 5,
        platform.width - 20,
        6,
        0x06301f,
        0.48
      );
      for (let tuftX = platform.x + 18; tuftX < platform.x + platform.width - 14; tuftX += 42) {
        this.add.triangle(tuftX, platform.y + 2, tuftX + 8, platform.y - 8, tuftX + 16, platform.y + 2, 0x7fd35e);
      }
      this.physics.add.existing(block, true);
      this.platforms.add(block);
    });
  }

  createHud() {
    this.hudLayer = this.add.container(0, 0).setScrollFactor(0).setDepth(100);

    if (this.uiShotMode && this.textures.exists('ui-hud-target')) {
      this.add.image(10.5, 9.9, 'ui-hud-target')
        .setOrigin(0)
        .setDisplaySize(246.5, 184.3)
        .setScrollFactor(0)
        .setDepth(103);
      this.createRestartButton();
      this.messageText = this.add.text(GAME_WIDTH / 2, 98, '', {
        fontFamily: 'Arial',
        fontSize: '28px',
        color: '#fff1a8',
        fontStyle: 'bold',
        stroke: '#25324a',
        strokeThickness: 5
      }).setOrigin(0.5).setScrollFactor(0);
      return;
    }

    this.addGlassPanel(this.hudLayer, 16, 14, 252, 176, 26, 0x0074d6, 0.46, 0x9cf4ff);
    this.addHudRow(56, 54, 'heart');
    this.addHudRow(56, 106, 'key');
    this.addHudRow(56, 158, 'coin');

    this.add.line(0, 0, 92, 82, 244, 82, 0x9cf4ff, 0.2).setScrollFactor(0).setDepth(101);
    this.add.line(0, 0, 92, 134, 244, 134, 0x9cf4ff, 0.2).setScrollFactor(0).setDepth(101);

    this.heartsLabel = this.addHudText(92, 31, 'HEARTS', 16, '#ffffff');
    this.keyLabel = this.addHudText(92, 83, 'KEY', 16, '#ffffff');
    this.coinLabel = this.addHudText(92, 135, 'COINS', 16, '#ffffff');

    this.heartIcons = [];
    for (let i = 0; i < PLAYER_STARTING_HEARTS; i += 1) {
      this.heartIcons.push(
        this.add.image(94 + i * 29, 64, 'hud-heart')
          .setScale(0.72)
          .setScrollFactor(0)
          .setDepth(103)
      );
    }
    this.keyValueText = this.addHudText(92, 108, '', 19, '#b8ff70');
    this.coinValueText = this.addHudText(92, 160, '', 21, '#ffd43b');

    this.createRestartButton();

    this.messageText = this.add.text(GAME_WIDTH / 2, 98, '', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#fff1a8',
      fontStyle: 'bold',
      stroke: '#25324a',
      strokeThickness: 5
    }).setOrigin(0.5).setScrollFactor(0);

    this.updateHud();
  }

  addGlassPanel(layer, x, y, width, height, radius, fillColor, fillAlpha, strokeColor) {
    const shadow = this.add.graphics();
    shadow.fillStyle(0x102c64, 0.24).fillRoundedRect(x + 5, y + 7, width, height, radius);
    const panel = this.add.graphics();
    panel.fillStyle(fillColor, fillAlpha).fillRoundedRect(x, y, width, height, radius);
    panel.lineStyle(4, strokeColor, 0.9).strokeRoundedRect(x + 1, y + 1, width - 2, height - 2, radius);
    panel.lineStyle(2, 0xffffff, 0.62).strokeRoundedRect(x + 7, y + 7, width - 14, height - 14, radius - 6);
    panel.fillStyle(0xffffff, 0.16).fillRoundedRect(x + 10, y + 10, width - 20, 38, radius - 8);
    shadow.setScrollFactor(0).setDepth(100);
    panel.setScrollFactor(0).setDepth(101);
    layer.add([shadow, panel]);
  }

  addHudRow(x, y, type) {
    const ringColor = type === 'heart' ? 0xff8bb8 : type === 'key' ? 0xffe36a : 0x62ffbd;
    const icon = this.add.graphics().setScrollFactor(0).setDepth(102);
    icon.fillStyle(0x06356d, 0.82).fillCircle(x, y, 27);
    icon.lineStyle(3, ringColor, 0.96).strokeCircle(x, y, 27);
    icon.lineStyle(2, 0xffffff, 0.68).strokeCircle(x, y, 21);

    if (type === 'heart') {
      icon.fillStyle(0xff4f8d).fillCircle(x - 7, y - 4, 8);
      icon.fillStyle(0xff4f8d).fillCircle(x + 7, y - 4, 8);
      icon.fillStyle(0xff4f8d).fillTriangle(x - 16, y, x + 16, y, x, y + 18);
      icon.fillStyle(0xffffff, 0.45).fillCircle(x - 8, y - 7, 3);
    } else if (type === 'key') {
      icon.lineStyle(5, 0xffd43b, 1).strokeCircle(x - 7, y - 3, 7);
      icon.lineStyle(5, 0xffd43b, 1).lineBetween(x, y + 2, x + 16, y + 18);
      icon.lineStyle(4, 0xffd43b, 1).lineBetween(x + 9, y + 10, x + 18, y + 10);
      icon.lineStyle(4, 0xffd43b, 1).lineBetween(x + 14, y + 15, x + 22, y + 15);
      icon.lineStyle(2, 0xffffff, 0.55).strokeCircle(x - 9, y - 5, 3);
    } else {
      icon.fillStyle(0x9a6500).fillCircle(x, y, 17);
      icon.fillStyle(0xffb81f).fillCircle(x - 2, y - 2, 16);
      icon.lineStyle(3, 0xfff1a8, 0.85).strokeCircle(x - 2, y - 2, 11);
      icon.fillStyle(0xfff1a8).fillTriangle(x - 2, y - 13, x + 3, y - 3, x + 14, y - 2);
      icon.fillTriangle(x - 2, y - 13, x - 7, y - 3, x - 18, y - 2);
      icon.fillTriangle(x + 3, y - 3, x + 9, y + 12, x - 2, y + 5);
      icon.fillTriangle(x - 7, y - 3, x - 13, y + 12, x - 2, y + 5);
    }
  }

  addHudText(x, y, text, fontSize, color) {
    return this.add.text(x, y, text, {
      fontFamily: 'Arial',
      fontSize: `${fontSize}px`,
      color,
      fontStyle: 'bold',
      stroke: '#173259',
      strokeThickness: 2
    }).setScrollFactor(0).setDepth(103);
  }

  createRestartButton() {
    const x = this.uiShotMode ? 796 : GAME_WIDTH - 180;
    const y = this.uiShotMode ? 16 : 22;
    const width = this.uiShotMode ? 164 : 160;
    const height = 58;
    const button = this.add.container(x, y).setScrollFactor(0).setDepth(105);

    if (this.textures.exists('ui-restart-target')) {
      const art = this.add.image(0, 0, 'ui-restart-target')
        .setOrigin(0)
        .setDisplaySize(width, height);
      const hitZone = this.add.zone(width / 2, height / 2, width + 18, height + 16).setInteractive({ useHandCursor: true });
      hitZone.on('pointerdown', () => this.restartGame());
      button.add([art, hitZone]);
      return;
    }

    const shadow = this.add.graphics();
    shadow.fillStyle(0x672047, 0.32).fillRoundedRect(5, 8, width, height, 18);
    const bg = this.add.graphics();
    bg.fillStyle(0xff3f79, 1).fillRoundedRect(0, 0, width, height, 18);
    bg.fillStyle(0xc9185a, 0.88).fillRoundedRect(0, height / 2, width, height / 2, 18);
    bg.lineStyle(4, 0xffffff, 0.82).strokeRoundedRect(1, 1, width - 2, height - 2, 18);
    bg.lineStyle(3, 0xff9fba, 0.82).strokeRoundedRect(8, 8, width - 16, height - 16, 13);
    const icon = this.add.text(31, 28, '↻', {
      fontFamily: 'Arial',
      fontSize: '34px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    const label = this.add.text(60, 16, 'RESTART', {
      fontFamily: 'Arial',
      fontSize: '21px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    const hitZone = this.add.zone(width / 2, height / 2, width + 18, height + 16).setInteractive({ useHandCursor: true });
    hitZone.on('pointerdown', () => this.restartGame());
    button.add([shadow, bg, icon, label, hitZone]);
  }

  createTouchControls() {
    this.touchButtons = {
      left: this.createControlButton(97.6, 456.2, 'left', '', 66, 0x15a8ff, 0x06356d, '<', 'ui-left-target'),
      right: this.createControlButton(254.6, 456.2, 'right', '', 66, 0x15a8ff, 0x06356d, '>', 'ui-right-target'),
      shoot: this.createControlButton(727.4, 455.0, 'shoot', 'ZAP', 72, 0xb143ff, 0x2b0b68, '⚡', 'ui-zap-target'),
      jump: this.createControlButton(883.1, 455.0, 'jump', 'JUMP', 74, 0x6dff63, 0x0b671f, '^', 'ui-jump-target')
    };

    this.input.on('pointerup', this.boundReleasePointerFromAllControls);
    this.input.on('pointercancel', this.boundReleasePointerFromAllControls);
  }

  createControlButton(x, y, key, label, radius, glowColor, fillColor, icon = label, artKey = null) {
    const button = this.add.container(x, y).setScrollFactor(0).setDepth(110);

    if (artKey && this.textures.exists(artKey)) {
      const artSizes = {
        'ui-left-target': { width: 139.5, height: 138.9 },
        'ui-right-target': { width: 139.5, height: 138.9 },
        'ui-zap-target': { width: 143.6, height: 143.0 },
        'ui-jump-target': { width: 145.9, height: 144.7 }
      };
      const artSize = artSizes[artKey];
      const art = this.add.image(0, 0, artKey)
        .setDisplaySize(artSize.width, artSize.height);
      const hitZone = this.add.zone(0, 0, radius * 2.35, radius * 2.35).setInteractive();
      this.addTouchControlEvents(hitZone, key);
      button.add([art, hitZone]);
      button.restScale = 1;
      return button;
    }

    const glow = this.add.circle(0, 0, radius + 18, glowColor, 0.18);
    const outer = this.add.circle(0, 0, radius + 9, glowColor, 0.18);
    outer.setStrokeStyle(4, 0xffffff, 0.78);
    const ring = this.add.circle(0, 0, radius + 2, glowColor, 0.45);
    ring.setStrokeStyle(4, glowColor, 0.98);
    const face = this.add.circle(0, 0, radius, fillColor, 0.82);
    face.setStrokeStyle(2, 0xffffff, 0.36);
    const shine = this.add.ellipse(-radius * 0.28, -radius * 0.36, radius * 0.72, radius * 0.3, 0xffffff, 0.16);
    const iconY = key === 'shoot' ? -14 : label.length > 0 ? -6 : 0;
    const iconText = this.add.text(0, iconY, icon, {
      fontFamily: 'Arial',
      fontSize: key === 'shoot' ? '36px' : '54px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#143254',
      strokeThickness: 5
    }).setOrigin(0.5);
    const labelText = this.add.text(0, key === 'shoot' ? 22 : 34, label, {
      fontFamily: 'Arial',
      fontSize: key === 'shoot' ? '29px' : '25px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#143254',
      strokeThickness: 5
    }).setOrigin(0.5);
    labelText.setVisible(label.length > 0);
    const hitZone = this.add.zone(0, 0, radius * 2.35, radius * 2.35).setInteractive();

    this.addTouchControlEvents(hitZone, key);
    button.add([glow, outer, ring, face, shine, iconText, labelText, hitZone]);
    button.restScale = 1;
    return button;
  }

  addTouchControlEvents(hitZone, key) {
    hitZone.on('pointerdown', (pointer) => this.pressTouchControl(key, pointer));
    hitZone.on('pointerup', (pointer) => this.releaseTouchControl(key, pointer));
    hitZone.on('pointerupoutside', (pointer) => this.releaseTouchControl(key, pointer));
  }

  pressTouchControl(key, pointer) {
    this.controlPointers[key].add(pointer.id);
    this.touchControls[key] = true;
    this.setControlPressedState(key, true);
  }

  releaseTouchControl(key, pointer) {
    this.controlPointers[key].delete(pointer.id);
    this.touchControls[key] = this.controlPointers[key].size > 0;
    this.setControlPressedState(key, this.touchControls[key]);
  }

  releasePointerFromAllControls(pointer) {
    Object.keys(this.controlPointers).forEach((key) => {
      this.controlPointers[key].delete(pointer.id);
      this.touchControls[key] = this.controlPointers[key].size > 0;
      this.setControlPressedState(key, this.touchControls[key]);
    });
  }

  clearTouchControls() {
    if (!this.controlPointers || !this.touchControls) {
      return;
    }

    Object.keys(this.controlPointers).forEach((key) => {
      this.controlPointers[key].clear();
      this.touchControls[key] = false;
      this.setControlPressedState(key, false, false);
    });

    if (this.input && this.boundReleasePointerFromAllControls) {
      this.input.off('pointerup', this.boundReleasePointerFromAllControls);
      this.input.off('pointercancel', this.boundReleasePointerFromAllControls);
    }
  }

  restartGame() {
    this.clearTouchControls();
    this.scene.restart();
  }

  startScene(sceneKey) {
    this.clearTouchControls();
    this.scene.start(sceneKey);
  }

  setControlPressedState(key, isPressed, shouldAnimate = true) {
    const button = this.touchButtons?.[key];
    if (!button || button.isPressed === isPressed) {
      return;
    }

    button.isPressed = isPressed;
    this.tweens.killTweensOf(button);
    if (!shouldAnimate) {
      button.setScale(1);
      button.setAlpha(1);
      return;
    }

    this.tweens.add({
      targets: button,
      scale: isPressed ? 0.9 : 1,
      alpha: isPressed ? 0.86 : 1,
      duration: 90,
      ease: 'Sine.easeOut'
    });
  }

  animateCoin(coin) {
    this.tweens.add({
      targets: coin,
      scaleX: 0.22,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.tweens.add({
      targets: coin,
      y: coin.y - 7,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  handleShooting() {
    const wantsShoot = this.touchControls.shoot || this.shootKey.isDown;
    const startedShooting = wantsShoot && !this.shootWasDown;

    if (!startedShooting || this.time.now < this.nextBlasterAt) {
      this.shootWasDown = wantsShoot;
      return;
    }

    this.nextBlasterAt = this.time.now + BLASTER_COOLDOWN_MS;
    this.shootBolt();
    this.shootWasDown = wantsShoot;
  }

  shootBolt() {
    const facingLeft = this.player.sprite.flipX;
    const direction = facingLeft ? -1 : 1;
    const boltX = this.player.sprite.x + BLASTER_OFFSET.x * direction;
    const boltY = this.player.sprite.y + BLASTER_OFFSET.y;
    const bolt = this.bolts.create(boltX, boltY, 'bolt');
    bolt.body.allowGravity = false;
    bolt.startX = boltX;
    bolt.setFlipX(facingLeft);
    bolt.setVelocityX(BLASTER_SPEED * direction);
    bolt.setDepth(4);
  }

  updateBolts() {
    this.bolts.children.getArray().forEach((bolt) => {
      if (!bolt.active) {
        return;
      }

      const hitMonster = this.monsterControllers.find((monster) => (
        monster.sprite.active && this.boltHitsSprite(bolt, monster.sprite)
      ));

      if (hitMonster) {
        this.removeBolt(bolt);
        this.defeatMonster(hitMonster);
        return;
      }

      if (!this.witchDefeated && this.witch.sprite.active && this.boltHitsWitch(bolt)) {
        this.removeBolt(bolt);
        this.defeatWitch();
        return;
      }

      if (Math.abs(bolt.x - bolt.startX) >= BLASTER_RANGE) {
        this.removeBolt(bolt);
      }
    });
  }

  boltHitsWitch(bolt) {
    return this.boltHitsSprite(bolt, this.witch.sprite);
  }

  boltHitsSprite(bolt, sprite) {
    return Phaser.Geom.Intersects.RectangleToRectangle(
      bolt.getBounds(),
      sprite.getBounds()
    );
  }

  removeBolt(bolt) {
    if (!bolt?.active) {
      return;
    }

    if (bolt.body) {
      bolt.disableBody(true, true);
    }
    bolt.destroy();
  }

  defeatWitch() {
    this.witchDefeated = true;
    const witchX = this.witch.sprite.x;
    const witchY = this.witch.sprite.y;

    this.hideFireball();
    this.witch.sprite.disableBody(true, true);
    this.time.delayedCall(0, () => this.bolts.clear(true, true));
    this.showMessage('Zap! The witch flew away!');

    for (let i = 0; i < 10; i += 1) {
      const sparkle = this.add.circle(
        witchX + Phaser.Math.Between(-24, 24),
        witchY + Phaser.Math.Between(-18, 18),
        Phaser.Math.Between(3, 7),
        0xfff1a8,
        0.9
      );
      this.tweens.add({
        targets: sparkle,
        x: sparkle.x + Phaser.Math.Between(-34, 34),
        y: sparkle.y + Phaser.Math.Between(-34, 18),
        alpha: 0,
        scale: 1.8,
        duration: 520,
        onComplete: () => sparkle.destroy()
      });
    }
  }

  defeatMonster(monster) {
    const monsterX = monster.sprite.x;
    const monsterY = monster.sprite.y;
    monster.sprite.disableBody(true, true);
    this.showMessage('Zap! Green monster gone!');

    const pop = this.add.circle(monsterX, monsterY, 18, 0xb8ff70, 0.75);
    this.tweens.add({
      targets: pop,
      alpha: 0,
      scale: 2.2,
      duration: 360,
      onComplete: () => pop.destroy()
    });
  }

  getBroomTipPosition() {
    const facingLeft = this.witch?.sprite.flipX;
    const offsetX = facingLeft ? -FIREBALL_BROOM_OFFSET.x : FIREBALL_BROOM_OFFSET.x;

    return {
      x: this.witch.sprite.x + offsetX,
      y: this.witch.sprite.y + FIREBALL_BROOM_OFFSET.y
    };
  }

  updateFireball() {
    if (this.witchDefeated) {
      return;
    }

    if (this.fireball.active && this.fireball.x < this.fireballStartX - FIREBALL_TRAVEL_DISTANCE) {
      this.hideFireball();
    }

    if (!this.fireball.active && this.time.now >= this.nextFireballAt) {
      this.shootFireball();
    }
  }

  shootFireball() {
    const broomTip = this.getBroomTipPosition();
    this.fireballStartX = broomTip.x;
    this.fireball.enableBody(true, broomTip.x, broomTip.y, true, true);
    this.fireball.setAlpha(1);
    this.fireball.setVelocityX(-FIREBALL_SPEED);

    const puff = this.add.circle(broomTip.x, broomTip.y, 8, 0xffd43b, 0.85);
    this.tweens.add({
      targets: puff,
      alpha: 0,
      scale: 2.6,
      duration: 260,
      onComplete: () => puff.destroy()
    });
  }

  hideFireball() {
    if (!this.fireball.active) {
      this.nextFireballAt = this.time.now + FIREBALL_RELOAD_MS;
      return;
    }

    this.fireball.setVelocity(0, 0);
    this.fireball.disableBody(true, true);
    this.nextFireballAt = this.time.now + FIREBALL_RELOAD_MS;
  }

  handleFireballHit() {
    if (this.isInvincible) {
      return;
    }

    this.hideFireball();
    this.damagePlayer(FIREBALL_DAMAGE, 'Broom fire hit you! Lost one heart.');
  }

  collectKey() {
    this.hasKey = true;
    this.key.disableBody(true, true);
    this.showMessage(LEVEL_MESSAGES.keyFound);
    this.updateHud();
  }

  collectCoin(coin) {
    coin.disableBody(true, true);
    this.coinsCollected += 1;
    this.showMessage(`Coin ${this.coinsCollected} of ${this.totalCoins}!`);
    this.updateHud();
  }

  touchDoor() {
    if (!this.hasKey) {
      if (this.time.now - this.lastDoorMessageAt > 900) {
        this.lastDoorMessageAt = this.time.now;
        this.showMessage(LEVEL_MESSAGES.doorLocked);
      }
      return;
    }

    this.startScene('WinScene');
  }

  damagePlayer(amount = 1, message = 'Ouch! Lost one heart.') {
    if (this.isInvincible) {
      return;
    }

    this.isInvincible = true;
    this.hearts -= amount;
    this.updateHud();

    if (this.hearts <= 0) {
      this.cameras.main.flash(220, 210, 60, 90);
      this.startScene('GameOverScene');
      return;
    }

    this.showMessage(message);
    this.cameras.main.shake(180, 0.008);
    this.cameras.main.flash(180, 210, 60, 90);
    this.player.respawn(PLAYER_RESPAWN_POSITION);
    this.tweens.add({
      targets: this.player.sprite,
      alpha: 0.25,
      yoyo: true,
      repeat: 5,
      duration: 90,
      onComplete: () => {
        this.player.sprite.setAlpha(1);
        this.isInvincible = false;
      }
    });
  }

  showMessage(message) {
    this.messageText.setText(message);
    this.time.delayedCall(1800, () => this.messageText.setText(''));
  }

  updateHud() {
    this.heartIcons.forEach((heart, index) => {
      const isFull = index < this.hearts;
      heart.setAlpha(isFull ? 1 : 0.22);
      heart.setTint(isFull ? 0xffffff : 0xdce8f2);
    });
    this.keyValueText.setText(this.hasKey ? 'FOUND!' : 'NOT YET');
    this.keyValueText.setColor(this.hasKey ? '#b8ff70' : '#dce8f2');
    this.coinValueText.setText(`${this.coinsCollected}/${this.totalCoins}`);
  }
}
