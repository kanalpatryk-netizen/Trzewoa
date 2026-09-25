import type { Ekran } from '../screen';
import type { Kontekst } from '../context';
import type { Akcja } from '../../core/keybinds';
import { EkranGry, type ZdarzenieGry } from './game';
import { Cutscenka } from '../../cutscene/cutscene';
import { SCENY } from '../../cutscene/scenes';
import type { Cel } from '../../render/znaczniki';
import { BARWA, rgba } from '../../render/palette';
import { SERIF, panel, akapit, linieAkapitu } from '../../render/ink';
import { ustaw } from '../../core/settings-store';
import { T, PASSABLE } from '../../sim/tiles';
import { Race } from '../../sim/races';

interface Krok {
  scena?: keyof typeof SCENY;
  /** Czas stoi przez cały krok — gdy trzeba trafić w konkretne stworzenie. */
  stopCzasu?: boolean;
  zadanie: string;
  jak: string;
  poZrobieniu: string;
  czasowniki?: string[];
  narzedzie?: string;
  przygotuj?: (g: EkranGry) => void;
  cel?: (g: EkranGry) => Cel | null;
  sprawdz?: (z: ZdarzenieGry | null, g: EkranGry, msKroku: number) => boolean;
}

/**
 * Samouczek uczy przez robienie: jedno polecenie naraz, zaznaczone miejsce na płycie
 * i zdanie o tym, co się właśnie stało. Reszta mechanik czeka w bestiariuszu.
 */
export class EkranSamouczka implements Ekran {
  nazwa = 'samouczek';
  private gra: EkranGry;
  private film = new Cutscenka();
  private krokIdx = 0;
  private faza: 'scena' | 'zadanie' | 'koniec' = 'scena';
  private msKroku = 0;
  private zrobione = false;
  private blysk = 0;
  private dalejRect: { x: number; y: number; w: number; h: number } | null = null;

  // --- pomoce do wskazywania miejsc na planszy
  private gniazdoGoblinow(g: EkranGry): { x: number; y: number } | null {
    // środek ciężkości żywych goblinów, nie punkt gniazda: gniazdo zostaje na mapie
    // nawet wtedy, gdy mieszka tam już kto inny — stąd pierścień wskazujący Nićarki
    const klan = g.sim.clans.filter((k) => !k.dead && k.race === Race.GOBLIN && k.pop > 0)
      .sort((a, b) => b.pop - a.pop)[0];
    if (!klan) return null;
    let sx = 0, sy = 0, n = 0;
    for (const c of g.sim.creatures) {
      if (c.dead || c.clan !== klan.id) continue;
      sx += c.x; sy += c.y; n++;
    }
    return n > 0 ? { x: sx / n, y: sy / n } : { x: klan.hx, y: klan.hy };
  }

  /** Puste miejsce przy gnieździe — tam ma trafić grzyb. */
  private miejsceNaGrzyb(g: EkranGry): Cel | null {
    const dom = this.gniazdoGoblinow(g);
    if (!dom) return null;
    const w = g.sim.world;
    for (let r = 2; r < 16; r++) {
      for (let k = 0; k < 26; k++) {
        const a = (k / 26) * Math.PI * 2;
        const x = Math.round(dom.x + Math.cos(a) * r), y = Math.round(dom.y + Math.sin(a) * r);
        if (!w.inb(x, y)) continue;
        if (w.tile[w.idx(x, y)] === T.AIR && !w.passable(x, y + 1) && w.water[w.idx(x, y)] === 0) {
          return { x: x + 0.5, y: y + 0.5, r: 3, tekst: 'tutaj zasiej grzyb' };
        }
      }
    }
    return { x: dom.x, y: dom.y, r: 3, tekst: 'tutaj zasiej grzyb' };
  }

