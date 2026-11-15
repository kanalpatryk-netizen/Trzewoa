// SCENARIUSZ TRAILERA „TRZEWIA” — jedno źródło prawdy dla nagrywania (nagraj.mjs), montażu (montaz.mjs)
// i muzyki (muzyka.mjs). Czas w sekundach filmu; tempo muzyki 75 BPM — takt (4 ćwierćnuty) = 3,2 s = 96 klatek.
//
// Wpisy:
//  - typ 'gra'    — ujęcie z gry: ziarno partii (z), tik pierwszej widocznej klatki (start), kamera (klucze albo
//                   ścieżka), śledzenie (sledz), tempo czasu gry, rozkazy gracza (prolog w tikach, akcje w klatkach);
//  - typ 'napis'  — tekst (karta na czerni albo napis na obrazie);
//  - typ 'tytul'  — plansza z logo gry.
// Przejścia: `wejscie` / `wyjscie` ujęcia ({ typ: 'ciecie' | 'przenik' | 'czern' | 'blysk', dl }).
// Muzyka czyta `MUZYKA` (sekcje i uderzenia) — uderzenia stoją na cięciach i zdarzeniach w obrazie.

export const FPS = 30;
export const BPM = 75;
export const TAKT = (4 * 60) / BPM;          // 3,2 s
export const T = (takt, miara = 0) => +((takt - 1) * TAKT + miara * (60 / BPM)).toFixed(3);   // początek taktu (od 1) + ćwierćnuty
export const DLUGOSC = T(49);                // 153,6 s

// Partia z ziarnem 3 (bot „rozsądny”): droga wykopana 5,6 min, brama 6,2 min, pęknięcia pomnika 7,6 / 9,6 / 11,7 min,
// dłoń anielska 9,0 min, pomnik pęka w gruz ok. tiku 104270, demon stoi ok. 104700, tarcza z dłoni 105100,
// chwyt i rzut rycerzem 106570–106840, uderzenie w ziemię 107430, przygniecenie 107954, ryk 108754,
// szarża 109536, ostatni cios 109858 (gra sama zwalnia czas), Uwolnienie 110278.
// Dostawy jedzenia co 4800 tików: konwój staje przy koźle, a worek zjeżdża po linie w tikach 9750–10170.

const rozkazBudowy = (od, do_, co = 1200) => {
  const l = [];
  for (let t = od; t <= do_; t += co) l.push({ t, js: 'return R.budujSchody()' });
  return l;
};

