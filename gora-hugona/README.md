# Góra Hugona — gra w chowanego z mapą i alarmem granicy

Mapa obszaru przy Górze Hugona (Świętochłowice-Zgoda) ze znacznikiem Twojej pozycji.
Gdy wyjdziesz poza granicę, telefon wyje syreną i wibruje, aż wrócisz albo wyciszysz alarm.
Do tego gra w chowanego na 7 profilach: mistrz gry przydziela role, widzi wszystkich i razem z szukającymi
ustawia czas gry i wysyła powiadomienia.

📱 **Android:** [**GoraHugona.apk**](https://github.com/kanalpatryk-netizen/Trzewoa/releases/download/gora-hugona-apk/GoraHugona.apk)
— pobierz na telefonie, otwórz i zainstaluj (Android zapyta o zgodę na instalację z tego źródła).

🍏 **iPhone:** [**GoraHugona.ipa**](https://github.com/kanalpatryk-netizen/Trzewoa/releases/download/gora-hugona-apk/GoraHugona.ipa)
— instalacja z komputera, bez App Store (niżej: [iPhone bez App Store](#-iphone-bez-app-store)). Androidy i iPhone'y grają razem.

## 🍏 iPhone bez App Store

Plik `GoraHugona.ipa` nie jest podpisany — podpisuje go dopiero program do instalacji, **Twoim Apple ID**:

1. Zainstaluj na komputerze (Windows albo Mac) [**Sideloadly**](https://sideloadly.io). Na Windows potrzebne są też iTunes
   i iCloud **ze strony Apple** (nie ze Sklepu Microsoft).
2. Pobierz [`GoraHugona.ipa`](https://github.com/kanalpatryk-netizen/Trzewoa/releases/download/gora-hugona-apk/GoraHugona.ipa),
   podłącz iPhone'a kablem, odblokuj go i dotknij „Zaufaj temu komputerowi”.
3. W Sideloadly przeciągnij plik `.ipa`, wpisz Apple ID i naciśnij **Start**. Najlepiej użyć zapasowego Apple ID —
   hasło trafia do Sideloadly.
4. Na iPhonie: **Ustawienia → Prywatność i ochrona → Tryb dewelopera → włącz** (iPhone uruchomi się ponownie),
   potem **Ustawienia → Ogólne → VPN i zarządzanie urządzeniem →** Twoje Apple ID **→ Zaufaj**.
5. Otwórz Górę Hugona, zaloguj się, naciśnij **START** i zezwól na lokalizację („Podczas używania aplikacji”,
   z włączoną **Dokładną lokalizacją**) oraz na powiadomienia.

| Konto Apple | Ile działa aplikacja | Uwagi |
|---|---|---|
| darmowe Apple ID | **7 dni** | potem wgraj ją Sideloadly jeszcze raz (granica i profil zostają); najwyżej 3 takie aplikacje naraz |
| płatne Apple Developer (99 USD/rok) | rok | |

Zamiast Sideloadly można użyć [AltStore](https://altstore.io) — sam odnawia aplikację co tydzień, gdy komputer z AltServerem
jest w tej samej sieci Wi-Fi.

**Czym iPhone różni się od Androida:**

- Pilnowanie w tle trwa, póki aplikacja nie jest **zamknięta machnięciem w górę** w przełączniku aplikacji — wtedy iOS je kończy.
  Wyjście do ekranu głównego i zgaszenie ekranu niczego nie psują. Niebieska strzałka (albo niebieski pasek) u góry
  ekranu znaczy, że pilnowanie trwa. Gdy iOS sam zamknie aplikację, po ponownym otwarciu pilnowanie wraca samo.
- Syrena gra także przy przełączniku wyciszenia; na czas syreny aplikacja podnosi głośność do 80% (jak na Androidzie).
- Nie ma stałego powiadomienia „Pilnuję granicy” (iOS takich nie ma) ani ustawień oszczędzania baterii — nie są potrzebne.
- Krótkofalówka: głos innych leci sam, także w tle i przy zgaszonym ekranie; mówić można przy otwartej aplikacji.

## Gra w chowanego

| Login | Hasło | Profil |
|---|---|---|
| `admin1` … `admin6` | takie samo jak login | Gracz 1 … Gracz 6 |
| `admin7` | `admin7` | **Mistrz gry** |

Każdy loguje się na swoim telefonie i naciska **START** (bez tego telefon nie dołącza do gry). Potem przycisk 👥:

| | Mistrz gry | Szukający | Chowający się |
|---|---|---|---|
| widzi na mapie | **wszystkich** graczy | innych **szukających** | tylko siebie |
| przydziela role (szuka / chowa się / nie gra) | ✅ | — | — |
| ustawia czas gry (5–60 min, odliczanie u wszystkich) | ✅ | ✅ | — |
| wysyła powiadomienia (do wszystkich, szukających, chowających się albo jednego gracza) | ✅ | ✅ | — |
| krótkofalówka (mówi i słyszy) | ✅ | ✅ | — |

**Ekran chowającego się** zawiera tylko mapę obszaru, jego znacznik, pozostały czas i przycisk **Wyloguj** — bez paska
stanu, przycisków i ustawień. Przełącza się sam, gdy mistrz gry da graczowi rolę „chowa się” (i wraca do pełnego,
gdy da inną). Powiadomienia przychodzą wtedy jako zwykłe powiadomienia telefonu. Syrena za granicą dalej działa, ale
nie ma przycisku wyciszenia — milknie dopiero po powrocie do obszaru. Wyloguj od razu kończy udział w grze na tym
telefonie (zamiast STOP). Przesunięta mapa po 8 sekundach sama wraca na jego znacznik.

### 📻 Krótkofalówka szukających i mistrza gry

Szukający albo mistrz gry **przytrzymuje czerwony przycisk MÓW** (lewy dolny róg mapy) i mówi; po puszczeniu przycisku
reszta kanału słyszy „roger beep”. Pozostali (inni szukający i mistrz gry) **nie muszą nic dotykać** — głos sam leci
z ich telefonów, także przy zgaszonym ekranie i z telefonem w kieszeni (głośność multimediów; muzyka na ten czas
cichnie). W pasku u góry widać, kto mówi (np. „📻 Mistrz gry mówi…”), a znacznik mówiącego szukającego pulsuje.

- Przy pierwszym wciśnięciu MÓW aplikacja pyta o mikrofon — zgódź się i wciśnij jeszcze raz.
- Mówić można tylko z otwartą aplikacją (Android nie daje mikrofonu aplikacjom w tle), najwyżej 60 s naraz.
  Jak w prawdziwej krótkofalówce: kiedy sam mówisz, nie słyszysz innych (inaczej ich głos wracałby echem).
- Opóźnienie ok. 1 s, jakość jak w radiu (8 kHz); jedna minuta mówienia to ok. 250 KB danych.
- Głos słyszą tylko szukający i mistrz gry — chowający się nie. Leci przez ten sam szyfrowany serwer co reszta gry,
  tylko na żywo: nie jest nigdzie zapisywany i nikt, kto dołączy później, go nie usłyszy.

- Znaczniki: 🔴 szukający, 🟣 chowający się, szary — nie gra. Czerwona obwódka = gracz jest poza granicą.
  Wyblakły znacznik = pozycja sprzed ponad minuty (np. brak zasięgu); szary z napisem „wyłączył grę” = gracz nacisnął STOP.
- Powiadomienie wyskakuje na telefonie także przy zgaszonym ekranie, z dźwiękiem według ustawień telefonu
  (w trybie cichym — tylko wibracja). Koniec czasu gry przychodzi jako powiadomienie do wszystkich.
- Do gry potrzebny jest internet (dane komórkowe). Telefony łączą się przez darmowy, publiczny serwer MQTT
  (HiveMQ); wszystko, co wysyłają, jest zaszyfrowane (AES-GCM). Po chwilowej utracie zasięgu łączą się same
  i dosyłają zaległe zmiany.
- Loginy `adminN` to tylko wybór profilu — nie są prawdziwym zabezpieczeniem, a klucz szyfru jest w aplikacji.
  To wystarcza na zabawę wśród znajomych, nie na nic poważniejszego.
- Uwaga dla chowających się: syrena po wyjściu za granicę jest głośna (gra także w trybie cichym), więc zdradza
  kryjówkę. Taka jest umowa: nie wychodzić za granicę.

## Jak używać

1. Otwórz aplikację, zaloguj się i naciśnij **START**.
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
  GPS, alarm, powiadomienia, udział w grze), `Granica.java` (czy punkt jest w środku, odległość do granicy),
  `Dzwiek.java` (syrena), `Gra.java` (gra przez serwer MQTT: pozycje, role, czas, powiadomienia, głos; kto kogo
  widzi i słyszy), `Szyfr.java` (szyfrowanie), krótkofalówka: `Radio.java` (kodek ADPCM, pakiety po 250 ms),
  `Nadajnik.java` (mikrofon), `Glosnik.java` (odtwarzanie w tle). Reguły alarmu są w `app.js`, `Straz.java` i `ios/GoraHugona/Straz.swift` —
  zmieniając je, zmień wszystkie trzy miejsca.
- `test/TestGry.java` — test sieci gry na prawdziwym serwerze (kilka „telefonów” w jednym procesie, własny losowy
  temat), `test/TestRadio.java` — test kodeka krótkofalówki; oba uruchamia GitHub Actions przy każdej zmianie.
- `ios/` — aplikacja na iPhone'a (Swift, ta sama strona `www/`): `Mapa.swift` (okno z mapą i most `HugonAndroid` dla strony),
  `Straz.swift` (GPS w tle, alarm, powiadomienia, udział w grze), `Dzwiek.swift` (syrena i piski), `Glosnik.swift`
  i `Nadajnik.swift` (krótkofalówka); w `ios/GoraHugona/Rdzen/` przeniesione 1:1 z Javy `Gra.swift`, `Szyfr.swift`,
  `Radio.swift`, `Granica.swift` i własny klient MQTT `Mqtt.swift`. Projekt Xcode powstaje z `ios/project.yml` (XcodeGen).
- `test/Wektory.java`, `test/TestMieszany.java` i `ios/test/main.swift` — zgodność iPhone'a z Androidem: szyfr i kodek
  krótkofalówki co do bajtu oraz wspólna gra na prawdziwym serwerze (mistrz gry z Androida, gracze z iPhone'a).
- APK buduje GitHub Actions (`.github/workflows/gora-hugona-apk.yml`), a IPA — `.github/workflows/gora-hugona-ipa.yml`
  (na Macu w chmurze), po każdej zmianie w tym folderze; oba pliki trafiają do tego samego wydania. Opis wydania: `WYDANIE.md`.

Podkład mapy: zdjęcia satelitarne © Esri, Maxar, Earthstar Geographics; mapa © autorzy OpenStreetMap.
Do podkładu potrzebny jest internet, a granica, GPS i alarm działają bez niego.
