"""Tnie rysunek demona (obrazy/pomnik/demon-*.png) na części kukiełki bossa i wypieka ich tekstury.

Użycie (z folderu alpha-1):  python3 scripts/pomnik/czesci.py [podglad.png]
Wynik:
  obrazy/pomnik/kukla-zywy.webp   — atlas części żywego demona (ciemny bazalt z żarem, światło aureoli zza pleców),
  obrazy/pomnik/kukla-kamien.webp — ten sam atlas w kamieniu posągu (skorupa, z której wstaje i w którą zastyga),
  obrazy/pomnik/kukla-zar.png     — atlas świecenia: R — żyły żaru w kresce, G — rysy, B — oczy,
  src/render/demon-czesci.ts      — prostokąty części w rysunku i w atlasie, stawy, rodzice, płomienie aureoli.
Cięcie idzie po narysowanych liniach: rysunek dzieli się na pola zamknięte kreską, każde pole trafia do części, w której
wielokącie (niżej, CZESCI) leży większość jego pikseli; kreska należy do części leżącej bliżej przodu.
Każda część ma też zakładki schowane pod sąsiadem z przodu (bark pod tułowiem, łokieć pod przedramieniem, udo pod
przepaską, szyja pod głową, aureola za głową) — zamalowane jej własną skórą bez kreski, żeby ruch nie odsłaniał dziur.
"""
import sys, json, os
from collections import deque
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

D = 'obrazy/pomnik'


def alfa(n):
    return np.asarray(Image.open(f'{D}/{n}').getchannel('A')).astype(np.float32) / 255


kontur, syl, rysy = alfa('demon-kontur.png'), alfa('demon-sylwetka.png'), alfa('demon-rysy.png')
H, W = kontur.shape
ZIEMIA = 916   # stopy kukły (bez płyt pod stopami i bez cokołu)

# części w kolejności rysowania (od tyłu): wielokąt do przypisania pól, staw (punkt obrotu), rodzic
CZESCI = [
  ('aureola', [(60, 0), (560, 0), (560, 440), (60, 440)], (314, 300), 'tulow'),
  ('lydkaL', [(40, 560), (232, 560), (232, 963), (40, 963)], (186, 715), 'udoL'),
  ('lydkaP', [(398, 560), (600, 560), (600, 963), (398, 963)], (440, 715), 'udoP'),
  ('stopaL', [(0, 0), (1, 0), (1, 1)], (180, 862), 'swiat'),
  ('stopaP', [(0, 0), (1, 0), (1, 1)], (448, 862), 'swiat'),
  ('udoL', [(0, 0), (1, 0), (1, 1)], (195, 575), 'miednica'),
  ('udoP', [(0, 0), (1, 0), (1, 1)], (432, 575), 'miednica'),
  ('ramieL', [(124, 318), (150, 300), (222, 292), (236, 340), (222, 372), (176, 404), (146, 434), (118, 414), (134, 360)], (212, 322), 'tulow'),
  ('ramieP', [(402, 300), (470, 296), (492, 314), (502, 360), (512, 410), (486, 432), (452, 404), (420, 372), (404, 338)], (424, 324), 'tulow'),
  ('tulow', [(140, 200), (262, 196), (290, 200), (300, 226), (390, 226), (412, 200), (420, 214), (488, 230), (480, 300), (470, 330), (440, 380), (440, 470), (480, 520), (480, 610), (402, 610), (402, 545), (218, 545), (218, 612), (150, 612), (150, 520), (200, 470), (200, 380), (176, 330), (150, 290)], (314, 540), 'miednica'),
  ('przepaska', [(214, 538), (408, 538), (408, 900), (214, 900)], (311, 542), 'miednica'),
  ('naszyjnik', [(250, 292), (298, 284), (322, 298), (352, 294), (414, 290), (416, 330), (394, 346), (354, 344), (346, 360), (304, 360), (296, 342), (250, 338)], (326, 292), 'tulow'),
  ('glowa', [(292, 62), (330, 56), (368, 58), (398, 66), (410, 86), (414, 110), (418, 140), (414, 160), (404, 180), (394, 206), (362, 224), (330, 224), (300, 208), (286, 184), (262, 178), (250, 150), (254, 124), (270, 112), (284, 92)], (344, 226), 'tulow'),
  ('szczeka', [(300, 178), (394, 170), (398, 200), (382, 216), (350, 228), (318, 220), (300, 200)], (346, 172), 'glowa'),
  ('przedramieL', [(6, 252), (94, 248), (112, 280), (140, 318), (136, 370), (120, 418), (148, 440), (100, 440), (60, 410), (30, 350), (10, 290)], (118, 398), 'ramieL'),
  ('przedramieP', [(530, 256), (590, 256), (600, 300), (585, 360), (560, 410), (520, 440), (484, 432), (500, 404), (498, 360), (494, 318), (520, 280)], (508, 398), 'ramieP'),
  ('dlonL', [(0, 100), (110, 100), (110, 180), (96, 254), (60, 262), (6, 262), (0, 240)], (56, 252), 'przedramieL'),
  ('dlonP', [(514, 100), (628, 100), (628, 250), (600, 262), (540, 262), (520, 220), (514, 170)], (560, 256), 'przedramieP'),
]
# pierwszeństwo przy przypisywaniu (później = ważniejsze): małe części wygrywają z dużymi
PIERWSZENSTWO = ['aureola', 'tulow', 'lydkaL', 'lydkaP', 'przepaska', 'ramieL', 'ramieP', 'przedramieL',
                 'przedramieP', 'dlonL', 'dlonP', 'glowa', 'szczeka', 'naszyjnik']
