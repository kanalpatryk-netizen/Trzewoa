// Trzewia — Alpha 1 jako program na Windows (Electron): jedno okno z grą (gra/trzewia.html z `npm run pack`).
// Budowa: npm run exe (budowa.mjs) → dist/Trzewia-alpha-1.exe — jeden plik, bez instalacji.
const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// intro rusza od razu, a dźwięk nie czeka na pierwsze kliknięcie
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
Menu.setApplicationMenu(null);

// Wydajność (8.11): gra rysuje na płótnie, a bez karty graficznej robi to procesor — kilka razy wolniej.
//  - Laptop z dwiema kartami bierze zwykle słabszą, zintegrowaną — force_high_performance_gpu prosi o mocniejszą.
//  - Chromium wyłącza kartę, gdy jej sterownik jest na jego czarnej liście. Wtedy gra sprawdza (sprawdzKarte), czy
//    w komputerze jest prawdziwa karta (NVIDIA, AMD, Intel), i od następnego uruchomienia każe jej rysować mimo listy
//    (zapis w karta.json w danych programu). Bez prawdziwej karty nie wymusza: karta programowa (Microsoft Basic
//    Render Driver, llvmpipe) rysuje wolniej niż zwykłe rysowanie procesorem. Gdy wymuszona karta się sypie (proces
//    karty pada), następne uruchomienie znów idzie bez wymuszania. Ręcznie: Trzewia-alpha-1.exe --bez-wymuszania-karty.
//  - Czy działa — licznik wydajności w grze (F3): pyta przez preload.js (ipc 'trzewia:karta').
const bezWymuszania = process.argv.includes('--bez-wymuszania-karty');
const plikKarty = path.join(app.getPath('userData'), 'karta.json');
let wymuszona = false;
try { wymuszona = !bezWymuszania && JSON.parse(fs.readFileSync(plikKarty, 'utf8')).wymus === true; } catch { /* pierwsze uruchomienie */ }
app.commandLine.appendSwitch('force_high_performance_gpu');
if (wymuszona) {
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  app.commandLine.appendSwitch('enable-gpu-rasterization');
}
/** Wymuszenie zapisane na następne uruchomienie (prawdziwa karta, a Chromium rysuje procesorem). */
let wymusPrzyNastepnym = false;

const zapiszKarte = (wymus) => {
  try { fs.mkdirSync(path.dirname(plikKarty), { recursive: true }); fs.writeFileSync(plikKarty, JSON.stringify({ wymus, kiedy: new Date().toISOString() })); }
  catch { /* bez zapisu — zostaje jak jest */ }
};

/** Prawdziwa karta, a płótno rysuje procesor — zapisz wymuszenie na następne uruchomienie. */
async function sprawdzKarte() {
  if (bezWymuszania || wymuszona) return;
  const stan = app.getGPUFeatureStatus()['2d_canvas'] || '';
  if (stan.startsWith('enabled')) return;
  const info = await app.getGPUInfo('basic').catch(() => null);
  const PRAWDZIWE = [0x10de, 0x1002, 0x1022, 0x8086];   // NVIDIA, AMD (dwa numery), Intel
  if ((info?.gpuDevice ?? []).some((d) => PRAWDZIWE.includes(d.vendorId))) { zapiszKarte(true); wymusPrzyNastepnym = true; }
}

// wymuszona karta się sypie — następne uruchomienie bez wymuszania
app.on('child-process-gone', (_e, d) => {
  if (wymuszona && d.type === 'GPU' && d.reason !== 'clean-exit') zapiszKarte(false);
});

// licznik wydajności (F3) pyta przez electron/preload.js, czy płótno idzie przez kartę graficzną
ipcMain.handle('trzewia:karta', () => ({ status: app.getGPUFeatureStatus(), wymuszona, wymusPrzyNastepnym }));

function okno() {
  const w = new BrowserWindow({
    title: 'Trzewia',
    width: 1280, height: 800, minWidth: 640, minHeight: 400,
    show: false, backgroundColor: '#000000',
    webPreferences: { contextIsolation: true, sandbox: true, preload: path.join(__dirname, 'preload.js') },
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

app.whenReady().then(() => { okno(); sprawdzKarte(); });
app.on('window-all-closed', () => app.quit());
