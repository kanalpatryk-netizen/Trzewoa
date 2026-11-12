// Port: alpha-1/src/sim/creatures.ts — część 5: krok, krokKopiac, walkToLud, walkTo, digTile
using System;
using Trzewia.Nastawy;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyStworzenia;
using static Trzewia.Nastawy.NastawyLud;
using static Trzewia.Nastawy.NastawyLoch;
using static Trzewia.Nastawy.NastawySwiat;
using static Trzewia.Symulacja.Races;
using static Trzewia.Symulacja.Tiles;
using static Trzewia.Symulacja.Dziennik;
using static Trzewia.Symulacja.CechyNacji;
using static Trzewia.Symulacja.Lud;
using static Trzewia.Symulacja.Droga;
using static Trzewia.Symulacja.Kruszce;
using static Trzewia.Symulacja.Pielgrzymka;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    public static partial class Stworzenia
    {
        /// <summary>Jeden krok do sąsiedniego kafla drogi: w bok, w górę po ścianie albo w dół.</summary>
        static void krok(Sim sim, Creature c, double cel)
        {
            var w = sim.world;
            var d = RACES[c.race];
            double cx = Math.Floor(c.x), cy = Math.Floor(c.y);
            double nx = cel % w.w, ny = JS.ToInt32(cel / w.w);
            var speed = d.speed * mnoznik(sim, c, "szybkosc")
                * (w.water[w.idx(cx, cy)] > K.wodaSpowalniaOd ? K.wodaSpowalnia : 1)
                * (w.tile[w.idx(cx, cy)] == T.WEB && c.race != Race.SPINNER ? K.siecSpowalnia : 1);
            double doSrodka(double v) => Math.Max(-speed, Math.Min(speed, nx + 0.5 - v));
            // 6.11: po schodach kręconych drogi wiernych idzie się po spirali — w pionie wolniej niż szybem
            var naSchodach = w.schody[w.idx(cx, cy)] == 1 || w.schody[cel] == 1;
            if (ny < cy)
            {
                // Remake v2: lud wchodzi w górę tylko z podłogi, na stopień — z wiszenia już nie
                if (ludRuch(c) && !stoi(sim, cx, cy)) { c.droga = null; return; }
                c.wspina = sim.tick;
                c.x += doSrodka(c.x);
                c.y -= speed * (naSchodach ? SCHODY.wGore : K.wspinanie);
            }
            else if (ny > cy)
            {
                c.wspina = sim.tick;                        // schodzi, trzymając się ściany
                c.x += doSrodka(c.x);
                c.y += speed * (naSchodach ? SCHODY.wDol : K.schodzenie);
            }
            else
            {
                double dir = nx > cx ? 1 : -1;
                c.face = dir;
                // z wiszenia na półkę — nie puszcza się, dopóki nie stanie
                if (!w.solid(cx, cy + 1) && w.solid(nx, cy + 1)) c.wspina = sim.tick;
                // Alpha: krok nad dziurę trzyma się krawędzi
                if (ludRuch(c) && !w.solid(nx, cy + 1)) c.wspina = sim.tick;
                c.x += dir * speed;
            }
        }

        /// <summary>Remake v2: krok drogą przez skałę (`c.drogaKopie`). Zwraca false, gdy doszedł albo droga przestała pasować.</summary>
        static bool krokKopiac(Sim sim, Creature c)
        {
            var d = c.droga!;
            var w = sim.world;
            double cx = Math.Floor(c.x), cy = Math.Floor(c.y);
            var cur = w.idx(cx, cy);
            var i = c.drogaI ?? 0;
            var dalej = JS.IndexOf(d, cur, i);
            if (dalej >= 0) i = dalej + 1;
            c.drogaI = i;
            if (i >= d.Count) return false;
            var next = d[(int)i];
            double nx = next % w.w, ny = JS.ToInt32(next / w.w);
            if (Math.Abs(nx - cx) + Math.Abs(ny - cy) != 1) return false;
            var naPodlodze = stoi(sim, cx, cy);
            bool kuj(double x, double y)
            {
                if (!naPodlodze) return true;                  // w locie nie kuje — najpierw stanie
                if (w.hardness(x, y) <= 0) return false;       // nie do ruszenia — droga do wyrzucenia
                digTile(sim, c, x, y);
                return true;
            }
            if (w.solid(nx, ny)) return kuj(nx, ny);
            if (ny < cy)
            {
                // wejście na stopień: najpierw wolna półka przed sobą (kafel za stopniem)
                var n2 = JS.At(d, i + 1);
                if (n2 != null && w.solid(n2.Value % w.w, JS.ToInt32(n2.Value / w.w))) return kuj(n2.Value % w.w, JS.ToInt32(n2.Value / w.w));
            }
            krok(sim, c, next);
            return true;
        }

        /// <summary>Remake v2: lud na przełaj (bez wyliczonej drogi). True — na miejscu.</summary>
        static bool walkToLud(Sim sim, Creature c, double tx, double ty, bool mayDig)
        {
            var w = sim.world;
            var d = RACES[c.race];
            double dx = tx + 0.5 - c.x, dy = ty + 0.5 - c.y;
            if (Math.Abs(dx) < K.naMiejscuX && Math.Abs(dy) < K.naMiejscuY) { c.schody = null; return true; }
            double cx = Math.Floor(c.x), cy = Math.Floor(c.y);
            bool ogien(double x, double y)
            {
                for (var yy = y + 1; yy <= y + K.nadOgniemPatrzy && w.inb(x, yy); yy++)
                {
                    if (w.magma[w.idx(x, yy)] > 0) return true;
                    if (!w.passable(x, yy)) return false;
                }
                return false;
            }
            bool free(double x, double y) => w.passable(x, y) && w.water[w.idx(x, y)] <= K.toniePowyzej
                && w.magma[w.idx(x, y)] == 0 && !ogien(x, y);
            var speed = d.speed * mnoznik(sim, c, "szybkosc") * (w.water[w.idx(cx, cy)] > K.wodaSpowalniaOd ? K.wodaSpowalnia : 1);
            // kuje tylko robotnik
            var kopie = mayDig && d.digPower > 0 && rolaPostaci(c) == "robotnik";
            bool daSieKuc(double x, double y) => w.inb(x, y) && w.solid(x, y) && w.hardness(x, y) > 0 && w.get(x, y) != T.CORE;
            var wisi = (c.wspina ?? -9) >= sim.tick - K.trzymaSieTikow;
            var kier = Math.Abs(dx) < 0.5 ? c.face : JS.Sign(dx);

            if (!stoi(sim, cx, cy))
            {
                // w powietrzu albo przy ścianie: dokańcza wejście na stopień — półka tuż obok, na tej wysokości
                foreach (var k in new[] { kier, -kier })
                {
                    if (wisi && free(cx + k, cy) && stoi(sim, cx + k, cy)) { c.wspina = sim.tick; c.face = k; c.x += k * speed; return false; }
                }
                // spada albo zsuwa się; w locie odrobinę skręca ku celowi
                if (Math.Abs(dx) > 0.6 && free(cx + JS.Sign(dx), cy)) c.x += JS.Sign(dx) * speed * 0.5;
                return false;
            }

            // cel w dole, prawie pod nogami: kuje podłogę i zsuwa się w szyb
            if (dy > 1.2 && Math.Abs(dx) < 1 && kopie && daSieKuc(cx, cy + 1) && !ogien(cx, cy + 1)
                && glebiaPod(sim, cx, cy + 1, LUD.spadekMaks) <= LUD.spadekMaks)
            {
                digTile(sim, c, cx, cy + 1);
                return false;
            }

            // cel wyżej niż stopień: schody po skosie w stronę celu, kierunek trzymany do końca
            var dir = kier;
            if (dy < -1.5 && kopie)
            {
                if (c.schody == null) { var s = JS.Sign(dx); c.schody = JS.Tak(s) ? s : c.face; }
                dir = c.schody.Value;
            }
            else c.schody = null;
            c.face = dir;
            var nx = cx + dir;
            var wGore = dy < -1.5 && kopie;

            // krok w bok: wolne i nie przepaść
            if (free(nx, cy) && !przepasc(sim, nx, cy))
            {
                c.x += dir * speed;
                return false;
            }
            // stopień o jeden kafel
            if (w.solid(nx, cy) && free(nx, cy - 1) && free(cx, cy - 1))
            {
                c.wspina = sim.tick;
                c.y -= speed * K.stopien;
                return false;
            }
            if (kopie && w.solid(nx, cy))
            {
                if (wGore)
                {
                    if (daSieKuc(cx, cy - 1)) { digTile(sim, c, cx, cy - 1); return false; }
                    if (daSieKuc(nx, cy - 1)) { digTile(sim, c, nx, cy - 1); return false; }
                }
                else if (daSieKuc(nx, cy)) { digTile(sim, c, nx, cy); return false; }
            }
            // cel niżej, a przed nim przepaść albo skała nie do ruszenia — kuje w dół tu, gdzie stoi
            if (dy > 1.2 && kopie && daSieKuc(cx, cy + 1) && !ogien(cx, cy + 1) && glebiaPod(sim, cx, cy + 1, LUD.spadekMaks) <= LUD.spadekMaks)
            {
                digTile(sim, c, cx, cy + 1);
                return false;
            }
            // tędy nie przejdzie — obejście drugą stroną
            var alt = cx - dir;
            if (!wGore && free(alt, cy) && !przepasc(sim, alt, cy)) { c.x -= dir * speed * K.obejscie; c.face = -dir; return false; }
            return false;
        }

        /// <summary>Idzie w stronę celu; jak trzeba, wygryza sobie drogę. Tunel to ślad ich potrzeb.</summary>
        static bool walkTo(Sim sim, Creature c, double tx, double ty, bool mayDig = true)
        {
            if (ludRuch(c)) return walkToLud(sim, c, tx, ty, mayDig);
            var w = sim.world;
            var d = RACES[c.race];
            double dx = tx + 0.5 - c.x, dy = ty + 0.5 - c.y;
            if (Math.Abs(dx) < K.naMiejscuX && Math.Abs(dy) < K.naMiejscuY) return true;

            double cx = Math.Floor(c.x), cy = Math.Floor(c.y);
            bool deepWater(double x, double y) => !d.swims && w.inb(x, y) && w.water[w.idx(x, y)] > K.toniePowyzej;
            bool nadOgniemL(double x, double y)
            {
                for (var yy = y + 1; yy <= y + K.nadOgniemPatrzy && w.inb(x, yy); yy++)
                {
                    if (w.magma[w.idx(x, yy)] > 0) return true;
                    if (!w.passable(x, yy)) return false;
                }
                return false;
            }
            // Remake v1: lud nie wchodzi w przepaść — chyba że już w niej wisi albo spada
            var ostrozny = REMAKE && rolaPostaci(c) != null && c.job != Job.DESCEND;
            bool free(double x, double y) => w.passable(x, y) && !deepWater(x, y) && w.magma[w.idx(x, y)] == 0
                && !nadOgniemL(x, y);
            var speed = d.speed * mnoznik(sim, c, "szybkosc")
                * (w.water[w.idx(cx, cy)] > K.wodaSpowalniaOd ? K.wodaSpowalnia : 1)
                * (w.tile[w.idx(cx, cy)] == T.WEB && c.race != Race.SPINNER ? K.siecSpowalnia : 1);

            // ściana pod ręką: przy niej da się wisieć i podciągać
            bool sciana(double x, double y) => w.solid(x - 1, y) || w.solid(x + 1, y);
            var kopie = mayDig && d.digPower > 0;
            var wisi = (c.wspina ?? -9) >= sim.tick - K.trzymaSieTikow;

            // pion: cel wyraźnie wyżej albo niżej i nic nie stoi na drodze w poziomie
            if ((Math.Abs(dy) > 2.5 && Math.Abs(dx) < 3) || (Math.Abs(dy) > 1.2 && Math.Abs(dx) < 1))
            {
                var ny = cy + JS.Sign(dy);
                if (dy > 0 && free(cx, ny) && !(ostrozny && !sciana(cx, cy) && !sciana(cx, ny) && przepasc(sim, cx, ny)))
                {
                    if (sciana(cx, cy) || sciana(cx, ny)) c.wspina = sim.tick;
                    c.y += speed * K.schodzenieNaPrzelaj;
                    return false;
                }
                // w górę tylko po ścianie — w otwartej pustce nie ma się czego chwycić
                if (dy < 0 && free(cx, ny) && sciana(cx, ny)) { c.wspina = sim.tick; c.y -= speed * K.wspinanieNaPrzelaj; return false; }
                if (kopie && w.solid(cx, ny)) { digTile(sim, c, cx, ny); return false; }
            }

            var dir = Math.Abs(dx) < 0.5 ? c.face : JS.Sign(dx);
            c.face = dir;
            var nx = cx + dir;
            if (free(nx, cy) && !(ostrozny && przepasc(sim, nx, cy)))
            {
                if (wisi && w.solid(nx, cy + 1) && !w.solid(cx, cy + 1)) c.wspina = sim.tick;
                c.x += dir * speed;
                return false;
            }
            // Stopień: najpierw podciągnięcie do góry, potem krok na półkę.
            if (free(nx, cy - 1) && free(cx, cy - 1))
            {
                c.wspina = sim.tick;
                c.y -= speed * K.stopien;
                return false;
            }
            if (kopie && w.solid(nx, cy))
            {
                // cel wyżej: kują schody po skosie, a nie poziomy tunel pod nim
                if (dy < -1.5)
                {
                    if (w.solid(cx, cy - 1) && w.hardness(cx, cy - 1) > 0) { digTile(sim, c, cx, cy - 1); return false; }
                    if (w.solid(nx, cy - 1) && w.hardness(nx, cy - 1) > 0) { digTile(sim, c, nx, cy - 1); return false; }
                }
                digTile(sim, c, nx, cy);
                return false;
            }

            // droga zablokowana wodą albo skałą, której nie ugryzie — obejściem jest inna strona
            var alt = cx - dir;
            if (free(alt, cy)) { c.x -= dir * speed * K.obejscie; c.face = -dir; return false; }
            if (kopie && w.solid(cx, cy - 1)) { digTile(sim, c, cx, cy - 1); return false; }
            return false;
        }

        /// <summary>Gryzie kafel. Skała ustępuje powoli, ziemia od razu — i wtedy strop może nie wytrzymać.</summary>
        static void digTile(Sim sim, Creature c, double x, double y)
        {
            var w = sim.world;
            var t = w.get(x, y);
            var hard = w.hardness(x, y);
            if (hard <= 0) return;
            // Nikt przy zdrowych zmysłach nie przebija ściany, za którą płynie ogień (patrz TS)
            if (t != T.CORE && (c.mad < K.kopanieOgienSzalenstwo || c.race == Race.TROLL || (REMAKE && rolaPostaci(c) != null)) && c.job != Job.DESCEND
                && (sim.przyMagmie(x, y, K.kopanieOgienZasieg) || nadOgniem(sim, x, y)))
            {
                c.dig = 0; c.jt = 0; return;
            }
            // Alpha (jedno wiadro): podłogi pod drogą wiernych nikt z ludu nie kuje
            if (REMAKE && rolaPostaci(c) != null && podDroga(sim, w.idx(x, y))) { c.dig = 0; c.jt = 0; c.droga = null; return; }
            // blok pod wiadrem — tylko na wyraźny rozkaz (droga.ts: blokWiadra)
            if (REMAKE && rolaPostaci(c) != null && w.idx(x, y) == blokWiadra(sim)) { c.dig = 0; c.jt = 0; c.droga = null; return; }
            // rysunek: kuje właśnie ten kafel
            c.kujeT = sim.tick; c.kujeX = x; c.kujeY = y;
            var sila = RACES[c.race].digPower * mnoznik(sim, c, "kopanie") * cechaNacji(sim.clans[c.clan]).kopanie * (1 + c.mad * K.kopanieOdSzalenstwa);
            // Alpha, etap 3: postęp zostaje w kaflu (w.kucie), nie w kopaczu
            var wSzybie = w.wSzybie(x, y) && y > w.salaOltarza.y1;
            var tempo = SWIAT.warstwy.wlaczone && rolaPostaci(c) != null && t != T.CORE
                ? SWIAT.warstwy.kucie / (wSzybie ? SWIAT.warstwy.drogaWiernych.kucieSzybciej : 1) : 1;
            var i = w.idx(x, y);
            var postep = (w.kucie.TryGet(i, out var kk) ? kk : 0) + sila / (hard * K.kopanieProg * tempo);
            if (postep < 1) { w.kucie.set(i, postep); return; }
            w.kucie.delete(i);
            // Remake v1: bez rudy i kryształów jako łupu — kopie się drogę, nie skarby
            if (t == T.CORE) { sim.reachCore(c); return; }
            w.set(x, y, T.AIR);
            sim.dug++;
            // wykuty kafel szybu drogi wiernych od razu dostaje schody
            if (wSzybie) schodyDrogi(sim);
            // Alpha, etap 3b: ruda wykuta przez lud od razu podbija licznik żelaza albo złota
            if (rolaPostaci(c) != null) wykutyKafel(sim, t, x, y);
            if (DZIENNIK.wlaczony) zapisz(sim, "blok", $"blok ({JS.S(x)}, {JS.S(y)}) zniszczony: {(t >= 0 && t < NAZWY_KAFLI.Length ? NAZWY_KAFLI[(int)t] : JS.S(t))} → pustka — kopał {kto(sim, c)}", x, y);
        }
    }
}
