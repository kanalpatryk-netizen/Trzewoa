/**
 * EKRAN STARTU (Alpha 0.3) — między „Nowa gra” a pierwszym tikiem partii.
 *  - wizja Patryka: „Twoja drużyna” — sześć stałych postaci: portret, imię, rola, perk, wada i kim była;
 *    „Zejdź w głąb” zaczyna partię;
 *  - wizja Pawła: „Ślub drużyny” — trzy śluby obok siebie (nazwa, rycinka, bonus dla każdej roli); pod nimi
 *    imiona drużyny tej partii; „Złóż ślub i zejdź” zaczyna partię z wybranym ślubem.
 * Drużynę pokazuje z góry przygotowanej na tę partię (EkranGry.przygotowana) — te same osoby i twarze, co w grze.
 */
import type { Ekran } from '../screen';
import type { Kontekst } from '../context';
import type { Akcja } from '../../core/keybinds';
import type { EkranGry } from './game';
import type { Sim } from '../../sim/sim';
import { tloSadzy, SERIF, SERIF_TYTUL } from '../../render/ink';
import { ramaRyciny } from '../../render/ozdoby';
import { RAMA } from '../../nastawy/wyglad/ozdoby';
import { WARIANT, NAZWA_WARIANTU, maTarot } from '../../nastawy/wariant';
import { SLUBY, type Slub } from '../../nastawy/tarot';
import { perk } from '../../nastawy/perki';
import type { Rola } from '../../sim/lud';
import { imieOsoby, rolaOsoby, type Osoba } from '../../sim/druzyna';
import { rysujPostac } from '../../render/figury';
import { tablica, tabliczka, lam, skroc, dopasuj } from '../../render/pas';
import { znakPerku } from '../../render/karty';
import { Job, type Creature } from '../../sim/creatures';

interface Pole { co: 'karta' | 'dalej' | 'wroc'; i?: number; x: number; y: number; w: number; h: number }

const ROLE: Rola[] = ['robotnik', 'pobozny', 'rycerz'];
/** Rycerz jest jeden — w liście bonusów liczba pojedyncza. */
const KTO: Record<Rola, string> = { robotnik: 'robotnicy', pobozny: 'pobożni', rycerz: 'rycerz' };

export class EkranStartu implements Ekran {
  nazwa = 'start';
  private pola: Pole[] = [];
  private wybrany = -1;
  private kursor = { x: -1, y: -1 };
  private sim: Sim | null = null;
  private zastepcy = new Map<number, Creature>();

  constructor(private app: Kontekst) {}

  wejdz(): void {
    this.wybrany = maTarot(WARIANT) ? -1 : 0;
    const gra = this.app.ekran('gra') as EkranGry | undefined;
    this.sim = gra?.przygotowana() ?? null;
    this.zastepcy.clear();
    this.app.gesty.kartka();
  }

  krok(): void {}

  private zastepca(c: Creature): Creature {
    let z = this.zastepcy.get(c.id);
    if (!z) { z = { ...c, x: 0, y: 0, vy: 0, face: 1, carry: 0, job: Job.STOI }; this.zastepcy.set(c.id, z); }
    return z;
  }

