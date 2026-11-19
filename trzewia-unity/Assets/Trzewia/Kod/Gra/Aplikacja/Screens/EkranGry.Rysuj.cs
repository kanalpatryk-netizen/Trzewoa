// Port: alpha-1/src/app/screens/game.ts — obraz ekranu gry (render) i miejsca pól dla samouczka. Świat na płycie rysuje
// PlytaSwiata (ta sama kolejność warstw co w game.ts), a ten ekran wplata w nią swoje warstwy sterowania
// (IWarstwySterowania: podgląd planu, zaznaczenie, rozkazy, ramka, znaczniki, szkice w pauzie, cel).
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Atlas;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawySterowanie;
using static Trzewia.Nastawy.NastawyPomieszczenia;
using static Trzewia.Rdzen.SettingsStore;
using SLud = Trzewia.Symulacja.Lud;

namespace Trzewia.Aplikacja
{
    public sealed partial class EkranGry
    {
        // ------------------------------------------------------------------ warstwy wplecione w świat

        double? IWarstwySterowania.wybrany => ui.selected?.id;

        void IWarstwySterowania.podglad(IPlotno ctx, Camera c, double teraz)
        {
            var proba = probaPodKursorem();
            if (proba != null) pokoje.podglad(ctx, sim, c, proba, teraz, szablon == "lina" ? cenaLinyPodpis(ciagniecie == null)
                : ciagniecie != null ? null : szablon != null && !Pomieszczenia.czyPokoj(szablon) ? $"{NAZWA_POMIESZCZENIA[szablon]} — przeciągnij" : null);
        }

        void IWarstwySterowania.zaznaczenie(IPlotno ctx, Camera c, double teraz)
        {
            oczyscZaznaczenie();
            Druzyna.rysujZaznaczenie(ctx, sim, c, teraz, zaznaczeni);
        }

        void IWarstwySterowania.polecenia(IPlotno ctx, Camera c, double teraz)
        {
            Druzyna.rysujPoleceniaNaMapie(ctx, sim, c, teraz, zaznaczeni, falaRozkazu);
            if (ramka != null) Druzyna.rysujRamke(ctx, c, ramka, teraz, sim.world.w, sim.world.h, podgladRamki());
            if (panelDev != null && ustawienia.trybDeweloperski && nasluch == null) RysDev.rysujDev(ctx, sim, c, teraz);
        }

        void IWarstwySterowania.znacznikiLudu(IPlotno ctx, Camera c, double teraz) => Znaczniki.rysujZnacznikiLudu(ctx, sim, c);

        void IWarstwySterowania.rozkazy(IPlotno ctx, Camera c, double teraz) => RysRozkazy.rysujRozkazy(ctx, sim, c, rozkazy.lista, teraz);

        void IWarstwySterowania.cel(IPlotno ctx, Camera c, double teraz)
        {
            if (cel?.klan is { } kl)
            {
                // pierścień siedziby idzie za siedzibą — po przeprowadzce strzałka wskazywała stare miejsce
                var k = kl >= 0 && kl < sim.clans.Count ? sim.clans[(int)kl] : null;
                if (k != null && !k.dead) { cel.x = k.hx; cel.y = k.hy; }
            }
            if (cel != null) Znaczniki.podswietlCel(ctx, c, cel, teraz);
        }

        // ------------------------------------------------------------------ obraz