NAZWY = [c[0] for c in CZESCI]
IDX = {n: i for i, n in enumerate(NAZWY)}
# stawy kończyn (IK): bark, łokieć, nadgarstek; biodro, kolano, kostka
STAWY = {
  'barkL': (212, 322), 'lokiecL': (118, 398), 'nadgarstekL': (56, 252),
  'barkP': (424, 324), 'lokiecP': (508, 398), 'nadgarstekP': (560, 256),
  'biodroL': (195, 575), 'kolanoL': (186, 715), 'kostkaL': (180, 862),
  'biodroP': (432, 575), 'kolanoP': (440, 715), 'kostkaP': (448, 862),
}
# zakładki schowane pod częściami z przodu: koła/elipsy/wielokąty albo całe pole innej części
ZAKLADKI = {
  'ramieL': [('kolo', 212, 322, 38), ('kolo', 118, 398, 28)],
  'ramieP': [('kolo', 424, 324, 38), ('kolo', 508, 398, 28)],
  'przedramieL': [('kolo', 56, 252, 24)],
  'przedramieP': [('kolo', 560, 256, 24)],
  'lydkaL': [('elipsa', 186, 715, 52, 34), ('elipsa', 178, 862, 46, 20), ('wiel', [(200, 715), (262, 715), (262, 884), (200, 884)])],
  'lydkaP': [('elipsa', 440, 715, 52, 34), ('elipsa', 450, 862, 46, 20), ('wiel', [(356, 715), (418, 715), (418, 884), (356, 884)])],
  'stopaL': [('wiel', [(200, 862), (262, 862), (262, 905), (200, 905)])],
  'stopaP': [('wiel', [(356, 862), (418, 862), (418, 905), (356, 905)])],
  'udoL': [('wiel', [(200, 535), (262, 535), (262, 730), (200, 730)]), ('wiel', [(150, 505), (250, 505), (250, 585), (150, 585)])],
  'udoP': [('wiel', [(356, 535), (418, 535), (418, 730), (356, 730)]), ('wiel', [(376, 505), (484, 505), (484, 585), (376, 585)])],
  'tulow': [('czesc', 'glowa', 128), ('czesc', 'naszyjnik', 0), ('czesc', 'szczeka', 0)],
  'aureola': [('czesc', 'glowa', 0), ('czesc', 'szczeka', 0), ('czesc', 'tulow', -250), ('czesc', 'naszyjnik', 0)],
}
# usta (wnętrze, odsłaniane opadającą szczęką) — w układzie głowy
USTA = [(304, 175), (394, 167), (398, 197), (372, 204), (350, 207), (326, 204), (306, 197)]
OCZY = [(323, 128), (376, 131)]
# poza kukłą: cokół posągu i płyty pod stopami (posąg na nich stoi, żywy demon nie)
COKOL = [(238, 888), (392, 888), (392, 963), (238, 963)]
PLYTA_L = [(40, 906), (92, 907), (98, 910), (104, 914), (110, 915), (116, 917), (122, 918), (128, 918), (134, 916), (140, 916),
           (146, 918), (152, 918), (158, 917), (164, 915), (170, 912), (176, 910), (182, 906), (188, 906), (200, 907), (215, 908),
           (238, 908), (262, 908), (262, 963), (40, 963)]
