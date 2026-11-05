"""Dzwonek budzika: generuje plik WAV i odtwarza go w pętli, aż ktoś go zatrzyma.

Działa bez dodatkowych bibliotek:
  * Windows — winsound (wbudowany w Pythona),
  * macOS   — afplay,
  * Linux   — paplay / aplay / pw-play / ffplay (pierwszy znaleziony).
Gdy żaden odtwarzacz nie jest dostępny, wywoływana jest funkcja zapasowa
(np. systemowy „bip”).

Własny dźwięk: połóż plik `dzwonek.wav` obok budzika — zostanie użyty zamiast
wygenerowanego.
"""

from __future__ import annotations

import math
import shutil
import struct
import subprocess
import sys
import tempfile
import threading
import wave
from pathlib import Path
from typing import Callable

KATALOG = Path(__file__).resolve().parent
WLASNY_DZWONEK = KATALOG / "dzwonek.wav"


def wygeneruj_wav(sciezka: Path, czestotliwosc: int = 44100) -> Path:
    """Klasyczne „bip-bip-bip-bip … cisza” — ok. 1,6 s, potem pętla."""
    probki = []
    glosnosc = 0.6

    def ton(hz: float, sekundy: float) -> None:
        n = int(czestotliwosc * sekundy)
        narastanie = int(czestotliwosc * 0.005)
        for i in range(n):
            obwiednia = min(1.0, i / narastanie, (n - i) / narastanie)
            # dwa tony naraz brzmią ostrzej, jak prawdziwy budzik
            v = math.sin(2 * math.pi * hz * i / czestotliwosc)
            v += 0.5 * math.sin(2 * math.pi * hz * 1.5 * i / czestotliwosc)
            probki.append(int(32767 * glosnosc * obwiednia * v / 1.5))

    def cisza(sekundy: float) -> None:
        probki.extend([0] * int(czestotliwosc * sekundy))

    for _ in range(4):
        ton(1760, 0.09)
        cisza(0.06)
    cisza(1.0)

    with wave.open(str(sciezka), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(czestotliwosc)
        w.writeframes(struct.pack(f"<{len(probki)}h", *probki))
    return sciezka


def _odtwarzacz_linux() -> list[str] | None:
    for prog, argumenty in (
        ("paplay", []),
        ("pw-play", []),
        ("aplay", ["-q"]),
        ("ffplay", ["-nodisp", "-autoexit", "-loglevel", "quiet"]),
    ):
        if shutil.which(prog):
            return [prog, *argumenty]
    return None


class Dzwonek:
    def __init__(self, zapasowy_bip: Callable[[], None] | None = None) -> None:
        self._stop = threading.Event()
        self._watek: threading.Thread | None = None
        self._proces: subprocess.Popen | None = None
        self._zapasowy_bip = zapasowy_bip or (lambda: print("\a", end="", flush=True))
        # True, gdy nie znaleziono odtwarzacza i zostaje tylko systemowy „bip”
        self.uzywa_bipa = False
        if WLASNY_DZWONEK.exists():
            self.plik = WLASNY_DZWONEK
        else:
            self.plik = wygeneruj_wav(Path(tempfile.gettempdir()) / "budzik_zagadka_dzwonek.wav")

    @property
    def dzwoni(self) -> bool:
        return self._watek is not None and self._watek.is_alive()

    def start(self) -> None:
        if self.dzwoni:
            return
        self._stop.clear()
        self._watek = threading.Thread(target=self._petla, daemon=True)
        self._watek.start()

    def stop(self) -> None:
        self._stop.set()
        if sys.platform == "win32":
            try:
                import winsound
                winsound.PlaySound(None, 0)
            except Exception:
                pass
        proces = self._proces
        if proces and proces.poll() is None:
            proces.terminate()
        if self._watek:
            self._watek.join(timeout=2)
        self._watek = None

    def _petla(self) -> None:
        if sys.platform == "win32":
            try:
                import winsound
                winsound.PlaySound(str(self.plik),
                                   winsound.SND_FILENAME | winsound.SND_ASYNC | winsound.SND_LOOP)
                self._stop.wait()
                return
            except Exception:
                pass
        komenda = ["afplay"] if sys.platform == "darwin" and shutil.which("afplay") else _odtwarzacz_linux()
        while not self._stop.is_set():
            if komenda:
                try:
                    self._proces = subprocess.Popen([*komenda, str(self.plik)],
                                                    stdout=subprocess.DEVNULL,
                                                    stderr=subprocess.DEVNULL)
                    while self._proces.poll() is None and not self._stop.is_set():
                        self._stop.wait(0.1)
                    if self._proces.returncode not in (0, None):
                        komenda = None  # odtwarzacz nie działa — przejdź na bip
                    continue
                except OSError:
                    komenda = None
            self.uzywa_bipa = True
            try:
                self._zapasowy_bip()
            except Exception:
                pass
            self._stop.wait(0.5)
