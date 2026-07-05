const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const livesEl = document.getElementById("lives");
const powerEl = document.getElementById("power");
const overlay = document.getElementById("overlay");
const startButton = document.getElementById("startButton");

const leftButton = document.getElementById("leftButton");
const rightButton = document.getElementById("rightButton");
const fireButton = document.getElementById("fireButton");

const W = canvas.width;
const H = canvas.height;
const keys = new Set();
const pointerButtons = { left: false, right: false, fire: false };
const touchAim = { active: false, x: W / 2 };

let bestScore = Number(localStorage.getItem("starSprinterBest") || 0);
let game;
let lastTime = 0;
let animationId = 0;

bestEl.textContent = bestScore;

function resetGame() {
  const stars = Array.from({ length: 120 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    speed: 22 + Math.random() * 86,
    size: Math.random() < 0.82 ? 1 : 2,
    color: ["#ffffff", "#7cf8ff", "#ff5c8a", "#ffe96b"][Math.floor(Math.random() * 4)]
  }));

  game = {
    state: "playing",
    score: 0,
    lives: 5,
    power: 2,
    invulnerable: 2.4,
    spawnTimer: 1.2,
    pickupTimer: 1.4,
    shipTimer: 5,
    nextPickupPower: true,
    nextPickupShip: true,
    shotCooldown: 0,
    autoFire: true,
    messageTimer: 0,
    message: "",
    elapsed: 0,
    stars,
    bullets: [],
    enemyBullets: [],
    enemies: [],
    pickups: [],
    helpers: [],
    bursts: [],
    player: {
      x: W / 2,
      y: H - 94,
      radius: 24,
      speed: 330
    }
  };
  updateHud();
}

function updateHud() {
  scoreEl.textContent = game.score;
  livesEl.textContent = "♥".repeat(Math.max(0, game.lives));
  powerEl.textContent = `Lv ${game.power}`;
  if (game.score > bestScore) {
    bestScore = game.score;
    bestEl.textContent = bestScore;
    localStorage.setItem("starSprinterBest", String(bestScore));
  }
}

function startGame() {
  resetGame();
  overlay.classList.add("hidden");
  cancelAnimationFrame(animationId);
  lastTime = performance.now();
  animationId = requestAnimationFrame(tick);
}

function finishGame() {
  game.state = "ended";
  overlay.querySelector("h1").textContent = "Great Flying!";
  overlay.querySelector("p").textContent = `Score: ${game.score}. Ready for another run?`;
  startButton.textContent = "Play Again";
  overlay.classList.remove("hidden");
}

function tick(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.033);
  lastTime = time;
  update(dt);
  draw();
  animationId = requestAnimationFrame(tick);
}

function update(dt) {
  if (game.state !== "playing") return;

  const movingLeft = keys.has("ArrowLeft") || keys.has("KeyA") || pointerButtons.left;
  const movingRight = keys.has("ArrowRight") || keys.has("KeyD") || pointerButtons.right;
  const firing = game.autoFire || keys.has("Space") || keys.has("ArrowUp") || keys.has("KeyW") || pointerButtons.fire;

  if (touchAim.active) {
    game.player.x = touchAim.x;
  } else {
    if (movingLeft) game.player.x -= game.player.speed * dt;
    if (movingRight) game.player.x += game.player.speed * dt;
  }
  game.player.x = clamp(game.player.x, 38, W - 38);

  game.shotCooldown -= dt;
  game.invulnerable -= dt;
  game.messageTimer -= dt;
  game.elapsed += dt;

  if (firing && game.shotCooldown <= 0) shoot();

  updateStars(dt);
  updateBullets(dt);
  updateEnemyBullets(dt);
  updateEnemies(dt);
  updatePickups(dt);
  updateHelpers(dt);
  updateBursts(dt);
  spawnThings(dt);
  checkCollisions();
  updateHud();
}