PLYTA_P = [(355, 909), (378, 909), (384, 907), (390, 906), (396, 904), (402, 901), (408, 899), (414, 898), (420, 898), (426, 899),
           (432, 900), (438, 900), (444, 899), (450, 898), (456, 899), (462, 900), (468, 901), (474, 902), (480, 905), (486, 907),
           (492, 909), (498, 909), (504, 909), (510, 908), (516, 909), (522, 909), (528, 911), (534, 911), (540, 910), (546, 908),
           (552, 906), (558, 913), (600, 913), (600, 963), (355, 963)]


def wielokat(pkt, w=W, h=H):
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).polygon(pkt, fill=1)
    return np.asarray(m).astype(bool)


def rozszerz(m, r):
    """Maska powiększona o r pikseli (MaxFilter)."""
    if r <= 0: return m
    return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * r + 1))) > 0


def zwez(m, r):
    if r <= 0: return m
    return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(2 * r + 1))) > 0


def _pudelko(a, r, os_):
    if r < 1: return a
    pad = [(0, 0)] * a.ndim; pad[os_] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad), axis=os_, dtype=np.float64)
    n = a.shape[os_]
    hi = [slice(None)] * a.ndim; lo = [slice(None)] * a.ndim
    hi[os_] = slice(2 * r + 1, 2 * r + 1 + n); lo[os_] = slice(0, n)
    return ((c[tuple(hi)] - c[tuple(lo)]) / (2 * r + 1)).astype(np.float32)


def rozmyj(a, s):
    """Rozmycie ~Gaussa (trzy przejścia pudełkiem), poza obrazem zera."""
    a = a.astype(np.float32)
    r = max(1, int(round((np.sqrt(12 * s * s / 3 + 1) - 1) / 2)))
    for _ in range(3): a = _pudelko(_pudelko(a, r, 0), r, 1)
    return a


# ---------- przypisanie pikseli do części ----------
etykiety = Image.new('L', (W, H), 255)
dr = ImageDraw.Draw(etykiety)
for n in PIERWSZENSTWO: dr.polygon(CZESCI[IDX[n]][1], fill=IDX[n])
etk = np.asarray(etykiety).copy()

linia = kontur > 0.3
gruba = rozszerz(kontur > 0.18, 2)   # pogrubiona kreska domyka drobne przerwy (inaczej pola zlewały się przez całe ciało)
poza = wielokat(COKOL) | wielokat(PLYTA_L) | wielokat(PLYTA_P) | (np.arange(H)[:, None] >= 946)
wnetrze = (syl > 0.5) & ~gruba & ~poza

pole = -np.ones((H, W), np.int32)
pola = []
for y0 in range(H):
    for x0 in np.nonzero(wnetrze[y0] & (pole[y0] < 0))[0]:
        if pole[y0, x0] >= 0: continue
        k = len(pola); q = deque([(y0, x0)]); pole[y0, x0] = k; px = []
        while q:
            y, x = q.popleft(); px.append((y, x))
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < H and 0 <= nx < W and wnetrze[ny, nx] and pole[ny, nx] < 0:
                    pole[ny, nx] = k; q.append((ny, nx))
        pola.append(px)
