"""Baza zagadek: wczytywanie, losowanie i sprawdzanie odpowiedzi."""

from __future__ import annotations

import json
import random
import re
import time
from dataclasses import dataclass, field
from pathlib import Path

KATALOG = Path(__file__).resolve().parent
PLIK_BAZY = KATALOG / "zagadki.json"
PLIK_HISTORII = KATALOG / ".historia_zagadek.json"

# Ile ostatnio zadanych zagadek pomijać przy losowaniu, żeby się nie powtarzały.
PAMIEC_HISTORII = 30

_POLSKIE = str.maketrans("ąćęłńóśźżĄĆĘŁŃÓŚŹŻ", "acelnoszzACELNOSZZ")

_LICZEBNIKI = {
    "zero": "0",
    "jeden": "1", "jedna": "1", "jedno": "1", "jednego": "1",
    "dwa": "2", "dwie": "2", "dwoch": "2",
    "trzy": "3", "trzech": "3",
    "cztery": "4", "czterech": "4",
    "piec": "5", "pieciu": "5",
    "szesc": "6", "szesciu": "6",
    "siedem": "7", "siedmiu": "7",
    "osiem": "8", "osmiu": "8",
    "dziewiec": "9", "dziewieciu": "9",
    "dziesiec": "10", "dziesieciu": "10",
    "jedenascie": "11",
    "dwanascie": "12",
    "trzynascie": "13",
    "czternascie": "14",
    "pietnascie": "15",
    "szesnascie": "16",
    "siedemnascie": "17",
    "osiemnascie": "18",
    "dziewietnascie": "19",
    "dwadziescia": "20",
}


def normalizuj(tekst: str) -> str:
    """Sprowadza odpowiedź do prostej postaci: małe litery, bez polskich znaków,
    bez interpunkcji, liczebniki zamienione na cyfry, przecinek dziesiętny na kropkę."""
    t = tekst.strip().lower().translate(_POLSKIE)
    t = re.sub(r"(?<=\d),(?=\d)", ".", t)  # 7,5 -> 7.5
    t = re.sub(r"(?<=\d)\s*zl\b", " zl", t)  # 2zł -> 2 zl
    t = re.sub(r"[^a-z0-9.:\s]", " ", t)
    t = re.sub(r"(?<!\d)[.:]|[.:](?!\d)", " ", t)  # kropki/dwukropki tylko wewnątrz liczb
    slowa = [_LICZEBNIKI.get(s, s) for s in t.split()]
    return " ".join(slowa)


def _liczby(tekst: str) -> list[str]:
    return re.findall(r"\d+(?:[.:]\d+)?", tekst)


@dataclass
class Zagadka:
    id: int
    pytanie: str
    odpowiedzi: list[str]
    kategoria: str = "inne"
    trudnosc: int = 1
    podpowiedz: str = ""
    wyjasnienie: str = ""
    _wzorce: list[str] = field(default_factory=list, repr=False)

    def __post_init__(self) -> None:
        self._wzorce = [normalizuj(o) for o in self.odpowiedzi if normalizuj(o)]

    def sprawdz(self, odpowiedz: str) -> bool:
        """Czy odpowiedź użytkownika jest poprawna.

        Wystarczy dokładne trafienie w którąś z dopuszczalnych odpowiedzi albo
        krótkie zdanie, które ją zawiera (np. „tyle samo kilogramów”). Wypisanie
        kilku liczb naraz, żeby trafić na chybił-trafił, się nie liczy."""
        u = normalizuj(odpowiedz)
        if not u:
            return False
        if u in self._wzorce:
            return True
        slowa_u = u.split()
        liczby_u = _liczby(u)
        for w in self._wzorce:
            slowa_w = w.split()
            if len(slowa_u) - len(slowa_w) > 3:
                continue
            if len(liczby_u) > len(_liczby(w)):
                continue
            if f" {w} " in f" {u} ":
                return True
        return False


