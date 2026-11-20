#!/usr/bin/env python3
# Balans walki w Kręgu Trzecim — wzory użytkownika (docs/walka/wzory.md):
#   L  = min + (max − min)·(a − 1),  a ∈ [1, 2]           — siła jednego ataku (w grze: losowane przy każdym ciosie)
#   O  = L · 100 / (100 + p)                               — obrażenia po pancerzu p
#   d  = ⌈hp / O⌉                                           — liczba uderzeń do zabicia
#   f  = d·czas + (d − 1)·przerwa                           — czas walki (po ostatnim ciosie nie ma już przerwy)
#   S  = (O_min + O_max) / 2                                — średnie obrażenia na cios
#   SC = ⌈hp / S⌉·czas + (⌈hp / S⌉ − 1)·przerwa             — średni czas walki (główny wskaźnik balansu)
#
# Narzędzie: (1) liczy dzisiejsze tempo każdego starcia w Kręgu (punkt odniesienia — gra jest dziś zbalansowana),
# (2) układa 100 wariantów liczb (min, max, czas, przerwa dla atakujących; p dla broniących się), (3) każdy wariant
# ocenia (zgodność SC z dzisiejszym tempem + czy czas pasuje do animacji + rozrzut + okrągłe liczby), (4) zapisuje
# wszystkie 100 do CSV i ranking do Markdown. Nic w grze nie zmienia — to materiał do konsultacji.
#
#   python3 tools/walka/balans.py [KATALOG_WYJŚCIA]       (domyślnie docs/walka)
import csv
import math
import random
import sys
from pathlib import Path

TIK = 120  # tików na sekundę w symulacji

# ───────────── wzory użytkownika ─────────────

def L(mn, mx, a):
    return mn + (mx - mn) * (a - 1)


def O(l, p):
    return l * 100 / (100 + p)


def d(hp, o):
    return max(1, math.ceil(hp / o - 1e-9))


def f(dd, czas, przerwa):
    return dd * czas + (dd - 1) * przerwa


def S(o_min, o_max):
    return (o_min + o_max) / 2


def SC(hp, s, czas, przerwa):
    return f(d(hp, s), czas, przerwa)

# ───────────── dziś (Nastawy po Krag.Ustaw(true); spis z gry, 20.11) ─────────────
# rycerz: sila = RACES[GOBLIN].strength 2 × rola 11 × OBRONA_RYCERZA.mnoznik 1,12 = 24,64; ruch × mnożnik trafień;
#         rozrzut 0,85–1,15; po ruchu przerwa OB.przerwa = 18 tików. Ruchy (dl, trafienia [tik, mnożnik], waga):
RUCHY_RYCERZA = {
    'ciecieZGory': (102, [(56, 2)], 1), 'pchniecie': (78, [(40, 1.6)], 1), 'ciecieBoczne': (90, [(48, 1.8)], 1),
    'ciecieOdwrotne': (90, [(46, 1.8)], 0.8), 'seriaTrzech': (168, [(46, 1), (86, 1), (128, 1.1)], 0.8),
    'ciecieOdDolu': (96, [(54, 1.9)], 0.9), 'piruet': (132, [(78, 3)], 0.9), 'ciosZWyskoku': (150, [(96, 3.4)], 0.8),
    'mlynek': (180, [(42, .95), (74, .95), (106, .95), (138, .95)], 0.8), 'finta': (120, [(86, 2.8)], 0.8),
    'uderzenieTarcza': (84, [(42, 1.4)], 0.9), 'szarzaZTarcza': (132, [(84, 2.6)], 0.7),
    'taranBarkiem': (108, [(62, 2.2)], 0.8), 'kolano': (72, [(38, 1.4)], 0.8), 'uderzenieHelmem': (80, [(44, 1.5)], 0.7),
}
# Cerber: DEMON.sila 10, rozrzut 0,85–1,15, przerwa WALKA_BOSSA.przerwa = 50 tików
RUCHY_CERBERA = {
    'zGory': (150, [(70, 1.35)], 1), 'zamach': (130, [(64, 1.1)], 1), 'podciecie': (140, [(70, 1.2)], .9),
    'podwojnyZamach': (190, [(70, .75), (118, .75)], .8), 'zgniecenie': (170, [(92, 1.5)], .7),
    'przygniecenie': (230, [(80, 1), (150, .45)], .35), 'odepchniecie': (100, [(50, .8)], .6),
    'tupniecie': (140, [(76, .75)], .8), 'wybuchAureoli': (200, [(118, .95)], .7), 'biczLancucha': (160, [(86, 1)], 1.1),
    'szarza': (170, [(60, 1.3)], .8),   # szarża trafia przy zetknięciu — przyjęte ~0,5 s
}