przyp = np.full((H, W), 255, np.uint8)
mieszane = 0
for px in pola:
    ys = np.array([p[0] for p in px]); xs = np.array([p[1] for p in px])
    e = etk[ys, xs]; e2 = e[e < 255]
    if not len(e2): continue
    cnt = np.bincount(e2, minlength=len(NAZWY)); gl = cnt.argmax()
    if cnt[gl] >= 0.8 * len(e2): przyp[ys, xs] = gl
    else:
        pp = np.where(e < 255, e, gl)
        if gl != IDX['naszyjnik']: pp = np.where(pp == IDX['naszyjnik'], gl, pp)
        przyp[ys, xs] = pp; mieszane += 1
print('pól', len(pola), 'mieszanych', mieszane)

wolna = (przyp == 255) & ~poza & (syl > 0.3)
for _ in range(14):
    if not wolna.any(): break
    for n in reversed(PIERWSZENSTWO):
        i = IDX[n]
        bierze = wolna & rozszerz(przyp == i, 2)
        przyp[bierze] = i; wolna &= ~bierze
print('kreski bez części', int(wolna.sum()))
# nogi: udo nad kolanem, łydka ze stopą pod nim
for b in 'LP':
    noga = przyp == IDX['lydka' + b]
    przyp[noga & (np.arange(H)[:, None] < STAWY['kolano' + b][1])] = IDX['udo' + b]
    przyp[noga & (np.arange(H)[:, None] >= STAWY['kostka' + b][1])] = IDX['stopa' + b]
widoczna = [(przyp == i) for i in range(len(NAZWY))]
cala = np.zeros((H, W), bool)
for m in widoczna: cala |= m

# ---------- tekstury całego rysunku ----------
rng = np.random.default_rng(7)
kreska = np.clip((kontur - 0.12) / 0.55, 0, 1)
synA = np.clip(syl * 1.25, 0, 1) * cala
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

# wysokość: każda część to bryła (kopuła z rozmycia jej maski), kreska to wyryty rowek
wys = np.zeros((H, W), np.float32)
for i, m in enumerate(widoczna):
    if not m.any(): continue
    acc = np.zeros((H, W), np.float32)
    for s, w in ((5, 0.3), (13, 0.4), (28, 0.3)):
        acc += w * np.clip((rozmyj(m, s) - 0.5) * 2, 0, 1)
    wys += m * acc
wys -= 0.32 * rozmyj(kreska, 1.2)
wys = rozmyj(wys, 1.0)
gy, gx = np.gradient(wys)


def oswietl(k, swiatlo):
    nx, ny, nz = -gx * k, -gy * k, np.ones_like(gx)
    d = np.sqrt(nx * nx + ny * ny + nz * nz); nx, ny, nz = nx / d, ny / d, nz / d
    L = np.array(swiatlo, np.float32); L /= np.linalg.norm(L)
    dif = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)
    # odblask (patrzymy z przodu): R = 2(N·L)N − L, składowa z
    rz = 2 * (nx * L[0] + ny * L[1] + nz * L[2]) * nz - L[2]
    return dif, np.clip(rz, 0, 1), nz


ao = 1 - 0.3 * np.clip(rozmyj(kreska, 3.2) * 1.6, 0, 1)
ziarno = 1 + 0.06 * (rozmyj(rng.random((H, W)).astype(np.float32), 0.8) - 0.5) * 6
plamy = 1 + 0.12 * (rozmyj(rng.random((H, W)).astype(np.float32), 7) - 0.5) * 18
brzeg = np.clip(rozmyj(~cala, 3.5) * 2.4, 0, 1) * cala    # przy zewnętrznym brzegu sylwetki
au = widoczna[IDX['aureola']]

