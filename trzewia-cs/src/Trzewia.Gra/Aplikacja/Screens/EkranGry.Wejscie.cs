// Port: alpha-1/src/app/screens/game.ts — wejście ekranu gry: mysz (zaznaczanie, ramka, rozkazy, plany pomieszczeń,
// ołtarz, karty), kółko i klawisze; akcje księgi, okna postaci i „Budowy”. (Gesty dwoma palcami i przytrzymanie palca
// na rycie zostały, bo mysz ich nie wywoła — tak jak w TS na komputerze.)
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Atlas;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawySterowanie;
using static Trzewia.Nastawy.NastawyPomieszczenia;
using static Trzewia.Nastawy.NastawyOltarz;
using static Trzewia.Nastawy.NastawyLoch;
using static Trzewia.Rdzen.SettingsStore;
using SLud = Trzewia.Symulacja.Lud;

namespace Trzewia.Aplikacja
{
    public sealed partial class EkranGry
    {
        static bool w(Obszar p, double x, double y) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h;

        /// <summary>
        /// Alpha 1 (komputer): dotknięcie okna postaci, „Budowy” albo księgi. Zwraca true, gdy dotknięcie zostało obsłużone
        /// (dalej nie idzie — nie wydaje rozkazu na mapie). Prawy przycisk na tych polach tylko je pochłania.
        /// </summary>
        bool dotykDolu(Wskaznik e)
        {
            if (zapiski || plate.waski || plate.niski) return false;
            double x = e.clientX, y = e.clientY;
            bool wp(double px, double py, double pw, double ph) => x >= px && x <= px + pw && y >= py && y <= py + ph;
            if (e.button == 2) return polaOkna.Any(p => wp(p.x, p.y, p.w, p.h)) || polaKsiegi.Any(p => wp(p.x, p.y, p.w, p.h)) || polaBudowy.Any(p => wp(p.x, p.y, p.w, p.h));
            var okno = polaOkna.FirstOrDefault(p => p.akcja != "tlo" && wp(p.x, p.y, p.w, p.h));
            if (okno != null)
            {
                if (okno.akcja == "zamknij") { odznacz(); app.gesty.klik(); }
                else if (okno.akcja != "tlo") wykonajMozliwosc(okno.akcja);
                dirty = true;
                return true;
            }
            if (polaOkna.Any(p => wp(p.x, p.y, p.w, p.h))) return true;
            var bud = polaBudowy.FirstOrDefault(p => p.akcja != "menu" && wp(p.x, p.y, p.w, p.h));
            if (bud != null && sim.ending == null)
            {
                if (bud.akcja == "buduj")
                {
                    if (menuBudowy) ustawSzablon(null);
                    else
                    {
                        menuBudowy = true; ui.verb = null; ui.tool = null;
                        Odkrycia.odkrycia.odkryj("pomieszczenia");
                        nasluch?.Invoke(new ZdarzenieGry { typ = "planowanie", rodzaj = "menu" });
                    }
                    app.gesty.klik();
                }
                else if (bud.akcja == "odwolaj") odwolajRozkazy();
                else if (bud.akcja == "szablon" && bud.szablon != null) { ustawSzablon(bud.szablon); app.gesty.klik(); }
                dirty = true;
                return true;
            }
            if (polaBudowy.Any(p => wp(p.x, p.y, p.w, p.h))) return true;
            var k = polaKsiegi.FirstOrDefault(p => wp(p.x, p.y, p.w, p.h));
            if (k != null && sim.ending == null)
            {
                if (k.akcja == "rola" && k.rola != null) zaznaczRole(k.rola, e.shiftKey);
                else if (k.akcja == "nakarm") nakarmTeraz();
                dirty = true;
                return true;
            }
            // dotknięcie płyty przy otwartym menu (bez wybranego szablonu) tylko je zamyka
            if (menuBudowy && szablon == null && naPlycie(x, y)) { menuBudowy = false; dirty = true; return true; }
            return false;
        }

        /// <summary>Nakarm z księgi: wiadro zjeżdża tym samym szybem (w pauzie — szkic, który stanie się po puszczeniu czasu).</summary>
        public void nakarmTeraz()
        {
            if (sim.ending != null) return;
            if (dozwolone != null && !dozwolone.Contains("zasiej")) { ui.say("Nie teraz.", sim.tick); return; }
            double x = sim.world.szybWiadraX, y = sim.world.szybWiadraDol;
            if (pauza)
            {
                var blad = rozkazy.zaplanuj(sim, new Rozkaz { czasownik = "zasiej", narzedzie = "grzyb", x = x, y = y });
                if (blad == null)
                {
                    ui.say("Wiadro czeka — zjedzie, gdy puścisz czas.", sim.tick);
                    nasluch?.Invoke(new ZdarzenieGry { typ = "rozkaz", czasownik = "zasiej", narzedzie = "grzyb" });
                }
                else if (blad != "") { ui.say(blad, sim.tick); app.gesty.odmowa(); }
                return;
            }
            var odmowa = Moce.nakarm(sim, x, y);
            if (odmowa != null) { ui.say(odmowa, sim.tick); app.gesty.odmowa(); return; }
            ui.say("Z góry zjedzie więcej jedzenia.", sim.tick);
            app.gesty.klik();
            nasluch?.Invoke(new ZdarzenieGry { typ = "moc", czasownik = "zasiej", narzedzie = "grzyb" });
            dirty = true;
        }

        /// <summary>Cud przy pobożnym (okno postaci): światło spada z góry tuż przy nim.</summary>
        void cudPrzy(Creature c)
        {
            if (dozwolone != null && !dozwolone.Contains("znak")) { ui.say("Nie teraz.", sim.tick); return; }
            double x = Math.Floor(c.x), y = Math.Floor(c.y);
            if (pauza)
            {
                var blad = rozkazy.zaplanuj(sim, new Rozkaz { czasownik = "znak", narzedzie = "objawienie", x = x, y = y });
                if (blad == null)
                {
                    ui.say("Cud czeka — stanie się, gdy puścisz czas.", sim.tick);
                    nasluch?.Invoke(new ZdarzenieGry { typ = "rozkaz", czasownik = "znak", narzedzie = "objawienie" });
                }
                else if (blad != "") { ui.say(blad, sim.tick); app.gesty.odmowa(); }
                return;
            }
            if (!Moce.sign(sim, "objawienie", x, y)) { ui.say("Za mało wiary.", sim.tick); app.gesty.odmowa(); return; }
            app.dzwiek.toll();
            ui.say($"{SLud.NAZWA_ROLI["pobozny"]} wznosi ręce — i spada światło.", sim.tick);
            nasluch?.Invoke(new ZdarzenieGry { typ = "moc", czasownik = "znak", narzedzie = "objawienie" });
            dirty = true;
        }

        /// <summary>Szept do pobożnych z okna postaci: „módl się” albo „przerwij modlitwę” (w pauzie — szkic).</summary>
        void szepnij(List<Creature> kto, string narzedzie)
        {
            if (dozwolone != null && !dozwolone.Contains("szept")) { ui.say("Nie teraz.", sim.tick); return; }
            var ile = 0;
            foreach (var c in kto)
            {
                if (pauza) { if (rozkazy.zaplanuj(sim, new Rozkaz { czasownik = "szept", narzedzie = narzedzie, x = c.x, y = c.y, kto = c.id }) == null) ile++; }
                else if (Moce.whisper(sim, narzedzie, c)) ile++;
            }
            if (ile == 0) { ui.say("Za mało wiary.", sim.tick); app.gesty.odmowa(); return; }
            var t = Moce.TOOLS["szept"].First(x => x.id == narzedzie);
            if (pauza) ui.say("Szept czeka — usłyszą go, gdy puścisz czas.", sim.tick);
            else
            {
                sim.log(ile == 1 ? $"Szepnąłeś pobożnemu: „{t.label}\". Usłyszał." : $"Szepnąłeś {ile} pobożnym: „{t.label}\". Usłyszeli.", "wiara");
                ui.say(narzedzie == "modl" ? (ile == 1 ? "Idzie modlić się pod pomnikiem." : $"Idą modlić się pod pomnikiem: {ile}.") : "Wraca do swoich.", sim.tick);
            }
            app.gesty.klik();
            nasluch?.Invoke(new ZdarzenieGry { typ = "szept", narzedzie = narzedzie });
        }

