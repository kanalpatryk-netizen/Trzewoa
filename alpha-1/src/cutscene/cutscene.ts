import { BARWA, rgba } from '../render/palette';
import { SERIF, SERIF_TYTUL, tloSadzy, akapit, linieAkapitu, naciecie, kreska } from '../render/ink';
import type { Plotno } from './art/common';

export interface Scena {
  id: string;
  tytul: string;
  rysunek: (p: Plotno) => void;
  linie: string[];
}

/**
 * Odtwarzacz cutscenek. Rysunek wchodzi powoli, tekst dopisuje się litera po literze,
 * a dotknięcie albo domyka bieżącą linijkę, albo przechodzi dalej.
 */
export class Cutscenka {
  private scena: Scena | null = null;
  private start = 0;
  private widoczneLinie = 0;
  private znaki = 0;
  private koniecCb: (() => void) | null = null;
  private zamykanie = 0;
  /** Kolejka scen: przerywnik to kilka plansz, a nie jedna. */
  private kolejka: Scena[] = [];
  private nr = 0;
  private razem = 1;

  /** Odtwarza kilka scen po kolei; `koniec` woła się po ostatniej albo po pominięciu. */
  odtworzListe(sceny: Scena[], koniec: () => void): void {
    this.kolejka = sceny.slice(1);
    this.razem = sceny.length;
    this.nr = 0;
    this.pojedyncza(sceny[0], koniec);
  }

  odtworz(scena: Scena, koniec: () => void): void {
    this.kolejka = []; this.razem = 1; this.nr = 0;
    this.pojedyncza(scena, koniec);
  }

  private pojedyncza(scena: Scena, koniec: () => void): void {
    this.scena = scena;
    this.koniecCb = koniec;
    this.start = performance.now();
    this.widoczneLinie = 0;
    this.znaki = 0;
    this.zamykanie = 0;
  }

  get aktywna(): boolean { return this.scena !== null; }

  krok(dt: number): void {
    if (!this.scena) return;
    if (this.zamykanie > 0) {
      this.zamykanie += dt;
      if (this.zamykanie > 420) {
        const cb = this.koniecCb;
        const nastepna = this.kolejka.shift();
        if (nastepna && cb) { this.nr++; this.pojedyncza(nastepna, cb); return; }
        this.scena = null; this.koniecCb = null; this.zamykanie = 0;
        cb?.();
      }
      return;
    }
    const linia = this.scena.linie[this.widoczneLinie];
    if (linia === undefined) return;
    this.znaki += dt * 0.055;
    if (this.znaki > linia.length + 12 && this.widoczneLinie < this.scena.linie.length - 1) {
      this.widoczneLinie++;
      this.znaki = 0;
    }
  }

  /** Dotknięcie: najpierw domyka pisanie, potem przewija linijkę, na końcu kończy scenę. */
  dalej(): void {
    if (!this.scena || this.zamykanie > 0) return;
    const linia = this.scena.linie[this.widoczneLinie];
    if (linia !== undefined && this.znaki < linia.length) { this.znaki = linia.length + 99; return; }
    if (this.widoczneLinie < this.scena.linie.length - 1) { this.widoczneLinie++; this.znaki = 0; return; }
    this.zamykanie = 1;
  }

  /** Prostokąt napisu „pomiń” (px logiczne) — ekran sprawdza, czy dotknięcie w niego trafiło. */
  polePomin: { x: number; y: number; w: number; h: number } | null = null;

  /** Czy dotknięcie trafiło w „pomiń”. */
  trafiaPomin(x: number, y: number): boolean {
    const p = this.polePomin;
    return !!p && x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h;
  }

  pomin(): void {
    if (!this.scena) return;
    this.kolejka = [];
    this.zamykanie = 1;
  }

  rysuj(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    const s = this.scena;
    if (!s) return;
    const wiek = teraz - this.start;
    const wejscie = Math.min(1, wiek / 900);
    const wyjscie = this.zamykanie > 0 ? Math.max(0, 1 - this.zamykanie / 420) : 1;
    const alfa = wejscie * wyjscie;

    tloSadzy(ctx, w, h, teraz);

    // ilustracja
    ctx.save();
    ctx.globalAlpha = alfa;
    // Scena idzie rytmem narracji, nie zegarem: obraz dokłada elementy dokładnie
    // wtedy, kiedy pada o nich zdanie.
    const linia = s.linie[this.widoczneLinie] ?? '';
    const taktP = Math.max(0, Math.min(1, this.znaki / Math.max(1, linia.length)));
    const postep = Math.min(1, (this.widoczneLinie + taktP) / s.linie.length);

    const pasY = h * 0.10, pasH = h * 0.46;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, pasY, w, pasH);
    ctx.clip();
    ctx.translate(0, pasY);

    // powolny najazd kamery — rycina nigdy nie stoi w miejscu
    const zoom = 1 + 0.06 * Math.sin(wiek * 0.00011) + postep * 0.05;
    const przesunX = Math.sin(wiek * 0.00007) * w * 0.012;
    const przesunY = Math.cos(wiek * 0.00009) * pasH * 0.02;
    ctx.translate(w / 2 + przesunX, pasH / 2 + przesunY);
    ctx.scale(zoom, zoom);
    ctx.translate(-w / 2, -pasH / 2);