# --- żywy: ciemny bazalt, cieplejszy w piersi, ciemniejszy w dłoniach i stopach; kontra z aureoli zza pleców
dif, spec, nz = oswietl(24, (-0.45, -0.75, 0.55))
cieplo = np.exp(-((xx - 330) ** 2 + ((yy - 360) * 0.8) ** 2) / (2 * 230 ** 2))
zimne = np.array([27, 11, 10], np.float32); cieple = np.array([98, 31, 21], np.float32)
alb = zimne + (cieple - zimne) * cieplo[..., None]
kosc = widoczna[IDX['naszyjnik']]
alb[kosc] = [150, 126, 100]
alb[widoczna[IDX['przepaska']]] = alb[widoczna[IDX['przepaska']]] * 0.55 + np.array([70, 40, 30]) * 0.45
# aureola: ogień — jaśniejszy w głębi płomieni, ciemniejszy na brzegach języków
wau = np.clip(rozmyj(au, 10) * 1.4 - 0.25, 0, 1)
alb[au] = (np.array([46, 8, 4]) + (np.array([150, 40, 11]) - np.array([46, 8, 4])) * wau[au][:, None] ** 1.4)
zywy = alb * (0.22 + 0.95 * dif)[..., None]
zywy *= (ao * ziarno * plamy)[..., None]
zywy += ((1 - ao) * 2.2 * ~au)[..., None] * np.array([70, 12, 4], np.float32)   # żar prześwituje w zagłębieniach
zywy[au] = alb[au] * (0.75 + 0.35 * dif[au])[:, None] * ziarno[au][:, None]
kontra = brzeg * np.clip(1.3 - yy / 650, 0.2, 1) * ~au
zywy += kontra[..., None] * np.array([255, 112, 44], np.float32) * 0.75
zywy += ((spec ** 22) * 0.45 * ~au)[..., None] * np.array([255, 196, 160], np.float32)
zywy[kosc] = (alb[kosc] * (0.35 + 0.75 * dif[kosc])[:, None] * ao[kosc][:, None])
kol_kreski = np.where(au[..., None], np.array([70, 14, 4], np.float32), np.array([12, 4, 3], np.float32))
zywy = zywy * (1 - 0.9 * kreska)[..., None] + kol_kreski * (0.9 * kreska)[..., None]
zywy = np.clip(zywy, 0, 255)

# --- kamień posągu: szary, światło z lewej u góry, ziarno, rysy z jasnym przełomem
difk, _, _ = oswietl(16, (-0.5, -0.7, 0.6))
kamien = np.array([132, 124, 112], np.float32)[None, None, :] * (0.42 + 0.66 * difk)[..., None]
kamien *= (ao * (1 + (ziarno - 1) * 2.2) * (1 + (plamy - 1) * 0.6))[..., None]
kamien *= np.clip(1.08 - yy / H * 0.25, 0.7, 1.1)[..., None]
rysa = np.clip(rysy * 1.4, 0, 1)
przelom = np.clip(np.roll(np.roll(rysa, 2, 0), 1, 1) - rysa, 0, 1)
kamien = kamien * (1 - 0.55 * przelom)[..., None] + np.array([214, 202, 180], np.float32) * (0.55 * przelom)[..., None]
kamien = kamien * (1 - 0.85 * rysa)[..., None] + np.array([16, 12, 10], np.float32) * (0.85 * rysa)[..., None]
kamien = kamien * (1 - 0.88 * kreska)[..., None] + np.array([24, 18, 14], np.float32) * (0.88 * kreska)[..., None]
kamien = np.clip(kamien, 0, 255)

# --- świecenie: R — żyły żaru (część kreski wnętrza, cała kreska aureoli), G — rysy, B — oczy
zew = cala & ~zwez(cala, 4)
bramka = rozmyj(rng.random((H, W)).astype(np.float32), 9)
bramka = (bramka - bramka.mean()) / (bramka.std() + 1e-6)
bramka = np.clip((bramka + 0.35) * 1.1, 0, 1)
zyly = kreska * np.where(au, 1.0, bramka * 0.95) * ~zew
zyly = np.clip(rozmyj(zyly, 0.6) * 1.15, 0, 1)
oczy = np.zeros((H, W), np.float32)
for ox, oy in OCZY: oczy = np.maximum(oczy, np.clip(1 - np.hypot(xx - ox, yy - oy) / 8.5, 0, 1) ** 0.7)


