import type { Akcja } from '../core/keybinds';

/** Każdy ekran gry — menu, samouczek, ustawienia, rozgrywka, kronika — mówi tym językiem. */
export interface Ekran {
  nazwa: string;
  wejdz?(dane?: unknown): void;
  wyjdz?(): void;
  krok(dt: number, teraz: number): void;
  rysuj(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void;
  dotyk?(e: PointerEvent, faza: 'dol' | 'ruch' | 'gora'): void;
  klawisz?(akcja: Akcja | null, e: KeyboardEvent): void;
  kolko?(e: WheelEvent): void;
  rozmiar?(w: number, h: number): void;
}