        /// <summary>Możliwość wybrana w oknie postaci.</summary>
        void wykonajMozliwosc(string akcja)
        {
            var m = OknoPostaci.mozliwosciPostaci(sim, zaznaczeniZywi()).FirstOrDefault(q => q.akcja == akcja);
            if (m == null) return;
            if (!m.ok) { ui.say($"Teraz nie: {m.powod ?? ""}.", sim.tick); app.gesty.odmowa(); return; }
            var kto = m.ids.Select(id => sim.creatureById(id)).Where(c => c != null && !c.dead).Select(c => c!).ToList();
            switch (akcja)
            {
                case "droga": kopDroge(); break;
                case "naprawa": naprawLine(m.ids); break;
                case "cud": if (kto.Count > 0) cudPrzy(kto[0]); break;
                case "modl": case "przerwij": szepnij(kto, akcja); break;
                case "oltarz":
                {
                    var r = Polecenia.wydajDoOltarza(sim, m.ids); var o = sim.world.oltarz;
                    falaRozkazu = new FalaRozkazu { x = o.x + 0.5, y = o.y, t = Wydajnosc.Teraz(), ok = r.przyjeli > 0 };
                    if (r.przyjeli > 0) { ui.say(r.przyjeli == 1 ? "Idzie do ołtarza." : $"Idą do ołtarza: {Js.Js.S(r.przyjeli)}.", sim.tick); app.gesty.klik(); }
                    else app.gesty.odmowa();
                    nasluch?.Invoke(new ZdarzenieGry { typ = "polecenie", rodzaj = "oltarz", przyjeli = r.przyjeli });
                    oknoOltarza = true;
                    nasluch?.Invoke(new ZdarzenieGry { typ = "oltarz", rodzaj = "okno" });
                    break;
                }
                case "kociol":
                {
                    // 6.11: zaklinanie przy kotle podnosi stalową bramę lochu (dwóch naraz)
                    var r = Polecenia.wydajDoKotla(sim, m.ids); var k = sim.world.kociol;
                    falaRozkazu = new FalaRozkazu { x = k.x + 0.5, y = k.y + 0.5, t = Wydajnosc.Teraz(), ok = r.przyjeli > 0 };
                    var zaklina = sim.creatures.Count(c => !c.dead && c.polecenie?.zaklinaj == true);
                    if (r.przyjeli > 0)
                    {
                        ui.say((r.przyjeli == 1 ? "Idzie do kotła." : $"Idą do kotła: {Js.Js.S(r.przyjeli)}.") + (zaklina < BRAMA.potrzeba ? $" Bramę podniosą dopiero {Js.Js.S(BRAMA.potrzeba)} naraz." : " Brama ruszy, gdy zaczną zaklinać."), sim.tick);
                        app.gesty.klik();
                    }
                    else { ui.say($"Nie pójdą: {(r.odmowy.Count > 0 ? r.odmowy[0] : "nie ma drogi")}.", sim.tick); app.gesty.odmowa(); }
                    nasluch?.Invoke(new ZdarzenieGry { typ = "polecenie", rodzaj = "idz", przyjeli = r.przyjeli });
                    break;
                }
                case "zaInnych":
                {
                    var r = Polecenia.wydajModlitweZaInnych(sim, m.ids);
                    if (r.przyjeli > 0) { ui.say(r.przyjeli == 1 ? "Modli się za tych, którzy stoją wokół." : $"Modlą się za innych: {Js.Js.S(r.przyjeli)}.", sim.tick); app.gesty.klik(); }
                    else { ui.say($"Teraz nie: {(r.odmowy.Count > 0 ? r.odmowy[0] : "nie może")}.", sim.tick); app.gesty.odmowa(); }
                    nasluch?.Invoke(new ZdarzenieGry { typ = "polecenie", rodzaj = "idz", przyjeli = r.przyjeli });
                    break;
                }
                case "zbroja": case "warsztat": case "kuznia": case "sen":
                {
                    var rodzaj = akcja == "zbroja" ? "kuznia" : akcja == "sen" ? "sypialnia" : akcja;
                    var pom = sim.pomieszczenia.FirstOrDefault(q => q.gotowe && q.rodzaj == rodzaj);
                    if (pom == null) return;
                    var r = Polecenia.wydajNaPomieszczenie(sim, m.ids, pom);
                    falaRozkazu = new FalaRozkazu { x = pom.x + pom.w / 2, y = pom.y + pom.h, t = Wydajnosc.Teraz(), ok = r.przyjeli > 0 };
                    if (r.przyjeli > 0) { ui.say((r.przyjeli == 1 ? "Idzie." : $"Idą: {Js.Js.S(r.przyjeli)}.") + (r.odmowy.Count > 0 ? $" Odmawia: {r.odmowy.Count}." : ""), sim.tick); app.gesty.klik(); }
                    else { ui.say($"Nie pójdą: {(r.odmowy.Count > 0 ? r.odmowy[0] : "nie ma drogi")}.", sim.tick); app.gesty.odmowa(); }
                    nasluch?.Invoke(new ZdarzenieGry { typ = "polecenie", rodzaj = "pomieszczenie", przyjeli = r.przyjeli });
                    break;
                }
            }
            dirty = true;
        }

        // -------------------------------------------------------------------- zaznaczanie i rozkazy

        /// <summary>Zaznaczenie bez zmarłych (i bez tych, którzy przestali być ludem).</summary>
        void oczyscZaznaczenie()
        {
            foreach (var id in zaznaczeni.ToList())
            {
                var c = sim.creatureById(id);
                if (c == null || c.dead || SLud.rolaPostaci(c) == null) zaznaczeni.Remove(id);
            }
        }

        /// <summary>Zaznaczeni żywi — w kolejności zaznaczenia (Set w JS trzyma kolejność wstawienia).</summary>
        readonly List<double> kolejnoscZaznaczenia = new List<double>();
        List<Creature> zaznaczeniZywi()
        {
            oczyscZaznaczenie();
            kolejnoscZaznaczenia.RemoveAll(id => !zaznaczeni.Contains(id));
            foreach (var id in zaznaczeni) if (!kolejnoscZaznaczenia.Contains(id)) kolejnoscZaznaczenia.Add(id);
            return kolejnoscZaznaczenia.Select(id => sim.creatureById(id)).Where(c => c != null).Select(c => c!).ToList();
        }

        /// <summary>Zaznacza postacie (z Shiftem dokłada albo zdejmuje jedną); ryt w ręku i karta mieszkańca się odkładają.</summary>
        void zaznacz(IReadOnlyList<double> ids, bool dokladaj = false)
        {
            if (!dokladaj) { zaznaczeni.Clear(); kolejnoscZaznaczenia.Clear(); }
            foreach (var id in ids)
            {
                if (dokladaj && ids.Count == 1 && zaznaczeni.Contains(id)) zaznaczeni.Remove(id);
                else if (zaznaczeni.Add(id)) kolejnoscZaznaczenia.Add(id);
            }
            ui.verb = null; ui.tool = null; ui.selected = null;
            app.gesty.klik();
            nasluch?.Invoke(new ZdarzenieGry { typ = "zaznaczono", ile = zaznaczeni.Count });
            dirty = true;
        }

        void odznacz() { zaznaczeni.Clear(); kolejnoscZaznaczenia.Clear(); dirty = true; }

        /// <summary>
        /// Medalion roli zaznacza wszystkich z tej roli; drugie dotknięcie, gdy już są zaznaczeni, wiezie do nich kamerę.
        /// </summary>
        void zaznaczRole(string rola, bool dokladaj = false)
        {
            var lud = Druzyna.ludRoli(sim, rola);
            if (lud.Count == 0) { ui.say($"Nie żyje już nikt — {SLud.NAZWA_ROLI_MNOGA[rola]}.", sim.tick); app.gesty.odmowa(); return; }
            if (!dokladaj && zaznaczeni.Count == lud.Count && lud.All(c => zaznaczeni.Contains(c.id)))
            {
                double x = lud.Sum(c => c.x) / lud.Count, y = lud.Sum(c => c.y) / lud.Count;
                pokazMiejsce(x, y, Math.Max(cam.zoom, KAMERA.pokazZoom));
                return;
            }
            zaznacz(lud.Select(c => c.id).ToList(), dokladaj);
            ui.say(lud.Count == 1 ? $"{SLud.NAZWA_ROLI[rola]} — dotknij mapy, dokąd ma iść." : $"{SLud.NAZWA_ROLI_MNOGA[rola]} ({lud.Count}) — dotknij mapy, dokąd mają iść.", sim.tick);
        }