  /** Lita skała tuż obok gniazda — tam ma powstać korytarz. */
  private miejsceNaKorytarz(g: EkranGry): Cel | null {
    const dom = this.gniazdoGoblinow(g);
    if (!dom) return null;
    const w = g.sim.world;
    for (let r = 3; r < 18; r++) {
      for (let k = 0; k < 26; k++) {
        const a = (k / 26) * Math.PI * 2;
        const x = Math.round(dom.x + Math.cos(a) * r), y = Math.round(dom.y + Math.sin(a) * r);
        if (!w.inb(x, y)) continue;
        if (PASSABLE[w.tile[w.idx(x, y)]] !== 1) return { x: x + 0.5, y: y + 0.5, r: 3, tekst: 'tutaj drąż' };
      }
    }
    return null;
  }

  /** Gniazdo nacji innej niż gobliny — po to, żeby gracz zobaczył, że nie są sami. */
  private gniazdoObcych(g: EkranGry): Cel | null {
    const klan = g.sim.clans.filter((k) => !k.dead && k.pop > 0 && k.race !== Race.GOBLIN)
      .sort((a, b) => b.pop - a.pop)[0];
    if (!klan) return this.gniazdoGoblinow(g) ? { ...this.gniazdoGoblinow(g)!, r: 6, tekst: 'twoi mieszkańcy' } : null;
    return { x: klan.hx, y: klan.hy, r: 6, tekst: klan.name };
  }

  private gniazdoLudzi(g: EkranGry): Cel | null {
    const klan = g.sim.clans.filter((k) => !k.dead && k.race === Race.HUMAN)
      .sort((a, b) => b.founded - a.founded)[0];
    return klan ? { x: klan.hx, y: klan.hy, r: 7, tekst: klan.name } : null;
  }

  private stworzenieDoSzeptu(g: EkranGry): Cel | null {
    const dom = this.gniazdoGoblinow(g);
    const c = dom ? g.sim.nearestCreature(dom.x, dom.y, 30, (o) => o.race === Race.GOBLIN) : g.sim.creatures.find((o) => !o.dead);
    if (!c) return null;
    return { x: c.x, y: c.y, r: 2.2, tekst: 'dotknij go' };
  }

