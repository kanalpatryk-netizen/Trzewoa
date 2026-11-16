#!/usr/bin/env python3
"""
Oprawa walki z bossem (docs/plan-oprawy-cerber.md), etap 0: średnia jasność klatek przed/po.

Liczy dla każdej klatki średnią jasność (luma BT.709 z wartości RGB 0–255, tak jak Y' w wideo) w trzech miejscach:
  - pole  — całe pole gry (płyta świata),
  - pas   — pas akcji: pas pola gry, w którym stoją boss i walczący (korytarz / loch),
  - tlo   — pole gry bez pasa akcji.
Do tego najmniejszą, największą i średnią wartość w całej serii oraz największą zmianę między kolejnymi klatkami
(tak jak w pomiarze nagrania: „34–38, zmiana najwyżej ~1,6”).

Wejście: katalog z `Trzewia --zrzuty-walki KATALOG` (PNG + klatki.json z prostokątami pola i pasa) albo dowolne PNG
z prostokątami podanymi ręcznie (--pole, --pas w pikselach: x,y,szer,wys).

  python3 jasnosc.py KATALOG                       # tabela i podsumowanie jednej serii
  python3 jasnosc.py PRZED PO                      # dwie serie z tym samym ziarnem: obok siebie i różnica
  python3 jasnosc.py klatki/*.png --pole 0,0,1280,720 --pas 0,300,1280,200
  python3 jasnosc.py KATALOG --csv wynik.csv       # też do pliku CSV

Potrzebuje Pillow i numpy (pip install pillow numpy).
"""
import argparse
import csv
import json
import os
import sys

import numpy as np
from PIL import Image


def luma(obraz):
    """Luma BT.709 (0–255) z obrazu RGB jako tablica float32."""
    a = np.asarray(obraz.convert("RGB"), dtype=np.float32)
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def prostokat(p, szer, wys):
    """[x, y, w, h] → wycinek indeksów przycięty do obrazu."""
    x, y, w, h = (int(round(v)) for v in p)
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(szer, x + w), min(wys, y + h)
    return slice(y0, max(y0, y1)), slice(x0, max(x0, x1))


def zmierz(plik, pole, pas):
    Y = luma(Image.open(plik))
    wys, szer = Y.shape
    pole = pole or [0, 0, szer, wys]
    sp = prostokat(pole, szer, wys)
    wynik = {"pole": float(Y[sp].mean())}
    if pas:
        maska = np.zeros_like(Y, dtype=bool)
        maska[sp] = True
        mpas = np.zeros_like(maska)
        mpas[prostokat(pas, szer, wys)] = True
        mpas &= maska
        wynik["pas"] = float(Y[mpas].mean()) if mpas.any() else float("nan")
        reszta = maska & ~mpas
        wynik["tlo"] = float(Y[reszta].mean()) if reszta.any() else float("nan")
    return wynik


def wczytaj_serie(zrodla, pole_r, pas_r):
    """Lista (nazwa, czas_s, zdarzenie, faza, pomiar) z katalogu zrzutów albo z listy PNG."""
    if len(zrodla) == 1 and os.path.isdir(zrodla[0]):
        katalog = zrodla[0]
        opis = os.path.join(katalog, "klatki.json")
        if os.path.exists(opis):
            with open(opis, encoding="utf-8") as f:
                dane = json.load(f)
            seria = []
            for k in dane["klatki"]:
                m = zmierz(os.path.join(katalog, k["plik"]), pole_r or k.get("plyta"), pas_r or k.get("pas"))
                seria.append((k["plik"], k.get("czasS"), k.get("zdarzenie"), k.get("faza"), m))
            return seria, dane
        zrodla = sorted(os.path.join(katalog, n) for n in os.listdir(katalog) if n.lower().endswith(".png"))
    seria = [(os.path.basename(p), None, None, None, zmierz(p, pole_r, pas_r)) for p in zrodla]
    return seria, None


