import {
  PLAYER_COYOTE_MS,
  PLAYER_JUMP_BUFFER_MS,
  PLAYER_JUMP_FORCE,
  PLAYER_SPEED
} from '../config/gameSettings.js';

export default class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    const textureKey = 'knight';
    this.sprite = scene.physics.add.sprite(x, y, textureKey);
    this.sprite.setScale(1.08);
    this.sprite.setCollideWorldBounds(false);
    this.sprite.setSize(34, 54);
    this.sprite.setOffset(20, 12);
    this.sprite.body.setMaxVelocity(PLAYER_SPEED, 900);
    this.jumpWasDown = false;
    this.coyoteJumpUntil = 0;
    this.bufferedJumpUntil = 0;
  }

  update(cursors, touchControls, jumpKey) {
    const movingLeft = cursors.left.isDown || touchControls.left;
    const movingRight = cursors.right.isDown || touchControls.right;
    const wantsJump = cursors.up.isDown || jumpKey.isDown || touchControls.jump;
    const now = this.scene.time.now;

    if (this.sprite.body.blocked.down) {
      this.coyoteJumpUntil = now + PLAYER_COYOTE_MS;
    }

    if (wantsJump && !this.jumpWasDown) {
      this.bufferedJumpUntil = now + PLAYER_JUMP_BUFFER_MS;
    }

    if (movingLeft) {
      this.sprite.setVelocityX(-PLAYER_SPEED);
      this.sprite.setFlipX(true);
    } else if (movingRight) {
      this.sprite.setVelocityX(PLAYER_SPEED);
      this.sprite.setFlipX(false);
    } else {
      this.sprite.setVelocityX(0);
    }

    if (now <= this.bufferedJumpUntil && now <= this.coyoteJumpUntil) {
      this.sprite.setVelocityY(-PLAYER_JUMP_FORCE);
      this.bufferedJumpUntil = 0;
      this.coyoteJumpUntil = 0;
    }

    this.jumpWasDown = wantsJump;
  }

  respawn(position) {
    this.sprite.enableBody(true, position.x, position.y, true, true);
    this.sprite.setVelocity(0, 0);
  }
}