  private kroki: Krok[] = [
    {
      scena: 'kimJestes',
      zadanie: 'Znajdź swoich mieszkańców.',
      jak: 'Przeciągnij płytę, kółkiem przybliż. Przy gnieździe zobaczysz podpis nacji — to oni w tobie mieszkają.',
      poZrobieniu: 'To Ślepy Lud. Przy każdym gnieździe stoi imię nacji i liczba żywych.',
      czasowniki: [],
      cel: (g) => { const d = this.gniazdoGoblinow(g); return d ? { x: d.x, y: d.y, r: 6, tekst: 'gniazdo Ślepego Ludu' } : null; },
      sprawdz: (z, _g, ms) => z?.typ === 'kamera' || ms > 9000,
    },
    {
      scena: 'pamiec',
      zadanie: 'Popatrz, jak rysunek ciebie sam się dopisuje.',
      jak: 'Ciemność to miejsca, o których nikt nie pamięta. Gdzie chodzą — tam wychodzi kreska, a gdy odejdą, rysunek blaknie. Nie musisz nic robić.',
      poZrobieniu: 'Widzisz sam siebie tylko tam, gdzie ktoś właśnie jest albo był.',
      czasowniki: [],
      przygotuj: (g) => { g.tempoMnoznik = 2; },
      sprawdz: (_z, _g, ms) => ms > 2500,
    },
    {
      scena: 'zasoby',
      zadanie: 'Popatrz na trzy organy w ramie obrazu.',
      jak: 'Na dole rysa z Krwią — rośnie z każdej śmierci. Pod sklepieniem dym Wiary — z modlitwy. Otchłań to sama ciemność: tyle, ile o tobie zapomniano. Liczb nie ma i nie będzie.',
      poZrobieniu: 'Krew płaci za skałę, Wiara za szept i cud, Otchłań za skażenie krwi. Kiedy nie wiesz, czy cię stać — ryt po lewej gaśnie.',
      czasowniki: [],
      przygotuj: (g) => { g.tempoMnoznik = 1; g.sim.krew += 120; g.sim.wiara += 40; },
      sprawdz: (_z, _g, ms) => ms > 3200,
    },
    {
      scena: 'zasiej',
      zadanie: 'Nakarm ich: zasiej grzyb w zaznaczonym miejscu.',
      jak: 'Dotknij drugiego rytu po lewej, wybierz u góry „grzyb", potem przeciągnij po zaznaczonym miejscu.',
      poZrobieniu: 'Pójdą jeść. Grzyb wyznacza, ilu Ślepego Ludu góra w ogóle udźwignie.',
      czasowniki: ['zasiej'],
      narzedzie: 'grzyb',
      przygotuj: (g) => { g.tempoMnoznik = 1; g.sim.krew += 300; g.sim.wiara += 60; },
      cel: (g) => this.miejsceNaGrzyb(g),
      sprawdz: (z) => z?.typ === 'moc' && z.czasownik === 'zasiej',
    },
    {
      scena: 'ksztaltuj',
      zadanie: 'Otwórz im drogę: wydrąż korytarz w zaznaczonej skale.',
      jak: 'Pierwszy ryt po lewej, narzędzie „drąż", i przeciągnij po zaznaczonym kawałku skały. Kosztuje Krew.',
      poZrobieniu: 'Tunel jest twój, ale pójdą nim oni. Tak się prowadzi cudze życie.',
      czasowniki: ['ksztaltuj'],
      narzedzie: 'draz',
      przygotuj: (g) => { g.sim.krew += 300; },
      cel: (g) => this.miejsceNaKorytarz(g),
      sprawdz: (z) => z?.typ === 'moc' && z.czasownik === 'ksztaltuj',
    },
    {
      scena: 'rasy',
      zadanie: 'Popatrz, kto jeszcze w tobie mieszka.',
      jak: 'Pod płytą leży wstęga warstw — jedno pasmo na nację, z podpisem. Kamera pokazuje teraz kogoś innego niż Ślepy Lud.',
      poZrobieniu: 'Każda z nich istnieje inaczej i inaczej ginie. Twoje jedzenie bierze się z ich różnicy.',
      czasowniki: [],
      przygotuj: (g) => { g.tempoMnoznik = 2; },
      cel: (g) => this.gniazdoObcych(g),
      sprawdz: (_z, _g, ms) => ms > 3200,
    },
    {
      scena: 'szept',
      zadanie: 'Zrób proroka: dotknij zaznaczonego stworzenia.',
      jak: 'Trzeci ryt po lewej, potem dotknij zaznaczonej sylwetki. Otworzy się jego karta — wybierz z niej „prorokuj".',
      poZrobieniu: 'Odszedł z wiernymi i założył własną nację. Od tej chwili ma urazę do dawnej — i o to chodziło.',
      czasowniki: ['szept'],
      stopCzasu: true,                       // stwór ma stać w miejscu, a nie uciekać pierścieniowi
      przygotuj: (g) => { g.sim.wiara += 150; },
      cel: (g) => this.stworzenieDoSzeptu(g),
      sprawdz: (z) => z?.typ === 'szept',
    },
    {
      scena: 'znak',
      zadanie: 'Zrób im jawny cud: użyj Znaku przy gnieździe.',
      jak: 'Czwarty ryt po lewej, narzędzie „objawienie", i dotknij płyty koło gniazda. Widzą to wszyscy w promieniu dwudziestu sześciu kafli.',
      poZrobieniu: 'Zostaje glif: modlitwa przy nim liczy się podwójnie. Oddanie tej nacji właśnie skoczyło — a oddanie to jedyne, co otwiera rdzeń.',
      czasowniki: ['znak'],
      narzedzie: 'objawienie',
      przygotuj: (g) => { g.tempoMnoznik = 1; g.sim.wiara += 160; },
      cel: (g) => { const d = this.gniazdoGoblinow(g); return d ? { x: d.x, y: d.y, r: 5, tekst: 'tu zrób cud' } : null; },
      sprawdz: (z) => z?.typ === 'moc' && z.czasownik === 'znak',
    },
    {
      scena: 'skaz',
      zadanie: 'Zmień im krew: użyj Skazy na zaznaczonym stworzeniu.',
      jak: 'Piąty ryt po lewej, wybierz u góry skazę, potem dotknij sylwetki. Zmiana idzie na cały gatunek i na wszystkie pokolenia po nim. Cofnąć się nie da.',
      poZrobieniu: 'Tak się hoduje własne jedzenie. Płodność da ci więcej śmierci, ślepota — więcej modlitwy.',
      czasowniki: ['skaz'],
      stopCzasu: true,
      przygotuj: (g) => { g.sim.krew += 260; },
      cel: (g) => this.stworzenieDoSzeptu(g),
      sprawdz: (z) => z?.typ === 'moc' && z.czasownik === 'skaz',
    },
    {
      scena: 'przyplyw',
      zadanie: 'Przetrzymaj przypływ.',
      jak: 'Co jakiś czas dzieje się coś, czego nie chciałeś: zalanie, zaraza, żyła szaleństwa albo ludzie z powierzchni. Właśnie schodzą ludzie. Patrz.',
      poZrobieniu: 'Ludzie nie mieszkają w tobie — biorą rudę i wracają na górę. Każdy przypływ miesza w spisie warstw, a ty z tego żyjesz.',
      czasowniki: [],
      przygotuj: (g) => { g.tempoMnoznik = 2; g.sim.humanRaid(); },
      cel: (g) => this.gniazdoLudzi(g),
      sprawdz: (_z, _g, ms) => ms > 4000,
    },
    {
      zadanie: 'To jest twój rdzeń.',
      jak: 'Bije na dnie góry, zamknięty w kamieniu, którego nie rozkuje żaden kilof. Pęka tylko pod modlitwą: gdy kilku naprawdę wierzących zejdzie pod skorupę i zostanie tam dość długo. Wtedy ktoś dojdzie do ciebie — i albo uklęknie, albo zabije.',
      poZrobieniu: 'Teraz wiesz, gdzie jest twój koniec — i że sam go sobie nie otworzysz. Musi to zrobić kult. Został jeszcze Znak — jawny cud za czterdzieści pięć Wiary; znajdziesz go pod czwartym rytem i w bestiariuszu.',
      czasowniki: [],
      przygotuj: (g) => { g.tempoMnoznik = 1; },
      cel: (g) => ({ x: g.sim.world.coreX + 0.5, y: g.sim.world.coreY + 0.5, r: 6, tekst: 'twój rdzeń' }),
      sprawdz: (_z, _g, ms) => ms > 1500,
    },
    {
      scena: 'spis',
      zadanie: 'Popatrz na wstęgę warstw pod płytą.',
      jak: 'Każda rasa ma tam swoje pasmo. Gdy jedno zacznie zjadać resztę, zaczniesz zasypiać. To twoja jedyna przegrana.',
      poZrobieniu: 'Dominacja jednej krwi to twoja jedyna przegrana. Rozbijaj ją szeptem, zawałem i cudem.',
      czasowniki: [],
      przygotuj: (g) => { g.tempoMnoznik = 3; },
      sprawdz: (_z, _g, ms) => ms > 2500,
    },
    {
      scena: 'kronika',
      zadanie: 'Otwórz zapiski: klawisz K albo znak kart przy dolnej krawędzi.',
      jak: 'Kronika pod płytą pokazuje trzy ostatnie zdania. Zapiski trzymają wszystko — z datą. Kliknięcie we wpis przenosi wzrok tam, gdzie to się stało.',
      poZrobieniu: 'To jest jedyna nagroda w tej grze: opowieść o tym, czym byłeś dla tych, co w tobie mieszkali. Reszta jest w bestiariuszu.',
      czasowniki: [],
      przygotuj: (g) => { g.tempoMnoznik = 1; },
      sprawdz: (_z, g) => g.zapiski,
    },
  ];

