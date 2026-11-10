#!/usr/bin/env python3
"""
Kroje pisma gry (alpha-1/src/render/fonts.ts) → dane/czcionki/*.ttf.

W TS cztery kroje są wpisane w kod jako WOFF2 w base64. Skia na Windows nie czyta WOFF2 z pliku, więc rozpakowuję
je raz do TTF — kształty liter bez zmian (fontTools tylko zdejmuje kompresję). Na koniec sprawdzam, czy każdy krój
ma polskie znaki.

Użycie (z folderu trzewia-cs): python3 narzedzia/kroje.py
Potrzebuje: pip install fonttools brotli
"""
import base64, io, os, re, sys
from fontTools.ttLib import TTFont

TU = os.path.dirname(os.path.abspath(__file__))
ZRODLO = os.path.join(TU, '..', '..', 'alpha-1', 'src', 'render', 'fonts.ts')
CEL = os.path.join(TU, '..', 'dane', 'czcionki')

# stała w fonts.ts → plik (nazwa rodziny i krój są w Rysunek/Fonts.cs)
PLIKI = {'TEKST': 'trzewia-tekst.ttf', 'KURSYWA': 'trzewia-tekst-kursywa.ttf', 'TYTUL': 'trzewia-tytul.ttf', 'PISMO': 'trzewia-pismo.ttf'}
POLSKIE = 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ'

def main() -> int:
    ts = open(ZRODLO, encoding='utf-8').read()
    os.makedirs(CEL, exist_ok=True)
    blad = 0
    for stala, plik in PLIKI.items():
        m = re.search(r"const %s = 'data:font/woff2;base64,([A-Za-z0-9+/=]+)'" % stala, ts)
        if not m:
            print(f'brak stałej {stala} w fonts.ts'); return 1
        f = TTFont(io.BytesIO(base64.b64decode(m.group(1))))
        f.flavor = None                       # WOFF2 → zwykły TTF/OTF
        sciezka = os.path.join(CEL, plik)
        f.save(sciezka)
        cmap = f.getBestCmap()
        brak = [z for z in POLSKIE if ord(z) not in cmap]
        nazwa = f['name'].getDebugName(1)
        print(f'{plik}: {os.path.getsize(sciezka)} B, rodzina „{nazwa}”, znaków {len(cmap)}, '
              + ('polskie znaki — wszystkie' if not brak else 'BRAK: ' + ''.join(brak)))
        if brak: blad = 1
    return blad

if __name__ == '__main__':
    sys.exit(main())
