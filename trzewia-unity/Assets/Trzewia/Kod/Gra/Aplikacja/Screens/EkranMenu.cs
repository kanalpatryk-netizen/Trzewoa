// Port: alpha-1/src/app/screens/menu.ts — menu główne.
// Różnica (decyzja użytkownika 15.11): pozycje spisu to odręczne przyciski z rysunku (dane/grafika/menu/przyciski/*.png)
// zamiast napisów pismem z ozdobnikami rysowanymi kodem; gdy pliku brak — dawny napis.
// Obrazki z alpha-1/obrazy/menu są w dane/grafika/menu (te same pliki). Znaki zespołu mają w nastawach pusty link —
// kliknięcie nic nie robi; wpisany adres otwiera gospodarz (Gospodarz.OtworzAdres — w Trzewia.exe przeglądarka systemu).
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Nastawy;
using static Trzewia.Nastawy.NastawyWygladMenu;
using static Trzewia.Rdzen.SettingsStore;
using static Trzewia.Rysunek.Ozdobnik;
using JS = Trzewia.Js.Js;
using JsMath = Trzewia.Js.JsMath;

namespace Trzewia.Aplikacja
{
    public sealed class EkranMenu : Ekran
    {
        static Typ_MENU M => MENU;
        static Styl rgba(string hex, double a) => Paleta.rgba(hex, a);

        /// <summary>Biały obrazek przemalowany na barwę (raz, do płótna poza ekranem).</summary>
        static IPlotno zabarw(IObraz img, string barwa)
        {
            var c = Plotno.Nowe(img.width, img.height);
            c.drawImage(img, 0, 0);
            c.globalCompositeOperation = "source-in";
            c.fillStyle = barwa; c.fillRect(0, 0, c.width, c.height);
            c.globalCompositeOperation = "source-over";
            return c;
        }

        sealed class WarstwyLogo { public IPlotno tlo = null!, serce = null!; public double cx, cy; }

        /// <summary>
        /// Logo rozdzielone na dwie warstwy: tło (logo bez serca) i samo serce — żeby serce mogło bić,
        /// a ornamenty wokół stały. Zwraca też środek serca w pikselach logo.
        /// </summary>
        static WarstwyLogo rozdzielSerce(IPlotno logo)
        {
            var S = M.serce; var k = logo.width / S.obrysSzer;
            using var maska = Plotno.Nowe(logo.width, logo.height);
            var g = maska;
            g.filter = $"blur({JS.S(S.miekkosc * k)}px)";
            g.beginPath();
            for (int i = 0; i < S.obrys.Length; i++) { var p = S.obrys[i]; if (i != 0) g.lineTo(p[0] * k, p[1] * k); else g.moveTo(p[0] * k, p[1] * k); }
            g.closePath();
            g.fillStyle = "#fff"; g.strokeStyle = "#fff";
            g.lineJoin = "round"; g.lineWidth = S.rozszerz * 2 * k;
            g.fill(); g.stroke();
            IPlotno warstwa(string tryb)
            {
                var c = Plotno.Nowe(logo.width, logo.height);
                c.drawImage(logo, 0, 0);
                c.globalCompositeOperation = tryb;
                c.drawImage(maska, 0, 0);
                c.globalCompositeOperation = "source-over";
                return c;
            }
            var xs = S.obrys.Select(p => p[0]).ToList(); var ys = S.obrys.Select(p => p[1]).ToList();
            return new WarstwyLogo
            {
                tlo = warstwa("destination-out"), serce = warstwa("destination-in"),
                cx = ((xs.Min() + xs.Max()) / 2) * k, cy = ((ys.Min() + ys.Max()) / 2) * k,
            };
        }