def podsumuj(seria, klucz):
    w = np.array([m[klucz] for *_, m in seria if klucz in m and not np.isnan(m[klucz])], dtype=np.float64)
    if w.size == 0:
        return None
    skok = float(np.abs(np.diff(w)).max()) if w.size > 1 else 0.0
    return {"min": float(w.min()), "max": float(w.max()), "srednia": float(w.mean()), "skok": skok}


def liczba(v):
    return "   —  " if v is None or (isinstance(v, float) and np.isnan(v)) else f"{v:6.1f}"


def drukuj_serie(nazwa, seria, dane):
    print(f"\n== {nazwa}" + (f"  (ziarno {dane['ziarno']}, oprawa {'wł.' if dane['oprawa'] else 'wył.'})" if dane else ""))
    print(f"{'klatka':<18}{'czas s':>8}  {'pole':>6}  {'pas':>6}  {'tło':>6}  zdarzenie / faza")
    for plik, czas, zd, faza, m in seria:
        c = f"{czas:8.2f}" if czas is not None else "       —"
        print(f"{plik:<18}{c}  {liczba(m.get('pole'))}  {liczba(m.get('pas'))}  {liczba(m.get('tlo'))}  {zd or ''}{' · ' + faza if faza else ''}")
    print("podsumowanie (min / max / średnia / największa zmiana między klatkami):")
    for k in ("pole", "pas", "tlo"):
        s = podsumuj(seria, k)
        if s:
            print(f"  {k:<5} {s['min']:6.1f} / {s['max']:6.1f} / {s['srednia']:6.1f} / {s['skok']:5.2f}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("zrodla", nargs="+", help="katalog zrzutów, dwa katalogi (przed, po) albo pliki PNG")
    ap.add_argument("--pole", help="x,y,szer,wys pola gry (zamiast z klatki.json)")
    ap.add_argument("--pas", help="x,y,szer,wys pasa akcji (zamiast z klatki.json)")
    ap.add_argument("--csv", help="zapisz pomiary do pliku CSV")
    a = ap.parse_args()
    pole = [float(v) for v in a.pole.split(",")] if a.pole else None
    pas = [float(v) for v in a.pas.split(",")] if a.pas else None

    dwie = len(a.zrodla) == 2 and all(os.path.isdir(z) for z in a.zrodla)
    serie = [wczytaj_serie([z], pole, pas) for z in a.zrodla] if dwie else [wczytaj_serie(a.zrodla, pole, pas)]
    nazwy = a.zrodla if dwie else [", ".join(a.zrodla) if len(a.zrodla) < 3 else f"{len(a.zrodla)} plików"]

    if not dwie:
        drukuj_serie(nazwy[0], *serie[0])
    else:
        (s1, d1), (s2, d2) = serie
        for n, (s, d) in zip(nazwy, serie):
            drukuj_serie(n, s, d)
        wspolne = {p: m for p, *_, m in s2}
        print(f"\n== różnica (po − przed) dla klatek o tej samej nazwie ({sum(1 for p, *_ in s1 if p in wspolne)} wspólnych)")
        for k in ("pole", "pas", "tlo"):
            r = [wspolne[p][k] - m[k] for p, *_, m in s1 if p in wspolne and k in m and k in wspolne[p]]
            if r:
                r = np.array(r)
                print(f"  {k:<5} średnio {r.mean():+6.2f}   najmniej {r.min():+6.2f}   najwięcej {r.max():+6.2f}")

    if a.csv:
        with open(a.csv, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["seria", "klatka", "czas_s", "zdarzenie", "faza", "pole", "pas", "tlo"])
            for n, (s, _) in zip(nazwy, serie):
                for plik, czas, zd, faza, m in s:
                    w.writerow([n, plik, czas, zd or "", faza or "", m.get("pole"), m.get("pas"), m.get("tlo")])
        print(f"\nCSV: {a.csv}")


if __name__ == "__main__":
    sys.exit(main())
