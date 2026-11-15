// Serwer Vite do nagrywania trailera: ta sama konfiguracja co gra, ale bez HMR i bez obserwowania plików —
// edycja pliku w trakcie długiego nagrywania nie przeładowuje stron nagrywarki, montażu ani syntezy muzyki.
// Uruchom z alpha-1: npx vite --config trailer/vite.trailer.config.mjs --port 5180
import { defineConfig, mergeConfig } from 'vite';
import gra from '../vite.config.ts';

export default mergeConfig(gra, defineConfig({
  server: { hmr: false, watch: { ignored: ['**/*'] } },
}));