        /// <summary>O ile serce jest teraz powiększone (1 = spoczynek): „lub-dub” i przerwa.</summary>
        static double bicie(double teraz)
        {
            var S = M.serce;
            var t = teraz % S.okresMs;
            double s = 1;
            foreach (var u in S.uderzenia)
            {
                var d = t - u.od * S.okresMs;
                if (d < 0) continue;
                // szybki skurcz w górę, wolniejsze rozluźnienie
                var f = d < S.narastanieMs ? JsMath.Sin((d / S.narastanieMs) * Math.PI / 2)
                    : Math.Max(0, 1 - wygladz((d - S.narastanieMs) / S.opadanieMs));
                s += u.sila * f;
            }
            return s;
        }

        sealed class Pozycja { public string id = "", etykieta = "", plik = ""; public Func<bool> aktywna = () => true; }

        /// <summary>
        /// Przycisk z rysunku (decyzja użytkownika 15.11): biała kreska na przezroczystości, zabarwiona raz na barwę napisu
        /// i napisu wybranego. Ozdobniki mają w pliku OZDOBNIK_PX px wysokości (narzedzia/menu/przyciski.py).
        /// </summary>
        sealed class Przycisk { public IPlotno zwykly = null!, wybrany = null!; public double w, h; }
        const double OZDOBNIK_PX = 300;
        readonly Dictionary<string, Przycisk?> przyciski = new Dictionary<string, Przycisk?>();

        Przycisk? przycisk(Pozycja p)
        {
            if (przyciski.TryGetValue(p.id, out var gotowy)) return gotowy;
            Przycisk? wynik = null;
            var img = Plotno.Wczytaj($"grafika/menu/przyciski/{p.plik}.png");
            if (img.complete && img.width > 0)
                wynik = new Przycisk { zwykly = zabarw(img, M.napis), wybrany = zabarw(img, M.napisWybrany), w = img.width, h = img.height };
            przyciski[p.id] = wynik;      // brak pliku — zostaje dawny napis pismem z ozdobnikami
            return wynik;
        }
        sealed class Trafienie { public double x, y, w, h; public int i; }
        sealed class Znak { public Typ_MENU_zespol z = null!; public IObraz obraz = null!; public double podsw; public Obszar? traf; }

        public override string nazwa => "menu";
        int wybrana;
        string komunikat = "";
        double komunikatOd;
        List<Trafienie> trafienia = new List<Trafienie>();
        double wejscieOd;
        IObraz? logo;
        IPlotno? logoBarwne;
        WarstwyLogo? warstwyLogo;
        bool logoGotowe;
        /// <summary>Znaki zespołu — przyciski; `podsw` to podświetlenie pod myszą (0..1), `traf` — miejsce na ekranie.</summary>
        readonly List<Znak> zespol;
        int najechanyZnak = -1;
        double ostatniaKlatka;
        readonly List<Pozycja> pozycje;
        readonly IKontekst app;

        public EkranMenu(IKontekst app)
        {
            this.app = app;
            zespol = M.zespol.Select(z => new Znak { z = z, obraz = Plotno.Wczytaj($"grafika/menu/zespol-{z.plik}.png") }).ToList();
            pozycje = new List<Pozycja>
            {
                new Pozycja { id = "wroc", etykieta = M.pozycje.wroc.etykieta, plik = "graj-dalej", aktywna = () => trwaGra() },
                new Pozycja { id = "nowa", etykieta = M.pozycje.nowa.etykieta, plik = "nowa-gra" },
                new Pozycja { id = "wczytaj", etykieta = M.pozycje.wczytaj.etykieta, plik = "wczytaj-gre", aktywna = () => Zapisy.hasSave() },
                new Pozycja { id = "samouczek", etykieta = M.pozycje.samouczek.etykieta, plik = "samouczek" },
                new Pozycja { id = "bestiariusz", etykieta = M.pozycje.bestiariusz.etykieta, plik = "atlas" },
                new Pozycja { id = "osiagniecia", etykieta = M.pozycje.osiagniecia.etykieta, plik = "osiagniecia" },
                new Pozycja { id = "ustawienia", etykieta = M.pozycje.ustawienia.etykieta, plik = "ustawienia" },
            };
        }

