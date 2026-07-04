import { WITCH_PATROL_DISTANCE, WITCH_SPEED } from '../config/gameSettings.js';

export default class Witch {
  constructor(scene, x, y) {
    this.scene = scene;
    this.startX = x;
    this.endX = x + WITCH_PATROL_DISTANCE;
    const textureKey = scene.textures.exists('witch-art') ? 'witch-art' : 'witch';
    this.sprite = scene.physics.add.sprite(x, y, textureKey);
    this.sprite.setScale(textureKey === 'witch-art' ? 0.68 : 1.42);
    this.sprite.body.allowGravity = false;
    this.sprite.body.setSize(textureKey === 'witch-art' ? 120 : 74, textureKey === 'witch-art' ? 92 : 54);
    this.sprite.body.setOffset(textureKey === 'witch-art' ? 38 : 12, textureKey === 'witch-art' ? 58 : 18);
    this.sprite.setVelocityX(WITCH_SPEED);
    this.sprite.setImmovable(true);
  }

  update() {
    if (this.sprite.x >= this.endX) {
      this.sprite.setVelocityX(-WITCH_SPEED);
      this.sprite.setFlipX(true);
    }

    if (this.sprite.x <= this.startX) {
      this.sprite.setVelocityX(WITCH_SPEED);
      this.sprite.setFlipX(false);
    }
  }
}
