// Port: alpha-1/src/app/screens/game.ts — krok świata i dźwięki z różnicy stanu między klatkami. Dźwięki (głosy ludu,
// odmowy, dzwony, pauza) idą do zaślepek z Aplikacja/BezDzwieku.cs — logika, kiedy co zabrzmi, jest przeniesiona, żeby
// przy dźwięku wystarczyło wypełnić zaślepki.
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Atlas;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Symulacja;
using static Trzewia.Aplikacja.Obserwowany;
using static Trzewia.Nastawy.NastawySterowanie;
using static Trzewia.Nastawy.NastawyPolecenia;
using static Trzewia.Nastawy.NastawyPomnik;
using static Trzewia.Nastawy.NastawyDzwiek;
using static Trzewia.Nastawy.NastawyWygladAtlas;
using static Trzewia.Rdzen.SettingsStore;
using SLud = Trzewia.Symulacja.Lud;

namespace Trzewia.Aplikacja
{
    public sealed partial class EkranGry
    {
        /// <summary>Stan z poprzedniej klatki, z którego różnicy biorą się dźwięki gestów.</summary>
        sealed class Slad { public bool pauza; public double zawies, plan; public string? verb, tool; public double karta; public string strona = ""; }
        Slad? slad;
        /// <summary>Odmowy, które już usłyszano (rycerz mówi każdą najwyżej raz).</summary>
        readonly System.Runtime.CompilerServices.ConditionalWeakTable<Odmowa, object> slyszaneOdmowy = new System.Runtime.CompilerServices.ConditionalWeakTable<Odmowa, object>();
        /// <summary>Głos jednej postaci z ludu: co już było słychać i kiedy ostatnio mówiła (ms, jak `teraz` w krok).</summary>
        sealed class GlosPostaci
        {
            public Creature c = null!;
            /// <summary>Rozkaz i cios, które już było słychać.</summary>
            public Polecenie? polecenie;
            public Oberwal? oberwal;
            /// <summary>Z kim walczy (id Strażnika albo demona; −1 — z nikim) i kiedy ostatnio walczyła.</summary>
            public double wrog = -1, walkaT = -1e9;
            /// <summary>Kiedy ostatnio krzyknęła do walki, jęknęła z bólu i marudziła z głodu.</summary>
            public double atakT = -1e9, bolT = -1e9, glodT = -1e9;
            /// <summary>Krzyknęła już na demona.</summary>
            public bool naDemona;
            /// <summary>Głodna: od GLOSY_LUDU.glod.od, aż zje (poniżej `syty`).</summary>
            public bool glodna;
        }
        /// <summary>Głosy ludu: postacie z kwestiami (id → co już słychać) i góra, na której je zebrano.</summary>
        readonly Dictionary<double, GlosPostaci> glosyPostaci = new Dictionary<double, GlosPostaci>();
        Sim? glosyGory;
        /// <summary>Etap 5: co z pomnika już słychać i widać (stan pękania, faza) — dźwięk i kamera przy zmianie.</summary>
        (double stan, string faza)? slyszanyPomnik;
        /// <summary>Etap 5b: co z dłoni w walce z demonem już słychać.</summary>
        sealed class SlyszanaDlonDemona { public string? akcja; public string faza = ""; public double odbicie, sciana; public HashSet<double> lecacy = new HashSet<double>(); }
        SlyszanaDlonDemona? slyszanaDlonDemona;

        /// <summary>
        /// Rycerz albo pobożny, który właśnie odmówił pójścia tam, gdzie się nie da dojść, mówi to na głos. Naraz mówi jeden.
        /// </summary>
        void glosOdmowy()
        {
            var mowil = false;
            foreach (var c in sim.creatures)
            {
                var o = c.odmowa;
                if (o == null || c.dead || slyszaneOdmowy.TryGetValue(o, out _)) continue;
                slyszaneOdmowy.Add(o, true);
                var kto = SLud.rolaPostaci(c);
                if (mowil || sim.tick - o.od > POLECENIA.odmowaTikow || (kto != "rycerz" && kto != "pobozny")) continue;
                var odmowy = kto == "rycerz" ? GLOS_RYCERZA.odmowy : GLOS_POBOZNEGO.odmowy;
                if (!odmowy.Any(p => o.tekst.StartsWith(p))) continue;
                if (app.gesty.glosOdmowy(kto, panPostaci(c))) mowil = true;
            }
        }