        /// <summary>Logo wczytuje się przy pierwszym rysunku (w TS: Image w tle; do wczytania nic się nie rysuje).</summary>
        void wczytajLogo()
        {
            if (logoGotowe) return;
            logo ??= Plotno.Wczytaj("grafika/menu/logo-trzewia.png");
            if (!logo.complete || logo.width == 0) return;
            logoGotowe = true;
            logoBarwne = zabarw(logo, M.logoBarwa);
            try { warstwyLogo = rozdzielSerce(logoBarwne); } catch { /* bez bicia — całe logo */ }
        }

        bool trwaGra()
        {
            var gra = app.ekran("gra") as EkranGry;
            return gra?.sim != null && gra.sim.tick > 0 && gra.sim.ending == null;
        }

        /// <summary>Dane wejścia: komunikat (np. po końcu gry) — w TS `{ komunikat }`.</summary>
        public sealed class Dane { public string? komunikat; }

        public override void wejdz(object? dane)
        {
            wejscieOd = Wydajnosc.Teraz();
            app.muzyka.ustawScene("menu");
            app.muzyka.ustawNapiecie(0);
            var k = (dane as Dane)?.komunikat;
            if (!string.IsNullOrEmpty(k)) { komunikat = k; komunikatOd = Wydajnosc.Teraz(); }
            // po identyfikatorach, nie po numerach — spis bywa zmieniany
            int ind(string id) => pozycje.FindIndex(p => p.id == id);
            wybrana = trwaGra() ? ind("wroc") : ind(ustawienia.samouczekZrobiony ? "nowa" : "samouczek");
            if (!pozycje[wybrana].aktywna()) wybrana = ind("nowa");
        }

        public override void krok(double dt, double teraz) { /* menu żyje własnym zegarem */ }