        public override void rysuj(IPlotno ctx, double w, double h, double teraz)
        {
            // Krąg Trzeci: film zamiast gry; potem scena wejścia (kamera i szóstka w rękach sceny)
            if (wstep.plansze()) { wstep.rysujPlansze(ctx, sim, w, h, teraz); return; }
            if (wstep.trwa())
            {
                recznaKamera = true;
                if (wstep.krok(sim, cam, teraz)) { recznaKamera = false; camTarget.x = cam.x; camTarget.y = cam.y; }
                dirty = true;
            }
            // licznik wydajności (F3): kolejne odcinki klatki doliczane do swoich części
            var L = Wydajnosc.licznik;
            var t = Wydajnosc.Teraz();
            if (ustawienia.jakosc == "auto" && !jakoscAuto.taniej && eng.scale == 1 && straz.klatka(teraz))
            {
                jakoscAuto.taniej = true;
                eng.resize(plate.w, plate.h);
                dirty = true;
            }
            // Rycina jest najdroższa w klatce. Ruch kamery przerysowuje ją od razu, a zmiany samego świata wystarczą
            // trzydzieści razy na sekundę.
            var kameraRuszona = cam.x != rysKam[0] || cam.y != rysKam[1] || cam.zoom != rysKam[2];
            var chce = kameraRuszona || eng.niedokonczona || (dirty && teraz - lastInk > 30) || teraz - lastInk > 150;
            eng.fresk = ustawienia.swiat != "rycina";
            if (eng.klatka(sim, cam, teraz, chce))
            {
                lastInk = teraz; dirty = false;
                rysKam[0] = cam.x; rysKam[1] = cam.y; rysKam[2] = cam.zoom;
            }
            t = L.znacz(Czesc.rycina, t);

            var ruch = ustawienia.oddech && !ustawienia.ograniczRuch;
            // rdzeń oddycha tym samym rytmem, którym dudni skała (bez dźwięku — oddech z zegara, jak w TS bez dźwięku)
            var oddech = ruch ? Tajemnica.oddechRdzenia(sim, teraz, app.dzwiek.oddech(sim.sen)) : 0.5;

            // ściana krypty pod płytą: płyta zakrywa ścianę w całości, więc ściana rysuje się tylko wokół niej
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, w, h);
            ctx.rect(plate.x + 2, plate.y + 2, Math.Max(0, plate.w - 4), Math.Max(0, plate.h - 4));
            ctx.clip("evenodd");
            Fresk.scianaKrypty(ctx, w, h, ruch ? teraz : 0, oddech, (plate.x + plate.w / 2) / w, (plate.y + plate.h / 2) / h);
            ctx.restore();
            t = L.znacz(Czesc.interfejs, t);

            ctx.save();
            ctx.beginPath();
            ctx.rect(plate.x, plate.y, plate.w, plate.h);
            ctx.clip();
            ctx.translate(plate.x, plate.y);
            // oprawa (etap 2): wielkości napisów i znaków w px @1080p — skala z wysokości ekranu
            Visual.Czytelnosc.SkalaUi = h / 1080; Visual.Czytelnosc.PlytaX = plate.x; Visual.Czytelnosc.PlytaY = plate.y;
            // oprawa (etap 3): wstrząs kamery — świat na płycie drga i lekko się obraca wokół środka płyty, powiększony
            // o tyle, by brzegi nie odsłaniały tła; interfejs stoi
            if (Visual.Uderzenie.Wstrzas(teraz, out var wdx, out var wdy, out var wkat))
            {
                double scx = plate.w / 2, scy = plate.h / 2;
                var pow = 1 + (2 * Math.Max(Math.Abs(wdx), Math.Abs(wdy)) + Math.Abs(Math.Sin(wkat)) * Math.Max(plate.w, plate.h)) / Math.Min(plate.w, plate.h);
                ctx.translate(scx + wdx, scy + wdy); ctx.rotate(wkat); ctx.scale(pow, pow); ctx.translate(-scx, -scy);
            }
            t = plyta.Rysuj(ctx, sim, cam, teraz, pauza, oddech, pomieszczeniePodKursorem(), oltarzPodKursorem(), t, this);
            ctx.restore();
            // oprawa (etap 3): zmiany zasobów bez lotu z Urobków (jedzenie, wiara z modlitwy i za Cud, krew z zabijania) → loty
            Visual.LotyZasobow.Krok(sim, urobki, teraz);
            // oprawa (etap 4): w przerywniku (wejście/śmierć bossa) chowa się cały HUD — zamiast niego pasy kinowe
            var ukryjHud = Visual.Cutscena.UkryjHud(teraz);
            if (!ukryjHud)
                // etap 3: fala Strażników Snu — pasek nad polem gry
                RysStraznicy.rysujPasekFali(ctx, sim, plate.x + plate.w * 0.42, plate.y + 10, plate.w * 0.46);
            if (pauza)
            {
                // wstrzymany oddech: złota, pulsująca rama wewnątrz płyty
                var puls = 0.5 + 0.5 * Math.Sin(teraz * 0.0025);
                ctx.save();
                ctx.strokeStyle = Barwa.Rgba(224, 176, 104, 0.28 + 0.22 * puls);
                ctx.lineWidth = 2;
                ctx.strokeRect(plate.x + 4, plate.y + 4, plate.w - 8, plate.h - 8);
                ctx.restore();
            }

            // rycina ma brzeg, nie ekran: rytowana ciemność, patyna odbitki i skala w obcym piśmie
            var pr = new ProstokatPlyty(plate.x, plate.y, plate.w, plate.h);
            tajemnica.brzegi(ctx, pr, oddech);
            if (ustawienia.skalaGlebokosci) tajemnica.skala(ctx, pr, sim, cam, oddech);

