import { Sim } from '../sim/sim';
import { Race, RACES } from '../sim/races';
import { Creature, Job } from '../sim/creatures';
import { Verb, TOOLS, affordable, cost, whisper, taint } from '../powers/powers';
import { SERIF, creatureName, creatureNameCelownik } from '../render/overlay';
import { Plate } from '../render/plate';
import { rysujStany } from '../render/stany';
import { klawisze, nazwaKlawisza } from '../core/keybinds';
import type { Rozkazy } from '../powers/rozkazy';

interface Hit { x: number; y: number; hw: number; hh: number; kind: 'verb' | 'tool' | 'thought'; verb?: Verb; tool?: string; }

/** Co ryt robi — jedno zdanie w podpisie pod kursorem. */
const SKUTKI: Record<Verb, string> = {
  ksztaltuj: 'drąż, zawal, wpuść wodę albo żar',
  zasiej: 'grzyb, ruda, kości albo trucizna',
  szept: 'jedna myśl w jedną głowę',
  znak: 'jawny cud: oddanie albo panika',
  skaz: 'zmiana krwi całego gatunku',
};

const VERBS: { id: Verb; label: string }[] = [
  { id: 'ksztaltuj', label: 'Kształtuj' },
  { id: 'zasiej', label: 'Zasiej' },
  { id: 'szept', label: 'Szepcz' },
  { id: 'znak', label: 'Znak' },
  { id: 'skaz', label: 'Skaź' },
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
  /** W pauzie myśli i skazy nie dzieją się od razu — idą do planu i czekają na czas. */
  plan: Rozkazy | null = null;

  private dwieKolumny = false;

  layout(plate: Plate, vw: number): void {
    this.plate = plate; this.vw = vw;
    this.gs = Math.max(20, Math.min(38, plate.left * 0.5));
    // niskie okno: pięć rytów w jednej kolumnie się nie mieści, więc łamiemy je na dwie
    this.dwieKolumny = plate.h < this.gs * 9;
    const rzedy = this.dwieKolumny ? 3 : 5;
    this.gap = Math.min(plate.h / (rzedy + 0.6), this.gs * 2.1);
    this.gx = this.dwieKolumny ? plate.left * 0.32 : plate.left / 2;
    this.gy = plate.y + plate.h / 2 - this.gap * (rzedy - 1) / 2;
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
      this.rune(ctx, x, y, this.gs, v.id, this.verb === v.id, ready, time);
      this.hits.push({ x, y, hw: this.gs * 0.8, hh: this.gap * 0.45, kind: 'verb', verb: v.id });
      if (Math.abs(this.pointer.x - x) <= this.gs * 0.9 && Math.abs(this.pointer.y - y) <= this.gap * 0.45) {
        opisRytu = { i, v: v.id, ready };
      }
    }
    if (opisRytu) this.podpisRytu(ctx, sim, opisRytu.i, opisRytu.v, opisRytu.ready);

    if (this.verb && !(this.selected && !this.selected.dead)) this.drawTools(ctx, sim);
    if (this.selected && !this.selected.dead) this.drawCard(ctx, sim, this.selected);

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
      const y = Math.max(this.plate.y + (this.plate.waski ? 84 : 52), this.pointer.y - size * 1.4);
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
    if (c.otchlan) czesci.push(`${c.otchlan} otchłani`);
    const linie = [`${nazwa}  ·  ${klawisz}`, czesci.length ? `od ${czesci.join(', ')}` : 'nic nie kosztuje'];
    const skutek = SKUTKI[v];

    const size = Math.max(14, Math.min(18, this.vw / 72));
    ctx.save();
    ctx.font = `${size}px ${SERIF}`;
    const szer = Math.max(...linie.map((l) => ctx.measureText(l).width), ctx.measureText(skutek).width * 0.9,
      ctx.measureText('prawy przycisk — tablica').width * 0.8) + size * 1.4;
    const wys = size * 5.1;
    const px = Math.min(x + this.gs * 0.9, this.plate.x - 6);
    const py = Math.max(this.plate.y + 4, y - wys / 2);
    ctx.fillStyle = 'rgba(12,9,8,0.92)';
    ctx.fillRect(px, py, szer, wys);
    ctx.strokeStyle = 'rgba(206,190,158,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 2.5, py + 2.5, szer - 5, wys - 5);
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
    ctx.fillText('prawy przycisk — tablica', px + size * 0.7, py + size * 4.5);
    ctx.restore();
  }

  /** Narzędzia jako wyryte słowa w górnym marginesie — żadnych szarych pigułek. */
  private drawTools(ctx: CanvasRenderingContext2D, sim: Sim): void {
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
    const glow = ready ? 0.6 + 0.22 * Math.sin(time * 0.0015 + x) : 0.16;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const path = () => {
      ctx.beginPath();
      const u = s * 0.34;
      switch (id) {
        case 'ksztaltuj':
          ctx.moveTo(-u, -u); ctx.lineTo(0, u); ctx.lineTo(u, -u);
          ctx.moveTo(0, u); ctx.lineTo(0, u * 1.5);
          break;
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
        case 'skaz':
          ctx.moveTo(-u * 0.8, -u * 1.1);
          ctx.bezierCurveTo(u, -u * 0.5, -u, u * 0.5, u * 0.8, u * 1.1);
          ctx.moveTo(u * 0.8, -u * 1.1);
          ctx.bezierCurveTo(-u, -u * 0.5, u, u * 0.5, -u * 0.8, u * 1.1);
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
    if (on) {
      ctx.strokeStyle = 'rgba(240,214,160,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.68, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  /** Karta z bestiariusza. Jedyny moment, gdy widzisz kogoś jako kogoś. */
  private drawCard(ctx: CanvasRenderingContext2D, sim: Sim, c: Creature): void {
    const p = this.plate;
    const cw = Math.min(348, p.w * 0.46), ch = Math.min(272, p.h * 0.66);
    const x = Math.max(p.x + 8, Math.min(p.x + p.w - cw - 10, p.x + p.w - cw - 10));
    const y = Math.max(p.y + 8, Math.min(p.y + p.h - ch - 8, p.y + p.h / 2 - ch / 2));
    ctx.save();
    ctx.fillStyle = 'rgba(14,10,9,0.94)';
    ctx.fillRect(x, y, cw, ch);
    ctx.strokeStyle = 'rgba(200,182,150,0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 4.5, y + 4.5, cw - 9, ch - 9);

    const px = x + cw * 0.23, py = y + ch * 0.32, r = Math.min(cw, ch) * 0.15;
    ctx.strokeStyle = 'rgba(228,214,188,0.9)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(px, py, r * 0.78, r, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 16; i++) {
      const t = i / 16;
      ctx.beginPath();
      ctx.moveTo(px - r * 0.8 + t * r * 0.5, py - r + t * r * 1.7);
      ctx.lineTo(px + r * 0.8 - t * r * 0.3, py - r * 0.6 + t * r * 1.5);
      ctx.strokeStyle = `rgba(228,214,188,${0.08 + 0.18 * Math.abs(Math.sin(i * 1.7 + c.id))})`;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(px, py + r); ctx.lineTo(px, py + r * 1.9);
    ctx.strokeStyle = 'rgba(228,214,188,0.75)';
    ctx.stroke();

    const clan = sim.clans[c.clan];
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(242,228,202,0.96)';
    ctx.font = `${Math.max(16, cw * 0.082)}px ${SERIF}`;
    ctx.fillText(creatureName(c), x + cw * 0.42, y + ch * 0.22);
    ctx.fillStyle = 'rgba(208,194,170,0.82)';
    ctx.font = `italic ${Math.max(14, cw * 0.056)}px ${SERIF}`;
    wrap(ctx, `${RACES[c.race].name}, ${clan.name}. ${lifeLine(c, sim)}`, x + cw * 0.42, y + ch * 0.32, cw * 0.52, cw * 0.075);

    rysujStany(ctx, c, x + cw * 0.26, y + ch * 0.56, Math.max(13, cw * 0.062));

    const tools = TOOLS.szept;
    const size = Math.max(14, cw * 0.062);
    ctx.font = `${size}px ${SERIF}`;
    for (let k = 0; k < tools.length; k++) {
      const bx = x + cw * (k % 2 === 0 ? 0.28 : 0.72);
      const by = y + ch * 0.8 + Math.floor(k / 2) * size * 2.1;
      const ok = affordable(sim, 'szept', tools[k].id);
      ctx.textAlign = 'center';
      ctx.fillStyle = ok ? 'rgba(240,226,198,0.96)' : 'rgba(146,134,118,0.5)';
      ctx.fillText(tools[k].label, bx, by);
      ctx.strokeStyle = ok ? 'rgba(200,180,140,0.45)' : 'rgba(120,110,96,0.2)';
      ctx.lineWidth = 1;
      const hw = ctx.measureText(tools[k].label).width / 2 + size * 0.4;
      ctx.beginPath();
      ctx.moveTo(bx - hw, by + size * 0.35); ctx.lineTo(bx + hw, by + size * 0.35);
      ctx.stroke();
      this.hits.push({ x: bx, y: by - size * 0.3, hw, hh: size, kind: 'thought', tool: tools[k].id });
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
    if (this.verb === 'skaz' && this.tool) {
      if (c.race === Race.HUMAN || c.race === Race.MYCELIUM) { this.say('Tej krwi nie sięgniesz.', sim.tick); return true; }
      if (this.plan) {
        const powod = this.plan.zaplanuj(sim, { czasownik: 'skaz', narzedzie: this.tool, x: c.x, y: c.y, kto: c.id, rasa: c.race });
        if (powod === null) this.say(`Skaza ${RACES[c.race].nazwaDopelniacz} czeka na czas.`, sim.tick);
        else if (powod) this.say(powod, sim.tick);
        return powod === null;
      }
      if (taint(sim, this.tool, c.race)) this.say(`Krew ${RACES[c.race].nazwaDopelniacz} zmieniona na zawsze.`, sim.tick);
      else this.say('Nie stać cię albo już to zrobiłeś.', sim.tick);
      return true;
    }
    return false;
  }

  hintCost(sim: Sim): string {
    if (!this.verb || !this.tool) return '';
    const c = cost(this.verb, this.tool);
    const parts: string[] = [];
    if (c.krew > sim.krew) parts.push('krwi');
    if (c.wiara > sim.wiara) parts.push('wiary');
    if (c.otchlan > sim.otchlan) parts.push('otchłani');
    return parts.length ? `Brakuje ${parts.join(' i ')}.` : '';
  }
}

function lifeLine(c: Creature, sim: Sim): string {
  const clan = sim.clans[c.clan];
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