        /// <summary>Gdzie postać stoi na ekranie — panorama jej głosu (−0,6 lewo … 0,6 prawo).</summary>
        double panPostaci(Creature c) => Math.Max(-1, Math.Min(1, (cam.toScreenX(c.x) / Math.Max(1, cam.vw)) * 2 - 1)) * 0.6;

        /// <summary>
        /// Głosy ludu z różnicy stanu między klatkami: potwierdzenie rozkazu, okrzyk do walki, jęk bólu, marudzenie z głodu.
        /// </summary>
        void glosyLudu(double teraz)
        {
            var g = app.gesty; var L = GLOSY_LUDU;
            if (glosyGory != sim) { glosyGory = sim; glosyPostaci.Clear(); }
            // nowi w ludzie (i wskrzeszeni) — słychać ich od tej chwili; rozkaz i cios sprzed niej nie są nowe
            foreach (var c in sim.creatures)
            {
                var rola = SLud.rolaPostaci(c);
                if (c.dead || rola == null || glosyPostaci.ContainsKey(c.id) || !g.maGlos(rola)) continue;
                glosyPostaci[c.id] = new GlosPostaci { c = c, polecenie = c.polecenie, oberwal = c.oberwal };
            }
            var stoi = zamrozone();
            foreach (var id in glosyPostaci.Keys.ToList())
            {
                var s = glosyPostaci[id]; var c = s.c; var rola = SLud.rolaPostaci(c);
                if (rola == null) { glosyPostaci.Remove(id); continue; }
                var pan = panPostaci(c);
                if (c.oberwal != s.oberwal)
                {
                    s.oberwal = c.oberwal;
                    // jęk przy śmierci ucina poprzedni i nie czeka na przerwę
                    var mocno = c.oberwal?.mocno == true;
                    if (c.oberwal != null && (c.dead || (teraz - s.bolT >= (mocno ? L.bol.mocnyCo : L.bol.slabyCo) * 1000 && (mocno || los.NextDouble() < L.bol.slabySzansa)))
                        && g.glosLudu(rola, "bol", pan, c.dead)) s.bolT = teraz;
                }
                if (c.dead) { glosyPostaci.Remove(id); continue; }
                // świeży rozkaz (wczytany zapis nie odpowiada na dawne)
                if (c.polecenie != s.polecenie)
                {
                    s.polecenie = c.polecenie;
                    if (c.polecenie != null && sim.tick - c.polecenie.od <= POLECENIA.odmowaTikow) g.glosLudu(rola, "potwierdzenie", pan);
                }
                var celW = c.job == Job.FIGHT ? sim.creatureById(sim.target.getOr(c.id, -1)) : null;
                var wrog = celW != null && !celW.dead && celW.straznik == true ? celW : null;
                if (wrog?.boss != null && !s.naDemona)
                {
                    // na demona krzyczy zawsze — gdy akurat jęczy z bólu, krzyknie, jak skończy
                    if (g.glosLudu(rola, "atak", pan)) { s.naDemona = true; s.atakT = teraz; }
                }
                else if (wrog != null && wrog.id != s.wrog && teraz - s.atakT >= L.atak.przerwa * 1000)
                {
                    // nowa walka — zawsze; następny Strażnik w tej samej walce — czasem
                    var nowaWalka = teraz - s.walkaT > L.atak.walkaTrwa * 1000;
                    if ((nowaWalka || los.NextDouble() < L.atak.nastepnySzansa) && g.glosLudu(rola, "atak", pan)) s.atakT = teraz;
                }
                s.wrog = wrog?.id ?? -1;
                if (wrog != null) s.walkaT = teraz;
                if (c.hunger < L.glod.syty) s.glodna = false;
                else if (c.hunger >= L.glod.od && !s.glodna) { s.glodna = true; s.glodT = -1e9; }
                var przymiera = c.hunger >= L.glod.przymiera;
                if (s.glodna && !stoi && (wrog == null || przymiera) && teraz - s.glodT >= (przymiera ? L.glod.coPrzymiera : L.glod.co) * 1000
                    && g.glosLudu(rola, "glod", pan)) s.glodT = teraz;
            }
        }