  constructor(private app: Kontekst) {
    this.gra = new EkranGry(app);
    this.gra.zapisujAuto = false;
    this.gra.nasluch = (z) => this.zdarzenie(z);
  }

  wejdz(): void {
    this.gra.nowaGra(20260921);
    this.gra.sim.spokojnySwiat = true;      // stały świat: żadnych zaraz i najazdów w trakcie nauki
    this.gra.sim.nakarmSwiat();             // i pełna spiżarnia, żeby nauka nie była patrzeniem na głód
    const dom = this.gniazdoGoblinow(this.gra);
    if (dom) this.gra.sim.odsunKlany(Race.SPINNER, dom.x, dom.y);   // Prządki uczą się na osobnej scenie
    this.gra.wejdz({ tryb: 'samouczek' });
    this.krokIdx = 0;
    this.faza = 'scena';
    this.msKroku = 0;
    this.zrobione = false;
    this.app.muzyka.ustawScene('samouczek');
    this.zacznijKrok();
  }

  rozmiar(w: number, h: number): void { this.gra.rozmiar(w, h); }

  private get biezacy(): Krok { return this.kroki[this.krokIdx]; }

  private zacznijKrok(): void {
    const k = this.biezacy;
    this.msKroku = 0;
    this.zrobione = false;
    k.przygotuj?.(this.gra);
    this.gra.pauza = !!k.stopCzasu;          // krok z celowaniem dostaje nieruchomy świat
    this.gra.dozwolone = k.czasowniki && k.czasowniki.length ? new Set(k.czasowniki) : (k.czasowniki ? new Set() : null);
    this.gra.ui.verb = null;
    this.gra.cel = null;
    if (k.scena) {
      this.faza = 'scena';
      this.film.odtworz(SCENY[k.scena], () => this.zacznijZadanie());
    } else this.zacznijZadanie();
  }