    s.rysunek({ ctx, w, h: pasH, t: teraz, p: postep, takt: this.widoczneLinie, taktP });

    // kurz w świetle — dwie garście drobin, które żyją własnym ruchem
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const fx = ((i * 137.5) % 100) / 100;
      const fy = ((i * 61.8) % 100) / 100;
      const x = (fx * 1.2 - 0.1 + Math.sin(wiek * 0.00008 + i) * 0.02) * w;
      const y = ((fy + wiek * 0.000018 * (0.4 + (i % 5) / 6)) % 1) * pasH;
      const a = 0.05 + 0.08 * Math.abs(Math.sin(wiek * 0.001 + i));
      ctx.fillStyle = `rgba(226,214,186,${a})`;
      ctx.beginPath();
      ctx.arc(x, pasH - y, 0.7 + (i % 3) * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // rycina ma ramkę jak plansza w atlasie
    const mx = w * 0.12, my = pasY - 6;
    ctx.save();
    ctx.globalAlpha = alfa * 0.5;
    ctx.strokeStyle = rgba(BARWA.atrament, 0.5);
    ctx.lineWidth = 1;
    kreska(ctx, mx, my, w - mx, my, 0.8, 30);
    kreska(ctx, mx, my + pasH + 10, w - mx, my + pasH + 10, 0.8, 30);
    ctx.restore();
    ctx.restore();

    // tytuł sceny
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.textAlign = 'center';
    const rozmiarTytulu = Math.max(17, Math.min(30, w / 40));
    ctx.font = `600 ${rozmiarTytulu}px ${SERIF_TYTUL}`;
    ctx.fillStyle = rgba(BARWA.atramentMocny, 0.92);
    const litery = [...s.tytul.toUpperCase()];
    const odstepLiter = rozmiarTytulu * 0.12;
    const szer = litery.reduce((a, l) => a + ctx.measureText(l).width, 0) + odstepLiter * (litery.length - 1);
    let lx = w / 2 - szer / 2;
    for (const l of litery) {
      const lw = ctx.measureText(l).width;
      ctx.fillText(l, lx + lw / 2, h * 0.075);
      lx += lw + odstepLiter;
    }
    naciecie(ctx, w / 2, h * 0.098, Math.min(420, Math.max(szer * 1.4, w * 0.3)), 0.35);
    // która to plansza z ilu — rzymskimi, jak tablice w atlasie
    if (this.razem > 1) {
      const RZ = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
      ctx.font = `italic ${Math.max(12, w / 90)}px ${SERIF}`;
      ctx.fillStyle = rgba(BARWA.atramentCichy, 0.7);
      ctx.fillText(`plansza ${RZ[this.nr] ?? this.nr + 1} z ${RZ[this.razem - 1] ?? this.razem}`, w / 2, h * 0.03);
    }

    // narracja
    const maxW = Math.min(760, w * 0.76);
    const rozmiar = Math.max(16, Math.min(26, w / 42));
    ctx.font = `${rozmiar}px ${SERIF}`;
    let y = h * 0.64;
    // gdy wszystkie linijki się nie mieszczą (telefon), znikają najstarsze — bieżąca
    // musi być widać cała
    let od = 0;
    const wys = (i: number) => linieAkapitu(ctx, s.linie[i], maxW) * rozmiar * 1.45 + rozmiar * 0.5;
    let suma = 0;
    for (let i = Math.min(this.widoczneLinie, s.linie.length - 1); i >= 0; i--) {
      suma += wys(i);
      if (y + suma > h * 0.94) { od = i + 1; break; }
    }
    for (let i = od; i <= this.widoczneLinie && i < s.linie.length; i++) {
      const pelna = s.linie[i];
      const tekst = i === this.widoczneLinie ? pelna.slice(0, Math.floor(this.znaki)) : pelna;
      ctx.fillStyle = rgba(i === this.widoczneLinie ? BARWA.atramentMocny : BARWA.atrament, i === this.widoczneLinie ? 0.96 : 0.6);
      const n = akapit(ctx, tekst, w / 2, y, maxW, rozmiar * 1.45, 'center');
      y += n * rozmiar * 1.45 + rozmiar * 0.5;
      if (y > h * 0.94) break;
    }

    ctx.font = `italic ${Math.max(12, w / 82)}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atramentCichy, 0.45 + 0.2 * Math.sin(teraz * 0.003));
    ctx.textAlign = 'center';
    ctx.fillText('dotknij, żeby czytać dalej', w / 2, h * 0.975);
    // pominięcie palcem — na telefonie nie ma „P” ani „esc”
    ctx.font = `italic 17px ${SERIF}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = rgba(BARWA.zarBlady, 0.85 * alfa);
    const napis = this.razem > 1 ? 'pomiń wstęp ›' : 'pomiń ›';
    const tw = ctx.measureText(napis).width;
    ctx.fillText(napis, w - 24, 34);
    this.polePomin = { x: w - 24 - tw - 14, y: 34 - 26, w: tw + 28, h: 44 };
    ctx.restore();
  }
}
