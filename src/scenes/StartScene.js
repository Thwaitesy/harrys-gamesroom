import Phaser from 'phaser';
import { GAME_TITLE_BOTTOM, GAME_TITLE_TOP, LEVEL_NAME } from '../config/gameSettings.js';

export default class StartScene extends Phaser.Scene {
  constructor() {
    super('StartScene');
  }

  create() {
    if (new URLSearchParams(window.location.search).has('uiShot')) {
      this.scene.start('GameScene');
      return;
    }

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x77c8f2).setOrigin(0);
    this.add.circle(770, 115, 56, 0xfff1a8, 0.95);
    this.add.text(width / 2, 110, GAME_TITLE_TOP, {
      fontFamily: 'Arial',
      fontSize: '58px',
      color: '#22304e',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(width / 2, 174, GAME_TITLE_BOTTOM, {
      fontFamily: 'Arial',
      fontSize: '34px',
      color: '#4b2c7a',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(width / 2, 238, LEVEL_NAME, {
      fontFamily: 'Arial',
      fontSize: '25px',
      color: '#143b35'
    }).setOrigin(0.5);
    this.add.text(width / 2, 286, 'Collect the key, dodge the witches, and reach the castle!', {
      fontFamily: 'Arial',
      fontSize: '25px',
      color: '#22304e'
    }).setOrigin(0.5);

    const startButton = this.add.text(width / 2, 380, 'Start Game', {
      fontFamily: 'Arial',
      fontSize: '34px',
      color: '#ffffff',
      backgroundColor: '#2f7d50',
      padding: { x: 28, y: 16 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startButton.on('pointerdown', () => this.scene.start('GameScene'));
  }
}
