export function goToGamesRoom() {
  const url = new URL(window.location.href);
  url.searchParams.delete('game');
  url.searchParams.delete('uiShot');
  window.location.href = `${url.pathname}${url.search}${url.hash}`;
}

export function createGamesButton(scene, x, y, width = 128, height = 58) {
  const button = scene.add.container(x, y).setScrollFactor(0).setDepth(105);

  const shadow = scene.add.graphics();
  shadow.fillStyle(0x07335d, 0.36).fillRoundedRect(4, 6, width, height, 14);
  const bg = scene.add.graphics();
  bg.fillStyle(0x28c8ff, 1).fillRoundedRect(0, 0, width, height, 14);
  bg.fillStyle(0x086ee6, 0.9).fillRoundedRect(0, height / 2, width, height / 2, 14);
  bg.lineStyle(3, 0xffffff, 0.82).strokeRoundedRect(1, 1, width - 2, height - 2, 14);
  bg.lineStyle(2, 0x91f2ff, 0.82).strokeRoundedRect(7, 7, width - 14, height - 14, 10);
  const icon = scene.add.text(width * 0.22, height * 0.5, '<', {
    fontFamily: 'Arial',
    fontSize: `${Math.round(height * 0.5)}px`,
    color: '#ffffff',
    fontStyle: 'bold'
  }).setOrigin(0.5);
  const label = scene.add.text(width * 0.42, height * 0.29, 'GAMES', {
    fontFamily: 'Arial',
    fontSize: `${Math.round(height * 0.32)}px`,
    color: '#ffffff',
    fontStyle: 'bold'
  });
  const hitZone = scene.add.zone(width / 2, height / 2, width + 18, height + 16).setInteractive({ useHandCursor: true });
  hitZone.on('pointerdown', goToGamesRoom);
  button.add([shadow, bg, icon, label, hitZone]);

  return button;
}