        /// <summary>„Kop drogę wiernych” dla zaznaczonych robotników.</summary>
        void kopDroge()
        {
            var robotnicy = zaznaczeniZywi().Where(c => SLud.rolaPostaci(c) == "robotnik").ToList();
            if (robotnicy.Count == 0) { ui.say("Kopią tylko robotnicy — zaznacz robotnika.", sim.tick); app.gesty.odmowa(); return; }
            var r = Polecenia.drogaGrupie(sim, robotnicy.Select(c => c.id).ToList());
            if (r.przyjeli > 0) { ui.say(r.przyjeli == 1 ? "Idzie kopać drogę wiernych." : $"Idą kopać drogę wiernych ({Js.Js.S(r.przyjeli)}).", sim.tick); app.gesty.klik(); }
            else { krzyzykPodKursorem(); app.gesty.odmowa(); }
            nasluch?.Invoke(new ZdarzenieGry { typ = "polecenie", rodzaj = "droga", przyjeli = r.przyjeli });
        }

        /// <summary>
        /// Etap 4: „napraw linę” — zaznaczony (pierwszy, który dojdzie), a gdy nikogo nie zaznaczono, najbliższy z ludu idzie
        /// skleić przeciętą linę wiadra; kamera pokazuje szyb.
        /// </summary>
        public void naprawLine(IReadOnlyList<double>? ids = null)
        {
            var lp = LinaWiadra.linaPrzecieta(sim);
            if (lp == null) return;
            var (kto, _) = Polecenia.wydajNaprawe(sim, ids ?? zaznaczeniZywi().Select(c => c.id).ToList());
            if (kto != null)
            {
                ui.say($"{SLud.NAZWA_ROLI[SLud.rolaPostaci(kto) ?? "robotnik"]} idzie skleić linę wiadra — wespnie się po niej i ją zwiąże.", sim.tick);
                app.gesty.klik();
                pokazMiejsce(lp.x + 0.5, lp.dno - 1, Math.Max(cam.zoom, KAMERA.pokazZoom));
            }
            else { krzyzykPodKursorem(); app.gesty.odmowa(); }
            nasluch?.Invoke(new ZdarzenieGry { typ = "polecenie", rodzaj = "naprawa", przyjeli = kto != null ? 1 : 0 });
        }

        /// <summary>Odmowa bez słów: czerwony krzyżyk na chwilę tam, gdzie stoi kursor (fala z `ok: false`).</summary>
        void krzyzykPodKursorem()
        {
            var p = ui.pointer;
            falaRozkazu = new FalaRozkazu { x = cam.toWorldX(p.x - plate.x), y = cam.toWorldY(p.y - plate.y), t = Wydajnosc.Teraz(), ok = false };
        }

        void odwolajRozkazy()
        {
            var ile = 0;
            foreach (var c in zaznaczeniZywi()) if (c.polecenie != null) { Polecenia.odwolajPolecenie(sim, c); ile++; }
            ui.say(ile > 0 ? "Rozkaz odwołany — wracają do swoich zajęć." : "Nie mieli rozkazu.", sim.tick);
            nasluch?.Invoke(new ZdarzenieGry { typ = "polecenie", rodzaj = "odwolaj", przyjeli = ile });
        }

        // ------------------------------------------------------------- pomieszczenia (Alpha, etap 3c)

        /// <summary>Planowanie: włącza (ostatni szablon) albo, gdy już planujesz, bierze następny szablon; `wylacz` — kończy.</summary>
        void przelaczSzablon(bool wylacz = false)
        {
            if (wylacz) { ustawSzablon(null); return; }
            if (szablon == null) { ustawSzablon(ostatniSzablon); return; }
            ustawSzablon(SZABLONY[(Array.IndexOf(SZABLONY, szablon) + 1) % SZABLONY.Length]);
        }

        /// <summary>Planowanie z tym szablonem (null — koniec). Samouczek też tu sięga.</summary>
        public void ustawSzablon(string? s)
        {
            szablon = s; ciagniecie = null;
            menuBudowy = s != null && !plate.waski && !plate.niski;
            if (s != null)
            {
                ostatniSzablon = s;
                ui.verb = null; ui.tool = null; ui.selected = null;     // ryt w ręku i karta odkładają się na czas planowania
                ui.say($"Plan: {NAZWA_POMIESZCZENIA[s]} — {(Pomieszczenia.czyPokoj(s) ? "dotknij skały, gdzie ma stanąć" : s == "lina" ? "dotknij, gdzie ma wisieć hak — przy skale, której lina się uczepi" : "przeciągnij od miejsca, gdzie stoi lud")}. B — następny, Esc — koniec.", sim.tick);
                nasluch?.Invoke(new ZdarzenieGry { typ = "planowanie", rodzaj = s });
            }
            dirty = true;
        }

        /// <summary>Kafel pod kursorem (albo null, gdy kursor jest poza płytą).</summary>
        (double x, double y)? kafelPodKursorem()
        {
            var p = ui.pointer;
            if (!naPlycie(p.x, p.y)) return null;
            var (x, y) = swiatPod(p.x, p.y);
            return sim.world.inb(x, y) ? (x, y) : ((double, double)?)null;
        }

        /// <summary>Planujesz: jak wyglądałby plan pod kursorem (korytarz i szyb — od kafla, od którego ciągniesz).</summary>
        ProbaPlanu? probaPodKursorem()
        {
            if (szablon == null || sim.ending != null) return null;
            var k = kafelPodKursorem();
            if (k == null) return null;
            if (Pomieszczenia.czyPokoj(szablon)) return Pomieszczenia.probaPlanu(sim, szablon, k.Value.x, k.Value.y);
            var s = ciagniecie;
            return s != null ? Pomieszczenia.probaPlanu(sim, szablon, s.Value.x, s.Value.y, k.Value.x, k.Value.y) : Pomieszczenia.probaPlanu(sim, szablon, k.Value.x, k.Value.y, k.Value.x + 1, k.Value.y + 1);
        }

        /// <summary>Pomieszczenie (albo plan) pod kursorem i co zrobią zaznaczeni, gdy go dotkniesz.</summary>
        PodKursorem? pomieszczeniePodKursorem()
        {
            if (szablon != null || ui.verb != null || sim.ending != null) return null;
            var k = kafelPodKursorem();
            var pom = k != null ? Pomieszczenia.pomieszczenieW(sim, k.Value.x, k.Value.y) : null;
            if (pom == null) return null;
            var lud = zaznaczeniZywi();
            if (lud.Count == 0) return new PodKursorem { pom = pom, akcja = pom.gotowe ? $"{NAZWA_POMIESZCZENIA[pom.rodzaj]} — zaznacz kogoś i wskaż" : "plan — zaznacz robotników i wskaż go", ok = true };
            var rob = lud.Count(c => SLud.rolaPostaci(c) == "robotnik");
            var ryc = lud.Count(c => SLud.rolaPostaci(c) == "rycerz");
            var (akcja, ok) = Pokoje.akcjaNaPomieszczeniu(pom, rob, lud.Count - rob, ryc, Zbroja.naWieszaku(sim).Count);
            return new PodKursorem { pom = pom, akcja = akcja, ok = ok };
        }

        /// <summary>Etap 3d: podpis nad ołtarzem pod kursorem — co się stanie po dotknięciu (albo null).</summary>
        string? oltarzPodKursorem()
        {
            if (szablon != null || ui.verb != null || sim.ending != null || oknoOltarza) return null;
            var p = ui.pointer;
            if (!naPlycie(p.x, p.y) || !RysOltarz.oltarzPod(sim, cam, p.x - plate.x, p.y - plate.y)) return null;
            return zaznaczeniZywi().Count > 0 ? "ołtarz — zaznaczeni pójdą do niego" : "ołtarz — dotknij: rytuały";
        }