            Plyta.drawSmoke(ctx, plate, sim, teraz);
            Plyta.drawEyelid(ctx, plate, sim, teraz);
            Plyta.drawFrame(ctx, plate, teraz, oddech, ui.pointer);
            if (ustawienia.skalaGlebokosci && !plate.waski && !plate.niski && !ukryjHud) Minimapa.rysujMinimape(ctx, sim, cam, plate, teraz);
            // Alpha 1 (komputer): pod płytą księga (lud i zasoby), okno postaci w rogu płyty, „Budowa” obok księgi
            // (telefon: tła HUD, pasek drużyny, dłonie oddania — pominięte)
            // oprawa (etap 4): w przerywniku cały HUD pod płytą (i przyciski, i karty) chowa się za pasami kinowymi —
            // klikom i tak odcina drogę Cutscena.Trwa (EkranGry.Wejscie.cs), więc puste listy pól są tylko porządkiem
            polaDruzyny.Clear();
            if (!ukryjHud)
            {
                polaKsiegi = Ksiega.rysujKsiege(ctx, sim, plate, h, zaznaczeni, ui.pointer, teraz, urobki);
                polaOkna = sim.ending == null && !zapiski && !atlas.otwarte
                    ? OknoPostaci.rysujOknoPostaci(ctx, sim, plate, zaznaczeniZywi(), ui.pointer, teraz) : new List<PoleOkna>();
                if (sim.ending != null) menuBudowy = false;
                ui.draw(ctx, sim, teraz);
                var cena = Pomieszczenia.cenaLiny(sim);
                polaBudowy = Budowa.rysujBudowe(ctx, plate, h, new StanBudowy
                {
                    kursor = ui.pointer, czas = teraz, menu = menuBudowy, szablon = szablon,
                    maRozkaz = zaznaczeniZywi().Any(c => c.polecenie != null),
                    liny = (Pomieszczenia.darmoweLiny(sim), cena != 0 ? cena : POMIESZCZENIA.linaKrew),
                });
                // (Alpha 1: kroniki na dole już nie ma — wszystkie wpisy są w zapiskach)
                przyciski = Przyciski.rozmiescPrzyciski(plate, h, pauza, zapiski, legenda, tempoTeraz(), ustawienia.trybDeweloperski, Odkrycia.odkrycia.niezobaczone);
                // atlas stoi osobno, przy księdze — własna okrągła tablica
                foreach (var b in przyciski.Where(q => q.osobno))
                {
                    var pad = Math.Max(6, b.r * 0.3);
                    Panele.panelKamien(ctx, b.x - b.r - pad, b.y - b.r - pad, (b.r + pad) * 2, (b.r + pad) * 2, b.r + pad);
                }
                // panel przycisków z przegródkami (rysunek Pawła: prostokąt z przegródkami pod rzędem przycisków)
                var prz = przyciski.Where(q => !q.osobno).ToList();
                if (prz.Count > 0)
                {
                    double x0 = prz.Min(b => b.x - b.r), x1 = prz.Max(b => b.x + b.r);
                    double y0 = prz.Min(b => b.y - b.r), y1 = prz.Max(b => b.y + b.r);
                    var pad = Math.Max(6, prz[0].r * 0.35);
                    Panele.panelKamien(ctx, x0 - pad, y0 - pad, x1 - x0 + pad * 2, y1 - y0 + pad * 2);
                    Panele.przegrodki(ctx, prz.Select(b => (b.x, b.y, b.r)));
                }
                var podPrzyciskiem = Przyciski.przyciskPod(przyciski, ui.pointer.x, ui.pointer.y);
                Przyciski.rysujPrzyciski(ctx, przyciski, podPrzyciskiem?.akcja, teraz);
            }
            else { polaKsiegi = new List<PoleKsiegi>(); polaOkna = new List<PoleOkna>(); polaBudowy = new List<PoleBudowy>(); przyciski = new List<Przycisk>(); }
            ui.plan = pauza ? rozkazy : null;
            const double nadPrzyciskami = 0;
            var wyd = sim.wydarzenia.biezace;
            if (!ukryjHud)
            {
                polaBanera = pauza && !zapiski && sim.ending == null && wyd == null
                    ? RysRozkazy.rysujBanerPauzy(ctx, plate, sim, rozkazy.ile, teraz, nadPrzyciskami) : new List<PoleBanera>();
                polaAlarmu = alarm != null && pauza && !zapiski && wyd == null ? RysRozkazy.rysujAlarm(ctx, plate, alarm, teraz) : new List<PoleAlarmu>();
                polaWydarzenia = wyd != null && !zapiski && sim.ending == null ? RysWydarzenie.rysujWydarzenie(ctx, plate, sim, wyd, teraz) : new List<PoleWyboru>();
            }
            else { polaBanera = new List<PoleBanera>(); polaAlarmu = new List<PoleAlarmu>(); polaWydarzenia = new List<PoleWyboru>(); }
            // etap 3d: okno ołtarza (karta wydarzenia ma pierwszeństwo — okno czeka pod nią)
            if (sim.ending != null) oknoOltarza = false;
            polaOltarza = oknoOltarza && wyd == null && !zapiski && !ukryjHud
                ? OknoOltarza.rysujOknoOltarza(ctx, plate, sim, teraz, ui.pointer, (plate.x + cam.toScreenX(sim.world.oltarz.x + 0.5), cam.zoom * 2.6)) : new List<PoleOltarza>();
            // (na komputerze bez przycisku menu w rogu — Esc)
            if ((liczby || ustawienia.trybDeweloperski) && !ukryjHud)
            {
                ctx.save();
                ctx.font = $"{Js.Js.S(Math.Max(14, w / 74))}px \"Trzewia Tekst\", Georgia, serif";
                ctx.textAlign = "right";
                ctx.fillStyle = "rgba(236,222,190,0.95)";
                var sek = Math.Floor(sim.tick / TEMPO.tikowNaSekunde);
                var linie = new[]
                {
                    $"wiara {Js.Js.S(Math.Floor(sim.wiara + 0.5))}",
                    $"krew {Js.Js.S(Math.Floor(sim.krew + 0.5))}",
                    $"oddanie {Js.Js.S(Math.Floor((Pielgrzymka.najwierniejsza(sim)?.devotion ?? 0) * 100 + 0.5))}%",
                    $"żywych {sim.creatures.Count(c => !c.dead)}",
                    $"{Js.Js.S(Math.Floor(sek / 60))}:{Js.Js.S(sek % 60).PadLeft(2, '0')} · tik {Js.Js.S(sim.tick)}{(tempoTeraz() != 1 ? $" · ×{Przyciski.mnoznikNapis(tempoTeraz())}" : "")}",
                };
                // na dole płyty po prawej — u góry stoją dziennik dewelopera i podpis Cudu
                for (int i = 0; i < linie.Length; i++) ctx.fillText(linie[i], plate.x + plate.w - 12, plate.y + plate.h - 14 - (linie.Length - 1 - i) * 20);
                ctx.restore();
            }
            if (!ukryjHud)
            {
                // okruchy rudy lecą nad wszystkim, aż do liczników
                urobki.rysujLoty(ctx, plate, cam, teraz);
                Visual.LotyZasobow.Rysuj(ctx, plate, cam, urobki, teraz);
                if (legenda) Legenda.rysujLegende(ctx, plate, w);
            }
            // Alpha 1 (komputer): nad płytą nic — zasoby są w księdze, podpowiedź nad płytą nie jest rysowana
            radaRect = null;
            if (painting) rysujKoszt(ctx, w);
            // (klepsydra tylko na telefonie — na komputerze pauza to spacja, a rama płyty płonie złotem)
            if (zapiski)
            {
                var r = Zapiski.rysujZapiski(ctx, plate, sim, w, h, przewinZapiskow);
                trafieniaZapiskow = r.trafienia;
                maxPrzewin = r.maxPrzewin;
            }
            atlas.rysuj(ctx, w, h, teraz);
            panelDev?.rysuj(ctx, w, h, teraz);
            // Krąg Trzeci: napisy sceny wejścia (bez sterowania)
            wstep.rysujNapisy(ctx, plate.x, plate.y, plate.w, plate.h, teraz);
            // oprawa (etap 4): pasy kinowe, napisy i karta tytułu przerywnika — na samej górze, nad wszystkim
            Visual.Cutscena.Rysuj(ctx, sim, plate, teraz);
            L.znacz(Czesc.interfejs, t);
        }