function updateStars(dt) {
  for (const star of game.stars) {
    star.y += star.speed * dt;
    if (star.y > H) {
      star.y = -4;
      star.x = Math.random() * W;
    }
  }
}

function updateBullets(dt) {
  for (const bullet of game.bullets) {
    bullet.y -= bullet.speed * dt;
  }
  game.bullets = game.bullets.filter((bullet) => bullet.y > -30);
}

function updateEnemyBullets(dt) {
  const speedRamp = enemySpeedRamp();
  for (const bullet of game.enemyBullets) {
    bullet.x += bullet.vx * speedRamp * dt;
    bullet.y += bullet.vy * speedRamp * dt;
  }
  game.enemyBullets = game.enemyBullets.filter((bullet) => bullet.y < H + 40 && bullet.x > -40 && bullet.x < W + 40);
}

function updateEnemies(dt) {
  const speedRamp = enemySpeedRamp();
  for (const enemy of game.enemies) {
    enemy.y += enemy.speed * speedRamp * dt;
    if (enemy.type === "hunter") {
      enemy.x += Math.sign(game.player.x - enemy.x) * enemy.sway * speedRamp * dt;
      enemy.x += Math.sin(enemy.y * 0.04 + enemy.wobble) * 28 * speedRamp * dt;
    } else if (enemy.type === "slicer") {
      enemy.x += enemy.drift * speedRamp * dt + Math.sin(enemy.y * 0.055 + enemy.wobble) * enemy.sway * speedRamp * dt;
    } else {
      enemy.x += Math.sin(enemy.y * 0.035 + enemy.wobble) * enemy.sway * speedRamp * dt;
    }
    enemy.x = clamp(enemy.x, enemy.radius + 10, W - enemy.radius - 10);

    if (enemy.canShoot) {
      enemy.fireTimer -= dt;
      if (enemy.fireTimer <= 0 && enemy.y > 80 && enemy.y < H - 220) {
        shootEnemyPlasma(enemy);
        enemy.fireTimer = enemy.fireRate + Math.random() * 0.8;
      }
    }
  }
  game.enemies = game.enemies.filter((enemy) => enemy.y < H + 70);
}

function enemySpeedRamp() {
  return 1 + Math.min(0.55, game.elapsed / 150 + game.score / 6500);
}

function updatePickups(dt) {
  for (const pickup of game.pickups) {
    pickup.y += pickup.speed * dt;
    pickup.spin += dt * 8;
  }
  game.pickups = game.pickups.filter((pickup) => pickup.y < H + 40);
}

function updateHelpers(dt) {
  const slots = helperSlots();
  for (let i = 0; i < game.helpers.length; i += 1) {
    const helper = game.helpers[i];
    const slot = slots[i] || { x: 0, y: 18 };
    helper.x += (game.player.x + slot.x - helper.x) * Math.min(1, dt * 9);
    helper.y += (game.player.y + slot.y - helper.y) * Math.min(1, dt * 9);
    helper.bob += dt * 5;
  }
}

function updateBursts(dt) {
  for (const burst of game.bursts) {
    burst.life -= dt;
    for (const bit of burst.bits) {
      bit.x += bit.vx * dt;
      bit.y += bit.vy * dt;
      bit.vy += 90 * dt;
    }
  }
  game.bursts = game.bursts.filter((burst) => burst.life > 0);
}