        /// <summary>Etap 5: ostatnie uderzenie — przez chwilę czas płynie wolniej (nastawy/pomnik.ts: zwolnienie).</summary>
        double zwolnienieKonania()
        {
            var p = sim.lud.pomnik;
            return p?.faza == "kona" && sim.tick - p.od < POMNIK.zwolnienie ? POMNIK.zwolnienieTempo : 1;
        }

        /// <summary>
        /// Etap 5: pomnik pęka, rozpada się, demon wstaje, demon kona — dźwięk przy każdej zmianie, a przy rozpadzie
        /// i ostatnim uderzeniu kamera jedzie tam sama (to są chwile, których nie wolno przegapić).
        /// </summary>
        void patrzNaPomnik()
        {
            var p = sim.lud.pomnik;
            if (p == null) return;
            var by = slyszanyPomnik;
            slyszanyPomnik = (p.stan, p.faza);
            if (by == null) return;
            var g = app.gesty;
            var w = sim.world;
            if (p.stan > by.Value.stan && p.faza == "stoi") g.pekniecie();
            if (p.faza == by.Value.faza) return;
            if (p.faza == "rozpada")
            {
                g.rozpadPomnika();
                if (nasluch == null) pokazMiejsce(w.coreX + 0.5, w.coreY - 2, Math.Max(cam.zoom, 14));
            }
            else if (p.faza == "wychodzi") g.pekniecie();
            else if (p.faza == "kona")
            {
                g.ostatnieUderzenie();
                if (nasluch == null && p.cios != null) pokazMiejsce(p.cios.x, p.cios.y - 2, Math.Max(cam.zoom, 18));
            }
        }

        /// <summary>Etap 5b: dźwięki dłoni w walce z demonem — wyrasta, rzut, lądowanie, odbicie od tarczy, zawał.</summary>
        void sluchajDloniDemona()
        {
            var s = sim.lud.dlonDemona;
            if (s == null) return;
            var lecacy = new HashSet<double>(sim.creatures.Where(c => !c.dead && c.lot != null).Select(c => c.id));
            var by = slyszanaDlonDemona;
            slyszanaDlonDemona = new SlyszanaDlonDemona { akcja = s.akcja, faza = s.faza, odbicie = s.odbicieT ?? -1, sciana = s.sciana?.od ?? -1, lecacy = lecacy };
            if (by == null) return;
            var g = app.gesty;
            if (s.akcja != null && (s.akcja != by.akcja || (s.faza != by.faza && s.faza == "wstaje"))) g.dlonWyrasta(s.akcja == "zawal");
            if (s.akcja == "rzut" && s.faza == "cofa" && by.faza == "rzuca") g.rzutDloni();
            if ((s.odbicieT ?? -1) != by.odbicie && s.odbicieT != null) g.odbicieOdDloni();
            if ((s.sciana?.od ?? -1) != by.sciana && s.sciana != null) g.zawalStropu();
            foreach (var id in by.lecacy) if (!lecacy.Contains(id)) g.upadek();
        }

        /// <summary>
        /// Dźwięki gestów z różnicy stanu między klatkami: plan, pauza, wybrany ryt, karta, atlas. Każda droga do tej samej
        /// zmiany — mysz, klawisz, samouczek — brzmi więc tak samo.
        /// </summary>
        void sluchaj()
        {
            var g = app.gesty;
            var zawies = pauza ? 1 : zamrozone() ? 0.45 : 0;
            var teraz = new Slad { pauza = pauza, zawies = zawies, plan = rozkazy.ile, verb = ui.verb, tool = ui.tool, karta = ui.selected?.id ?? -1, strona = atlas.strona };
            var s = slad;
            slad = teraz;
            if (s == null) { Mikser.zawies(zawies); if (pauza) g.tonPauzy(true); return; }
            if (zawies != s.zawies) Mikser.zawies(zawies);
            // karta alarmu ma własny dzwon — pauza pod nią nie uderza drugi raz
            if (teraz.pauza != s.pauza) g.pauza(teraz.pauza, alarm != null);
            if (teraz.plan > s.plan) g.szkic();
            else if (teraz.plan < s.plan && pauza) g.skresl(teraz.plan == 0 && s.plan > 1);
            if (teraz.verb != s.verb || teraz.tool != s.tool) g.klik();
            if (teraz.karta != s.karta && teraz.karta >= 0) g.kartka();
            if (teraz.strona != s.strona && teraz.strona != "zamkniete") g.kartka();
        }

