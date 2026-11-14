// Port: alpha-1/src/ui/ui.ts — ryty i karta mieszkańca. Na komputerze (Alpha 1) rytów na lewym marginesie nie ma
// (bezRytow(): Nakarm jest w księdze, Szept i Cud w oknie postaci), więc z tej klasy zostają: narzędzia wybranego rytu
// wyryte w górnym marginesie (gdy ryt wybrano klawiszem), karta mieszkańca z myślami do szeptu i komunikat przy kursorze.
// Pominięte (rysowane w Alphie 1 tylko na telefonie, decyzja 9.11): ryty na marginesie (oprawaRytu, rune, podpisRytu,
// pozycjaRytu) i pasek narzędzi nad płytą (drawToolsTelefon).
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyBarwy;
using static Trzewia.Nastawy.NastawySterowanie;
using SLud = Trzewia.Symulacja.Lud;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    public sealed class Ui
    {
        sealed class Hit { public double x, y, hw, hh; public string kind = ""; public string? verb, tool; }

        /// <summary>Co ryt robi — jedno zdanie w podpisie pod kursorem.</summary>
        static readonly Dictionary<string, string> SKUTKI = new Dictionary<string, string>
        {
            ["zasiej"] = "dotknij miejsca — z góry zjedzie tam wiadro z jedzeniem",
            ["szept"] = "dotknij mieszkańca: „módl się” albo „prorokuj”",
            ["znak"] = "dotknij przy gnieździe — ich oddanie rośnie",
        };

        /// <summary>Dolna krawędź znaku menu, liczona od górnej krawędzi płyty (patrz EkranGry.menuRect).</summary>
        const double ZNAK_MENU_DOL = 40;

        static readonly (string id, string label)[] VERBS = { ("zasiej", "Nakarm"), ("szept", "Szepnij"), ("znak", "Cud") };

        public string? verb;
        public string? tool;
        public Creature? selected;
        List<Hit> hits = new List<Hit>();
        Plate plate = null!;
        double vw;
        double gs = 32, gap = 50, gx = 30, gy;
        string flash = "";
        double flashAt = -1e9;
        /// <summary>Ostatnie miejsce dotknięcia — komunikat pojawia się tam, gdzie patrzysz.</summary>
        public (double x, double y) pointer = (0, 0);
        /// <summary>Myśl właśnie szepnięta z karty — gra zgłasza ją samouczkowi i czyści.</summary>
        public string? ostatniaMysl;
        /// <summary>W pauzie myśli nie dzieją się od razu — idą do planu i czekają na czas.</summary>
        public Rozkazy? plan;
        /// <summary>Etap 4: „napraw linę” z karty postaci — gra posyła tę postać do przeciętej liny (ekran gry ustawia).</summary>
        public Action<double>? naprawa;

        bool dwieKolumny;
        /// <summary>Kiedy ostatnio wybrano ryt — na telefonie jego opis wisi przez chwilę (STEROWANIE.opisRytuMs).</summary>
        double opisRytuOd = -1e9;

        public void layout(Plate p, double vw0)
        {
            plate = p; vw = vw0;
            gs = Math.Max(20, Math.Min(38, p.left * 0.5));
            // niskie okno: pięć rytów w jednej kolumnie się nie mieści, więc łamiemy je na dwie
            dwieKolumny = p.h < gs * 9;
            var rzedy = dwieKolumny ? 3 : 5;
            gap = Math.Min(p.h / (rzedy + 0.6), gs * 2.1);
            gx = dwieKolumny ? p.left * 0.32 : p.left / 2;
            gy = p.y + p.h / 2 - gap * (rzedy - 1) / 2;
            // pierwszy ryt nie może wejść na znak menu w lewym górnym rogu płyty
            var odGory = p.y + ZNAK_MENU_DOL + gs * 0.85;
            if (gy < odGory)
            {
                var dol = p.y + p.h - gs * 0.85;
                gap = Math.Min(gap, (dol - odGory) / Math.Max(1, rzedy - 1));
                gy = odGory;
            }
        }

        /// <summary>
        /// Gdzie na ekranie leży ryt, słowo narzędzia albo myśl na karcie — samouczek wskazuje palcem dokładnie to,
        /// w co trzeba kliknąć. Narzędzia i myśli są znane dopiero po narysowaniu, więc przed pierwszą klatką zwraca null.
        /// </summary>
        public (double x, double y, double hw, double hh)? miejsce(string rodzaj, string id)
        {
            if (rodzaj == "verb")
            {
                var i = Array.FindIndex(VERBS, v => v.id == id);
                if (i < 0 || plate == null || bezRytow()) return null;
                // (ryty są tylko na telefonie — tu nie dochodzimy)
                return null;
            }
            var h = hits.FirstOrDefault(z => z.kind == rodzaj && z.tool == id);
            return h != null ? (h.x, h.y, h.hw, h.hh) : ((double, double, double, double)?)null;
        }

        /// <summary>Alpha 1: na komputerze rytów po lewej nie ma — Nakarm jest w księdze, Szept i Cud w oknie postaci.</summary>
        public bool bezRytow() => plate != null && !plate.waski && !plate.niski;

        /// <summary>
        /// Komunikat przy kursorze. Czas liczony zegarem, nie tikami świata: przy pauzie albo otwartej karcie tiki stoją
        /// i komunikat wisiał bez końca.
        /// </summary>
        public void say(string text, double? _tick = null) { flash = text; flashAt = Wydajnosc.Teraz(); }

        public void draw(IPlotno ctx, Sim sim, double time)
        {
            hits = new List<Hit>();
            // (ryty na marginesie — tylko telefon; na komputerze bezRytow() zawsze true)

            if (verb != null && !(selected != null && !selected.dead)) drawTools(ctx, sim);
            if (selected != null && !selected.dead) drawCard(ctx, sim, selected, time);

            if (time - flashAt < 2600 && flash != "")
            {
                var a = Math.Min(1, (2600 - (time - flashAt)) / 1000);
                var size = Math.Max(14, vw / 76);
                ctx.font = $"italic {Js.Js.S(size)}px {Ink.SERIF}";
                ctx.textAlign = "center";
                // środek napisu trzyma się płyty tak, żeby cały tekst się w niej mieścił — przy lewym brzegu wchodził na znak menu
                var pol = Math.Min(plate.w / 2 - 8, ctx.measureText(flash).width / 2 + 10);
                var x = Math.Max(plate.x + pol, Math.Min(plate.x + plate.w - pol, pointer.x));
                // górny pasek płyty należy do drogi do wolności — komunikat nie może go zasłaniać
                var y = Math.Max(plate.y + (plate.waski ? 128 : 96), pointer.y - size * 1.4);
                ctx.lineWidth = 3;
                ctx.strokeStyle = Barwa.Rgba(10, 7, 6, a * 0.85);
                ctx.strokeText(flash, x, y);
                ctx.fillStyle = Barwa.Rgba(236, 220, 190, a);
                ctx.fillText(flash, x, y);
            }
        }

        /// <summary>Narzędzia jako wyryte słowa w górnym marginesie — żadnych szarych pigułek.</summary>
        void drawTools(IPlotno ctx, Sim sim)
        {
            var tools = Moce.TOOLS[verb!];
            var size = Math.Max(14, Math.Min(20, vw / 62));
            ctx.font = $"{Js.Js.S(size)}px {Ink.SERIF}";
            var widths = tools.Select(t => ctx.measureText(t.label).width).ToArray();
            var gap0 = size * 1.9;
            var total = widths.Sum() + gap0 * (tools.Length - 1);
            var x = plate.x + (plate.w - total) / 2;
            var y = plate.y - plate.top * 0.42;

            for (int k = 0; k < tools.Length; k++)
            {
                var ok = Moce.affordable(sim, verb!, tools[k].id);
                var on = tool == tools[k].id;
                var cx = x + widths[k] / 2;
                ctx.textAlign = "center";
                ctx.fillStyle = on ? "rgba(248,234,204,0.99)" : ok ? "rgba(216,204,180,0.92)" : "rgba(146,134,118,0.5)";
                ctx.fillText(tools[k].label, cx, y);
                if (on)
                {                                  // nacięcie pod wybranym słowem
                    ctx.strokeStyle = "rgba(240,216,168,0.8)";
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(cx - widths[k] / 2 - 3, y + size * 0.34);
                    ctx.lineTo(cx + widths[k] / 2 + 3, y + size * 0.34);
                    ctx.stroke();
                }
                hits.Add(new Hit { x = cx, y = y - size * 0.35, hw = widths[k] / 2 + gap0 * 0.35, hh = size, kind = "tool", verb = verb, tool = tools[k].id });
                x += widths[k] + gap0;
            }

            var t = tools.FirstOrDefault(z => z.id == tool);
            ctx.textAlign = "center";
            ctx.font = $"italic {Js.Js.S(size * 0.82)}px {Ink.SERIF}";
            ctx.fillStyle = "rgba(206,194,172,0.8)";
            ctx.fillText(t != null ? $"{t.hint} — świat zwalnia, póki trzymasz znak" : "świat zwalnia, póki trzymasz znak",
                plate.x + plate.w / 2, plate.y - plate.top * 0.1);
        }

        /// <summary>
        /// Karta mieszkańca. Jedyny moment, gdy widzisz kogoś jako kogoś: jego sylwetka w niszy jak na tablicy atlasu,
        /// imię, ród i to, czym akurat żyje — a pod spodem myśli do szeptu.
        /// </summary>
        void drawCard(IPlotno ctx, Sim sim, Creature c, double time)
        {
            var p = plate;
            // Remake v1: każdy stan (wzmocnienie, osłabienie) dokłada karcie wiersz — opis nie wchodzi na szept
            // etap 4: lina wiadra przecięta — na karcie każdego z ludu jest „napraw linę” (wiersz nad szeptem)
            var naprawaJest = LinaWiadra.linaPrzecieta(sim) != null && SLud.rolaPostaci(c) != null && c.naprawia == null;
            var dodatek = (SLud.stanyPostaci(sim, c).Count * 2.3 + (naprawaJest ? 2.4 : 0)) * Math.Max(12, Math.Min(15, Math.Min(360, p.w * (p.waski ? 0.94 : 0.46)) * 0.043));
            double cw = Math.Min(360, p.w * (p.waski ? 0.94 : 0.46)), ch = Math.Min(290 + dodatek, p.h * 0.9);
            var x = p.waski ? p.x + (p.w - cw) / 2 : p.x + p.w - cw - 12;
            // wąsko karta schodzi pod wstęgę drogi do wolności, szeroko wstęga jest w lewym rogu
            var y = Math.Max(p.y + (p.waski ? 122 : 14), Math.Min(p.y + p.h - ch - 8, p.y + p.h / 2 - ch / 2));
            var clan = sim.clans[c.clan];
            ctx.save();
            Ozdoby.ramaKarty(ctx, x, y, cw, ch, 1, "mieszkaniec góry");

            // nisza na złotym tle, jak na ikonie: łuk z perełkami, obrzeże czerwieni ziemi, podłoga
            double nw = cw * 0.3, nh = Math.Min(ch, 290) * 0.5;
            double nx = x + 16, ny = y + 18;
            var nisza = Freski.zlotaNisza(ctx, nx, ny, nw, nh, time);
            ctx.save();
            ctx.clip(nisza);
            // cień postaci na złocie i ciemniejsza podłoga niszy
            var podloga = ctx.createLinearGradient(0, ny + nh * 0.8, 0, ny + nh);
            podloga.addColorStop(0, "rgba(60,30,10,0)");
            podloga.addColorStop(1, "rgba(60,30,10,0.45)");
            ctx.fillStyle = podloga;
            ctx.fillRect(nx, ny, nw, nh);
            ctx.translate(nx + nw / 2, ny + nh - 6);
            Figury.rysujPostac(ctx, sim, c, nh * 0.62, time);
            ctx.restore();
            Freski.brzegNiszy(ctx, nisza, nx, ny, nw);
            ctx.strokeStyle = FRESK.czerwien;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(nx - 4, ny + nh + 1); ctx.lineTo(nx + nw + 4, ny + nh + 1); ctx.stroke();

            // imię, ród, życie
            double tx = nx + nw + 16, tw = x + cw - 16 - tx;
            ctx.textAlign = "left";
            ctx.textBaseline = "alphabetic";
            var rozmImienia = Math.Max(16, Math.Min(24, cw * 0.075));
            ctx.font = $"{Js.Js.S(rozmImienia)}px {Ink.SERIF}";
            var imie = c.boss != null ? Boss.aktywnyBoss().nazwa : c.straznik == true ? "Strażnik Snu" : Overlay.creatureName(c);
            if (ctx.measureText(imie).width > tw) { rozmImienia *= tw / ctx.measureText(imie).width; ctx.font = $"{Js.Js.S(rozmImienia)}px {Ink.SERIF}"; }
            ctx.fillStyle = "rgba(242,228,202,0.97)";
            ctx.fillText(imie, tx, ny + rozmImienia * 0.9);
            var rozm = Math.Max(12, Math.Min(15, cw * 0.043));
            ctx.font = $"{Js.Js.S(rozm * 0.82)}px {Ink.SERIF}";
            ctx.fillStyle = "rgba(224,168,96,0.85)";
            var cecha = CechyNacji.cechaNacji(clan).nazwa;
            var rola = SLud.rolaPostaci(c);
            var kto = rola != null ? SLud.NAZWA_ROLI[rola].ToUpperInvariant() : c.straznik == true ? (c.boss != null ? "BOSS" : "STRAŻNIK") : Races.RACES[c.race].name.ToUpperInvariant();
            ctx.fillText($"{kto} · {clan.name}{(!string.IsNullOrEmpty(cecha) ? $" · {cecha}" : "")}", tx, ny + rozmImienia * 0.9 + rozm * 1.5, tw);
            ctx.font = $"italic {Js.Js.S(rozm)}px {Ink.SERIF}";
            ctx.fillStyle = "rgba(208,194,170,0.86)";
            wrap(ctx, lifeLine(c, sim), tx, ny + rozmImienia * 0.9 + rozm * 3.1, tw, rozm * 1.3);

            // stany w prawej kolumnie, na wysokości podłogi niszy
            var sStan = Math.Max(11, Math.Min(14, cw * 0.036));
            // odstęp tak, żeby podpisy (głód, wiara, obłęd) się nie zlewały
            Stany.rysujStany(ctx, c, tx + sStan, ny + nh - sStan * 1.6, sStan, Math.Max(sStan * 2.1, 34));

            // myśli do szeptu: przerywnik, podpis i cztery słowa w klamrach
            // Remake v1: wzmocnienia i osłabienia — co to jest i kiedy minie (pod niszą, nad szeptem)
            var stany = SLud.stanyPostaci(sim, c);
            var koniecStanow = ny + nh + rozm * 1.35 + stany.Count * rozm * 2.3;
            var yM = Math.Max(y + Math.Min(ch, 290) * 0.76, koniecStanow + rozm * 1.6);
            if (naprawaJest)
            {
                // „napraw linę wiadra” — czerwona klamra, pulsuje; kto dojdzie, idzie, wspina się i skleja
                double by = yM - rozm * 0.9, puls = 0.6 + 0.4 * JsM.Sin(time * 0.006);
                ctx.font = $"{Js.Js.S(rozm * 1.05)}px {Ink.SERIF}";
                ctx.textAlign = "center";
                const string tekst = "napraw linę wiadra"; var hw = ctx.measureText(tekst).width / 2 + rozm * 0.8;
                ctx.fillStyle = Barwa.Rgba(120, 24, 16, 0.35 + 0.2 * puls);
                ctx.fillRect(x + cw / 2 - hw, by - rozm * 0.95, hw * 2, rozm * 1.35);
                ctx.strokeStyle = Barwa.Rgba(236, 96, 72, 0.6 + 0.35 * puls); ctx.lineWidth = 1.2;
                ctx.strokeRect(x + cw / 2 - hw, by - rozm * 0.95, hw * 2, rozm * 1.35);
                ctx.fillStyle = "rgba(250,226,206,0.97)";
                ctx.fillText(tekst, x + cw / 2, by);
                hits.Add(new Hit { x = x + cw / 2, y = by - rozm * 0.3, hw = hw, hh = rozm * 0.8, kind = "naprawa" });
                yM += rozm * 2.4;
            }
            if (stany.Count > 0)
            {
                var ys = ny + nh + rozm * 1.35;
                ctx.textAlign = "left";
                foreach (var st in stany)
                {
                    if (ys > yM - rozm * 1.9) break;
                    double? zostalo = st.@do != null ? Math.Max(0, Math.Ceiling((st.@do.Value - sim.tick) / 120)) : (double?)null;
                    var kiedy = st.kiedy ?? (zostalo == null ? "na zawsze" : zostalo >= 60 ? $"mija za {Js.Js.S(Math.Floor(zostalo.Value / 60))} min {Js.Js.S(zostalo.Value % 60)} s" : $"mija za {Js.Js.S(zostalo.Value)} s");
                    ctx.font = $"{Js.Js.S(rozm * 0.95)}px {Ink.SERIF}";
                    ctx.fillStyle = st.uspiony == true ? "rgba(190,180,160,0.85)" : st.dobry ? "rgba(250,226,150,0.98)" : "rgba(236,112,96,0.98)";
                    const string znak = "• ";
                    ctx.fillText($"{znak}{st.nazwa} — {kiedy}", x + 18, ys, cw - 36);
                    ctx.font = $"italic {Js.Js.S(rozm * 0.82)}px {Ink.SERIF}";
                    ctx.fillStyle = "rgba(208,194,170,0.8)";
                    ctx.fillText(st.skutek, x + 18 + rozm * 1.1, ys + rozm * 1.05, cw - 36 - rozm * 1.1);
                    ys += rozm * 2.3;
                }
            }
            ctx.strokeStyle = "rgba(207,194,166,0.25)";
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x + 18, yM - rozm * 1.4); ctx.lineTo(x + cw - 18, yM - rozm * 1.4); ctx.stroke();
            ctx.font = $"{Js.Js.S(rozm * 0.72)}px {Ink.SERIF}";
            ctx.textAlign = "center";
            ctx.fillStyle = "rgba(224,168,96,0.8)";
            const string napisSzeptu = "S Z E P N I J   M U";
            var sw = ctx.measureText(napisSzeptu).width;
            // podkład pod napisem w kolorze tablicy — kreska przerywnika urywa się przy słowach
            ctx.fillStyle = FRESK.tablicaCiemna;
            ctx.fillRect(x + cw / 2 - sw / 2 - 8, yM - rozm * 1.4 - rozm * 0.5, sw + 16, rozm);
            ctx.fillStyle = "rgba(224,168,96,0.8)";
            ctx.fillText(napisSzeptu, x + cw / 2, yM - rozm * 1.15);
            // (Alpha, etap 3d: okaleczenie i ofiara są już rytuałami przy ołtarzu, nie szeptami)
            var tools = c.straznik == true ? new Narzedzie[0] : Moce.TOOLS["szept"].Where(t => t.id != "przerwij" || Moce.modliSie(c)).ToArray();
            var size = Math.Max(13, Math.Min(17, cw * 0.05));
            ctx.font = $"{Js.Js.S(size)}px {Ink.SERIF}";
            for (int k = 0; k < tools.Length; k++)
            {
                var bx = x + cw * (k % 2 == 0 ? 0.28 : 0.72);
                // telefon: rzędy dalej od siebie, żeby palec trafiał w jedną myśl, nie w dwie
                var telefon = plate.waski || plate.niski;
                var by = yM + Math.Floor(k / 2.0) * size * (telefon ? 2.4 : 1.9);
                var ok = Moce.affordable(sim, "szept", tools[k].id);
                ctx.textAlign = "center";
                ctx.fillStyle = ok ? "rgba(240,226,198,0.96)" : "rgba(146,134,118,0.5)";
                ctx.fillText(tools[k].label, bx, by);
                var hw = ctx.measureText(tools[k].label).width / 2 + size * 0.6;
                ctx.strokeStyle = ok ? "rgba(224,168,96,0.55)" : "rgba(120,110,96,0.25)";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(bx - hw + 4, by - size * 0.85); ctx.lineTo(bx - hw, by - size * 0.85); ctx.lineTo(bx - hw, by + size * 0.3); ctx.lineTo(bx - hw + 4, by + size * 0.3);
                ctx.moveTo(bx + hw - 4, by - size * 0.85); ctx.lineTo(bx + hw, by - size * 0.85); ctx.lineTo(bx + hw, by + size * 0.3); ctx.lineTo(bx + hw - 4, by + size * 0.3);
                ctx.stroke();
                // na telefonie trafia się w całą połowę karty, nie w samo słowo
                hits.Add(new Hit { x = bx, y = by - size * 0.3, hw = telefon ? Math.Max(hw, cw * 0.21) : hw, hh = telefon ? size * 1.15 : size * 0.9, kind = "thought", tool = tools[k].id });
            }
            ctx.restore();
        }

        /// <summary>Zwraca true, gdy dotyk trafił w interfejs i nie powinien ruszać świata.</summary>
        public bool tap(Sim sim, double sx, double sy)
        {
            foreach (var h in hits)
            {
                if (Math.Abs(h.x - sx) > h.hw || Math.Abs(h.y - sy) > h.hh) continue;
                flash = "";                                  // stary komunikat nie może wisieć po zmianie
                if (h.kind == "verb")
                {
                    verb = verb == h.verb ? null : h.verb;
                    if (verb != null) opisRytuOd = Wydajnosc.Teraz();
                    tool = verb != null ? Moce.TOOLS[verb][0].id : null;
                    selected = null;
                }
                else if (h.kind == "tool")
                {
                    tool = h.tool;
                }
                else if (h.kind == "naprawa" && selected != null)
                {
                    naprawa?.Invoke(selected.id);
                    selected = null;
                }
                else if (h.kind == "thought" && selected != null && plan != null)
                {
                    var kto = selected;
                    var powod = plan.zaplanuj(sim, new Rozkaz { czasownik = "szept", narzedzie = h.tool!, x = kto.x, y = kto.y, kto = kto.id });
                    if (powod == null) { say("Myśl czeka. Usłyszy ją, gdy puścisz czas.", sim.tick); selected = null; }
                    else if (powod != "") say(powod, sim.tick);
                }
                else if (h.kind == "thought" && selected != null)
                {
                    if (Moce.whisper(sim, h.tool!, selected))
                    {
                        ostatniaMysl = h.tool;
                        var t = Moce.TOOLS["szept"].First(z => z.id == h.tool);
                        sim.log($"Szepnąłeś {Overlay.creatureNameCelownik(selected)}: „{t.label}\". Usłyszał.", "wiara",
                            "szept", n => $"Szepnąłeś {(n == 2 ? "dwóm" : n == 3 ? "trzem" : Js.Js.S(n))}. Usłyszeli.");
                        selected = null;
                    }
                    else say("Za mało wiary.", sim.tick);
                }
                return true;
            }
            return false;
        }

        public bool touchCreature(Sim sim, Creature c)
        {
            if (verb == "szept") { selected = c; return true; }
            return false;
        }

        public string hintCost(Sim sim)
        {
            if (verb == null || tool == null) return "";
            var c = Moce.cost(verb, tool);
            var parts = new List<string>();
            if (c.krew > sim.krew) parts.Add("krwi");
            if (c.wiara > sim.wiara) parts.Add("wiary");
            return parts.Count > 0 ? $"Brakuje {string.Join(" i ", parts)}." : "";
        }

        static string lifeLine(Creature c, Sim sim)
        {
            var clan = sim.clans[c.clan];
            // Remake v1: zamiar — co teraz robi i jak długo jeszcze się tego trzyma
            if (SLud.rolaPostaci(c) != null && !string.IsNullOrEmpty(c.zamiar))
            {
                var zostalo = Math.Max(0, Math.Ceiling(((c.zamiarDo ?? 0) - sim.tick) / 120));
                return $"Teraz: {c.zamiar}{(zostalo > 0 && c.job != Job.PIELGRZYM ? $" (jeszcze {Js.Js.S(zostalo)} s)" : "")}.";
            }
            if (c.prophet) return "Prorok. Słyszał cię raz i nie przestał powtarzać.";
            if (c.mad > 0.5) return "Kopał za głęboko. Wrócił inny.";
            if (c.job == Job.DIG || c.job == Job.DESCEND) return "Drąży. Nie wie, że drąży w kimś.";
            if (c.job == Job.PRAY) return "Modli się do ściany, która słucha.";
            if (c.job == Job.FIGHT) return "Właśnie próbuje kogoś zabić.";
            if (c.job == Job.PIELGRZYM) return "Idzie do krypty pod Wielkim Pomnikiem. Sam nie wie po co.";
            if (c.job == Job.EAT || c.hunger > 0.6) return "Głodny. To u nich stan domyślny.";
            if (c.carry > 0) return "Niesie rudę do gniazda.";
            return clan.devotion > 0.6 ? "Wierzy w ciebie bez powodu." : "Żyje, bo jeszcze nie umarł.";
        }

        static void wrap(IPlotno ctx, string text, double x, double y, double maxW, double lh)
        {
            var words = text.Split(' ');
            var line = "";
            var yy = y;
            foreach (var wd in words)
            {
                var test = line != "" ? line + " " + wd : wd;
                if (ctx.measureText(test).width > maxW && line != "") { ctx.fillText(line, x, yy); line = wd; yy += lh; }
                else line = test;
            }
            if (line != "") ctx.fillText(line, x, yy);
        }
    }
}