        /// <summary>Etap 3d: wybór w oknie ołtarza — rytuał, przywołanie pobożnego albo zamknięcie.</summary>
        void wybierzWOknieOltarza(PoleOltarza b)
        {
            if (b.akcja == "zamknij") { oknoOltarza = false; return; }
            if (b.akcja == "tlo") return;
            if (b.akcja == "przywolaj")
            {
                var pw = Polecenia.przywolajDoOltarza(sim);
                if (pw != null) { ui.say($"Nikt nie przyjdzie: {pw}.", sim.tick); app.gesty.odmowa(); }
                else { ui.say("Pobożny idzie do ołtarza.", sim.tick); app.gesty.klik(); }
                return;
            }
            if (b.rodzaj == null) return;
            var powod = Polecenia.odprawRytual(sim, b.rodzaj, b.cel);
            if (powod != null) { ui.say($"{NAZWA_RYTUALU[b.rodzaj]} — teraz nie: {powod}.", sim.tick); app.gesty.odmowa(); return; }
            ui.say($"{NAZWA_RYTUALU[b.rodzaj]} — pobożny klęka przy ołtarzu.", sim.tick);
            app.gesty.klik();
            oknoOltarza = false;
            nasluch?.Invoke(new ZdarzenieGry { typ = "oltarz", rodzaj = b.rodzaj });
        }

        /// <summary>Podpis pod liną pod kursorem: ile kosztuje (albo ile darmowych zostało) i — przed przeciągnięciem — co zrobić.</summary>
        string cenaLinyPodpis(bool przedCiagnieciem)
        {
            var cena = Pomieszczenia.cenaLiny(sim);
            var ile = cena != 0 ? $"{Js.Js.S(cena)} krwi" : $"za darmo (zostało {Js.Js.S(Pomieszczenia.darmoweLiny(sim))})";
            return $"lina — {ile}{(przedCiagnieciem ? " — dotknij, gdzie ma wisieć hak" : "")}";
        }

        /// <summary>Kładzie plan z próby (albo mówi, czemu tu nie wolno).</summary>
        void polozPlanZProby(ProbaPlanu? p)
        {
            ciagniecie = null;
            if (p == null) return;
            if (!p.ok) { ui.say($"Tu nie: {p.powod}.", sim.tick); app.gesty.odmowa(); return; }
            // lina: wisi od razu — nikt jej nie buduje (pierwsze kilka za darmo, potem za krew)
            if (p.rodzaj == "lina")
            {
                var cena = Pomieszczenia.cenaLiny(sim);
                var powod = Pomieszczenia.powiesLine(sim, p);
                if (powod != null) { ui.say($"Tu nie: {powod}.", sim.tick); app.gesty.odmowa(); return; }
                falaRozkazu = new FalaRozkazu { x = p.x + 0.5, y = p.y + p.h, t = Wydajnosc.Teraz(), ok = true };
                ui.say(cena != 0 ? $"Lina wisi — kosztowała {Js.Js.S(cena)} krwi." : $"Lina wisi — za darmo (zostało {Js.Js.S(Pomieszczenia.darmoweLiny(sim))}).", sim.tick);
                app.gesty.klik();
                nasluch?.Invoke(new ZdarzenieGry { typ = "plan", rodzaj = p.rodzaj });
                dirty = true;
                return;
            }
            Pomieszczenia.polozPlan(sim, p);
            falaRozkazu = new FalaRozkazu { x = p.x + p.w / 2, y = p.y + p.h, t = Wydajnosc.Teraz(), ok = true };
            ui.say($"Wyznaczyłeś {BIERNIK_POMIESZCZENIA[p.rodzaj]}. Zaznacz robotników i dotknij planu — wykują go.", sim.tick);
            app.gesty.klik();
            nasluch?.Invoke(new ZdarzenieGry { typ = "plan", rodzaj = p.rodzaj });
            dirty = true;
        }

        sealed class WynikRamki { public string tryb = "nic"; public List<Creature> lud = null!; public List<double> kop = null!, lite = null!; public (double x0, double y0, double x1, double y1) k; public List<Creature> rob = null!; }

        /// <summary>
        /// Co zrobi ramka (to samo przy ciągnięciu — podgląd — i po puszczeniu): ramka trzyma się kafli (6.11). Postacie ludu
        /// w środku wygrywają — chyba że to dokładnie ci zaznaczeni robotnicy, a w ramce jest skała do wykucia: wtedy kują.
        /// </summary>
        WynikRamki wynikRamki(Ramka r)
        {
            var wd = sim.world;
            var k = Druzyna.kafleRamki(r.x0, r.y0, r.x1, r.y1, wd.w, wd.h);
            // sylwetka stoi na c.y + 1 i sięga ok. półtora kafla w górę — liczy się, gdy ramka zahacza o tułów
            var lud = sim.creatures.Where(c => !c.dead && SLud.rolaPostaci(c) != null && c.x >= k.x0 - 0.15 && c.x <= k.x1 + 1.15 && c.y + 1 > k.y0 && c.y - 0.5 < k.y1 + 1).ToList();
            var zazn = zaznaczeniZywi();
            var rob = zazn.Where(c => SLud.rolaPostaci(c) == "robotnik").ToList();
            List<double> kop = new List<double>(), lite = new List<double>();
            if (rob.Count > 0)
            {
                for (var y = k.y0; y <= k.y1; y++) for (var x = k.x0; x <= k.x1; x++)
                    {
                        if (!wd.solid(x, y)) continue;
                        var i = wd.idx(x, y);
                        lite.Add(i);
                        if (Polecenia.doWykuciaRamka(sim, i)) kop.Add(i);
                    }
            }
            var tylkoCiSami = lud.Count == zazn.Count && lud.All(c => zaznaczeni.Contains(c.id));
            var tryb = kop.Count > 0 && (lud.Count == 0 || tylkoCiSami) ? "kop" : lud.Count > 0 ? "lud" : "nic";
            return new WynikRamki { tryb = tryb, lud = lud, kop = kop, lite = lite, k = k, rob = rob };
        }

        /// <summary>Podgląd ramki przy ciągnięciu — liczony na nowo, gdy ramka przeskoczy na inny kafel albo co kilka tików.</summary>
        PodgladRamki? podgladRamki()
        {
            if (ramka == null) return null;
            var wd = sim.world;
            var k = Druzyna.kafleRamki(ramka.x0, ramka.y0, ramka.x1, ramka.y1, wd.w, wd.h);
            var klucz = $"{Js.Js.S(k.x0)},{Js.Js.S(k.y0)},{Js.Js.S(k.x1)},{Js.Js.S(k.y1)},{Js.Js.ToInt32(sim.tick) >> 3},{zaznaczeni.Count}";
            if (podgladRamkiPamiec?.klucz != klucz)
            {
                var r = wynikRamki(ramka);
                podgladRamkiPamiec = (klucz, new PodgladRamki { tryb = r.tryb, kop = r.kop, lud = r.lud.Count });
            }
            return podgladRamkiPamiec!.Value.podglad;
        }

        /// <summary>
        /// Puszczona ramka: postacie ludu w środku — zaznacza je (z Shiftem dokłada); bez postaci, gdy zaznaczeni są
        /// robotnicy — lita skała w środku oznaczona do wykucia. Bez limitu wielkości (6.11).
        /// </summary>
        void zaznaczRamka(Ramka r, bool dokladaj)
        {
            var wr = wynikRamki(r);
            podgladRamkiPamiec = null;
            if (wr.tryb == "lud")
            {
                zaznacz(wr.lud.Select(c => c.id).ToList(), dokladaj);
                ui.say(wr.lud.Count == 1 ? "Zaznaczony. Dotknij mapy, dokąd ma iść." : $"Zaznaczeni: {wr.lud.Count}. Dotknij mapy, dokąd mają iść.", sim.tick);
                app.gesty.klik();
                return;
            }
            if (wr.rob.Count == 0) { ui.say("Zaznacz robotników — wtedy ramka oznaczy skałę do wykucia.", sim.tick); return; }
            var o = Polecenia.wydajObszar(sim, wr.rob.Select(c => c.id).ToList(), wr.lite);
            falaRozkazu = new FalaRozkazu { x = (wr.k.x0 + wr.k.x1 + 1) / 2, y = (wr.k.y0 + wr.k.y1 + 1) / 2, t = Wydajnosc.Teraz(), ok = o.przyjeli > 0 };
            if (o.przyjeli == 0) { krzyzykPodKursorem(); app.gesty.odmowa(); }
            else
            {
                ui.say($"Kują oznaczoną skałę ({Js.Js.S(o.kafli)} kafli)" + (o.odmowy.Count > 0 ? $". Odmawia: {o.odmowy.Count}." : "."), sim.tick);
                app.gesty.klik();
            }
            nasluch?.Invoke(new ZdarzenieGry { typ = "polecenie", rodzaj = "obszar", przyjeli = o.przyjeli });
            dirty = true;
        }