def pekniecia():
    """Pęknięcia ran w czterech stopniach (rysy wzoru w pierwszym) — odsłaniają się, gdy demon traci życie."""
    SK = 4
    warstwy = [Image.new('L', (W * SK, H * SK), 0) for _ in range(4)]
    dozwolone = cala & ~au & ~kosc & ~zew
    r = np.random.default_rng(11)

    def idz(st, x, y, kat, dl, gr, glebia):
        pts = [(x * SK, y * SK)]
        for _ in range(int(dl / 3)):
            kat += r.normal(0, 0.16)
            x += np.cos(kat) * 3; y += np.sin(kat) * 3
            if not (0 <= int(x) < W and 0 <= int(y) < H) or not dozwolone[int(y), int(x)]: break
            pts.append((x * SK, y * SK))
            if glebia < 2 and r.random() < 0.05:
                idz(st, x, y, kat + r.choice([-1, 1]) * r.uniform(0.5, 1.1), dl * 0.45, gr * 0.7, glebia + 1)
        if len(pts) > 1: ImageDraw.Draw(warstwy[st]).line(pts, fill=255, width=max(1, int(gr * SK)), joint='curve')

    ys, xs = np.nonzero(dozwolone)
    for st in range(4):
        for _ in range(6):
            k = r.integers(len(xs))
            idz(st, float(xs[k]), float(ys[k]), r.uniform(0, 2 * np.pi), r.uniform(60, 190), r.uniform(2.6, 3.8), 0)
    pokr = [np.asarray(w.resize((W, H), Image.BOX)).astype(np.float32) / 255 for w in warstwy]
    pokr[0] = np.maximum(pokr[0], np.clip(rysy * 1.3, 0, 1))
    # zapis w jednym kanale: stopień × 64 + 1 + pokrycie (0…62); 0 — brak
    kod = np.zeros((H, W), np.float32); wolne = np.ones((H, W), bool)
    for st in range(4):
        m = wolne & (pokr[st] > 0.02)
        kod[m] = st * 64 + 1 + np.rint(np.clip(pokr[st][m], 0, 1) * 62)
        wolne &= ~m
    return kod / 255


zar = np.stack([zyly, pekniecia(), oczy], -1)


# ---------- zakładki i atlas ----------
def wypelnij(kol, zrodlo, cel):
    """Zamalowuje `cel` barwą z `zrodlo` (splot znormalizowany, coraz szerszy)."""
    out = kol.copy(); zostalo = cel.copy()
    for s in (3, 6, 12, 24, 48, 96):
        if not zostalo.any(): break
        den = rozmyj(zrodlo, s)
        num = np.stack([rozmyj(kol[..., c] * zrodlo, s) for c in range(3)], -1)
        m = zostalo & (den > 0.02)
        out[m] = num[m] / den[m][:, None]
        zostalo &= ~m
    return out


