# Grafiki z fresków — źródła i licencje

Elementy wycięte ze zdjęć średniowiecznych malowideł ściennych do interfejsu i ilustracji gry.
Gra jeszcze ich nie używa (folder nie trafia do budowy). Podgląd całości: [`podglad.jpg`](podglad.jpg).

**Jak powstały:** kształt wycięcia wyznaczył Gemini (zielone tło), a piksele pochodzą z oryginałów
w folderze [`oryginaly/`](oryginaly). Nic nie jest przemalowane. Jedyny wyjątek to trzy diabły,
patrz niżej. Ikony to kadry oryginałów w kształcie odłamka tynku, tekstury to kadry zszyte
tak, żeby kafle łączyły się bez widocznej krawędzi.

**Rozdzielczość:** oryginały mają 700–1500 px. Na odłamki, karty, portrety i ikony wystarcza,
na pełnoekranowe tło nie.

## Źródła

| Oryginał | Dzieło | Gdzie jest | Licencja zdjęcia |
|---|---|---|---|
| `anna.jpg` | Święta Anna, Faras (Nubia), VIII–IX w. | Muzeum Narodowe w Warszawie, nr inw. 234058 | domena publiczna, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Faras_-_Saint_Anne_-_Google_Art_Project.jpg) (Google Art Project) |
| `michal.jpg` | Archanioł Michał z rogiem i kulą, Faras, IX w. | Muzeum Narodowe w Warszawie, nr inw. 234052 | domena publiczna, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Faras_-_Archangel_Michael_with_a_horn_trumpet_and_an_orb_-_Google_Art_Project.jpg) |
| `biskup.jpg` | Biskup Petros ze świętym Piotrem, Faras, 974–997 | Muzeum Narodowe w Warszawie, nr inw. 234031 | domena publiczna, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Faras_-_Bishop_Petros_with_Saint_Peter_-_Google_Art_Project.jpg) |
| `kuszenie.jpg` | Kuszenie Chrystusa przez diabła, San Baudelio de Berlanga, XII w. | The Met Cloisters, nr 61.248 | Met Open Access, [strona dzieła](https://www.metmuseum.org/art/collection/search/471907) |
| `pedret.jpg` | Maryja z Dzieciątkiem w majestacie, archaniołowie i Trzej Królowie, Mistrz z Pedret, ok. 1100 | The Met Cloisters, nr 50.180a–l | Met Open Access, [strona dzieła](https://www.metmuseum.org/art/collection/search/472381) |
| `smok.jpg` | Smok, kapitularz klasztoru San Pedro de Arlanza, XIII w. | The Met Cloisters, nr 31.38.2a, b | Met Open Access, [strona dzieła](https://www.metmuseum.org/art/collection/search/471062) |
| `lew.jpg` | Lew, kapitularz klasztoru San Pedro de Arlanza, XIII w. | The Met Cloisters, nr 31.38.1a, b | Met Open Access, [strona dzieła](https://www.metmuseum.org/art/collection/search/471061) |
| `swiety1.jpg`, `swiety2.jpg` | Głowy świętych, fragmenty fresku bizantyjskiego, XII w. | The Met, nr 2000.525.2 i 2000.526.1 | Met Open Access, [strona 1](https://www.metmuseum.org/art/collection/search/473161), [strona 2](https://www.metmuseum.org/toah/works-of-art/2000.526) |
| `wielblad.jpg` | Wielbłąd, San Baudelio de Berlanga, XII w. | The Met Cloisters, nr 61.219 | Met Open Access, [strona dzieła](https://www.metmuseum.org/toah/works-of-art/61.219) |

Przy dziełach z Met przed wydaniem gry sprawdź na stronie dzieła znaczek „Open Access” (CC0).
Bez niego zdjęcie nie jest objęte tą licencją.

## Co z czego

| Plik | Źródło | Uwagi |
|---|---|---|
| `odlamki/odlamek-anna.png` | anna | z napisem greckim po lewej |
| `odlamki/odlamek-michal.png` | michal | cały fragment muru |
| `odlamki/odlamek-biskup.png` | biskup | |
| `odlamki/odlamek-swiety-1.png`, `-2.png` | swiety1, swiety2 | |
| `postacie/aniol-michal.png` | michal | archanioł bez tynku dookoła |
| `postacie/skrzydlo.png` | michal | lewe skrzydło |
| `postacie/diabel-1.png`, `-2.png`, `-3.png` | kuszenie | **odtworzone przez AI (Gemini)** na podstawie fresku; na oryginale diabły są w dużej części zatarte |
| `bestie/smok.png` | smok | |
| `bestie/lew.png` | lew | z kawałkiem liścia rośliny przy pysku |
| `bestie/wielblad.png` | wielblad | |
| `ornamenty/roslina.png`, `arkady.png`, `pas-ornament-lew.png` | lew | |
| `ornamenty/pas-tancerze.png` | smok | fryz z tancerzami i zwierzętami |
| `portrety/portret-chrystus-kuszenie.png`, `portret-aniol-kuszenie.png` | kuszenie | kadr 3:4 |
| `portrety/portret-archaniol-michal.png`, `portret-archaniol-gabriel.png` | pedret | kadr 3:4, mała rozdzielczość |
| `ikony/ryt-szept.png` | anna | usta z palcem |
| `ikony/przycisk-kamera.png` | anna | oko |
| `ikony/przycisk-zapis.png` | biskup | księga |
| `ikony/ryt-znak.png` | michal | kula w dłoni |
| `tekstury/tekstura-tynk.png` | anna | kafel 256 px, bezszwowy |
| `tekstury/tekstura-zloto.png` | swiety2 | złoto nimbu, kafel 256 px, bezszwowy |

Nazwy ikon odpowiadają kluczom z [`src/grafiki/README.md`](../src/grafiki/README.md). Po
wrzuceniu ich do `src/grafiki/pliki/` gra użyje ich w miejsce swoich rycin.