        /// <summary>
        /// Dotknięcie mapy bez rytu w ręku: postać z ludu pod palcem — zaznacza ją; inne miejsce, gdy ktoś jest zaznaczony —
        /// rozkaz „idź tam” (robotnikowi wskazana skała to „kop tam”).
        /// </summary>
        void klikNaMapie(double sx, double sy, bool dokladaj)
        {
            double fx = cam.toWorldX(sx - plate.x), fy = cam.toWorldY(sy - plate.y);
            // postać pod palcem: sylwetka stoi na c.y + 1 i sięga ok. półtora kafla w górę
            var tol = Math.Max(0.9, 16 / cam.zoom);
            Creature? kto = null; var bd = double.PositiveInfinity;
            foreach (var c in sim.creatures)
            {
                if (c.dead || SLud.rolaPostaci(c) == null) continue;
                double dx = Math.Abs(c.x - fx), dy = fy - (c.y + 0.25);
                if (dx > tol || dy < -1.2 - tol * 0.3 || dy > 0.75 + tol * 0.3) continue;
                var d = Math.Sqrt(dx * dx + dy * dy);
                if (d < bd) { bd = d; kto = c; }
            }
            if (kto != null)
            {
                zaznacz(new List<double> { kto.id }, dokladaj);
                ui.say($"{SLud.NAZWA_ROLI[SLud.rolaPostaci(kto)!]}: {kto.zamiar ?? "czeka"}. Dotknij mapy, dokąd ma iść.", sim.tick);
                return;
            }
            var ids = zaznaczeniZywi().Select(c => c.id).ToList();
            // etap 3d: ołtarz pod palcem — otwiera okno rytuałów; zaznaczeni idą do niego i tam zostają
            if (RysOltarz.oltarzPod(sim, cam, sx - plate.x, sy - plate.y))
            {
                if (ids.Count > 0)
                {
                    var r = Polecenia.wydajDoOltarza(sim, ids);
                    var o = sim.world.oltarz;
                    falaRozkazu = new FalaRozkazu { x = o.x + 0.5, y = o.y, t = Wydajnosc.Teraz(), ok = r.przyjeli > 0 };
                    if (r.przyjeli == 0) { krzyzykPodKursorem(); app.gesty.odmowa(); }
                    else { ui.say(r.przyjeli == 1 ? "Idzie do ołtarza." : $"Idą do ołtarza: {Js.Js.S(r.przyjeli)}.", sim.tick); app.gesty.klik(); }
                    nasluch?.Invoke(new ZdarzenieGry { typ = "polecenie", rodzaj = "oltarz", przyjeli = r.przyjeli });
                }
                oknoOltarza = true;
                nasluch?.Invoke(new ZdarzenieGry { typ = "oltarz", rodzaj = "okno" });
                dirty = true;
                return;
            }
            // etap 3c: plan albo pomieszczenie pod palcem — robotnicy kują plan, pracują w warsztacie i kuźni, każdy śpi w sypialni
            var pom = Pomieszczenia.pomieszczenieW(sim, Math.Floor(fx), Math.Floor(fy));
            if (pom != null && ids.Count == 0) { ui.say(pom.gotowe ? $"{NAZWA_POMIESZCZENIA[pom.rodzaj]} — zaznacz kogoś i wskaż." : "Plan — zaznacz robotników i wskaż go, a wykują.", sim.tick); return; }
            if (ids.Count == 0) return;
            var wr = pom != null ? Polecenia.wydajNaPomieszczenie(sim, ids, pom) : Polecenia.wydajGrupie(sim, ids, Math.Floor(fx), Math.Floor(fy));
            falaRozkazu = new FalaRozkazu { x = fx, y = fy, t = Wydajnosc.Teraz(), ok = wr.przyjeli > 0 };
            if (wr.przyjeli == 0) app.gesty.odmowa();
            else
            {
                ui.say((wr.przyjeli == 1 ? "Idzie." : $"Idą: {Js.Js.S(wr.przyjeli)}.") + (wr.odmowy.Count > 0 ? $" Odmawia: {wr.odmowy.Count}." : ""), sim.tick);
                app.gesty.klik();
            }
            nasluch?.Invoke(new ZdarzenieGry { typ = "polecenie", rodzaj = pom != null ? "pomieszczenie" : "idz", przyjeli = wr.przyjeli });
            dirty = true;
        }

        bool naPlycie(double x, double y) => x >= plate.x && y >= plate.y && x <= plate.x + plate.w && y <= plate.y + plate.h;

        (double x, double y) swiatPod(double x, double y) => (Math.Floor(cam.toWorldX(x - plate.x)), Math.Floor(cam.toWorldY(y - plate.y)));

        void uzyj(double x, double y)
        {
            if (ui.verb == null || ui.tool == null) return;
            if (dozwolone != null && !dozwolone.Contains(ui.verb)) { ui.say("Nie teraz.", sim.tick); return; }
            var (wx, wy) = swiatPod(x, y);
            if (painting)
            {
                // jedno pociągnięcie płaci za każdy kafel raz; bez tego ruch myszy opróżniał krew
                if (!sim.world.inb(wx, wy)) return;
                var klucz = sim.world.idx(wx, wy);
                if (malowane.Contains(klucz)) return;
                malowane.Add(klucz);
            }
            // w pauzie nic nie dzieje się od razu: skała, ziarno i Znak idą do planu jako szkic
            if (pauza && (ui.verb == "zasiej" || ui.verb == "znak"))
            {
                var powod = rozkazy.zaplanuj(sim, new Rozkaz { czasownik = ui.verb, narzedzie = ui.tool, x = wx, y = wy });
                if (powod == null) nasluch?.Invoke(new ZdarzenieGry { typ = "rozkaz", czasownik = ui.verb, narzedzie = ui.tool });
                else if (powod != "" && !painting) { ui.say(powod, sim.tick); app.gesty.odmowa(); }
                dirty = true;
                return;
            }
            double przedKrew = sim.krew, przedWiara = sim.wiara, przedOtchlan = sim.otchlan;
            var udane = false;
            if (ui.verb == "zasiej")
            {
                // Remake v2: Nakarm — jedno wiadro na dotknięcie; powód odmowy mówi, co nie tak
                var odmowa = Moce.nakarm(sim, wx, wy);
                udane = odmowa == null;
                if (odmowa != null) { ui.say(odmowa, sim.tick); app.gesty.odmowa(); dirty = true; return; }
            }
            else if (ui.verb == "znak") { udane = Moce.sign(sim, ui.tool, wx, wy); if (udane) app.dzwiek.toll(); }
            else
            {
                double fx = cam.toWorldX(x - plate.x), fy = cam.toWorldY(y - plate.y);
                // kolejne kliknięcie w to samo miejsce bierze następnego z tłumu
                var pobliscy = sim.creatures.Where(o => !o.dead && Math.Sqrt(Math.Pow(o.x - fx, 2) + Math.Pow(o.y - fy, 2)) < 3.5)
                    .OrderBy(o => Math.Sqrt(Math.Pow(o.x - fx, 2) + Math.Pow(o.y - fy, 2))).ToList();
                if (pobliscy.Count > 0)
                {
                    var blisko = ostatnieKlikniecie is { } ok && Math.Sqrt(Math.Pow(ok.x - fx, 2) + Math.Pow(ok.y - fy, 2)) < 2.5;
                    indeksWTlumie = blisko ? (indeksWTlumie + 1) % pobliscy.Count : 0;
                    ostatnieKlikniecie = (fx, fy);
                    udane = ui.touchCreature(sim, pobliscy[indeksWTlumie]);
                }
                else
                {
                    ui.say("Nikogo tam nie ma.", sim.tick);
                    app.gesty.odmowa();
                }
            }
            if (!udane && (ui.verb == "zasiej" || ui.verb == "znak"))
            {
                var hc = ui.hintCost(sim);
                ui.say(hc != "" ? hc : "Nie da się tego zrobić w tym miejscu.", sim.tick);
                app.gesty.odmowa();
            }
            if (udane && painting)
            {
                kosztPociagniecia.krew += Math.Max(0, przedKrew - sim.krew);
                kosztPociagniecia.wiara += Math.Max(0, przedWiara - sim.wiara);
                kosztPociagniecia.otchlan += Math.Max(0, przedOtchlan - sim.otchlan);
            }
            if (udane) nasluch?.Invoke(new ZdarzenieGry { typ = "moc", czasownik = ui.verb, narzedzie = ui.tool });
            dirty = true;
        }

