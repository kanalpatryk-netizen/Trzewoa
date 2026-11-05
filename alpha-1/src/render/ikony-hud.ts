/**
 * Ikony interfejsu Alpha 1 rysowane kreską (placeholdery do podmiany przez grafika): pomieszczenia w menu
 * „Budowa”, płyta „Budowa” i „odwołaj rozkaz”, możliwości w oknie postaci (Cud, módl się, ołtarz, droga
 * wiernych, naprawa liny, zbroja…). Jasna kreska jak na rycinie, ogień i światło przez „lighter”.
 */
import { wolnoRuszac } from './nastroj';

/** Jasna kreska (kość) i ogień. */
const jasny = (a: number): string => `rgba(222,206,172,${a})`, ognisty = (a: number): string => `rgba(255,170,80,${a})`;
/** Kreskowanie wnętrza ścieżki: równoległe kreski co `B` pod kątem `C` — cień jak na rycinie. */
function kreskuj(ctx: CanvasRenderingContext2D, M: Path2D, g: number, B: number, C = 0.8, o = 0.4): void {
  ctx.save(), ctx.clip(M), ctx.strokeStyle = jasny(o), ctx.lineWidth = Math.max(0.6, g * 0.012);
  const E = g * 1.6, Q = Math.cos(C), I = Math.sin(C);
  ctx.beginPath();
  for (let Y = -E; Y <= E; Y += B) ctx.moveTo(-I * Y - Q * E, Q * Y - I * E), ctx.lineTo(-I * Y + Q * E, Q * Y + I * E);
  ctx.stroke(), ctx.restore();
}
/** Płomyk świecy z poświatą (drga, gdy wolno ruszać). */
function plomyk(ctx: CanvasRenderingContext2D, M: number, g: number, B: number, C: number, o = 1): void {
  const E = wolnoRuszac() ? 0.85 + 0.15 * Math.sin(C * 0.011 + M) : 1;
  ctx.save(), ctx.globalCompositeOperation = "lighter";
  const Q = ctx.createRadialGradient(M, g, 0, M, g, B * 1.6 * E);
  Q.addColorStop(0, ognisty(0.45 * o)), Q.addColorStop(1, ognisty(0)), ctx.fillStyle = Q, ctx.fillRect(M - B * 1.6, g - B * 1.6, B * 3.2, B * 3.2), ctx.fillStyle = `rgba(255,214,140,${0.9 * o})`, ctx.beginPath(), ctx.moveTo(M, g - B * 0.5 * E), ctx.quadraticCurveTo(M + B * 0.18, g, M, g + B * 0.15), ctx.quadraticCurveTo(M - B * 0.18, g, M, g - B * 0.5 * E), ctx.fill(), ctx.restore();
}
/** Ikona pomieszczenia (sypialnia, warsztat, kuźnia, korytarz, szyb, lina) w polu `C` × `C` o środku (g, B). */
export function ikonaPomieszczenia(ctx: CanvasRenderingContext2D, M: string, g: number, B: number, C: number, o: number, E = 0.8): void {
  ctx.save(), ctx.translate(g, B), ctx.lineJoin = "round", ctx.lineCap = "round";
  const Q = Math.max(1, C * 0.022), I = (i: Path2D, w = 0.9): void => {
    ctx.strokeStyle = jasny(w * E), ctx.lineWidth = Q, ctx.stroke(i);
  }, Y = Math.max(2.2, C * 0.045);
  switch (M) {
    case "sypialnia": {
      const i = new Path2D();
      i.moveTo(-C * 0.42, C * 0.3), i.lineTo(-C * 0.42, -C * 0.1), i.quadraticCurveTo(-C * 0.42, -C * 0.36, -C * 0.12, -C * 0.36), i.lineTo(C * 0.42, -C * 0.36), i.lineTo(C * 0.42, C * 0.3), I(i, 0.45);
      const w = new Path2D();
      w.rect(-C * 0.36, C * 0.06, C * 0.72, C * 0.1), I(w), kreskuj(ctx, w, C, Y * 0.7, 0, 0.35 * E);
      const G = new Path2D();
      G.moveTo(-C * 0.12, C * 0.06), G.quadraticCurveTo(C * 0.1, -C * 0.06, C * 0.36, -C * 0), G.lineTo(C * 0.36, C * 0.06), G.closePath(), I(G), kreskuj(ctx, G, C, Y, 0.9, 0.5 * E);
      const h = new Path2D();
      h.ellipse(-C * 0.22, -C * 0, C * 0.07, C * 0.055, 0, 0, Math.PI * 2), I(h);
      const a = new Path2D();
      a.moveTo(-C * 0.33, C * 0.16), a.lineTo(-C * 0.33, C * 0.26), a.moveTo(C * 0.33, C * 0.16), a.lineTo(C * 0.33, C * 0.26), I(a, 0.7);
      const k = new Path2D();
      k.rect(C * 0.24, -C * 0.24, C * 0.04, C * 0.1), I(k, 0.8), plomyk(ctx, C * 0.26, -C * 0.27, C * 0.09, o, E);
      break;
    }
    case "warsztat": {
      const i = new Path2D();
      i.rect(-C * 0.4, C * 0.02, C * 0.8, C * 0.07), I(i), kreskuj(ctx, i, C, Y * 0.6, 0, 0.4 * E);
      const w = new Path2D();
      w.moveTo(-C * 0.32, C * 0.09), w.lineTo(-C * 0.34, C * 0.3), w.moveTo(C * 0.32, C * 0.09), w.lineTo(C * 0.34, C * 0.3), w.moveTo(-C * 0.33, C * 0.2), w.lineTo(C * 0.33, C * 0.2), I(w, 0.7);
      const G = new Path2D();
      G.rect(-C * 0.025, -C * 0.36, C * 0.05, C * 0.36), G.rect(-C * 0.11, -C * 0.27, C * 0.22, C * 0.045), ctx.save(), ctx.globalCompositeOperation = "lighter";
      const h = ctx.createRadialGradient(0, -C * 0.2, 0, 0, -C * 0.2, C * 0.3);
      h.addColorStop(0, `rgba(230,180,90,${0.3 * E})`), h.addColorStop(1, "rgba(230,180,90,0)"), ctx.fillStyle = h, ctx.fillRect(-C * 0.3, -C * 0.5, C * 0.6, C * 0.6), ctx.restore(), ctx.strokeStyle = `rgba(236,196,120,${0.95 * E})`, ctx.lineWidth = Q, ctx.stroke(G);
      const a = new Path2D();
      a.moveTo(-C * 0.32, -C * 0), a.lineTo(-C * 0.16, -C * 0.07), a.moveTo(-C * 0.18, -C * 0.06), a.lineTo(-C * 0.13, -C * 0.08), a.moveTo(C * 0.16, -C * 0), a.lineTo(C * 0.3, -C * 0.1), a.rect(C * 0.27, -C * 0.15, C * 0.08, C * 0.05), I(a, 0.8);
      break;
    }
    case "kuznia": {
      const i = new Path2D();
      i.moveTo(-C * 0.4, -C * 0.06), i.lineTo(C * 0.26, -C * 0.06), i.quadraticCurveTo(C * 0.42, -C * 0.04, C * 0.4, C * 0.04), i.lineTo(C * 0.1, C * 0.06), i.lineTo(C * 0.08, C * 0.16), i.lineTo(C * 0.2, C * 0.3), i.lineTo(-C * 0.24, C * 0.3), i.lineTo(-C * 0.12, C * 0.16), i.lineTo(-C * 0.14, C * 0.06), i.quadraticCurveTo(-C * 0.34, C * 0.04, -C * 0.4, -C * 0.06), i.closePath(), I(i), kreskuj(ctx, i, C, Y, 0.75, 0.45 * E);
      const w = new Path2D();
      w.moveTo(C * 0.02, -C * 0.12), w.lineTo(-C * 0.2, -C * 0.38), w.rect(-C * 0.3, -C * 0.44, C * 0.16, C * 0.08), I(w, 0.85), ctx.save(), ctx.globalCompositeOperation = "lighter", ctx.strokeStyle = ognisty(0.85 * E), ctx.lineWidth = Q * 1.6, ctx.beginPath(), ctx.moveTo(-C * 0.18, -C * 0.09), ctx.lineTo(C * 0.12, -C * 0.09), ctx.stroke();
      const G = wolnoRuszac() ? o * 3e-3 : 0;
      for (let h = 0; h < 5; h++) {
        const a = (G + h * 0.37) % 1, k = -Math.PI / 2 + (h - 2) * 0.5;
        ctx.fillStyle = ognisty((1 - a) * E), ctx.beginPath(), ctx.arc(Math.cos(k) * C * (0.06 + a * 0.24), -C * 0.1 + Math.sin(k) * C * (0.06 + a * 0.24), Math.max(0.7, C * 0.015), 0, Math.PI * 2), ctx.fill();
      }
      ctx.restore();
      break;
    }
    case "korytarz": {
      for (let G = 3; G >= 0; G--) {
        const h = 1 - G * 0.2, a = 0.95 - G * 0.22, k = new Path2D();
        k.moveTo(-C * 0.4 * h, C * 0.3 * h), k.lineTo(-C * 0.4 * h, -C * 0.05 * h), k.quadraticCurveTo(-C * 0.4 * h, -C * 0.36 * h, 0, -C * 0.36 * h), k.quadraticCurveTo(C * 0.4 * h, -C * 0.36 * h, C * 0.4 * h, -C * 0.05 * h), k.lineTo(C * 0.4 * h, C * 0.3 * h), I(k, a);
      }
      const i = new Path2D();
      i.moveTo(-C * 0.4, C * 0.3), i.lineTo(-C * 0.16, C * 0.12), i.moveTo(C * 0.4, C * 0.3), i.lineTo(C * 0.16, C * 0.12), I(i, 0.5);
      const w = ctx.createRadialGradient(0, C * 0.02, 0, 0, C * 0.02, C * 0.2);
      w.addColorStop(0, "rgba(0,0,0,0.85)"), w.addColorStop(1, "rgba(0,0,0,0)"), ctx.fillStyle = w, ctx.fillRect(-C * 0.2, -C * 0.18, C * 0.4, C * 0.4);
      break;
    }
    case "szyb": {
      for (let h = 0; h < 6; h++) {
        const a = new Path2D(), k = -C * 0.4 + h * C * 0.13, D = -C * 0.32 + h * C * 0.11;
        a.moveTo(k, D), a.lineTo(k + C * 0.13, D), a.lineTo(k + C * 0.13, D + C * 0.11), I(a, 0.95 - h * 0.13);
      }
      const i = new Path2D();
      i.moveTo(-C * 0.4, -C * 0.32), i.lineTo(-C * 0.4, C * 0.34), I(i, 0.6);
      const w = new Path2D();
      w.moveTo(-C * 0.4, -C * 0.32);
      for (let h = 0; h < 6; h++) w.lineTo(-C * 0.4 + (h + 1) * C * 0.13, -C * 0.32 + h * C * 0.11), w.lineTo(-C * 0.4 + (h + 1) * C * 0.13, -C * 0.32 + (h + 1) * C * 0.11);
      w.lineTo(-C * 0.4, C * 0.34), w.closePath(), kreskuj(ctx, w, C, Y, 0.8, 0.35 * E);
      const G = ctx.createLinearGradient(0, -C * 0.1, 0, C * 0.4);
      G.addColorStop(0, "rgba(0,0,0,0)"), G.addColorStop(1, "rgba(0,0,0,0.85)"), ctx.fillStyle = G, ctx.fillRect(-C * 0.45, -C * 0.1, C * 0.9, C * 0.5);
      break;
    }
    case "lina": {
      const i = new Path2D();
      i.moveTo(-C * 0.4, -C * 0.34), i.lineTo(C * 0.4, -C * 0.34), I(i, 0.7);
      const w = new Path2D();
      w.rect(-C * 0.4, -C * 0.44, C * 0.8, C * 0.1), kreskuj(ctx, w, C, Y * 0.8, 0.8, 0.4 * E);
      const G = new Path2D();
      G.moveTo(0, -C * 0.34), G.lineTo(0, -C * 0.26), G.arc(C * 0.04, -C * 0.26, C * 0.04, Math.PI, 0, true), I(G);
      const h = wolnoRuszac() ? Math.sin(o * 2e-3) * C * 0.03 : 0;
      ctx.strokeStyle = jasny(0.9 * E), ctx.lineWidth = Q * 1.4, ctx.beginPath(), ctx.moveTo(C * 0.04, -C * 0.24), ctx.quadraticCurveTo(C * 0.04 + h, C * 0.05, C * 0.02 - h * 0.5, C * 0.36), ctx.stroke(), ctx.lineWidth = Math.max(0.6, Q * 0.6);
      for (let k = 0; k < 9; k++) {
        const D = -C * 0.2 + k * C * 0.06;
        ctx.beginPath(), ctx.moveTo(C * 0.025, D), ctx.lineTo(C * 0.055, D + C * 0.02), ctx.stroke();
      }
      const a = ctx.createLinearGradient(0, C * 0.05, 0, C * 0.4);
      a.addColorStop(0, "rgba(0,0,0,0)"), a.addColorStop(1, "rgba(0,0,0,0.9)"), ctx.fillStyle = a, ctx.fillRect(-C * 0.2, C * 0.05, C * 0.4, C * 0.38);
      break;
    }
  }
  ctx.restore();
}
/** Płyta „Budowa”: łuk wyrobiska, skrzyżowane kilof i dłuto. */
export function ikonaBudowy(ctx: CanvasRenderingContext2D, M: number, g: number, B: number, C = 0.85): void {
  ctx.save(), ctx.translate(M, g), ctx.lineJoin = "round", ctx.lineCap = "round";
  const o = Math.max(1, B * 0.035);
  ctx.strokeStyle = jasny(0.9 * C), ctx.lineWidth = o;
  const E = new Path2D();
  E.moveTo(-B * 0.42, B * 0.42), E.lineTo(-B * 0.42, B * 0.12), E.quadraticCurveTo(-B * 0.42, -B * 0.2, 0, -B * 0.22), E.quadraticCurveTo(B * 0.42, -B * 0.2, B * 0.42, B * 0.12), E.lineTo(B * 0.42, B * 0.42), ctx.globalAlpha = 0.55, ctx.stroke(E), ctx.globalAlpha = 1;
  const Q = new Path2D();
  Q.moveTo(-B * 0.07, -B * 0.3), Q.lineTo(B * 0.07, -B * 0.3), Q.lineTo(B * 0.05, -B * 0.15), Q.lineTo(-B * 0.05, -B * 0.15), Q.closePath(), ctx.stroke(Q), kreskuj(ctx, Q, B, Math.max(2, B * 0.05), 0.8, 0.5 * C), ctx.save(), ctx.rotate(-0.7);
  const I = new Path2D();
  I.moveTo(0, B * 0.42), I.lineTo(0, -B * 0.08), I.rect(-B * 0.14, -B * 0.2, B * 0.28, B * 0.12), ctx.stroke(I), ctx.restore(), ctx.save(), ctx.rotate(0.7);
  const Y = new Path2D();
  Y.moveTo(-B * 0.03, B * 0.42), Y.lineTo(-B * 0.03, B * 0.12), Y.lineTo(B * 0.03, B * 0.12), Y.lineTo(B * 0.03, B * 0.42), Y.moveTo(-B * 0.025, B * 0.12), Y.lineTo(-B * 0.02, -B * 0.12), Y.lineTo(0, -B * 0.18), Y.lineTo(B * 0.02, -B * 0.12), Y.lineTo(B * 0.025, B * 0.12), ctx.stroke(Y), ctx.restore(), ctx.restore();
}
/** „Odwołaj rozkaz”: chorągiewka i strzałka zawracania. */
export function ikonaOdwolaj(ctx: CanvasRenderingContext2D, M: number, g: number, B: number, C = 0.85): void {
  ctx.save(), ctx.translate(M, g), ctx.lineJoin = "round", ctx.lineCap = "round", ctx.strokeStyle = jasny(0.9 * C), ctx.lineWidth = Math.max(1, B * 0.05), ctx.beginPath(), ctx.moveTo(-B * 0.12, B * 0.42), ctx.lineTo(-B * 0.12, -B * 0.36), ctx.moveTo(-B * 0.12, -B * 0.36), ctx.lineTo(B * 0.22, -B * 0.26), ctx.lineTo(-B * 0.12, -B * 0.14), ctx.stroke(), ctx.beginPath(), ctx.arc(B * 0.06, B * 0.14, B * 0.26, -0.3, Math.PI * 0.9), ctx.stroke();
  const o = B * 0.06 + Math.cos(Math.PI * 0.9) * B * 0.26, E = B * 0.14 + Math.sin(Math.PI * 0.9) * B * 0.26;
  ctx.beginPath(), ctx.moveTo(o - B * 0.1, E - B * 0.12), ctx.lineTo(o, E), ctx.lineTo(o + B * 0.12, E - B * 0.06), ctx.stroke(), ctx.restore();
}
/** Ikona możliwości w oknie postaci (cud, modl, przerwij, oltarz, droga, naprawa, zbroja; warsztat, kuznia, sen — jak pomieszczenia). */
export function ikonaMozliwosci(ctx: CanvasRenderingContext2D, M: string, g: number, B: number, C: number, o: number, E = 0.85): void {
  if (M === "warsztat" || M === "kuznia" || M === "sen") {
    ikonaPomieszczenia(ctx, M === "sen" ? "sypialnia" : M, g, B, C, o, E);
    return;
  }
  ctx.save(), ctx.translate(g, B), ctx.lineJoin = "round", ctx.lineCap = "round";
  const Q = Math.max(1, C * 0.04);
  switch (ctx.strokeStyle = jasny(0.9 * E), ctx.lineWidth = Q, M) {
    case "cud": {
      ctx.save(), ctx.globalCompositeOperation = "lighter";
      const I = wolnoRuszac() ? 0.75 + 0.25 * Math.sin(o * 4e-3) : 0.9, Y = ctx.createLinearGradient(-C * 0.16, 0, C * 0.16, 0);
      Y.addColorStop(0, "rgba(255,230,170,0)"), Y.addColorStop(0.5, `rgba(255,236,190,${0.55 * I * E})`), Y.addColorStop(1, "rgba(255,230,170,0)"), ctx.fillStyle = Y, ctx.fillRect(-C * 0.16, -C * 0.46, C * 0.32, C * 0.82), ctx.restore(), ctx.beginPath(), ctx.arc(0, -C * 0.05, C * 0.06, 0, Math.PI * 2), ctx.stroke(), ctx.beginPath(), ctx.moveTo(0, C * 0.01), ctx.lineTo(0, C * 0.24), ctx.lineTo(-C * 0.08, C * 0.38), ctx.moveTo(0, C * 0.24), ctx.lineTo(C * 0.08, C * 0.38), ctx.moveTo(0, C * 0.07), ctx.lineTo(-C * 0.13, -C * 0.12), ctx.moveTo(0, C * 0.07), ctx.lineTo(C * 0.13, -C * 0.12), ctx.stroke(), ctx.beginPath(), ctx.ellipse(0, -C * 0.2, C * 0.1, C * 0.03, 0, 0, Math.PI * 2), ctx.stroke(), ctx.beginPath(), ctx.ellipse(0, C * 0.39, C * 0.3, C * 0.06, 0, 0, Math.PI * 2), ctx.globalAlpha = 0.6, ctx.stroke();
      break;
    }
    case "modl":
    case "przerwij": {
      for (const I of [-1, 1]) ctx.beginPath(), ctx.moveTo(0, -C * 0.36), ctx.quadraticCurveTo(I * C * 0.18, -C * 0.2, I * C * 0.15, C * 0.1), ctx.lineTo(I * C * 0.22, C * 0.34), ctx.stroke();
      ctx.beginPath(), ctx.moveTo(0, -C * 0.36), ctx.lineTo(0, C * 0.2), ctx.stroke(), M === "przerwij" && (ctx.strokeStyle = `rgba(200,70,50,${0.9 * E})`, ctx.beginPath(), ctx.moveTo(-C * 0.32, C * 0.32), ctx.lineTo(C * 0.32, -C * 0.32), ctx.stroke());
      break;
    }
    case "oltarz": {
      ctx.strokeRect(-C * 0.26, C * 0.08, C * 0.52, C * 0.26), ctx.beginPath(), ctx.moveTo(0, C * 0.08), ctx.lineTo(0, -C * 0.38), ctx.moveTo(-C * 0.12, -C * 0.26), ctx.lineTo(C * 0.12, -C * 0.26), ctx.stroke(), plomyk(ctx, -C * 0.2, C * 0, C * 0.08, o, E), plomyk(ctx, C * 0.2, C * 0, C * 0.08, o, E);
      break;
    }
    case "droga": {
      for (let I = 0; I < 4; I++) {
        const Y = -C * 0.36 + I * C * 0.16, i = -C * 0.28 + I * C * 0.14;
        ctx.globalAlpha = 1 - I * 0.18, ctx.beginPath(), ctx.moveTo(Y, i), ctx.lineTo(Y + C * 0.16, i), ctx.lineTo(Y + C * 0.16, i + C * 0.14), ctx.stroke();
      }
      ctx.globalAlpha = 1, ctx.beginPath(), ctx.moveTo(C * 0.12, C * 0.32), ctx.lineTo(C * 0.32, -C * 0.1), ctx.stroke(), ctx.beginPath(), ctx.arc(C * 0.3, -C * 0.08, C * 0.18, Math.PI * 0.8, Math.PI * 1.95), ctx.stroke();
      break;
    }
    case "naprawa": {
      ctx.beginPath(), ctx.moveTo(-C * 0.04, -C * 0.42), ctx.lineTo(-C * 0.03, -C * 0.08), ctx.moveTo(C * 0.04, C * 0.08), ctx.lineTo(C * 0.03, C * 0.42), ctx.stroke(), ctx.beginPath(), ctx.ellipse(0, 0, C * 0.14, C * 0.09, 0.6, 0, Math.PI * 2), ctx.stroke(), ctx.strokeStyle = `rgba(210,80,60,${0.85 * E})`, ctx.beginPath(), ctx.arc(0, 0, C * 0.3, 0.3, Math.PI * 1.7), ctx.stroke();
      break;
    }
    case "zbroja": {
      const I = new Path2D();
      I.moveTo(-C * 0.26, C * 0.34), I.lineTo(-C * 0.26, -C * 0.1), I.quadraticCurveTo(0, -C * 0.46, C * 0.26, -C * 0.1), I.lineTo(C * 0.26, C * 0.34), I.closePath(), ctx.stroke(I), kreskuj(ctx, I, C, Math.max(2, C * 0.06), 0.8, 0.35 * E), ctx.fillStyle = "rgba(0,0,0,0.9)", ctx.fillRect(-C * 0.2, -C * 0.04, C * 0.4, C * 0.06), ctx.beginPath(), ctx.moveTo(0, -C * 0.36), ctx.lineTo(0, C * 0.34), ctx.stroke();
      break;
    }
  }
  ctx.restore();
}