function spawnThings(dt) {
  game.spawnTimer -= dt;
  game.pickupTimer -= dt;
  game.shipTimer -= dt;

  if (game.spawnTimer <= 0) {
    game.enemies.push(makeEnemy());
    if (game.score > 900 && Math.random() < 0.28) {
      const buddy = makeEnemy("slicer");
      buddy.x = clamp(game.enemies[game.enemies.length - 1].x + (Math.random() < 0.5 ? -90 : 90), 60, W - 60);
      buddy.y -= 55;
      game.enemies.push(buddy);
    }
    game.spawnTimer = Math.max(0.42, 1.05 - game.score / 3200 - game.elapsed / 320);
  }

  if (game.shipTimer <= 0 && game.helpers.length < 4) {
    game.pickups.push(makePickup("ship"));
    game.nextPickupShip = false;
    game.shipTimer = game.nextPickupShip ? 5 : 11 + Math.random() * 7;
  }

  if (game.pickupTimer <= 0) {
    const kind = game.nextPickupPower || (game.power < 7 && Math.random() < 0.74) ? "power" : "heart";
    game.nextPickupPower = false;
    game.pickups.push(makePickup(kind));
    game.pickupTimer = 5.5 + Math.random() * 6;
  }
}

function makeEnemy(forcedType) {
  const difficulty = Math.min(1, game.score / 1800 + game.elapsed / 160);
  const roll = Math.random();
  let type = forcedType || "scout";
  if (!forcedType) {
    if (game.score > 950 && roll < 0.18) type = "brute";
    else if (game.score > 420 && roll < 0.44) type = "hunter";
    else if (game.score > 120 && roll < 0.68) type = "slicer";
  }

  const base = {
    type,
    x: 44 + Math.random() * (W - 88),
    y: -48,
    radius: 24,
    speed: 70 + Math.random() * 44 + difficulty * 76,
    hp: game.score > 650 && Math.random() < 0.35 ? 2 : 1,
    score: 50,
    sway: 20 + Math.random() * 48,
    drift: (Math.random() < 0.5 ? -1 : 1) * (55 + Math.random() * 50),
    wobble: Math.random() * Math.PI * 2,
    color: Math.random() < 0.5 ? "#ff405d" : "#35d7ff",
    accent: "#ffffff",
    canShoot: game.score > 380 && Math.random() < 0.28 + difficulty * 0.24,
    fireRate: 1.7 - difficulty * 0.45,
    fireTimer: 1 + Math.random() * 1.3
  };

  if (type === "slicer") {
    return { ...base, radius: 22, speed: base.speed + 58, hp: 1, score: 65, color: "#ff9f2e", accent: "#ffe96b", sway: 70 };
  }
  if (type === "hunter") {
    return { ...base, radius: 26, speed: base.speed + 22, hp: 2, score: 85, color: "#a65cff", accent: "#ff7dff", sway: 78, canShoot: game.score > 450 };
  }
  if (type === "brute") {
    return { ...base, radius: 38, speed: base.speed - 24, hp: 5, score: 180, color: "#24d37f", accent: "#d8ff7d", sway: 26, canShoot: true, fireRate: 1.35, y: -70 };
  }
  return base;
}

function shootEnemyPlasma(enemy) {
  const dx = game.player.x - enemy.x;
  const dy = game.player.y - enemy.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const speed = enemy.type === "brute" ? 180 : 215;
  game.enemyBullets.push({
    x: enemy.x,
    y: enemy.y + enemy.radius * 0.5,
    vx: (dx / length) * speed,
    vy: (dy / length) * speed,
    radius: enemy.type === "brute" ? 11 : 8,
    color: enemy.type === "hunter" ? "#d577ff" : "#ff405d"
  });
}

function makePickup(kind) {
  const level = kind === "power" ? Math.min(7, game.power + 1) : 0;
  return {
    kind,
    level,
    x: 46 + Math.random() * (W - 92),
    y: -28,
    radius: kind === "ship" ? 27 : 23,
    speed: kind === "ship" ? 78 : 88,
    spin: 0
  };
}

