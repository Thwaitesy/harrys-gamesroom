const CHECK_INTERVAL_MS = 2500;
const VERSION_ENDPOINT = '/__game_version';

export function setupUpdateWatcher() {
  if (new URLSearchParams(window.location.search).has('uiShot')) {
    return;
  }

  let currentVersion = null;
  let updateIsReady = false;
  const button = createUpdateButton();
  button.style.backgroundImage = `url("${import.meta.env.BASE_URL}assets/ui-update-target.png")`;

  async function checkForUpdate() {
    try {
      const response = await fetch(`${VERSION_ENDPOINT}?t=${Date.now()}`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        return;
      }

      const details = await response.json();

      if (!currentVersion) {
        currentVersion = details.version;
        return;
      }

      if (!updateIsReady && details.version !== currentVersion) {
        updateIsReady = true;
        button.hidden = false;
      }
    } catch {
      // Production builds do not provide the local dev-only version endpoint.
    }
  }

  button.addEventListener('click', () => {
    window.location.reload();
  });

  checkForUpdate();
  window.setInterval(checkForUpdate, CHECK_INTERVAL_MS);
}

function createUpdateButton() {
  const button = document.createElement('button');
  button.id = 'update-ready-button';
  button.type = 'button';
  button.hidden = true;
  button.textContent = 'Update Ready • Tap to Refresh';
  document.body.appendChild(button);
  return button;
}
