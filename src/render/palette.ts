/**
 * Paleta całej gry. Ciemność jest ciepła, kolor pojawia się wyłącznie jako światło.
 * Wszystko, co rysuje interfejs, bierze barwy stąd — żeby nic nie świeciło kolorem,
 * którego nie ma w świecie.
 */
export const BARWA = {
  sadza: '#0b0807',
  sadzaJasna: '#141010',
  papier: '#ddd6c4',
  papierCien: '#c9c2ae',
  atrament: '#cfc2a6',
  atramentMocny: '#efe3c6',
  atramentCichy: '#8d8577',
  krew: '#8a1a16',
  krewJasna: '#c2503c',
  zar: '#ff8c32',
  zarBlady: '#e0a860',
  biolumina: '#7ab060',
  otchlan: '#e8e6ee',
} as const;

export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Barwa atramentu zmienia się z głębokością: kość na górze, czerwień na dnie. */
export function atramentGlebi(d: number, a = 1): string {
  const k = 1 - d * 0.2;
  return `rgba(${((226 - d * 96) * k) | 0},${((214 - d * 176) * k) | 0},${((196 - d * 178) * k) | 0},${a})`;
}