def profil_z_ruchow(ruchy, sila, przerwa_tiki):
    """Dzisiejsze ruchy jako JEDEN cios na ruch (tak liczy nowy system): średnia rana na ruch, czas do trafienia
    (ważony raną), przerwa = reszta ruchu + odpoczynek. Wagi jak w losowaniu ruchu w grze."""
    W = sum(w for _, _, w in ruchy.values())
    rana = sum(w * sila * sum(m for _, m in tr) for _, tr, w in ruchy.values()) / W
    czas = sum(w * sum(t * m for t, m in tr) / sum(m for _, m in tr) for _, tr, w in ruchy.values()) / W / TIK
    cykl = sum(w * (dl + przerwa_tiki) for dl, _, w in ruchy.values()) / W / TIK
    return rana, czas, cykl - czas


rk_rana, rk_czas, rk_przerwa = profil_z_ruchow(RUCHY_RYCERZA, 2 * 11 * 1.12, 18)
cb_rana, cb_czas, cb_przerwa = profil_z_ruchow(RUCHY_CERBERA, 10, 50)

# atakujący dziś: średnia rana na cios (bez pancerza), czas do trafienia, przerwa, rozrzut max/min
DZIS = {
    'rycerz': dict(rana=rk_rana, czas=rk_czas, przerwa=rk_przerwa, rozrzut=1.15 / 0.85),
    'cerber': dict(rana=cb_rana, czas=cb_czas, przerwa=cb_przerwa, rozrzut=1.15 / 0.85),
    # Cień: STRAZNICY.sila 2 × wzrost fali (1 → 1,6), cios od razu, co ciosCo = 120 tików
    'cien': dict(rana=2 * 1.3, czas=0.0, przerwa=1.0, rozrzut=1.15 / 0.85),
    # grabarz (robotnik): strength 2 × rola 1,2, rozrzut 0,8–1,2, co rycerzCiosCo = 60 tików
    'grabarz': dict(rana=2.4, czas=0.0, przerwa=0.5, rozrzut=1.2 / 0.8),
    # mnich z księgą: ksiega.rana 2, co 150 tików, bez rozrzutu
    'mnich': dict(rana=2.0, czas=0.0, przerwa=1.25, rozrzut=1.0),
}
# broniący się: hp (bez zmian — to nie część broni) i dzisiejszy odpowiednik pancerza
HP = {'rycerz': 120, 'rycerz+tarcza': 120, 'grabarz': 13, 'mnich': 10, 'cien': 36, 'cien4': 57.6, 'glowa': 500 / 3}
P_DZIS = {'rycerz': 0, 'rycerz+tarcza': 25, 'grabarz': 0, 'mnich': 0, 'cien': 0, 'cien4': 0, 'glowa': 0}
# Cień: hp 36 × (1 + 0,2·fala): 36 (fala 1) … 57,6 (fala 4, z Cerberem); rana Cienia rośnie tak samo — wyżej 2 × 1,3 (średnio)

