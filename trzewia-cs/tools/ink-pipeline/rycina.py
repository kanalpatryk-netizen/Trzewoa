#!/usr/bin/env python3
# Oprawa walki, etap 5 (docs/plan-oprawy-cerber.md): jeden sprite z błyszczącego renderu/naklejki na styl ryciny
# (Gustave Doré, "Piekło"): odbarwienie → jasna baza z palety gry (paleta.json — te same barwy co
# Trzewia.Nastawy.NastawyBarwy.BARWA/FRESK, patrz src/Trzewia.Gra/Visual/Palette.cs) → cień dokłada WYŁĄCZNIE
# kreskowanie (jak w prawdziwym rycie: ciemność to gęstość kreski, nie czarna plama) → ciemny kontur 2 px zamiast
# jasnej/białej obwódki.
#
# Krew i żar/ogień NIE idą przez zwykłą (neutralną) rampę barw — mają własne, bo to one niosą kolor w świecie,
# który poza tym jest prawie monochromatyczny (zasada BARWA: "nic nie świeci kolorem, którego nie ma w świecie").
#
# Użycie:
#   python3 rycina.py WEJŚCIE.webp WYJŚCIE.png [--sheet ARKUSZ.png] [--no-hatch] [--render] [--bez-konturu]
#   python3 rycina.py --batch LISTA.txt KATALOG_WE KATALOG_WY [--render] [--bez-konturu]
# --render: dla błyszczących renderów 3D bez własnej kreski (Cerber) — mocniejsze progi kreskowania niż domyślne
#           (dla już-gotowych, płasko cieniowanych sprite'ów, np. ludzi).
# --bez-konturu (22.11, ludzie): bez żadnego obramowania — ani ciemnego konturu, ani jasnej obwódki z oryginału.
#           Tak powstały dane/grafika/duszki-rycina/*.webp ludzi (z katalogu trzewia-cs):
#           python3 tools/ink-pipeline/rycina.py --batch tools/ink-pipeline/ludzie.txt dane/grafika/duszki \
#               dane/grafika/duszki-rycina --bez-konturu
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

TU = Path(__file__).parent
PALETA = json.load(open(TU / "paleta.json", encoding="utf-8"))


def hex_rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) for i in (0, 2, 4)], dtype=np.float64)


P = {k: hex_rgb(v) for k, v in PALETA.items()}

# Rampy BAZY (bez kreskowania): tylko górna połowa jasności — reszta ciemności idzie z kreski, nie z koloru.
RAMPA_NEUTRALNA = [P["kamien"], P["kosc"], P["pergamin"]]
RAMPA_KREW = [P["tusz"], P["krew"], P["krewJasna"]]
RAMPA_OGIEN = [P["kamien"], P["ogien"], P["zar"]]


def rampa_na(rampa, t):
    t = np.clip(t, 0.0, 1.0)
    n = len(rampa) - 1
    i = np.clip((t * n).astype(int), 0, n - 1)
    lok = (t * n - i)[..., None]
    a = np.stack(rampa, axis=0)[i]
    b = np.stack(rampa, axis=0)[np.clip(i + 1, 0, n)]
    return a + (b - a) * lok


def odbarw(im: Image.Image, nasycenie=0.22) -> tuple:
    """Krok 1+2: baza w tonach z palety (jasna połowa — cień dokłada kreska) + mapa jasności ORYGINAŁU (do kreski)."""
    rgba = np.asarray(im.convert("RGBA"), dtype=np.float64)
    r, g, b, a = rgba[..., 0], rgba[..., 1], rgba[..., 2], rgba[..., 3]
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    v = mx / 255
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    # odcień (stopnie): wzór HSV bez pętli (wektorowo)
    h = np.zeros_like(v)
    delta = np.maximum(mx - mn, 1e-6)
    rmax, gmax, bmax = (mx == r), (mx == g) & ~(mx == r), (mx == b) & ~(mx == r) & ~(mx == g)
    h = np.where(rmax, ((g - b) / delta) % 6, h)
    h = np.where(gmax, (b - r) / delta + 2, h)
    h = np.where(bmax, (r - g) / delta + 4, h)
    h = h * 60
    krew_m = (s > 0.38) & ((h >= 330) | (h <= 18))
    ogien_m = (s > 0.42) & (v > 0.28) & (h > 18) & (h <= 65)
    # baza na pełnym zakresie jasności — ton sam w sobie musi być poprawny nawet bez kreski (niektóre sprite'y,
    # płasko cieniowane, prawie jej nie dostają — zob. kreskuj()); kreska to tekstura NAD tonem, nie jedyny nośnik cienia
    baza = rampa_na(RAMPA_NEUTRALNA, v)
    baza_krew = rampa_na(RAMPA_KREW, v)
    baza_ogien = rampa_na(RAMPA_OGIEN, v)
    baza = np.where(krew_m[..., None], baza_krew, baza)
    baza = np.where(ogien_m[..., None], baza_ogien, baza)
    # odrobina oryginalnej barwy nasycenia z powrotem, żeby różne sprite'y nie wyszły identycznym tonem
    s_eff = np.where(krew_m | ogien_m, np.minimum(s, 0.8), np.minimum(s, nasycenie))
    # wektorowe hsv->rgb (bez pętli po pikselach): przez numpy, nie colorsys
    hp = h / 360
    i6 = np.floor(hp * 6).astype(int) % 6
    f = hp * 6 - np.floor(hp * 6)
    vv = v
    pp = vv * (1 - s_eff)
    q = vv * (1 - f * s_eff)
    t = vv * (1 - (1 - f) * s_eff)
    conds = [i6 == k for k in range(6)]
    rr = np.select(conds, [vv, q, pp, pp, t, vv], default=vv)
    gg = np.select(conds, [t, vv, vv, q, pp, pp], default=vv)
    bb = np.select(conds, [pp, pp, t, vv, vv, q], default=vv)
    tinted = np.stack([rr, gg, bb], axis=-1) * 255
    mieszanka = baza * 0.82 + tinted * 0.18
    out = np.dstack([mieszanka, a]).astype(np.uint8)
    return Image.fromarray(out, "RGBA"), v, a / 255