function shoot() {
  const offsetsByPower = {
    1: [0],
    2: [0],
    3: [-16, 16],
    4: [-22, 0, 22],
    5: [-32, -10, 10, 32],
    6: [-42, -20, 0, 20, 42],
    7: [-48, -28, -9, 9, 28, 48]
  };
  const offsets = offsetsByPower[game.power] || offsetsByPower[7];
  const bulletRadius = 7 + game.power * 2.8;
  for (const offset of offsets) {
    addPlayerBullet(game.player.x + offset, game.player.y - 24, bulletRadius, game.power);
  }

  for (const helper of game.helpers) {
    addPlayerBullet(helper.x, helper.y - 20, Math.max(7, bulletRadius * 0.72), Math.max(2, game.power - 1));
  }
  game.shotCooldown = game.power >= 6 ? 0.1 : game.power >= 4 ? 0.12 : 0.17;
}

function addPlayerBullet(x, y, radius, power) {
  game.bullets.push({
    x,
    y,
    radius,
    height: 28 + power * 10,
    damage: power >= 6 ? 2 : 1,
    speed: 540 + power * 16,
    color: power >= 6 ? "#72f8ff" : power >= 4 ? "#7dff8a" : "#ffef67"
  });
}

function checkCollisions() {
  for (const bullet of game.bullets) {
    if (bullet.hit) continue;
    for (const enemy of game.enemies) {
      if (enemy.dead) continue;
      if (distance(bullet, enemy) < bullet.radius + enemy.radius) {
        bullet.hit = true;
        enemy.hp -= bullet.damage || 1;
        makeBurst(bullet.x, bullet.y, [bullet.color || "#ffef67", "#ffffff"]);
        if (enemy.hp <= 0) {
          enemy.dead = true;
          game.score += enemy.score || 50;
          makeBurst(enemy.x, enemy.y, [enemy.color, enemy.accent || "#ffef67", "#ffffff"]);
        }
        break;
      }
    }
  }

  game.bullets = game.bullets.filter((bullet) => !bullet.hit);
  game.enemies = game.enemies.filter((enemy) => !enemy.dead);

  if (game.invulnerable <= 0) {
    for (const bullet of game.enemyBullets) {
      if (distance(game.player, bullet) < game.player.radius + bullet.radius) {
        bullet.hit = true;
        hurtPlayer("Zapped!");
        break;
      }
    }

    for (const enemy of game.enemies) {
      if (distance(game.player, enemy) < game.player.radius + enemy.radius - 4) {
        enemy.dead = true;
        hurtPlayer(enemy.type === "brute" ? "Big bump!" : "Careful!");
        break;
      }
    }
  }
  game.enemyBullets = game.enemyBullets.filter((bullet) => !bullet.hit);

  for (const pickup of game.pickups) {
    if (pickup.collected) continue;
    if (distance(game.player, pickup) < game.player.radius + pickup.radius) {
      pickup.collected = true;
      if (pickup.kind === "power") {
        game.power = Math.max(game.power, pickup.level || game.power + 1);
        game.message = game.power >= 7 ? "Ultra blaster!" : "Bigger bullets!";
      } else if (pickup.kind === "ship") {
        addHelperShip();
        game.message = "Buddy ship!";
      } else {
        game.lives = Math.min(5, game.lives + 1);
        game.message = "Extra heart!";
      }
      game.messageTimer = 1.4;
      game.score += 100;
      const pickupColors = pickup.kind === "power"
        ? pickupPalette(pickup.level).burst
        : pickup.kind === "ship"
          ? ["#72f8ff", "#ffffff", "#ffef67"]
          : ["#ff405d", "#ffef67", "#ffffff"];
      makeBurst(pickup.x, pickup.y, pickupColors);
    }
  }
  game.pickups = game.pickups.filter((pickup) => !pickup.collected);
}

function addHelperShip() {
  if (game.helpers.length >= 4) return;
  const slot = helperSlots()[game.helpers.length] || { x: 0, y: 18 };
  game.helpers.push({
    x: game.player.x + slot.x,
    y: game.player.y + slot.y,
    bob: Math.random() * Math.PI * 2
  });
}

