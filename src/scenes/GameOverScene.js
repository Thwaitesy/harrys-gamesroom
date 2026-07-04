import Phaser from 'phaser';
import { GAME_OVER_MESSAGE } from '../config/gameSettings.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x39295c).setOrigin(0);
    this.add.text(width / 2, 170, GAME_OVER_MESSAGE, {
      fontFamily: 'Arial',
      fontSize: '44px',
      color: '#fff1a8',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(width / 2, 375, 'Restart', {
      fontFamily: 'Arial',
      fontSize: '34px',
      color: '#ffffff',
      backgroundColor: '#b34872',
      padding: { x: 28, y: 16 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('GameScene'));
  }
}
