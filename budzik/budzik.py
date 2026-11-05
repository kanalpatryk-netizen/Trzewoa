#!/usr/bin/env python3
"""Budzik z zagadką — dzwoni, dopóki nie rozwiążesz zagadki logicznej.

Uruchomienie:
    python budzik.py                 okno budzika (tkinter)
    python budzik.py --konsola 6:45  wersja w terminalu, budzik na 6:45
    python budzik.py --teraz         od razu dzwoni (do wypróbowania)

Opcje dla obu trybów: --ile N (ile zagadek trzeba rozwiązać),
--trudnosc 1|2|3|0 (0 = mieszane).
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import signal
import sys
import time
from pathlib import Path

from dzwiek import Dzwonek
from zagadki import (BLEDY_DO_ZMIANY, KATALOG, Losowanie, SesjaAlarmu,
                     wczytaj_baze)

PLIK_USTAWIEN = KATALOG / ".ustawienia_budzika.json"

TRUDNOSCI = {0: "mieszane", 1: "łatwe", 2: "średnie", 3: "trudniejsze"}


# ---------------------------------------------------------------- wspólne

def nastepne_wystapienie(godzina: int, minuta: int, teraz: dt.datetime | None = None) -> dt.datetime:
    """Najbliższa chwila HH:MM — dziś, a jeśli już minęła, jutro."""
    teraz = teraz or dt.datetime.now()
    cel = teraz.replace(hour=godzina, minute=minuta, second=0, microsecond=0)
    if cel <= teraz:
        cel += dt.timedelta(days=1)
    return cel


def parsuj_godzine(tekst: str) -> tuple[int, int]:
    tekst = tekst.strip().replace(".", ":").replace("-", ":")
    if ":" not in tekst and tekst.isdigit() and len(tekst) in (3, 4):
        tekst = tekst[:-2] + ":" + tekst[-2:]
    if ":" not in tekst:
        tekst += ":00"
    g, m = tekst.split(":", 1)
    g, m = int(g), int(m)
    if not (0 <= g <= 23 and 0 <= m <= 59):
        raise ValueError(f"Nie ma takiej godziny: {tekst}")
    return g, m


def opisz_czas(sekundy: float) -> str:
    sekundy = max(0, int(sekundy))
    g, reszta = divmod(sekundy, 3600)
    m, s = divmod(reszta, 60)
    if g:
        return f"{g} h {m:02d} min"
    if m:
        return f"{m} min {s:02d} s"
    return f"{s} s"


def nie_usypiaj(wlacz: bool) -> None:
    """Windows: nie pozwala komputerowi zasnąć, póki budzik jest nastawiony."""
    if sys.platform != "win32":
        return
    try:
        import ctypes
        ES_CONTINUOUS, ES_SYSTEM_REQUIRED, ES_DISPLAY_REQUIRED = 0x80000000, 0x00000001, 0x00000002
        flagi = ES_CONTINUOUS | (ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED if wlacz else 0)
        ctypes.windll.kernel32.SetThreadExecutionState(flagi)
    except Exception:
        pass


def czytaj_ustawienia() -> dict:
    domyslne = {"godzina": 7, "minuta": 0, "ile": 1, "trudnosc": 0}
    try:
        with open(PLIK_USTAWIEN, encoding="utf-8") as f:
            domyslne.update(json.load(f))
    except (OSError, ValueError):
        pass
    return domyslne


def zapisz_ustawienia(ustawienia: dict) -> None:
    try:
        with open(PLIK_USTAWIEN, "w", encoding="utf-8") as f:
            json.dump(ustawienia, f, ensure_ascii=False)
    except OSError:
        pass


# ---------------------------------------------------------------- konsola

def tryb_konsolowy(godzina: tuple[int, int] | None, ile: int, trudnosc: int) -> None:
    zagadki = wczytaj_baze()
    if godzina is not None:
        cel = nastepne_wystapienie(*godzina)
        print(f"⏰ Budzik nastawiony na {cel:%H:%M} ({cel:%d.%m}). Ctrl+C — anuluj (tylko przed dzwonieniem).")
        nie_usypiaj(True)
        try:
            while True:
                zostalo = (cel - dt.datetime.now()).total_seconds()
                if zostalo <= 0:
                    break
                print(f"\r   Zadzwoni za {opisz_czas(zostalo):<16}", end="", flush=True)
                time.sleep(min(1.0, zostalo))
        except KeyboardInterrupt:
            print("\nBudzik anulowany.")
            nie_usypiaj(False)
            return
        print()

    # Od tej chwili Ctrl+C nie wyłączy budzika.
    def odmowa(*_):
        print("\n🔒 Nie tak łatwo! Rozwiąż zagadkę.")
    signal.signal(signal.SIGINT, odmowa)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, odmowa)

    sesja = SesjaAlarmu(Losowanie(zagadki, trudnosc or None), ile)
    dzwonek = Dzwonek()
    dzwonek.start()
    print("\n" + "=" * 60)
    print(f"  ⏰  POBUDKA! {dt.datetime.now():%H:%M}  —  rozwiąż {sesja.ile} "
          f"{'zagadkę' if sesja.ile == 1 else 'zagadki'}, żeby wyłączyć budzik")
    print("=" * 60)
    print("  ? — podpowiedź (po pierwszym błędzie),  inna — zmiana zagadki "
          f"(po {BLEDY_DO_ZMIANY} błędach)")
    try:
        while not sesja.koniec:
            z = sesja.aktualna
            print(f"\n[{sesja.rozwiazane + 1}/{sesja.ile}]  {z.pytanie}")
            while True:
                try:
                    tekst = input("  > ")
                except EOFError:
                    time.sleep(1)
                    continue
                komenda = tekst.strip().lower()
                if komenda in ("?", "podpowiedz", "podpowiedź"):
                    print("  💡 " + (z.podpowiedz if sesja.moze_podpowiedz
                                     else "Podpowiedź będzie po pierwszej próbie."))
                    continue
                if komenda == "inna":
                    if sesja.moze_zmienic:
                        sesja.zmien()
                        break
                    print(f"  Zmiana zagadki po {BLEDY_DO_ZMIANY} błędach "
                          f"(masz {sesja.bledy}).")
                    continue
                if sesja.odpowiedz(tekst):
                    print(f"  ✅ Dobrze! {z.wyjasnienie}")
                    if not sesja.koniec:
                        sesja.nastepna()
                    break
                if tekst.strip():
                    print("  ❌ Źle. Budzik dzwoni dalej.")
    finally:
        dzwonek.stop()
        nie_usypiaj(False)
    print("\n☀️  Dzień dobry! Budzik wyłączony.")


# ---------------------------------------------------------------- okno

def tryb_okienkowy(od_razu: bool, ile: int | None, trudnosc: int | None) -> None:
    try:
        import tkinter as tk
        from tkinter import messagebox
    except ImportError:
        print("Brak modułu tkinter — uruchamiam wersję w terminalu.\n"
              "(Na Linuksie doinstaluj go np. poleceniem: sudo apt install python3-tk)\n")
        godz = None if od_razu else parsuj_godzine(input("Na którą godzinę nastawić budzik (GG:MM)? "))
        tryb_konsolowy(godz, ile or 1, trudnosc or 0)
        return

    zagadki = wczytaj_baze()

    TLO = "#1b1d2b"
    TLO2 = "#262a3d"
    TEKST = "#f2f2f7"
    SZARY = "#9aa0b8"
    AKCENT = "#ffb347"
    ZIELONY = "#5cd68c"
    CZERWONY = "#ff6b6b"
    MIG = ("#5a1a24", "#1b1d2b")

    def _wybierz_czcionke(root) -> None:
        """Pierwsza dostępna czcionka z polskimi znakami zamiast domyślnej."""
        from tkinter import font
        dostepne = set(font.families(root))
        for nazwa in ("Segoe UI", "Helvetica Neue", "Helvetica", "DejaVu Sans",
                      "Liberation Sans", "Noto Sans", "Arial"):
            if nazwa in dostepne:
                CZCIONKA[0] = nazwa
                return

    CZCIONKA = ["TkDefaultFont"]

    def F(rozmiar: int, *styl: str) -> tuple:
        return (CZCIONKA[0], rozmiar, *styl)

    class Aplikacja:
        def __init__(self) -> None:
            self.root = tk.Tk()
            _wybierz_czcionke(self.root)
            self.root.title("Budzik z zagadką")
            self.root.configure(bg=TLO)
            self.root.minsize(420, 520)
            self.ust = czytaj_ustawienia()
            if ile:
                self.ust["ile"] = ile
            if trudnosc is not None:
                self.ust["trudnosc"] = trudnosc
            self.cel: dt.datetime | None = None
            self.alarm: OknoAlarmu | None = None
            self._buduj()
            self.root.protocol("WM_DELETE_WINDOW", self._zamknij)
            self._tik()
            if od_razu:
                self.root.after(300, self.dzwon)

        def _buduj(self) -> None:
            r = self.root
            ram = tk.Frame(r, bg=TLO, padx=28, pady=22)
            ram.pack(fill="both", expand=True)

            self.zegar = tk.Label(ram, text="--:--:--", font=F(46, "bold"),
                                  fg=TEKST, bg=TLO)
            self.zegar.pack()
            self.data = tk.Label(ram, text="", font=F(12), fg=SZARY, bg=TLO)
            self.data.pack(pady=(0, 18))

            karta = tk.Frame(ram, bg=TLO2, padx=20, pady=16)
            karta.pack(fill="x")

            tk.Label(karta, text="Obudź mnie o", font=F(12), fg=SZARY,
                     bg=TLO2).grid(row=0, column=0, columnspan=3, sticky="w")
            spin = dict(font=F(30, "bold"), width=3, justify="center",
                        wrap=True, bg=TLO, fg=AKCENT, buttonbackground=TLO2,
                        insertbackground=AKCENT, relief="flat", format="%02.0f",
                        disabledbackground=TLO2, disabledforeground=AKCENT)
            self.v_godz = tk.StringVar(value=f"{self.ust['godzina']:02d}")
            self.v_min = tk.StringVar(value=f"{self.ust['minuta']:02d}")
            self.s_godz = tk.Spinbox(karta, from_=0, to=23, textvariable=self.v_godz, **spin)
            self.s_min = tk.Spinbox(karta, from_=0, to=59, textvariable=self.v_min, **spin)
            self.s_godz.grid(row=1, column=0, pady=6)
            tk.Label(karta, text=":", font=F(30, "bold"), fg=AKCENT,
                     bg=TLO2).grid(row=1, column=1)
            self.s_min.grid(row=1, column=2, pady=6)

            tk.Label(karta, text="Zagadek do rozwiązania", font=F(11), fg=SZARY,
                     bg=TLO2).grid(row=2, column=0, columnspan=2, sticky="w", pady=(10, 0))
            self.v_ile = tk.StringVar(value=str(self.ust["ile"]))
            self.s_ile = tk.Spinbox(karta, from_=1, to=5, width=3, textvariable=self.v_ile,
                                    font=F(13), justify="center", bg=TLO, fg=TEKST,
                                    buttonbackground=TLO2, relief="flat", state="readonly",
                                    readonlybackground=TLO, disabledbackground=TLO2)
            self.s_ile.grid(row=2, column=2, sticky="e", pady=(10, 0))

            tk.Label(karta, text="Trudność", font=F(11), fg=SZARY,
                     bg=TLO2).grid(row=3, column=0, columnspan=3, sticky="w", pady=(10, 2))
            self.v_trud = tk.IntVar(value=int(self.ust["trudnosc"]))
            rb_ram = tk.Frame(karta, bg=TLO2)
            rb_ram.grid(row=4, column=0, columnspan=3, sticky="w")
            for wartosc in (1, 2, 3, 0):
                tk.Radiobutton(rb_ram, text=TRUDNOSCI[wartosc], value=wartosc,
                               variable=self.v_trud, indicatoron=False, padx=8, pady=4,
                               font=F(10), bg=TLO, fg=TEKST, selectcolor="#3d4466",
                               activebackground=TLO2, activeforeground=TEKST, relief="flat",
                               bd=0).pack(side="left", padx=(0, 4))
            karta.columnconfigure(0, weight=1)
            karta.columnconfigure(2, weight=1)

            przyciski = dict(font=F(13, "bold"), relief="flat", bd=0,
                             padx=12, pady=10, cursor="hand2")
            self.b_ustaw = tk.Button(ram, text="Nastaw budzik", bg=AKCENT, fg="#1b1d2b",
                                     activebackground="#ffc56e", command=self.przelacz,
                                     **przyciski)
            self.b_ustaw.pack(fill="x", pady=(18, 6))
            tk.Button(ram, text="Wypróbuj teraz", bg=TLO2, fg=TEKST, activebackground="#333852",
                      activeforeground=TEKST, command=self.dzwon,
                      **{**przyciski, "font": F(11)}).pack(fill="x")

            self.status = tk.Label(ram, text="Budzik wyłączony.", font=F(12),
                                   fg=SZARY, bg=TLO, wraplength=360, justify="center")
            self.status.pack(pady=(16, 0))
            tk.Label(ram, text=f"{len(zagadki)} zagadek w bazie · komputer nie może spać",
                     font=F(9), fg="#5d6380", bg=TLO).pack(side="bottom")

        def _odczytaj(self) -> dict | None:
            try:
                g, m = int(self.v_godz.get()), int(self.v_min.get())
                if not (0 <= g <= 23 and 0 <= m <= 59):
                    raise ValueError
            except ValueError:
                messagebox.showerror("Budzik", "Podaj poprawną godzinę (00–23) i minutę (00–59).")
                return None
            self.ust.update(godzina=g, minuta=m, ile=int(self.v_ile.get()),
                            trudnosc=int(self.v_trud.get()))
            zapisz_ustawienia(self.ust)
            return self.ust

        def przelacz(self) -> None:
            if self.cel:
                self.cel = None
                nie_usypiaj(False)
                self.b_ustaw.config(text="Nastaw budzik", bg=AKCENT)
                self._blokuj(False)
                self.status.config(text="Budzik wyłączony.", fg=SZARY)
                return
            if not self._odczytaj():
                return
            self.cel = nastepne_wystapienie(self.ust["godzina"], self.ust["minuta"])
            nie_usypiaj(True)
            self.b_ustaw.config(text="Wyłącz budzik (przed dzwonieniem)", bg="#c9c9d6")
            self._blokuj(True)
            self._tik()

        def _blokuj(self, tak: bool) -> None:
            stan = "disabled" if tak else "normal"
            self.s_godz.config(state=stan)
            self.s_min.config(state=stan)
            self.s_ile.config(state="disabled" if tak else "readonly")

        def _tik(self) -> None:
            if hasattr(self, "_po_tiku"):
                self.root.after_cancel(self._po_tiku)
            teraz = dt.datetime.now()
            self.zegar.config(text=f"{teraz:%H:%M:%S}")
            dni = ["poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota", "niedziela"]
            self.data.config(text=f"{dni[teraz.weekday()]}, {teraz:%d.%m.%Y}")
            if self.cel and not self.alarm:
                zostalo = (self.cel - teraz).total_seconds()
                if zostalo <= 0:
                    self.dzwon()
                else:
                    dzien = "dziś" if self.cel.date() == teraz.date() else "jutro"
                    self.status.config(
                        text=f"⏰ Nastawiony na {dzien} {self.cel:%H:%M}\nzadzwoni za {opisz_czas(zostalo)}",
                        fg=AKCENT)
            self._po_tiku = self.root.after(500, self._tik)

        def dzwon(self) -> None:
            if self.alarm:
                return
            if not self.cel:
                if not self._odczytaj():
                    return
            self.alarm = OknoAlarmu(self, self.ust["ile"], self.ust["trudnosc"])

        def po_alarmie(self) -> None:
            self.alarm = None
            self.cel = None
            nie_usypiaj(False)
            self.b_ustaw.config(text="Nastaw budzik", bg=AKCENT)
            self._blokuj(False)
            self.status.config(text="☀️ Dzień dobry! Budzik wyłączony.\nNastawić na jutro?",
                               fg=ZIELONY)

        def _zamknij(self) -> None:
            if self.alarm:
                self.alarm.odmowa()
                return
            if self.cel and not messagebox.askyesno(
                    "Budzik", "Budzik jest nastawiony. Po zamknięciu okna nie zadzwoni.\n\nZamknąć?"):
                return
            nie_usypiaj(False)
            self.root.destroy()

    class OknoAlarmu:
        def __init__(self, app: Aplikacja, ile_zagadek: int, poziom: int) -> None:
            self.app = app
            self.sesja = SesjaAlarmu(Losowanie(zagadki, poziom or None), ile_zagadek)
            self.dzwonek = Dzwonek(zapasowy_bip=lambda: None)
            self.mig = 0
            self.koniec = False

            w = self.w = tk.Toplevel(app.root)
            w.title("POBUDKA!")
            w.configure(bg=TLO)
            w.protocol("WM_DELETE_WINDOW", self.odmowa)
            for klawisz in ("<Escape>", "<Alt-F4>", "<Control-w>", "<Control-q>"):
                w.bind(klawisz, lambda e: (self.odmowa(), "break")[1])
            w.geometry(f"{w.winfo_screenwidth()}x{w.winfo_screenheight()}+0+0")
            try:
                w.attributes("-fullscreen", True)
            except tk.TclError:
                w.overrideredirect(True)
            w.attributes("-topmost", True)

            self.ram = tk.Frame(w, bg=TLO)
            self.ram.place(relx=0.5, rely=0.5, anchor="center")
            self.tytul = tk.Label(self.ram, text=f"⏰ {dt.datetime.now():%H:%M}  POBUDKA!",
                                  font=F(44, "bold"), fg=AKCENT, bg=TLO)
            self.tytul.pack(pady=(0, 6))
            self.postep = tk.Label(self.ram, font=F(14), fg=SZARY, bg=TLO)
            self.postep.pack(pady=(0, 24))
            self.pytanie = tk.Label(self.ram, font=F(26), fg=TEKST, bg=TLO,
                                    wraplength=min(1000, w.winfo_screenwidth() - 120),
                                    justify="center")
            self.pytanie.pack(pady=(0, 24))

            wiersz = tk.Frame(self.ram, bg=TLO)
            wiersz.pack()
            self.v_odp = tk.StringVar()
            self.pole = tk.Entry(wiersz, textvariable=self.v_odp, font=F(24),
                                 width=18, justify="center", bg=TLO2, fg=TEKST,
                                 insertbackground=TEKST, relief="flat")
            self.pole.pack(side="left", ipady=8, padx=(0, 10))
            self.pole.bind("<Return>", lambda e: self.sprawdz())
            przycisk = dict(relief="flat", bd=0, cursor="hand2")
            self.b_sprawdz = tk.Button(wiersz, text="Sprawdź", font=F(18, "bold"),
                                       bg=AKCENT, fg="#1b1d2b", activebackground="#ffc56e",
                                       padx=18, pady=8, command=self.sprawdz, **przycisk)
            self.b_sprawdz.pack(side="left")

            self.komunikat = tk.Label(self.ram, text="", font=F(16), fg=SZARY,
                                      bg=TLO, wraplength=900, justify="center")
            self.komunikat.pack(pady=(18, 10))

            dol = tk.Frame(self.ram, bg=TLO)
            dol.pack()
            maly = dict(font=F(12), bg=TLO2, fg=TEKST, activebackground="#333852",
                        activeforeground=TEKST, disabledforeground="#5d6380", padx=12, pady=6,
                        **przycisk)
            self.b_podp = tk.Button(dol, text="💡 Podpowiedź", command=self.podpowiedz, **maly)
            self.b_podp.pack(side="left", padx=6)
            self.b_inna = tk.Button(dol, text="🔄 Inna zagadka", command=self.zmien, **maly)
            self.b_inna.pack(side="left", padx=6)

            self.pokaz()
            self.dzwonek.start()
            w.grab_set()
            self._pilnuj()
            self._migaj()

        # -- zachowanie okna
        def _pilnuj(self) -> None:
            """Co sekundę wyciąga okno na wierzch i oddaje mu klawiaturę."""
            if self.koniec:
                return
            try:
                self.w.deiconify()
                self.w.lift()
                self.w.attributes("-topmost", True)
                if self.w.focus_get() is None:
                    self.w.focus_force()
                    self.pole.focus_set()
            except tk.TclError:
                pass
            self.w.after(1000, self._pilnuj)

        def _migaj(self) -> None:
            if self.koniec:
                return
            self.mig ^= 1
            kolor = MIG[self.mig]
            for el in (self.w, self.ram, self.tytul, self.postep, self.pytanie,
                       self.komunikat, self.pole.master, self.b_podp.master):
                el.configure(bg=kolor)
            if self.dzwonek.uzywa_bipa and self.mig:
                self.w.bell()
            self.w.after(500, self._migaj)

        def odmowa(self) -> None:
            if self.koniec:
                self.zamknij()
                return
            self.komunikat.config(text="🔒 Nie da się wyłączyć budzika bez rozwiązania zagadki!",
                                  fg=CZERWONY)
            self.pole.focus_set()

        # -- zagadki
        def pokaz(self) -> None:
            s = self.sesja
            z = s.aktualna
            gwiazdki = "★" * z.trudnosc + "☆" * (3 - z.trudnosc)
            self.postep.config(text=f"Zagadka {s.rozwiazane + 1} z {s.ile}   ·   {z.kategoria}   ·   {gwiazdki}")
            self.pytanie.config(text=z.pytanie)
            self.v_odp.set("")
            self._przyciski()
            self.pole.focus_set()

        def _przyciski(self) -> None:
            s = self.sesja
            self.b_podp.config(state="normal" if s.moze_podpowiedz else "disabled")
            if s.moze_zmienic:
                self.b_inna.config(state="normal", text="🔄 Inna zagadka")
            else:
                self.b_inna.config(state="disabled",
                                   text=f"🔄 Inna zagadka (po {BLEDY_DO_ZMIANY} błędach)")

        def sprawdz(self) -> None:
            if self.koniec:
                self.zamknij()
                return
            tekst = self.v_odp.get()
            if not tekst.strip():
                return
            z = self.sesja.aktualna
            if self.sesja.odpowiedz(tekst):
                if self.sesja.koniec:
                    self.wygrana(z)
                else:
                    self.komunikat.config(text=f"✅ Dobrze! {z.wyjasnienie}\nJeszcze "
                                               f"{self.sesja.ile - self.sesja.rozwiazane}…",
                                          fg=ZIELONY)
                    self.sesja.nastepna()
                    self.pokaz()
            else:
                self.komunikat.config(text=f"❌ „{tekst.strip()}” — to nie to. Budzik dzwoni dalej.",
                                      fg=CZERWONY)
                self.v_odp.set("")
                self._przyciski()

        def podpowiedz(self) -> None:
            if self.sesja.moze_podpowiedz:
                self.komunikat.config(text="💡 " + self.sesja.aktualna.podpowiedz, fg=AKCENT)
            self.pole.focus_set()

        def zmien(self) -> None:
            if self.sesja.moze_zmienic:
                self.sesja.zmien()
                self.komunikat.config(text="Nowa zagadka. Powodzenia!", fg=SZARY)
                self.pokaz()

        def wygrana(self, z) -> None:
            self.koniec = True
            self.dzwonek.stop()
            for el in (self.w, self.ram, self.tytul, self.postep, self.pytanie,
                       self.komunikat, self.pole.master, self.b_podp.master):
                el.configure(bg=TLO)
            self.tytul.config(text="☀️ Dzień dobry!", fg=ZIELONY)
            self.postep.config(text="Budzik wyłączony.")
            self.pytanie.config(text=z.wyjasnienie)
            bledy = self.sesja.wszystkie_bledy
            self.komunikat.config(
                text="Bezbłędnie! Mózg już działa." if bledy == 0 else
                f"Pomyłek po drodze: {bledy}. Ale się udało!", fg=SZARY)
            self.pole.pack_forget()
            self.b_podp.master.pack_forget()
            self.b_sprawdz.config(text="Zamknij", command=self.zamknij)
            self.b_sprawdz.focus_set()
            self.w.bind("<Return>", lambda e: self.zamknij())

        def zamknij(self) -> None:
            self.koniec = True
            self.dzwonek.stop()
            try:
                self.w.grab_release()
                self.w.destroy()
            except tk.TclError:
                pass
            self.app.po_alarmie()

    app = Aplikacja()
    app.root.mainloop()


# ---------------------------------------------------------------- start

def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(description="Budzik, który dzwoni, dopóki nie rozwiążesz zagadki.")
    p.add_argument("godzina", nargs="?", help="godzina budzika, np. 6:45 (tryb konsolowy)")
    p.add_argument("--konsola", action="store_true", help="wersja w terminalu, bez okna")
    p.add_argument("--teraz", action="store_true", help="zadzwoń od razu (do wypróbowania)")
    p.add_argument("--ile", type=int, choices=range(1, 6), metavar="1-5",
                   help="ile zagadek trzeba rozwiązać")
    p.add_argument("--trudnosc", type=int, choices=(0, 1, 2, 3),
                   help="1 łatwe, 2 średnie, 3 trudniejsze, 0 mieszane")
    a = p.parse_args(argv)

    if a.konsola or a.godzina:
        if a.teraz:
            godz = None
        elif a.godzina:
            godz = parsuj_godzine(a.godzina)
        else:
            godz = parsuj_godzine(input("Na którą godzinę nastawić budzik (GG:MM)? "))
        tryb_konsolowy(godz, a.ile or 1, a.trudnosc or 0)
    else:
        tryb_okienkowy(a.teraz, a.ile, a.trudnosc)


if __name__ == "__main__":
    main()