  rysuj(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    tloSadzy(ctx, w, h, teraz);
    // ekran ślubu: wizja Pawła i wersja „razem” (drużyna z perkami pod ślubami); „Twoja drużyna” — tylko Patryk
    const pawel = maTarot(WARIANT);
    ramaRyciny(ctx, w, h, 1, pawel ? 'Trzewia · ślub drużyny' : 'Trzewia · twoja drużyna', `Alpha 0.3 · ${NAZWA_WARIANTU[WARIANT]}`, teraz);
    const m = Math.max(RAMA.margines.min, Math.min(RAMA.margines.max, w * RAMA.margines.czesc)) + 22;
    this.pola = [];
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const niski = h < 520;
    const tytulR = niski ? 22 : Math.max(26, Math.min(40, w / 34));
    ctx.font = `600 ${tytulR}px ${SERIF_TYTUL}`;
    ctx.fillStyle = '#ead9b4';
    const gora = m + tytulR + 4;
    ctx.fillText(pawel ? 'Ślub drużyny' : 'Twoja drużyna', w / 2, gora);
    ctx.font = `italic ${niski ? 14 : 15}px ${SERIF}`;
    ctx.fillStyle = 'rgba(214,198,166,0.8)';
    const pod = pawel
      ? 'Wybierz jeden ślub — trzyma całą drużynę przez całą partię.'
      : 'Te same osoby w każdej partii. Każda umie coś, czego nie umie nikt inny — strata boli.';
    const podL = lam(ctx, pod, w - 2 * m, 2);
    podL.forEach((l, i) => ctx.fillText(l, w / 2, gora + 22 + i * 18));
    ctx.restore();
    const y0 = gora + 22 + podL.length * 18 + 8;
    const dolPrzycisku = h - m - 4;
    const przyciskH = 44;
    const y1 = dolPrzycisku - przyciskH - (pawel ? 30 : 12);
    if (pawel) this.sluby(ctx, m, y0, w - 2 * m, y1 - y0, teraz);
    else this.druzyna(ctx, m, y0, w - 2 * m, y1 - y0, teraz);
    // kto zejdzie w tę górę (Paweł: same imiona, „razem”: imiona z perkami)
    if (pawel && this.sim) {
      const osoby = this.sim.lud.druzyna?.osoby ?? [];
      ctx.save();
      ctx.font = `italic 14px ${SERIF}`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(214,198,166,0.85)';
      // wersja „razem”: przy imieniu perk (to on odróżnia osoby), u Pawła — rola
      const kto = (o: Osoba) => `${o.imie} (${o.perk ? perk(o.perk)?.nazwa ?? rolaOsoby(o) : rolaOsoby(o)})`;
      ctx.fillText(skroc(ctx, `Schodzą: ${osoby.map(kto).join(', ')}`, w - 2 * m), w / 2, y1 + 20);
      ctx.restore();
    }
    // przyciski: wróć i dalej
    const bw = Math.min(300, (w - 2 * m) * 0.55), bx = w / 2 - bw / 2 + (w > 600 ? 70 : 0);
    const gotowe = !pawel || this.wybrany >= 0;
    const nadD = this.kursor.x >= bx && this.kursor.x <= bx + bw && this.kursor.y >= dolPrzycisku - przyciskH && this.kursor.y <= dolPrzycisku;
    tabliczka(ctx, bx, dolPrzycisku - przyciskH, bw, przyciskH, pawel ? ['Złóż ślub i zejdź w głąb', 'Złóż ślub i zejdź', 'Zejdź'] : ['Zejdź w głąb', 'Zejdź'], !gotowe ? 'uspiona' : nadD ? 'pod' : 'wlaczona', 16, teraz);
    if (gotowe) this.pola.push({ co: 'dalej', x: bx, y: dolPrzycisku - przyciskH, w: bw, h: przyciskH });
    const ww = 120, wx = Math.max(m, bx - ww - 16);
    if (w > 600 || wx + ww < bx) {
      const nadW = this.kursor.x >= wx && this.kursor.x <= wx + ww && this.kursor.y >= dolPrzycisku - przyciskH && this.kursor.y <= dolPrzycisku;
      tabliczka(ctx, wx, dolPrzycisku - przyciskH, ww, przyciskH, ['← menu'], nadW ? 'pod' : 'zwykla', 15, teraz);
      this.pola.push({ co: 'wroc', x: wx, y: dolPrzycisku - przyciskH, w: ww, h: przyciskH });
    }
  }

