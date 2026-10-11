import { Sim } from '../sim/sim';
import { RACES } from '../sim/races';
import { cechaNacji } from '../sim/cechy';
import { rolaPostaci, NAZWA_ROLI, stanyPostaci } from '../sim/lud';
import { aktywnyBoss } from '../sim/boss';
import { rysujGrafike } from '../grafiki/grafiki';
import { Creature, Job } from '../sim/creatures';
import { Verb, TOOLS, affordable, cost, whisper, modliSie, moznaPrzemyslec, moznaKopacLosowo } from '../powers/powers';
import { SERIF, creatureName, creatureNameCelownik } from '../render/overlay';
import { Plate } from '../render/plate';
import { rysujStany } from '../render/stany';
import { rysujPostac } from '../render/figury';
import { ramaKarty } from '../render/ozdoby';
import { krazekZIkona, maIkone } from '../render/fresk';
import { zlotaNisza, brzegNiszy } from '../render/freski';
import { FRESK } from '../nastawy/barwy';
import { klawisze, nazwaKlawisza } from '../core/keybinds';
import type { Rozkazy } from '../powers/rozkazy';
import { STEROWANIE } from '../nastawy/sterowanie';

interface Hit { x: number; y: number; hw: number; hh: number; kind: 'verb' | 'tool' | 'thought'; verb?: Verb; tool?: string; }

/** Co ryt robi — jedno zdanie w podpisie pod kursorem. */
const SKUTKI: Record<Verb, string> = {
  zasiej: 'przeciągnij palcem — wyrośnie grzyb, którym się najedzą',
  szept: 'dotknij mieszkańca: „módl się” albo „prorokuj”',
  znak: 'dotknij przy gnieździe — ich oddanie rośnie',
};

/** Dolna krawędź znaku menu, liczona od górnej krawędzi płyty (patrz EkranGry.menuRect). */
const ZNAK_MENU_DOL = 40;

const VERBS: { id: Verb; label: string }[] = [
  { id: 'zasiej', label: 'Nakarm' },
  { id: 'szept', label: 'Szepnij' },
  { id: 'znak', label: 'Cud' },
];

/** Ryty wykute na lewym marginesie płyty; nazwy narzędzi wypisane u góry. Nic nie leży na skale. */
export class Ui {
  verb: Verb | null = null;
  tool: string | null = null;
  selected: Creature | null = null;
  private hits: Hit[] = [];
  private plate!: Plate;
  private vw = 0;
  private gs = 32; private gap = 50; private gx = 30; private gy = 0;
  private flash = '';
  private flashAt = -1e9;
  /** Ostatnie miejsce dotknięcia — komunikat pojawia się tam, gdzie patrzysz. */
  pointer = { x: 0, y: 0 };
  /** Myśl właśnie szepnięta z karty — gra zgłasza ją samouczkowi i czyści. */
  ostatniaMysl: string | null = null;
  /** W pauzie myśli nie dzieją się od razu — idą do planu i czekają na czas. */
  plan: Rozkazy | null = null;

  private dwieKolumny = false;
  /** Kiedy ostatnio wybrano ryt — na telefonie jego opis wisi przez chwilę (STEROWANIE.opisRytuMs). */
  private opisRytuOd = -1e9;

  layout(plate: Plate, vw: number): void {
    this.plate = plate; this.vw = vw;
    this.gs = Math.max(20, Math.min(38, plate.left * 0.5));
    // niskie okno: pięć rytów w jednej kolumnie się nie mieści, więc łamiemy je na dwie
    this.dwieKolumny = plate.h < this.gs * 9;
    const rzedy = this.dwieKolumny ? 3 : 5;
    this.gap = Math.min(plate.h / (rzedy + 0.6), this.gs * 2.1);
    this.gx = this.dwieKolumny ? plate.left * 0.32 : plate.left / 2;
    this.gy = plate.y + plate.h / 2 - this.gap * (rzedy - 1) / 2;
    // pierwszy ryt nie może wejść na znak menu w lewym górnym rogu płyty
    const odGory = plate.y + ZNAK_MENU_DOL + this.gs * 0.85;
    if (this.gy < odGory) {
      const dol = plate.y + plate.h - this.gs * 0.85;
      this.gap = Math.min(this.gap, (dol - odGory) / Math.max(1, rzedy - 1));
      this.gy = odGory;
    }
  }