        /// <summary>Gra obserwowana: stan co pół sekundy i nowa partia po końcu.</summary>
        void krokObserwowanej(double teraz)
        {
            if (sim.ending != null)
            {
                if (botKoniecOd == 0) botKoniecOd = teraz;
                else if (BOT.autoRestart && !BOT.pauza && teraz - botKoniecOd > 6000) { nowaGra(ziarnoPartii()); alarm = null; pauza = false; }
            }
            if (teraz - botStanOd > 500)
            {
                botStanOd = teraz;
                wyslijStan(sim, sim.seed, botKoniecOd != 0 ? teraz - botKoniecOd : 0);
            }
        }

        public override void krok(double dt, double teraz)
        {
            var DEV = Trzewia.Symulacja.Dziennik.DEV;
            if (BOT.wlaczony) krokObserwowanej(teraz);
            // karta wydarzenia rozstrzygnięta — jej znacznik znika, wraca cel podpowiedzi
            if (celKarty != null && sim.wydarzenia.biezace == null)
            {
                if (cel == celKarty) cel = rada?.cel != null ? new Cel { x = rada.cel.x, y = rada.cel.y, r = rada.cel.r, tekst = rada.cel.tekst, klan = rada.cel.klan } : null;
                celKarty = null;
            }
            // okienko dewelopera: tylko w grze (nie w samouczku) i tylko z włączonym trybem
            var dev = ustawienia.trybDeweloperski && nasluch == null;
            if (dev && panelDev == null) panelDev = new PanelDewelopera(() => sim, (x, y) => pokazMiejsce(x, y),
                z => { nowaGra(z); ui.say($"Świat {Js.Js.S(z)} od nowa.", sim.tick); });
            if (!dev) { DEV.pauza = false; DEV.sledzony = -1; DEV.kursor = null; }
            panelDev?.ustaw(dev);
            panelDev?.odswiez(teraz);
            // palec przytrzymany na rycie: tablica rytu, a wybór z dotknięcia się cofa — to nie był wybór
            var pt = przytrzymanie;
            if (pt != null && Wydajnosc.Teraz() - pt.od > STEROWANIE.przytrzymanieMs)
            {
                przytrzymanie = null;
                ui.verb = pt.verb; ui.tool = pt.tool;
                otworzTabliceRytu(pt.v);
            }
            // plan wykonuje się także wtedy, gdy pauzę zdjęło coś innego niż przycisk
            if (!pauza && rozkazy.ile > 0) wykonajPlan();
            sluchaj();
            glosOdmowy();
            glosyLudu(teraz);
            patrzNaPomnik();
            sluchajDloniDemona();
            // (Krąg Trzeci: w filmie i scenie wejścia symulacja stoi)
            if (!zamrozone() && !wstep.trwa())
            {
                // zwykły czas: tyle tików na sekundę, niezależnie od tego, ile klatek pokazuje ekran
                double kroki;
                if (dev && DEV.pauza) { kroki = DEV.krokow; DEV.krokow = 0; }
                else
                {
                    var naSekunde = TEMPO.tikowNaSekunde * tempoTeraz() * (spowolnione() ? 0.25 : 1) * zwolnienieKonania();
                    reszta += (dt / 1000) * naSekunde;
                    var cale = Math.Floor(reszta);
                    reszta -= cale;
                    // wolny komputer: świat zwalnia, zamiast nadrabiać bez końca
                    kroki = Math.Min(Math.Max(TEMPO.maxNaKlatke, Math.Ceiling(naSekunde / 20)), cale);
                }
                var t0 = Wydajnosc.Teraz();
                // (przyspieszony czas — tryb deweloperski — dostaje budżet razy mnożnik: tam liczy się tempo, nie płynność)
                var budzet = TEMPO.budzetKlatkiMs * Math.Max(1, tempoTeraz());
                var zrobione = 0;
                while (zrobione < kroki)
                {
                    sim.step();
                    zrobione++;
                    // gra obserwowana: gra bot — karty rozstrzyga od razu, resztę co pół sekundy gry
                    if (BOT.wlaczony && sim.ending == null)
                    {
                        if (sim.wydarzenia.biezace != null) Bot.kartaBota(sim, BOT.styl);
                        if (sim.tick % Bot.BOT_CO == 0) Bot.ruchBota(sim, BOT.styl);
                    }
                    // budżet klatki: gdy świat nie nadąża, zwalnia, a obraz nie staje — reszta tików tej klatki przepada
                    if (Wydajnosc.Teraz() - t0 > budzet && !(dev && DEV.pauza)) break;
                }
                Wydajnosc.licznik.dodaj(Czesc.logika, Wydajnosc.Teraz() - t0);
                if (dev && zrobione > 0) DEV.msKroku = DEV.msKroku * 0.9 + ((Wydajnosc.Teraz() - t0) / zrobione) * 0.1;
                var wiadroT = sim.lud.wiadra?.zjazdT;
                if (wiadroT != null && wiadroT != slyszaneWiadro) { slyszaneWiadro = wiadroT; app.dzwiek.wiadro(); }
                // kamera za śledzoną postacią (okienko dewelopera)
                if (dev && DEV.sledz && DEV.sledzony >= 0)
                {
                    var c = sim.creatures.FirstOrDefault(q => q.id == DEV.sledzony && !q.dead);
                    if (c != null) { cam.x = camTarget.x = c.x; cam.y = camTarget.y = c.y; recznaKamera = true; cam.clamp(sim.world.w, sim.world.h); }
                }
                dirty = true;
                // kiedy gracz trzyma czasownik albo maluje, kamera musi stać: inaczej tunel ucieka spod kursora
                var wRobocie = painting || ui.verb != null || pointers.Count > 0;
                // krok kamery liczony z czasu klatki; `podazanie` i `dopasowanie` to ułamki na 1/30 s
                if (ustawienia.kameraZaZyciem && !recznaKamera && !wRobocie && dt > 0)
                {
                    var serce = ogniskoKamery();
                    if (serce is { } s)
                    {
                        var kr = Math.Min(10, dt / (1000.0 / 30));
                        double k = 1 - Math.Pow(1 - KAMERA.podazanie, kr), kz = 1 - Math.Pow(1 - KAMERA.dopasowanie, kr);
                        camTarget.x += (s.x - camTarget.x) * k;
                        camTarget.y += (s.y - camTarget.y) * k;
                        cam.drift(camTarget.x, camTarget.y, k);
                        if (ustawienia.autoZoom)
                        {
                            var fit = Math.Min(cam.vw / (s.w + KAMERA.zapasX), cam.vh / (s.h + KAMERA.zapasY));
                            // (oprawa, etap 2: w walce z bossem cel × KameraBossa.Mnoznik — bez oprawy 1)
                            cam.zoom += (Math.Max(cam.minZoom, Math.Min(KAMERA.autoMaxZoom, fit)) * Visual.KameraBossa.Mnoznik - cam.zoom) * kz;
                        }
                        cam.clamp(sim.world.w, sim.world.h);
                    }
                }
                if (sim.senDzwon) { sim.senDzwon = false; app.dzwiek.toll(); }
                var wyd = sim.wydarzenia.biezace;
                if (wyd != null && wyd != pokazaneWydarzenie) podniesWydarzenie(wyd);
                // auto-pauza: przy chwilach, w których trzeba decydować, świat staje sam
                if (nasluch == null && !BOT.wlaczony)
                {
                    var a = straznik.sprawdz(sim, ustawienia.autoPauza);
                    if (a != null) podniesAlarm(a);
                }
                if (sim.ending != null)
                {
                    nasluch?.Invoke(new ZdarzenieGry { typ = "koniec", opis = sim.ending });
                    if (nasluch == null && !BOT.wlaczony) app.idz("kronika", sim);
                }
            }

            // oprawa (etap 2): w walce z bossem kamera płynnie bliżej i wraca po walce (Visual/KameraBossa.cs) — także w pauzie
            if (!wstep.trwa())
                Visual.KameraBossa.Krok(sim, cam, dt, ustawienia.kameraZaZyciem && !recznaKamera && ustawienia.autoZoom,
                    painting || ui.verb != null || pointers.Count > 0 || (dev && DEV.sledz && DEV.sledzony >= 0));

            var odkrycia = Odkrycia.odkrycia;
            // co pół sekundy zegara, nie co tyle tików — w pauzie tiki stoją, a pauzę też się odkrywa
            if (nasluch == null && teraz - ostatnieOdkrywanie > 500) { ostatnieOdkrywanie = teraz; odkrywaj(); }
            // tablica celu nie wyskakuje w pierwszej sekundzie — gracz najpierw widzi swoją górę
            if (nasluch == null && !odkrycia.zna("droga") && sim.tick > ATLAS.drogaPoTikach && !atlas.otwarte && sim.ending == null
                && !painting && ui.verb == null)
            {
                // WERSJA ANDROID: tablica trafia do atlasu po cichu — wyskakując sama, zasłaniała pierwszą kartę wydarzenia
                odkrycia.odkryj("droga", false);
            }
            // nowa tablica otwiera się sama — najwyżej jedna na pół minuty i nigdy na kryzys
            if (nasluch == null && !BOT.wlaczony && odkrycia.kolejka.Count > 0 && !atlas.otwarte && alarm == null && !zapiski && sim.wydarzenia.biezace == null
                && sim.ending == null && sim.tick > 1200 && teraz - ostatniaTablica > 30000)
            {
                var id = odkrycia.kolejka[0]; odkrycia.kolejka.RemoveAt(0);
                ostatniaTablica = teraz;
                if (ustawienia.tablice == "pokazuj") { atlas.otworzTablice(id, true); app.gesty.tablica(); }
                else ui.say($"Nowa tablica w atlasie: {Tablice.tablica(id)?.nazwa ?? ""}.", sim.tick);
            }

            if (zapisujAuto && ustawienia.autozapis && sim.ending == null && !zamrozone() && teraz - lastSave > 60000)
            {
                lastSave = teraz;
                Zapisy.saveToStorage(sim);
            }

            // podpowiedź trzyma się co najmniej 25 sekund; zmienia się wcześniej tylko przy wyraźnie pilniejszej sprawie
            if (nasluch == null && alarm == null && teraz - radaOd > 2500)
            {
                var nowa = Podpowiedzi.podpowiedz(sim);
                var stara = rada;
                var czas = teraz - radaOd;
                if (stara == null || czas > 25000 || nowa.waga > stara.waga + 25 || nowa.tekst == stara.tekst)
                {
                    if (stara == null || nowa.tekst != stara.tekst) radaOd = teraz;
                    rada = nowa;
                    if (ui.verb == null && sim.wydarzenia.biezace == null) cel = nowa.cel != null ? new Cel { x = nowa.cel.x, y = nowa.cel.y, r = nowa.cel.r, tekst = nowa.cel.tekst, klan = nowa.cel.klan } : null;
                }
            }

            if (teraz - lastSound > 420)
            {
                lastSound = teraz;
                double kopie = 0, zywi = 0;
                foreach (var c in sim.creatures) { if (c.dead) continue; zywi++; if (c.job == 1 || c.job == 10) kopie++; }
                app.dzwiek.update(sim.world.depth(cam.y), zywi > 0 ? Math.Min(1, kopie / 18) : 0, Math.Min(1, sim.wiara / 260), Math.Min(1, zywi / 120), sim.sen, zamrozone());
                // dłoń z otchłani: od pierwszego drgnięcia otchłani do chwytu muzyka jest na granicy
                var dlon = sim.lud.dlon;
                var napiecieDloni = dlon != null && dlon.faza != "brak" && dlon.faza != "gasnie" ? (dlon.faza == "wstaje" ? 0.85 : 1) : 0;
                app.muzyka.ustawNapiecie(Math.Max(sim.sen, Math.Max(Math.Max(0, sim.dominance - 0.55) * 2, napiecieDloni)));
                if (dlon != null)
                {
                    if (dlon.wstajeT != null && dlon.wstajeT != slyszanaDlonWstaje) { slyszanaDlonWstaje = dlon.wstajeT; app.muzyka.otchlan(); }
                    if (dlon.chwytT != null && dlon.chwytT != slyszanaDlonChwyt) { slyszanaDlonChwyt = dlon.chwytT; app.muzyka.zabranie(); }
                }
            }
        }
    }
}