        /// <summary>Ile już kosztuje trzymane pociągnięcie — rysowane przy kursorze, póki malujesz.</summary>
        void rysujKoszt(IPlotno ctx, double w)
        {
            var k = kosztPociagniecia;
            var czesci = new List<string>();
            if (k.krew > 0) czesci.Add($"{Js.Js.S(Math.Floor(k.krew + 0.5))} krwi");
            if (k.wiara > 0) czesci.Add($"{Js.Js.S(Math.Floor(k.wiara + 0.5))} wiary");
            if (k.otchlan > 0) czesci.Add($"{Js.Js.S(Math.Floor(k.otchlan + 0.5))} otchłani");
            if (czesci.Count == 0) return;
            var rozmiar = Math.Max(14, Math.Min(19, w / 68));
            ctx.save();
            ctx.font = $"{Js.Js.S(rozmiar)}px \"Trzewia Tekst\", Georgia, serif";
            ctx.textAlign = "center";
            var x = Math.Max(plate.x + 60, Math.Min(plate.x + plate.w - 60, ui.pointer.x));
            var y = Math.Max(plate.y + 24, ui.pointer.y - rozmiar * 2.2);
            ctx.lineWidth = 3;
            ctx.strokeStyle = "rgba(10,7,6,0.85)";
            ctx.strokeText(string.Join(" · ", czesci), x, y);
            ctx.fillStyle = "rgba(232,196,168,0.95)";
            ctx.fillText(string.Join(" · ", czesci), x, y);
            ctx.restore();
        }

