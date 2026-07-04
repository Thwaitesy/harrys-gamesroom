import { MONSTER_CHASE_DISTANCE } from '../config/gameSettings.js';

export default class Monster {
  constructor(scene, config) {
    this.scene = scene;
    this.minX = config.minX;
    this.maxX = config.maxX;
    this.speed = config.speed;
    this.direction = -1;
    this.sprite = scene.physics.add.sprite(config.x, config.y, 'monster');
    this.sprite.setDepth(3);
    this.sprite.setBounce(0);
    this.sprite.setCollideWorldBounds(false);
    this.sprite.body.setSize(50, 24).setOffset(7, 14);
    this.sprite.setVelocityX(-this.speed);
  }

  update(playerX) {
    if (!this.sprite.active) {
      return;
    }

    if (this.sprite.x <= this.minX) {
      this.direction = 1;
    } else if (this.sprite.x >= this.maxX) {
      this.direction = -1;
    } else if (Math.abs(playerX - this.sprite.x) <= MONSTER_CHASE_DISTANCE) {
      this.direction = playerX < this.sprite.x ? -1 : 1;
    }

    if (this.direction < 0 && this.sprite.x <= this.minX) {
      this.direction = 1;
    }

    if (this.direction > 0 && this.sprite.x >= this.maxX) {
      this.direction = -1;
    }

    this.sprite.setVelocityX(this.direction * this.speed);
    this.sprite.setFlipX(this.direction > 0);
  }
}
