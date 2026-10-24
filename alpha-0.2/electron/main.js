// Trzewia — Alpha 0.2 jako program na Windows (Electron): jedno okno z grą (gra/trzewia.html z `npm run pack`).
// Budowa: npm run exe (budowa.mjs) → dist/Trzewia-alpha-0.2.exe — jeden plik, bez instalacji.
// Gra startuje w pełnym ekranie (bez ramki i paska zadań); F11 albo Alt+Enter przełącza pełny ekran i okno.
const { app, BrowserWindow, Menu, ipcMain, session, shell } = require('electron');
const fs = require('fs');
const path = require('path');

// płynność — przełączniki Chromium muszą paść przed `ready`:
// rysuje karta graficzna, także przy starszych sterownikach z czarnej listy Chromium (bez niej płótno gry
// liczy procesor i klatek jest kilka razy mniej)
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
// laptop z dwiema kartami: gra idzie na mocniejszej (Chromium sam wybiera zintegrowaną, oszczędną)
app.commandLine.appendSwitch('force_high_performance_gpu');
// intro rusza od razu, a dźwięk nie czeka na pierwsze kliknięcie
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
Menu.setApplicationMenu(null);
app.setAppUserModelId('pl.trzewia.alpha02');

// pełny ekran albo okno: ostatni wybór z ustawień gry („Pełny ekran”), domyślnie pełny ekran
const plikStanu = () => path.join(app.getPath('userData'), 'okno.json');
function wczytajStan() {
  try { return JSON.parse(fs.readFileSync(plikStanu(), 'utf8')); } catch { return {}; }
}
function zapiszStan(stan) {
  try { fs.writeFileSync(plikStanu(), JSON.stringify(stan)); } catch { /* następnym razem domyślnie */ }
}

let okno = null;

function otworz() {
  const w = (okno = new BrowserWindow({
    title: 'Trzewia',
    width: 1280, height: 800, minWidth: 640, minHeight: 400,
    fullscreen: wczytajStan().pelny !== false,
    show: false, backgroundColor: '#000000',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, spellcheck: false },
  }));
  w.once('ready-to-show', () => { if (!w.isFullScreen()) w.maximize(); w.show(); w.focus(); });
  // z pełnego ekranu wychodzi się do okna na cały ekran, nie do małego okienka
  w.on('leave-full-screen', () => { if (!w.isDestroyed()) w.maximize(); });
  // F11 albo Alt+Enter — pełny ekran / okno (na chwilę; na stałe decyduje „Pełny ekran” w ustawieniach gry)
  w.webContents.on('before-input-event', (e, wej) => {
    if (wej.type !== 'keyDown' || !(wej.key === 'F11' || (wej.key === 'Enter' && wej.alt))) return;
    w.setFullScreen(!w.isFullScreen());
    e.preventDefault();
  });
  // szczypanie gładzika nie powiększa strony (kółko i tak przybliża górę)
  w.webContents.setVisualZoomLevelLimits(1, 1).catch(() => {});
  // gra to jedna strona: upuszczony plik albo odnośnik nie może jej podmienić
  w.webContents.on('will-navigate', (e, url) => {
    e.preventDefault();
    if (/^https?:/.test(url)) shell.openExternal(url);
  });
  // odnośniki na zewnątrz (np. wydania na GitHubie) — w zwykłej przeglądarce, nie w oknie gry
  w.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  // proces strony padł: gra wstaje od nowa (partia wraca z „Wczytaj zapis”), najwyżej trzy razy
  let wstawania = 0;
  w.webContents.on('render-process-gone', (_e, d) => {
    if (d.reason !== 'clean-exit' && !w.isDestroyed() && ++wstawania <= 3) w.reload();
  });
  w.on('closed', () => { okno = null; });
  w.loadFile(path.join(__dirname, 'gra', 'trzewia.html'));
}

// most z grą (preload.js → src/core/program.ts): pełny ekran z ustawień gry i „Wyjdź z gry” w menu
ipcMain.on('trzewia:pelny-ekran', (e, chce) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (!w) return;
  const tak = chce === true;
  if (w.isFullScreen() !== tak) w.setFullScreen(tak);
  zapiszStan({ ...wczytajStan(), pelny: tak });
});
ipcMain.on('trzewia:zamknij', (e) => BrowserWindow.fromWebContents(e.sender)?.close());

// jeden program naraz: drugie uruchomienie tylko przywołuje okno, które już jest
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (!okno) return;
    if (okno.isMinimized()) okno.restore();
    okno.show();
    okno.focus();
  });
  app.whenReady().then(otworz);
}
app.on('window-all-closed', () => app.quit());
// zapis gry (pamięć strony) trafia na dysk, zanim program się zamknie
app.on('will-quit', () => { if (app.isReady()) session.defaultSession.flushStorageData(); });
