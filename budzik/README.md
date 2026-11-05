# ⏰ Budzik z zagadką

Budzik w Pythonie, który **nie przestanie dzwonić, dopóki nie rozwiążesz zagadki logicznej**.
Okno budzika zasłania cały ekran, trzyma się na wierzchu i nie da się go zamknąć
krzyżykiem, Esc ani Alt+F4 — jedyne wyjście to poprawna odpowiedź.

Nie wymaga instalowania żadnych bibliotek — wystarczy Python 3.9+ (z python.org ma już `tkinter`).

## Uruchomienie

**Najprościej:** Windows — dwuklik na `Budzik.pyw`; macOS — dwuklik na `Budzik.command`.

Albo z terminala:

```bash
cd budzik
python budzik.py
```

Ustawiasz godzinę, liczbę zagadek do rozwiązania (1–5) i trudność, klikasz **Nastaw budzik**.
**Wypróbuj teraz** od razu włącza alarm, żeby zobaczyć, jak działa.

Wersja w terminalu (np. na serwerze albo bez `tkinter`):

```bash
python budzik.py --konsola 6:45 --ile 2 --trudnosc 2
```

W trakcie dzwonienia Ctrl+C nie działa. W konsoli: `?` — podpowiedź, `inna` — zmiana zagadki.

## Zasady

- Po **pierwszej** złej odpowiedzi odblokowuje się podpowiedź.
- Po **trzech** złych odpowiedziach można wymienić zagadkę na inną (ale nie liczy się jako rozwiązana).
- Wielkość liter, polskie znaki i interpunkcja nie mają znaczenia; liczby można pisać cyframi
  albo słowami („dwanaście” = 12), ułamki z przecinkiem albo kropką.
- Wypisanie kilku liczb naraz („5 6 7 8”) na chybił-trafił nie przejdzie.
- Budzik pamięta 30 ostatnich zagadek i nie zadaje ich ponownie zbyt szybko.

## Baza zagadek — `zagadki.json`

79 zagadek w kategoriach: podchwytliwe, logika, ciągi, matematyka, kalendarz, słowne;
trzy poziomy trudności (32 łatwe, 34 średnie, 13 trudniejszych). Każda ma podpowiedź
i wyjaśnienie pokazywane po rozwiązaniu. Własne dopisujesz tak:

```json
{
  "id": 80,
  "kategoria": "logika",
  "trudnosc": 1,
  "pytanie": "Treść zagadki?",
  "odpowiedzi": ["odpowiedź", "inna dopuszczalna wersja"],
  "podpowiedz": "Wskazówka po pierwszym błędzie.",
  "wyjasnienie": "Pokazywane po rozwiązaniu."
}
```

## Dźwięk

Dzwonek jest generowany przez program. Chcesz własny — połóż plik `dzwonek.wav` obok `budzik.py`.
Windows gra przez wbudowany `winsound`, macOS przez `afplay`, Linux przez `paplay`/`aplay`/`pw-play`.

## Ważne

- **Komputer nie może być uśpiony** — na Windows budzik sam blokuje usypianie, dopóki jest
  nastawiony; na laptopie nie zamykaj klapy. Jeśli komputer obudzi się po czasie, budzik
  zadzwoni od razu.
- Okno główne musi zostać otwarte (można je zminimalizować).

## Testy

```bash
python -m unittest test_budzik
```

Sprawdzają m.in., że każda zagadka w bazie przyjmuje swoje odpowiedzi i odrzuca typowe błędne.
