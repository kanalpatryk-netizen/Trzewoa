// Port (część): alpha-1/src/render/straznicy.ts — Strażnik Snu na mapie. Sylwetka: duszek „straznik” (narzedzia/duszki/
// straznik.ts) zamiast rysunku kodem; unoszenie, odrzut przy trafieniu i odpryski kamienia dokłada gra, jak w TS.
// Pasek fali (rysujPasekFali) — interfejs, dopisany w etapie 5 na końcu pliku.
using System;
using System.Runtime.CompilerServices;
using Trzewia.Plotna;
using Trzewia.Rysunek.Duszki;
using Trzewia.Symulacja;
using static Trzewia.Rdzen.SettingsStore;

namespace Trzewia.Rysunek
{
    /// <summary>Rysunek Strażników (klasa nazywa się RysStraznicy, bo Straznicy to moduł symulacji — sim/straznicy.ts).</summary>
    public static class RysStraznicy
    {
        sealed class Trafienie { public double hp, t, sila; }
        /// <summary>Alpha 1 (6.11): Strażnik oberwał — odrzut w tył, przechył i odpryski kamienia, tym mocniej, im większa rana.</summary>
        static readonly ConditionalWeakTable<Creature, Trafienie> trafieniaStraznikow = new ConditionalWeakTable<Creature, Trafienie>();

        static (double k, double sila, double t) oberwanieStraznika(Creature c, double czas)
        {
            if (!trafieniaStraznikow.TryGetValue(c, out var m)) { m = new Trafienie { hp = c.hp, t = -1e9, sila = 0 }; trafieniaStraznikow.Add(c, m); }
            if (c.hp < m.hp - 0.5) { m.t = czas; m.sila = Math.Max(0.35, Math.Min(1.6, ((m.hp - c.hp) / Math.Max(1, c.hpMax ?? 40)) * 3.5)); }
            m.hp = c.hp;
            var t = (czas - m.t) / 1000;
            return (t >= 0 && t < 0.42 ? Math.Sin(Math.PI * Math.Min(1, t / 0.42)) * (t < 0.06 ? t / 0.06 : 1) : 0, m.sila, t);
        }

        /// <summary>Rysuje Strażnika stopami w (0, 0); zwrot (kier) ustawia wołający przez ctx.scale.</summary>
        public static void rysujStraznika(IPlotno ctx, Sim sim, Creature c, double h0, double czas)
        {
            var boss = c.boss != null;
            var h = h0 * (boss ? Boss.aktywnyBoss().rozmiar * 0.6 : 0.8);
            // Alpha, etap 5: boss to demon z Wielkiego Pomnika (render/pomnik.ts)
            if (c.boss == "demon") { DuszkiDemona.rysujDemonaBossa(ctx, sim, c, h, czas); return; }
            var d = Duszek.Daj("straznik");
            if (d == null) { DuszkiLudu.Zastepczo(ctx, c, h); return; }
            var w = sim.world;
            var wSkale = w.solid(Math.Floor(c.x), Math.Floor(c.y));
            var unos = Math.Sin(czas * 0.002 + c.id * 1.3) * h * 0.03;
            var uderza = sim.tick - (c.ciosT ?? -1e9) < 24;
            ctx.save();
            // w TS cały rysunek ma krycie 0,86 (w skale 0,5) — duszek upieczono z 0,86
            var alfa = ctx.globalAlpha;
            ctx.translate(0, unos);
            var ob = oberwanieStraznika(c, czas);
            if (ob.k > 0) { ctx.translate(-h * 0.1 * ob.k * ob.sila, 0); ctx.rotate(-0.16 * ob.k * ob.sila); }
            ctx.globalAlpha = alfa * (wSkale ? 0.5 / 0.86 : 1);
            var a = d.Animacja(uderza ? "bije" : "stoi") ?? d.Animacja("stoi");
            // (dawny boss — kamienny olbrzym w koronie — w Alphie nie występuje; narysowałby się jak większy Strażnik)
            if (a != null) d.Rysuj(ctx, a.KlatkaZegara(czas, c.id), boss ? h / 0.8 : h0);
            // odpryski kamienia przy trafieniu
            if (ob.t >= 0 && ob.t < 0.5)
            {
                var z = 1 - ob.t / 0.5;
                ctx.globalAlpha = alfa * (wSkale ? 0.5 : 0.86);
                ctx.fillStyle = Barwa.Rgba(160, 148, 130, z);
                var n = (int)Math.Round(5 + 7 * ob.sila, MidpointRounding.AwayFromZero);
                for (int i = 0; i < n; i++)
                {
                    var kat = -Math.PI * 0.4 + ((double)i / n) * Math.PI * 0.9 + Math.Sin(c.id + i * 2.1) * 0.3;
                    var v = h * (0.8 + (i % 4) * 0.25) * ob.sila;
                    var r = Math.Max(0.8, h * (0.02 + (i % 3) * 0.01));
                    ctx.fillRect(h * 0.15 + Math.Cos(kat) * v * ob.t - r / 2, -h * 0.55 + Math.Sin(kat) * v * ob.t + 2.2 * h * ob.t * ob.t, r, r);
                }
            }
            ctx.restore();
        }

