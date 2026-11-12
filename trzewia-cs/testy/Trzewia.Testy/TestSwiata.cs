// Port: alpha-1/scripts/test-swiata.mjs
using Trzewia.Js;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawySwiat;
using static Trzewia.Symulacja.Tiles;
using JS = Trzewia.Js.Js;

namespace Trzewia.Testy;

/// <summary>
/// Test generowania świata: w suchej strefie wokół przedsionka nie wolno mieć magmy, wody ani kryształu; ołtarz stoi
/// w sali na kamiennym kopczyku, podłoga sali jest z kamienia, dwa otwory z powierzchni; w środkowej warstwie 1–2 ruiny
/// z zabytkami; droga wiernych z zakrętem, stara komnata z kotłem i loch za stalową bramą. 100 światów, jak w TS.
/// </summary>
public class TestSwiata
{
    /// <summary>Etap 3d i dalej: czego brakuje ołtarzowi, otworom, ruinom, drodze i lochowi (pusta lista — w porządku).</summary>
    static List<string> bledyOltarza(World w)
    {
        if (!SWIAT.warstwy.wlaczone) return new List<string>();
        var bledy = new List<string>();
        var o = w.oltarz;
        bool wolny(double x, double y) => PASSABLE[w.tile[w.idx(x, y)]] == 1;
        if (!wolny(o.x, o.y) || !wolny(o.x, o.y - 1)) bledy.Add("ołtarz zamurowany");
        var O = SWIAT.warstwy.oltarz;
        double pol = JS.ToInt32(O.kopczykSzer) >> 1;
        for (var dx = -pol; dx <= pol; dx++)
            for (double dy = 1; dy <= O.kopczykGleb; dy++)
                if (w.tile[w.idx(o.x + dx, o.y + dy)] != T.STONE) { bledy.Add("kopczyk pod ołtarzem da się podkopać"); dx = 99; break; }
        // podłoga sali: od ołtarza do wiadra — kamień pod stopami, wolno nad nimi (2 kafle); pod samym wiadrem
        // podłoga jest, ale da się ją wykopać (tak gracz sprowadza wiadro niżej)
        var podWiadrem = w.tile[w.idx(w.szybWiadraX, o.y + 1)];
        if (PASSABLE[podWiadrem] == 1 || podWiadrem == T.STONE || podWiadrem == T.CORE) bledy.Add("pod wiadrem nie ma podłogi, którą da się wykopać");
        for (var x = Math.Min(o.x, w.szybWiadraX); x <= Math.Max(o.x, w.szybWiadraX); x++)
        {
            if (x != w.szybWiadraX && w.tile[w.idx(x, o.y + 1)] != T.STONE) { bledy.Add("podłoga sali między ołtarzem a wiadrem nie jest z kamienia"); break; }
            if (!wolny(x, o.y) || !wolny(x, o.y - 1)) { bledy.Add("droga od wiadra do ołtarza zagrodzona"); break; }
        }
        for (var y = World.SURFACE_Y - 1; y <= w.szybDol; y++) if (!wolny(w.szybX, y)) { bledy.Add("szyb ze światłem zasypany"); break; }
        for (var y = World.SURFACE_Y - 1; y <= w.szybWiadraDol; y++) if (!wolny(w.szybWiadraX, y)) { bledy.Add("otwór z wiadrem zasypany"); break; }
        if (Math.Abs(w.szybWiadraX - w.szybX) < 3) bledy.Add("wiadro zjeżdża na ołtarz");
        if (!wolny(w.szybWiadraX, w.szybWiadraDol + 1)) bledy.Add("otwór z wiadrem nie wychodzi do sali");
        // etap 3e: ruiny z zabytkami
        var R = SWIAT.warstwy;
        if (w.ruiny.Count < 1 || w.ruiny.Count > 2) bledy.Add("ruin: " + w.ruiny.Count);
        foreach (var r in w.ruiny)
        {
            var z = r.zabytek;
            if (!wolny(z.x, z.y) || wolny(z.x, z.y + 1)) bledy.Add($"zabytek nie leży na posadzce ({z.x}, {z.y})");
            if (z.y < w.h * R.plytkaDo - 4 || z.y > w.h * R.srodkowaDo + 4) bledy.Add($"ruina poza środkową warstwą (y {z.y})");
            if (w.wSali(z.x, z.y)) bledy.Add("ruina w sali");
        }
        if (w.ruiny.Count == 2 && w.ruiny[0].zabytek.typ == w.ruiny[1].zabytek.typ) bledy.Add("dwa takie same zabytki");
        // droga wiernych (25.10; 6.11 — z zakrętem): wnęka przy lewej ścianie sali pusta i połączona z salą, w odcinkach
        // szybu nic nie do ruszenia, pierwszy sięga dna starej komnaty z kotłem, drugi — dna przedproża lochu
        var od = w.odcinkiDrogi;
        if (od.Count != 2) bledy.Add("droga wiernych nie ma dwóch odcinków");
        else
        {
            Prost s1 = od[0], s2 = od[1];
            for (var y = s1.y0; y <= w.salaOltarza.y1; y++) for (var x = s1.x0; x <= s1.x1 + 1; x++) if (!wolny(x, y)) { bledy.Add($"wnęka drogi wiernych zasypana ({x}, {y})"); y = 1e9; break; }
            foreach (var s in od) for (var y = Math.Max(s.y0, w.salaOltarza.y1 + 1); y <= s.y1; y++) for (var x = s.x0; x <= s.x1; x++)
            {
                var t = w.tile[w.idx(x, y)];
                if (t == T.STONE || t == T.CORE) { bledy.Add($"w szybie drogi wiernych kamień nie do ruszenia ({x}, {y})"); y = 1e9; break; }
            }
            for (var x = s1.x0; x <= s1.x1; x++) if (!wolny(x, s1.y1) || wolny(x, s1.y1 + 1) && !w.wSzybie(x, s1.y1 + 1)) { bledy.Add($"pierwszy odcinek nie trafia w posadzkę komnaty ({x})"); break; }
            for (var x = s2.x0; x <= s2.x1; x++) if (!wolny(x, s2.y1) || wolny(x, s2.y1 + 1)) { bledy.Add($"drugi odcinek nie trafia w posadzkę przedproża ({x})"); break; }
            if (Math.Abs((JS.ToInt32(s1.x0 + s1.x1) >> 1) - (JS.ToInt32(s2.x0 + s2.x1) >> 1)) < 20) bledy.Add("zakręt drogi za krótki");
            if (s1.y1 - w.salaOltarza.y1 < 30) bledy.Add("pierwszy odcinek za krótki");
        }
        // 6.11: stara komnata — pusta w środku, za murem nie do ruszenia (poza szybami), kocioł stoi na posadzce
        var km = w.komnata; var k = w.kociol;
        for (var y = km.y0; y <= km.y1; y++) for (var x = km.x0; x <= km.x1; x++) if (!wolny(x, y)) { bledy.Add($"komnata z kotłem zasypana ({x}, {y})"); y = 1e9; break; }
        for (var y = km.y0 - 1; y <= km.y1 + 1; y++) for (var x = km.x0 - 1; x <= km.x1 + 1; x++)
        {
            if (x >= km.x0 && x <= km.x1 && y >= km.y0 && y <= km.y1) continue;
            if (!w.wSzybie(x, y) && w.tile[w.idx(x, y)] != T.STONE) { bledy.Add($"mur komnaty dziurawy ({x}, {y})"); y = 1e9; break; }
        }
        if (!wolny(k.x, k.y) || wolny(k.x, k.y + 1) || !w.wKomnacie(k.x, k.y)) bledy.Add("kocioł nie stoi na posadzce komnaty");
        // 6.11: loch za stalową bramą — z przedproża do przedsionka da się dojść tylko przez przejście bramy
        var b = w.brama; var pp = w.przedproze;
        for (var y = b.y0; y <= b.y1; y++) for (var x = b.x0; x <= b.x1; x++) if (w.tile[w.idx(x, y)] != T.STONE) { bledy.Add("brama nie jest zamknięta na starcie"); y = 1e9; break; }
        Uint8Array zalej(bool przezBrame)
        {
            var W = w.w;
            var seen = new Uint8Array((int)(W * w.h));
            var q = new List<double> { w.idx(pp.x0, pp.y1) };
            seen[q[0]] = 1;
            while (q.Count > 0)
            {
                var i = q[q.Count - 1]; q.RemoveAt(q.Count - 1);
                double x = i % W, y = JS.ToInt32(i / W);
                foreach (var (dx, dy) in new[] { (1.0, 0.0), (-1.0, 0.0), (0.0, 1.0), (0.0, -1.0) })
                {
                    double nx = x + dx, ny = y + dy;
                    if (!w.inb(nx, ny)) continue;
                    var j = w.idx(nx, ny);
                    if (seen[j] != 0) continue;
                    if (!wolny(nx, ny) && !(przezBrame && w.wBramie(nx, ny))) continue;
                    seen[j] = 1; q.Add(j);
                }
            }
            return seen;
        }
        var cel = w.idx(w.coreX - 3, w.przedsionekY + 3);
        if (!wolny(pp.x0, pp.y1)) bledy.Add("przedproże zasypane");
        else
        {
            if (zalej(false)[cel] != 0) bledy.Add("do lochu da się wejść obok bramy");
            if (zalej(true)[cel] == 0) bledy.Add("przez bramę nie da się dojść do przedsionka");
        }
        return bledy;
    }

    [Fact]
    public void StoSwiatow()
    {
        const int ILE = 100;
        var zle = new List<string>();
        for (var s = 0; s < ILE; s++)
        {
            var w = new World(s * 7919 + 13);
            for (var k = 0; k < 400; k++) w.tickFluids(k);   // ciecze mają czas spłynąć
            int magma = 0, woda = 0, krysztal = 0;
            for (double y = 0; y < w.h; y++)
                for (double x = 0; x < w.w; x++)
                {
                    if (!w.suchaStrefa(x, y)) continue;
                    var i = w.idx(x, y);
                    if (w.magma[i] > 0) magma++;
                    if (w.water[i] > 0) woda++;
                    if (w.tile[i] == T.CRYSTAL) krysztal++;
                }
            var oltarz = bledyOltarza(w);
            if (magma > 0 || woda > 0 || krysztal > 0 || oltarz.Count > 0)
                zle.Add($"ziarno {s}: magma {magma}, woda {woda}, kryształ {krysztal}; {string.Join("; ", oltarz)}");
        }
        Assert.True(zle.Count == 0, $"ZŁY ŚWIAT w {zle.Count} z {ILE}:\n" + string.Join("\n", zle.Take(8)));
    }
}