        public override void rysuj(IPlotno ctx, double w, double h, double teraz)
        {
            wczytajLogo();
            var odWejscia = teraz - wejscieOd;
            var ruch = ustawienia.oddech && !ustawienia.ograniczRuch;
            ctx.save();
            ctx.fillStyle = M.tlo;
            ctx.fillRect(0, 0, w, h);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";

            var m = Math.Max(M.marginesMin, h * M.margines);

            // ---- logo: pośrodku u góry
            var proporcja = logoGotowe ? (double)logo!.width / logo.height : 1.62;
            var lh = h * M.logoWysokosc;
            var lw = lh * proporcja;
            var maxLw = w * M.logoMaxSzer;
            if (lw > maxLw) { lw = maxLw; lh = lw / proporcja; }
            var ly = h * M.logoGora;
            if (logoBarwne != null)
            {
                ctx.globalAlpha = wygladz(odWejscia / M.wejscieMs);
                var lx = w / 2 - lw / 2;
                var wl = warstwyLogo;
                if (wl != null && ruch)
                {
                    // tło stoi, serce bije wokół swojego środka
                    ctx.drawImage(wl.tlo, lx, ly, lw, lh);
                    double k = lw / wl.tlo.width, cx = lx + wl.cx * k, cy = ly + wl.cy * k, s = bicie(teraz);
                    ctx.save();
                    // „lighter”: na miękkiej krawędzi obrysu tło i serce sumują się dokładnie do oryginału
                    // (zwykłe nakładanie zostawiało tam szarą obwódkę); tło menu jest czarne, więc nic się nie przejaśnia
                    ctx.globalCompositeOperation = "lighter";
                    ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
                    ctx.drawImage(wl.serce, lx, ly, lw, lh);
                    ctx.restore();
                }
                else ctx.drawImage(logoBarwne, lx, ly, lw, lh);
                ctx.globalAlpha = 1;
            }

            // ---- spis: pod logo, pośrodku; na niskim ekranie gęstnieje, potem pismo maleje
            var n = pozycje.Count;
            var r = Math.Max(M.spisRozmiarMin, Math.Min(M.spisRozmiarMax, h * M.spisRozmiar));
            var odstep = r * M.spisOdstep;
            var podLogo = ly + lh;
            double start() => podLogo + r * M.spisPodLogo + r * 0.55;
            for (var k = 0; k < 16 && start() + (n - 1) * odstep + r * 0.5 > h - m; k++)
            {
                if (odstep > r * 1.35) odstep = Math.Max(r * 1.35, (h - m - r * 0.5 - start()) / (n - 1));
                else { r *= 0.94; odstep = r * 1.35; }
            }
            var y0 = start();
            ctx.font = $"{JS.S(r)}px {Ink.SERIF}";
            double oz = r * M.ozdobnikSzer, ozOd = r * M.ozdobnikOdstep;
            // przycisk z rysunku: wysokość tak, żeby ozdobnik miał r × przyciskOzdobnik; szerokość z proporcji pliku
            double wysPrzycisku(Przycisk b) => r * M.przyciskOzdobnik * b.h / OZDOBNIK_PX;
            var szerWiersza = pozycje.Max(p => przycisk(p) is { } b ? wysPrzycisku(b) * b.w / b.h : ctx.measureText(p.etykieta).width + 2 * (oz + ozOd)) + r;
            trafienia = new List<Trafienie>();
            ctx.textAlign = "center";
            ctx.textBaseline = "alphabetic";
            for (var i = 0; i < n; i++)
            {
                var p = pozycje[i];
                var dostepna = p.aktywna();
                var wybrane = i == wybrana && dostepna;
                var y = y0 + i * odstep;
                var wejscieP = wygladz((odWejscia - M.spisOd - i * M.pozycjaOpoznienie) / M.pozycjaCzas);
                var alfa = (dostepna ? 1 : M.alfaNieaktywnej) * wejscieP;
                var b = przycisk(p);
                if (b != null)
                {
                    // rysunek: cały w barwie napisu (wybrany — jaśniejszy, z poświatą wzdłuż kreski), środek ozdobników
                    // na wysokości środka małych liter — tam, gdzie stały ozdobniki przy napisie pismem
                    double bh = wysPrzycisku(b), bw = bh * b.w / b.h;
                    ctx.save();
                    ctx.globalAlpha = alfa;
                    if (wybrane)
                    {
                        var puls = ruch ? 0.8 + 0.2 * JsMath.Sin(teraz * 0.003) : 1;
                        ctx.shadowColor = $"rgba({M.poswiata},{JS.S(0.85 * puls)})";
                        ctx.shadowBlur = r * M.poswiataRozmycie;
                    }
                    ctx.drawImage(wybrane ? b.wybrany : b.zwykly, w / 2 - bw / 2, y - r * 0.3 - bh / 2, bw, bh);
                    ctx.restore();
                    trafienia.Add(new Trafienie { x = w / 2 - szerWiersza / 2, y = y - odstep * 0.5 - r * 0.3, w = szerWiersza, h = odstep, i = i });
                    continue;
                }
                ctx.font = $"{JS.S(r)}px {Ink.SERIF}";
                var szer = ctx.measureText(p.etykieta).width;
                ctx.save();
                if (wybrane)
                {
                    var puls = ruch ? 0.8 + 0.2 * JsMath.Sin(teraz * 0.003) : 1;
                    ctx.shadowColor = $"rgba({M.poswiata},{JS.S(0.85 * puls * alfa)})";
                    ctx.shadowBlur = r * M.poswiataRozmycie;
                }
                ctx.fillStyle = rgba(wybrane ? M.napisWybrany : M.napis, alfa);
                ctx.fillText(p.etykieta, w / 2, y);
                // ozdobniki na wysokości środka małych liter; przy wybranej przysuwają się do napisu
                var yo = y - r * 0.3;
                var przysun = wybrane ? -r * 0.06 : 0;
                var barwaOz = wybrane ? M.ozdobnikWybrany : M.ozdobnik;
                ozdobnik(ctx, w / 2 - szer / 2 - ozOd - przysun, yo, oz, -1, barwaOz, alfa);
                ozdobnik(ctx, w / 2 + szer / 2 + ozOd + przysun, yo, oz, 1, barwaOz, alfa);
                ctx.restore();
                trafienia.Add(new Trafienie { x = w / 2 - szerWiersza / 2, y = y - odstep * 0.5 - r * 0.3, w = szerWiersza, h = odstep, i = i });
            }

            // ---- znaki zespołu: lewy dolny róg
            var wejscieZ = wygladz((odWejscia - M.zespolOd) / M.wejscieMs);
            var gotowe = zespol.Where(z => z.obraz.complete && z.obraz.width > 0).ToList();
            if (gotowe.Count > 0 && wejscieZ > 0)
            {
                var wymiary = gotowe.Select(z => { var zh = h * z.z.wysokosc; return (z, zh, zw: zh * z.obraz.width / z.obraz.height); }).ToList();
                var odst = h * M.zespolOdstep;
                var calosc = wymiary.Sum(d => d.zw) + odst * (wymiary.Count - 1);
                var najwyzszy = wymiary.Max(d => d.zh);
                // rząd kończy się przed spisem (i przed ozdobnikami) z zapasem
                var k = Math.Min(1, (w / 2 - szerWiersza / 2 - r * 1.2 - m) / calosc);
                var x = m;
                var dt = Math.Min(100, teraz - (ostatniaKlatka != 0 ? ostatniaKlatka : teraz));
                foreach (var z in zespol) z.traf = null;
                if (k * najwyzszy >= 20)
                {
                    var srodekY = h - m - (najwyzszy * k) / 2;
                    foreach (var d in wymiary)
                    {
                        var z = d.z; double zw = d.zw * k, zh = d.zh * k, zy = srodekY - zh / 2;
                        var cel = zespol.IndexOf(z) == najechanyZnak ? 1 : 0;
                        z.podsw += Math.Sign(cel - z.podsw) * Math.Min(Math.Abs(cel - z.podsw), dt / M.zespolPodswietlenieMs);
                        var a = wygladz(z.podsw);
                        ctx.save();
                        ctx.globalAlpha = (M.zespolAlfa + (M.zespolAlfaNajechany - M.zespolAlfa) * a) * wejscieZ;
                        if (a > 0)
                        {
                            // cień płótna liczy się z przezroczystości obrazka — świeci tylko wokół kresek, nie prostokąt;
                            // dwa przebiegi: szeroka poświata i ciaśniejsza, jaśniejsza obwódka tuż przy konturach
                            ctx.shadowColor = $"rgba({M.zespolPoswiata},{JS.S(0.9 * a)})";
                            ctx.shadowBlur = Math.Max(M.zespolRozmycieMin, zh * M.zespolRozmycie);
                            ctx.drawImage(z.obraz, x, zy, zw, zh);
                            ctx.shadowBlur = Math.Max(3, zh * M.zespolRozmycie * 0.35);
                            ctx.drawImage(z.obraz, x, zy, zw, zh);
                            ctx.shadowColor = "transparent";
                        }
                        ctx.drawImage(z.obraz, x, zy, zw, zh);
                        ctx.restore();
                        var zapas = Math.Max(4, zh * 0.08);
                        z.traf = new Obszar { x = x - zapas, y = zy - zapas, w = zw + zapas * 2, h = zh + zapas * 2 };
                        x += zw + odst * k;
                    }
                }
            }
            ostatniaKlatka = teraz;
            // Prawa strona (szkic: „tu tę trójkę dam”) zostaje pusta — na przyszłą grafikę.

            stopka(ctx, w, h, teraz, m, wygladz(odWejscia / M.wejscieMs));
            ctx.restore();
        }