        // -------------------------------------------------------------------- mysz

        public override void dotyk(Wskaznik e, Faza faza)
        {
            ui.pointer = (e.clientX, e.clientY);
            // okienko dewelopera (w C# rysowane na płótnie) bierze dotknięcia nad sobą
            if (panelDev != null && ustawienia.trybDeweloperski && nasluch == null && panelDev.dotyk(e, faza)) return;
            // tryb deweloperski: kafel pod kursorem, a Shift+klik wybiera postać do inspektora
            if (panelDev != null && ustawienia.trybDeweloperski && nasluch == null)
            {
                if (naPlycie(e.clientX, e.clientY))
                {
                    var (wx, wy) = swiatPod(e.clientX, e.clientY);
                    Dziennik.DEV.kursor = new XY { x = wx, y = wy };
                    if (faza == Faza.dol && e.shiftKey)
                    {
                        double fx = cam.toWorldX(e.clientX - plate.x), fy = cam.toWorldY(e.clientY - plate.y);
                        double best = -1, bd = 3;
                        foreach (var c in sim.creatures)
                        {
                            if (c.dead) continue;
                            var d = Math.Sqrt(Math.Pow(c.x - fx, 2) + Math.Pow(c.y - 0.5 - fy, 2));
                            if (d < bd) { bd = d; best = c.id; }
                        }
                        Dziennik.DEV.sledzony = best;
                        return;
                    }
                }
                else Dziennik.DEV.kursor = null;
            }
            ui.plan = pauza ? rozkazy : null;

            if (atlas.otwarte)
            {
                if (faza == Faza.dol) atlas.dotyk(e.clientX, e.clientY);
                else atlas.ruch(e.clientX, e.clientY);
                // palec, który położono jeszcze przed otwarciem atlasu, podnosi się już nad atlasem
                if (faza == Faza.gora) { pointers.Remove(e.pointerId); pinch = 0; srodekPinch = null; painting = false; }
                dirty = true;
                return;
            }
            // przytrzymanie palca na rycie otwiera jego tablicę (patrz krok()) — ruch albo puszczenie je przerywa
            if (faza == Faza.dol && e.button != 2)
            {
                var v = rytPod(e.clientX, e.clientY);
                przytrzymanie = v != null ? new Przytrzymanie { id = e.pointerId, v = v, sx = e.clientX, sy = e.clientY, od = Wydajnosc.Teraz(), verb = ui.verb, tool = ui.tool } : null;
            }
            else if (przytrzymanie != null && przytrzymanie.id == e.pointerId
                && (faza == Faza.gora || Math.Sqrt(Math.Pow(e.clientX - przytrzymanie.sx, 2) + Math.Pow(e.clientY - przytrzymanie.sy, 2)) > STEROWANIE.progPrzewijania))
            {
                przytrzymanie = null;
            }
            // prawy przycisk na rycie otwiera jego tablicę
            if (faza == Faza.dol && e.button == 2)
            {
                var v = rytPod(e.clientX, e.clientY);
                if (v != null) { otworzTabliceRytu(v); return; }
            }

            if (faza == Faza.dol && !zapiski && polaWydarzenia.Count > 0)
            {
                // karta wydarzenia: dotknięcie wyboru go wykonuje; dotknięcie reszty karty nic nie robi,
                // a poza kartą można przesuwać płytę i patrzeć, o czym mowa
                var b = polaWydarzenia.FirstOrDefault(q => e.clientX >= q.x && e.clientX <= q.x + q.w && e.clientY >= q.y && e.clientY <= q.y + q.h);
                if (b != null)
                {
                    // „pokaż miejsce”: kamera jedzie tam na prośbę — miejsce ląduje pod kartą
                    if (b.pokaz)
                    {
                        if (celKarty != null) pokazPodKarta((celKarty.x, celKarty.y), 0.25);
                        else if (sim.wydarzenia.biezace?.cel is { } cc) pokazPodKarta((cc.x, cc.y), 0.25);
                    }
                    else wybierzWydarzenie(b.i);
                    return;
                }
                if (dotknijStrzalki(e.clientX, e.clientY)) return;
                var wybory = polaWydarzenia.Where(q => !q.pokaz).ToList();
                var g = wybory[0]; var d = wybory[wybory.Count - 1];
                if (e.clientX >= g.x - 20 && e.clientX <= g.x + g.w + 20 && e.clientY >= plate.y && e.clientY <= d.y + d.h + 30) return;
            }
            if (faza == Faza.dol && !zapiski && polaOltarza.Count > 0)
            {
                // okno ołtarza: dotknięcie rytuału go odprawia (okno się zamyka — widać animację); poza oknem — zamyka je
                var b = Enumerable.Reverse(polaOltarza).FirstOrDefault(q => e.clientX >= q.x && e.clientX <= q.x + q.w && e.clientY >= q.y && e.clientY <= q.y + q.h);
                if (b != null) wybierzWOknieOltarza(b);
                else oknoOltarza = false;
                dirty = true;
                return;
            }
            if (faza == Faza.dol && !zapiski)
            {
                // karta sytuacji: planuj (zostaje pauza), puść czas, nie zatrzymuj przy tym
                foreach (var b in polaAlarmu)
                {
                    if (Math.Abs(e.clientX - b.x) > b.w / 2 || Math.Abs(e.clientY - b.y) > Math.Max(b.h / 2, POLE_PALCA / 2)) continue;
                    if (b.akcja == "pusc") ustawPauze(false);
                    else if (b.akcja == "pokaz") { if (alarm?.cel is { } c) pokazPodKarta((c.x, c.y), 0.2); }
                    else if (b.akcja == "tablica" && alarm?.tablica != null)
                    {
                        Odkrycia.odkrycia.odkryj(alarm.tablica, false);
                        atlas.otworzTablice(alarm.tablica);
                    }
                    else
                    {
                        if (b.akcja == "wycisz" && alarm != null)
                        {
                            straznik.wyciszone.Add(alarm.rodzaj);
                            ui.say("Przy tym już nie zatrzymam czasu.", sim.tick);
                        }
                        alarm = null;
                    }
                    dirty = true;
                    return;
                }
                // strzałka przy krawędzi (cel poza kadrem): dotknięcie wiezie tam kamerę
                if (e.button != 2 && dotknijStrzalki(e.clientX, e.clientY)) return;
                // baner pauzy: cofnij, skreśl wszystko, puść czas
                foreach (var b in polaBanera)
                {
                    if (Math.Abs(e.clientX - b.x) > b.w / 2 + 4 || Math.Abs(e.clientY - b.y) > Math.Max(b.h / 2, POLE_PALCA / 2)) continue;
                    if (b.akcja == "cofnij") { if (rozkazy.cofnij(sim)) ui.say("Skreślone.", sim.tick); }
                    else if (b.akcja == "skresl") { rozkazy.skreslWszystkie(sim); ui.say("Plan pusty.", sim.tick); }
                    else ustawPauze(false);
                    dirty = true;
                    return;
                }
                // (podpowiedź z miejscem i klepsydra jako przycisk — tylko na telefonie)
            }

            if (faza == Faza.dol && zapiski)
            {
                foreach (var t in trafieniaZapiskow)
                {
                    if (e.clientX < t.x || e.clientX > t.x + t.w || e.clientY < t.y || e.clientY > t.y + t.h) continue;
                    zapiski = false;
                    pokazMiejsce(t.wpis.x!.Value + 0.5, t.wpis.y!.Value + 0.5, Math.Max(cam.zoom, KAMERA.pokazZoom));
                    return;
                }
                zapiski = false;
                return;
            }

            // Alpha 1: okno postaci, „Budowa” i księga mają pierwszeństwo przed mapą
            if (faza == Faza.dol && dotykDolu(e)) return;
            if (faza == Faza.dol)
            {
                var b = Przyciski.przyciskPod(przyciski, e.clientX, e.clientY);
                if (b != null) { przyciskWcisniety(b); return; }
                // (pasek drużyny pod płytą — telefon)
            }

            if (faza == Faza.dol)
            {
                // tylko gdy pasek naprawdę jest na ekranie — ukryty przerzucał kamerę po kliknięciu w pustkę
                var mm = ustawienia.skalaGlebokosci && !plate.waski && !plate.niski ? Minimapa.miejsceZMinimapy(sim, plate, e.clientX, e.clientY) : null;
                if (mm != null)
                {
                    przejmijKamere();
                    cam.x = camTarget.x = mm.Value.x;
                    cam.y = camTarget.y = mm.Value.y;
                    cam.clamp(sim.world.w, sim.world.h);
                    dirty = true;
                    return;
                }
                pointers[e.pointerId] = new Palec { x = e.clientX, y = e.clientY, sx = e.clientX, sy = e.clientY, moved = false, interfejs = false, przycisk = e.button, mysz = e.pointerType == "mouse" };
                if (pointers.Count > 1) { painting = false; ciagniecie = null; return; }
                if (sim.ending != null) return;
                // etap 3c: planujesz — palec na mapie kładzie plan zamiast przesuwać kamerę
                if (szablon != null && e.button != 2 && naPlycie(e.clientX, e.clientY))
                {
                    pointers[e.pointerId].plan = true;
                    if (!Pomieszczenia.czyPokoj(szablon)) ciagniecie = swiatPod(e.clientX, e.clientY);
                    return;
                }
                var przedWyborem = ui.verb;
                var wybranaMysl = ui.selected;
                if (legenda) { legenda = false; return; }
                pointers.TryGetValue(e.pointerId, out var wpis);
                if (ui.tap(sim, e.clientX, e.clientY))
                {
                    if (wpis != null) wpis.interfejs = true;               // karta i ryty nie są światem
                    if (ui.verb != przedWyborem) nasluch?.Invoke(new ZdarzenieGry { typ = "wybranoCzasownik", czasownik = ui.verb });
                    // ryt w ręku zamiast rozkazów — zaznaczenie się odkłada
                    if (ui.verb != null && ui.verb != przedWyborem) { zaznaczeni.Clear(); kolejnoscZaznaczenia.Clear(); }
                    // tylko naprawdę szepnięta myśl — zamknięcie karty kliknięciem w ryt to nie szept
                    if (wybranaMysl != null && ui.ostatniaMysl != null) nasluch?.Invoke(new ZdarzenieGry { typ = "szept", narzedzie = ui.ostatniaMysl });
                    ui.ostatniaMysl = null;
                    return;
                }
                if (ui.selected != null) { ui.selected = null; if (wpis != null) wpis.interfejs = true; return; }
                if (!naPlycie(e.clientX, e.clientY)) return;
                if (ui.verb == "zasiej" && e.button != 2)
                {
                    painting = false;      // Remake v2: Nakarm to jedno wiadro, nie malowanie
                    malowane.Clear();
                    kosztPociagniecia = new Rezerwa();
                    uzyj(e.clientX, e.clientY);
                }
                return;
            }

            if (faza == Faza.ruch)
            {
                if (!pointers.TryGetValue(e.pointerId, out var p)) return;
                double dx = e.clientX - p.x, dy = e.clientY - p.y;
                p.x = e.clientX; p.y = e.clientY;
                if (Math.Sqrt(Math.Pow(e.clientX - p.sx, 2) + Math.Pow(e.clientY - p.sy, 2)) > 6) p.moved = true;
                if (pointers.Count == 2)
                {
                    var ab = pointers.Values.ToList(); var a = ab[0]; var b = ab[1];
                    var d = Math.Sqrt(Math.Pow(a.x - b.x, 2) + Math.Pow(a.y - b.y, 2));
                    double sx = (a.x + b.x) / 2, sy = (a.y + b.y) / 2;
                    if (pinch > 0)
                    {
                        cam.zoom *= d / pinch;
                        przejmijKamere();
                        if (srodekPinch != null)
                        {                      // dwa palce przesuwają też obraz
                            cam.x -= (sx - srodekPinch.Value.x) / cam.zoom;
                            cam.y -= (sy - srodekPinch.Value.y) / cam.zoom;
                        }
                        cam.clamp(sim.world.w, sim.world.h);
                        nasluch?.Invoke(new ZdarzenieGry { typ = "kamera", rodzaj = "zoom" });
                        dirty = true;
                    }
                    pinch = d;
                    srodekPinch = (sx, sy);
                    return;
                }
                if (painting && p.przycisk != 2) { uzyj(e.clientX, e.clientY); return; }
                // planujesz: ciągnięcie wyznacza korytarz albo szyb — kamera stoi
                if (p.plan) { dirty = true; return; }
                // mysz: lewy przycisk ciągnięty po mapie rysuje ramkę; widok przesuwa prawy albo środkowy przycisk
                if (p.mysz && p.przycisk == 0 && ui.verb == null && !p.interfejs && sim.ending == null)
                {
                    if (p.moved && naPlycie(p.sx, p.sy))
                    {
                        double ax = cam.toWorldX(p.sx - plate.x), ay = cam.toWorldY(p.sy - plate.y);
                        double bx = cam.toWorldX(e.clientX - plate.x), by = cam.toWorldY(e.clientY - plate.y);
                        ramka = new Ramka { x0 = ax, y0 = ay, x1 = bx, y1 = by, od = ramka?.od ?? Wydajnosc.Teraz() };
                        dirty = true;
                    }
                    return;
                }
                cam.x -= dx / cam.zoom; cam.y -= dy / cam.zoom;
                przejmijKamere();                           // przeciągnięcie to przejęcie kamery, nie sugestia
                cam.clamp(sim.world.w, sim.world.h);
                nasluch?.Invoke(new ZdarzenieGry { typ = "kamera", rodzaj = "przesun" });
                dirty = true;
                return;
            }

            pointers.TryGetValue(e.pointerId, out var pp);
            pointers.Remove(e.pointerId);
            if (pointers.Count < 2) { pinch = 0; srodekPinch = null; }
            if (pp == null) return;
            if (painting) { painting = false; malowane.Clear(); return; }
            if (ramka != null) { var r = ramka; ramka = null; if (pp.moved) { zaznaczRamka(r, e.shiftKey); return; } }
            if (pp.interfejs) return;
            // etap 3c: planujesz — puszczenie kładzie plan (pokój pod palcem, korytarz i szyb od miejsca, gdzie zacząłeś)
            if (pp.plan) { polozPlanZProby(probaPodKursorem()); return; }
            if (szablon != null && pp.przycisk == 2 && !pp.moved && naPlycie(pp.sx, pp.sy))
            {
                // prawy przycisk na planie skreśla go; gdzie indziej — kończy planowanie
                var (wx, wy) = swiatPod(pp.sx, pp.sy);
                var pom = Pomieszczenia.pomieszczenieW(sim, wx, wy);
                if (pom != null && !pom.gotowe) { Pomieszczenia.skreslPlan(sim, pom); ui.say("Plan skreślony.", sim.tick); dirty = true; }
                else ustawSzablon(null);
                return;
            }
            // w pauzie dotknięcie szkicu bez rytu w ręku (albo prawy przycisk) go skreśla
            if (!pp.moved && pauza && rozkazy.ile > 0 && naPlycie(pp.sx, pp.sy) && (ui.verb == null || pp.przycisk == 2))
            {
                double wx = cam.toWorldX(pp.sx - plate.x), wy = cam.toWorldY(pp.sy - plate.y);
                var o = rozkazy.pod(sim, wx, wy);
                if (o != null) { rozkazy.skresl(sim, o); ui.say("Skreślone. Koszt wrócił.", sim.tick); dirty = true; return; }
            }
            if (!pp.moved && pp.przycisk != 2 && sim.ending == null && ui.verb != null && ui.verb != "zasiej" && naPlycie(pp.sx, pp.sy)) uzyj(pp.sx, pp.sy);
            // Alpha: bez rytu w ręku dotknięcie mapy zaznacza postać albo wydaje zaznaczonym rozkaz; prawy przycisk odznacza
            else if (!pp.moved && sim.ending == null && ui.verb == null && naPlycie(pp.sx, pp.sy))
            {
                if (pp.przycisk != 2) klikNaMapie(pp.sx, pp.sy, e.shiftKey);
                else if (zaznaczeni.Count > 0) { odznacz(); ui.say("Odznaczone.", sim.tick); }
            }
        }

