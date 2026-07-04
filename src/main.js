import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, BACKGROUND_COLOR } from './config/gameSettings.js';
import StartScene from './scenes/StartScene.js';
import GameScene from './scenes/GameScene.js';
import WinScene from './scenes/WinScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import { setupUpdateWatcher } from './updateWatcher.js';
import './styles.css';

const isUiShot = new URLSearchParams(window.location.search).has('uiShot');
const gameWidth = isUiShot ? 1280 : GAME_WIDTH;
const gameHeight = isUiShot ? 702 : GAME_HEIGHT;

if (isUiShot) {
  document.body.classList.add('ui-shot-reference-page');
  document.body.style.setProperty(
    '--ui-reference-target',
    `url("${import.meta.env.BASE_URL}assets/ui-reference-target-1280.png")`
  );
}

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: BACKGROUND_COLOR,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: gameWidth,
    height: gameHeight
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1050 },
      debug: false
    }
  },
  scene: [StartScene, GameScene, WinScene, GameOverScene]
};

const game = new Phaser.Game(config);

if (import.meta.env.DEV) {
  window.knightGame = game;
}

setupUpdateWatcher();
