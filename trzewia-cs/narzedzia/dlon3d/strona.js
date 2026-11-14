// Kod wstrzykiwany do strony modelu dłoni (alpha-1/scripts/dlon/model.html). Z ORYGINALNEGO modelu — tych samych brył
// (funkcja map() shadera, nietknięta poza trzema dopisanymi przełącznikami) i tej samej kinematyki palców (funkcja
// poza() strony) — robi prawdziwy model 3D: siatkę trójkątów, wagi skóry, szkielet i animacje. Zapis do .glb: buduj.mjs.
//
// Jak: pole odległości liczone shaderem na siatce punktów (plaster po plastrze), z niego siatka metodą „surface nets”
// (jeden wierzchołek na komórkę przeciętą powierzchnią), wierzchołki dociągnięte do powierzchni (krok Newtona po
// gradiencie pola), normalne z gradientu pola, barwa skóry / rogu, okluzja i brud w bruzdach — formułami przepisanymi
// z main() modelu. Skóra i każdy pazur to osobne siatki: pazur jest sztywny i trzyma się ostatniego członu palca.
window.DLON3D = (() => {
  // ------------------------------------------------------------------ shader: oryginał + wyjścia do pieczenia
  const ORYG = document.getElementById('fs').textContent;
  const gdzie = ORYG.indexOf('void main() {');
  if (gdzie < 0) throw new Error('model.html: nie ma „void main() {”');
  let glowa = ORYG.slice(0, gdzie);
  const zamien = (co, na) => {
    if (!glowa.includes(co)) throw new Error('model.html się zmienił — nie ma wiersza: ' + co);
    glowa = glowa.replace(co, na);
  };
  // trzy przełączniki: uTryb 1 — sama skóra, 2 — same pazury (uPazur: który, −1 wszystkie); 0 — całość jak w oryginale
  zamien('uniform float uDetal;', 'uniform float uDetal;\nuniform int uTryb;\nuniform int uPazur;');
  zamien('for (int i = 0; i < 5; i++) dk = min(dk, pazur(p, i, min(d, dk)));',
    'for (int i = 0; i < 5; i++) if (uPazur < 0 || uPazur == i) dk = min(dk, pazur(p, i, uTryb == 2 ? 1e9 : min(d, dk)));');
  zamien('return dk < d ? vec2(smin(d, dk, 0.12), 1.0) : vec2(smin(d, dk, 0.12), 0.0);',
    'if (uTryb == 1) return vec2(d, 0.0);\n  if (uTryb == 2) return vec2(dk, 1.0);\n  return dk < d ? vec2(smin(d, dk, 0.12), 1.0) : vec2(smin(d, dk, 0.12), 0.0);');

  // Każdy tryb (CO) to osobny, mały program: 0 plaster pola, 1 gradient i odległość w punktach, 2 okluzja
  // i wklęsłość, 3 barwa, 4 światło pozy. (Jeden program ze wszystkimi trybami kompilował się na programowym GL minuty.)
  const OGON = `
uniform int uMaterial;      // 0 skóra, 1 pazur
uniform vec3 uP0;
uniform float uH;
uniform float uZ;
uniform float uE;
uniform sampler2D uPunkty;
uniform sampler2D uNormalne;
uniform sampler2D uOkluzja;
uniform vec3 uL1;           // ciepłe światło lampek (punkt) w przestrzeni modelu
uniform vec3 uL2;           // kierunek łuny otchłani (anielska: złotego światła) w przestrzeni modelu

vec3 gradient(vec3 p, float e) {
  const vec2 k = vec2(1.0, -1.0);
  return normalize(k.xyy * map(p + k.xyy * e).x + k.yyx * map(p + k.yyx * e).x + k.yxy * map(p + k.yxy * e).x + k.xxx * map(p + k.xxx * e).x);
}

// --- barwy: przepisane z main() modelu (te same wiersze, bez światła) ---
// skóra dłoni z otchłani: popielata, martwa, z sinymi i rdzawymi plamami; w bruzdach brud
vec3 skoraOtchlani(vec3 p, vec3 n, float wkl, float ao, out float volar) {
  float f1 = fbm5(p * 0.8), f2 = fbm5(p * 3.4 + 7.0), f3 = fbm5(p * 11.0 + 3.0);
  vec3 alb = vec3(0.092, 0.088, 0.09);
  alb = mix(alb, vec3(0.115, 0.07, 0.065), smoothstep(0.45, 0.75, f1) * 0.7);
  alb = mix(alb, vec3(0.06, 0.062, 0.075), smoothstep(0.5, 0.8, f2) * 0.6);
  alb *= 0.82 + 0.36 * f3;
  vec3 nm = uRot * n, pm = uRot * p;
  volar = smoothstep(0.2, -0.6, nm.y) * smoothstep(-7.0, -1.5, pm.x);
  vec3 albV = mix(vec3(0.106, 0.096, 0.096), vec3(0.118, 0.1, 0.098), smoothstep(0.3, 0.7, f1));
  albV *= 0.9 + 0.2 * f3;
  albV = mix(albV, vec3(0.095, 0.085, 0.088), smoothstep(0.55, 0.85, f2) * 0.5);
  float wnL = smoothstep(-0.3, -1.0, pm.y) * (1.0 - smoothstep(10.0, 11.0, pm.x)) * smoothstep(-2.0, -1.0, pm.x);
  float lin = wnL * sqrt(linieDloni(pm));
  albV *= 1.0 - 0.42 * lin;
  alb = mix(alb, albV, volar);
  float kost = 0.0;
  for (int i = 0; i < 5; i++) {
    vec3 K1 = uF[i * 4 + 1] + uU[i * 3 + 1] * uR[i].y * 0.7, K2 = uF[i * 4 + 2] + uU[i * 3 + 2] * uR[i].z * 0.7;
    kost += exp(-dot(pm - K1, pm - K1) / (uR[i].y * uR[i].y * 0.9)) + 0.7 * exp(-dot(pm - K2, pm - K2) / (uR[i].z * uR[i].z * 0.9));
    if (i > 0) { vec3 K0 = uF[i * 4] + uU[(i) * 3] * uR[i].x * 0.9; kost += exp(-dot(pm - K0, pm - K0) / (uR[i].x * uR[i].x * 1.3)); }
  }
  alb = mix(alb, alb * vec3(0.9, 0.58, 0.58), clamp(kost, 0.0, 1.0) * (1.0 - volar) * 0.9);
  alb = mix(alb, alb * vec3(0.8, 0.6, 0.85), zylyDloni(pm) * (1.0 - volar) * 0.75);
  alb *= mix(mix(0.45, 0.62, volar), 1.0, wkl) * (0.7 + 0.3 * ao);
  return alb;
}
// skóra dłoni anielskiej: żywa, ciepła, z rumieńcem na opuszkach, stawach i we wnętrzu dłoni
vec3 skoraAniola(vec3 p, vec3 n, float wkl, float ao, out float volar) {
  float f1 = fbm5(p * 0.8), f3 = fbm5(p * 11.0 + 3.0);
  vec3 nm = uRot * n, pm = uRot * p;
  vec3 alb = mix(vec3(0.64, 0.42, 0.31), vec3(0.72, 0.5, 0.37), f1) * (0.9 + 0.14 * f3);
  float rum = 0.0;
  for (int i = 0; i < 5; i++) {
    vec3 c3 = pm - uF[i * 4 + 3], c1 = pm - uF[i * 4 + 1];
    rum += exp(-dot(c3, c3) / (uR[i].w * uR[i].w * 3.0)) + 0.5 * exp(-dot(c1, c1) / (uR[i].y * uR[i].y * 1.2));
  }
  volar = smoothstep(0.2, -0.6, nm.y) * smoothstep(-7.0, -1.5, pm.x);
  alb = mix(alb, alb * vec3(1.12, 0.7, 0.6), clamp(rum, 0.0, 1.0) * 0.85 + volar * 0.35);
  alb *= mix(0.5, 1.0, wkl) * (0.66 + 0.34 * ao);
  return alb;
}
// róg szponu: u łożyska prawie czarny, ku ostrzu trochę jaśniejszy; ostrze — 0 u łożyska, 1 na czubku
vec3 rogSzponu(vec3 p, out float ostrze) {
  vec3 pmk = uRot * p;
  ostrze = 0.0; float dmin = 1e9;
  for (int i = 0; i < 5; i++) {
    for (int k = 0; k < 4; k++) {
      vec3 A = uK[i * 5 + k], B = uK[i * 5 + k + 1];
      vec3 pa = pmk - A, ba = B - A;
      float hh = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
      float dd = length(pa - ba * hh);
      if (dd < dmin) { dmin = dd; ostrze = (float(k) + hh) / 4.0; }
    }
  }
  float prazki = 0.9 + 0.1 * sin(dot(p, vec3(4.0, 17.0, 9.0)) * 1.6 + 3.0 * vnoise(p * 3.0));
  vec3 ka = mix(vec3(0.045, 0.034, 0.025), vec3(0.08, 0.06, 0.04), fbm3(p * 1.4)) * prazki;
  ka = mix(ka, vec3(0.1, 0.065, 0.04), smoothstep(0.7, 1.0, ostrze));
  return ka;
}

void main() {
  ivec2 ij = ivec2(gl_FragCoord.xy);
#if CO == 0
  vec3 p = uP0 + vec3(float(ij.x) * uH, float(ij.y) * uH, uZ);
  vec2 m = map(p);
  fragColor = vec4(m.x, m.y, 0.0, 1.0);
#else
  vec3 p = texelFetch(uPunkty, ij, 0).xyz;
#if CO == 1
  fragColor = vec4(gradient(p, uE), map(p).x);
#else
  vec3 n = texelFetch(uNormalne, ij, 0).xyz;
#if CO == 2
  // jak w main(): okluzja i wklęsłość (bruzdy, fałdy, szpary między palcami)
  float ao = okluzja(p, n);
  float wkl = clamp(map(p + n * 0.18).x / 0.18, 0.0, 1.0);
  fragColor = vec4(ao, wkl, 0.0, 1.0);
#endif
#if CO == 4
  // światło pozy: wierzchołek (po skórze szkieletu) dociągnięty do powierzchni brył tej pozy, potem cienie i okluzja
  // jak w main() modelu. Punkt, którego dociągnąć się nie da (wnętrze pięści), zostaje — wypada w cieniu.
  vec3 q = p;
  for (int i = 0; i < 5; i++) { float d = map(q).x; if (abs(d) < 0.004) break; q -= clamp(d, -0.3, 0.3) * gradient(q, 0.01); }
  vec3 nq = gradient(q, 0.02);
  if (abs(map(q).x) > 0.05 || dot(nq, n) < 0.0) { q = p; nq = n; }
  vec3 Ld = uL1 - q; float Ldist = length(Ld);
  float c1 = uAniol > 0.5 ? cien(q + nq * 0.08, uL2, 30.0) : cien(q + nq * 0.08, Ld / Ldist, Ldist);
  float c2 = uAniol > 0.5 ? 1.0 : cien(q + nq * 0.08, uL2, 26.0);
  fragColor = vec4(c1, c2, okluzja(q, nq), 1.0);
#endif
#if CO == 3
  vec4 o = texelFetch(uOkluzja, ij, 0);
  float dod = 0.0;
  vec3 alb;
  if (uMaterial == 1) alb = uAniol > 0.5 ? vec3(0.76, 0.5, 0.42) : rogSzponu(p, dod);
  else alb = uAniol > 0.5 ? skoraAniola(p, n, o.y, o.x, dod) : skoraOtchlani(p, n, o.y, o.x, dod);
  if (uMaterial == 1 && uAniol > 0.5) { float x; rogSzponu(p, x); dod = x; }
  fragColor = vec4(alb, dod);
#endif
#endif
#endif
}`;

  const plotno = document.createElement('canvas');
  const g = plotno.getContext('webgl2', { antialias: false });
  if (!g) throw new Error('brak WebGL2');
  if (!g.getExtension('EXT_color_buffer_float')) throw new Error('brak EXT_color_buffer_float (rysowanie do tekstur zmiennoprzecinkowych)');
  const kompiluj = (typ, src) => {
    const s = g.createShader(typ); g.shaderSource(s, src); g.compileShader(s);
    if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(s));
    return s;
  };
  const WIERZCH = kompiluj(g.VERTEX_SHADER, '#version 300 es\nin vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }');
  const bufor = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, bufor);
  g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), g.STATIC_DRAW);
  const programy = {};
  let pr = null;
  const u = (n) => g.getUniformLocation(pr, n);
  /** Stan wspólny wszystkich programów: poza dłoni, rodzaj dłoni, wypełnienie pięści, światła. */
  const stan = { p: null, aniol: 0, piesc: 0, L1: [25, 5, -8], L2: [0, 1, 0] };
  /** Włącza program trybu `co` (kompiluje przy pierwszym użyciu) i wgrywa mu stan. */
  function uzyj(co) {
    if (!programy[co]) {
      const q = g.createProgram();
      g.attachShader(q, WIERZCH);
      g.attachShader(q, kompiluj(g.FRAGMENT_SHADER, glowa + '\n#define CO ' + co + '\n' + OGON));
      g.bindAttribLocation(q, 0, 'p');
      g.linkProgram(q);
      if (!g.getProgramParameter(q, g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(q));
      programy[co] = q;
    }
    pr = programy[co];
    g.useProgram(pr);
    g.bindBuffer(g.ARRAY_BUFFER, bufor);
    g.enableVertexAttribArray(0); g.vertexAttribPointer(0, 2, g.FLOAT, false, 0, 0);
    const p = stan.p;
    g.uniformMatrix3fv(u('uRot'), false, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
    g.uniform1f(u('uAniol'), stan.aniol);
    g.uniform1f(u('uPiesc'), stan.piesc);
    g.uniform3fv(u('uF'), p.F.flat());
    g.uniform4fv(u('uR'), p.R.flat());
    g.uniform3fv(u('uU'), p.Uv.flat());
    g.uniform3fv(u('uK'), p.K.flat());
    g.uniform3fv(u('uKR'), p.KR.flat());
    g.uniform3fv(u('uMw'), p.MW.flat());
    g.uniform1f(u('uDetal'), 1);
    g.uniform3fv(u('uL1'), stan.L1);
    g.uniform3fv(u('uL2'), stan.L2);
  }
  function ustawPoze(p, aniol, piesc = 0) { stan.p = p; stan.aniol = aniol; stan.piesc = piesc; }

  function tekstura(w, h, dane) {
    const t = g.createTexture();
    g.bindTexture(g.TEXTURE_2D, t);
    g.texImage2D(g.TEXTURE_2D, 0, g.RGBA32F, w, h, 0, g.RGBA, g.FLOAT, dane);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
    return t;
  }
  function cel(w, h) {
    const t = tekstura(w, h, null);
    g.bindTexture(g.TEXTURE_2D, null);            // cel nie może zostać podpięty jako tekstura do czytania (pętla zwrotna)
    const fb = g.createFramebuffer();
    g.bindFramebuffer(g.FRAMEBUFFER, fb);
    g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, t, 0);
    if (g.checkFramebufferStatus(g.FRAMEBUFFER) !== g.FRAMEBUFFER_COMPLETE) throw new Error('bufor ramki RGBA32F niekompletny');
    g.viewport(0, 0, w, h);
    return { fb, t };
  }
  const sprzataj = (c) => { g.bindFramebuffer(g.FRAMEBUFFER, null); g.deleteFramebuffer(c.fb); g.deleteTexture(c.t); };

  /** Pole odległości na siatce nx × ny × nz punktów od p0 co h. */
  function pole(tryb, pazur, p0, h, nx, ny, nz) {
    uzyj(0);
    const c = cel(nx, ny);
    g.uniform1i(u('uTryb'), tryb); g.uniform1i(u('uPazur'), pazur);
    g.uniform3f(u('uP0'), p0[0], p0[1], p0[2]); g.uniform1f(u('uH'), h);
    const wynik = new Float32Array(nx * ny * nz), buf = new Float32Array(nx * ny * 4);
    for (let k = 0; k < nz; k++) {
      g.uniform1f(u('uZ'), k * h);
      g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
      g.readPixels(0, 0, nx, ny, g.RGBA, g.FLOAT, buf);
      const o = k * nx * ny;
      for (let i = 0; i < nx * ny; i++) wynik[o + i] = buf[i * 4];
    }
    sprzataj(c);
    return wynik;
  }

  const SZER = 512;
  const doRgba = (dane, ile, n) => {
    const h = Math.max(1, Math.ceil(n / SZER));
    const t = new Float32Array(SZER * h * 4);
    for (let i = 0; i < n; i++) for (let k = 0; k < ile; k++) t[i * 4 + k] = dane[i * ile + k];
    return { t, h };
  };
  /** Przebieg po punktach: co 1 — [gradient, odległość], 2 — [okluzja, wklęsłość], 3 — [barwa, dodatek]. Zwraca n × 4. */
  function wPunktach(co, tryb, pazur, punkty, opcje = {}) {
    uzyj(co);
    const n = punkty.length / 3;
    const a = doRgba(punkty, 3, n);
    const tp = tekstura(SZER, a.h, a.t);
    let tn = null, to = null;
    if (opcje.normalne) tn = tekstura(SZER, a.h, doRgba(opcje.normalne, 3, n).t);
    if (opcje.okluzja) to = tekstura(SZER, a.h, doRgba(opcje.okluzja, 4, n).t);
    const c = cel(SZER, a.h);
    g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, tp); g.uniform1i(u('uPunkty'), 0);
    g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, tn); g.uniform1i(u('uNormalne'), 1);
    g.activeTexture(g.TEXTURE2); g.bindTexture(g.TEXTURE_2D, to); g.uniform1i(u('uOkluzja'), 2);
    g.activeTexture(g.TEXTURE0);
    g.uniform1i(u('uTryb'), tryb); g.uniform1i(u('uPazur'), pazur);
    g.uniform1i(u('uMaterial'), opcje.material ?? 0); g.uniform1f(u('uE'), opcje.e ?? 0.01);
    const wynik = new Float32Array(SZER * a.h * 4);
    // pasami — długi shader na programowym GL potrafi przekroczyć czas jednego wywołania
    g.enable(g.SCISSOR_TEST);
    const pas = co === 4 ? 2 : 8;
    for (let y = 0; y < a.h; y += pas) { g.scissor(0, y, SZER, Math.min(pas, a.h - y)); g.drawArrays(g.TRIANGLE_STRIP, 0, 4); g.finish(); }
    g.disable(g.SCISSOR_TEST);
    g.readPixels(0, 0, SZER, a.h, g.RGBA, g.FLOAT, wynik);
    sprzataj(c); g.deleteTexture(tp); if (tn) g.deleteTexture(tn); if (to) g.deleteTexture(to);
    return wynik.subarray(0, n * 4);
  }

  // ------------------------------------------------------------------ siatka z pola: surface nets
  const KRAWEDZIE = [];
  for (const bit of [1, 2, 4]) for (let a = 0; a < 8; a++) if (!(a & bit)) KRAWEDZIE.push([a, a | bit]);

  function siatkaZPola(d, nx, ny, nz, p0, h) {
    const P = (i, j, k) => d[i + nx * (j + ny * k)];
    const cx = nx - 1, cy = ny - 1, cz = nz - 1;
    const nr = new Int32Array(cx * cy * cz).fill(-1);
    const C = (i, j, k) => nr[i + cx * (j + cy * k)];
    const wierz = [];
    const v = new Float64Array(8);
    for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
      let maska = 0;
      for (let c = 0; c < 8; c++) { v[c] = P(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1)); if (v[c] < 0) maska |= 1 << c; }
      if (maska === 0 || maska === 255) continue;
      if (i === 0 || j === 0 || k === 0 || i === cx - 1 || j === cy - 1 || k === cz - 1) throw new Error(`powierzchnia dotyka brzegu siatki (${i},${j},${k})`);
      let sx = 0, sy = 0, sz = 0, n = 0;
      for (const [a, b] of KRAWEDZIE) {
        if ((v[a] < 0) === (v[b] < 0)) continue;
        const t = v[a] / (v[a] - v[b]);
        sx += (a & 1) + t * ((b & 1) - (a & 1));
        sy += ((a >> 1) & 1) + t * (((b >> 1) & 1) - ((a >> 1) & 1));
        sz += ((a >> 2) & 1) + t * (((b >> 2) & 1) - ((a >> 2) & 1));
        n++;
      }
      nr[i + cx * (j + cy * k)] = wierz.length / 3;
      wierz.push(p0[0] + (i + sx / n) * h, p0[1] + (j + sy / n) * h, p0[2] + (k + sz / n) * h);
    }
    const troj = [];
    const kw = (a, b, c, e, odwroc) => {
      if (a < 0 || b < 0 || c < 0 || e < 0) throw new Error('surface nets: brak wierzchołka komórki');
      // podział po krótszej przekątnej
      const dl = (p, q) => (wierz[p * 3] - wierz[q * 3]) ** 2 + (wierz[p * 3 + 1] - wierz[q * 3 + 1]) ** 2 + (wierz[p * 3 + 2] - wierz[q * 3 + 2]) ** 2;
      const t = dl(a, c) <= dl(b, e) ? [a, b, c, a, c, e] : [a, b, e, b, c, e];
      if (odwroc) for (let i = 0; i < 6; i += 3) troj.push(t[i], t[i + 2], t[i + 1]); else troj.push(...t);
    };
    for (let k = 1; k < cz; k++) for (let j = 1; j < cy; j++) for (let i = 1; i < cx; i++) {
      const d0 = P(i, j, k);
      const dX = P(i + 1, j, k), dY = P(i, j + 1, k), dZ = P(i, j, k + 1);
      if ((d0 < 0) !== (dX < 0)) kw(C(i, j - 1, k - 1), C(i, j, k - 1), C(i, j, k), C(i, j - 1, k), d0 > 0);
      if ((d0 < 0) !== (dY < 0)) kw(C(i - 1, j, k - 1), C(i - 1, j, k), C(i, j, k), C(i, j, k - 1), d0 > 0);
      if ((d0 < 0) !== (dZ < 0)) kw(C(i - 1, j - 1, k), C(i, j - 1, k), C(i, j, k), C(i - 1, j, k), d0 > 0);
    }
    return { wierz: new Float32Array(wierz), troj: new Uint32Array(troj) };
  }

  /** Dociąga wierzchołki do powierzchni pola (kroki Newtona) i zwraca normalne. `stale(i)` — których nie ruszać. */
  function dociagnij(s, tryb, pazur, h, eNorm, stale) {
    const n = s.wierz.length / 3;
    for (let krok = 0; krok < 3; krok++) {
      const w = wPunktach(1, tryb, pazur, s.wierz, { e: 0.01 });
      for (let i = 0; i < n; i++) {
        if (stale && stale(i)) continue;
        const dd = Math.max(-h, Math.min(h, w[i * 4 + 3]));
        for (let k = 0; k < 3; k++) s.wierz[i * 3 + k] -= dd * w[i * 4 + k];
      }
    }
    const w = wPunktach(1, tryb, pazur, s.wierz, { e: eNorm });
    const norm3 = new Float32Array(n * 3);
    let blad = 0;
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 3; k++) norm3[i * 3 + k] = w[i * 4 + k];
      if (!(stale && stale(i))) blad = Math.max(blad, Math.abs(w[i * 4 + 3]));
    }
    return { normalne: norm3, blad };
  }

  // ------------------------------------------------------------------ szkielet
  const NAZWY = ['dlon', 'kciuk1', 'kciuk2', 'kciuk3', 'wskazujacy1', 'wskazujacy2', 'wskazujacy3', 'srodkowy1', 'srodkowy2', 'srodkowy3',
    'serdeczny1', 'serdeczny2', 'serdeczny3', 'maly1', 'maly2', 'maly3'];
  const RODZIC = [-1, 0, 1, 2, 0, 4, 5, 0, 7, 8, 0, 10, 11, 0, 13, 14];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  /** Układy kości w przestrzeni modelu dla pozy: [X (wzdłuż kości), Y (grzbiet), Z, początek] — 16 kości. */
  function ukladyKosci(p) {
    const k = [{ X: [1, 0, 0], Y: [0, 1, 0], Z: [0, 0, 1], O: [0, 0, 0] }];
    for (let c = 0; c < 5; c++) for (let j = 0; j < 3; j++) {
      const O = p.F[c * 4 + j];
      const X = norm(sub(p.F[c * 4 + j + 1], O));
      let Y = p.Uv[c * 3 + j];
      Y = norm(sub(Y, mul(X, dot(Y, X))));
      k.push({ X, Y, Z: cross(X, Y), O });
    }
    return k;
  }
  /** Kwaternion [x, y, z, w] z macierzy obrotu o kolumnach X, Y, Z. */
  function kwaternion(X, Y, Z) {
    const m00 = X[0], m10 = X[1], m20 = X[2], m01 = Y[0], m11 = Y[1], m21 = Y[2], m02 = Z[0], m12 = Z[1], m22 = Z[2];
    const tr = m00 + m11 + m22;
    let q;
    if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; q = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, s / 4]; }
    else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; q = [s / 4, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s]; }
    else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; q = [(m01 + m10) / s, s / 4, (m12 + m21) / s, (m02 - m20) / s]; }
    else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; q = [(m02 + m20) / s, (m12 + m21) / s, s / 4, (m10 - m01) / s]; }
    const l = Math.hypot(...q);
    return q.map((x) => x / l);
  }
  /** Lokalne przekształcenia kości (względem rodzica) dla pozy; `obrot` — obrót całej dłoni wokół osi przedramienia. */
  function lokalne(p, obrot) {
    const k = ukladyKosci(p);
    const wynik = [];
    // widok modelu: punkt w przestrzeni obrazu = Rx(−obrot) · punkt modelu (uRot w shaderze to Rx(obrot) w drugą stronę)
    const co = Math.cos(-obrot), si = Math.sin(-obrot);
    wynik.push({ t: [0, 0, 0], r: kwaternion([1, 0, 0], [0, co, si], [0, -si, co]) });
    for (let i = 1; i < 16; i++) {
      const r = k[RODZIC[i]], b = k[i];
      const wR = (v) => [dot(v, r.X), dot(v, r.Y), dot(v, r.Z)];   // wektor w układzie rodzica
      wynik.push({ t: wR(sub(b.O, r.O)), r: kwaternion(wR(b.X), wR(b.Y), wR(b.Z)) });
    }
    return wynik;
  }

  // ------------------------------------------------------------------ wagi skóry
  const gladki = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  function wagiSkory(wierz, p) {
    const n = wierz.length / 3;
    const kosci = new Uint8Array(n * 4), wagi = new Float32Array(n * 4);
    const lanc = [];
    for (let c = 0; c < 5; c++) {
      const P = [0, 1, 2, 3].map((j) => p.F[c * 4 + j]);
      const d = [0, 1, 2].map((j) => norm(sub(P[j + 1], P[j])));
      const L = [0, 1, 2].map((j) => Math.hypot(...sub(P[j + 1], P[j])));
      lanc.push({ P, d, L, r: p.R[c], n1: norm(add(d[0], d[1])), n2: norm(add(d[1], d[2])) });
    }
    const w = new Float64Array(16), D = new Float64Array(5), wl = [];
    for (let i = 0; i < n; i++) {
      const v = [wierz[i * 3], wierz[i * 3 + 1], wierz[i * 3 + 2]];
      let Dmin = 1e9;
      for (let c = 0; c < 5; c++) {
        const l = lanc[c];
        // najbliższy punkt łamanej palca i promień palca w tym miejscu
        let best = 1e9;
        for (let j = 0; j < 3; j++) {
          const t = Math.max(0, Math.min(1, dot(sub(v, l.P[j]), l.d[j]) / l.L[j]));
          const q = add(l.P[j], mul(l.d[j], t * l.L[j]));
          const rr = l.r[j] + (l.r[j + 1] - l.r[j]) * t;
          best = Math.min(best, Math.hypot(...sub(v, q)) / rr);
        }
        D[c] = best; Dmin = Math.min(Dmin, best);
        // wzdłuż palca: strefy przejścia przy stawach (płaszczyzny dwusieczne zgięć)
        const s0 = dot(sub(v, l.P[0]), l.d[0]);
        const b0 = c === 0 ? gladki(-0.22 * l.L[0], 0.42 * l.L[0], s0) : gladki(-1.0 * l.r[0], 1.0 * l.r[0], s0);
        const b1 = gladki(-0.9 * l.r[1], 0.9 * l.r[1], dot(sub(v, l.P[1]), l.n1));
        const b2 = gladki(-0.9 * l.r[2], 0.9 * l.r[2], dot(sub(v, l.P[2]), l.n2));
        wl[c] = [b0 * (1 - b1), b0 * b1 * (1 - b2), b0 * b1 * b2];
      }
      w.fill(0);
      let suma = 0;
      for (let c = 0; c < 5; c++) suma += Math.exp(-10 * (D[c] - Dmin));
      let kosciPalcow = 0;
      for (let c = 0; c < 5; c++) {
        const m = Math.exp(-10 * (D[c] - Dmin)) / suma;          // do którego palca wierzchołek należy
        const bok = 1 - gladki(1.35, 2.3, D[c]);                  // daleko od osi palca — już dłoń
        for (let j = 0; j < 3; j++) { const x = m * bok * wl[c][j]; w[1 + c * 3 + j] += x; kosciPalcow += x; }
      }
      w[0] = Math.max(0, 1 - kosciPalcow);
      // cztery najsilniejsze kości
      const kol = Array.from(w.keys()).sort((a, b) => w[b] - w[a]).slice(0, 4);
      let s4 = 0; for (const k of kol) s4 += w[k];
      for (let k = 0; k < 4; k++) { const x = w[kol[k]] / s4; kosci[i * 4 + k] = x > 0 ? kol[k] : 0; wagi[i * 4 + k] = x; }
    }
    return { kosci, wagi };
  }

  // ------------------------------------------------------------------ całość
  const H_SKORY = 0.2, H_PAZURA = 0.09, X_CIECIA = -18.0;
  /** Kość 16 „piesc”: łatka wypełniająca wnętrze zaciśniętej pięści (w shaderze: uPiesc) — rośnie ze skali ~0 do 1. */
  const SRODEK_PIESCI = [9.05, -2.025, -0.2];
  const SKALA_ZERO = 0.001;
  const pieszczenie = (zg) => ss(0.6, 0.9, zg);

  /**
   * Wnętrze pięści: w modelu dwie bryły (uPiesc) zlewają się z palcami i dłonią, żeby przez pięść nie było widać na
   * wylot. Tu: kawałek powierzchni zaciśniętej pięści tam, gdzie te bryły ją zmieniają — osobna łatka przy kości „piesc”.
   */
  function latkaPiesci() {
    const pp = poza(1, 0);
    ustawPoze(pp, 0, 1);
    const h = 0.16, lo = [2.4, -6.6, -7.2], hi = [12.6, 1.3, 5.6];
    const wym = [0, 1, 2].map((k) => Math.ceil((hi[k] - lo[k]) / h) + 1);
    const d = pole(1, -1, lo, h, wym[0], wym[1], wym[2]);
    // brzeg pudła zamknięty (palce i dłoń przez nie przechodzą) — te ścianki i tak odpadają niżej
    for (let k = 0; k < wym[2]; k++) for (let j = 0; j < wym[1]; j++) for (let i = 0; i < wym[0]; i++) {
      if (i < 2 || j < 2 || k < 2 || i > wym[0] - 3 || j > wym[1] - 3 || k > wym[2] - 3) d[i + wym[0] * (j + wym[1] * k)] = 1;
    }
    const s = siatkaZPola(d, wym[0], wym[1], wym[2], lo, h);
    const n = s.wierz.length / 3;
    const przyBrzegu = (i) => [0, 1, 2].some((k) => s.wierz[i * 3 + k] < lo[k] + 3.2 * h || s.wierz[i * 3 + k] > hi[k] - 3.2 * h);
    const ds = dociagnij(s, 1, -1, h, 0.05, przyBrzegu);
    s.normalne = ds.normalne;
    // gdzie pięść bez wypełnienia byłaby głębiej — tam łatka jest potrzebna
    stan.piesc = 0;
    const bez = wPunktach(1, 1, -1, s.wierz, { e: 0.01 });
    stan.piesc = 1;
    const zostaje = new Uint8Array(n);
    for (let i = 0; i < n; i++) zostaje[i] = !przyBrzegu(i) && bez[i * 4 + 3] > 0.03 ? 1 : 0;
    // z zakładką: dwa pierścienie trójkątów dalej — skóra ugięta kośćmi nie leży dokładnie tam, gdzie bryły pięści,
    // więc łatka musi zachodzić na palce i kciuk, inaczej zostają szpary
    for (let r = 0; r < 2; r++) {
      const dalej = zostaje.slice();
      for (let t = 0; t < s.troj.length; t += 3) {
        const a = s.troj[t], b = s.troj[t + 1], c = s.troj[t + 2];
        if (zostaje[a] || zostaje[b] || zostaje[c]) { if (!przyBrzegu(a)) dalej[a] = 1; if (!przyBrzegu(b)) dalej[b] = 1; if (!przyBrzegu(c)) dalej[c] = 1; }
      }
      zostaje.set(dalej);
    }
    const nowy = new Int32Array(n).fill(-1), wierz = [], norm3 = [], troj = [];
    for (let t = 0; t < s.troj.length; t += 3) {
      const a = s.troj[t], b = s.troj[t + 1], c = s.troj[t + 2];
      if (!(zostaje[a] && zostaje[b] && zostaje[c])) continue;
      for (const v of [a, b, c]) {
        if (nowy[v] < 0) { nowy[v] = wierz.length / 3; for (let k = 0; k < 3; k++) { wierz.push(s.wierz[v * 3 + k]); norm3.push(s.normalne[v * 3 + k]); } }
        troj.push(nowy[v]);
      }
    }
    const l = { wierz: new Float32Array(wierz), normalne: new Float32Array(norm3), troj: new Uint32Array(troj) };
    const ok = wPunktach(2, 0, -1, l.wierz, { normalne: l.normalne });
    l.barwa = wPunktach(3, 0, -1, l.wierz, { normalne: l.normalne, okluzja: ok, material: 0 });
    l.okluzja = ok;
    l.kosc = 16;
    return l;
  }

  // ---- skóra szkieletu po stronie narzędzia (to samo liczy gra) — do pieczenia światła póz
  /** Macierze kości [R (9, wierszami), t (3)]: poza ← spoczynek; kość 16 — skala wokół środka pięści. */
  function macierzeSkory(spocz, p, skalaPiesci) {
    const a = ukladyKosci(spocz), b = ukladyKosci(p), m = [];
    for (let i = 0; i < 16; i++) {
      const R = [];
      for (let w = 0; w < 3; w++) for (let k = 0; k < 3; k++) R.push(b[i].X[w] * a[i].X[k] + b[i].Y[w] * a[i].Y[k] + b[i].Z[w] * a[i].Z[k]);
      const t = [0, 1, 2].map((w) => b[i].O[w] - (R[w * 3] * a[i].O[0] + R[w * 3 + 1] * a[i].O[1] + R[w * 3 + 2] * a[i].O[2]));
      m.push({ R, t });
    }
    const s = skalaPiesci;
    m.push({ R: [s, 0, 0, 0, s, 0, 0, 0, s], t: SRODEK_PIESCI.map((c) => c - s * c) });
    return m;
  }
  function poSkorze(si, mac) {
    const n = si.wierz.length / 3, P = new Float32Array(n * 3), N = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      let px = 0, py = 0, pz = 0, nx = 0, ny = 0, nz = 0;
      const x = si.wierz[i * 3], y = si.wierz[i * 3 + 1], z = si.wierz[i * 3 + 2];
      const a = si.normalne[i * 3], b = si.normalne[i * 3 + 1], c = si.normalne[i * 3 + 2];
      for (let k = 0; k < 4; k++) {
        const w = si.wagi ? si.wagi[i * 4 + k] : (k === 0 ? 1 : 0);
        if (w <= 0) continue;
        const m = mac[si.wagi ? si.kosci[i * 4 + k] : si.kosc], R = m.R;
        px += w * (R[0] * x + R[1] * y + R[2] * z + m.t[0]); py += w * (R[3] * x + R[4] * y + R[5] * z + m.t[1]); pz += w * (R[6] * x + R[7] * y + R[8] * z + m.t[2]);
        nx += w * (R[0] * a + R[1] * b + R[2] * c); ny += w * (R[3] * a + R[4] * b + R[5] * c); nz += w * (R[6] * a + R[7] * b + R[8] * c);
      }
      const l = Math.hypot(nx, ny, nz) || 1;
      P[i * 3] = px; P[i * 3 + 1] = py; P[i * 3 + 2] = pz; N[i * 3] = nx / l; N[i * 3 + 1] = ny / l; N[i * 3 + 2] = nz / l;
    }
    return { P, N };
  }
  const Rx = (v, kat) => [v[0], v[1] * Math.cos(kat) - v[2] * Math.sin(kat), v[1] * Math.sin(kat) + v[2] * Math.cos(kat)];

  /**
   * Światło jednej pozy dla wszystkich wierzchołków (w kolejności: skóra, łatka, pazury): [cień ciepłego światła,
   * cień łuny, okluzja] w bajtach. Liczone oryginalnymi funkcjami cien() i okluzja() na bryłach tej pozy.
   */
  function swiatloPozy(czesci, spocz, p, obrot, piesc, aniol) {
    ustawPoze(p, aniol, piesc);
    // światła z main() modelu (przestrzeń obrazu) przeniesione do przestrzeni modelu: Rx(obrot)
    stan.L1 = Rx([25, 5, -8], obrot);
    stan.L2 = Rx(aniol ? norm([-0.7, 0.5, -0.5]) : norm([-0.75, 0.3, 0.6]), obrot);
    const mac = macierzeSkory(spocz, p, Math.max(SKALA_ZERO, piesc));
    const wynik = new Uint8Array(czesci.reduce((x, si) => x + si.wierz.length, 0));
    let o = 0;
    for (const si of czesci) {
      const { P, N } = poSkorze(si, mac);
      const w = wPunktach(4, 0, -1, P, { normalne: N });
      for (let i = 0; i < P.length / 3; i++) for (let k = 0; k < 3; k++) wynik[o++] = Math.round(Math.max(0, Math.min(1, w[i * 4 + k])) * 255);
    }
    return wynik;
  }

  function buduj(aniol, klipyPoz, bezSwiatla) {
    const p = poza(0, aniol);
    ustawPoze(p, aniol);
    const dziennik = [];

    // skóra: pudło z zapasem wokół stawów i przedramienia
    const lo = [X_CIECIA - 3 * H_SKORY, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    const obejmij = (q, r) => { for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], q[k] - r); hi[k] = Math.max(hi[k], q[k] + r); } };
    for (const q of p.F) obejmij(q, 2.4);
    obejmij([-19, 0, 0.2], 4.6); obejmij([-13, 0.9, 0.6], 4.4); obejmij([-11, -0.8, -1.4], 3.6);
    lo[0] = X_CIECIA - 3 * H_SKORY;
    const wym = [0, 1, 2].map((k) => Math.ceil((hi[k] - lo[k]) / H_SKORY) + 1);
    const d = pole(1, -1, lo, H_SKORY, wym[0], wym[1], wym[2]);
    // ucięcie ramienia: za X_CIECIA nic (tam dłoń jest już całkiem przezroczysta)
    for (let k = 0; k < wym[2]; k++) for (let j = 0; j < wym[1]; j++) for (let i = 0; i < wym[0]; i++) {
      const x = lo[0] + i * H_SKORY, o = i + wym[0] * (j + wym[1] * k);
      d[o] = Math.max(d[o], X_CIECIA - x);
    }
    const skora = siatkaZPola(d, wym[0], wym[1], wym[2], lo, H_SKORY);
    const naCieciu = (i) => skora.wierz[i * 3] < X_CIECIA + 1.5 * H_SKORY;
    const ds = dociagnij(skora, 1, -1, H_SKORY, 0.05, naCieciu);
    skora.normalne = ds.normalne;
    for (let i = 0; i < skora.wierz.length / 3; i++) if (naCieciu(i)) { skora.normalne[i * 3] = -1; skora.normalne[i * 3 + 1] = 0; skora.normalne[i * 3 + 2] = 0; }
    dziennik.push(`skóra: siatka ${wym.join('×')}, ${skora.wierz.length / 3} wierzchołków, ${skora.troj.length / 3} trójkątów, błąd dociągnięcia ${ds.blad.toFixed(4)}`);
    const ok = wPunktach(2, 0, -1, skora.wierz, { normalne: skora.normalne });
    const barwa = wPunktach(3, 0, -1, skora.wierz, { normalne: skora.normalne, okluzja: ok, material: 0 });
    skora.barwa = barwa; skora.okluzja = ok;
    Object.assign(skora, wagiSkory(skora.wierz, p));

    // pazury: każdy osobno, sztywno przy ostatnim członie swojego palca
    const pazury = [];
    for (let c = 0; c < 5; c++) {
      const K = [0, 1, 2, 3, 4].map((k) => p.K[c * 5 + k]);
      const r0 = p.KR[c][0];
      const lo2 = [1e9, 1e9, 1e9], hi2 = [-1e9, -1e9, -1e9];
      const zapas = r0 + 0.45;
      for (const q of [...K, add(K[0], mul(sub(K[1], K[0]), -0.25))]) for (let k = 0; k < 3; k++) { lo2[k] = Math.min(lo2[k], q[k] - zapas); hi2[k] = Math.max(hi2[k], q[k] + zapas); }
      const w2 = [0, 1, 2].map((k) => Math.ceil((hi2[k] - lo2[k]) / H_PAZURA) + 1);
      const d2 = pole(2, c, lo2, H_PAZURA, w2[0], w2[1], w2[2]);
      const s = siatkaZPola(d2, w2[0], w2[1], w2[2], lo2, H_PAZURA);
      const dp = dociagnij(s, 2, c, H_PAZURA, 0.012, null);
      s.normalne = dp.normalne;
      const ok2 = wPunktach(2, 0, -1, s.wierz, { normalne: s.normalne });
      s.barwa = wPunktach(3, 0, -1, s.wierz, { normalne: s.normalne, okluzja: ok2, material: 1 });
      s.okluzja = ok2;
      s.kosc = 1 + c * 3 + 2;
      dziennik.push(`pazur ${c}: siatka ${w2.join('×')}, ${s.wierz.length / 3} wierzchołków, ${s.troj.length / 3} trójkątów, błąd ${dp.blad.toFixed(4)}`);
      pazury.push(s);
    }

    // wnętrze pięści (tylko dłoń z otchłani — anielska nie zaciska się w pięść)
    let latka = null;
    if (!aniol) {
      latka = latkaPiesci();
      dziennik.push(`wnętrze pięści: ${latka.wierz.length / 3} wierzchołków, ${latka.troj.length / 3} trójkątów`);
      ustawPoze(p, aniol);
    }

    // szkielet w pozie spoczynkowej (otwarta dłoń) i animacje
    const spoczynek = lokalne(p, 0);
    const uklady = ukladyKosci(p);
    const kosci = NAZWY.map((nazwa, i) => ({ nazwa, rodzic: RODZIC[i], X: uklady[i].X, Y: uklady[i].Y, Z: uklady[i].Z, O: uklady[i].O }));
    if (latka) {
      kosci.push({ nazwa: 'piesc', rodzic: 0, X: [1, 0, 0], Y: [0, 1, 0], Z: [0, 0, 1], O: SRODEK_PIESCI });
      spoczynek.push({ t: SRODEK_PIESCI, r: [0, 0, 0, 1], s: [SKALA_ZERO, SKALA_ZERO, SKALA_ZERO] });
    }
    const klipy = [], swiatlo = [];
    const czesci = [skora, ...(latka ? [latka] : []), ...pazury];
    const piecz = (nazwa, klucze) => {
      if (bezSwiatla) return;
      const t0 = performance.now();
      const ile = czesci.reduce((x, si) => x + si.wierz.length, 0);
      const dane = new Uint8Array(ile * klucze.length);
      klucze.forEach((k, i) => dane.set(swiatloPozy(czesci, p, k.p, k.obrot, k.piesc, aniol), i * ile));
      swiatlo.push({ nazwa, czasy: klucze.map((k) => k.czas), dane: b64(dane) });
      dziennik.push(`światło „${nazwa}”: ${klucze.length} póz, ${((performance.now() - t0) / 1000).toFixed(1)} s`);
    };
    {
      const N = 25, klatki = [];
      for (let i = 0; i < N; i++) {
        const z = i / (N - 1), kl = { czas: z, kosci: lokalne(poza(z, aniol), 0) };
        if (latka) { const s = Math.max(SKALA_ZERO, pieszczenie(z)); kl.kosci.push({ t: SRODEK_PIESCI, r: [0, 0, 0, 1], s: [s, s, s] }); }
        klatki.push(kl);
      }
      klipy.push({ nazwa: 'zacisk', klatki });
      piecz('zacisk', (aniol ? [0, 0.25, 0.5, 1] : [0, 0.25, 0.5, 0.7, 0.85, 1]).map((z) => ({ czas: z, p: poza(z, aniol), obrot: 0, piesc: aniol ? 0 : pieszczenie(z) })));
    }
    for (const k of klipyPoz ?? []) {
      const n = k.pozy.length;
      klipy.push({ nazwa: k.nazwa, klatki: k.pozy.map((opis, i) => {
        const kl = { czas: i / (n - 1), kosci: lokalne(pozaZ(opis, aniol), k.obrot) };
        if (latka) kl.kosci.push({ t: SRODEK_PIESCI, r: [0, 0, 0, 1], s: [SKALA_ZERO, SKALA_ZERO, SKALA_ZERO] });
        return kl;
      }) });
      piecz(k.nazwa, k.pozy.map((opis, i) => ({ czas: i / (n - 1), p: pozaZ(opis, aniol), obrot: k.obrot, piesc: pieszczenie(Math.min(...opis.p.flat())) })));
    }
    return { dziennik, skora, pazury, latka, spoczynek, klipy, kosci, swiatlo, stawy: p.F, promienie: p.R };
  }

  // ------------------------------------------------------------------ przekazanie do Node
  const b64 = (t) => {
    const b = new Uint8Array(t.buffer, t.byteOffset, t.byteLength);
    let s = '';
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const paczkaSiatki = (s) => ({
    wierz: b64(s.wierz), troj: b64(s.troj), normalne: b64(s.normalne), barwa: b64(new Float32Array(s.barwa)), okluzja: b64(new Float32Array(s.okluzja)),
    kosci: s.kosci ? b64(s.kosci) : null, wagi: s.wagi ? b64(s.wagi) : null, kosc: s.kosc ?? null,
  });

  return {
    buduj(aniol, klipyPoz, bezSwiatla) {
      const m = buduj(aniol, klipyPoz, bezSwiatla);
      return { ...m, skora: paczkaSiatki(m.skora), pazury: m.pazury.map(paczkaSiatki), latka: m.latka ? paczkaSiatki(m.latka) : null };
    },
  };
})();
