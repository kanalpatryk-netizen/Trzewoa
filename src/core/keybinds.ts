/** Wszystkie akcje gry z przypisanymi klawiszami. Gracz może je zmienić w ustawieniach. */
export type Akcja =
  | 'pauza' | 'szybciej' | 'wolniej' | 'zapis' | 'wczytaj' | 'menu'
  | 'ksztaltuj' | 'zasiej' | 'szept' | 'znak' | 'skaz'
  | 'narzedzie1' | 'narzedzie2' | 'narzedzie3' | 'narzedzie4'
  | 'kamera' | 'przyblizenie' | 'oddalenie' | 'odNowa' | 'legenda' | 'zapiski';

export interface OpisAkcji { akcja: Akcja; nazwa: string; opis: string; }

export const AKCJE: OpisAkcji[] = [
  { akcja: 'menu', nazwa: 'Menu', opis: 'wraca do menu — działa też P oraz esc' },
  { akcja: 'pauza', nazwa: 'Wstrzymaj czas', opis: 'to samo, co odłożenie czasownika' },
  { akcja: 'szybciej', nazwa: 'Szybciej', opis: 'więcej tików na klatkę — pokolenia lecą prędzej' },
  { akcja: 'wolniej', nazwa: 'Wolniej', opis: 'mniej tików na klatkę' },
  { akcja: 'ksztaltuj', nazwa: 'Kształtuj', opis: 'drążysz, zawalasz, wpuszczasz wodę i żar' },
  { akcja: 'zasiej', nazwa: 'Zasiej', opis: 'ruda, grzyb, kości, trucizna' },
  { akcja: 'szept', nazwa: 'Szepcz', opis: 'jedna myśl w jedną głowę' },
  { akcja: 'znak', nazwa: 'Znak', opis: 'jawny cud widziany przez wszystkich' },
  { akcja: 'skaz', nazwa: 'Skaź', opis: 'zmiana krwi gatunku na pokolenia' },
  { akcja: 'narzedzie1', nazwa: 'Narzędzie I', opis: 'pierwsze narzędzie wybranego czasownika' },
  { akcja: 'narzedzie2', nazwa: 'Narzędzie II', opis: 'drugie narzędzie' },
  { akcja: 'narzedzie3', nazwa: 'Narzędzie III', opis: 'trzecie narzędzie' },
  { akcja: 'narzedzie4', nazwa: 'Narzędzie IV', opis: 'czwarte narzędzie' },
  { akcja: 'kamera', nazwa: 'Wróć do mieszkańców', opis: 'kamera skacze do największego skupiska i znów idzie za życiem' },
  { akcja: 'przyblizenie', nazwa: 'Przybliż', opis: 'to samo, co kółko w górę' },
  { akcja: 'oddalenie', nazwa: 'Oddal', opis: 'to samo, co kółko w dół' },
  { akcja: 'zapis', nazwa: 'Zapisz', opis: 'stan góry do pamięci przeglądarki' },
  { akcja: 'wczytaj', nazwa: 'Wczytaj', opis: 'wraca do ostatniego zapisu' },
  { akcja: 'odNowa', nazwa: 'Od nowa', opis: 'nowa góra — dopiero po zakończeniu' },
  { akcja: 'legenda', nazwa: 'Klucz do ryciny', opis: 'pokazuje, co znaczy każdy znak na płycie' },
  { akcja: 'zapiski', nazwa: 'Zapiski', opis: 'cała kronika; kliknięcie we wpis przenosi tam wzrok' },
];

const DOMYSLNE: Record<Akcja, string> = {
  menu: 'Escape', pauza: ' ', szybciej: '+', wolniej: '-',
  ksztaltuj: '1', zasiej: '2', szept: '3', znak: '4', skaz: '5',
  narzedzie1: 'q', narzedzie2: 'w', narzedzie3: 'e', narzedzie4: 'r',
  kamera: 'c', przyblizenie: ']', oddalenie: '[',
  zapis: 'z', wczytaj: 'x', odNowa: 'n', legenda: 'l', zapiski: 'k',
};

const KLUCZ = 'trzewia:klawisze';

export const klawisze: Record<Akcja, string> = wczytaj();

function wczytaj(): Record<Akcja, string> {
  try {
    const raw = localStorage.getItem(KLUCZ);
    if (!raw) return { ...DOMYSLNE };
    return { ...DOMYSLNE, ...JSON.parse(raw) };
  } catch {
    return { ...DOMYSLNE };
  }
}

export function przypisz(akcja: Akcja, klawisz: string): void {
  for (const a of Object.keys(klawisze) as Akcja[]) {
    if (klawisze[a] === klawisz && a !== akcja) klawisze[a] = '';   // klawisz należy do jednej akcji
  }
  klawisze[akcja] = klawisz;
  try { localStorage.setItem(KLUCZ, JSON.stringify(klawisze)); } catch { /* tryb prywatny */ }
}

export function przywrocDomyslne(): void {
  Object.assign(klawisze, DOMYSLNE);
  try { localStorage.setItem(KLUCZ, JSON.stringify(klawisze)); } catch { /* tryb prywatny */ }
}

/** Nazwa klawisza do wyświetlenia na ryciny sposób. */
export function nazwaKlawisza(k: string): string {
  if (!k) return '—';
  if (k === ' ') return 'spacja';
  if (k === 'Escape') return 'esc';
  if (k === 'ArrowUp') return '↑';
  if (k === 'ArrowDown') return '↓';
  if (k === 'ArrowLeft') return '←';
  if (k === 'ArrowRight') return '→';
  return k.length === 1 ? k.toUpperCase() : k;
}

/** Klawisze, które działają zawsze, o ile gracz nie przypisał ich do czegoś innego. */
const ZAPASOWE: Record<string, Akcja> = { Escape: 'menu', p: 'menu' };

export function akcjaDlaKlawisza(k: string): Akcja | null {
  const low = k.length === 1 ? k.toLowerCase() : k;
  for (const a of Object.keys(klawisze) as Akcja[]) {
    const bind = klawisze[a];
    if (!bind) continue;
    if (bind === low || bind === k) return a;
  }
  const zapas = ZAPASOWE[low] ?? ZAPASOWE[k];
  if (zapas) return zapas;
  return null;
}