        void stopka(IPlotno ctx, double w, double h, double teraz, double m, double alfa)
        {
            ctx.save();
            ctx.shadowBlur = 0;
            if (komunikat != "" && teraz - komunikatOd < M.komunikatMs)
            {
                ctx.textAlign = "center";
                ctx.font = $"italic {JS.S(Math.Max(14, Math.Min(22, h / 42)))}px {Ink.SERIF}";
                ctx.fillStyle = rgba(M.napisWybrany, 0.85 * Math.Min(1, (M.komunikatMs - (teraz - komunikatOd)) / 900));
                ctx.fillText(komunikat, w / 2, h - Math.Max(10, m * 0.35));
            }
            // wersja gry — małym drukiem w prawym dolnym rogu
            ctx.font = $"italic {JS.S(Math.Max(11, Math.Min(15, h / 70)))}px {Ink.SERIF}";
            ctx.fillStyle = rgba(M.napis, 0.4 * alfa);
            ctx.textAlign = "right";
            ctx.fillText(M.wersja, w - Math.Max(10, m * 0.5), h - Math.Max(10, m * 0.5));
            ctx.restore();
        }

        void uruchom(int i)
        {
            if (i < 0 || i >= pozycje.Count) return;
            var p = pozycje[i];
            if (!p.aktywna()) return;
            app.gesty.klik();
            if (p.id == "wroc") app.idz("gra");
            // jedna trudność — Koszmar; nowa gra zaczyna się od razu
            else if (p.id == "nowa") app.idz("gra", "nowa");
            else if (p.id == "osiagniecia") app.idz("osiagniecia");
            else if (p.id == "wczytaj") app.idz("gra", "wczytaj");
            else if (p.id == "samouczek") app.idz("samouczek");
            else if (p.id == "bestiariusz") app.idz("bestiariusz");
            else if (p.id == "ustawienia") app.idz("ustawienia");
        }

