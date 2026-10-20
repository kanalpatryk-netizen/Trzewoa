/**
 * DRUŻYNA (Alpha 0.3) — imiona, stała obsada (wizja Patryka) i ukryta historia świata.
 *
 * Wizja Patryka: drużyna to stałe postacie — te same w każdej partii (6 na start, potem kolejni przybysze
 * z daru ludzi, zawsze w tej samej kolejności). Każda ma imię, jeden perk (src/nastawy/perki.ts), czasem wadę,
 * jedno zdanie o tym, kim była, zanim trafiła do góry, i jeden ukryty fragment historii świata — odsłania się
 * zdarzeniem w grze i trafia do atlasu (grupa „Kronika góry”).
 * Wizja Pawła: bez perków i życiorysów — imiona losuje ziarno partii z puli niżej, a fragmenty historii
 * odsłania każdy z ludu, kto pierwszy wywoła zdarzenie.
 * Logika: src/sim/druzyna.ts.
 */
import type { Rola } from './lud';

export type Plec = 'm' | 'k';

/** Zdarzenie w grze, które odsłania fragment historii. */
export type Wyzwalacz =
  | 'gleboko'      // zejdzie do głębokiej warstwy
  | 'krypta'       // dotrze do krypty nad Wielkim Pomnikiem
  | 'zloto'        // wykuje złoto
  | 'zelazo'       // wykuje żelazo
  | 'demon'        // żyje, gdy z gruzów wstaje demon
  | 'oltarz'       // odprawi rytuał przy ołtarzu
  | 'fala'         // pokona Strażnika Snu
  | 'aniol'        // przyjdzie z darem dłoni anielskiej
  | 'smierc'       // zginie
  | 'weteran'      // zostanie weteranem
  | 'ruiny'        // odkryje zabytek w ruinach
  | 'sypialnia'    // wyśpi się w sypialni
  | 'wskrzeszony'; // wstanie z martwych przy ołtarzu

export interface Fragment { id: string; tytul: string; tekst: string; wyzwalacz: Wyzwalacz }

/** Ukryta historia góry — 14 kart kroniki (tyle, ile postaci może się przewinąć przez drużynę). */
export const HISTORIA: Fragment[] = [
  { id: 'h1', tytul: 'Karta I — Gród', wyzwalacz: 'gleboko', tekst: 'Zanim góra zasnęła, na jej grzbiecie stał gród. Górnicy z grodu kuli po srebro coraz głębiej, aż kilof zadzwonił o coś, co nie było skałą.' },
  { id: 'h2', tytul: 'Karta II — Dzwony', wyzwalacz: 'zloto', tekst: 'Złoto pod jaskiniami to nie żyła. To dzwony grodzkiego kościoła, stopione w żarze, który buchnął z dołu, i wsiąknięte w skałę.' },
  { id: 'h3', tytul: 'Karta III — Krypta', wyzwalacz: 'krypta', tekst: 'Kryptę wykuli ci sami górnicy, już na kolanach. Nie po to, żeby się w niej modlić — żeby z niej pilnować.' },
  { id: 'h4', tytul: 'Karta IV — Imię', wyzwalacz: 'demon', tekst: 'Mnisi nie znali jego imienia. Nazwali go Trzewiem, bo mieszkał tam, gdzie góra ma brzuch — i od niego wzięła nazwę cała góra.' },
  { id: 'h5', tytul: 'Karta V — Umowa', wyzwalacz: 'oltarz', tekst: 'Ołtarz w sali postawił biskup, który zszedł ostatni. Krew na nim nie jest ofiarą. To podpis pod umową z tym, co śpi.' },
  { id: 'h6', tytul: 'Karta VI — Strażnicy', wyzwalacz: 'fala', tekst: 'Strażnicy Snu byli kiedyś zakonnikami. Modlili się nad pomnikiem tak długo, aż sami skamienieli — i dalej pilnują, żeby nikt go nie zbudził.' },
  { id: 'h7', tytul: 'Karta VII — Pierścień', wyzwalacz: 'aniol', tekst: 'Dłoń, która schodzi w złotym słupie, ma na palcu pierścień biskupa. Relikwiarz z ruin to jej brakujący palec.' },
  { id: 'h8', tytul: 'Karta VIII — Krew', wyzwalacz: 'smierc', tekst: 'Każda śmierć w górze spływa krwią w szczeliny. Kiedyś zbierał ją demon. Teraz zbierasz ją ty — i coraz trudniej powiedzieć, czym się od niego różnisz.' },
  { id: 'h9', tytul: 'Karta IX — Poczet', wyzwalacz: 'zelazo', tekst: 'Żelazo w płytkiej skale to groty i podkowy pocztu, który wjechał tu przed wiekami po zaginionego księcia. Kuźnia przekuwa je z powrotem w zbroję.' },
  { id: 'h10', tytul: 'Karta X — Ślub grodzian', wyzwalacz: 'weteran', tekst: 'Wiadro z jedzeniem spuszczają potomkowie grodzian. Ich pradziadowie ślubowali: póki ktoś w górze się modli, nikt na górze nie zazna głodu.' },
  { id: 'h11', tytul: 'Karta XI — Zapadnięcie', wyzwalacz: 'ruiny', tekst: 'Ruiny w środkowej warstwie to nie inne miasto. To ten sam gród — zapadł się w górę jednej nocy, razem z dzwonnicą i ludźmi w łóżkach.' },
  { id: 'h12', tytul: 'Karta XII — Drugi oddech', wyzwalacz: 'sypialnia', tekst: 'We śnie słychać drugi oddech, wolniejszy od własnego. Góra nie śni sama. Śni razem z tym, co ma w brzuchu.' },
  { id: 'h13', tytul: 'Karta XIII — Po drugiej stronie', wyzwalacz: 'wskrzeszony', tekst: 'Kto wstał z martwych przy ołtarzu, pamięta ciemność, w której ktoś czekał. Nie demon. Ktoś starszy od niego.' },
  { id: 'h14', tytul: 'Karta XIV — Wyskrobane imię', wyzwalacz: 'krypta', tekst: 'Pod cokołem pomnika wyryto imiona tych, którzy go zakuli. Ostatnie imię jest wyskrobane — i rysy są świeże.' },
];