  /** Wizja Patryka: sześć kart postaci. */
  private druzyna(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, teraz: number): void {
    const osoby = (this.sim?.lud.druzyna?.osoby ?? []).slice(0, 6);
    if (!osoby.length) return;
    const kol = w >= 1000 ? 6 : w > h ? 3 : 2;
    const wierszy = Math.ceil(osoby.length / kol);
    const odst = 10;
    const kw = (w - odst * (kol - 1)) / kol, kh = Math.min((h - odst * (wierszy - 1)) / wierszy, kol === 6 ? 470 : 1e9);
    if (kol === 6) y += (h - kh) / 2;
    osoby.forEach((o, i) => {
      const kx = x + (i % kol) * (kw + odst), ky = y + Math.floor(i / kol) * (kh + odst);
      this.kartaOsoby(ctx, o, kx, ky, kw, kh, teraz);
    });
  }

  private kartaOsoby(ctx: CanvasRenderingContext2D, o: Osoba, x: number, y: number, w: number, h: number, teraz: number): void {
    tablica(ctx, x, y, w, h, 'zwykla', teraz);
    const c = this.sim?.creatureById(o.id);
    const poziom = w > h * 1.25;
    // portret
    const pW = poziom ? Math.min(h - 16, w * 0.3) : Math.min(w - 20, h * 0.34);
    const px = poziom ? x + 8 : x + (w - pW) / 2, py = y + 8, pH = pW * (poziom ? 1 : 1);
    ctx.save();
    ctx.beginPath(); ctx.rect(px, py, pW, pH); ctx.clip();
    const g = ctx.createLinearGradient(0, py, 0, py + pH);
    g.addColorStop(0, 'rgba(70,52,34,0.9)'); g.addColorStop(1, 'rgba(12,8,6,0.95)');
    ctx.fillStyle = g; ctx.fillRect(px, py, pW, pH);
    if (c && this.sim) { ctx.translate(px + pW / 2, py + pH * 0.95); rysujPostac(ctx, this.sim, this.zastepca(c), pH * 0.82, teraz, 'stoi'); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(214,178,112,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, pW - 1, pH - 1);
    // tekst
    const tx = poziom ? px + pW + 10 : x + 10, tw = poziom ? x + w - 8 - tx : w - 20;
    let ty = poziom ? y + 22 : py + pH + 22;
    const dol = y + h - 8;
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const linia = (tekst: string, font: string, barwa: string, krok: number, maks = 1): void => {
      ctx.font = font; ctx.fillStyle = barwa;
      for (const l of lam(ctx, tekst, tw, maks)) { if (ty > dol) return; ctx.fillText(l, tx, ty); ty += krok; }
    };
    ctx.font = `18px ${SERIF}`;
    ctx.fillStyle = '#f0dfb8';
    ctx.fillText(dopasuj(ctx, [imieOsoby(o), o.imie], tw), tx, ty); ty += 18;
    linia(rolaOsoby(o), `italic 14px ${SERIF}`, 'rgba(214,198,166,0.8)', 22);
    const p = o.perk ? perk(o.perk) : undefined;
    if (p) {
      znakPerku(ctx, p.znak, tx + 7, ty - 5, 14, 'rgba(240,206,128,0.98)');
      ctx.font = `15px ${SERIF}`; ctx.fillStyle = 'rgba(240,206,128,0.98)';
      ctx.fillText(skroc(ctx, p.nazwa, tw - 20), tx + 20, ty); ty += 18;
      linia(p.opis, `14px ${SERIF}`, 'rgba(214,198,166,0.92)', 17, 3);
      ty += 4;
    }
    const wd = o.wada ? perk(o.wada) : undefined;
    if (wd) { linia(`Wada: ${wd.nazwa} — ${wd.opis}`, `14px ${SERIF}`, 'rgba(232,128,104,0.95)', 17, 2); ty += 4; }
    if (o.kim) linia(o.kim, `italic 14px ${SERIF}`, 'rgba(206,192,166,0.85)', 17, 3);
    ctx.restore();
  }

  /** Wizja Pawła: trzy śluby obok siebie (na wąskim ekranie — jeden pod drugim). */
  private sluby(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, teraz: number): void {
    const kol = w > h * 0.9 ? 3 : 1;
    const odst = 12;
    const kw = (w - odst * (kol - 1)) / kol, kh = kol === 3 ? Math.min(h, 400) : (h - odst * 2) / 3;
    if (kol === 3) y += (h - kh) / 2;
    SLUBY.forEach((s, i) => {
      const kx = kol === 3 ? x + i * (kw + odst) : x, ky = kol === 3 ? y : y + i * (kh + odst);
      const nad = this.kursor.x >= kx && this.kursor.x <= kx + kw && this.kursor.y >= ky && this.kursor.y <= ky + kh;
      this.kartaSlubu(ctx, s, i, kx, ky, kw, kh, nad, teraz);
      this.pola.push({ co: 'karta', i, x: kx, y: ky, w: kw, h: kh });
    });
  }

  private kartaSlubu(ctx: CanvasRenderingContext2D, s: Slub, i: number, x: number, y: number, w: number, h: number, nad: boolean, teraz: number): void {
    const wyb = this.wybrany === i;
    tablica(ctx, x, y, w, h, wyb ? 'wlaczona' : nad ? 'pod' : 'zwykla', teraz);
    if (wyb) { ctx.save(); ctx.strokeStyle = 'rgba(246,216,142,0.95)'; ctx.lineWidth = 2.4; ctx.strokeRect(x - 3, y - 3, w + 6, h + 6); ctx.restore(); }
    const poziom = w > h * 1.6;
    // niska karta (telefon poziomo): mniejsza rycinka i gęstsze wiersze, żeby zmieściły się wszystkie role
    const ciasno = !poziom && h < 280;
    const rw = poziom ? Math.min(h - 20, w * 0.22) : Math.max(24, Math.min(w * 0.5, h * 0.3, h - 146));
    const rx = poziom ? x + 12 : x + (w - rw) / 2, ry = y + (poziom ? (h - rw) / 2 : 14);
    this.rycinaSlubu(ctx, s.id, rx, ry, rw, teraz, wyb);
    const tx = poziom ? rx + rw + 14 : x + 14, tw = poziom ? x + w - 10 - tx : w - 28;
    let ty = poziom ? y + 26 : ry + rw + (ciasno ? 24 : 30);
    const dol = y + h - 8;
    ctx.save();
    ctx.textAlign = poziom ? 'left' : 'center'; ctx.textBaseline = 'alphabetic';
    const cx = poziom ? tx : x + w / 2;
    ctx.font = `${poziom || ciasno ? 18 : 21}px ${SERIF}`; ctx.fillStyle = wyb ? '#f6e4b8' : '#ead9b4';
    ctx.fillText(skroc(ctx, s.nazwa, tw), cx, ty); ty += poziom || ciasno ? 18 : 22;
    ctx.font = `italic 14px ${SERIF}`; ctx.fillStyle = 'rgba(214,198,166,0.8)';
    ctx.fillText(skroc(ctx, s.motto, tw), cx, ty); ty += poziom || ciasno ? 21 : 28;
    for (const r of ROLE) {
      if (ty > dol) break;
      ctx.font = `14px ${SERIF}`; ctx.fillStyle = 'rgba(240,206,128,0.98)';
      ctx.fillText(skroc(ctx, `${KTO[r]}: ${s.opis[r]}`, tw), cx, ty);
      ty += poziom || ciasno ? 18 : 21;
    }
    ctx.restore();
  }

  /** Rycinka ślubu: cisza — zamknięte usta i krzyż, ogień — płomień, głód — pusta misa z kłosem. */
  private rycinaSlubu(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, s: number, teraz: number, zywo: boolean): void {
    ctx.save();
    ctx.translate(x + s / 2, y + s / 2);
    const u = s / 2;
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, u);
    g.addColorStop(0, `rgba(240,190,110,${zywo ? 0.28 : 0.14})`); g.addColorStop(1, 'rgba(240,190,110,0)');
    ctx.fillStyle = g; ctx.fillRect(-u, -u, s, s);
    ctx.strokeStyle = 'rgba(232,196,120,0.95)'; ctx.lineWidth = Math.max(1.4, s * 0.025); ctx.lineCap = 'round';
    ctx.beginPath();
    if (id === 'cisza') {
      ctx.arc(0, 0, u * 0.7, 0, Math.PI * 2);
      ctx.moveTo(0, -u * 0.45); ctx.lineTo(0, u * 0.45); ctx.moveTo(-u * 0.3, -u * 0.15); ctx.lineTo(u * 0.3, -u * 0.15);
      ctx.moveTo(-u * 0.25, u * 0.62); ctx.lineTo(u * 0.25, u * 0.62);
    } else if (id === 'ogien') {
      const d = Math.sin(teraz * 0.004) * u * 0.05;
      ctx.moveTo(0, -u * 0.8 + d); ctx.quadraticCurveTo(u * 0.6, -u * 0.1, u * 0.35, u * 0.6); ctx.lineTo(-u * 0.35, u * 0.6); ctx.quadraticCurveTo(-u * 0.6, -u * 0.1, 0, -u * 0.8 + d);
      ctx.moveTo(0, -u * 0.25); ctx.quadraticCurveTo(u * 0.25, u * 0.15, u * 0.12, u * 0.5); ctx.lineTo(-u * 0.12, u * 0.5); ctx.quadraticCurveTo(-u * 0.25, u * 0.15, 0, -u * 0.25);
    } else {
      ctx.moveTo(-u * 0.7, u * 0.05); ctx.quadraticCurveTo(0, u * 0.75, u * 0.7, u * 0.05); ctx.closePath();
      ctx.moveTo(0, u * 0.05); ctx.lineTo(0, -u * 0.8);
      for (let k = 0; k < 4; k++) { const yy = -u * 0.7 + k * u * 0.17; ctx.moveTo(0, yy); ctx.lineTo(-u * 0.16, yy - u * 0.1); ctx.moveTo(0, yy); ctx.lineTo(u * 0.16, yy - u * 0.1); }
    }
    ctx.stroke();
    ctx.restore();
  }

