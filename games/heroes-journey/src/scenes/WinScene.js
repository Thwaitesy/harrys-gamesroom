import Phaser from 'phaser';
import { WIN_MESSAGE } from '../config/gameSettings.js';
import { createGamesButton } from '../ui/gamesButton.js';

export default class WinScene extends Phaser.Scene {
  constructor() {
    super('WinScene');
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x8ee6b0).setOrigin(0);
    createGamesButton(this, width - 144, 18);
    this.add.text(width / 2, 170, WIN_MESSAGE, {
      fontFamily: 'Arial',
      fontSize: '46px',
      color: '#193d31',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(width / 2, 355, 'Play Again', {
      fontFamily: 'Arial',
      fontSize: '34px',
      color: '#ffffff',
      backgroundColor: '#2f5f9f',
      padding: { x: 28, y: 16 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('GameScene'));
  }
}