def wczytaj_baze(plik: Path = PLIK_BAZY) -> list[Zagadka]:
    with open(plik, encoding="utf-8") as f:
        dane = json.load(f)
    zagadki = []
    for z in dane["zagadki"]:
        zagadki.append(
            Zagadka(
                id=int(z["id"]),
                pytanie=z["pytanie"],
                odpowiedzi=list(z["odpowiedzi"]),
                kategoria=z.get("kategoria", "inne"),
                trudnosc=int(z.get("trudnosc", 1)),
                podpowiedz=z.get("podpowiedz", ""),
                wyjasnienie=z.get("wyjasnienie", ""),
            )
        )
    return zagadki


def _czytaj_historie() -> list[int]:
    try:
        with open(PLIK_HISTORII, encoding="utf-8") as f:
            return [int(x) for x in json.load(f).get("ostatnie", [])]
    except (OSError, ValueError, AttributeError):
        return []


def zapisz_w_historii(zagadka: Zagadka) -> None:
    ostatnie = [i for i in _czytaj_historie() if i != zagadka.id]
    ostatnie.append(zagadka.id)
    try:
        with open(PLIK_HISTORII, "w", encoding="utf-8") as f:
            json.dump({"ostatnie": ostatnie[-PAMIEC_HISTORII:], "zapisano": time.time()}, f)
    except OSError:
        pass


class Losowanie:
    """Losuje zagadki o wybranej trudności, unikając ostatnio zadanych."""

    def __init__(self, zagadki: list[Zagadka], trudnosc: int | None = None,
                 rng: random.Random | None = None) -> None:
        pula = [z for z in zagadki if trudnosc is None or z.trudnosc == trudnosc]
        self.pula = pula or list(zagadki)
        if not self.pula:
            raise ValueError("Baza zagadek jest pusta.")
        self.rng = rng or random.Random()
        self._uzyte: set[int] = set()

    def nastepna(self, pomin: Zagadka | None = None) -> Zagadka:
        historia = set(_czytaj_historie())
        for warunek in (
            lambda z: z.id not in self._uzyte and z.id not in historia,
            lambda z: z.id not in self._uzyte,
            lambda z: pomin is None or z.id != pomin.id,
            lambda z: True,
        ):
            kandydaci = [z for z in self.pula if warunek(z)]
            if kandydaci:
                break
        wybrana = self.rng.choice(kandydaci)
        self._uzyte.add(wybrana.id)
        return wybrana


# Po ilu błędnych odpowiedziach odblokowuje się podpowiedź i zmiana zagadki.
BLEDY_DO_PODPOWIEDZI = 1
BLEDY_DO_ZMIANY = 3


class SesjaAlarmu:
    """Stan dzwoniącego budzika: ile zagadek trzeba rozwiązać, która jest teraz,
    ile było błędów. Wspólna dla okna i trybu konsolowego."""

    def __init__(self, losowanie: Losowanie, ile: int = 1) -> None:
        self.losowanie = losowanie
        self.ile = max(1, ile)
        self.rozwiazane = 0
        self.bledy = 0
        self.wszystkie_bledy = 0
        self.aktualna = self._wylosuj()

    def _wylosuj(self, pomin: Zagadka | None = None) -> Zagadka:
        z = self.losowanie.nastepna(pomin)
        zapisz_w_historii(z)
        self.bledy = 0
        return z

    @property
    def koniec(self) -> bool:
        return self.rozwiazane >= self.ile

    @property
    def moze_podpowiedz(self) -> bool:
        return self.bledy >= BLEDY_DO_PODPOWIEDZI and bool(self.aktualna.podpowiedz)

    @property
    def moze_zmienic(self) -> bool:
        return self.bledy >= BLEDY_DO_ZMIANY

    def odpowiedz(self, tekst: str) -> bool:
        if self.koniec:
            return True
        if self.aktualna.sprawdz(tekst):
            self.rozwiazane += 1
            return True
        if tekst.strip():
            self.bledy += 1
            self.wszystkie_bledy += 1
        return False

    def nastepna(self) -> Zagadka:
        """Po poprawnej odpowiedzi — przejdź do kolejnej zagadki."""
        self.aktualna = self._wylosuj(self.aktualna)
        return self.aktualna

    def zmien(self) -> Zagadka:
        """Wymień zagadkę na inną (dopiero po kilku błędach). Nie zalicza jej."""
        if not self.moze_zmienic:
            return self.aktualna
        self.aktualna = self._wylosuj(self.aktualna)
        return self.aktualna