function helperSlots() {
  return [
    { x: -58, y: 22 },
    { x: 58, y: 22 },
    { x: -104, y: 48 },
    { x: 104, y: 48 }
  ];
}

function hurtPlayer(message) {
  game.lives -= 1;
  game.power = Math.max(1, game.power - 1);
  game.invulnerable = 1.6;
  game.message = message;
  game.messageTimer = 1.2;
  makeBurst(game.player.x, game.player.y, ["#ff405d", "#ffffff", "#35d7ff"]);
  if (game.lives <= 0) finishGame();
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#020409";
  ctx.fillRect(0, 0, W, H);

  for (const star of game.stars) {
    ctx.fillStyle = star.color;
    ctx.globalAlpha = star.size === 1 ? 0.78 : 0.96;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  drawBullets();
  drawEnemyBullets();
  drawEnemies();
  drawPickups();
  drawHelpers();
  drawPlayer();
  drawBursts();

  if (game.messageTimer > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.messageTimer);
    ctx.fillStyle = "#ffef67";
    ctx.font = "800 26px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(game.message, W / 2, 118);
    ctx.restore();
  }
}

function drawPlayer() {
  const { x, y } = game.player;

  ctx.save();
  ctx.translate(x, y);

  if (game.invulnerable > 0) {
    ctx.strokeStyle = "rgba(124, 248, 255, 0.72)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 31 + Math.sin(performance.now() / 120) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  const hull = ctx.createLinearGradient(0, -44, 0, 38);
  hull.addColorStop(0, "#ffffff");
  hull.addColorStop(0.55, "#dce8ff");
  hull.addColorStop(1, "#98a9c9");

  ctx.shadowColor = "rgba(53, 215, 255, 0.5)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(0, -48);
  ctx.bezierCurveTo(18, -22, 20, 14, 9, 34);
  ctx.lineTo(-9, 34);
  ctx.bezierCurveTo(-20, 14, -18, -22, 0, -48);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ff4266";
  ctx.beginPath();
  ctx.moveTo(-14, 8);
  ctx.lineTo(-38, 36);
  ctx.lineTo(-18, 39);
  ctx.lineTo(-8, 24);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, 8);
  ctx.lineTo(38, 36);
  ctx.lineTo(18, 39);
  ctx.lineTo(8, 24);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#30d9ff";
  roundedRect(-8, -27, 16, 27, 5);
  ctx.fill();

  const flame = ctx.createLinearGradient(0, 27, 0, 54);
  flame.addColorStop(0, "#ffffff");
  flame.addColorStop(0.42, "#ffef67");
  flame.addColorStop(1, "rgba(255, 75, 89, 0)");
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(-8, 28);
  ctx.lineTo(0, 58 + Math.sin(performance.now() / 80) * 5);
  ctx.lineTo(8, 28);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawHelpers() {
  for (const helper of game.helpers) {
    ctx.save();
    ctx.translate(helper.x, helper.y + Math.sin(helper.bob) * 3);
    ctx.scale(0.62, 0.62);
    ctx.shadowColor = "rgba(114, 248, 255, 0.55)";
    ctx.shadowBlur = 14;

    const hull = ctx.createLinearGradient(0, -38, 0, 32);
    hull.addColorStop(0, "#ffffff");
    hull.addColorStop(0.58, "#ccecff");
    hull.addColorStop(1, "#6ec8ff");
    ctx.fillStyle = hull;
    ctx.beginPath();
    ctx.moveTo(0, -42);
    ctx.bezierCurveTo(16, -18, 17, 10, 7, 29);
    ctx.lineTo(-7, 29);
    ctx.bezierCurveTo(-17, 10, -16, -18, 0, -42);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#72f8ff";
    ctx.beginPath();
    ctx.moveTo(-12, 8);
    ctx.lineTo(-31, 31);
    ctx.lineTo(-14, 33);
    ctx.lineTo(-6, 21);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12, 8);
    ctx.lineTo(31, 31);
    ctx.lineTo(14, 33);
    ctx.lineTo(6, 21);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffef67";
    ctx.beginPath();
    ctx.moveTo(-6, 27);
    ctx.lineTo(0, 47 + Math.sin(performance.now() / 90 + helper.bob) * 4);
    ctx.lineTo(6, 27);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawEnemies() {
  for (const enemy of game.enemies) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.shadowColor = enemy.color;
    ctx.shadowBlur = enemy.type === "brute" ? 24 : 14;
    const enemyGradient = ctx.createLinearGradient(0, -enemy.radius, 0, enemy.radius);
    enemyGradient.addColorStop(0, lighten(enemy.color, 28));
    enemyGradient.addColorStop(1, enemy.color);
    ctx.fillStyle = enemyGradient;

    if (enemy.type === "brute") {
      drawBruteEnemy(enemy);
    } else if (enemy.type === "hunter") {
      drawHunterEnemy(enemy);
    } else if (enemy.type === "slicer") {
      drawSlicerEnemy(enemy);
    } else {
      drawScoutEnemy(enemy);
    }

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-enemy.radius * 0.34, -enemy.radius * 0.18, enemy.type === "brute" ? 5 : 4, 0, Math.PI * 2);
    ctx.arc(enemy.radius * 0.34, -enemy.radius * 0.18, enemy.type === "brute" ? 5 : 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = enemy.accent || "#ffef67";
    if (enemy.hp > 1) {
      roundedRect(-enemy.radius * 0.45, -enemy.radius - 13, enemy.radius * 0.9, 7, 4);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawScoutEnemy(enemy) {
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.bezierCurveTo(24, -26, 37, -7, 35, 18);
  ctx.lineTo(21, 18);
  ctx.quadraticCurveTo(14, 7, 0, 7);
  ctx.quadraticCurveTo(-14, 7, -21, 18);
  ctx.lineTo(-35, 18);
  ctx.bezierCurveTo(-37, -7, -24, -26, 0, -28);
  ctx.fill();
  strokeEnemy(enemy);
}

function drawSlicerEnemy(enemy) {
  ctx.rotate(Math.sin(enemy.y * 0.03) * 0.2);
  ctx.beginPath();
  ctx.moveTo(0, -32);
  ctx.lineTo(44, 6);
  ctx.lineTo(16, 21);
  ctx.lineTo(0, 7);
  ctx.lineTo(-16, 21);
  ctx.lineTo(-44, 6);
  ctx.closePath();
  ctx.fill();
  strokeEnemy(enemy);
}

function drawHunterEnemy(enemy) {
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.bezierCurveTo(35, -28, 39, 13, 19, 27);
  ctx.quadraticCurveTo(6, 15, 0, 15);
  ctx.quadraticCurveTo(-6, 15, -19, 27);
  ctx.bezierCurveTo(-39, 13, -35, -28, 0, -34);
  ctx.fill();
  strokeEnemy(enemy);
  ctx.fillStyle = "rgba(255, 125, 255, 0.24)";
  ctx.beginPath();
  ctx.arc(0, -3, 17, 0, Math.PI * 2);
  ctx.fill();
}

function drawBruteEnemy(enemy) {
  ctx.beginPath();
  ctx.moveTo(0, -48);
  ctx.bezierCurveTo(48, -42, 59, 12, 38, 42);
  ctx.lineTo(20, 29);
  ctx.quadraticCurveTo(8, 19, 0, 19);
  ctx.quadraticCurveTo(-8, 19, -20, 29);
  ctx.lineTo(-38, 42);
  ctx.bezierCurveTo(-59, 12, -48, -42, 0, -48);
  ctx.fill();
  strokeEnemy(enemy);
  ctx.fillStyle = "rgba(216, 255, 125, 0.22)";
  ctx.beginPath();
  ctx.arc(0, 3, 26, 0, Math.PI * 2);
  ctx.fill();
}

function strokeEnemy(enemy) {
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = enemy.type === "brute" ? 4 : 3;
  ctx.stroke();
}

function drawBullets() {
  for (const bullet of game.bullets) {
    const height = bullet.height || 28;
    const radius = bullet.radius;
    const glow = ctx.createRadialGradient(bullet.x, bullet.y, 2, bullet.x, bullet.y, radius * 2.8);
    glow.addColorStop(0, bullet.color || "#ffef67");
    glow.addColorStop(1, "rgba(255, 239, 103, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, radius * 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bullet.color || "#ffef67";
    roundedRect(bullet.x - radius * 0.55, bullet.y - height, radius * 1.1, height, radius);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    roundedRect(bullet.x - radius * 0.18, bullet.y - height + 3, radius * 0.36, height * 0.45, radius);
    ctx.fill();
  }
}

function drawEnemyBullets() {
  for (const bullet of game.enemyBullets) {
    const glow = ctx.createRadialGradient(bullet.x, bullet.y, 2, bullet.x, bullet.y, bullet.radius * 3.4);
    glow.addColorStop(0, bullet.color);
    glow.addColorStop(1, "rgba(255, 64, 93, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius * 3.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bullet.color;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(bullet.x - bullet.radius * 0.28, bullet.y - bullet.radius * 0.32, bullet.radius * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
}


function drawPickups() {
  for (const pickup of game.pickups) {
    ctx.save();
    ctx.translate(pickup.x, pickup.y);
    ctx.rotate(Math.sin(pickup.spin) * 0.22);
    if (pickup.kind === "power") {
      const palette = pickupPalette(pickup.level);
      ctx.shadowColor = palette.main;
      ctx.shadowBlur = 18 + pickup.level * 2;
      ctx.fillStyle = palette.glow;
      ctx.beginPath();
      ctx.arc(0, 0, 27 + pickup.level * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = palette.main;
      ctx.lineWidth = 3 + Math.min(3, pickup.level * 0.45);
      for (let i = 0; i < Math.max(1, pickup.level - 2); i += 1) {
        const angle = (Math.PI * 2 * i) / Math.max(1, pickup.level - 2) + pickup.spin * 0.15;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * 28, Math.sin(angle) * 28, 3.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.moveTo(-16, -23);
      ctx.lineTo(9, -23);
      ctx.lineTo(-1, -4);
      ctx.lineTo(20, -4);
      ctx.lineTo(-10, 27);
      ctx.lineTo(-1, 6);
      ctx.lineTo(-21, 6);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = palette.core;
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      roundedRect(-11, 33, 22, 6, 3);
      ctx.fill();
    } else if (pickup.kind === "ship") {
      ctx.shadowColor = "#72f8ff";
      ctx.shadowBlur = 22;
      ctx.fillStyle = "rgba(114, 248, 255, 0.2)";
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#72f8ff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.stroke();

      ctx.rotate(-Math.sin(pickup.spin) * 0.22);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(0, -25);
      ctx.bezierCurveTo(12, -7, 13, 12, 5, 25);
      ctx.lineTo(-5, 25);
      ctx.bezierCurveTo(-13, 12, -12, -7, 0, -25);
      ctx.fill();

      ctx.fillStyle = "#72f8ff";
      ctx.beginPath();
      ctx.moveTo(-9, 5);
      ctx.lineTo(-25, 23);
      ctx.lineTo(-11, 25);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(9, 5);
      ctx.lineTo(25, 23);
      ctx.lineTo(11, 25);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#ffef67";
      roundedRect(-7, 29, 14, 5, 3);
      ctx.fill();
    } else {
      ctx.shadowColor = "#ff4266";
      ctx.shadowBlur = 16;
      ctx.fillStyle = "#ff405d";
      ctx.beginPath();
      ctx.moveTo(0, 24);
      ctx.bezierCurveTo(-28, 5, -26, -18, -8, -18);
      ctx.bezierCurveTo(-2, -18, 0, -13, 0, -13);
      ctx.bezierCurveTo(0, -13, 2, -18, 8, -18);
      ctx.bezierCurveTo(26, -18, 28, 5, 0, 24);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.beginPath();
      ctx.arc(-7, -7, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function pickupPalette(level) {
  const palettes = {
    3: { main: "#7dff8a", core: "#ffffff", glow: "rgba(125, 255, 138, 0.18)", burst: ["#7dff8a", "#ffffff", "#ffef67"] },
    4: { main: "#ffef67", core: "#ffffff", glow: "rgba(255, 239, 103, 0.2)", burst: ["#ffef67", "#ffffff", "#ff9f2e"] },
    5: { main: "#ff9f2e", core: "#ffffff", glow: "rgba(255, 159, 46, 0.22)", burst: ["#ff9f2e", "#ffffff", "#ff405d"] },
    6: { main: "#d577ff", core: "#ffffff", glow: "rgba(213, 119, 255, 0.2)", burst: ["#d577ff", "#ffffff", "#72f8ff"] },
    7: { main: "#72f8ff", core: "#ffffff", glow: "rgba(114, 248, 255, 0.24)", burst: ["#72f8ff", "#ffffff", "#7dff8a"] }
  };
  return palettes[level] || { main: "#7dff8a", core: "#ffffff", glow: "rgba(125, 255, 138, 0.18)", burst: ["#7dff8a", "#ffffff", "#ffef67"] };
}

function drawBursts() {
  for (const burst of game.bursts) {
    ctx.globalAlpha = Math.max(0, burst.life / 0.45);
    for (const bit of burst.bits) {
      ctx.fillStyle = bit.color;
      pixel(bit.x, bit.y, bit.size, bit.size);
    }
    ctx.globalAlpha = 1;
  }
}

function makeBurst(x, y, colors) {
  const bits = Array.from({ length: 12 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 45 + Math.random() * 140;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)]
    };
  });
  game.bursts.push({ life: 0.45, bits });
}

function pixel(x, y, width, height) {
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

function roundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function lighten(hex, amount) {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = clamp((value >> 16) + amount, 0, 255);
  const g = clamp(((value >> 8) & 255) + amount, 0, 255);
  const b = clamp((value & 255) + amount, 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function bindHoldButton(button, key) {
  const set = (value) => {
    pointerButtons[key] = value;
    button.classList.toggle("pressed", value);
  };

  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    set(true);
  });
  button.addEventListener("pointerup", () => set(false));
  button.addEventListener("pointercancel", () => set(false));
  button.addEventListener("lostpointercapture", () => set(false));
}

function setTouchAim(event) {
  const rect = canvas.getBoundingClientRect();
  const scale = W / rect.width;
  touchAim.x = clamp((event.clientX - rect.left) * scale, 38, W - 38);
}

canvas.addEventListener("pointerdown", (event) => {
  if (game?.state !== "playing") return;
  event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  touchAim.active = true;
  setTouchAim(event);
});

canvas.addEventListener("pointermove", (event) => {
  if (!touchAim.active) return;
  event.preventDefault();
  setTouchAim(event);
});

canvas.addEventListener("pointerup", () => {
  touchAim.active = false;
});

canvas.addEventListener("pointercancel", () => {
  touchAim.active = false;
});

canvas.addEventListener("lostpointercapture", () => {
  touchAim.active = false;
});

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyA", "KeyD", "KeyW"].includes(event.code)) {
    event.preventDefault();
    keys.add(event.code);
  }
  if (event.code === "Enter" && (!game || game.state !== "playing")) {
    startGame();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

startButton.addEventListener("click", startGame);
bindHoldButton(leftButton, "left");
bindHoldButton(rightButton, "right");
bindHoldButton(fireButton, "fire");

resetGame();
draw();
