// Most między grą a oknem programu (po stronie gry: src/core/program.ts) — pełny ekran całego okna i zamknięcie
// programu. Pełny ekran samej strony się nie nadaje: Electron wychodzi z niego na Esc, a Esc nie trafia wtedy do gry.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('trzewiaOkno', {
  pelnyEkran: (tak) => ipcRenderer.send('trzewia:pelny-ekran', tak === true),
  zamknij: () => ipcRenderer.send('trzewia:zamknij'),
});
