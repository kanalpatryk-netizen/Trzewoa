using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Nastawy;
using static Trzewia.Nastawy.NastawySterowanie;
using static Trzewia.Nastawy.NastawyEkran;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Symulacja;
using static Trzewia.Rdzen.SettingsStore;

namespace Trzewia.Aplikacja.Screens
{

/// <summary>
/// Ekran próbny (nie ma go w TS — zniknie, gdy przyjdą prawdziwe ekrany). Etap 2: prawdziwa góra z symulacji C#,
/// w której gra bot (jak okno obserwatorium w game.ts: karty od razu, reszta co BOT_CO tików). Kafle w prostych,
/// tymczasowych barwach (prawdziwy rysunek góry to etap 3), stworzenia jako kropki w barwie rasy. Kamera jak w grze
/// (kółko przybliża pod kursorem, prawy albo środkowy przycisk przesuwa), czas gry w tikach jak w game.ts
/// (120 tików/s, TEMPO, budżet klatki). Sprawdza okno, pętlę, wejście, licznik F3 i szybkość symulacji na komputerze.
/// </summary>
public sealed class EkranProby : Ekran
{
    public override string nazwa => "proba";
    const string STYL_BOTA = "rozsadny";

    readonly Camera cam = new Camera(800, 600) { zoom = KAMERA.start };
    double plX, plY, plW, plH;
    double reszta;
    double ziarno = 1;
    Sim sim = null!;
    double tempo = 1;
    bool pauza;
    string ostatniKlawisz = "—", ostatniaAkcja = "—";
    double myszX, myszY;
    int klikniecia;
    double ostW = 800, ostH = 600;
    (double x, double y, double cx, double cy)? ciagniecie;
    // mapa w skali kafla (1 piksel = 1 kafel), odświeżana co kilka tików
    IPlotno? mapa;
    double mapaTik = -1;
    double msKroku;
    /// <summary>Podgląd bez duszków (klawisz L): kropki w miejscach z symulacji — do porównania położeń.</summary>
    bool kropki;
    /// <summary>Rycina świata (etap 3); M — dawna mapa kafli zamiast niej.</summary>
    /// <summary>Świat na płycie (rycina, tajemnica, pomieszczenia, ołtarz, ruiny, urobki) — PlytaSwiata.</summary>
    PlytaSwiata plyta = new PlytaSwiata();
    Rycina rycina => plyta.rycina;
    bool mapaKafli;
    double rysKamX = double.NaN, rysKamY, rysKamZ, lastInk = -1e9, rycinaW, rycinaH;
    Podpowiedz? rada;

    public EkranProby() { NowaGora(1); }

    void NowaGora(double z)
    {
        ziarno = z;
        sim = new Sim(z);
        // nowa góra — nowe rysunki ze stanem (jak nowy ekran gry w TS)
        plyta = new PlytaSwiata();
        rycinaW = rycinaH = 0;
        mapa?.Dispose();
        mapa = null;
        mapaTik = -1;
        cam.x = sim.world.w / 2; cam.y = 30;
        cam.clamp(sim.world.w, sim.world.h);
    }

    public override void rozmiar(double w, double h)
    {
        ostW = w; ostH = h;
        plX = EKRAN.ramaPlyty; plY = EKRAN.ramaPlyty;
        plW = w - 2 * EKRAN.ramaPlyty;
        plH = h - EKRAN.ramaPlyty - Math.Clamp(h * EKRAN.dolCzesc, EKRAN.dolMin, EKRAN.dolMax);
        cam.vw = plW; cam.vh = plH;
        cam.minZoom = Math.Max(KAMERA.minNaDuzymEkranie, plW / sim.world.w);
        if (cam.zoom < cam.minZoom) cam.zoom = cam.minZoom;
        cam.clamp(sim.world.w, sim.world.h);
    }

