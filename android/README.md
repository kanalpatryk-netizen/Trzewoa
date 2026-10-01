# Trzewia na Androida

Wersja na telefon: dotyk, zawsze poziomo, trzy ryty (Nakarm, Szepnij, Cud) i karty wydarzeń.
Pobieranie i zasady gry — w [głównym README](../README.md).

## Uruchomienie

```bash
npm install
npm run dev     # gra w przeglądarce (włącz widok telefonu)
npm run pack    # trzewia.html — cała gra w jednym pliku
npm test        # testy symulacji
```

## Gdzie co jest

| Chcę zmienić… | Plik |
|---|---|
| liczby gry (ceny, tempo, balans) | [`src/nastawy/`](src/nastawy) — opis w [README](src/nastawy/README.md) |
| karty wydarzeń | [`src/sim/wydarzenia.ts`](src/sim/wydarzenia.ts) |
| ekran gry | [`src/app/screens/game.ts`](src/app/screens/game.ts) |
| samouczek | [`src/app/screens/samouczek/`](src/app/screens/samouczek) |

APK budują automaty z [`.github/workflows/`](../.github/workflows): `android-apk.yml` (najnowsza)
i `android-wersje.yml` (zapisane wersje v1, v2, v3…).