  /** Po scenie: ustaw cel, dowieź kamerę i podaj graczowi gotowe narzędzie. */
  private zacznijZadanie(): void {
    const k = this.biezacy;
    this.faza = 'zadanie';
    this.msKroku = 0;
    const cel = k.cel?.(this.gra) ?? null;
    this.gra.cel = cel;
    if (cel) {
      this.gra.pokazMiejsce(cel.x, cel.y, 15);
    }
    if (k.czasowniki?.length) {
      this.gra.wybierzCzasownik(k.czasowniki[0]);
      if (k.narzedzie) this.gra.ui.tool = k.narzedzie;
    }
  }

  private zdarzenie(z: ZdarzenieGry): void {
    if (this.faza !== 'zadanie' || this.zrobione) return;
    if (this.biezacy.sprawdz?.(z, this.gra, this.msKroku)) this.zaliczone();
  }

  private zaliczone(): void {
    if (this.zrobione) return;
    this.zrobione = true;
    this.gra.pauza = false;                  // skutek ma być widoczny od razu
    this.blysk = 1;
    this.gra.cel = null;
    this.app.dzwiek.toll();
  }

  private dalejKrok(): void {
    if (this.krokIdx >= this.kroki.length - 1) { this.zakonczSamouczek(); return; }
    this.krokIdx++;
    this.zacznijKrok();
  }

  private zakonczSamouczek(): void {
    ustaw('samouczekZrobiony', true);
    this.gra.dozwolone = null;
    this.gra.tempoMnoznik = 1;
    this.gra.cel = null;
    this.app.idz('menu', { komunikat: 'Samouczek skończony. Reszta mechanik czeka w bestiariuszu.' });
  }

  krok(dt: number, teraz: number): void {
    if (this.faza === 'scena') { this.film.krok(dt); return; }
    this.msKroku += dt;
    this.blysk = Math.max(0, this.blysk - dt * 0.0016);
    this.gra.krok(dt, teraz);
    if (!this.zrobione && this.biezacy.sprawdz?.(null, this.gra, this.msKroku)) this.zaliczone();
    // nic nie przełącza się samo — krok kończy dopiero „Dalej"
  }

  rysuj(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    if (this.faza === 'scena') { this.film.rysuj(ctx, w, h, teraz); return; }
    this.gra.rysuj(ctx, w, h, teraz);
    this.panelZadania(ctx, w, teraz);
  }