        public override void dotyk(Wskaznik e, Faza faza)
        {
            // znaki zespołu: przyciski (na razie bez linków — kliknięcie nic nie robi)
            var znak = zespol.FindIndex(z => z.traf is { } t && e.clientX >= t.x && e.clientX <= t.x + t.w && e.clientY >= t.y && e.clientY <= t.y + t.h);
            if (faza == Faza.ruch || faza == Faza.dol) najechanyZnak = znak;
            if (znak >= 0)
            {
                var link = zespol[znak].z.link;
                if (faza == Faza.dol && !string.IsNullOrEmpty(link)) { app.gesty.klik(); Gospodarz.OtworzAdres?.Invoke(link); }
                return;
            }
            var traf = trafienia.FirstOrDefault(t => e.clientX >= t.x && e.clientX <= t.x + t.w && e.clientY >= t.y && e.clientY <= t.y + t.h);
            // nieaktywna pozycja (np. „Graj dalej” bez gry) nie zabiera wyróżnienia
            if (traf == null || !pozycje[traf.i].aktywna()) return;
            if (faza == Faza.ruch) { wybrana = traf.i; return; }
            if (faza == Faza.dol) { wybrana = traf.i; uruchom(traf.i); }
        }

        public override void klawisz(Akcja? akcja, Klawisz e)
        {
            void dalej(int kier)
            {
                var i = wybrana;
                for (var k = 0; k < pozycje.Count; k++)
                {
                    i = (i + kier + pozycje.Count) % pozycje.Count;
                    if (pozycje[i].aktywna()) break;
                }
                wybrana = i;
            }
            if (e.key == "ArrowDown") { dalej(1); return; }
            if (e.key == "ArrowUp") { dalej(-1); return; }
            if (e.key == "Enter" || e.key == " ") { uruchom(wybrana); return; }
            if (akcja == Akcja.menu && trwaGra()) uruchom(0);
        }
    }
}