        /// <summary>Który ryt leży pod palcem (albo null).</summary>
        string? rytPod(double x, double y)
        {
            foreach (var v in new[] { "zasiej", "szept", "znak" })
            {
                var m = ui.miejsce("verb", v);
                if (m is { } mm && Math.Abs(x - mm.x) <= mm.hw && Math.Abs(y - mm.y) <= mm.hh) return v;
            }
            return null;
        }

        void otworzTabliceRytu(string v)
        {
            Odkrycia.odkrycia.odkryj($"ryt-{v}", false);
            atlas.otworzTablice($"ryt-{v}");
        }

        /// <summary>Ten sam skutek, co klawisz — tylko że da się w to kliknąć.</summary>
        void przyciskWcisniety(Przycisk b)
        {
            switch (b.akcja)
            {
                case "pauza": klawisz(Akcja.pauza, null); break;
                case "wolniej": klawisz(Akcja.wolniej, null); break;
                case "szybciej": klawisz(Akcja.szybciej, null); break;
                case "kamera": doMieszkancow(); break;
                case "zapiski": zapiski = !zapiski; przewinZapiskow = 0; break;
                case "atlas": atlas.otworzAtlas(); break;
                case "legenda": legenda = !legenda; break;
                case "zapis": klawisz(Akcja.zapis, null); break;
            }
            dirty = true;
        }

