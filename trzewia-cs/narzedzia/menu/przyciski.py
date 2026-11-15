#!/usr/bin/env python3
"""
Przyciski menu (odręczne, 15.11) — z oryginałów w dane/grafika/menu/przyciski/oryginaly/ (czarny tusz na białym)
robi pliki do gry i do Unity: dane/grafika/menu/przyciski/<nazwa>.png i ../trzewia-unity/Assets/Trzewia/Menu/Przyciski/<nazwa>.png.

  • tusz → biała kreska, papier → przezroczystość (jak logo: gra zabarwia obrazek na barwę napisu),
  • każdy przycisk przeskalowany tak, żeby ozdobniki po bokach miały WYSOKOSC_OZDOBNIKA px — wtedy wszystkie siedem
    stawia się w tej samej skali i litery wychodzą jednej wielkości,
  • przycięty do rysunku, ze środkiem ozdobników w środku wysokości obrazka (ogonki „ę” i „g” mieszczą się w zapasie).

Uruchomienie: python3 narzedzia/menu/przyciski.py   (potrzebny Pillow i numpy)
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

TU = Path(__file__).resolve().parent
KORZEN = TU.parent.parent
ZRODLA = KORZEN / 'dane/grafika/menu/przyciski/oryginaly'
CELE = [KORZEN / 'dane/grafika/menu/przyciski', KORZEN.parent / 'trzewia-unity/Assets/Trzewia/Menu/Przyciski']
WYSOKOSC_OZDOBNIKA = 300
ZAPAS = 12          # px (po przeskalowaniu) wokół rysunku
PAPIER, TUSZ = 245, 40   # jasność: od PAPIER w górę — przezroczyste, do TUSZ — pełny tusz

# id pozycji menu (EkranMenu, nastawy MENU.pozycje) → plik
PRZYCISKI = {
    'wroc': 'graj-dalej',
    'nowa': 'nowa-gra',
    'wczytaj': 'wczytaj-gre',
    'samouczek': 'samouczek',
    'bestiariusz': 'atlas',
    'osiagniecia': 'osiagniecia',
    'ustawienia': 'ustawienia',
}


def ozdobnik(alfa: np.ndarray, x0: int, x1: int) -> tuple[int, int]:
    """Górny i dolny wiersz tuszu w pasie kolumn [x0, x1)."""
    wiersze = np.where(alfa[:, x0:x1].max(axis=1) > 0.3)[0]
    return int(wiersze.min()), int(wiersze.max())


def zrob(nazwa: str) -> dict:
    jasnosc = np.asarray(Image.open(ZRODLA / f'{nazwa}.png').convert('L'), dtype=np.float32)
    alfa = np.clip((PAPIER - jasnosc) / (PAPIER - TUSZ), 0, 1)
    ys, xs = np.where(alfa > 0.05)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    # ozdobniki: skrajne pasy po bokach — ozdobnik jest prawie tak szeroki jak wysoki, litery zaczynają się dalej
    pas = max(8, int((y1 - y0) * 0.85))
    lg, ld = ozdobnik(alfa, x0, x0 + pas)
    pg, pd = ozdobnik(alfa, x1 - pas, x1)
    gora, dol = (lg + pg) / 2, (ld + pd) / 2
    skala = WYSOKOSC_OZDOBNIKA / (dol - gora)
    srodek = (gora + dol) / 2
    pol = max(srodek - y0, y1 - srodek) + ZAPAS / skala
    za = ZAPAS / skala
    ramka = (int(np.floor(x0 - za)), int(np.floor(srodek - pol)), int(np.ceil(x1 + za)), int(np.ceil(srodek + pol)))
    w, h = ramka[2] - ramka[0], ramka[3] - ramka[1]
    # wycinek z przezroczystym zapasem także poza brzegiem oryginału (rysunek dotyka krawędzi)
    pelna = np.zeros((h, w), dtype=np.float32)
    sx0, sy0 = max(0, ramka[0]), max(0, ramka[1])
    sx1, sy1 = min(alfa.shape[1], ramka[2]), min(alfa.shape[0], ramka[3])
    pelna[sy0 - ramka[1]:sy1 - ramka[1], sx0 - ramka[0]:sx1 - ramka[0]] = alfa[sy0:sy1, sx0:sx1]
    maska = Image.fromarray((pelna * 255).round().astype(np.uint8), 'L')
    W, H = round(w * skala), round(h * skala)
    maska = maska.resize((W, H), Image.LANCZOS)
    obraz = Image.new('RGBA', (W, H), (255, 255, 255, 0))
    obraz.putalpha(maska)
    for cel in CELE:
        cel.mkdir(parents=True, exist_ok=True)
        obraz.save(cel / f'{nazwa}.png', optimize=True)
    return {'plik': f'{nazwa}.png', 'szerokosc': W, 'wysokosc': H, 'ozdobnik': WYSOKOSC_OZDOBNIKA}


def main() -> None:
    spis = {}
    for id_, nazwa in PRZYCISKI.items():
        spis[id_] = zrob(nazwa)
        print(f'{nazwa}: {spis[id_]["szerokosc"]}×{spis[id_]["wysokosc"]}')
    for cel in CELE:
        (cel / 'przyciski.json').write_text(json.dumps({
            'opis': 'Przyciski menu: biała kreska na przezroczystości (zabarwić na barwę napisu). Ozdobniki mają '
                    f'{WYSOKOSC_OZDOBNIKA} px wysokości we wszystkich plikach, środek ozdobników = środek wysokości obrazka.',
            'przyciski': spis,
        }, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