# starcia (atakujący, broniący, waga ważności w ocenie)
STARCIA = [
    ('rycerz', 'glowa', 3.0), ('rycerz', 'cien', 1.0), ('rycerz', 'cien4', 1.0),
    ('grabarz', 'cien', 1.5), ('mnich', 'cien', 0.5),
    ('cien', 'rycerz', 1.0), ('cien', 'rycerz+tarcza', 1.0), ('cien', 'grabarz', 2.0), ('cien', 'mnich', 1.0),
    ('cerber', 'rycerz', 2.0), ('cerber', 'rycerz+tarcza', 1.0), ('cerber', 'grabarz', 1.0),
]
# Dziś trafienie w ruchu wypada średnio w tym miejscu animacji — nowy „czas” blisko tego = animacje bez rozciągania.
# Tylko rycerz i Cerber mają animacje związane z ciosem (ruchy, sterowane postępem). Cień ma pętlę „bije” co ~6,3 s
# (dane/grafika/duszki/straznik-krag.json), grabarz i mnich — bez osobnej animacji walki: ich animację i tak trzeba
# dorobić pod trafienie, więc ich „czas” niczego nie psuje.
CZAS_ANIMACJI = {'rycerz': rk_czas, 'cerber': cb_czas}


def sc_dzis(atak, cel):
    a = DZIS[atak]
    o = O(a['rana'], P_DZIS[cel])
    # dziś cios Cienia, grabarza i księgi wchodzi od razu (czas 0) — liczymy tak, jak liczy gra
    return f(d(HP[cel], o), a['czas'], a['przerwa'])


REF = {(a, c): sc_dzis(a, c) for a, c, _ in STARCIA}

# ───────────── 100 wariantów ─────────────

TEMPA = {
    'rycerz': [(0.4, 0.5), (0.5, 0.5), (0.5, 0.6), (0.6, 0.4), (0.6, 0.5), (0.7, 0.4), (0.7, 0.5), (0.8, 0.3), (0.8, 0.5), (1.0, 0.5)],
    'cerber': [(0.6, 0.8), (0.7, 1.0), (0.8, 0.8), (0.8, 1.0), (1.0, 0.7), (1.0, 1.0), (1.2, 0.6), (1.2, 0.8)],
    'cien': [(0.3, 0.7), (0.4, 0.6), (0.5, 0.5), (0.5, 0.7), (0.6, 0.4), (0.6, 0.6)],
    'grabarz': [(0.25, 0.25), (0.3, 0.2), (0.3, 0.3), (0.4, 0.2), (0.4, 0.4)],
    'mnich': [(0.5, 0.75), (0.6, 0.6), (0.8, 0.5), (0.8, 0.8)],
}
ROZRZUTY = [1.2, 1.35, 1.5, 1.75, 2.0]          # max / min (przykład z kartki: 10–20 → 2,0)
P_CIEN = [0, 10, 20, 30]
P_CERBER = [0, 15, 25, 50]


def okragle(x):
    """Liczby do wpisania ręcznie: od 10 w górę całe, niżej co 0,5 (Cień zadaje dziś ok. 2–3)."""
    return round(x) if x >= 10 else max(0.5, round(x * 2) / 2)


def blad_broni(atak, mn, mx, czas, przerwa, p_celow):
    """Ważony błąd SC tej broni względem dziś, po wszystkich jej celach (log stosunku — 2× dłużej = 2× krócej)."""
    e = w_s = 0.0
    for a, c, w in STARCIA:
        if a != atak:
            continue
        p = p_celow[c]
        sc = SC(HP[c], S(O(mn, p), O(mx, p)), czas, przerwa)
        e += w * abs(math.log(max(sc, 0.05) / max(REF[(a, c)], 0.05)))
        w_s += w
    return e / w_s


def bron(atak, czas, przerwa, rozrzut, p_celow):
    """min i max (już zaokrąglone, jak do wpisania) tak, żeby SC z każdym celem było jak najbliżej dzisiejszego —
    przeszukanie średniej siły; liczba ciosów d to schodki, więc zgrubne przybliżenie potrafi chybić o cały cios."""
    najl = None
    l0 = DZIS[atak]['rana']
    for i in range(400):
        lavg = l0 * (0.4 + 2.6 * i / 399)
        mn = okragle(2 * lavg / (1 + rozrzut))
        mx = max(okragle(rozrzut * 2 * lavg / (1 + rozrzut)), mn)
        e = blad_broni(atak, mn, mx, czas, przerwa, p_celow)
        if najl is None or e < najl[0] - 1e-12:
            najl = (e, mn, mx)
    return najl[1], najl[2]