        public override void kolko(Kolko e)
        {
            if (panelDev != null && ustawienia.trybDeweloperski && nasluch == null && panelDev.kolko(e)) return;
            if (atlas.otwarte) { atlas.kolko(e.deltaY > 0 ? 70 : -70); return; }
            if (zapiski)
            {
                przewinZapiskow = Math.Max(0, Math.Min(maxPrzewin, przewinZapiskow + (e.deltaY > 0 ? 3 : -3)));
                return;
            }
            double bx = cam.toWorldX(e.clientX - plate.x), by = cam.toWorldY(e.clientY - plate.y);
            przejmijKamere();
            cam.zoom *= e.deltaY < 0 ? KAMERA.krokKolka : 1 / KAMERA.krokKolka;        // większy krok — mniej kręcenia
            cam.clamp(sim.world.w, sim.world.h);
            cam.x += bx - cam.toWorldX(e.clientX - plate.x);
            cam.y += by - cam.toWorldY(e.clientY - plate.y);
            cam.clamp(sim.world.w, sim.world.h);
            nasluch?.Invoke(new ZdarzenieGry { typ = "kamera", rodzaj = "zoom" });
            dirty = true;
        }

        public override void klawiszPuszczony(string k) { if (k == "Tab") liczby = false; }

        public override void klawisz(Akcja? akcja, Klawisz? e)
        {
            if (e?.key == "Tab") { liczby = true; return; }
            if (atlas.otwarte && e != null) { atlas.klawisz(e.key); return; }
            // Enter przy karcie sytuacji: „planuj” — karta znika, czas dalej stoi
            if (alarm != null && e?.key == "Enter") { alarm = null; return; }
            switch (akcja)
            {
                case Akcja.menu:
                    // Esc: najpierw zamyka to, co otwarte — dopiero potem menu
                    if (zapiski) { zapiski = false; break; }
                    if (oknoOltarza) { oknoOltarza = false; break; }
                    if (ui.selected != null) { ui.selected = null; break; }
                    if (alarm != null) { alarm = null; break; }
                    if (ui.verb != null) { ui.verb = null; ui.tool = null; break; }
                    if (szablon != null || menuBudowy) { ustawSzablon(null); break; }
                    if (zaznaczeni.Count > 0) { odznacz(); break; }
                    app.idz("menu");
                    break;
                case Akcja.robotnicy: zaznaczRole("robotnik"); break;
                case Akcja.pobozni: zaznaczRole("pobozny"); break;
                case Akcja.rycerz: zaznaczRole("rycerz"); break;
                case Akcja.kopDroge: kopDroge(); break;
                case Akcja.odwolaj: odwolajRozkazy(); break;
                case Akcja.planuj: if (sim.ending == null) przelaczSzablon(); break;
                case Akcja.pauza: ustawPauze(!pauza); break;
                // tempo czasu tylko w trybie deweloperskim — w grze czas jest jeden
                case Akcja.szybciej: if (ustawienia.trybDeweloperski) zmienTempo(1); break;
                case Akcja.wolniej: if (ustawienia.trybDeweloperski) zmienTempo(-1); break;
                case Akcja.zapis: ui.say(zapisujAuto && Zapisy.saveToStorage(sim) ? "Zapisane." : "Nie tutaj.", sim.tick); break;
                case Akcja.wczytaj:
                {
                    // w samouczku zapis gracza nie ma prawa podmienić góry, na której się uczy
                    if (!zapisujAuto) { ui.say("Nie tutaj.", sim.tick); break; }
                    var s = Zapisy.loadFromStorage();
                    if (s != null)
                    {
                        sim = s; doSerca(true); dirty = true;
                        if (s.ending != null) { app.idz("kronika", s); break; }
                        ui.say("Wróciłeś tam, gdzie byłeś.", s.tick);
                    }
                    else ui.say("Nie ma do czego wracać.", sim.tick);
                    break;
                }
                case Akcja.odNowa: if (sim.ending != null) nowaGra(); break;
                case Akcja.legenda: legenda = !legenda; break;
                case Akcja.zapiski: zapiski = !zapiski; przewinZapiskow = 0; break;
                case Akcja.kamera: doMieszkancow(); break;
                case Akcja.przyblizenie: cam.zoom = Math.Min(cam.maxZoom, cam.zoom * KAMERA.krokKlawisza); cam.clamp(sim.world.w, sim.world.h); nasluch?.Invoke(new ZdarzenieGry { typ = "kamera", rodzaj = "zoom" }); dirty = true; break;
                case Akcja.oddalenie: cam.zoom = Math.Max(cam.minZoom, cam.zoom / KAMERA.krokKlawisza); cam.clamp(sim.world.w, sim.world.h); nasluch?.Invoke(new ZdarzenieGry { typ = "kamera", rodzaj = "zoom" }); dirty = true; break;
                case Akcja.zasiej: case Akcja.szept: case Akcja.znak:
                    // Alpha 1 (komputer): bez rytów — Nakarm od razu, Cud i Módl się przez okno pobożnego
                    if (akcja == Akcja.zasiej) nakarmTeraz();
                    else if (akcja == Akcja.znak)
                    {
                        if (zaznaczeniZywi().Any(c => SLud.rolaPostaci(c) == "pobozny")) wykonajMozliwosc("cud");
                        else { ui.say("Cud sprowadza pobożny — zaznacz pobożnego (S) i wybierz „Cud” w jego oknie.", sim.tick); app.gesty.odmowa(); }
                    }
                    else wykonajMozliwosc("modl");
                    break;
                case Akcja.narzedzie1: wybierzNarzedzie(0); break;
                case Akcja.narzedzie2: wybierzNarzedzie(1); break;
                case Akcja.narzedzie3: wybierzNarzedzie(2); break;
                case Akcja.narzedzie4: wybierzNarzedzie(3); break;
                default: break;
            }
        }

        public void wybierzCzasownik(string v)
        {
            if (dozwolone != null && !dozwolone.Contains(v)) return;
            ui.verb = ui.verb == v ? null : v;
            ui.tool = ui.verb != null ? Moce.TOOLS[ui.verb][0].id : null;
            ui.selected = null;
            if (ui.verb != null) { zaznaczeni.Clear(); kolejnoscZaznaczenia.Clear(); }
            nasluch?.Invoke(new ZdarzenieGry { typ = "wybranoCzasownik", czasownik = ui.verb });
        }

        void wybierzNarzedzie(int i)
        {
            if (ui.verb == null) return;
            var lista = Moce.TOOLS[ui.verb];
            if (i < lista.Length) ui.tool = lista[i].id;
        }
    }
}
