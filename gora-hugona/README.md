# Góra Hugona — mapa z alarmem granicy

Mapa obszaru przy Górze Hugona (Świętochłowice-Zgoda) ze znacznikiem Twojej pozycji.
Gdy wyjdziesz poza granicę, telefon wyje syreną i wibruje, aż wrócisz albo wyciszysz alarm.

📱 **Android:** [**GoraHugona.apk**](https://github.com/kanalpatryk-netizen/Trzewoa/releases/download/gora-hugona-apk/GoraHugona.apk)
— pobierz na telefonie, otwórz i zainstaluj (Android zapyta o zgodę na instalację z tego źródła).

## Jak używać

1. Otwórz aplikację i naciśnij **START**.
2. Zezwól na **dokładną** lokalizację i na powiadomienia. Na pytanie o oszczędzanie baterii odpowiedz „Zezwól”,
   bo bez tego część telefonów usypia aplikację w tle.
3. Gotowe: pasek u góry pokazuje, czy jesteś w obszarze i ile masz do granicy. Możesz zgasić ekran i schować
   telefon do kieszeni, a pilnowanie trwa (widać to po powiadomieniu).

| Pasek | Co znaczy |
|---|---|
| 🟢 **W obszarze** | jesteś w środku; pokazuje odległość do granicy |
| 🟡 **Blisko granicy** | jesteś bliżej niż 15 m od granicy (od środka); krótki sygnał (odległość zmienisz w ustawieniach) |
| 🔴 **POZA GRANICĄ!** | syrena + wibracje; pokazuje, ile metrów za granicą jesteś i w którą stronę wracać |
| 🟣 **Brak sygnału GPS** | telefon nie wie, gdzie jesteś (np. w budynku) |

- **WYCISZ** ucisza alarm na 1 minutę. Jeśli po minucie dalej jesteś za granicą, alarm wraca.
- **STOP** kończy pilnowanie. Można też użyć przycisku „Zakończ pilnowanie” w powiadomieniu.
- Syrena gra jako **alarm**, więc słychać ją także w trybie cichym. Na czas alarmu głośność alarmu rośnie do co najmniej 80%.
- Pojedyncze skoki GPS są odsiewane: alarm rusza po 2 kolejnych pomiarach za granicą. Pomiar z dużym błędem
  (powyżej 35 m) uruchomi alarm tylko wtedy, gdy jesteś za granicą dalej, niż wynosi ten błąd.

## Granica

Granica (`www/granica.js`, 95 punktów, ok. 49 ha) jest przerysowana z wyciętego obrazka obszaru.
Obrazek dopasowano do pełnego zrzutu z Map Google, a zrzut do zdjęć satelitarnych Esri i ścieżek z OpenStreetMap.
Drogi z obu źródeł zgadzają się z dokładnością ok. 2–5 m.

Gdy granica gdzieś się rozjeżdża, popraw ją w **⚙ → Popraw granicę na mapie**:

- przeciągnij punkt, żeby go przesunąć;
- dotknij kółka w połowie boku, żeby dodać punkt;
- dotknij punktu, a potem **Usuń**, żeby go usunąć.

Poprawki zapisują się w telefonie. „Przywróć granicę z obrazka” je cofa.

## W przeglądarce

`www/index.html` działa też w przeglądarce, ale musi być otwarty przez **https** (bez tego przeglądarka nie poda
pozycji). W przeglądarce alarm działa tylko przy włączonym ekranie i otwartej stronie. Do pilnowania z telefonem
w kieszeni służy aplikacja na Androida.

## Pliki

- `www/` — strona: `index.html` (wygląd), `app.js` (mapa, stan, alarm w przeglądarce, edycja granicy),
  `granica.js` (współrzędne), `leaflet/` (biblioteka mapy Leaflet 1.9.4, licencja BSD-2).
- `apk/` — aplikacja na Androida: `Mapa.java` (okno z mapą), `Straz.java` (usługa pilnująca granicy w tle:
  GPS, alarm, powiadomienia), `Granica.java` (czy punkt jest w środku, odległość do granicy), `Dzwiek.java` (syrena).
  Reguły alarmu są w `app.js` i w `Straz.java` — zmieniając je, zmień oba miejsca.
- APK buduje GitHub Actions (`.github/workflows/gora-hugona-apk.yml`) po każdej zmianie w tym folderze.

Podkład mapy: zdjęcia satelitarne © Esri, Maxar, Earthstar Geographics; mapa © autorzy OpenStreetMap.
Do podkładu potrzebny jest internet, a granica, GPS i alarm działają bez niego.