  private panelZadania(ctx: CanvasRenderingContext2D, w: number, teraz: number): void {
    const k = this.biezacy;
    const p = this.gra.plate;
    const szer = p.waski ? p.w - 20 : Math.min(460, p.w * 0.48);
    const x = p.x + (p.waski ? 10 : 16);
    const y = p.y + (p.waski ? 8 : 14);
    const rozmiar = Math.max(15, Math.min(21, w / 56));
    const tekstGlowny = this.zrobione ? k.poZrobieniu : k.zadanie;
    const tekstMaly = this.zrobione ? '' : k.jak;

    ctx.save();
    ctx.font = `italic ${rozmiar * 0.82}px ${SERIF}`;
    const linieMale = tekstMaly ? linieAkapitu(ctx, tekstMaly, szer - 36) : 0;
    ctx.font = `${rozmiar}px ${SERIF}`;
    const linieDuze = linieAkapitu(ctx, tekstGlowny, szer - 36);
    const wys = 30 + linieDuze * rozmiar * 1.35 + linieMale * rozmiar * 1.2 + rozmiar * 2.6;
    panel(ctx, x, y, szer, wys, 0.92);

    ctx.textAlign = 'left';
    ctx.font = `${Math.max(14, rozmiar * 0.6)}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atramentCichy, 0.8);
    ctx.fillText(`KROK ${this.krokIdx + 1} z ${this.kroki.length}`, x + 18, y + 24);

    ctx.font = `${rozmiar}px ${SERIF}`;
    ctx.fillStyle = rgba(this.zrobione ? BARWA.zarBlady : BARWA.atramentMocny, 0.97);
    let yy = y + 26 + rozmiar * 1.25;
    akapit(ctx, tekstGlowny, x + 18, yy, szer - 36, rozmiar * 1.35);
    yy += linieDuze * rozmiar * 1.35;

    if (tekstMaly) {
      ctx.font = `italic ${rozmiar * 0.82}px ${SERIF}`;
      ctx.fillStyle = rgba(BARWA.atrament, 0.72);
      akapit(ctx, tekstMaly, x + 18, yy + rozmiar * 0.4, szer - 36, rozmiar * 1.2);
    }

    const etykieta = this.zrobione ? 'Dalej →' : 'Pomiń ten krok →';
    ctx.font = `${rozmiar * 0.92}px ${SERIF}`;
    const szerTekst = ctx.measureText(etykieta).width;
    const bx = x + szer - szerTekst - 20, by = y + wys - rozmiar * 0.5;
    ctx.fillStyle = rgba(this.zrobione ? BARWA.zarBlady : BARWA.atramentCichy,
      this.zrobione ? 0.75 + 0.25 * Math.sin(teraz * 0.004) : 0.5);
    ctx.fillText(etykieta, bx, by);
    ctx.strokeStyle = rgba(this.zrobione ? BARWA.zarBlady : BARWA.atramentCichy, this.zrobione ? 0.6 : 0.3);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, by + 5); ctx.lineTo(bx + szerTekst, by + 5);
    ctx.stroke();
    this.dalejRect = { x: bx - 14, y: by - rozmiar, w: szerTekst + 28, h: rozmiar * 1.7 };

    ctx.font = `italic ${Math.max(14, rozmiar * 0.6)}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atramentCichy, 0.45);
    ctx.fillText('P albo esc — wyjście z samouczka', x + 18, by);

    if (this.blysk > 0) {
      ctx.strokeStyle = rgba(BARWA.zarBlady, this.blysk * 0.8);
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 3, y - 3, szer + 6, wys + 6);
    }
    ctx.restore();
  }

  dotyk(e: PointerEvent, faza: 'dol' | 'ruch' | 'gora'): void {
    if (this.faza === 'scena') { if (faza === 'dol') this.film.dalej(); return; }
    const d = this.dalejRect;
    if (faza === 'dol' && d && e.clientX >= d.x && e.clientX <= d.x + d.w && e.clientY >= d.y && e.clientY <= d.y + d.h) {
      this.dalejKrok();
      return;
    }
    this.gra.dotyk(e, faza);
  }

  kolko(e: WheelEvent): void {
    if (this.faza === 'scena') return;
    this.gra.kolko(e);
  }

  klawisz(akcja: Akcja | null, e: KeyboardEvent): void {
    if (akcja === 'menu') {
      if (this.faza === 'scena') { this.film.pomin(); return; }
      this.app.idz('menu');
      return;
    }
    if (this.faza === 'scena') { if (e.key === ' ' || e.key === 'Enter') this.film.dalej(); return; }
    if (e.key === 'Enter') { this.dalejKrok(); return; }
    this.gra.klawisz?.(akcja, e);
  }
}
