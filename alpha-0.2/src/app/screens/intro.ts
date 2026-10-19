import { KROJ } from '../../render/fonts';
import { BARWA, rgba } from '../../render/palette';
import { INTRO as I } from '../../nastawy/ekran';
import filmUrl from '../../../filmy/intro.mp4?url';

/**
 * Intro: film z `filmy/intro.mp4` rusza od razu po otwarciu gry — zanim cokolwiek innego się
 * pokaże — a góra ładuje się pod nim. Film leży na płótnie jako osobna warstwa strony
 * (przeglądarka gra go sama, więc ładowanie go nie zacina), na dole stoi mały znaczek
 * „spacja – pomiń”. Spacja albo Esc pomija; po końcu filmu ekran ładowania przechodzi do menu.
 */
let warstwa: HTMLDivElement | null = null;
let trwa = false;

/** Czy film jeszcze zasłania grę. */
export function introTrwa(): boolean { return trwa; }

export function puscIntro(): void {
  if (warstwa) return;
  trwa = true;
  const w = document.createElement('div');
  w.style.cssText = `position:fixed;inset:0;z-index:10;background:#000;transition:opacity ${I.wygaszenieMs}ms ease`;

  const v = document.createElement('video');
  v.src = filmUrl;
  // film bez dźwięku przeglądarka puszcza od razu, bez czekania na gest gracza
  v.muted = v.defaultMuted = true;
  v.playsInline = true;
  v.setAttribute('playsinline', '');
  v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000';
  v.addEventListener('ended', pominIntro);
  v.addEventListener('error', pominIntro);

  // mały znaczek na dole: klawisz „spacja” w ramce i „– pomiń” obok
  const z = document.createElement('div');
  z.style.cssText = `position:absolute;left:50%;bottom:24px;transform:translateX(-50%);display:flex;align-items:center;gap:6px;
    padding:4px 9px;border-radius:7px;background:rgba(0,0,0,.45);font:13px ${KROJ};color:${rgba(BARWA.atramentCichy, 1)};
    white-space:nowrap;pointer-events:none;opacity:0;transition:opacity ${I.znaczekRozjasnienieMs}ms ease ${I.znaczekOdMs}ms`;
  const k = document.createElement('span');
  k.textContent = I.klawisz;
  k.style.cssText = `padding:1px 7px;border:1px solid ${rgba(BARWA.atrament, 0.85)};border-radius:4px;color:${BARWA.atrament}`;
  const p = document.createElement('span');
  p.textContent = `– ${I.pomin}`;
  p.style.fontStyle = 'italic';
  z.append(k, p);

  w.append(v, z);
  document.body.appendChild(w);
  warstwa = w;
  requestAnimationFrame(() => { z.style.opacity = '0.75'; });

  // spacja i Esc pomijają film; klawisz idzie dalej do gry (pierwszy gest budzi dźwięk i pełny ekran)
  addEventListener('keydown', klawisz, true);

  v.play().catch(pominIntro);
  // film, który nie ruszył (zła taśma, przeglądarka bez kodeka), nie trzyma gry za zasłoną
  setTimeout(() => { if (trwa && v.currentTime === 0) pominIntro(); }, I.bezpiecznikMs);
}

function klawisz(e: KeyboardEvent): void {
  if (e.key === ' ' || e.code === 'Space' || e.key === 'Escape') pominIntro();
}

export function pominIntro(): void {
  if (!trwa || !warstwa) return;
  trwa = false;
  removeEventListener('keydown', klawisz, true);
  const w = warstwa;
  w.querySelector('video')?.pause();
  w.style.opacity = '0';
  w.style.pointerEvents = 'none';
  setTimeout(() => { w.remove(); if (warstwa === w) warstwa = null; }, I.wygaszenieMs);
}