    public override void krok(double dt, double teraz)
    {
        if (pauza || sim.ending != null) return;
        // zwykły czas: tyle tików na sekundę, niezależnie od tego, ile klatek pokazuje ekran (jak w game.ts)
        var naSekunde = TEMPO.tikowNaSekunde * tempo;
        reszta += dt / 1000 * naSekunde;
        var cale = Math.Floor(reszta);
        reszta -= cale;
        // wolny komputer: świat zwalnia, zamiast nadrabiać bez końca
        var kroki = Math.Min(Math.Max(TEMPO.maxNaKlatke, Math.Ceiling(naSekunde / 20)), cale);
        var t0 = Wydajnosc.Teraz();
        var budzet = TEMPO.budzetKlatkiMs * Math.Max(1, tempo);
        int zrobione = 0;
        while (zrobione < kroki)
        {
            sim.step();
            zrobione++;
            // okno obserwatorium: gra bot — karty rozstrzyga od razu, resztę co pół sekundy gry
            if (sim.ending == null)
            {
                if (sim.wydarzenia.biezace != null) Bot.kartaBota(sim, STYL_BOTA);
                if (sim.tick % Bot.BOT_CO == 0) Bot.ruchBota(sim, STYL_BOTA);
            }
            if (Wydajnosc.Teraz() - t0 > budzet || sim.ending != null) break;
        }
        var ms = Wydajnosc.Teraz() - t0;
        Wydajnosc.licznik.dodaj(Czesc.logika, ms);
        if (zrobione > 0) msKroku = msKroku * 0.9 + ms / zrobione * 0.1;
        if (sim.tick % 60 == 0 || rada == null) rada = Podpowiedzi.podpowiedz(sim);
    }

    // Tymczasowe barwy kafli (tylko ten ekran; prawdziwy rysunek góry — render/engrave.ts — to etap 3).
    static readonly Barwa[] BARWY = Barwy(1,
        "#120e0b", "#2b3442", "#6b5038", "#4a3f36", "#b0683a", "#8a62c0", "#2a2624", "#5f8f4a", "#c8bca0",
        "#d8b860", "#e07030", "#b4b4c4", "#8a6a50", "#d03848", "#f0e090", "#5c4c3e", "#38302a", "#e8c450");
    /// <summary>Kafle, których nikt jeszcze nie widział — ciemniej.</summary>
    static readonly Barwa[] BARWY_NIEZNANE = Barwy(0.45,
        "#120e0b", "#2b3442", "#6b5038", "#4a3f36", "#b0683a", "#8a62c0", "#2a2624", "#5f8f4a", "#c8bca0",
        "#d8b860", "#e07030", "#b4b4c4", "#8a6a50", "#d03848", "#f0e090", "#5c4c3e", "#38302a", "#e8c450");

    static Barwa[] Barwy(double k, params string[] hex)
    {
        var w = new Barwa[hex.Length];
        for (int i = 0; i < hex.Length; i++)
        {
            var c = Convert.ToInt32(hex[i].Substring(1), 16);
            w[i] = Barwa.Rgba(((c >> 16) & 255) * k, ((c >> 8) & 255) * k, (c & 255) * k, 1);
        }
        return w;
    }

    /// <summary>Mapa kafli na płótnie 1:1 — prostokąt na każdy ciąg kafli tej samej barwy w wierszu.</summary>
    void RysujMape()
    {
        var w = sim.world;
        int W = (int)w.w, H = (int)w.h;
        mapa ??= Plotno.Nowe(W, H);
        var m = mapa;
        m.clearRect(0, 0, W, H);
        var tile = w.tile.d; var ever = w.ever.d;
        for (int y = 0; y < H; y++)
        {
            int x = 0;
            while (x < W)
            {
                int i = y * W + x;
                int t = tile[i]; bool znany = ever[i] != 0;
                int x2 = x + 1;
                while (x2 < W && tile[y * W + x2] == t && (ever[y * W + x2] != 0) == znany) x2++;
                m.fillStyle = (znany ? BARWY : BARWY_NIEZNANE)[t < BARWY.Length ? t : 0];
                m.fillRect(x, y, x2 - x, 1);
                x = x2;
            }
        }
        // liny wiader: jaśniejszy pasek
        var lina = w.lina.d;
        m.fillStyle = "rgba(230,200,150,0.75)";
        for (int i = 0; i < lina.Length; i++) if (lina[i] != 0) m.fillRect(i % W + 0.4, i / W, 0.2, 1);
        mapaTik = sim.tick;
    }

    public override void rysuj(IPlotno ctx, double w, double h, double teraz)
    {
        var L = Wydajnosc.licznik;
        var t = Wydajnosc.Teraz();
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);

