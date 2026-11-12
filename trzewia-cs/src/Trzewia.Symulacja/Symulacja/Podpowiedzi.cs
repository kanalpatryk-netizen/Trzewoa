// Port: alpha-1/src/sim/podpowiedzi.ts — jedno zdanie o tym, co w tej chwili warto zrobić (pasek podpowiedzi w grze).
using System;
using System.Collections.Generic;
using Trzewia.Js;
using Trzewia.Nastawy;
using static Trzewia.Nastawy.NastawyRytual;
using static Trzewia.Nastawy.NastawyLud;
using static Trzewia.Nastawy.NastawyLoch;
using static Trzewia.Symulacja.Races;
using static Trzewia.Symulacja.Tiles;
using static Trzewia.Symulacja.Pielgrzymka;
using static Trzewia.Symulacja.LinaWiadra;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    /// <summary>Cel podpowiedzi; `klan` — pierścień siedziby, który idzie za nią, gdy siedziba się przeniesie.</summary>
    public sealed class CelPodpowiedzi
    {
        public double x, y, r;
        public string tekst = "";
        public double? klan;
    }

    public sealed class Podpowiedz
    {
        public string tekst = "";
        public CelPodpowiedzi? cel;
        public double waga;
    }

    public static class Podpowiedzi
    {
        /// <summary>Remake v2: podpis siedziby (jedzenie jest w wiadrach, nie w spiżarni).</summary>
        public static string podpisSiedziby(Sim _sim, Clan _k) => "siedziba";

        /// <summary>
        /// Jedno zdanie o tym, co w tej chwili warto zrobić. Sandbox bez takiego zdania jest
        /// nieczytelny: gracz widzi mrowisko i nie wie, czego od niego chcą.
        /// Podpowiedzi czytają stan świata, nie skrypt.
        /// </summary>
        public static Podpowiedz podpowiedz(Sim sim)
        {
            var kandydaci = new List<Podpowiedz>();
            // od rozpadu pomnika do końca walki pierścień siedziby nie ma sensu (siedziba bywa wtedy w krypcie, pod bossem)
            var walka = (sim.lud.pomnik?.faza ?? "stoi") != "stoi";

            // 1. ktoś wymiera — to najpilniejsze, bo monokultura cię usypia.
            // Nie na starcie: świeża góra ma z natury dwa–trzy trole i pierwsze zdanie gry
            // nie może brzmieć „Trole są o krok od wygaśnięcia".
            for (int r = 0; sim.tick > 2000 && r < 5; r++)
            {
                if (r == Race.HUMAN) continue;
                var ilu = sim.popByRace[r];
                if (ilu == 0 || ilu > 4) continue;
                // tylko klan, który naprawdę jeszcze żyje — pierścień na pustym gnieździe to kłamstwo
                var klan = Pierwszy(sim.clans.FindAll(k => !k.dead && k.race == r && k.pop > 0), (a, b) => b.pop - a.pop);
                var nazwa = RACES[r].name;
                // „kop w dół" ma sens tylko dla kogoś, kto już siedzi dość nisko — inaczej
                // podpowiedź każe wysyłać w otchłań kogoś z samej powierzchni
                var glebocy = sim.creatures.Exists(c => !c.dead && c.race != Race.HUMAN
                    && c.race != Race.TROLL && sim.world.depth(c.y) > 0.5);
                // WERSJA ANDROID: tylko to, co gracz ma — Nakarm, Szepnij, Cud i wybory na kartach
                var rada = r == Race.DWARF ? "Żyją z ognia kuźni — gdy odsłoni się ruda, daj ją im, a wykują nowych."
                    : r == Race.TROLL ? (glebocy
                        ? "Trole rodzą się z szaleńców w głębi — przy żyle szaleństwa wybierz „zostaw”."
                        : "Trole rodzą się z szaleńców w głębi; ktoś musi tam najpierw zejść.")
                    : "Nakarm ich — przeciągnij palcem po ich jaskini.";
                kandydaci.Add(new Podpowiedz
                {
                    tekst = $"{nazwa} {odmien(r, "jest", "są")} o krok od wygaśnięcia. {rada}",
                    cel = klan != null && !walka ? new CelPodpowiedzi { x = klan.hx, y = klan.hy, r = 5, tekst = REMAKE ? podpisSiedziby(sim, klan) : nazwa, klan = klan.id } : null,
                    waga = 100 - ilu,
                });
            }

            // 2. jedna rasa rośnie ponad miarę
            var rytualnyKlan = sim.rytual.klan >= 0 && sim.rytual.postep > 0.05 ? JS.At(sim.clans, sim.rytual.klan) : null;
            // (Alpha: jeden lud zawsze „bierze górę”, a szeptu „prorokuj” nie ma — ta rada zasłaniała wszystkie inne)
            // rytualnyKlan?.race !== sim.domRace: brak klanu (undefined) też jest „różny”
            if (!REMAKE && sim.dominance > 0.72 && sim.domRace >= 0 && (rytualnyKlan == null || rytualnyKlan.race != sim.domRace))
            {
                var nazwa = RACES[(int)sim.domRace].name;
                var klan = Pierwszy(sim.clans.FindAll(k => !k.dead && k.race == sim.domRace && k.pop > 0), (a, b) => b.pop - a.pop);
                kandydaci.Add(new Podpowiedz
                {
                    tekst = $"{nazwa} {odmien(sim.domRace, "bierze", "biorą")} górę. Szepnij komuś z nich „prorokuj” — nacja pęknie na dwie. Klęski z kart kieruj na nich.",
                    cel = klan != null && !walka ? new CelPodpowiedzi { x = klan.hx, y = klan.hy, r = 5, tekst = REMAKE ? podpisSiedziby(sim, klan) : nazwa, klan = klan.id } : null,
                    waga = 80 + sim.dominance * 20,
                });
            }

            // 3. senność
            if (sim.sen > 0.25)
                kandydaci.Add(new Podpowiedz { tekst = "Zasypiasz. Jedna nacja zjada resztę — szepnij komuś z niej „prorokuj”, a klan pęknie na dwa.", waga = 90 });

            // 4. głód powszechny
            double glodni = 0, zywi = 0;
            foreach (var c in sim.creatures) { if (c.dead) continue; zywi++; if (c.hunger > 0.7) glodni++; }
            if (zywi > 0 && glodni / zywi > 0.45)
                kandydaci.Add(new Podpowiedz { tekst = "Większość twoich mieszkańców głoduje. Nakarm ich — dotknij miejsca, gdzie stoją, a zjedzie tam wiadro.", waga = 70 });

            // 5. Wiara wysycha — brak ołtarzy
            double oltarze = 0;
            foreach (var t in sim.world.tile.d) if (t == T.SHRINE || t == T.GLYPH) oltarze++;
            if (sim.wiara < 40 && oltarze < 2 && zywi > 6)
                kandydaci.Add(new Podpowiedz { tekst = "Nikt się do ciebie nie modli. Zrób Cud przy gnieździe, a gdy odsłoni się ruda — daj ją Ślepemu Ludowi na ołtarz.", waga = 60 });

            // 6.11: pod zamkniętą stalową bramą lochu ktoś czeka — bramę podnoszą tylko zaklęcia dwóch pobożnych przy kotle
            {
                var w = sim.world;
                var b = sim.lud.brama;
                if (w.brama.x1 >= w.brama.x0 && !(b?.wolne == true) && !(b != null && b.zaklina >= BRAMA.potrzeba)
                    && sim.creatures.Exists(c => !c.dead && c.straznik != true && c.race == Race.GOBLIN && w.wPrzedprozu(c.x, c.y)))
                {
                    kandydaci.Add(new Podpowiedz
                    {
                        tekst = $"Pod stalową bramą lochu czekają twoi. Zaznacz {JS.S(BRAMA.potrzeba)} pobożnych i wyślij ich „Do kotła” w starej komnacie — ich zaklęcia podniosą bramę (40 s do pełna), a potem krata powoli opadnie.",
                        cel = new CelPodpowiedzi { x = w.kociol.x + 0.5, y = w.kociol.y, r = 5, tekst = "kocioł" },
                        waga = 88,
                    });
                }
            }

            // 6. rytuał: jedyna droga do końca gry musi być widoczna, gdy staje się możliwa
            var najwierniejszy = Pierwszy(sim.clans.FindAll(k => !k.dead && k.pop > 2), (a, b) => b.devotion - a.devotion);
            if (sim.rytual.postep > 0.02 || sim.rytual.wierni >= RYTUAL.potrzebaWiernych)
            {
                kandydaci.Add(new Podpowiedz
                {
                    tekst = "Twoi wierni modlą się w krypcie i kruszą Wielki Pomnik. Nie przeszkadzaj im — i nie daj im umrzeć z głodu.",
                    cel = new CelPodpowiedzi { x = sim.world.coreX, y = sim.world.przedsionekY, r = 7, tekst = "rytuał" },
                    waga = 85,
                });
            }
            else if (najwierniejszy != null && najwierniejszy.devotion > PIELGRZYMKA.oddanieNacji)     // próg pielgrzymki
            {
                // Warta pod rdzeniem żyje z tego, co rośnie przy przedsionku. Z grzybem schodzi
                // i bez drogi powrotnej; drogę do domu można jej wydrążyć, ale nie trzeba.
                var w = sim.world;
                // (Alpha: warcie jedzenie z jedynego wiadra donoszą robotnicy — Nakarm i tak spuszcza je tylko szybem do sali)
                if (!REMAKE && sim.jedzeniePrzedsionka < PIELGRZYMKA.jedzenieWPrzedsionku)
                {
                    kandydaci.Add(new Podpowiedz
                    {
                        tekst = $"{najwierniejszy.name} wierzą dość mocno, by zejść pod twój rdzeń. {(REMAKE ? "Spuść wiadro nad przedsionek rytem „Nakarm”" : "Nakarm przedsionek nad rdzeniem")} — z tym jedzeniem ich warta przeżyje pod skorupą.",
                        cel = new CelPodpowiedzi { x = w.coreX, y = w.przedsionekY, r = 7, tekst = "nakarm tutaj" },
                        waga = 65,
                    });
                }
                else
                {
                    var plan = najwierniejszy.powrotOk == false ? aktualnyPlan(sim) : null;
                    if (plan != null && plan.kopac.Count > 0)
                    {
                        var i = plan.kopac[plan.kopac.Count - 1];
                        kandydaci.Add(new Podpowiedz
                        {
                            tekst = $"{sim.clans[plan.klan].name} schodzą do krypty. Jeśli chcesz, żeby wracali, zaznacz robotników i każ im kopać drogę wiernych — szyb ze schodami od wnęki przy sali.",
                            cel = new CelPodpowiedzi { x = (i % w.w) + 0.5, y = JS.ToInt32(i / w.w) + 0.5, r = 3, tekst = "drąż tutaj" },
                            waga = 35,
                        });
                    }
                    else
                    {
                        kandydaci.Add(new Podpowiedz
                        {
                            tekst = $"{najwierniejszy.name} schodzą do krypty pod Wielkim Pomnikiem. {(REMAKE ? "Pilnuj, żeby wiadra docierały do warty przy przedsionku." : "Pilnuj, żeby grzyb przy przedsionku nie zniknął.")}",
                            cel = new CelPodpowiedzi { x = w.coreX, y = w.przedsionekY, r = 7, tekst = "przedsionek" },
                            waga = 35,
                        });
                    }
                }
            }

            // 6b. droga do wolności, krok „oddanie": nikt jeszcze nie wierzy dość mocno
            // (Alpha: lud ma stałe sześć głów — próg „dużej nacji” go nie dotyczy; liczy się tylko twój lud)
            var duzeWierne = Pierwszy(sim.clans.FindAll(k => !k.dead && (REMAKE ? k.race == Race.GOBLIN && k.pop > 0 : k.pop >= 8) && RACES[k.race].faithGain > 0),
                (a, b) => b.devotion - a.devotion);
            if (sim.tick > 3000 && !walka && sim.rytual.pekniecia == 0 && duzeWierne != null && duzeWierne.devotion <= PIELGRZYMKA.oddanieNacji)
            {
                kandydaci.Add(new Podpowiedz
                {
                    tekst = REMAKE
                        ? "Żeby cię uwolnić, lud musi uwierzyć mocniej. Zrób Cud przy siedzibie albo szepnij pobożnym „módl się”."
                        : $"Żeby cię uwolnić, jedna nacja musi uwierzyć mocniej. {duzeWierne.name} są najbliżej — postaw Znak przy ich gnieździe albo szepnij pobożnym „módl się”.",
                    cel = new CelPodpowiedzi { x = duzeWierne.hx, y = duzeWierne.hy, r = 5, tekst = REMAKE ? podpisSiedziby(sim, duzeWierne) : duzeWierne.name, klan = duzeWierne.id },
                    waga = 25,
                });
            }

            // 6c. Alpha, etap 3b: żelaza jeszcze nikt nie wykuł, a robotnik stoi bez rozkazu — najbliższa kępa rudy pod siedzibą
            // (ponad „zrób Cud” z 6b i „przedsionek” z 6: kółko podpowiada, co dać bezczynnemu; głód i rytuał ją przykryją)
            var lud = sim.clans.Find(k => !k.dead && k.race == Race.GOBLIN);
            var bezczynny = sim.creatures.Exists(c => !c.dead && c.race == Race.GOBLIN && c.rola == "robotnik" && c.polecenie == null);
            if (lud != null && bezczynny && sim.tick > 3600 && sim.zelazo == 0)
            {
                var w = sim.world;
                (double x, double y)? best = null;
                double bestD = double.PositiveInfinity;
                for (var y = lud.hy; y < Math.Min(w.h, lud.hy + 50); y++)
                {
                    for (var x = Math.Max(0, lud.hx - 50); x < Math.Min(w.w, lud.hx + 50); x++)
                    {
                        if (w.tile[w.idx(x, y)] != T.ORE) continue;
                        var d = Math.Abs(x - lud.hx) + Math.Abs(y - lud.hy);
                        if (d < bestD) { bestD = d; best = (x, y); }
                    }
                }
                if (best != null)
                {
                    kandydaci.Add(new Podpowiedz
                    {
                        tekst = "Pod salą leży rdzawa ruda. Zaznacz robotnika i wskaż ją — wykuje całą kępę, a żelazo samo spłynie do licznika.",
                        cel = new CelPodpowiedzi { x = best.Value.x, y = best.Value.y, r = 3, tekst = "żelazo" },
                        waga = 40,
                    });
                }
            }

            // 6d. Alpha, etap 4: dłoń z otchłani przecięła linę wiadra — póki nikt jej nie skleja, to najpilniejsze po wymieraniu
            var lp = linaPrzecieta(sim);
            if (lp != null && sklejajacy(sim) == null && !sim.creatures.Exists(c => !c.dead && c.polecenie?.typ == "naprawa"))
            {
                kandydaci.Add(new Podpowiedz
                {
                    tekst = "Lina wiadra jest przecięta — z góry nic nie zjedzie. Pod płytą „napraw linę wiadra”: ktoś pójdzie, wespnie się i ją sklei.",
                    cel = new CelPodpowiedzi { x = lp.x + 0.5, y = lp.koniec, r = 3, tekst = "przecięta lina" },
                    waga = 95,
                });
            }

            // 7. sporo krwi na koncie
            if (sim.krew > 260 && kandydaci.Count == 0)
                kandydaci.Add(new Podpowiedz { tekst = "Krwi masz dość. Wydrąż komuś drogę do rudy albo odetnij sąsiadów zawałem.", waga = 30 });

            if (kandydaci.Count == 0)
                return new Podpowiedz { tekst = "Nic pilnego. Pod płytą jest twoja drużyna — dotknij medalionu albo postaci i wskaż na mapie, dokąd ma iść.", waga = 0 };
            JS.Sort(kandydaci, (a, b) => b.waga - a.waga);
            return kandydaci[0];
        }

        /// <summary>lista.sort(porównanie)[0] — pierwszy po sortowaniu (stabilnym, jak w V8) albo null.</summary>
        static Clan? Pierwszy(List<Clan> lista, Func<Clan, Clan, double> porownaj) => lista.Count == 0 ? null : JS.Sort(lista, porownaj)[0];
    }
}