def ocen(war):
    """Kara (mniej = lepiej) i szczegóły. Składniki: zgodność SC z dziś (najważniejsze), czas a animacje, rozrzut."""
    szczeg = {}
    kara_sc = 0.0
    W = 0.0
    for atak, cel, w in STARCIA:
        b = war['bron'][atak]
        p = war['p'][cel]
        o_min, o_max = O(b['min'], p), O(b['max'], p)
        s = S(o_min, o_max)
        sc = SC(HP[cel], s, b['czas'], b['przerwa'])
        pes = f(d(HP[cel], o_min), b['czas'], b['przerwa'])
        opt = f(d(HP[cel], o_max), b['czas'], b['przerwa'])
        ref = REF[(atak, cel)]
        # czas walki 0 (jeden cios od razu, dziś) — porównujemy z nowym jednym ciosem: kara tylko za liczbę ciosów
        r = abs(math.log(max(sc, 0.05) / max(ref, 0.05)))
        kara_sc += w * r
        W += w
        szczeg[(atak, cel)] = dict(S=s, d=d(HP[cel], s), SC=sc, pes=pes, opt=opt, ref=ref)
    kara_sc /= W
    kara_anim = sum(abs(math.log(war['bron'][a]['czas'] / CZAS_ANIMACJI[a])) for a in CZAS_ANIMACJI) / len(CZAS_ANIMACJI)
    kara_rozrzut = 0.0
    for a in DZIS:
        b = war['bron'][a]
        r = b['max'] / b['min']
        kara_rozrzut += 0.15 * max(0, 1.35 - r) + 0.3 * max(0, r - 2.0)
    kara_rozrzut /= len(DZIS)
    kara = 1.0 * kara_sc + 0.35 * kara_anim + 0.5 * kara_rozrzut
    return kara, dict(sc=kara_sc, anim=kara_anim, rozrzut=kara_rozrzut), szczeg


def wariant(nr, nazwa, tempa, rozrzut, p_cien, p_cerber):
    p = dict(P_DZIS)
    p['cien'] = p['cien4'] = p_cien
    p['glowa'] = p_cerber
    war = dict(nr=nr, nazwa=nazwa, rozrzut=rozrzut, p=p, bron={})
    for a in DZIS:
        czas, przerwa = tempa[a]
        mn, mx = bron(a, czas, przerwa, rozrzut if DZIS[a]['rozrzut'] > 1 else max(1.2, rozrzut), p)
        war['bron'][a] = dict(min=mn, max=mx, czas=czas, przerwa=przerwa)
    war['kara'], war['skladniki'], war['szczeg'] = ocen(war)
    return war


def najblizsze_tempo(a):
    """Tempo z listy najbliższe dzisiejszemu (czas do trafienia, cykl)."""
    dz = DZIS[a]
    cyk = dz['czas'] + dz['przerwa']
    anim = CZAS_ANIMACJI.get(a)
    return min(TEMPA[a], key=lambda t: abs(math.log((t[0] + t[1]) / cyk)) + (0.5 * abs(math.log(t[0] / anim)) if anim else 0))


def warianty():
    los = random.Random(20261120)
    lista = []
    dzis = {a: najblizsze_tempo(a) for a in DZIS}
    # kilka nazwanych — punkty odniesienia
    lista.append(wariant(1, 'jak dziś (tempo i rozrzut ±15%, bez pancerzy)', dzis, 1.35, 0, 0))
    lista.append(wariant(2, 'jak przykład z kartki (rozrzut 2,0 — „10–20”)', dzis, 2.0, 0, 0))
    lista.append(wariant(3, 'pancerne Cienie (p 20)', dzis, 1.5, 20, 0))
    lista.append(wariant(4, 'pancerny Cerber (p 25)', dzis, 1.5, 0, 25))
    szybkie = {a: min(TEMPA[a], key=lambda t: t[0] + t[1]) for a in DZIS}
    wolne = {a: max(TEMPA[a], key=lambda t: t[0] + t[1]) for a in DZIS}
    lista.append(wariant(5, 'szybkie i słabe ciosy', szybkie, 1.5, 0, 0))
    lista.append(wariant(6, 'wolne i mocne ciosy', wolne, 1.5, 0, 0))
    while len(lista) < 100:
        tempa = {a: los.choice(TEMPA[a]) for a in DZIS}
        lista.append(wariant(len(lista) + 1, 'losowy', tempa, los.choice(ROZRZUTY), los.choice(P_CIEN), los.choice(P_CERBER)))
    return lista


