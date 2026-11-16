/**
 * SILNIK 3D (Krąg Trzeci, beta) — po uwagach użytkownika (15.11): „nowy Cerber wygląda jak kukiełka w przedszkolu,
 * nie wygląda ani trochę realistycznie”, „możesz go zrobić 3D”, „dopracuj go mocno, żeby nie wyglądał jak jakaś
 * plastelina”, „nie jestem w stanie nawet stwierdzić, co to ma być za byt… popraw szczegóły”.
 *
 * Bryły anatomiczne (kule, stożki zaokrąglone, elipsoidy) zlewają się gładko w jedno ciało (pola odległości,
 * „smooth min”), a shader WebGL2 śledzi promienie:
 *  - KRÓTKA SIERŚĆ (doberman, pitbull — jak na obrazku referencyjnym): gładka skóra z drobnym włosem w cieniowaniu
 *    i z połyskiem anizotropowym (Kajiya–Kay) wzdłuż kierunku włosa — połysk rysuje mięśnie jak u czarnego psa;
 *  - DŁUGI WŁOS tylko tam, gdzie bryła ma długość włosa (grzywa): powłoka pasm skończonej długości, leżących wzdłuż
 *    skóry, z ciemnymi nasadami i jaśniejszymi końcami;
 *  - cienie miękkie od światła kluczowego, zacienienie kontaktowe, chłodne światło konturowe, czerwona łuna piekła od
 *    dołu; mokre dziąsła, nos i język; oczy ze źrenicą; błoto od dołu; krew w plamach i zaciekach;
 *  - przekrój płaszczyzną (rozerwanie) maluje na cięciu tłuszcz, mięso i kości; kratery (rany) wycinają się z ciała.
 * Render idzie do wspólnego płótna WebGL; wynik ląduje na płótnie 2D (drawImage).
 * Układ: x — przód stworzenia, y — w dół (jak ekran), z — od widza w głąb; kamera patrzy z −z (obrót `yaw`).
 */

export type V3 = [number, number, number];

/** Materiały (shader rozróżnia je po numerze). */
export const MAT = {
  siersc: 0, grzywa: 1, skora: 2, dziasla: 3, zab: 4, jezyk: 5, oko: 6, luski: 7, rog: 8, krew: 9,
  cialo: 10, mieso: 11, kosc: 12, jelita: 13, tluszcz: 14, bloto: 15, kamien: 16, slina: 17, szata: 18, wlosy: 19,
} as const;

export interface Prym {
  /** 0 — kula (a, r1); 1 — stożek zaokrąglony (a→b, r1→r2); 2 — elipsoida (środek a, półosie b, obrót r2 wokół z);
   *  3 — krater (kula odejmowana: rana, barwi na mięso); 4 — wgłębienie (kula odejmowana bez barwienia: nozdrza);
   *  5 — oś kości (niewidoczna; barwi przekrój na biało) */
  typ: number;
  a: V3; b?: V3; r1: number; r2?: number;
  /** promień zlania z resztą (0 — twardo) */
  k?: number;
  mat: number;
  /** szorstkość powierzchni (wybrzuszenia) */
  amp?: number;
  kol: V3;
  /** krew na tej bryle 0…1 */
  krew?: number;
  /** kierunek włosa (domyślnie: wzdłuż stożka / w tył i w dół) i długość długiego włosa (0 — krótka sierść / goła) */
  kier?: V3; wlos?: number;
}

export interface OpcjeRenderu {
  /** lewy górny róg kadru (jednostki świata), szerokość i wysokość kadru (jednostki) */
  x0: number; y0: number; w: number; h: number;
  /** piksele na jednostkę */
  skala: number;
  /** obrót kamery wokół osi pionowej (radiany; + widać więcej przodu i bliższego boku) */
  yaw?: number;
  czas?: number;
  /** płaszczyzna cięcia: zostaje to, co ma dot(p, n) < d */
  ciecie?: { n: V3; d: number; szarp?: number };
  /** jasność sceny */
  swiatlo?: number;
  /** ziarno faktury */
  ziarno?: number;
  /** 0 — szybko (bez długiego włosa i cieni), 1 — pełna jakość */
  jakosc?: number;
  /** błoto od dołu (y w jednostkach, od którego w dół jest błoto) i mokrość powierzchni 0…1 */
  bloto?: number; mokry?: number;
}

const MAX_GRUP = 30;
const MAX_PRYM = 1500;
const KROK = 5;

const VS = `#version 300 es
in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FS = `#version 300 es
precision highp float;
uniform highp sampler2D uTex;  // dane brył: wiersz = bryła, ${KROK} tekseli RGBA32F
uniform int uG;
uniform vec4 uGs[${MAX_GRUP}];
uniform ivec2 uGr[${MAX_GRUP}];
uniform vec2 uRozm;
uniform vec4 uKadr;      // x0, y0, skala, jakosc
uniform mat3 uRot;
uniform vec4 uCiecie;    // n.xyz, d (n = 0 — brak)
uniform vec4 uOgol;      // czas, swiatlo, ziarno, mokry
uniform vec4 uKula;      // sfera obejmująca całość
uniform float uBloto;
uniform float uSzarp;    // poszarpanie brzegu cięcia (rozdarcie, nie cięcie nożem)
out vec4 wyj;

vec4 P(int i, int j){ return texelFetch(uTex, ivec2(j, i), 0); }
int gMaska;
int gNaj;