/** Jedna stała postać (wizja Patryka). */
export interface Postac {
  imie: string;
  przydomek?: string;
  plec: Plec;
  rola: Rola;
  perk: string;
  wada?: string;
  /** jedno zdanie: kim była, zanim trafiła do góry */
  kim: string;
  /** id fragmentu z HISTORIA */
  fragment: string;
}

/**
 * Stała obsada. Pierwsze sześć to drużyna startowa (dobierana po roli w kolejności listy: 2 pobożnych,
 * 3 robotników, 1 rycerz); dalsze przychodzą po kolei z darem ludzi (zawsze jako robotnicy).
 */
export const OBSADA: Postac[] = [
  { imie: 'Radost', plec: 'k', rola: 'pobozny', perk: 'zarliwy', wada: 'watly', kim: 'Przeoryszka klasztoru pod Płockiem, który spłonął w jedną noc.', fragment: 'h4' },
  { imie: 'Dobromir', plec: 'm', rola: 'pobozny', perk: 'kaplan', kim: 'Wiejski klecha — jedyny, który zszedł za swoimi pod ziemię.', fragment: 'h5' },
  { imie: 'Bogdan', przydomek: 'Kret', plec: 'm', rola: 'robotnik', perk: 'kilof', wada: 'lakomy', kim: 'Kopał sól pod Bochnią, póki szyb nie zasypał mu braci.', fragment: 'h1' },
  { imie: 'Mszczuj', plec: 'm', rola: 'robotnik', perk: 'zyla', kim: 'Syn kowala z Gniezna. Mówi, że żelazo samo go woła.', fragment: 'h2' },
  { imie: 'Jarosta', plec: 'k', rola: 'robotnik', perk: 'wytrwaly', wada: 'kulawy', kim: 'Nosiła worki na grodzisku, aż przyszli ludzie w czerni.', fragment: 'h3' },
  { imie: 'Wojsław', plec: 'm', rola: 'rycerz', perk: 'twardy', kim: 'Ostatni z pocztu, który wjechał w tę górę po zaginionego księcia.', fragment: 'h6' },
  // przybysze z daru ludzi — po kolei
  { imie: 'Świętosław', plec: 'm', rola: 'robotnik', perk: 'lekki', kim: 'Zszedł w złotym słupie. Nie pamięta niczego sprzed światła.', fragment: 'h7' },
  { imie: 'Dobrawa', plec: 'k', rola: 'robotnik', perk: 'krzepki', wada: 'lakomy', kim: 'Pastuszka spod Sandomierza; szukała w górze zabłąkanej owcy.', fragment: 'h8' },
  { imie: 'Gniewko', plec: 'm', rola: 'robotnik', perk: 'zyla', wada: 'niezdara', kim: 'Złodziej z Krakowa, który uciekał przed katem do kopalni.', fragment: 'h9' },
  { imie: 'Lubomira', plec: 'k', rola: 'robotnik', perk: 'wytrwaly', kim: 'Wdowa po flisaku; przysięgła, że nie umrze nad wodą.', fragment: 'h10' },
  { imie: 'Sieciech', plec: 'm', rola: 'robotnik', perk: 'kilof', wada: 'watly', kim: 'Kamieniarz, który rzeźbił świętych do katedry i się w nich zawiódł.', fragment: 'h11' },
  { imie: 'Bożena', plec: 'k', rola: 'robotnik', perk: 'lekki', kim: 'Córka karczmarza; nauczyła się w górze spać przy otwartych oczach.', fragment: 'h12' },
  { imie: 'Wszebor', plec: 'm', rola: 'robotnik', perk: 'krzepki', wada: 'kulawy', kim: 'Najemnik bez pana; z każdej wojny wracał sam.', fragment: 'h13' },
  { imie: 'Żelisław', plec: 'm', rola: 'robotnik', perk: 'kilof', kim: 'Górnik ze Srebrnej Góry, który już raz słyszał, jak skała oddycha.', fragment: 'h14' },
];

/** Wizja Pawła: pule imion, z których ziarno partii losuje drużynę (każde imię inne). */
export const IMIONA: Record<Plec, string[]> = {
  m: ['Bogdan', 'Wojsław', 'Dobromir', 'Mszczuj', 'Świętosław', 'Gniewko', 'Sieciech', 'Wszebor', 'Żelisław', 'Bolesław', 'Przybysław', 'Racibor', 'Bogumił', 'Ciechosław', 'Dzierżko', 'Mirosław', 'Sobiesław', 'Zbylut', 'Krzesimir', 'Jaksa'],
  k: ['Radost', 'Jarosta', 'Dobrawa', 'Lubomira', 'Bożena', 'Dobrosława', 'Wszebora', 'Mścisława', 'Świętochna', 'Gniewomira', 'Bogna', 'Witosława'],
};

/** Wizja Pawła: szansa, że wylosowana postać to kobieta (rycerz zawsze mężczyzna). */
export const SZANSA_KOBIETY = 0.35;

export const DRUZYNA = {
  /** Co tyle tików symulacja sprawdza wyzwalacze, które zależą od miejsca (głęboko, krypta, weteran, demon). */
  sprawdzajCo: 120,
};