def kreskuj(im: Image.Image, v, alfa_maska, odstep: float, tusz, progi=(0.60, 0.76, 0.90)) -> Image.Image:
    """Krok 3: ciemność = gęstość kreski (nie zalanie kolorem) — 3 progi: pojedyncza, krzyżowa, prawie pełna.
    Kontrast jasności rozciągnięty do własnego zakresu sprite'a — inaczej płasko cieniowany sprite (wąski zakres
    jasności) wychodzi jednolicie zakreskowany (szum), zamiast kreski tylko tam, gdzie naprawdę jest cień."""
    w, h = im.size
    # Bezwzględna jasność, nie naciągana do zakresu sprite'a: sprite płasko cieniowany (mało gradientu, dużo
    # ciemnego konturu i zbroi) ma niski medianowy ton — rozciąganie do jego zakresu zalałoby całość kreską.
    ciemnosc = 1 - v
    xs, ys = np.meshgrid(np.arange(w), np.arange(h))
    kat1 = 0.9
    kat2 = kat1 - np.pi / 2
    faza1 = (xs * np.cos(kat1) + ys * np.sin(kat1)) % odstep
    faza2 = (xs * np.cos(kat2) + ys * np.sin(kat2)) % odstep
    grubosc = max(1.0, odstep * 0.22)
    linia1 = faza1 < grubosc
    linia2 = faza2 < grubosc
    # Kreska to AKCENT nad tonem bazy (ten już niesie poprawną jasność), nie jedyny nośnik cienia — progi wysoko,
    # żeby trafiały tylko naprawdę ciemne miejsca (fałdy, cień pod bronią, sierść bossa w cieniu), a płaski
    # średni ton (np. zbroja) został czystym kolorem bazy, bez szumu kreski.
    prog_a, prog_b, prog_c = progi
    ink = np.zeros((h, w), dtype=np.float64)
    ink = np.where(ciemnosc >= prog_a, np.where(linia1, 0.45, ink), ink)
    ink = np.where(ciemnosc >= prog_b, np.where(linia1 | linia2, 0.75, ink), ink)
    ink_pelna = np.clip((ciemnosc - prog_c) / max(1e-6, 1 - prog_c), 0, 1) * 0.85
    ink = np.maximum(ink, ink_pelna)
    ink = ink * alfa_maska  # tylko w obrysie sylwetki
    rgba = np.asarray(im.convert("RGBA"), dtype=np.float64)
    tusz_rgb = np.array(tusz)
    out_rgb = rgba[..., :3] * (1 - ink[..., None]) + tusz_rgb * ink[..., None]
    out = np.dstack([out_rgb, rgba[..., 3]]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def zdejmij_obwodke(im: Image.Image, grubosc: int, prog=0.58) -> Image.Image:
    """
    Krok 0 (22.11, --bez-konturu): zdejmuje jasną obwódkę wypieczoną w sprite'ach ludzi (pergaminowa otoczka wokół
    sylwetki) — piksele w pasie `grubosc` px od brzegu kształtu, jaśniejsze niż `prog`, robią się przezroczyste.
    Ciemna kreska samej postaci (jej własny obrys) zostaje.
    """
    rgba = np.asarray(im.convert("RGBA"), dtype=np.float64)
    alfa = rgba[..., 3]
    maska = Image.fromarray(((alfa > 8) * 255).astype(np.uint8), "L")
    wnetrze = maska
    for _ in range(grubosc):
        wnetrze = wnetrze.filter(ImageFilter.MinFilter(3))
    pas = (np.asarray(maska) > 0) & (np.asarray(wnetrze) == 0)
    jas = (0.2126 * rgba[..., 0] + 0.7152 * rgba[..., 1] + 0.0722 * rgba[..., 2]) / 255
    nasyc = (rgba[..., :3].max(axis=2) - rgba[..., :3].min(axis=2)) / 255
    zdjac = pas & (jas > prog) & (nasyc < 0.35)
    # półprzezroczysty brzeg obwódki (wygładzenie) — też jasny, też precz
    zdjac |= pas & (alfa < 200) & (jas > prog * 0.8)
    out = rgba.copy()
    out[..., 3] = np.where(zdjac, 0, alfa)
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def kontur(im: Image.Image, tusz, grubosc=2) -> Image.Image:
    """Krok 4: ciemny kontur z maski alfa (nie z tego, co tam wcześniej narysowano) — zamiast jasnej/białej obwódki."""
    a = im.split()[3]
    powiekszona = a.filter(ImageFilter.MaxFilter(grubosc * 2 + 1))
    warstwa = Image.new("RGBA", im.size, tuple(int(c) for c in tusz) + (0,))
    warstwa.putalpha(powiekszona)
    return Image.alpha_composite(warstwa, im.convert("RGBA"))


# Dwa tryby: gotowe sprite'y (dużo już-czytelnego konturu i płaskiego cieniowania — np. duszki ludzi) dostają
# kreskę tylko jako akcent w naprawdę ciemnych miejscach; błyszczące renderы 3D (np. Cerber, bez żadnej własnej
# kreski) potrzebują jej dużo mocniej, bo to ONA niesie tam cień zamiast gładkiego gradientu i połysku.
PROGI_PLASKI = (0.60, 0.76, 0.90)
# Grubość jasnej obwódki w sprite'ach ludzi (px, stała na wszystkich poziomach wielkości — rysowana tą samą kreską).
OBWODKA_PX = 3
PROGI_RENDER = (0.42, 0.62, 0.85)


def rycina(sciezka_we: Path, hatch=True, tryb="plaski", z_konturem=True) -> Image.Image:
    im0 = Image.open(sciezka_we).convert("RGBA")
    if not z_konturem:
        # bez żadnego obramowania: ani ciemnego konturu, ani jasnej obwódki z oryginału
        im0 = zdejmij_obwodke(im0, grubosc=OBWODKA_PX)
    baza, v, alfa_maska = odbarw(im0)
    if hatch:
        odstep = max(2.0, min(im0.size) / 55)
        progi = PROGI_RENDER if tryb == "render" else PROGI_PLASKI
        baza = kreskuj(baza, v, alfa_maska, odstep, P["tusz"], progi)
    # --bez-konturu (22.11, użytkownik: „czarne obramowania wokół postaci” — usunąć): bez ciemnego obrysu
    return kontur(baza, P["tusz"]) if z_konturem else baza


def arkusz_przed_po(sciezka_we: Path, po: Image.Image) -> Image.Image:
    przed = Image.open(sciezka_we).convert("RGBA")
    tlo = Image.new("RGBA", (przed.width + po.width + 8, max(przed.height, po.height)), (60, 56, 50, 255))
    tlo.alpha_composite(przed, (0, 0))
    tlo.alpha_composite(po, (przed.width + 8, 0))
    return tlo


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 1
    tryb = "render" if "--render" in args else "plaski"
    z_konturem = "--bez-konturu" not in args
    if args[0] == "--batch":
        lista, we, wy = Path(args[1]), Path(args[2]), Path(args[3])
        wy.mkdir(parents=True, exist_ok=True)
        pliki = [l.strip() for l in open(lista, encoding="utf-8") if l.strip()]
        for i, nazwa in enumerate(pliki):
            src = we / nazwa
            dst = wy / (Path(nazwa).stem + ".webp")
            try:
                im = rycina(src, tryb=tryb, z_konturem=z_konturem)
                # bezstratny webp: kreska to drobny, kontrastowy wzór — PNG (DEFLATE) na nim pęcznieje parokrotnie;
                # ten sam format, co oryginały Cerbera, więc silnik już go wczytuje
                im.save(dst, lossless=True, quality=100, method=6)
            except Exception as e:
                print(f"  BŁĄD {nazwa}: {e}")
                continue
            if (i + 1) % 20 == 0 or i == len(pliki) - 1:
                print(f"  {i + 1}/{len(pliki)}")
        print(f"zrobione: {len(pliki)} → {wy}")
        return 0
    we = Path(args[0])
    wy = Path(args[1])
    im = rycina(we, hatch="--no-hatch" not in args, tryb=tryb, z_konturem=z_konturem)
    wy.parent.mkdir(parents=True, exist_ok=True)
    im.save(wy)
    if "--sheet" in args:
        arkusz_przed_po(we, im).save(args[args.index("--sheet") + 1])
    print(f"{we} → {wy}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