NAZWY = {'rycerz': 'rycerz', 'cerber': 'Cerber', 'cien': 'Cień', 'grabarz': 'grabarz', 'mnich': 'mnich (księga)'}
CELE = {'rycerz': 'rycerz', 'rycerz+tarcza': 'rycerz z tarczą', 'grabarz': 'grabarz', 'mnich': 'mnich', 'cien': 'Cień (fala 1)',
        'cien4': 'Cień (fala 4)', 'glowa': 'głowa Cerbera'}


def liczba(x):
    return f"{x:g}".replace('.', ',')


def main():
    wy = Path(sys.argv[1] if len(sys.argv) > 1 else 'docs/walka')
    wy.mkdir(parents=True, exist_ok=True)
    lista = warianty()
    ranking = sorted(lista, key=lambda w: w['kara'])
    for i, w in enumerate(ranking):
        w['miejsce'] = i + 1

    with open(wy / 'warianty.csv', 'w', newline='', encoding='utf-8') as fp:
        k = csv.writer(fp, delimiter=';')
        nag = ['miejsce', 'nr', 'nazwa', 'kara', 'kara_SC', 'kara_animacje', 'kara_rozrzut', 'p_Cien', 'p_Cerber']
        for a in DZIS:
            nag += [f'{a}_min', f'{a}_max', f'{a}_czas', f'{a}_przerwa']
        for a, c, _ in STARCIA:
            nag += [f'SC_{a}>{c}', f'dzis_{a}>{c}']
        k.writerow(nag)
        for w in sorted(lista, key=lambda w: w['nr']):
            r = [w['miejsce'], w['nr'], w['nazwa'], f"{w['kara']:.3f}", f"{w['skladniki']['sc']:.3f}", f"{w['skladniki']['anim']:.3f}",
                 f"{w['skladniki']['rozrzut']:.3f}", w['p']['cien'], w['p']['glowa']]
            for a in DZIS:
                b = w['bron'][a]
                r += [b['min'], b['max'], b['czas'], b['przerwa']]
            for a, c, _ in STARCIA:
                s = w['szczeg'][(a, c)]
                r += [f"{s['SC']:.2f}", f"{s['ref']:.2f}"]
            k.writerow(r)

    naj = ranking[0]
    md = []
    md.append('# Walka w Kręgu Trzecim — 100 wariantów liczb (do konsultacji)\n')
    md.append('Wygenerowane przez `tools/walka/balans.py`. Pełna lista: `docs/walka/warianty.csv` (średnik, UTF-8).\n')
    md.append('## Jak oceniane\n')
    md.append('- **Zgodność z dzisiejszym tempem (waga 1,0)** — dla każdego starcia średni czas walki SC (Twój wzór) '
              'porównany z dzisiejszym; liczy się stosunek (2× dłużej i 2× krócej to ta sama kara). Najważniejsze starcia: '
              'rycerz → głowa Cerbera (waga 3), Cerber → rycerz (2), Cień → grabarz (2).')
    md.append('- **Czas a animacje (0,35)** — tylko rycerz i Cerber (jedyni z animacją związaną z ciosem): jak bardzo '
              'nowy „czas” odbiega od miejsca, w którym dziś trafia cios w ich ruchach (im bliżej, tym mniej trzeba '
              'ruch rozciągać, żeby trafienie wypadło na jego końcu). Cień, grabarz i mnich dziś biją bez animacji '
              'ciosu — dorobię ją pod nowy „czas”, więc ich czas jest dowolny.')
    md.append('- min/max dobierane przeszukaniem: dla każdego tempa i rozrzutu szukam średniej siły, przy której SC we '
              'wszystkich starciach tej broni jest najbliżej dziś (liczba ciosów to schodki — zgrubny rachunek chybiał '
              'o cały cios).')
    md.append('- **Rozrzut (0,5)** — kara za bardzo płaski (poniżej ±15%, czyli max/min 1,35) i bardzo szeroki (ponad 2,0).')
    md.append('- Liczby min/max zaokrąglone tak, jak się je wpisuje ręcznie: od 10 całe, poniżej co 0,5. Życie (hp) bez zmian.\n')
    md.append('## Dziś (punkt odniesienia)\n')
    md.append('| atakujący | średnia rana na cios | czas do trafienia | przerwa | rozrzut |')
    md.append('|---|---|---|---|---|')
    for a, v in DZIS.items():
        md.append(f"| {NAZWY[a]} | {v['rana']:.1f} | {v['czas']:.2f} s | {v['przerwa']:.2f} s | ×{v['rozrzut']:.2f} |")
    md.append('')
    md.append('## Ranking — 10 najlepszych\n')
    md.append('| miejsce | nr | opis | kara | p Cienia | p Cerbera | rycerz | Cerber | Cień | grabarz | mnich |')
    md.append('|---|---|---|---|---|---|---|---|---|---|---|')
    def b(w, a):
        x = w['bron'][a]
        return f"{liczba(x['min'])}–{liczba(x['max'])}, {liczba(x['czas'])}+{liczba(x['przerwa'])} s"
    for w in ranking[:10]:
        md.append(f"| {w['miejsce']} | {w['nr']} | {w['nazwa']} | {w['kara']:.3f} | {w['p']['cien']} | {w['p']['glowa']} | "
                  f"{b(w, 'rycerz')} | {b(w, 'cerber')} | {b(w, 'cien')} | {b(w, 'grabarz')} | {b(w, 'mnich')} |")
    md.append('')
    md.append('Nazwane warianty dla porównania (gdzie wypadły w rankingu):\n')
    for w in sorted(lista, key=lambda w: w['nr'])[:6]:
        md.append(f"- nr {w['nr']} „{w['nazwa']}” — miejsce {w['miejsce']}, kara {w['kara']:.3f}")
    md.append('')
    md.append(f"## Propozycja: wariant nr {naj['nr']} (miejsce 1)\n")
    md.append('| atakujący | min | max | czas | przerwa |')
    md.append('|---|---|---|---|---|')
    for a in DZIS:
        x = naj['bron'][a]
        md.append(f"| {NAZWY[a]} | {liczba(x['min'])} | {liczba(x['max'])} | {liczba(x['czas'])} s | {liczba(x['przerwa'])} s |")
    md.append('')
    md.append(f"Pancerz p: Cień {naj['p']['cien']}, głowa Cerbera {naj['p']['glowa']}, rycerz z tarczą 25 (tarcza dziś "
              f"zmniejsza rany o 20% — w Twoim wzorze to dokładnie p = 25), reszta 0.\n")
    md.append('Każde starcie (Twoje wzory, jak w przykładzie z kartki):\n')
    md.append('| starcie | O_min | O_max | S | d_śr | SC (nowe) | najgorzej / najlepiej | dziś |')
    md.append('|---|---|---|---|---|---|---|---|')
    for a, c, _ in STARCIA:
        x = naj['bron'][a]
        p = naj['p'][c]
        s = naj['szczeg'][(a, c)]
        md.append(f"| {NAZWY[a]} → {CELE[c]} | {O(x['min'], p):.1f} | {O(x['max'], p):.1f} | {s['S']:.1f} | {s['d']} | "
                  f"{s['SC']:.1f} s | {s['pes']:.1f} / {s['opt']:.1f} s | {s['ref']:.1f} s |")
    md.append('')
    (wy / 'konsultacja.md').write_text('\n'.join(md) + '\n', encoding='utf-8')
    print(f"zapisano: {wy / 'warianty.csv'}, {wy / 'konsultacja.md'}")
    print(f"najlepszy: nr {naj['nr']} ({naj['nazwa']}), kara {naj['kara']:.3f}")


if __name__ == '__main__':
    main()
