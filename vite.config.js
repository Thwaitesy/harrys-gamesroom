import { stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig } from 'vite';

const VERSION_PATHS = ['src', 'index.html', 'package.json'];

async function newestMtime(filePath) {
  const details = await stat(filePath);

  if (!details.isDirectory()) {
    return details.mtimeMs;
  }

  const entries = await readdir(filePath, { withFileTypes: true });
  const times = await Promise.all(entries.map((entry) => {
    const childPath = path.join(filePath, entry.name);
    return newestMtime(childPath);
  }));

  return Math.max(details.mtimeMs, ...times);
}

function gameVersionPlugin() {
  return {
    name: 'game-version-endpoint',
    configureServer(server) {
      server.middlewares.use('/__game_version', async (request, response) => {
        try {
          const root = server.config.root;
          const times = await Promise.all(
            VERSION_PATHS.map((targetPath) => newestMtime(path.join(root, targetPath)))
          );

          response.setHeader('Content-Type', 'application/json');
          response.setHeader('Cache-Control', 'no-store');
          response.end(JSON.stringify({ version: String(Math.max(...times)) }));
        } catch (error) {
          response.statusCode = 500;
          response.end(JSON.stringify({ error: 'Could not check game version.' }));
        }
      });
    }
  };
}

export default defineConfig({
  base: './',
  server: {
    hmr: false
  },
  plugins: [gameVersionPlugin()]
});