  /**
   * Gdzie na ekranie leży ryt, słowo narzędzia albo myśl na karcie — samouczek
   * wskazuje palcem dokładnie to, w co trzeba kliknąć. Narzędzia i myśli są znane
   * dopiero po narysowaniu, więc przed pierwszą klatką zwraca null.
   */
  miejsce(rodzaj: 'verb' | 'tool' | 'thought', id: string): { x: number; y: number; hw: number; hh: number } | null {
    if (rodzaj === 'verb') {
      const i = VERBS.findIndex((v) => v.id === id);
      if (i < 0 || !this.plate) return null;
      const { x, y } = this.pozycjaRytu(i);
      return { x, y, hw: this.gs * 0.8, hh: this.gs * 0.8 };
    }
    const h = this.hits.find((z) => z.kind === rodzaj && z.tool === id);
    return h ? { x: h.x, y: h.y, hw: h.hw, hh: h.hh } : null;
  }

  /** Miejsce rytu numer i — jedna kolumna albo dwie, zależnie od wysokości okna. */
  private pozycjaRytu(i: number): { x: number; y: number } {
    if (!this.dwieKolumny) return { x: this.gx, y: this.gy + i * this.gap };
    const kolumna = i >= 3 ? 1 : 0;
    const wiersz = i - kolumna * 3;
    return { x: this.gx + kolumna * this.gs * 1.5, y: this.gy + wiersz * this.gap };
  }

  /**
   * Komunikat przy kursorze. Czas liczony zegarem, nie tikami świata: przy pauzie
   * albo otwartej karcie tiki stoją i komunikat wisiał bez końca, a po nowej grze
   * licznik tików się cofał i stary napis potrafił wrócić.
   */
  say(text: string, _tick?: number): void { this.flash = text; this.flashAt = performance.now(); }