        // płyta: góra z symulacji — rycina świata (etap 3; jak w TS, odbitka po ruchu kamery albo co 150 ms, przy zmianach co 30 ms)
        if (!mapaKafli)
        {
            if (rycinaW != plW || rycinaH != plH) { rycina.resize(plW, plH); rycinaW = plW; rycinaH = plH; }
            var ruszona = cam.x != rysKamX || cam.y != rysKamY || cam.zoom != rysKamZ;
            var chce = ruszona || rycina.niedokonczona || teraz - lastInk > 33;
            rycina.fresk = ustawienia.swiat != "rycina";
            if (rycina.klatka(sim, cam, teraz, chce)) { lastInk = teraz; rysKamX = cam.x; rysKamY = cam.y; rysKamZ = cam.zoom; }
            t = L.znacz(Czesc.rycina, t);
        }
        else if (mapa == null || sim.tick - mapaTik >= 6 || sim.tick < mapaTik) RysujMape();
        ctx.save();
        ctx.beginPath();
        ctx.rect(plX, plY, plW, plH);
        ctx.clip();
        ctx.translate(plX, plY);
        if (!mapaKafli && !kropki)
        {
            // świat w kolejności z game.ts (wspólne z testem podglądu)
            plyta.Rysuj(ctx, sim, cam, teraz, pauza, 0.5);
            t = L.znacz(Czesc.swiat, t);
        }
        else
        {
            if (!mapaKafli)
            {
                ctx.save();
                ctx.imageSmoothingEnabled = true;
                rycina.rysuj(ctx, cam, ustawienia.jasnosc);
                ctx.restore();
            }
            else
            {
                ctx.fillStyle = "#0b0908";
                ctx.fillRect(0, 0, plW, plH);
                ctx.imageSmoothingEnabled = false;
                double W = sim.world.w, H = sim.world.h;
                ctx.drawImage(mapa!, 0, 0, W, H, cam.toScreenX(0), cam.toScreenY(0), W * cam.zoom, H * cam.zoom);
                ctx.imageSmoothingEnabled = true;
            }
            t = L.znacz(Czesc.swiat, t);
            if (kropki)
            {
                // podgląd bez duszków (klawisz L): kropki w miejscach z symulacji — do porównania położeń
                foreach (var c in sim.creatures)
                {
                    if (c.dead) continue;
                    var k = Races.RACES[c.race].color;
                    ctx.fillStyle = Barwa.Rgba(k[0], k[1], k[2], 1);
                    ctx.beginPath();
                    ctx.arc(cam.toScreenX(c.x), cam.toScreenY(c.y + 0.5), Math.Max(1.5, cam.zoom * 0.3), 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            else Figury.rysujStworzenia(ctx, sim, cam, teraz);
        }
        int zywych = 0;
        foreach (var c in sim.creatures) if (!c.dead) zywych++;
        // cel podpowiedzi
        if (rada?.cel is { } cel)
        {
            ctx.strokeStyle = "rgba(240,210,140,0.6)";
            ctx.lineWidth = 1.5;
            ctx.setLineDash(4, 4);
            ctx.beginPath();
            ctx.arc(cam.toScreenX(cel.x), cam.toScreenY(cel.y), cel.r * cam.zoom, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash();
        }
        ctx.restore();
        ctx.strokeStyle = "rgba(224,176,104,0.5)";
        ctx.lineWidth = 2;
        ctx.strokeRect(plX, plY, plW, plH);
        t = L.znacz(Czesc.postacie, t);

        // dół: stan partii i wejścia
        var dy = plY + plH + 34;
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#e8c482";
        ctx.font = $"600 28px {Fonts.KROJ_TYTUL}";
        var koniec = sim.ending != null ? $" — koniec: {sim.ending}" : pauza ? " — pauza" : "";
        ctx.fillText($"Trzewia — C#, duszki postaci na prawdziwej górze (ziarno {ziarno}), gra bot{koniec}", plX, dy);
        ctx.fillStyle = "rgba(236,222,190,0.92)";
        ctx.font = $"italic 18px {Fonts.KROJ}";
        ctx.fillText(rada?.tekst ?? "", plX, dy + 28, plW);
        ctx.font = $"15px {Fonts.KROJ}";
        ctx.fillStyle = "rgba(176,160,132,0.95)";
        var sek = Math.Floor(sim.tick / TEMPO.tikowNaSekunde);
        ctx.fillText($"czas gry {Math.Floor(sek / 60):00}:{sek % 60:00} ({sim.tick} tików, ×{tempo}) · krok symulacji {msKroku * 1000:F0} µs · " +
                     $"żywych {zywych} · krew {sim.krew:F0} · wiara {sim.wiara:F0} · żelazo {sim.zelazo} · złoto {sim.zloto} · " +
                     $"pęknięć {sim.rytual.pekniecia} · sen {sim.sen:F2}", plX, dy + 54);
        ctx.fillText($"kamera {cam.x:F1}, {cam.y:F1}, przybliżenie {cam.zoom:F2} · mysz {myszX:F0}, {myszY:F0} · " +
                     $"klawisz „{ostatniKlawisz}” → {ostatniaAkcja}", plX, dy + 76);
        ctx.fillText("F3 — licznik wydajności · F11 — pełny ekran · kółko — przybliż · prawy albo środkowy przycisk — przesuń · " +
                     "C — kamera na środek · ] [ — przybliż, oddal · spacja — pauza · + − — tempo · N — następna góra · L — kropki zamiast duszków", plX, dy + 98);
        ctx.textAlign = "right";
        ctx.fillText($"skala {ekran.skala:F3} · ekran logiczny {w:F0}×{h:F0}", w - EKRAN.ramaPlyty, dy + 28);
        L.znacz(Czesc.interfejs, t);
    }

    public override void dotyk(Wskaznik e, Faza faza)
    {
        myszX = e.clientX; myszY = e.clientY;
        if (faza == Faza.dol)
        {
            klikniecia++;
            if (e.button is 1 or 2) ciagniecie = (e.clientX, e.clientY, cam.x, cam.y);
        }
        else if (faza == Faza.ruch && ciagniecie is { } c)
        {
            cam.x = c.cx - (e.clientX - c.x) / cam.zoom;
            cam.y = c.cy - (e.clientY - c.y) / cam.zoom;
            cam.clamp(sim.world.w, sim.world.h);
        }
        else if (faza == Faza.gora) ciagniecie = null;
    }

    /// <summary>Kółko jak w game.ts: krok KAMERA.krokKolka, punkt pod kursorem zostaje na miejscu.</summary>
    public override void kolko(Kolko e)
    {
        var bx = cam.toWorldX(e.clientX - plX); var by = cam.toWorldY(e.clientY - plY);
        cam.zoom *= e.deltaY < 0 ? KAMERA.krokKolka : 1 / KAMERA.krokKolka;
        cam.clamp(sim.world.w, sim.world.h);
        cam.x += bx - cam.toWorldX(e.clientX - plX);
        cam.y += by - cam.toWorldY(e.clientY - plY);
        cam.clamp(sim.world.w, sim.world.h);
    }

    public override void klawisz(Akcja? akcja, Klawisz e)
    {
        ostatniKlawisz = e.key == " " ? "spacja" : e.key;
        ostatniaAkcja = akcja?.ToString() ?? "—";
        if (e.code == "KeyM") { mapaKafli = !mapaKafli; return; }
        switch (akcja)
        {
            case Akcja.przyblizenie: cam.zoom = Math.Min(cam.maxZoom, cam.zoom * KAMERA.krokKlawisza); cam.clamp(sim.world.w, sim.world.h); break;
            case Akcja.oddalenie: cam.zoom = Math.Max(cam.minZoom, cam.zoom / KAMERA.krokKlawisza); cam.clamp(sim.world.w, sim.world.h); break;
            case Akcja.kamera: cam.x = sim.world.w / 2; cam.y = 30; cam.zoom = KAMERA.start; cam.clamp(sim.world.w, sim.world.h); break;
            case Akcja.pauza: pauza = !pauza; break;
            case Akcja.legenda: kropki = !kropki; break;
            case Akcja.szybciej: case Akcja.wolniej:
                {
                    // jak tryb deweloperski w game.ts: następny / poprzedni mnożnik z TEMPO.mnozniki
                    var M = TEMPO.mnozniki;
                    int i = Array.FindIndex(M, m => m >= tempo);
                    if (i < 0) i = M.Length - 1;
                    tempo = M[Math.Max(0, Math.Min(M.Length - 1, i + (akcja == Akcja.szybciej ? 1 : -1)))];
                    break;
                }
            case Akcja.odNowa: NowaGora(ziarno + 1); rozmiar(ostW, ostH); break;
        }
    }
}
}