meta = {}
klocki = []
for i, (n, _, staw, rodzic) in enumerate(CZESCI):
    vis = widoczna[i]
    zprzodu = np.zeros((H, W), bool)
    for j in range(i + 1, len(NAZWY)): zprzodu |= widoczna[j]
    zak = np.zeros((H, W), bool)
    for z in ZAKLADKI.get(n, []):
        if z[0] == 'kolo': zak |= np.hypot(xx - z[1], yy - z[2]) <= z[3]
        elif z[0] == 'elipsa': zak |= ((xx - z[1]) / z[3]) ** 2 + ((yy - z[2]) / z[4]) ** 2 <= 1
        elif z[0] == 'wiel': zak |= wielokat(z[1])
        elif z[0] == 'czesc':
            m = widoczna[IDX[z[1]]].copy()
            if z[2] > 0: m &= yy >= z[2]
            if z[2] < 0: m &= yy <= -z[2]
            zak |= rozszerz(m, 3)
    zak &= zprzodu & ~vis
    zak = rozszerz(zak, 1) & ~vis & (zprzodu | rozszerz(vis, 2))
    widz = rozszerz(vis, 2)                                   # zakładka 2 px pod sąsiada — przy obrocie nie ma szczeliny
    a = np.maximum(widz * synA, zak.astype(np.float32))
    a = np.maximum(a, rozmyj(zak, 0.7) * (rozszerz(zak, 1)))  # miękki brzeg zakładki
    zrodlo = (vis & (kreska < 0.15)).astype(np.float32)
    kz = wypelnij(zywy, zrodlo, zak) if zak.any() else zywy
    kk = wypelnij(kamien, zrodlo, zak) if zak.any() else kamien
    ys, xs = np.nonzero(a > 0.02)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    zz = zar * (rozszerz(vis, 1) & ~zak)[..., None]
    klocki.append((n, x0, y0, x1, y1, a[y0:y1, x0:x1], kz[y0:y1, x0:x1], kk[y0:y1, x0:x1], zz[y0:y1, x0:x1]))
    meta[n] = {'x': x0, 'y': y0, 'w': x1 - x0, 'h': y1 - y0, 'staw': list(staw), 'rodzic': rodzic}

# pakowanie w półki (od najwyższych)
SZER = 1024; PAD = 3
kol = sorted(range(len(klocki)), key=lambda k: -(klocki[k][4] - klocki[k][2]))
px = py = wys_polki = 0; pozycje = {}
for k in kol:
    n, x0, y0, x1, y1 = klocki[k][:5]
    w, h = x1 - x0, y1 - y0
    if px + w + PAD > SZER: px = 0; py += wys_polki + PAD; wys_polki = 0
    pozycje[n] = (px, py); px += w + PAD; wys_polki = max(wys_polki, h)
AW, AH = SZER, py + wys_polki
atl_z = np.zeros((AH, AW, 4), np.float32); atl_k = np.zeros((AH, AW, 4), np.float32); atl_g = np.zeros((AH, AW, 3), np.float32)
for n, x0, y0, x1, y1, a, kz, kk, zz in klocki:
    ax, ay = pozycje[n]; h, w = a.shape
    atl_z[ay:ay + h, ax:ax + w, :3] = kz; atl_z[ay:ay + h, ax:ax + w, 3] = a * 255
    atl_k[ay:ay + h, ax:ax + w, :3] = kk; atl_k[ay:ay + h, ax:ax + w, 3] = a * 255
    atl_g[ay:ay + h, ax:ax + w] = np.rint(zz * 255)
    meta[n]['ax'], meta[n]['ay'] = ax, ay
