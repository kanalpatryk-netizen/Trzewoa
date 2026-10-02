import { defineConfig, type Plugin } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

/** Dev-only: strona wysyła klatkę POST-em na /__shot, a ta ląduje w .shots/. */
function shotPlugin(): Plugin {
  return {
    name: 'canvas-shot',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__shot', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          const m = /^data:image\/(png|jpeg);base64,(.*)$/s.exec(body);
          if (!m) { res.statusCode = 400; res.end('bad payload'); return; }
          const dir = resolve(dirname(fileURLToPath(import.meta.url)), '.shots');
          fs.mkdirSync(dir, { recursive: true });
          const name = ((req.headers['x-shot-name'] as string) || 'shot').replace(/[^a-z0-9_-]/gi, '');
          fs.writeFileSync(resolve(dir, `${name}.${m[1] === 'png' ? 'png' : 'jpg'}`), Buffer.from(m[2], 'base64'));
          res.end('ok');
        });
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [shotPlugin()],
  build: { target: 'es2019' },
  server: { host: true, port: 5180 },
});
