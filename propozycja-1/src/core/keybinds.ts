/** Wszystkie akcje gry z przypisanymi klawiszami. Gracz może je zmienić w ustawieniach. */
export type Akcja =
  | 'pauza' | 'szybciej' | 'wolniej' | 'zapis' | 'wczytaj' | 'menu'
  | 'zasiej' | 'szept' | 'znak'
  | 'narzedzie1' | 'narzedzie2' | 'narzedzie3' | 'narzedzie4'
  | 'kamera' | 'przyblizenie' | 'oddalenie' | 'odNowa' | 'legenda' | 'zapiski'
  | 'robotnicy' | 'pobozni' | 'rycerz' | 'kopDroge' | 'odwolaj' | 'planuj';

export interface OpisAkcji { akcja: Akcja; nazwa: string; opis: string; }

export const AKCJE: OpisAkcji[] = [
  { akcja: 'menu', nazwa: 'Menu', opis: 'wraca do menu — działa też P oraz esc' },
  { akcja: 'pauza', nazwa: 'Pauza i plan', opis: 'czas staje; rozkazy wydane w pauzie dzieją się naraz po jej zdjęciu' },
  { akcja: 'szybciej', nazwa: 'Szybciej', opis: 'tylko w trybie deweloperskim: przyspiesza czas (do ×20)' },
  { akcja: 'wolniej', nazwa: 'Wolniej', opis: 'tylko w trybie deweloperskim: zwalnia czas (do ×¼)' },
  { akcja: 'zasiej', nazwa: 'Nakarm', opis: 'wiadro z jedzeniem tam, gdzie wskażesz' },
  { akcja: 'szept', nazwa: 'Szepnij', opis: 'módl się albo prorokuj — jednej głowie' },
  { akcja: 'znak', nazwa: 'Cud', opis: 'objawienie — oddanie nacji rośnie' },
  { akcja: 'robotnicy', nazwa: 'Robotnicy', opis: 'zaznacza robotników (drugi raz: kamera do nich); dotknięcie mapy — idź tam, w skałę — kop' },
  { akcja: 'pobozni', nazwa: 'Pobożni', opis: 'zaznacza pobożnych (drugi raz: kamera do nich)' },
  { akcja: 'rycerz', nazwa: 'Rycerz', opis: 'zaznacza rycerza (drugi raz: kamera do niego)' },
  { akcja: 'kopDroge', nazwa: 'Kop drogę wiernych', opis: 'zaznaczeni robotnicy kopią szyb drogi wiernych do krypty' },
  { akcja: 'odwolaj', nazwa: 'Odwołaj rozkaz', opis: 'zaznaczeni wracają do swoich zajęć' },
  { akcja: 'planuj', nazwa: 'Wyznacz pomieszczenie', opis: 'plan pod kursorem: sypialnia, warsztat, kuźnia, korytarz, szyb (drugi raz — następny szablon)' },
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
  zasiej: '1', szept: '2', znak: '3',
  narzedzie1: 'q', narzedzie2: 'w', narzedzie3: 'e', narzedzie4: 'r',
  kamera: 'c', przyblizenie: ']', oddalenie: '[',
  zapis: 'z', wczytaj: 'x', odNowa: 'n', legenda: 'l', zapiski: 'k',
  robotnicy: 'a', pobozni: 's', rycerz: 'd', kopDroge: 'g', odwolaj: 'v', planuj: 'b',
};

const KLUCZ = 'trzewia-propozycja-1:klawisze';

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