  draw(ctx: CanvasRenderingContext2D, sim: Sim, time: number): void {
    this.hits = [];
    let opisRytu: { i: number; v: Verb; ready: boolean } | null = null;
    for (let i = 0; i < VERBS.length; i++) {
      const v = VERBS[i];
      const { x, y } = this.pozycjaRytu(i);
      const ready = TOOLS[v.id].some((t) => affordable(sim, v.id, t.id));
      this.oprawaRytu(ctx, x, y, v, this.verb === v.id, ready, time);
      this.rune(ctx, x, y, this.gs, v.id, this.verb === v.id, ready, time);
      this.hits.push({ x, y, hw: Math.max(this.gs * 1.15, 26), hh: Math.max(Math.min(this.gap * 0.5, this.gs * 1.15), 24), kind: 'verb', verb: v.id });
      if (STEROWANIE.pokazKlawisze) {
        if (Math.abs(this.pointer.x - x) <= this.gs * 0.9 && Math.abs(this.pointer.y - y) <= this.gap * 0.45) opisRytu = { i, v: v.id, ready };
      } else if (this.verb === v.id && time - this.opisRytuOd < STEROWANIE.opisRytuMs) {
        // palec nie „najeżdża” — opis pokazuje się na chwilę po wybraniu rytu i znika sam
        opisRytu = { i, v: v.id, ready };
      }
    }
    if (opisRytu) this.podpisRytu(ctx, sim, opisRytu.i, opisRytu.v, opisRytu.ready);

    if (this.verb && !(this.selected && !this.selected.dead)) this.drawTools(ctx, sim);
    if (this.selected && !this.selected.dead) this.drawCard(ctx, sim, this.selected, time);

    if (time - this.flashAt < 2600 && this.flash) {
      const a = Math.min(1, (2600 - (time - this.flashAt)) / 1000);
      const size = Math.max(14, this.vw / 76);
      ctx.font = `italic ${size}px ${SERIF}`;
      ctx.textAlign = 'center';
      // środek napisu trzyma się płyty tak, żeby cały tekst się w niej mieścił —
      // przy lewym brzegu wchodził na znak menu
      const pol = Math.min(this.plate.w / 2 - 8, ctx.measureText(this.flash).width / 2 + 10);
      const x = Math.max(this.plate.x + pol, Math.min(this.plate.x + this.plate.w - pol, this.pointer.x));
      // górny pasek płyty należy do drogi do wolności — komunikat nie może go zasłaniać
      const y = Math.max(this.plate.y + (this.plate.waski ? 128 : 96), this.pointer.y - size * 1.4);
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(10,7,6,${a * 0.85})`;
      ctx.strokeText(this.flash, x, y);
      ctx.fillStyle = `rgba(236,220,190,${a})`;
      ctx.fillText(this.flash, x, y);
    }
  }

  /**
   * Podpis rytu pod kursorem: co to jest, jakim klawiszem i za co. Bez tego pięć
   * znaków na marginesie było zagadką do rozwiązania metodą prób i błędów.
   */
  private podpisRytu(ctx: CanvasRenderingContext2D, sim: Sim, i: number, v: Verb, ready: boolean): void {
    const { x, y } = this.pozycjaRytu(i);
    const nazwa = VERBS.find((z) => z.id === v)!.label;
    const klawisz = nazwaKlawisza(klawisze[v]);
    const c = cost(v, TOOLS[v][0].id);
    const czesci: string[] = [];
    if (c.wiara) czesci.push(`${c.wiara} wiary`);
    if (c.krew) czesci.push(`${c.krew} krwi`);
    const linie = [STEROWANIE.pokazKlawisze ? `${nazwa}  ·  ${klawisz}` : nazwa, czesci.length ? `od ${czesci.join(', ')}` : 'nic nie kosztuje'];
    const oTablicy = STEROWANIE.pokazKlawisze ? 'prawy przycisk — tablica' : 'przytrzymaj — tablica';
    const skutek = SKUTKI[v];

    const size = Math.max(14, Math.min(18, this.vw / 72));
    ctx.save();
    ctx.font = `${size}px ${SERIF}`;
    const szer = Math.max(...linie.map((l) => ctx.measureText(l).width), ctx.measureText(skutek).width * 0.9,
      ctx.measureText(oTablicy).width * 0.8) + size * 1.4;
    const wys = size * 5.1;
    const px = Math.min(x + this.gs * 0.9, this.plate.x - 6);
    const py = Math.max(this.plate.y + 10, y - wys / 2);
    ramaKarty(ctx, px, py, szer, wys, 1, '', ready);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(244,230,202,0.97)';
    ctx.fillText(linie[0], px + size * 0.7, py + size * 1.15);
    ctx.font = `italic ${size * 0.86}px ${SERIF}`;
    ctx.fillStyle = ready ? 'rgba(206,192,166,0.85)' : 'rgba(216,140,120,0.9)';
    ctx.fillText(ready ? linie[1] : `${linie[1]} — nie stać cię`, px + size * 0.7, py + size * 2.3);
    // co to robi — jednym zdaniem, bo sama nazwa rytu nic nie mówi
    ctx.fillStyle = 'rgba(232,210,160,0.95)';
    ctx.fillText(skutek, px + size * 0.7, py + size * 3.45);
    ctx.font = `italic ${size * 0.72}px ${SERIF}`;
    ctx.fillStyle = 'rgba(170,156,132,0.8)';
    ctx.fillText(oTablicy, px + size * 0.7, py + size * 4.5);
    ctx.restore();
  }

  /**
   * TELEFON: narzędzia jako duże pola nad płytą, na całą szerokość — wyryte słowa
   * w 14 px trafiało się palcem przez przypadek. Co robi wybrane, mówi linijka na dole płyty.
   */
  private drawToolsTelefon(ctx: CanvasRenderingContext2D, sim: Sim): void {
    const tools = TOOLS[this.verb!];
    const p = this.plate;
    const niski = p.niski;
    const h = niski ? 26 : 36, y0 = niski ? 2 : 10;
    // poziomo klepsydra (z napisem „czas sączy się”) stoi w górnym marginesie po prawej — pola kończą się przed nią
    const x0 = p.x, szer = p.w - (niski ? 170 : 0);
    const odstep = 8;
    const pw = (szer - odstep * (tools.length - 1)) / tools.length;
    const size = niski ? 15 : 17;
    ctx.save();
    ctx.font = `${size}px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // jedno narzędzie nie potrzebuje paska — ryt od razu je trzyma, a opis stoi na dole płyty
    for (let k = 0; tools.length > 1 && k < tools.length; k++) {
      const ok = affordable(sim, this.verb!, tools[k].id);
      const on = this.tool === tools[k].id;
      const x = x0 + k * (pw + odstep);
      ctx.fillStyle = on ? 'rgba(58,40,24,0.95)' : 'rgba(12,9,8,0.9)';
      ctx.fillRect(x, y0, pw, h);
      ctx.lineWidth = on ? 1.6 : 1;
      ctx.strokeStyle = on ? 'rgba(240,216,168,0.95)' : ok ? 'rgba(206,192,166,0.55)' : 'rgba(146,134,118,0.3)';
      ctx.strokeRect(x + 0.5, y0 + 0.5, pw - 1, h - 1);
      ctx.fillStyle = on ? 'rgba(248,234,204,0.99)' : ok ? 'rgba(216,204,180,0.92)' : 'rgba(146,134,118,0.5)';
      ctx.fillText(tools[k].label, x + pw / 2, y0 + h / 2 + 1, pw - 8);
      this.hits.push({ x: x + pw / 2, y: y0 + h / 2, hw: pw / 2 + odstep / 2, hh: h / 2 + 4, kind: 'tool', verb: this.verb!, tool: tools[k].id });
    }
    // w pauzie dół płyty należy do banera „czas stoi”
    if (this.plan) { ctx.restore(); return; }
    const t = tools.find((z) => z.id === this.tool);
    ctx.font = `italic 14px ${SERIF}`;
    ctx.textBaseline = 'alphabetic';
    const opis = t ? `${t.hint} — świat zwalnia, póki trzymasz ryt` : 'świat zwalnia, póki trzymasz ryt';
    const yo = p.y + p.h - 12;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(10,7,6,0.85)';
    ctx.strokeText(opis, p.x + p.w / 2, yo, p.w - 16);
    ctx.fillStyle = 'rgba(226,212,184,0.9)';
    ctx.fillText(opis, p.x + p.w / 2, yo, p.w - 16);
    ctx.restore();
  }

  /** Narzędzia jako wyryte słowa w górnym marginesie — żadnych szarych pigułek. */
  private drawTools(ctx: CanvasRenderingContext2D, sim: Sim): void {
    if (this.plate.waski || this.plate.niski) { this.drawToolsTelefon(ctx, sim); return; }
    const tools = TOOLS[this.verb!];
    const size = Math.max(14, Math.min(20, this.vw / 62));
    ctx.font = `${size}px ${SERIF}`;
    const widths = tools.map((t) => ctx.measureText(t.label).width);
    const gap = size * 1.9;
    const total = widths.reduce((a, b) => a + b, 0) + gap * (tools.length - 1);
    let x = this.plate.x + (this.plate.w - total) / 2;
    const y = this.plate.y - this.plate.top * 0.42;

    for (let k = 0; k < tools.length; k++) {
      const ok = affordable(sim, this.verb!, tools[k].id);
      const on = this.tool === tools[k].id;
      const cx = x + widths[k] / 2;
      ctx.textAlign = 'center';
      ctx.fillStyle = on ? 'rgba(248,234,204,0.99)' : ok ? 'rgba(216,204,180,0.92)' : 'rgba(146,134,118,0.5)';
      ctx.fillText(tools[k].label, cx, y);
      if (on) {                                  // nacięcie pod wybranym słowem
        ctx.strokeStyle = 'rgba(240,216,168,0.8)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx - widths[k] / 2 - 3, y + size * 0.34);
        ctx.lineTo(cx + widths[k] / 2 + 3, y + size * 0.34);
        ctx.stroke();
      }
      this.hits.push({ x: cx, y: y - size * 0.35, hw: widths[k] / 2 + gap * 0.35, hh: size, kind: 'tool', verb: this.verb!, tool: tools[k].id });
      x += widths[k] + gap;
    }

    const t = tools.find((z) => z.id === this.tool);
    ctx.textAlign = 'center';
    ctx.font = `italic ${size * 0.82}px ${SERIF}`;
    ctx.fillStyle = 'rgba(206,194,172,0.8)';
    ctx.fillText(t ? `${t.hint} — świat zwalnia, póki trzymasz znak` : 'świat zwalnia, póki trzymasz znak',
      this.plate.x + this.plate.w / 2, this.plate.y - this.plate.top * 0.1);
  }

  /** Symbol wyryty w kamieniu: najpierw rowek cienia, potem światło na krawędzi. */
  private rune(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, id: Verb, on: boolean, ready: boolean, time: number): void {
    // wycinek fresku w krążku rysuje już oprawa
    if (maIkone(`ryt-${id}`)) return;
    // własna grafika (src/grafiki/pliki): ryt-<id>, np. ryt-zasiej.png
    if (rysujGrafike(ctx, `ryt-${id}`, x, y, s * 1.2, { alfa: on || ready ? 1 : 0.55, czas: time })) return;
    const glow = ready ? 0.6 + 0.22 * Math.sin(time * 0.0015 + x) : 0.16;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const path = () => {
      ctx.beginPath();
      const u = s * 0.34;
      switch (id) {
        case 'zasiej':
          ctx.moveTo(0, -u * 1.2); ctx.lineTo(0, u * 0.4);
          ctx.moveTo(0, u * 0.4); ctx.lineTo(-u, u * 1.3);
          ctx.moveTo(0, u * 0.4); ctx.lineTo(u, u * 1.3);
          ctx.moveTo(-u * 0.7, -u * 0.6); ctx.lineTo(0, -u * 0.1);
          break;
        case 'szept':
          for (let a = 0; a < 5; a += 0.15) {
            const r = u * 0.28 * a;
            const px = Math.cos(a * 2) * r, py = Math.sin(a * 2) * r;
            if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          break;
        case 'znak':
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            ctx.moveTo(Math.cos(a) * u * 0.45, Math.sin(a) * u * 0.45);
            ctx.lineTo(Math.cos(a) * u * 1.25, Math.sin(a) * u * 1.25);
          }
          break;
      }
    };
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = s * 0.16;
    ctx.translate(0.9, 1.3); path(); ctx.stroke();
    ctx.translate(-0.9, -1.3);
    ctx.strokeStyle = on ? `rgba(248,228,186,${0.9 + glow * 0.1})` : `rgba(214,198,168,${glow})`;
    ctx.lineWidth = s * 0.1;
    path(); ctx.stroke();
    ctx.restore();
  }

  /**
   * Oprawa rytu: podwójny pierścień wyryty w marginesie, nazwa pod spodem i klawisz
   * w rogu. Wybrany ryt ma złoty pierścień i ciemniejsze dno; ryt, na który cię nie stać,
   * jest ledwie zarysowany.
   */
  private oprawaRytu(ctx: CanvasRenderingContext2D, x: number, y: number, v: { id: Verb; label: string }, on: boolean, ready: boolean, time: number): void {
    const s = this.gs;
    const r = s * 0.7;
    ctx.save();
    if (on) {
      const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 1.5);
      g.addColorStop(0, 'rgba(240,190,110,0.18)');
      g.addColorStop(1, 'rgba(240,190,110,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3);
    }
    // pod kursorem ryt rozjaśnia się płynnie (render/nastroj.ts)
    const pod = !on && ready && Math.hypot(this.pointer.x - x, this.pointer.y - y) <= r + 4;
    if (krazekZIkona(ctx, `ryt-${v.id}`, x, y, r, on ? 'wlaczony' : pod ? 'pod' : ready ? 'zwykly' : 'uspiony')) {
      if (on) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = `rgba(240,200,130,${0.7 + 0.3 * Math.sin(time * 0.004)})`;
        ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2); ctx.stroke();
      }
    } else {
      ctx.fillStyle = on ? 'rgba(30,20,14,0.95)' : 'rgba(16,12,10,0.8)';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = on ? 1.5 : 1;
      ctx.strokeStyle = on ? `rgba(240,200,130,${0.85 + 0.15 * Math.sin(time * 0.004)})` : `rgba(207,194,166,${ready ? 0.42 : 0.14})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(207,194,166,${on ? 0.35 : ready ? 0.16 : 0.06})`;
      ctx.beginPath(); ctx.arc(x, y, r + 3.5, 0, Math.PI * 2); ctx.stroke();
    }
    // nazwa pod rytem — tylko gdy jest na nią miejsce między rytami
    const rozm = Math.max(10, Math.min(13, s * 0.36));
    // podpis mieści się, gdy między pierścieniami zostaje miejsce na jedną linijkę
    const zPodpisem = !this.dwieKolumny && this.gap >= (r + 3.5) * 2 + rozm + 6;
    if (zPodpisem) {
      ctx.font = `italic ${rozm}px ${SERIF}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = on || pod ? 'rgba(244,214,160,0.95)' : ready ? FRESK.tekstCichy : 'rgba(207,194,166,0.3)';
      ctx.fillText(v.label.toLowerCase(), x, y + r + 6, this.plate.left - 6);
    }
    // klawisz w rogu — na dotyku klawiatury nie ma, więc tylko na szerokim ekranie
    if (STEROWANIE.pokazKlawisze && !this.plate.waski) {
      const rozm = Math.max(9, s * 0.26);
      ctx.font = `${rozm}px ${SERIF}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const kx = x + r * 0.78, ky = y - r * 0.78;
      ctx.fillStyle = 'rgba(11,8,7,1)';
      ctx.beginPath(); ctx.arc(kx, ky, rozm * 0.75, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(207,194,166,${ready ? 0.35 : 0.12})`;
      ctx.stroke();
      ctx.fillStyle = `rgba(207,194,166,${ready ? 0.75 : 0.3})`;
      ctx.fillText(nazwaKlawisza(klawisze[v.id]), kx, ky + 0.5);
    }
    ctx.restore();
  }

  /**
   * Karta mieszkańca. Jedyny moment, gdy widzisz kogoś jako kogoś: jego sylwetka w niszy
   * jak na tablicy atlasu, imię, ród i to, czym akurat żyje — a pod spodem myśli do szeptu.
   */
  private drawCard(ctx: CanvasRenderingContext2D, sim: Sim, c: Creature, time: number): void {
    const p = this.plate;
    // Remake v1: każdy stan (wzmocnienie, osłabienie) dokłada karcie wiersz — opis nie wchodzi na szept
    const dodatek = stanyPostaci(sim, c).length * Math.max(12, Math.min(15, Math.min(360, p.w * (p.waski ? 0.94 : 0.46)) * 0.043)) * 2.3;
    const cw = Math.min(360, p.w * (p.waski ? 0.94 : 0.46)), ch = Math.min(290 + dodatek, p.h * 0.9);
    const x = p.waski ? p.x + (p.w - cw) / 2 : p.x + p.w - cw - 12;
    // wąsko karta schodzi pod wstęgę drogi do wolności, szeroko wstęga jest w lewym rogu
    const y = Math.max(p.y + (p.waski ? 122 : 14), Math.min(p.y + p.h - ch - 8, p.y + p.h / 2 - ch / 2));
    const clan = sim.clans[c.clan];
    ctx.save();
    ramaKarty(ctx, x, y, cw, ch, 1, 'mieszkaniec góry');

    // nisza na złotym tle, jak na ikonie: łuk z perełkami, obrzeże czerwieni ziemi, podłoga
    const nw = cw * 0.3, nh = Math.min(ch, 290) * 0.5;
    const nx = x + 16, ny = y + 18;
    const nisza = zlotaNisza(ctx, nx, ny, nw, nh, time);
    ctx.save();
    ctx.clip(nisza);
    // cień postaci na złocie i ciemniejsza podłoga niszy
    const podloga = ctx.createLinearGradient(0, ny + nh * 0.8, 0, ny + nh);
    podloga.addColorStop(0, 'rgba(60,30,10,0)');
    podloga.addColorStop(1, 'rgba(60,30,10,0.45)');
    ctx.fillStyle = podloga;
    ctx.fillRect(nx, ny, nw, nh);
    ctx.translate(nx + nw / 2, ny + nh - 6);
    rysujPostac(ctx, sim, c, nh * 0.62, time);
    ctx.restore();
    brzegNiszy(ctx, nisza, nx, ny, nw);
    ctx.strokeStyle = FRESK.czerwien;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nx - 4, ny + nh + 1); ctx.lineTo(nx + nw + 4, ny + nh + 1); ctx.stroke();

    // imię, ród, życie
    const tx = nx + nw + 16, tw = x + cw - 16 - tx;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    let rozmImienia = Math.max(16, Math.min(24, cw * 0.075));
    ctx.font = `${rozmImienia}px ${SERIF}`;
    const imie = c.boss ? aktywnyBoss().nazwa : c.straznik ? 'Strażnik Snu' : creatureName(c);
    if (ctx.measureText(imie).width > tw) { rozmImienia *= tw / ctx.measureText(imie).width; ctx.font = `${rozmImienia}px ${SERIF}`; }
    ctx.fillStyle = 'rgba(242,228,202,0.97)';
    ctx.fillText(imie, tx, ny + rozmImienia * 0.9);
    const rozm = Math.max(12, Math.min(15, cw * 0.043));
    ctx.font = `${rozm * 0.82}px ${SERIF}`;
    ctx.fillStyle = 'rgba(224,168,96,0.85)';
    const cecha = cechaNacji(clan).nazwa;
    const rola = rolaPostaci(c);
    ctx.fillText(`${rola ? NAZWA_ROLI[rola].toUpperCase() : c.straznik ? (c.boss ? 'BOSS' : 'STRAŻNIK') : c.buntownik ? 'ZBUNTOWANY RYCERZ' : RACES[c.race].name.toUpperCase()} · ${clan.name}${cecha ? ` · ${cecha}` : ''}`, tx, ny + rozmImienia * 0.9 + rozm * 1.5, tw);
    ctx.font = `italic ${rozm}px ${SERIF}`;
    ctx.fillStyle = 'rgba(208,194,170,0.86)';
    wrap(ctx, lifeLine(c, sim), tx, ny + rozmImienia * 0.9 + rozm * 3.1, tw, rozm * 1.3);

    // stany w prawej kolumnie, na wysokości podłogi niszy
    const sStan = Math.max(11, Math.min(14, cw * 0.036));
    // odstęp tak, żeby podpisy (głód, wiara, obłęd) się nie zlewały
    rysujStany(ctx, c, tx + sStan, ny + nh - sStan * 1.6, sStan, Math.max(sStan * 2.1, 34));

    // myśli do szeptu: przerywnik, podpis i cztery słowa w klamrach
    // Remake v1: wzmocnienia i osłabienia — co to jest i kiedy minie (pod niszą, nad szeptem);
    // gdy są, część z szeptem schodzi niżej, żeby opis stanu na nią nie wchodził
    const stany = stanyPostaci(sim, c);
    const koniecStanow = ny + nh + rozm * 1.35 + stany.length * rozm * 2.3;
    const yM = Math.max(y + Math.min(ch, 290) * 0.76, koniecStanow + rozm * 1.6);
    if (stany.length) {
      let ys = ny + nh + rozm * 1.35;
      ctx.textAlign = 'left';
      for (const st of stany) {
        if (ys > yM - rozm * 1.9) break;
        const zostalo = st.do !== undefined ? Math.max(0, Math.ceil((st.do - sim.tick) / 120)) : null;
        const kiedy = st.kiedy ?? (zostalo === null ? 'na zawsze' : zostalo >= 60 ? `mija za ${Math.floor(zostalo / 60)} min ${zostalo % 60} s` : `mija za ${zostalo} s`);
        ctx.font = `${rozm * 0.95}px ${SERIF}`;
        ctx.fillStyle = st.uspiony ? 'rgba(190,180,160,0.85)' : st.dobry ? 'rgba(250,226,150,0.98)' : 'rgba(236,112,96,0.98)';
        const znak = '• ';
        ctx.fillText(`${znak}${st.nazwa} — ${kiedy}`, x + 18, ys, cw - 36);
        ctx.font = `italic ${rozm * 0.82}px ${SERIF}`;
        ctx.fillStyle = 'rgba(208,194,170,0.8)';
        ctx.fillText(st.skutek, x + 18 + rozm * 1.1, ys + rozm * 1.05, cw - 36 - rozm * 1.1);
        ys += rozm * 2.3;
      }
    }
    ctx.strokeStyle = 'rgba(207,194,166,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 18, yM - rozm * 1.4); ctx.lineTo(x + cw - 18, yM - rozm * 1.4); ctx.stroke();
    ctx.font = `${rozm * 0.72}px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(224,168,96,0.8)';
    const napisSzeptu = 'S Z E P N I J   M U';
    const sw = ctx.measureText(napisSzeptu).width;
    // podkład pod napisem w kolorze tablicy — kreska przerywnika urywa się przy słowach
    ctx.fillStyle = FRESK.tablicaCiemna;
    ctx.fillRect(x + cw / 2 - sw / 2 - 8, yM - rozm * 1.4 - rozm * 0.5, sw + 16, rozm);
    ctx.fillStyle = 'rgba(224,168,96,0.8)';
    ctx.fillText(napisSzeptu, x + cw / 2, yM - rozm * 1.15);
    // okaleczyć może się tylko pobożny, i tylko raz — innym tej myśli nie pokazujemy
    const tools = c.straznik || c.buntownik ? [] : TOOLS.szept.filter((t) => (t.id !== 'okalecz' || (rolaPostaci(c) === 'pobozny' && !c.okaleczony)) && (t.id !== 'przerwij' || modliSie(c)) && (t.id !== 'przemysl' || moznaPrzemyslec(sim, c)) && (t.id !== 'kopLosowo' || moznaKopacLosowo(c)));
    const size = Math.max(13, Math.min(17, cw * 0.05));
    ctx.font = `${size}px ${SERIF}`;
    for (let k = 0; k < tools.length; k++) {
      const bx = x + cw * (k % 2 === 0 ? 0.28 : 0.72);
      // telefon: rzędy dalej od siebie, żeby palec trafiał w jedną myśl, nie w dwie
      const telefon = this.plate.waski || this.plate.niski;
      const by = yM + Math.floor(k / 2) * size * (telefon ? 2.4 : 1.9);
      const ok = affordable(sim, 'szept', tools[k].id);
      ctx.textAlign = 'center';
      ctx.fillStyle = ok ? 'rgba(240,226,198,0.96)' : 'rgba(146,134,118,0.5)';
      ctx.fillText(tools[k].label, bx, by);
      const hw = ctx.measureText(tools[k].label).width / 2 + size * 0.6;
      ctx.strokeStyle = ok ? 'rgba(224,168,96,0.55)' : 'rgba(120,110,96,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx - hw + 4, by - size * 0.85); ctx.lineTo(bx - hw, by - size * 0.85); ctx.lineTo(bx - hw, by + size * 0.3); ctx.lineTo(bx - hw + 4, by + size * 0.3);
      ctx.moveTo(bx + hw - 4, by - size * 0.85); ctx.lineTo(bx + hw, by - size * 0.85); ctx.lineTo(bx + hw, by + size * 0.3); ctx.lineTo(bx + hw - 4, by + size * 0.3);
      ctx.stroke();
      // na telefonie trafia się w całą połowę karty, nie w samo słowo
      this.hits.push({ x: bx, y: by - size * 0.3, hw: telefon ? Math.max(hw, cw * 0.21) : hw, hh: telefon ? size * 1.15 : size * 0.9, kind: 'thought', tool: tools[k].id });
    }
    ctx.restore();
  }

  /** Zwraca true, gdy dotyk trafił w interfejs i nie powinien ruszać świata. */
  tap(sim: Sim, sx: number, sy: number): boolean {
    for (const h of this.hits) {
      if (Math.abs(h.x - sx) > h.hw || Math.abs(h.y - sy) > h.hh) continue;
      this.flash = '';                                  // stary komunikat nie może wisieć po zmianie
      if (h.kind === 'verb') {
        this.verb = this.verb === h.verb ? null : h.verb!;
        if (this.verb) this.opisRytuOd = performance.now();
        this.tool = this.verb ? TOOLS[this.verb][0].id : null;
        this.selected = null;
      } else if (h.kind === 'tool') {
        this.tool = h.tool!;
      } else if (h.kind === 'thought' && this.selected && this.plan) {
        const kto = this.selected;
        const powod = this.plan.zaplanuj(sim, { czasownik: 'szept', narzedzie: h.tool!, x: kto.x, y: kto.y, kto: kto.id });
        if (powod === null) { this.say('Myśl czeka. Usłyszy ją, gdy puścisz czas.', sim.tick); this.selected = null; }
        else if (powod) this.say(powod, sim.tick);
      } else if (h.kind === 'thought' && this.selected) {
        if (whisper(sim, h.tool!, this.selected)) {
          this.ostatniaMysl = h.tool!;
          const t = TOOLS.szept.find((z) => z.id === h.tool)!;
          sim.log(`Szepnąłeś ${creatureNameCelownik(this.selected)}: „${t.label}". Usłyszał.`, 'wiara',
            'szept', (n) => `Szepnąłeś ${n === 2 ? 'dwóm' : n === 3 ? 'trzem' : n}. Usłyszeli.`);
          this.selected = null;
        } else this.say('Za mało wiary.', sim.tick);
      }
      return true;
    }
    return false;
  }

  touchCreature(sim: Sim, c: Creature): boolean {
    if (this.verb === 'szept') { this.selected = c; return true; }
    return false;
  }

  hintCost(sim: Sim): string {
    if (!this.verb || !this.tool) return '';
    const c = cost(this.verb, this.tool);
    const parts: string[] = [];
    if (c.krew > sim.krew) parts.push('krwi');
    if (c.wiara > sim.wiara) parts.push('wiary');
    return parts.length ? `Brakuje ${parts.join(' i ')}.` : '';
  }
}

function lifeLine(c: Creature, sim: Sim): string {
  const clan = sim.clans[c.clan];
  // Remake v1: zamiar — co teraz robi i jak długo jeszcze się tego trzyma
  if (rolaPostaci(c) && c.zamiar) {
    const zostalo = Math.max(0, Math.ceil(((c.zamiarDo ?? 0) - sim.tick) / 120));
    return `Teraz: ${c.zamiar}${zostalo > 0 && c.job !== Job.PIELGRZYM ? ` (jeszcze ${zostalo} s)` : ''}.`;
  }
  if (c.prophet) return 'Prorok. Słyszał cię raz i nie przestał powtarzać.';
  if (c.mad > 0.5) return 'Kopał za głęboko. Wrócił inny.';
  if (c.job === Job.DIG || c.job === Job.DESCEND) return 'Drąży. Nie wie, że drąży w kimś.';
  if (c.job === Job.PRAY) return 'Modli się do ściany, która słucha.';
  if (c.job === Job.FIGHT) return 'Właśnie próbuje kogoś zabić.';
  if (c.job === Job.PIELGRZYM) return 'Idzie pod twój rdzeń. Sam nie wie po co.';
  if (c.job === Job.EAT || c.hunger > 0.6) return 'Głodny. To u nich stan domyślny.';
  if (c.carry > 0) return 'Niesie rudę do gniazda.';
  return clan.devotion > 0.6 ? 'Wierzy w ciebie bez powodu.' : 'Żyje, bo jeszcze nie umarł.';
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number): void {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const wd of words) {
    const test = line ? line + ' ' + wd : wd;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = wd; yy += lh; }
    else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}