float h13(vec3 p){ p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float szum(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h13(i), h13(i + vec3(1,0,0)), f.x), mix(h13(i + vec3(0,1,0)), h13(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h13(i + vec3(0,0,1)), h13(i + vec3(1,0,1)), f.x), mix(h13(i + vec3(0,1,1)), h13(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ return 0.5 * szum(p) + 0.28 * szum(p * 2.07 + 3.1) + 0.14 * szum(p * 4.13 + 7.7) + 0.08 * szum(p * 8.3 + 1.3); }

float smin(float a, float b, float k){ if (k <= 0.0) return min(a, b); float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }
float smax(float a, float b, float k){ return -smin(-a, -b, k); }

float sdRC(vec3 p, vec3 a, vec3 b, float r1, float r2){
  vec3 ba = b - a; float l2 = dot(ba, ba); float rr = r1 - r2; float a2 = l2 - rr * rr; float il2 = 1.0 / max(l2, 1e-8);
  vec3 pa = p - a; float y = dot(pa, ba); float z = y - l2;
  vec3 xv = pa * l2 - ba * y; float x2 = dot(xv, xv); float y2 = y * y * l2; float z2 = z * z * l2;
  float k = sign(rr) * rr * rr * x2;
  if (sign(z) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
  if (sign(y) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
  return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
float sdEl(vec3 p, vec3 r){ float k0 = length(p / r); float k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / max(k1, 1e-6); }

float odl(int i, vec3 p, out int typ, out vec4 c){
  vec4 a = P(i, 0), b = P(i, 1); c = P(i, 2);
  typ = int(c.x + 0.5);
  if (typ == 0 || typ == 3 || typ == 4 || typ == 5) return length(p - a.xyz) - a.w;
  if (typ == 1) return sdRC(p, a.xyz, b.xyz, a.w, b.w);
  if (typ == 2) { vec3 q = p - a.xyz; float s1 = sin(-b.w), c1 = cos(-b.w); q.xy = vec2(c1 * q.x - s1 * q.y, s1 * q.x + c1 * q.y); return sdEl(q, max(b.xyz, vec3(1e-4))); }
  return 1e9;
}

float gDbez;
// płaszczyzna rozdarcia z poszarpanym brzegiem (strzępy mięsa, nierówna linia)
float ciecie(vec3 p){ return dot(p, uCiecie.xyz) - uCiecie.w + uSzarp * (fbm(p * 38.0 + 2.0) - 0.5 + 0.6 * (szum(p * 140.0) - 0.5)); }
float mapa(vec3 p){
  float d = 1e9; float amp = 0.0; float najb = 1e9; gNaj = -1;
  for (int g = 0; g < ${MAX_GRUP}; g++) {
    if (g >= uG) break;
    if ((gMaska & (1 << g)) == 0) continue;
    vec4 s = uGs[g];
    if (length(p - s.xyz) - s.w > d + 0.05) continue;
    ivec2 r = uGr[g];
    for (int i = r.x; i < r.x + r.y; i++) {
      int typ; vec4 c;
      float di = odl(i, p, typ, c);
      if (typ == 5) continue;
      if (typ == 3 || typ == 4) { d = smax(d, -di, c.y); continue; }
      d = smin(d, di, c.y);
      if (di < najb) { najb = di; amp = c.w; gNaj = i; }
    }
  }
  if (amp > 0.0 && d < 0.03) d -= amp * (szum(p * vec3(70.0, 30.0, 70.0) + uOgol.z) - 0.5);
  else if (amp < 0.0 && d < 0.05) {
    // kudły: pasma wzdłuż kierunku włosa — szybko w poprzek, wolno wzdłuż; końce postrzępione
    vec3 Tk = normalize(P(gNaj, 4).xyz + vec3(1e-4));
    float wz = dot(p, Tk); vec3 qk = p - Tk * wz;
    float pk = szum(qk * 95.0 + Tk * wz * 9.0 + uOgol.z) * 0.65 + szum(qk * 230.0 + Tk * wz * 20.0 + 4.7) * 0.35;
    d -= -amp * (pk - 0.42);
  }
  gDbez = d;
  if (dot(uCiecie.xyz, uCiecie.xyz) > 0.0) d = max(d, ciecie(p));
  return d;
}

vec3 gKol; float gMat; float gKrew; float gNaKosci; int gNajB; float gPasmo = 1.0;
void barwa(vec3 p){
  vec3 kol = vec3(0.0); float suma = 0.0; float najb = 1e9; float mat = 0.0; float krew = 0.0; gNaKosci = 0.0; gNajB = -1;
  for (int g = 0; g < ${MAX_GRUP}; g++) {
    if (g >= uG) break;
    if ((gMaska & (1 << g)) == 0) continue;
    vec4 s = uGs[g];
    if (length(p - s.xyz) - s.w > 0.08) continue;
    ivec2 r = uGr[g];
    for (int i = r.x; i < r.x + r.y; i++) {
      int typ; vec4 c;
      float di = odl(i, p, typ, c);
      if (typ == 5) { if (di < 0.0) gNaKosci = max(gNaKosci, clamp(-di / max(P(i,0).w, 1e-4), 0.0, 1.0) + 0.001); continue; }
      if (typ == 4) continue;
      if (typ == 3) { if (di < 0.012) { float w = 3.0; kol += vec3(0.4, 0.035, 0.03) * w; suma += w; if (di < najb) { najb = di; mat = 11.0; } } continue; }
      float w = exp(-max(di, 0.0) * 220.0);
      vec4 k3 = P(i, 3);
      kol += k3.rgb * w; krew += k3.a * w; suma += w;
      if (di < najb) { najb = di; mat = c.z; gNajB = i; }
    }
  }
  gKol = suma > 0.0 ? kol / suma : vec3(0.1);
  gKrew = suma > 0.0 ? krew / suma : 0.0;
  gMat = mat;
}

vec3 normalna(vec3 p){
  const vec2 e = vec2(1.0, -1.0) * 0.0014;
  return normalize(e.xyy * mapa(p + e.xyy) + e.yyx * mapa(p + e.yyx) + e.yxy * mapa(p + e.yxy) + e.xxx * mapa(p + e.xxx));
}
float cieniowanie(vec3 p, vec3 n, int ile){
  float o = 0.0, w = 1.0;
  for (int i = 1; i <= 6; i++) { if (i > ile) break; float h = 0.008 * float(i) * float(i); o += (h - mapa(p + n * h)) * w; w *= 0.7; }
  return clamp(1.0 - 2.4 * o, 0.0, 1.0);
}
float cien(vec3 ro, vec3 rd){
  float r = 1.0, t = 0.01;
  for (int i = 0; i < 30; i++) { float h = mapa(ro + rd * t); r = min(r, 8.0 * h / t); t += clamp(h, 0.006, 0.05); if (r < 0.02 || t > 0.9) break; }
  return clamp(r, 0.0, 1.0);
}

vec3 kierWlosa(int i){ vec4 t = P(i, 4); return dot(t.xyz, t.xyz) > 0.0 ? normalize(t.xyz) : vec3(-0.85, 0.5, 0.0); }
// kierunek włosa styczny do skóry; gdy zadany kierunek wbija się w skórę (czoło bryły), włos opada w dół (albo w tył)
vec3 stycznaWlosa(vec3 T0, vec3 n){
  vec3 alt = abs(n.y) < 0.75 ? vec3(0.0, 1.0, 0.0) : vec3(-1.0, 0.0, 0.0);
  T0 = normalize(mix(T0, alt, smoothstep(0.45, 0.85, abs(dot(T0, n)))));
  vec3 T = T0 - n * dot(T0, n);
  return dot(T, T) > 1e-6 ? normalize(T) : T0;
}
float dlWlosa(int i){ return i < 0 ? 0.0 : P(i, 4).w; }
vec3 normBryly(int i, vec3 p){
  vec4 a = P(i, 0), b = P(i, 1), c = P(i, 2);
  int typ = int(c.x + 0.5);
  if (typ == 1) { vec3 ab = b.xyz - a.xyz; float h = clamp(dot(p - a.xyz, ab) / max(dot(ab, ab), 1e-8), 0.0, 1.0); return normalize(p - (a.xyz + ab * h)); }
  if (typ == 2) { vec3 q = p - a.xyz; return normalize(q / max(b.xyz * b.xyz, vec3(1e-6))); }
  return normalize(p - a.xyz);
}

// Światła sceny (kierunek KU światłu): kluczowe — zimne, z góry i z przodu (deszczowe niebo, błyski);
// łuna piekła — ciepła, od dołu; kontra — chłodny kontur zza stwora. Otoczenie: niebo z góry, błoto od dołu.
const vec3 LK = normalize(vec3(0.42, -0.72, -0.55));
const vec3 LF = normalize(vec3(0.3, 0.8, -0.5));
const vec3 LR = normalize(vec3(-0.65, -0.4, 0.65));
const vec3 LP = normalize(vec3(0.15, 0.75, 0.65));   // łuna piekła zza stwora, od dołu (ciepły kontur)
vec3 otoczenie(vec3 n, float sw){ return mix(vec3(0.05, 0.033, 0.024), vec3(0.075, 0.085, 0.1), clamp(-n.y * 0.5 + 0.5, 0.0, 1.0)) * sw; }

// światło włosa (długie pasma): Kajiya–Kay z zachowaniem bryły
vec3 swiatloWlosa(vec3 kol, vec3 T, vec3 N, vec3 V, float sw, float korzen){
  vec3 CK = vec3(0.9, 0.93, 1.0) * 0.95 * sw, CF = vec3(1.0, 0.3, 0.1) * 0.45, CR = vec3(0.5, 0.62, 0.85) * sw;
  float ndl = dot(N, LK);
  float lam = clamp(ndl * 0.5 + 0.5, 0.0, 1.0); lam *= lam;
  vec3 H = normalize(LK + V);
  float t1 = dot(normalize(T - N * 0.08), H), t2 = dot(normalize(T + N * 0.2), H);
  float s1 = pow(sqrt(max(0.0, 1.0 - t1 * t1)), 90.0) * lam, s2 = pow(sqrt(max(0.0, 1.0 - t2 * t2)), 22.0) * lam;
  float kraw = pow(1.0 - abs(dot(N, V)), 3.0) * (0.3 + 0.7 * max(dot(N, LR), 0.0));
  vec3 c = kol * (CK * lam + CF * max(dot(N, LF), 0.0) + otoczenie(N, sw)) * korzen;
  c += CK * (s1 * 0.12 + s2 * 0.05) * korzen + kol * CK * s2 * 1.5;
  c += CR * kraw * 0.18 * korzen;
  return c;
}
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

void main(){
  vec2 px = gl_FragCoord.xy;
  vec2 xy = vec2(uKadr.x + px.x / uKadr.z, uKadr.y + (uRozm.y - px.y) / uKadr.z);
  vec3 ro = uRot * vec3(xy, -3.0);
  vec3 rd = uRot * vec3(0.0, 0.0, 1.0);
  vec3 V = -rd;
  float jak = uKadr.w;
  vec3 oc = ro - uKula.xyz; float bb = dot(oc, rd); float cc = dot(oc, oc) - uKula.w * uKula.w; float hh = bb * bb - cc;
  if (hh < 0.0) { wyj = vec4(0.0); return; }
  float t = max(0.0, -bb - sqrt(hh)), tk = -bb + sqrt(hh);
  gMaska = 0;
  float tMin = 1e9;
  for (int g = 0; g < ${MAX_GRUP}; g++) {
    if (g >= uG) break;
    vec4 s = uGs[g];
    vec3 o2 = ro - s.xyz; float b2 = dot(o2, rd); float c2 = dot(o2, o2) - (s.w + 0.06) * (s.w + 0.06); float h2 = b2 * b2 - c2;
    if (h2 >= 0.0) { gMaska |= (1 << g); tMin = min(tMin, -b2 - sqrt(h2)); }
  }
  if (gMaska == 0) { wyj = vec4(0.0); return; }
  t = max(t, tMin);
  float sw = uOgol.y;
  float dmin = 1e9; bool traf = false;
  vec3 wlKol = vec3(0.0); float wlA = 0.0;
  for (int i = 0; i < 200; i++) {
    vec3 p = ro + rd * t;
    float d = mapa(p);
    dmin = min(dmin, d);
    if (d < 0.0005) { traf = true; break; }
    float L = jak > 0.5 ? dlWlosa(gNaj) : 0.0;
    if (L > 0.0 && d < L) {
      int nj = gNaj;
      vec3 N = normBryly(nj, p);
      vec3 T = stycznaWlosa(kierWlosa(nj), N);
      float wzdl = dot(p, T);
      vec3 q = p - T * wzdl;
      // pasma o skończonej długości: gęsto w poprzek, rzadko wzdłuż
      float pas = szum(q * 420.0 + T * wzdl * (0.6 / L) + uOgol.z) * 0.8 + szum(q * 150.0 + T * wzdl * (0.3 / L) + 9.1) * 0.2;
      float wys = 1.0 - d / L;
      float g = smoothstep(0.5, 0.72, pas) * pow(wys, 0.5) * 0.5;
      if (g > 0.001) {
        vec3 kolW = P(nj, 3).rgb * mix(1.2, 0.55, wys) * (0.8 + 0.4 * szum(q * 90.0 + 2.3));
        float kr = P(nj, 3).a;
        float krewM = kr > 0.01 ? smoothstep(0.45, 0.62, fbm(p * vec3(24.0, 10.0, 24.0) + 5.0) + kr * 0.4 - 0.2) : 0.0;
        kolW = mix(kolW, vec3(0.08, 0.004, 0.004), krewM);
        vec3 c = swiatloWlosa(kolW, T, N, V, sw, mix(1.0, 0.5, wys));
        float a = g * (1.0 - wlA);
        wlKol += c * a; wlA += a;
        if (wlA > 0.97) break;
      }
      t += min(max(d * 0.5, 0.0008), 0.0018);
    } else {
      t += max(d * 0.9, 0.0006);
    }
    if (t > tk) break;
  }
  float piks = 1.0 / uKadr.z;
  if (!traf) {
    float a = clamp(1.0 - dmin / (piks * 1.1), 0.0, 1.0);
    if (a <= 0.0 && wlA <= 0.001) { wyj = vec4(0.0); return; }
    if (a <= 0.0) { vec3 c = wlKol / max(wlA, 1e-3); c = aces(c * 1.35); c = pow(max(c, 0.0), vec3(1.0 / 2.2)); wyj = vec4(c * wlA, wlA); return; }
  }
  vec3 p = ro + rd * t;
  vec3 n = normalna(p);
  barwa(p);
  vec3 alb = gKol; float mat = gMat;
  bool naCieciu = dot(uCiecie.xyz, uCiecie.xyz) > 0.0 && abs(ciecie(p)) < 0.0025 && gDbez < -0.0005;
  float spec = 0.15, polysk = 18.0; vec3 emis = vec3(0.0); float mokre = 0.0;
  float aniz = 0.0; vec3 Tw = vec3(1.0, 0.0, 0.0);
  if (naCieciu) {
    float gl = -gDbez;
    // przekrój warstwami: skóra, żółty tłuszcz w zrazikach, włókniste mięso, ciemniejsze trzewia; kość ze szpikiem
    float n1 = szum(p * 90.0), n2 = szum(p * vec3(230.0, 60.0, 230.0) + 3.0), n3 = szum(p * 400.0 + 9.0);
    if (gNaKosci > 0.0) { alb = mix(vec3(0.8, 0.74, 0.6), vec3(0.4, 0.05, 0.04), smoothstep(0.5, 0.8, gNaKosci)) * (0.85 + 0.3 * n3); mat = 12.0; spec = 0.3; polysk = 30.0; }
    else if (gl < 0.0022) { alb = vec3(0.16, 0.1, 0.085); mat = 10.0; spec = 0.3; }
    else if (gl < 0.011 + 0.006 * n1) { alb = mix(vec3(0.7, 0.55, 0.28), vec3(0.52, 0.36, 0.17), n2) * (0.85 + 0.3 * n3); alb = mix(alb, vec3(0.35, 0.04, 0.03), smoothstep(0.7, 0.9, n3) * 0.6); mat = 14.0; spec = 0.55; polysk = 40.0; }
    else if (gl < 0.034 + 0.012 * n1) { alb = vec3(0.3, 0.03, 0.024) * (0.5 + 0.8 * n2) * (0.85 + 0.3 * n3); mat = 11.0; spec = 0.7; polysk = 55.0; }
    else { alb = mix(vec3(0.16, 0.02, 0.03), vec3(0.32, 0.12, 0.1), smoothstep(0.35, 0.7, n1)) * (0.8 + 0.4 * n3); mat = 13.0; spec = 0.85; polysk = 70.0; }
    mokre = 1.0;
  } else if (mat < 0.5 || abs(mat - 1.0) < 0.5 || abs(mat - 19.0) < 0.5) {
    // krótka sierść: drobne pasma wzdłuż włosa (w kolorze i w normalnej), połysk anizotropowy
    Tw = stycznaWlosa(gNajB >= 0 ? kierWlosa(gNajB) : vec3(-0.85, 0.5, 0.0), n);
    float wzdl = dot(p, Tw);
    vec3 q = p - Tw * wzdl;
    // drobne pasma i kępki — tylko gdy mają co najmniej ~3 px (inaczej szum zamiast sierści)
    float lodA = smoothstep(2.5, 5.0, uKadr.z / 260.0), lodB = smoothstep(2.5, 5.0, uKadr.z / 85.0);
    float wl = szum(q * 260.0 + Tw * wzdl * 26.0 + uOgol.z);
    float wl2 = szum(q * 85.0 + Tw * wzdl * 9.0 + 3.3);
    float duze = fbm(p * 8.0 + 1.7);
    gPasmo = 0.35 + 0.65 * mix(0.5 + 0.5 * (wl2 - 0.5) * 2.0 * lodB, wl, lodA * 0.6);
    alb *= (0.88 + 0.24 * duze) * mix(1.0, 0.62 + 0.76 * wl, lodA * 0.75) * mix(1.0, 0.72 + 0.56 * wl2, lodB * 0.7);
    alb *= mix(1.0, 0.75, uOgol.w);
    vec3 B = normalize(cross(n, Tw));
    n = normalize(n + B * ((wl - 0.5) * 0.15 * lodA + (wl2 - 0.5) * 0.2 * lodB));
    aniz = abs(mat - 1.0) < 0.5 ? 1.3 : 1.0; spec = 0.0; polysk = 20.0;
  } else if (abs(mat - 2.0) < 0.5) {
    float g = szum(p * 300.0); alb *= 0.6 + 0.6 * g; n = normalize(n + 0.3 * (vec3(g, szum(p * 290.0 + 2.0), g) - 0.5));
    spec = 0.8; polysk = 70.0; mokre = 1.0;
  } else if (abs(mat - 3.0) < 0.5) {
    float g = szum(p * 90.0); alb *= 0.65 + 0.5 * g; alb = mix(alb, vec3(0.06, 0.02, 0.02), smoothstep(0.6, 0.8, szum(p * 40.0 + 1.0)));
    spec = 0.8; polysk = 70.0; mokre = 1.0;
  } else if (abs(mat - 4.0) < 0.5) {
    alb *= 0.92 + 0.16 * szum(p * 200.0); alb = mix(alb, vec3(0.55, 0.45, 0.28), 0.5 * smoothstep(0.6, 1.0, szum(p * 30.0)));
    spec = 0.75; polysk = 90.0;
  } else if (abs(mat - 5.0) < 0.5) { float bro = szum(p * 520.0); alb *= 0.7 + 0.5 * bro; n = normalize(n + 0.25 * (vec3(bro, szum(p * 500.0 + 3.0), szum(p * 480.0 + 7.0)) - 0.5)); spec = 0.45; polysk = 40.0; mokre = 1.0;
  } else if (abs(mat - 6.0) < 0.5) {
    vec4 a = P(gNajB >= 0 ? gNajB : 0, 0);
    vec3 q = (p - a.xyz) / max(a.w, 1e-4);
    vec3 qe = uRot * vec3(1.0, 0.0, 0.0), qu = vec3(0.0, 1.0, 0.0);
    float ex = dot(q, qe), ey = dot(q, qu);
    float zr = smoothstep(0.18, 0.1, abs(ex)) * smoothstep(0.8, 0.55, abs(ey));
    vec3 tecz = mix(vec3(1.0, 0.6, 0.12), vec3(0.85, 0.05, 0.02), smoothstep(0.0, 0.8, length(vec2(ex, ey))));
    emis = tecz * 2.0 * (1.0 - zr);
    alb = vec3(0.02);
    spec = 1.4; polysk = 140.0; mokre = 1.0;
  } else if (abs(mat - 7.0) < 0.5) {
    vec3 q = p * 150.0; vec2 g2 = vec2(q.x + 0.5 * floor(q.y), q.y);
    float l = length(fract(g2) - 0.5);
    alb *= 0.55 + 0.7 * smoothstep(0.5, 0.15, l); n = normalize(n + 0.3 * vec3(fract(g2) - 0.5, 0.0));
    spec = 0.55; polysk = 40.0;
  } else if (abs(mat - 8.0) < 0.5) { alb *= 0.8 + 0.4 * szum(p * vec3(30.0, 200.0, 30.0)); spec = 0.55; polysk = 45.0;
  } else if (abs(mat - 10.0) < 0.5) {
    alb *= 0.85 + 0.3 * szum(p * 60.0);
    alb = mix(alb, alb * vec3(0.8, 0.85, 1.05), smoothstep(0.5, 0.8, szum(p * 12.0 + 3.0)));
    float zy = smoothstep(0.02, 0.0, abs(szum(p * vec3(40.0, 10.0, 40.0)) - 0.5)) * 0.25;
    alb = mix(alb, vec3(0.3, 0.32, 0.45), zy);
    // sine plamy (sińce, sinica), brud: smugi spływające z deszczem i błoto w zagłębieniach
    alb = mix(alb, alb * vec3(0.75, 0.78, 0.95), smoothstep(0.55, 0.8, fbm(p * 9.0 + 11.0)) * 0.7);
    float smuga = fbm(p * vec3(26.0, 5.0, 26.0) + 4.0);
    alb = mix(alb, vec3(0.06, 0.048, 0.034), smoothstep(0.52, 0.75, smuga) * 0.85);
    alb = mix(alb, vec3(0.05, 0.04, 0.028), smoothstep(0.62, 0.85, fbm(p * 40.0 + 7.0)) * 0.6);
    spec = 0.08 + 0.1 * uOgol.w; polysk = 16.0; mokre = uOgol.w * 0.3;
  } else if (abs(mat - 11.0) < 0.5) { float wl2 = szum(p * vec3(170.0, 40.0, 170.0)); alb *= 0.55 + 0.7 * wl2; spec = 0.75; polysk = 50.0; mokre = 1.0;
  } else if (abs(mat - 12.0) < 0.5) { alb *= 0.9 + 0.2 * szum(p * 120.0); spec = 0.3; polysk = 25.0;
  } else if (abs(mat - 13.0) < 0.5) { alb *= 0.75 + 0.4 * szum(p * 90.0); alb = mix(alb, alb * vec3(0.7, 0.75, 0.95), smoothstep(0.5, 0.8, szum(p * 22.0 + 4.0))); alb = mix(alb, vec3(0.2, 0.02, 0.02), smoothstep(0.6, 0.8, szum(p * 30.0)) * 0.7); spec = 0.75; polysk = 60.0; mokre = 1.0;
  } else if (abs(mat - 14.0) < 0.5) { spec = 0.5; polysk = 30.0;
  } else if (abs(mat - 15.0) < 0.5) { alb *= 0.7 + 0.5 * szum(p * 50.0); spec = 0.5; polysk = 25.0; mokre = 0.6;
  } else if (abs(mat - 16.0) < 0.5) { alb *= 0.7 + 0.5 * fbm(p * 30.0); spec = 0.05; polysk = 8.0;
  } else if (abs(mat - 17.0) < 0.5) { spec = 1.0; polysk = 90.0; mokre = 1.0;
  } else if (abs(mat - 18.0) < 0.5) { alb *= 0.75 + 0.4 * szum(p * vec3(20.0, 90.0, 20.0)); spec = 0.05; }
  float krewM = 0.0;
  if (gKrew > 0.01 && !naCieciu) {
    // krew w plamach i zaciekach (więcej krwi = większe pole), świeża mokra i zaschnięta brunatna
    float fk = fbm(p * vec3(30.0, 11.0, 30.0) + 5.0) * 0.8 + szum(p * vec3(90.0, 30.0, 90.0)) * 0.2;
    float prog = 0.66 - 0.21 * gKrew;
    krewM = smoothstep(prog, prog + 0.05, fk);
    float zasch = smoothstep(0.45, 0.7, szum(p * 35.0 + 1.0));
    alb = mix(alb, mix(vec3(0.075, 0.005, 0.004), vec3(0.06, 0.016, 0.01), zasch) * (0.7 + 0.6 * szum(p * 140.0)), krewM);
    spec = mix(spec, mix(0.95, 0.3, zasch), krewM); polysk = mix(polysk, mix(80.0, 25.0, zasch), krewM); mokre = max(mokre, krewM * (1.0 - zasch)); aniz *= 1.0 - krewM;
  }
  float bl = smoothstep(uBloto - 0.02, uBloto + 0.06, p.y) * smoothstep(0.3, 0.6, fbm(p * 22.0));
  if (!naCieciu && abs(mat - 6.0) > 0.5) { alb = mix(alb, vec3(0.1, 0.078, 0.055), bl); spec = mix(spec, 0.45, bl); mokre = max(mokre, bl * 0.6); aniz *= 1.0 - bl; }
  float ao = cieniowanie(p, n, jak > 0.5 ? 6 : 3);
  float sh = jak > 0.5 ? cien(p + n * 0.004, LK) : 1.0;
  vec3 CK = vec3(0.9, 0.93, 1.0) * 0.95 * sw, CF = vec3(1.0, 0.3, 0.1) * 0.45, CR = vec3(0.5, 0.62, 0.85) * sw;
  float ndl = dot(n, LK);
  float dk = max(ndl, 0.0), dw = clamp(ndl * 0.5 + 0.5, 0.0, 1.0);
  float df = max(dot(n, LF), 0.0), dr = max(dot(n, LR), 0.0);
  float ndv = max(dot(n, V), 0.0);
  float fres = pow(1.0 - ndv, 7.0);
  vec3 Hk = normalize(LK + V);
  float f0 = mix(0.03, 0.06, mokre);
  float fsch = f0 + (1.0 - f0) * pow(1.0 - max(dot(Hk, V), 0.0), 5.0);
  float s1 = pow(max(dot(n, Hk), 0.0), polysk) * spec * (polysk + 8.0) / 25.0 * (0.25 + 3.0 * fsch) * smoothstep(-0.1, 0.3, ndl);
  // połysk sierści (Kajiya–Kay): wąskie pasmo przesunięte ku nasadzie + szersze, barwione sierścią
  float sAn = 0.0, sAn2 = 0.0;
  if (aniz > 0.0) {
    float t1 = dot(normalize(Tw - n * 0.08), Hk), t2 = dot(normalize(Tw + n * 0.2), Hk);
    float widz = smoothstep(-0.15, 0.45, ndl);
    sAn = aniz * widz * (1.0 + 0.8 * uOgol.w) * pow(sqrt(max(0.0, 1.0 - t1 * t1)), 50.0) * 0.1 * gPasmo;
    sAn2 = aniz * widz * pow(sqrt(max(0.0, 1.0 - t2 * t2)), 26.0) * 2.5;   // barwione sierścią (mnożone przez alb niżej)
  }
  float zw = clamp(ndl * 0.7 + 0.3, 0.0, 1.0);
  float zawin = aniz > 0.0 ? zw * zw : mix(dk, dw * dw, 0.35);
  vec3 sss = (abs(mat - 2.0) < 0.5 || abs(mat - 3.0) < 0.5 || abs(mat - 5.0) < 0.5) ? alb * vec3(0.6, 0.14, 0.08) * (1.0 - dk) * 0.5 : abs(mat - 10.0) < 0.5 ? alb * vec3(0.4, 0.12, 0.08) * (1.0 - dk) * 0.3 : abs(mat - 4.0) < 0.5 ? alb * vec3(0.35, 0.25, 0.15) * (1.0 - dk) : vec3(0.0);
  float aoM = mix(1.0, ao, 0.85);
  float fres5 = pow(1.0 - ndv, 5.0);
  vec3 kol = alb * (CK * (zawin + sAn2) * sh + CF * df + otoczenie(n, sw)) * aoM + sss * aoM
           + CK * (s1 + sAn) * sh * ao
           + CR * fres * (0.1 + 0.9 * dr) * ao * mix(0.12, 0.35, max(aniz * 0.6, min(spec, 1.0)))
           + vec3(1.0, 0.28, 0.08) * fres5 * max(dot(n, LP), 0.0) * 0.35 * ao
           + emis;
  kol = wlKol + (1.0 - wlA) * kol;
  kol = aces(kol * 1.35);
  kol = pow(max(kol, 0.0), vec3(1.0 / 2.2));
  float a = traf ? 1.0 : max(wlA, clamp(1.0 - dmin / (piks * 1.1), 0.0, 1.0));
  wyj = vec4(kol * a, a);
}`;

interface Silnik { gl: WebGL2RenderingContext; c: HTMLCanvasElement; prog: WebGLProgram; u: Record<string, WebGLUniformLocation | null>; tex: WebGLTexture }
let silnik: Silnik | null | undefined;

function zbuduj(): Silnik | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const gl = c.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  const sh = (typ: number, zrodlo: string): WebGLShader | null => {
    const s = gl.createShader(typ)!; gl.shaderSource(s, zrodlo); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error('gl3d: ' + gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error('gl3d: ' + gl.getProgramInfoLog(prog)); return null; }
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u: Silnik['u'] = {};
  for (const n of ['uTex', 'uG', 'uGs', 'uGr', 'uRozm', 'uKadr', 'uRot', 'uCiecie', 'uOgol', 'uKula', 'uBloto', 'uSzarp']) u[n] = gl.getUniformLocation(prog, n);
  const tex = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(u.uTex, 0);
  return { gl, c, prog, u, tex };
}

/** Czy 3D działa (WebGL2). */
export function jest3d(): boolean {
  if (silnik === undefined) silnik = zbuduj();
  return !!silnik;
}

function kulaPrym(q: Prym): [number, number, number, number] {
  if (q.typ === 1 && q.b) {
    const c: V3 = [(q.a[0] + q.b[0]) / 2, (q.a[1] + q.b[1]) / 2, (q.a[2] + q.b[2]) / 2];
    return [c[0], c[1], c[2], Math.hypot(q.b[0] - q.a[0], q.b[1] - q.a[1], q.b[2] - q.a[2]) / 2 + Math.max(q.r1, q.r2 ?? q.r1)];
  }
  if (q.typ === 2 && q.b) return [q.a[0], q.a[1], q.a[2], Math.max(q.b[0], q.b[1], q.b[2])];
  return [q.a[0], q.a[1], q.a[2], q.r1];
}

/**
 * Renderuje grupy brył (część ciała = grupa; grupy przyspieszają liczenie) i zwraca płótno z obrazem (lewy dolny róg
 * płótna, rozmiar w px) albo null bez WebGL2.
 */
export function renderuj3d(grupy: Prym[][], o: OpcjeRenderu): { c: HTMLCanvasElement; w: number; h: number } | null {
  if (!jest3d()) return null;
  const S = silnik!;
  const gl = S.gl;
  const wPx = Math.max(2, Math.ceil(o.w * o.skala)), hPx = Math.max(2, Math.ceil(o.h * o.skala));
  if (S.c.width < wPx || S.c.height < hPx) { S.c.width = Math.max(S.c.width, wPx); S.c.height = Math.max(S.c.height, hPx); }
  const gr = grupy.filter((g) => g.length).slice(0, MAX_GRUP);
  const wszystkie = gr.flat();
  const N = Math.min(wszystkie.length, MAX_PRYM);
  if (wszystkie.length > MAX_PRYM) console.warn('gl3d: za dużo brył', wszystkie.length);
  const dane = new Float32Array(Math.max(1, N) * 4 * KROK);
  for (let i = 0; i < N; i++) {
    const q = wszystkie[i];
    const b = q.b ?? q.a;
    let kier = q.kier;
    if (!kier && q.typ === 1 && q.b) kier = [q.b[0] - q.a[0], q.b[1] - q.a[1], q.b[2] - q.a[2]];
    kier = kier ?? [0, 0, 0];
    dane.set([q.a[0], q.a[1], q.a[2], q.r1, b[0], b[1], b[2], q.r2 ?? q.r1, q.typ, q.k ?? 0, q.mat, q.amp ?? 0, q.kol[0], q.kol[1], q.kol[2], q.krew ?? 0, kier[0], kier[1], kier[2], q.wlos ?? 0], i * 4 * KROK);
  }
  gl.useProgram(S.prog);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, S.tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, KROK, Math.max(1, N), 0, gl.RGBA, gl.FLOAT, dane);
  const gs = new Float32Array(MAX_GRUP * 4), grr = new Int32Array(MAX_GRUP * 2);
  let start = 0;
  const kule: [number, number, number, number][] = [];
  gr.forEach((g, j) => {
    const ks = g.map(kulaPrym);
    const cx = ks.reduce((s, k) => s + k[0], 0) / ks.length, cy = ks.reduce((s, k) => s + k[1], 0) / ks.length, cz = ks.reduce((s, k) => s + k[2], 0) / ks.length;
    let r = 0;
    for (let i = 0; i < ks.length; i++) r = Math.max(r, Math.hypot(ks[i][0] - cx, ks[i][1] - cy, ks[i][2] - cz) + ks[i][3] + (g[i].k ?? 0) + Math.abs(g[i].amp ?? 0) + (g[i].wlos ?? 0));
    gs.set([cx, cy, cz, r], j * 4); grr.set([start, Math.max(0, Math.min(g.length, N - start))], j * 2);
    kule.push([cx, cy, cz, r]);
    start += g.length;
  });
  let kx = 0, ky = 0, kz = 0, kr = 0;
  if (kule.length) {
    kx = kule.reduce((s, k) => s + k[0], 0) / kule.length; ky = kule.reduce((s, k) => s + k[1], 0) / kule.length; kz = kule.reduce((s, k) => s + k[2], 0) / kule.length;
    for (const k of kule) kr = Math.max(kr, Math.hypot(k[0] - kx, k[1] - ky, k[2] - kz) + k[3]);
  }
  gl.viewport(0, 0, wPx, hPx);
  gl.enable(gl.SCISSOR_TEST); gl.scissor(0, 0, wPx, hPx);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform1i(S.u.uG, gr.length);
  gl.uniform4fv(S.u.uGs, gs);
  gl.uniform2iv(S.u.uGr, grr);
  gl.uniform2f(S.u.uRozm, wPx, hPx);
  gl.uniform4f(S.u.uKadr, o.x0, o.y0, o.skala, o.jakosc ?? 1);
  const yaw = o.yaw ?? 0, cy = Math.cos(yaw), sy = Math.sin(yaw);
  gl.uniformMatrix3fv(S.u.uRot, false, new Float32Array([cy, 0, sy, 0, 1, 0, -sy, 0, cy]));
  const c = o.ciecie;
  gl.uniform4f(S.u.uCiecie, c ? c.n[0] : 0, c ? c.n[1] : 0, c ? c.n[2] : 0, c ? c.d : 0);
  gl.uniform4f(S.u.uOgol, (o.czas ?? 0) / 1000, o.swiatlo ?? 1, o.ziarno ?? 0, o.mokry ?? 0.6);
  gl.uniform4f(S.u.uKula, kx, ky, kz, kr + 0.06);
  gl.uniform1f(S.u.uBloto, o.bloto ?? 99);
  gl.uniform1f(S.u.uSzarp, c?.szarp ?? 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return { c: S.c, w: wPx, h: hPx };
}

/** Rysuje wynik renderu na płótnie 2D: lewy górny róg kadru w (x, y), rozmiar w px ekranu (dw, dh). */
export function nalozRender(ctx: CanvasRenderingContext2D, r: { c: HTMLCanvasElement; w: number; h: number }, x: number, y: number, dw: number, dh: number): void {
  ctx.drawImage(r.c, 0, r.c.height - r.h, r.w, r.h, x, y, dw, dh);
}

/** Rzut punktu modelu na płaszczyznę ekranu (x, y w jednostkach) przy obrocie kamery `yaw`. */
export function rzut(p: V3, yaw = 0): [number, number] {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return [p[0] * c + p[2] * s, p[1]];
}