Image.fromarray(atl_z.astype(np.uint8), 'RGBA').save(f'{D}/kukla-zywy.webp', quality=90, method=6)
Image.fromarray(atl_k.astype(np.uint8), 'RGBA').save(f'{D}/kukla-kamien.webp', quality=86, method=6)
Image.fromarray(atl_g.astype(np.uint8), 'RGB').save(f'{D}/kukla-zar.png', optimize=True)
print('atlas', AW, 'x', AH, {f: os.path.getsize(f'{D}/{f}') // 1024 for f in ('kukla-zywy.webp', 'kukla-kamien.webp', 'kukla-zar.png')}, 'KB')

# płomienie aureoli: punkty na zewnętrznym brzegu aureoli (gdzie styka się z tłem), z kierunkiem na zewnątrz
tlo = syl < 0.3
brz = rozszerz(au, 1) & rozszerz(tlo, 1)
bl = rozmyj(au, 6)
gy2, gx2 = np.gradient(bl)
ys, xs = np.nonzero(brz)
pkt = []; ostatni = None
for y, x in sorted(zip(ys, xs), key=lambda p: np.arctan2(p[0] - 300, p[1] - 314)):
    if y > 400: continue
    if ostatni and np.hypot(x - ostatni[0], y - ostatni[1]) < 15: continue
    nx, ny = -gx2[y, x], -gy2[y, x]; d = np.hypot(nx, ny) or 1
    pkt.append([int(x), int(y), round(float(nx / d), 3), round(float(ny / d), 3)]); ostatni = (x, y)
print('płomieni', len(pkt))

ts = ['/**', ' * Części kukiełki bossa (wygenerowane: scripts/pomnik/czesci.py — nie edytować ręcznie).',
      ' * x, y, w, h — prostokąt części w pikselach rysunku demona (obrazy/pomnik/demon-*.png); ax, ay — miejsce w atlasach',
      ' * (kukla-zywy.webp, kukla-kamien.webp, kukla-zar.png); staw — punkt obrotu względem rodzica.', ' */',
      'export const CZESCI_DEMONA = ' + json.dumps(meta, ensure_ascii=False) + ' as const;',
      'export type CzescDemona = keyof typeof CZESCI_DEMONA;',
      '/** Kolejność rysowania (od tyłu). */',
      'export const KOLEJNOSC_CZESCI: CzescDemona[] = ' + json.dumps(NAZWY) + ';',
      f'export const ATLAS_DEMONA = {{ w: {AW}, h: {AH} }};',
      '/** Rysunek: rozmiar i linia stóp kukły (bez płyt i cokołu posągu). */',
      f'export const RYSUNEK_DEMONA = {{ szer: {W}, wys: {H}, ziemia: {ZIEMIA}, srodek: 314 }};',
      '/** Stawy kończyn (IK). */',
      'export const STAWY_DEMONA = ' + json.dumps({k: list(v) for k, v in STAWY.items()}) + ' as const;',
      '/** Oczy i wnętrze ust (w układzie głowy). */',
      'export const OCZY_DEMONA: [number, number][] = ' + json.dumps([list(o) for o in OCZY]) + ';',
      'export const USTA_DEMONA: [number, number][] = ' + json.dumps([list(o) for o in USTA]) + ';',
      '/** Płomienie aureoli: [x, y, kierunek x, kierunek y] na zewnętrznym brzegu. */',
      'export const PLOMIENIE_AUREOLI: [number, number, number, number][] = ' + json.dumps(pkt) + ';', '']
open('src/render/demon-czesci.ts', 'w').write('\n'.join(ts))

if len(sys.argv) > 1:
    # podgląd: lewo — podział na części, środek — żywy złożony, prawo — kamień
    pal = np.array([[90, 60, 160], [40, 140, 70], [70, 170, 90], [120, 200, 60], [150, 220, 90], [30, 110, 60], [60, 150, 80], [200, 90, 60], [220, 120, 70],
                    [60, 180, 200], [120, 120, 200], [160, 200, 255], [240, 170, 60], [255, 80, 80], [250, 200, 90],
                    [250, 230, 120], [240, 240, 150], [200, 60, 160]], np.uint8)
    img = np.full((H, W, 3), 255, np.uint8)
    for i in range(len(NAZWY)): img[przyp == i] = pal[i % len(pal)]
    img[linia & (syl > 0.3)] = (img[linia & (syl > 0.3)] * 0.35).astype(np.uint8)
    tlo_ = np.array([21, 18, 16], np.float32)
    z = zywy * synA[..., None] + tlo_ * (1 - synA[..., None])
    rys_ = ((np.rint(zar[..., 1] * 255).astype(int) & 63) > 0).astype(np.float32)[..., None] * 0.7
    z = np.clip(z + zar[..., 0:1] * np.array([255, 120, 40]) * 0.8 + zar[..., 2:3] * np.array([255, 230, 160]), 0, 255)
    z2 = np.clip(z + rys_ * np.array([255, 100, 30]), 0, 255)
    z = np.concatenate([z, z2], 1); img = np.concatenate([img, np.full_like(img, 255)], 1)[:, :W * 2] if False else img
    k_ = kamien * synA[..., None] + tlo_ * (1 - synA[..., None])
    Image.fromarray(np.concatenate([img, z.astype(np.uint8), k_.astype(np.uint8)], 1)).save(sys.argv[1])