        // ------------------------------------------------------------------ miejsca dla samouczka i testów

        /// <summary>Prostokąty interfejsu — dla automatycznego testu nakładania (narzędzie deweloperskie).</summary>
        public List<ObszarHud> obszaryHud()
        {
            var okno = polaOkna.FirstOrDefault(p => p.akcja == "tlo");
            return ObszaryHud.zbierzObszaryHud(plate, app.h, ui, przyciski, null, radaRect, menuRect(), okno != null ? new Obszar(okno.x, okno.y, okno.w, okno.h) : (Obszar?)null);
        }

        /// <summary>Gdzie leży pole „drużyny” (medalion roli, „wyznacz pomieszczenie”) — samouczek je wskazuje.</summary>
        public Obszar? miejscePolaDruzyny(string akcja, string? rola = null)
        {
            var p = polaDruzyny.FirstOrDefault(q => q.akcja == akcja && (rola == null || q.rola == rola));
            if (p != null) return new Obszar(p.x, p.y, p.w, p.h);
            // Alpha 1 (komputer): medaliony są w księdze, „wyznacz pomieszczenie” to płyta „Budowa”
            if (akcja == "rola") { var k = polaKsiegi.FirstOrDefault(q => q.akcja == "rola" && (rola == null || q.rola == rola)); return k != null ? new Obszar(k.x, k.y, k.w, k.h) : (Obszar?)null; }
            if (akcja == "pomieszczenia") { var b = polaBudowy.FirstOrDefault(q => q.akcja == "buduj"); return b != null ? new Obszar(b.x, b.y, b.w, b.h) : (Obszar?)null; }
            return null;
        }

        /// <summary>Alpha 1: pole księgi (np. pieczęć „nakarm”) — samouczek je wskazuje.</summary>
        public PoleKsiegi? miejscePolaKsiegi(string akcja) => polaKsiegi.FirstOrDefault(p => p.akcja == akcja);

        /// <summary>Alpha 1: pole w oknie postaci (np. „modl”, „cud”) — samouczek je wskazuje.</summary>
        public PoleOkna? poleOkna(string akcja) => polaOkna.FirstOrDefault(p => p.akcja == akcja);

        /// <summary>Etap 3d: ilu zaznaczonych ma tę rolę (samouczek ołtarza).</summary>
        public int zaznaczeniRoli(string rola) => zaznaczeniZywi().Count(c => SLud.rolaPostaci(c) == rola);

        /// <summary>Etap 3d: gdzie w otwartym oknie ołtarza leży pole rytuału — samouczek je wskazuje (albo null, gdy okno zamknięte).</summary>
        public PoleOltarza? poleOltarza(string rodzaj) => polaOltarza.FirstOrDefault(p => p.akcja == "rytual" && p.rodzaj == rodzaj);

        /// <summary>Gdzie leży przycisk pod płytą — samouczek go wskazuje.</summary>
        public Przycisk? miejscePrzycisku(string akcja) => przyciski.FirstOrDefault(b => b.akcja == akcja);

        Obszar menuRect() => new Obszar(plate.x - (plate.waski ? 38 : 44), plate.y + 8, 34, 30);
    }
}
