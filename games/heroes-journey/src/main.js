import Phaser from 'phaser';
import { BACKGROUND_COLOR, GAME_HEIGHT, GAME_WIDTH } from './config/gameSettings.js';
import GameScene from './scenes/GameScene.js';
import WinScene from './scenes/WinScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import { setupUpdateWatcher } from './updateWatcher.js';
import './styles.css';

const searchParams = new URLSearchParams(window.location.search);
const isUiShot = searchParams.has('uiShot');
const selectedGame = searchParams.get('game');
const shouldLaunchHeroesJourney = isUiShot || selectedGame === 'heroes-journey';
const gameWidth = isUiShot ? 1280 : GAME_WIDTH;
const gameHeight = isUiShot ? 702 : GAME_HEIGHT;

function getPublicAssetUrl(fileName) {
  return new URL(`../public/assets/${fileName}`, import.meta.url).href;
}

document.body.style.setProperty(
  '--cover-robot',
  `url("${getPublicAssetUrl('hero-robot.png')}")`
);
document.body.style.setProperty(
  '--cover-witch',
  `url("${getPublicAssetUrl('witch-cute.png')}")`
);
document.body.style.setProperty(
  '--gamesroom-bg',
  `url("${getPublicAssetUrl('gamesroom-home-bg.png')}")`
);

if (isUiShot) {
  document.body.classList.add('ui-shot-reference-page');
  document.body.style.setProperty(
    '--ui-reference-target',
    `url("${getPublicAssetUrl('ui-reference-target-1280.png')}")`
  );
}

function getPathWithGame(gameId) {
  const url = new URL(window.location.href);
  url.searchParams.set('game', gameId);
  url.searchParams.delete('uiShot');
  return `${url.pathname}${url.search}${url.hash}`;
}

function getStaticGamePath(gamePath) {
  return new URL(gamePath, window.location.href).href;
}

function createGameCard({ title, subtitle, href, status, theme }) {
  const card = document.createElement(href ? 'a' : 'article');
  card.className = `game-card game-card--${theme}`;

  if (href) {
    card.href = href;
    card.setAttribute('aria-label', `Play ${title}`);
  } else {
    card.setAttribute('aria-label', `${title} ${status}`);
  }

  const sceneArt = theme === 'forest'
    ? '<span class="cover-sun"></span><span class="cover-robot"></span><span class="cover-witch"></span><span class="cover-coin cover-coin--one"></span><span class="cover-coin cover-coin--two"></span><span class="cover-platform"></span>'
    : '<span class="cover-ship"></span><span class="cover-planet"></span><span class="cover-meteor"></span><span class="cover-laser cover-laser--one"></span><span class="cover-laser cover-laser--two"></span><span class="cover-star cover-star--one"></span><span class="cover-star cover-star--two"></span>';
  const actionIcon = href ? '▶' : '↻';

  card.innerHTML = `
    <div class="game-card__art" aria-hidden="true">
      <span class="game-card__badge"></span>
      <div class="game-card__scene">${sceneArt}</div>
    </div>
    <div class="game-card__body">
      <div>
        <h2>${title}</h2>
        <p class="game-card__subtitle">${subtitle}</p>
      </div>
      <span class="game-card__action">
        <span aria-hidden="true">${actionIcon}</span>
        ${status}
      </span>
    </div>
  `;

  return card;
}

function showGamesRoomHome() {
  document.body.classList.add('gamesroom-home');
  const root = document.getElementById('game');
  root.innerHTML = '';

  const shell = document.createElement('main');
  shell.className = 'gamesroom';
  shell.innerHTML = `
    <img class="gamesroom__backdrop" src="${getPublicAssetUrl('gamesroom-home-bg.png')}" alt="" aria-hidden="true">
    <section class="gamesroom__hero" aria-labelledby="gamesroom-title">
      <div class="gamesroom__logo" aria-label="Harry's Gamesroom">
        <span>Harry's</span>
        <strong>Gamesroom</strong>
      </div>
      <h1 id="gamesroom-title"><span>Pick Your</span><strong>Adventure!</strong></h1>
      <p>Choose your next game and start the adventure!</p>
    </section>
    <section class="games-grid" aria-label="Games"></section>
  `;

  const grid = shell.querySelector('.games-grid');
  grid.append(
    createGameCard({
      title: 'Heroes Journey',
      subtitle: 'Castle platform adventure',
      description: 'Run, jump, collect coins, and zap broom fire on the way to the castle.',
      href: getPathWithGame('heroes-journey'),
      status: 'Play',
      theme: 'forest'
    }),
    createGameCard({
      title: 'Star Sprinter',
      subtitle: 'Arcade space battle',
      description: 'Dodge, collect blaster bolts, and zap the space bugs.',
      href: getStaticGamePath('games/star-sprinter/'),
      status: 'Play',
      theme: 'space'
    })
  );

  root.append(shell);
}

function launchHeroesJourney() {
  document.body.classList.add('game-running');

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
    scene: [GameScene, WinScene, GameOverScene]
  };

  const game = new Phaser.Game(config);

  if (import.meta.env.DEV) {
    window.knightGame = game;
  }

  setupUpdateWatcher();
}

if (shouldLaunchHeroesJourney) {
  launchHeroesJourney();
} else {
  showGamesRoomHome();
}