        /// <summary>
        /// Strażnicy przenikają skałę — w litej skale rycina kamienia zakrywała ich prawie całych.
        /// Ci, którzy są w skale, rysują się jeszcze raz na wierzchu (te same wymiary co w figury.ts).
        /// </summary>
        public static void rysujStraznikowWSkale(IPlotno ctx, Sim sim, Camera cam, double czas)
        {
            var z = cam.zoom;
            double left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
            var w = sim.world;
            foreach (var c in sim.creatures)
            {
                if (c.dead || c.straznik != true || !w.solid(Math.Floor(c.x), Math.Floor(c.y))) continue;
                double sx = (c.x - left) * z, sy = (c.y + 1 - top) * z;
                if (sx < -60 || sy < -60 || sx > cam.vw + 60 || sy > cam.vh + 60) continue;
                var h = Math.Max(16, Races.RACES[c.race].size * z * 1.9 * ustawienia.wielkoscSylwetek);
                ctx.save();
                ctx.translate(sx, sy);
                ctx.scale(c.face >= 0 ? 1 : -1, 1);
                rysujStraznika(ctx, sim, c, h, czas);
                ctx.restore();
            }
        }
    
        /// <summary>Pasek fali Strażników (render/straznicy.ts: rysujPasekFali): ile zostało, a przy demonie — jego życie.</summary>
        public static void rysujPasekFali(IPlotno ctx, Sim sim, double x, double y, double szer)
        {
            var st = sim.lud.straznicy;
            if (st == null || !st.trwa) return;
            var zywi = new System.Collections.Generic.List<Creature>();
            foreach (var c in sim.creatures) if (!c.dead && c.straznik == true) zywi.Add(c);
            // demon kona po ostatnim uderzeniu: walka wygrana — dawniej panel dalej pisał „pomnik nie pęka”
            var kona = sim.lud.pomnik?.faza == "kona";
            Creature? boss = null;
            if (!kona) foreach (var c in zywi) if (c.boss != null) { boss = c; break; }
            var zwykli = 0;
            foreach (var c in zywi) if (c.boss == null) zwykli++;
            var roz = Math.Max(12, Math.Min(16, szer * 0.02));
            var POM = Nastawy.NastawyPomnik.POMNIK.wlaczony;
            // (Alpha, etap 5: pomnik zamiast skorupy; przy demonie — co da wygraną)
            var tekst = kona ? "DEMON Z POMNIKA KONA — JESTEŚ WOLNY"
                : $"FALA STRAŻNIKÓW SNU {Js.Js.S(st.fala + 1)}/{Nastawy.NastawyStraznicy.STRAZNICY.fale.Length}" + (zwykli > 0 ? $" · zostało {zwykli}" : "")
                + (boss != null && POM ? " · pokonaj demona — będziesz wolny" : POM ? " · pomnik nie pęka" : " · skorupa nie pęka");
            ctx.save();
            ctx.font = $"{Js.Js.S(roz)}px {Ink.SERIF}";
            ctx.textAlign = "center";
            var tw = ctx.measureText(tekst).width;
            double bw = Math.Max(tw + 28, boss != null ? 320 : 0), bh = boss != null ? roz * 3.6 : roz * 1.9;
            var bx = x + szer / 2 - bw / 2;
            // barwy ryciny (ugier i kość) zamiast błękitnego neonu
            ctx.fillStyle = "rgba(14,10,8,0.88)";
            ctx.fillRect(bx, y, bw, bh);
            ctx.strokeStyle = "rgba(224,168,96,0.5)";
            ctx.lineWidth = 1;
            ctx.strokeRect(bx + 0.5, y + 0.5, bw - 1, bh - 1);
            ctx.fillStyle = "rgba(239,227,198,0.95)";
            ctx.fillText(tekst, x + szer / 2, y + roz * 1.3);
            if (boss != null)
            {
                var b = Boss.aktywnyBoss();
                var frac = Math.Max(0, Math.Min(1, boss.hp / (boss.hpMax ?? 1)));
                ctx.font = $"italic {Js.Js.S(roz * 0.85)}px {Ink.SERIF}";
                ctx.fillStyle = "rgba(224,206,170,0.95)";
                ctx.fillText($"{b.nazwa} · {Js.Js.S(Math.Ceiling(boss.hp))} / {Js.Js.S(Math.Ceiling(boss.hpMax ?? 0))}", x + szer / 2, y + roz * 2.45);
                double px = bx + 14, pw = bw - 28, py = y + roz * 2.75, ph = roz * 0.5;
                ctx.fillStyle = "rgba(54,42,34,0.9)"; ctx.fillRect(px, py, pw, ph);
                ctx.fillStyle = "rgba(170,52,36,0.92)"; ctx.fillRect(px, py, pw * frac, ph);
            }
            ctx.restore();
        }
    }
}
