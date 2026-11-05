"""Testy budzika:  python -m unittest test_budzik  (z katalogu budzik/)."""

import datetime as dt
import random
import tempfile
import unittest
from pathlib import Path

import zagadki
from budzik import nastepne_wystapienie, parsuj_godzine
from zagadki import Losowanie, SesjaAlarmu, Zagadka, normalizuj, wczytaj_baze


class ZHistoriaWTemp(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self._stara = zagadki.PLIK_HISTORII
        zagadki.PLIK_HISTORII = Path(self._tmp.name) / "historia.json"

    def tearDown(self):
        zagadki.PLIK_HISTORII = self._stara
        self._tmp.cleanup()


class TestBazy(unittest.TestCase):
    def setUp(self):
        self.baza = wczytaj_baze()

    def test_jest_duzo_zagadek(self):
        self.assertGreaterEqual(len(self.baza), 50)

    def test_unikalne_id_i_pola(self):
        self.assertEqual(len({z.id for z in self.baza}), len(self.baza))
        for z in self.baza:
            with self.subTest(id=z.id):
                self.assertTrue(z.pytanie.strip())
                self.assertTrue(z.odpowiedzi)
                self.assertTrue(z.podpowiedz.strip())
                self.assertTrue(z.wyjasnienie.strip())
                self.assertIn(z.trudnosc, (1, 2, 3))

    def test_kazda_odpowiedz_z_bazy_jest_przyjmowana(self):
        for z in self.baza:
            for o in z.odpowiedzi:
                with self.subTest(id=z.id, odpowiedz=o):
                    self.assertTrue(z.sprawdz(o))
                    self.assertTrue(z.sprawdz(o.upper() + "!"))

    def test_kazdy_poziom_trudnosci_ma_zagadki(self):
        for poziom in (1, 2, 3):
            self.assertGreaterEqual(sum(z.trudnosc == poziom for z in self.baza), 10)


class TestOdpowiedzi(unittest.TestCase):
    def setUp(self):
        self.baza = {z.id: z for z in wczytaj_baze()}

    def test_normalizacja(self):
        self.assertEqual(normalizuj("  Środa! "), "sroda")
        self.assertEqual(normalizuj("Trzy"), "3")
        self.assertEqual(normalizuj("dwanaście"), "12")
        self.assertEqual(normalizuj("7,5°"), "7.5")
        self.assertEqual(normalizuj("12:15."), "12:15")
        self.assertEqual(normalizuj("2zł i 1zł"), "2 zl i 1 zl")

    def test_przyklady_poprawne(self):
        dobre = {
            2: ["dwanaście", "Wszystkie!"],
            10: ["Tyle samo", "ważą tyle samo"],
            20: ["Czwartek", "w czwartek"],
            21: ["środa", "Sroda"],
            27: ["Kasia"],
            40: ["7,5", "7.5 stopnia"],
            48: ["12:15", "12.15"],
            54: ["2 zł i 1 zł", "1 i 2"],
            55: ["źle", "ZLE"],
            19: ["siedem", "7 dzieci"],
        }
        for idz, odpowiedzi in dobre.items():
            for o in odpowiedzi:
                with self.subTest(id=idz, odpowiedz=o):
                    self.assertTrue(self.baza[idz].sprawdz(o))

    def test_przyklady_bledne(self):
        zle = {
            6: ["10", "0.10", "1"],
            7: ["24", "48"],
            19: ["6", "5 6 7 8", "6 7"],
            20: ["środa", "piątek"],
            24: ["10", "7"],
            28: ["12", "10"],
            29: ["18"],
            27: ["Zima"],
            12: [""],
        }
        for idz, odpowiedzi in zle.items():
            for o in odpowiedzi:
                with self.subTest(id=idz, odpowiedz=o):
                    self.assertFalse(self.baza[idz].sprawdz(o))


class TestSesji(ZHistoriaWTemp):
    def setUp(self):
        super().setUp()
        self.baza = wczytaj_baze()

    def _sesja(self, ile=2, trudnosc=None):
        return SesjaAlarmu(Losowanie(self.baza, trudnosc, random.Random(1)), ile)

    def test_trzeba_rozwiazac_wszystkie(self):
        s = self._sesja(ile=3)
        widziane = set()
        for i in range(3):
            self.assertFalse(s.koniec)
            widziane.add(s.aktualna.id)
            self.assertFalse(s.odpowiedz("zdecydowanie zła odpowiedź xyz"))
            self.assertTrue(s.odpowiedz(s.aktualna.odpowiedzi[0]))
            if not s.koniec:
                s.nastepna()
        self.assertTrue(s.koniec)
        self.assertEqual(len(widziane), 3, "zagadki w jednej sesji nie powinny się powtarzać")

    def test_podpowiedz_i_zmiana_odblokowuja_sie_po_bledach(self):
        s = self._sesja()
        self.assertFalse(s.moze_podpowiedz)
        self.assertFalse(s.moze_zmienic)
        pierwsza = s.aktualna
        self.assertIs(s.zmien(), pierwsza, "bez błędów nie wolno zmienić zagadki")
        s.odpowiedz("qqq")
        self.assertTrue(s.moze_podpowiedz)
        s.odpowiedz("qqq")
        s.odpowiedz("qqq")
        self.assertTrue(s.moze_zmienic)
        druga = s.zmien()
        self.assertNotEqual(druga.id, pierwsza.id)
        self.assertEqual(s.rozwiazane, 0, "zmiana zagadki nie zalicza jej")
        self.assertFalse(s.moze_zmienic, "licznik błędów zeruje się przy nowej zagadce")

    def test_pusta_odpowiedz_nie_jest_bledem(self):
        s = self._sesja()
        s.odpowiedz("   ")
        self.assertEqual(s.bledy, 0)

    def test_filtr_trudnosci(self):
        s = self._sesja(ile=1, trudnosc=3)
        self.assertEqual(s.aktualna.trudnosc, 3)

    def test_historia_unika_powtorek_miedzy_sesjami(self):
        pierwsze = {self._sesja(ile=1).aktualna.id for _ in range(1)}
        for _ in range(10):
            idz = SesjaAlarmu(Losowanie(self.baza), 1).aktualna.id
            self.assertNotIn(idz, pierwsze)
            pierwsze.add(idz)


class TestGodziny(unittest.TestCase):
    def test_parsowanie(self):
        self.assertEqual(parsuj_godzine("6:45"), (6, 45))
        self.assertEqual(parsuj_godzine("06.05"), (6, 5))
        self.assertEqual(parsuj_godzine("715"), (7, 15))
        self.assertEqual(parsuj_godzine("7"), (7, 0))
        with self.assertRaises(ValueError):
            parsuj_godzine("25:00")

    def test_dzis_albo_jutro(self):
        teraz = dt.datetime(2026, 11, 5, 22, 30)
        self.assertEqual(nastepne_wystapienie(23, 0, teraz), dt.datetime(2026, 11, 5, 23, 0))
        self.assertEqual(nastepne_wystapienie(7, 0, teraz), dt.datetime(2026, 11, 6, 7, 0))
        self.assertEqual(nastepne_wystapienie(22, 30, teraz), dt.datetime(2026, 11, 6, 22, 30))


class TestDzwieku(unittest.TestCase):
    def test_generuje_wav(self):
        import wave
        from dzwiek import wygeneruj_wav
        with tempfile.TemporaryDirectory() as d:
            p = wygeneruj_wav(Path(d) / "t.wav")
            with wave.open(str(p)) as w:
                self.assertGreater(w.getnframes() / w.getframerate(), 1.0)


if __name__ == "__main__":
    unittest.main()
