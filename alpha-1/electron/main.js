// Trzewia — Alpha 0.2 jako program na Windows (Electron): jedno okno z grą (gra/trzewia.html z `npm run pack`).
// Budowa: npm run exe (budowa.mjs) → dist/Trzewia-alpha-0.2.exe — jeden plik, bez instalacji.
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

// intro rusza od razu, a dźwięk nie czeka na pierwsze kliknięcie
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
Menu.setApplicationMenu(null);

function okno() {
  const w = new BrowserWindow({
    title: 'Trzewia',
    width: 1280, height: 800, minWidth: 640, minHeight: 400,
    show: false, backgroundColor: '#000000',
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  w.once('ready-to-show', () => { w.maximize(); w.show(); });
  // F11 — pełny ekran (gra sama prosi o niego przy pierwszym dotknięciu, gdy ma to w ustawieniach)
  w.webContents.on('before-input-event', (e, wej) => {
    if (wej.type === 'keyDown' && wej.key === 'F11') { w.setFullScreen(!w.isFullScreen()); e.preventDefault(); }
  });
  // odnośniki na zewnątrz (np. wydania na GitHubie) — w zwykłej przeglądarce, nie w oknie gry
  w.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  w.loadFile(path.join(__dirname, 'gra', 'trzewia.html'));
}

app.whenReady().then(okno);
app.on('window-all-closed', () => app.quit());