export const SCENARIUSZ = [
  // ================================================================ HAK (takty 1–6)
  { id: 'N01', typ: 'napis', od: T(1, 2), dl: 4.0, tekst: 'Nie jesteś bogiem.', styl: 'karta' },
  { id: 'N02', typ: 'napis', od: T(3), dl: 4.4, tekst: 'Jesteś górą, która śni.', styl: 'karta' },
  {
    id: 'S01', typ: 'gra', od: T(4, 2), dl: T(7) - T(4, 2), z: 3, start: 2400,
    opis: 'Przebudzenie: od rozety katedry w dół, po smudze światła, do sali z ołtarzem',
    kamera: [{ f: 0, x: 95, y: -2, z: 36 }, { f: 0.18, x: 95, y: -1, z: 35, e: 'sinus' }, { f: 1, x: 97.5, y: 33.5, z: 30, e: 'miekko' }],
    wejscie: { typ: 'czern', dl: 1.6 },
  },

  // ================================================================ AKT I: ŻYCIE (takty 7–17)
  {
    id: 'S02', typ: 'gra', od: T(7), dl: TAKT, z: 3, start: 3000,
    opis: 'Lud przy ołtarzu: pobożni, robotnik, rycerz',
    kamera: [{ f: 0, x: 101, y: 35.2, z: 52 }, { f: 1, x: 102.5, y: 35.4, z: 58, e: 'liniowo' }],
  },
  { id: 'N03', typ: 'napis', od: T(7) + 0.3, dl: TAKT - 0.5, tekst: 'W twoich trzewiach żyje lud.', styl: 'obraz' },
  {
    id: 'S03', typ: 'gra', od: T(8), dl: TAKT, z: 3, start: 9150,
    opis: 'Konwój z końmi nadjeżdża do kozła nad szybem wiadra',
    kamera: [{ f: 0, x: 121, y: 10.6, z: 44 }, { f: 1, x: 113, y: 10.6, z: 46, e: 'wyjscie' }],
  },
  { id: 'N04', typ: 'napis', od: T(8) + 0.3, dl: 2 * TAKT - 0.5, tekst: 'Karmisz ich.', styl: 'obraz' },
  {
    id: 'S04', typ: 'gra', od: T(9), dl: TAKT, z: 3, start: 9752, tempo: 420 / 384,
    opis: 'Worek z jedzeniem zjeżdża po linie szybem wiadra do sali — kamera jedzie za nim',
    kamera: [{ f: 0, x: 103.5, y: 12, z: 42 }, { f: 1, x: 103.5, y: 35, z: 42, e: 'gladko' }],
  },
  {
    id: 'S05', typ: 'gra', od: T(10), dl: TAKT, z: 3, start: 3600,
    opis: 'Szept: nić światła schodzi na głowę pobożnego, nad głową zapala się znak',
    kamera: [{ f: 0, x: 103.2, y: 35.0, z: 50 }, { f: 1, x: 103.6, y: 35.0, z: 54, e: 'liniowo' }],
    akcje: [{ f: 6, js: "const p = R.lud('pobozny').sort((a,b)=>b.x-a.x)[0]; return p ? R.szept(p.id) : 'brak'" }],
  },
  { id: 'N05', typ: 'napis', od: T(10) + 0.3, dl: TAKT - 0.5, tekst: 'Szepczesz im.', styl: 'obraz' },
  {
    id: 'S06', typ: 'gra', od: T(11), dl: 1.5 * TAKT, z: 3, start: 4200,
    opis: 'Cud: objawienie przy pobożnym — słup światła, krąg znaków, pióra',
    kamera: [{ f: 0, x: 102.5, y: 31.5, z: 36 }, { f: 1, x: 103, y: 32.5, z: 40, e: 'liniowo' }],
    akcje: [{ f: -14, js: "const p = R.lud('pobozny').sort((a,b)=>a.x-b.x)[0]; return p ? R.cud(p.id) : 'brak'" }],
  },
  { id: 'N06', typ: 'napis', od: T(11) + 0.6, dl: 1.5 * TAKT - 0.9, tekst: 'Zsyłasz im cuda.', styl: 'obraz' },
  {
    id: 'S07', typ: 'gra', od: T(12, 2), dl: TAKT, z: 3, start: 12800,
    opis: 'Robotnicy kują drogę wiernych — błysk złota w skale',
    kamera: [{ f: 0, x: 46, y: 112.6, z: 52 }, { f: 1, x: 46, y: 113.4, z: 56, e: 'liniowo' }],
  },
  { id: 'N07', typ: 'napis', od: T(12, 2) + 0.3, dl: TAKT - 0.5, tekst: 'A oni kopią.', styl: 'obraz' },
  {
    id: 'S08', typ: 'gra', od: T(13, 2), dl: TAKT, z: 3, start: 45300,
    opis: 'Kołowrót nad szybem: robotnik kręci korbą, na linie zjeżdżają kamienne stopnie',
    prolog: rozkazBudowy(41000, 45300),
    akcje: [{ f: -40, co: 30, js: 'R.budujSchody()', cicho: true }],
    kamera: [{ f: 0, x: 79.5, y: 36.5, z: 60 }, { f: 1, x: 79, y: 37.5, z: 64, e: 'liniowo' }],
  },
  {
    id: 'S09', typ: 'gra', od: T(14, 2), dl: 1.5 * TAKT, z: 3, start: 44000, tempo: 8,
    opis: 'Schody kręcone rosną od dołu: rusztowanie, kamienie na linie, murarze (przyspieszone)',
    prolog: rozkazBudowy(41000, 44000),
    akcje: [{ f: -40, co: 30, js: 'R.budujSchody()', cicho: true }],
    kamera: [{ f: 0, x: 73.5, y: 79, z: 40 }, { f: 1, x: 74.5, y: 63, z: 40, e: 'liniowo' }],
  },
  { id: 'N08', typ: 'napis', od: T(14, 2) + 0.5, dl: 1.5 * TAKT - 0.8, tekst: 'Coraz głębiej.', styl: 'obraz' },
  {
    id: 'S10', typ: 'gra', od: T(16), dl: 2 * TAKT, z: 3, start: 100200,
    opis: 'Zejście: kamera spada drogą wiernych od sali przez komnatę z kotłem i szyb aż do lochu z pomnikiem',
    sciezka: true, krzywa: 'miekko', rozmycie: 4,
    kamera: [
      { x: 92, y: 34, z: 26 }, { x: 77, y: 52, z: 24 }, { x: 70, y: 79, z: 24 }, { x: 52, y: 92, z: 22 },
      { x: 46, y: 140, z: 22 }, { x: 47, y: 196, z: 22 }, { x: 62, y: 213, z: 24 }, { x: 94, y: 220, z: 26 },
    ],
  },
  { id: 'N09', typ: 'napis', od: T(17, 1), dl: TAKT - 0.9, tekst: 'Ku twemu sercu.', styl: 'obraz' },

  // ================================================================ PRZEJŚCIE (takty 18–19)
  { id: 'N10', typ: 'napis', od: T(18) + 0.4, dl: 2 * TAKT - 0.8, tekst: 'Lecz na samym dnie\ncoś śpi.', styl: 'karta' },

  // ================================================================ AKT II: TAJEMNICA (takty 20–32)
  {
    id: 'S11', typ: 'gra', od: T(20), dl: 2 * TAKT, z: 3, start: 46800,
    opis: 'Wielki Pomnik: kamienny demon w łańcuchach, wolny najazd',
    kamera: [{ f: 0, x: 96.5, y: 225.6, z: 38 }, { f: 1, x: 96.5, y: 225.4, z: 60, e: 'sinus' }],
    wejscie: { typ: 'czern', dl: 1.2 },
  },
  {
    id: 'S12', typ: 'gra', od: T(22), dl: TAKT, z: 3, start: 41700,
    opis: 'Pobożni zaklinają nad kotłem — runy, turkusowy wywar',
    kamera: [{ f: 0, x: 61, y: 81.4, z: 60 }, { f: 1, x: 61, y: 81.2, z: 66, e: 'liniowo' }],
  },
  {
    id: 'S13', typ: 'gra', od: T(23), dl: TAKT, z: 3, start: 42450, tempo: 6,
    opis: 'Stalowa brama lochu unosi się, runy na nadprożu zapalają się (przyspieszone)',
    kamera: [{ f: 0, x: 53.2, y: 211.6, z: 66 }, { f: 1, x: 53.4, y: 211.5, z: 70, e: 'liniowo' }],
  },
  {
    id: 'S14', typ: 'gra', od: T(24), dl: TAKT, z: 3, start: 52600,
    opis: 'Pobożni modlą się nad pomnikiem — aureole, krąg światła',
    kamera: [{ f: 0, x: 95, y: 214, z: 46 }, { f: 1, x: 95.6, y: 214.2, z: 50, e: 'liniowo' }],
  },
  { id: 'N11', typ: 'napis', od: T(24) + 0.3, dl: TAKT - 0.4, tekst: 'Modlitwa kruszy kamień.', styl: 'obraz' },
  {
    id: 'S15', typ: 'gra', od: T(25), dl: TAKT / 2, z: 3, start: 54750,
    opis: 'Pęknięcie I — po kamiennym demonie biegną rysy',
    kamera: [{ f: 0, x: 96.5, y: 225, z: 54 }, { f: 1, x: 96.5, y: 225, z: 57, e: 'wyjscie' }],
    wejscie: { typ: 'blysk', dl: 0.25 },
  },
  {
    id: 'S16', typ: 'gra', od: T(25, 2), dl: 1.5 * TAKT, z: 3, start: 54800,
    opis: 'Strażnicy Snu wychodzą ze skały, rycerz tnie serią trzech cięć',
    sledz: { kto: 'rycerz', z: 50, k: 0.1, dy: -1.8 },
  },
  {
    id: 'S17', typ: 'gra', od: T(27), dl: 1.5 * TAKT, z: 3, start: 64850,
    opis: 'Dłoń anielska schodzi w złotym świetle przez skałę do sali',
    kamera: [{ f: 0, x: 97, y: 26, z: 28 }, { f: 1, x: 97, y: 31, z: 30, e: 'miekko' }],
  },
  {
    id: 'S18', typ: 'gra', od: T(28, 2), dl: TAKT / 2, z: 3, start: 68942,
    opis: 'Pęknięcie II — z pomnika odpadają kawałki',
    kamera: [{ f: 0, x: 96.5, y: 224, z: 64 }, { f: 1, x: 96.5, y: 224, z: 67, e: 'wyjscie' }],
    wejscie: { typ: 'blysk', dl: 0.25 },
  },
  {
    id: 'S19', typ: 'gra', od: T(29), dl: TAKT, z: 3, start: 69380,
    opis: 'Rycerz kręci młynkiem przeciw Strażnikom',
    sledz: { kto: 'rycerz', z: 56, k: 0.12, dy: -1.6 },
  },
  {
    id: 'S20', typ: 'gra', od: T(30), dl: TAKT, z: 3, start: 83994,
    opis: 'Pęknięcie III — przez szczeliny bije czerwone światło, demon w środku się budzi',
    kamera: [{ f: 0, x: 96.5, y: 225.3, z: 48 }, { f: 1, x: 96.5, y: 224.6, z: 60, e: 'wyjscie' }],
    wejscie: { typ: 'blysk', dl: 0.25 },
  },
  { id: 'N12', typ: 'napis', od: T(30) + 0.5, dl: TAKT - 0.7, tekst: 'Coś się budzi.', styl: 'obraz' },
  {
    id: 'S21', typ: 'gra', od: T(31), dl: TAKT, z: 3, start: 84290,
    opis: 'Fala Strażników III: rycerz tnie raz po raz',
    sledz: { kto: 'rycerz', z: 58, k: 0.14, dy: -1.6 },
  },
  {
    id: 'S22', typ: 'gra', od: T(32), dl: TAKT, z: 3, start: 103880,
    opis: 'Cisza przed burzą: pęknięty pomnik żarzy się coraz mocniej',
    kamera: [{ f: 0, x: 96.5, y: 223, z: 34 }, { f: 1, x: 96.5, y: 225.5, z: 50, e: 'wejscie' }],
  },

  // ================================================================ AKT III: DEMON (takty 33–44) — jedna partia, ciągła akcja
  {
    id: 'S23', typ: 'gra', od: T(33), dl: TAKT / 2, z: 3, start: 104264,
    opis: 'Pomnik rozpada się w gruz',
    kamera: [{ f: 0, x: 96.5, y: 225.5, z: 52 }, { f: 1, x: 96.5, y: 226, z: 46, e: 'wyjscie' }],
    wejscie: { typ: 'blysk', dl: 0.35 },
  },
  {
    id: 'S24', typ: 'gra', od: T(33, 2), dl: 1.5 * TAKT, z: 3, start: 104456,
    opis: 'Demon wstaje z gruzu: żar, ręce, głowa z zapalającymi się oczami, aureola bucha ogniem',
    kamera: [{ f: 0, x: 96.5, y: 227.5, z: 56 }, { f: 0.45, x: 96.5, y: 224.2, z: 40, e: 'miekko' }, { f: 1, x: 96.5, y: 222.6, z: 50, e: 'sinus' }],
  },
  {
    id: 'S25', typ: 'gra', od: T(35), dl: TAKT / 2, z: 3, start: 105032,
    opis: 'Dłoń z otchłani wyrasta z podłogi jako tarcza',
    kamera: [{ f: 0, x: 97, y: 224.5, z: 40 }, { f: 1, x: 97.5, y: 225.5, z: 44, e: 'liniowo' }],
  },
  {
    id: 'S26', typ: 'gra', od: T(35, 2), dl: TAKT * 0.75, z: 3, start: 105540,
    opis: 'Rycerz z góry tnie demona: cios z wyskoku, piruet, iskry',
    sledz: { kto: 'walka', z: 58, k: 0.2, dy: -2.5 },
  },
  {
    id: 'S27', typ: 'gra', od: T(36, 1), dl: TAKT * 0.75, z: 3, start: 106470,
    opis: 'Dłoń z otchłani wyrasta za rycerzem i obejmuje go palcami',
    sledz: { kto: 'walka', z: 50, k: 0.2, dy: -1.5 },
  },
  {
    id: 'S28', typ: 'gra', od: T(37), dl: TAKT * 0.75, z: 3, start: 106700, tempo: [{ f: 0, v: 1 }, { f: 0.22, v: 0.35 }, { f: 0.7, v: 0.35 }, { f: 1, v: 1 }],
    opis: 'Dłoń ciska rycerzem pod strop (zwolnione)',
    kamera: [{ f: 0, x: 93.5, y: 215.5, z: 32 }, { f: 1, x: 92, y: 214.5, z: 30, e: 'miekko' }],
  },
  {
    id: 'S29', typ: 'gra', od: T(37, 3), dl: TAKT / 2, z: 3, start: 107412,
    opis: 'Uderzenie w ziemię: fala, pył, gruz ze stropu',
    sledz: { kto: 'boss', z: 40, k: 0.3, dy: 0.5 },
    wejscie: { typ: 'blysk', dl: 0.2 },
  },
  {
    id: 'S31', typ: 'gra', od: T(38, 1), dl: TAKT * 0.75, z: 3, start: 107900,
    opis: 'Demon przygniata rycerza dłonią',
    sledz: { kto: 'walka', z: 54, k: 0.2, dy: -1 },
  },
  {
    id: 'S30', typ: 'gra', od: T(39), dl: TAKT / 2, z: 3, start: 108690,
    opis: 'Tymczasem w sali: dłoń z otchłani przecina linę wiadra',
    kamera: [{ f: 0, x: 103.5, y: 31, z: 40 }, { f: 1, x: 103.5, y: 32, z: 42, e: 'liniowo' }],
  },
  {
    id: 'S32', typ: 'gra', od: T(39, 2), dl: TAKT * 0.75, z: 3, start: 108270,
    opis: 'Wymiana ciosów z bliska: cięcia rycerza, blok i zachwianie demona',
    sledz: { kto: 'walka', z: 66, k: 0.22, dy: -1.6 },
  },
  {
    id: 'S33', typ: 'gra', od: T(40, 1), dl: TAKT * 0.75, z: 3, start: 108740,
    opis: 'Demon ryczy — zbliżenie na głowę w płonącej aureoli',
    sledz: { kto: 'boss', z: 74, k: 0.25, dy: -2.6 },
  },
  {
    id: 'S34', typ: 'gra', od: T(41), dl: TAKT, z: 3, start: 109480, tempo: 0.7,
    opis: 'Szarża demona, rycerz powalony, wstaje',
    sledz: { kto: 'walka', z: [36, 46], k: 0.22 },
  },
  {
    id: 'S35', typ: 'gra', od: T(42), dl: 1.5 * TAKT, z: 3, start: 109749,
    opis: 'Ostatni cios: rycerz wyskakuje, czas zwalnia, demona rozsadza złote światło',
    sledz: { kto: 'walka', z: [44, 56], k: 0.18 },
    kamera: [{ f: 0, dx: 0, dy: 0, zm: 1 }, { f: 1, dx: 0, dy: -0.6, zm: 1.15, e: 'miekko' }],
  },
  {
    id: 'S36', typ: 'gra', od: T(43, 2), dl: 1.5 * TAKT, z: 3, start: 109982,
    opis: 'Demon rozsypuje się w pył — złote promienie, popiół',
    kamera: [{ f: 0, x: 87, y: 211, z: 40 }, { f: 1, x: 87, y: 210, z: 30, e: 'wyjscie' }],
    wyjscie: { typ: 'czern', dl: 1.0 },
  },

  // ================================================================ FINAŁ (takty 45–48)
  { id: 'N13', typ: 'napis', od: T(45) + 0.3, dl: TAKT - 0.4, tekst: 'Uwolnij się.', styl: 'karta' },
  { id: 'L01', typ: 'tytul', od: T(46), dl: 3 * TAKT, podpis: 'Alpha 1' },
];

/** Uderzenia i sekcje muzyki (sekundy filmu) — muzyka.mjs; `wstrzasy` trzęsą obrazem gry w montażu. */
export const MUZYKA = {
  sekcje: [
    { od: 0, nazwa: 'hak' },
    { od: T(7), nazwa: 'zycie' },
    { od: T(18), nazwa: 'dno' },
    { od: T(20), nazwa: 'tajemnica' },
    { od: T(32), nazwa: 'cisza' },
    { od: T(33), nazwa: 'demon' },
    { od: T(42), nazwa: 'ostatni' },
    { od: T(43, 2), nazwa: 'swiatlo' },
    { od: T(45), nazwa: 'final' },
  ],
  // wielkie uderzenia (boom) — na cięciach na rzeczy ważne
  uderzenia: [T(3), T(7), T(20), T(25), T(28, 2), T(30), T(33), T(35), T(37), T(37, 3), T(41), T(43, 2), T(46)],
  // wstrząsy obrazu (tylko na zdarzeniach w obrazie gry)
  wstrzasy: [T(25), T(28, 2), T(30), T(33), T(37, 3), T(41)],
};
