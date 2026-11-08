// Most dla licznika wydajności (F3 w grze): czy płótno idzie przez kartę graficzną (app.getGPUFeatureStatus w main.js)
// i czy program wymusił kartę. Gra widzi tylko tę jedną funkcję — reszta Electrona zostaje zamknięta (sandbox).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('trzewiaElektron', {
  karta: () => ipcRenderer.invoke('trzewia:karta'),
});