  private zacznij(): void {
    if (maTarot(WARIANT) && this.wybrany < 0) return;
    this.app.gesty.klik();
    this.app.idz('gra', { tryb: 'nowa', slub: maTarot(WARIANT) ? SLUBY[this.wybrany].id : undefined });
  }

  dotyk(e: PointerEvent, faza: 'dol' | 'ruch' | 'gora'): void {
    this.kursor = { x: e.clientX, y: e.clientY };
    if (faza !== 'dol') return;
    const p = this.pola.find((q) => e.clientX >= q.x && e.clientX <= q.x + q.w && e.clientY >= q.y && e.clientY <= q.y + q.h);
    if (!p) return;
    if (p.co === 'karta' && p.i !== undefined) {
      // drugie dotknięcie wybranego ślubu — od razu w drogę
      if (this.wybrany === p.i) this.zacznij(); else { this.wybrany = p.i; this.app.gesty.klik(); }
    } else if (p.co === 'dalej') this.zacznij();
    else this.app.idz('menu');
  }

  klawisz(akcja: Akcja | null, e: KeyboardEvent): void {
    if (akcja === 'menu') { this.app.idz('menu'); return; }
    if (maTarot(WARIANT) && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) this.wybrany = Math.max(0, this.wybrany - 1);
    if (maTarot(WARIANT) && (e.key === 'ArrowRight' || e.key === 'ArrowDown')) this.wybrany = Math.min(SLUBY.length - 1, this.wybrany + 1);
    if (maTarot(WARIANT) && (e.key === '1' || e.key === '2' || e.key === '3')) this.wybrany = Number(e.key) - 1;
    if (e.key === 'Enter' || e.key === ' ') this.zacznij();
  }
}
