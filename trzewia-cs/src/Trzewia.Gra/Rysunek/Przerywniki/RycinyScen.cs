// Port: alpha-1/src/cutscene/art/*.ts — ryciny przerywników (i części tablic atlasu): pamięć, ziarno, szept, znak, spis,
// przypływ, organy, cel, góra, krew, kronika, rasy, żyły.
using System;
using System.Collections.Generic;
using Trzewia.Plotna;
using static Trzewia.Nastawy.NastawyBarwy;
using static Trzewia.Rysunek.Ryciny;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    public static class RycinyScen
    {
        static Styl rgba(string hex, double a) => Paleta.rgba(hex, a);
        const double PI = Math.PI;

        /// <summary>
        /// Rysunek, który powstaje i rozpada się na oczach: takt 0 — czysty papier, takt 1 — ktoś przechodzi i tkanka się
        /// domalowuje, takt 2 — dziury zapominania zjadają obraz, takt 3 — zostaje sam papier.
        /// </summary>
        public static void rysujPamiec(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            double cx = w / 2, cy = h * 0.52;
            var r = Math.Min(w * 0.22, h * 0.42);
            var etap = P.takt + P.taktP;

            ctx.save();
            // papier — zawsze pod spodem, bo Otchłań jest stanem domyślnym
            ctx.beginPath();
            ctx.ellipse(cx, cy, r * 1.85, r * 1.2, 0, 0, PI * 2);
            ctx.fillStyle = rgba(BARWA.papier, 0.94);
            ctx.fill();
            ctx.strokeStyle = "rgba(120,104,84,0.25)";
            ctx.lineWidth = 1;
            ctx.stroke();

            // kontur tkanki rysuje się w takcie 1
            var punkty = new List<(double, double)>();
            for (int i = 0; i <= 30; i++)
            {
                var u = i / 30.0;
                punkty.Add((cx - r * 1.45 + u * r * 2.9, cy + r * 0.72 - JsM.Sin(u * 3.4) * r * 0.75 - pseudo(i) * r * 0.1));
            }
            var tkanka = new Path2D();
            tkanka.moveTo(punkty[0].Item1, punkty[0].Item2);
            foreach (var (x, y) in punkty) tkanka.lineTo(x, y);
            tkanka.lineTo(cx + r * 1.45, cy + r * 0.85);
            tkanka.lineTo(cx - r * 1.45, cy + r * 0.85);
            tkanka.closePath();

            var rysowanie = Math.Max(0, Math.Min(1, etap * 1.1));
            if (rysowanie > 0.15)
            {
                ctx.save();
                ctx.globalAlpha = Math.Min(1, (rysowanie - 0.15) * 1.6);
                ctx.fillStyle = rgba("#141010", 0.93);
                ctx.fill(tkanka);
                kreskuj(ctx, tkanka, 0.6, 5, rgba(BARWA.atrament, 0.55), 1);
                kreskuj(ctx, tkanka, -0.8, 11, rgba(BARWA.atrament, 0.26), 1);
                ctx.restore();
            }
            obrysPostep(ctx, punkty, rgba(BARWA.atramentMocny, 0.85), 1.5, Math.Min(1, rysowanie * 1.4));

            // ten, który pamięta: idzie po tkance, a za nim rysunek jest świeży
            if (etap > 0.6 && etap < 2.6)
            {
                var marsz = (t * 0.00016) % 1;
                var mx = cx - r * 1.2 + marsz * r * 2.4;
                var my = cy + r * 0.72 - JsM.Sin(((mx - (cx - r * 1.45)) / (r * 2.9)) * 3.4) * r * 0.75;
                sylwetka(ctx, mx, my, r * 0.2, "goblin", 0.9);
                var g = ctx.createRadialGradient(mx, my - r * 0.1, 0, mx, my - r * 0.1, r * 0.4);
                g.addColorStop(0, rgba(BARWA.atramentMocny, 0.1));
                g.addColorStop(1, rgba(BARWA.atramentMocny, 0));
                ctx.fillStyle = g;
                ctx.fillRect(mx - r * 0.4, my - r * 0.5, r * 0.8, r * 0.8);
            }

            // --- takt 2 i 3: zapominanie zjada rysunek
            var zapominanie = Math.Max(0, etap - 1.7);
            for (int i = 0; i < 9; i++)
            {
                var faza = Math.Max(0, Math.Min(1, zapominanie * 1.1 - i * 0.09));
                if (faza <= 0) continue;
                var x = cx + (pseudo(i * 4.1) - 0.5) * r * 2.4;
                var y = cy + (pseudo(i * 8.7) - 0.5) * r * 0.95;
                var rr = r * (0.1 + pseudo(i * 2.2) * 0.16) * faza * (0.94 + 0.06 * JsM.Sin(t * 0.0009 + i));
                ctx.beginPath();
                for (int k = 0; k <= 22; k++)
                {
                    var a = (k / 22.0) * PI * 2;
                    var wr = rr * (0.68 + pseudo(i * 3 + k) * 0.6);
                    double px = x + JsM.Cos(a) * wr, py = y + JsM.Sin(a) * wr;
                    if (k == 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fillStyle = rgba(BARWA.papier, 0.97);
                ctx.fill();
                ctx.strokeStyle = "rgba(140,130,113,0.35)";
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }

            // strzępy kreski unoszące się znad dziur — rysunek dosłownie się sypie
            if (zapominanie > 0.2)
            {
                for (int i = 0; i < 12; i++)
                {
                    var faza = (t * 0.0003 + i * 0.17) % 1;
                    var x = cx + (pseudo(i * 7.7) - 0.5) * r * 2.2;
                    var y = cy + r * 0.4 - faza * r * 0.9;
                    ctx.strokeStyle = rgba(BARWA.atrament, 0.25 * (1 - faza) * Math.Min(1, zapominanie));
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + r * 0.06, y - r * 0.03);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }

        /// <summary>Zasiew: rzucasz w skałę rudę i grzyb, a oni przychodzą po to jak po swoje.</summary>
        public static void rysujZiarno(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t, p = P.p;
            double cx = w / 2, cy = h * 0.58;
            var s = Math.Min(w * 0.3, h * 0.44);

            var jaskinia = new Path2D();
            jaskinia.moveTo(cx - s * 1.5, cy + s * 0.55);
            for (int i = 0; i <= 24; i++)
            {
                var u = i / 24.0;
                jaskinia.lineTo(cx - s * 1.5 + u * s * 3, cy - JsM.Sin(u * PI) * s * 0.7 + pseudo(i * 2.3) * s * 0.06);
            }
            jaskinia.lineTo(cx + s * 1.5, cy + s * 0.55);
            jaskinia.closePath();

            ctx.save();
            ctx.fillStyle = rgba("#0f0a09", 0.96);
            ctx.fill(jaskinia);
            kreskuj(ctx, jaskinia, 1.15, 6, rgba(BARWA.atrament, 0.44), 1);
            ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.6);
            ctx.lineWidth = 1.4;
            ctx.stroke(jaskinia);

            // grzybnia rośnie od dołu w rytm postępu sceny
            var pas = new Path2D();
            pas.rect(cx - s * 1.4, cy + s * 0.15, s * 2.8, s * 0.42 * Math.Min(1, p * 1.5));
            kropkuj(ctx, pas, 900, rgba(BARWA.biolumina, 0.55), 3);
            for (int i = 0; i < 14; i++)
            {
                var x = cx - s * 1.3 + (i / 13.0) * s * 2.6;
                var wys = s * (0.05 + pseudo(i * 6.1) * 0.09) * Math.Min(1, p * 1.7);
                ctx.strokeStyle = rgba(BARWA.biolumina, 0.7);
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(x, cy + s * 0.5);
                ctx.lineTo(x, cy + s * 0.5 - wys);
                ctx.stroke();
                ctx.beginPath();
                ctx.ellipse(x, cy + s * 0.5 - wys, wys * 0.45, wys * 0.3, 0, PI, 0);
                ctx.fillStyle = rgba(BARWA.biolumina, 0.35);
                ctx.fill();
                ctx.stroke();
                blask(ctx, x, cy + s * 0.5 - wys, wys * 1.6, BARWA.biolumina, 0.06);
            }

            // żyła rudy w stropie
            var ruda = new Path2D();
            ruda.moveTo(cx - s * 0.9, cy - s * 0.45);
            ruda.quadraticCurveTo(cx, cy - s * 0.62, cx + s * 0.95, cy - s * 0.38);
            ctx.strokeStyle = rgba(BARWA.zarBlady, 0.75 * Math.Min(1, p * 2));
            ctx.lineWidth = s * 0.035;
            ctx.setLineDash(s * 0.05, s * 0.035);
            ctx.stroke(ruda);
            ctx.setLineDash();

            var idacy = Math.Min(3, Math.Floor(p * 4));
            for (int i = 0; i < idacy; i++)
            {
                var x = cx - s * 0.8 + i * s * 0.55 + JsM.Sin(t * 0.002 + i) * 3;
                sylwetka(ctx, x, cy + s * 0.5, s * 0.2, "goblin", 0.95);
            }
            ctx.restore();
        }

        /// <summary>Szept: jedna myśl wchodzi w jedną głowę i zmienia wszystko, co po niej idzie.</summary>
        public static void rysujSzept(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t, p = P.p;
            var etap = P.takt + P.taktP;
            double cx = w / 2, cy = h * 0.6;
            var s = Math.Min(w * 0.34, h * 0.62);

            ctx.save();
            // spirala szeptu wchodzi z ciemności
            ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.75);
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            var zwoje = 5.5 * Math.Min(1, (etap + 0.2) * 0.8);
            var pierwszy = true;
            for (double a = 0; a < zwoje * PI * 2; a += 0.08)
            {
                var r = s * 0.42 * (1 - a / (zwoje * PI * 2)) + 2;
                var x = cx - s * 0.05 + JsM.Cos(a + t * 0.0004) * r;
                var y = cy - s * 0.42 + JsM.Sin(a + t * 0.0004) * r * 0.75;
                if (pierwszy) { ctx.moveTo(x, y); pierwszy = false; } else ctx.lineTo(x, y);
            }
            ctx.stroke();
            blask(ctx, cx - s * 0.05, cy - s * 0.42, s * 0.2, BARWA.zarBlady, 0.12 * p);

            // ten, który słucha — i nie wie, że słucha
            sylwetka(ctx, cx, cy, s * 0.5, "goblin", 1);

            // to, co usłyszał, rozchodzi się na innych
            var ile = Math.Floor(Math.Max(0, etap - 1.4) * 2.2);
            for (int i = 0; i < ile; i++)
            {
                var x = cx + (i % 2 == 0 ? -1 : 1) * s * (0.38 + i * 0.14);
                sylwetka(ctx, x, cy + s * 0.04, s * 0.3, "goblin", 0.35 + 0.1 * i);
                // myśl idzie widocznie: kropka biegnie od pierwszego do kolejnych
                ctx.strokeStyle = rgba(BARWA.atrament, 0.25);
                ctx.setLineDash(3, 5);
                ctx.lineDashOffset = -t * 0.01;
                ctx.beginPath();
                ctx.moveTo(cx, cy - s * 0.2);
                ctx.lineTo(x, cy - s * 0.16);
                ctx.stroke();
                ctx.setLineDash();
                var bieg = (t * 0.0005 + i * 0.25) % 1;
                ctx.fillStyle = rgba(BARWA.atramentMocny, 0.6 * (1 - bieg));
                ctx.beginPath();
                ctx.arc(cx + (x - cx) * bieg, cy - s * 0.2 + (cy - s * 0.16 - (cy - s * 0.2)) * bieg, Math.Max(1.2, s * 0.02), 0, PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        /// <summary>Znak: jawny cud. Widzą go wszyscy i wszyscy zapamiętują, kto go zrobił.</summary>
        public static void rysujZnak(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t, p = P.p;
            var etap = P.takt + P.taktP;
            double cx = w / 2, cy = h * 0.46;
            var s = Math.Min(w * 0.3, h * 0.45);

            ctx.save();
            var sciana = new Path2D();
            sciana.rect(cx - s * 1.6, cy - s * 0.9, s * 3.2, s * 1.9);
            ctx.fillStyle = rgba("#0f0b0a", 0.96);
            ctx.fill(sciana);
            kreskuj(ctx, sciana, 0.6, 6, rgba(BARWA.atrament, 0.4), 1);
            ctx.strokeStyle = rgba(BARWA.atrament, 0.5);
            ctx.lineWidth = 1.2;
            ctx.stroke(sciana);

            // rozbłysk w chwili, w której narracja mówi o cudzie
            var odBlysku = Math.Max(0, etap - 1);
            var blysk = odBlysku < 0.35 ? 1 - odBlysku / 0.35 : 0;
            var moc = Math.Min(1, Math.Max(p * 0.6, odBlysku * 1.6)) * (1 + blysk * 1.6);
            blask(ctx, cx, cy, s * (0.7 + 0.15 * JsM.Sin(t * 0.003)), BARWA.zar, 0.3 * moc);

            // promienie rytego znaku
            ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.9 * moc);
            ctx.lineWidth = 2;
            for (int i = 0; i < 12; i++)
            {
                var a = (i / 12.0) * PI * 2 + t * 0.0002;
                double r1 = s * 0.14, r2 = s * (0.3 + pseudo(i) * 0.22) * moc;
                ctx.beginPath();
                ctx.moveTo(cx + JsM.Cos(a) * r1, cy + JsM.Sin(a) * r1);
                ctx.lineTo(cx + JsM.Cos(a) * r2, cy + JsM.Sin(a) * r2);
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(cx, cy, s * 0.12, 0, PI * 2);
            ctx.fillStyle = rgba(BARWA.zar, 0.5 * moc);
            ctx.fill();
            ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.9);
            ctx.stroke();

            // klęczący: to nie strach, to rachunek — bóg właśnie pokazał, że jest
            for (int i = 0; i < 6; i++)
            {
                var x = cx - s * 1.1 + i * s * 0.44;
                var y = cy + s * 0.78;
                var uklon = Math.Max(0, Math.Min(1, (etap - 1.2) * 1.6 - i * 0.12));
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(JsM.Sin(i * 1.7) * 0.1 - 0.5 * uklon);
                sylwetka(ctx, 0, 0, s * 0.26, i == 3 ? "kowal" : "goblin", 0.95);
                ctx.restore();
            }
            ctx.restore();
        }

        /// <summary>Spis ras jako warstwy skały: gdy jedna zjada wstęgę, zamyka ci się oko.</summary>
        public static void rysujSpis(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            var etap = P.takt + P.taktP;
            double cx = w / 2, cy = h / 2;
            double sw = Math.Min(w * 0.72, 720), sh = Math.Min(h * 0.2, 130);

            ctx.save();
            // jedna warstwa zjada wstęgę w rytm zdań, a nie po prostu z czasem
            var zjadanie = Math.Max(0, Math.Min(1, (etap - 0.8) / 2.2));
            var udzialy = new[] { 0.28 + zjadanie * 0.6, 0.26 * (1 - zjadanie * 0.85), 0.24 * (1 - zjadanie * 0.9), 0.22 * (1 - zjadanie * 0.8) };
            double suma = 0; foreach (var u in udzialy) suma += u;
            var x = cx - sw / 2;
            var katy = new[] { 0.4, 1.1, -0.5, 1.7 };
            for (int i = 0; i < udzialy.Length; i++)
            {
                var szer = (udzialy[i] / suma) * sw;
                if (szer < 1) continue;
                var warstwa = new Path2D();
                warstwa.moveTo(x, cy - sh / 2 + pseudo(i) * 6);
                for (int k = 0; k <= 10; k++) warstwa.lineTo(x + (k / 10.0) * szer, cy - sh / 2 + JsM.Sin(k * 1.7 + i) * 4);
                warstwa.lineTo(x + szer, cy + sh / 2);
                for (int k = 10; k >= 0; k--) warstwa.lineTo(x + (k / 10.0) * szer, cy + sh / 2 + JsM.Sin(k * 2.1 + i) * 4);
                warstwa.closePath();
                ctx.fillStyle = rgba("#100b0a", 0.9);
                ctx.fill(warstwa);
                kreskuj(ctx, warstwa, katy[i], 5, rgba(i == 0 ? BARWA.biolumina : BARWA.atrament, 0.75), 1);
                ctx.strokeStyle = rgba(BARWA.atrament, 0.4);
                ctx.lineWidth = 1;
                ctx.stroke(warstwa);
                x += szer;
            }

            // powieka: im większa monokultura, tym mniej widzisz
            var zamkniecie = Math.Max(0, Math.Min(1, (etap - 2) / 1.6)) * 0.45;
            foreach (var gora in new[] { true, false })
            {
                var g = ctx.createLinearGradient(0, gora ? 0 : h, 0, gora ? h * zamkniecie : h - h * zamkniecie);
                g.addColorStop(0, rgba("#070504", 0.97));
                g.addColorStop(1, rgba("#070504", 0));
                ctx.fillStyle = g;
                ctx.fillRect(0, gora ? 0 : h - h * zamkniecie, w, h * zamkniecie);
            }
            ctx.fillStyle = rgba(BARWA.atramentCichy, 0.5 + 0.2 * JsM.Sin(t * 0.001));
            ctx.restore();
        }

        /// <summary>Przypływ: coś wchodzi z zewnątrz i tasuje planszę, zanim gracz się znudzi.</summary>
        public static void rysujPrzyplyw(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, p = P.p;
            var s = Math.Min(w * 0.3, h * 0.5);
            var cx = w / 2;
            var powierzchnia = h * 0.3;

            ctx.save();
            var gora = new Path2D();
            gora.moveTo(0, powierzchnia);
            for (int i = 0; i <= 20; i++) gora.lineTo((i / 20.0) * w, powierzchnia + JsM.Sin(i * 1.3) * 6 + pseudo(i) * 5);
            gora.lineTo(w, h);
            gora.lineTo(0, h);
            gora.closePath();
            ctx.fillStyle = rgba("#100b0a", 0.95);
            ctx.fill(gora);
            kreskuj(ctx, gora, 0.62, 6, rgba(BARWA.atrament, 0.32), 1);
            ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.6);
            ctx.lineWidth = 1.4;
            ctx.stroke(gora);

            // woda wlewa się szczeliną
            var struga = new Path2D();
            struga.moveTo(cx - s * 0.12, powierzchnia);
            struga.lineTo(cx + s * 0.12, powierzchnia);
            struga.lineTo(cx + s * 0.3, powierzchnia + s * 1.2 * Math.Min(1, p * 1.5));
            struga.lineTo(cx - s * 0.3, powierzchnia + s * 1.2 * Math.Min(1, p * 1.5));
            struga.closePath();
            ctx.fillStyle = rgba("#31424d", 0.55);
            ctx.fill(struga);
            kreskuj(ctx, struga, 0.05, 4, rgba(BARWA.papier, 0.5), 1);
            ctx.restore();
        }

        /// <summary>
        /// Trzy zasoby pokazywane po kolei, w rytm narracji: najpierw komora z modlącymi się, potem dym pod stropem, potem krew
        /// w szczelinie, na końcu biała dziura Otchłani.
        /// </summary>
        public static void rysujOrgany(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            var cx = w / 2 + Math.Min(w * 0.08, h * 0.2);      // komora po prawej, papier po lewej
            var s = Math.Min(w * 0.2, h * 0.42);
            var etap = P.takt + P.taktP;
            var podloga = h * 0.7;

            ctx.save();
            // --- komora: zawsze widoczna, żeby scena nigdy nie była czarna
            var komora = new Path2D();
            komora.moveTo(cx - s * 1.2, podloga);
            for (int i = 0; i <= 24; i++)
            {
                var u = i / 24.0;
                komora.lineTo(cx - s * 1.2 + u * s * 2.4, podloga - s * (0.5 + 0.32 * JsM.Sin(u * 3.1)) - pseudo(i) * s * 0.05);
            }
            komora.lineTo(cx + s * 1.2, podloga);
            komora.closePath();
            ctx.fillStyle = rgba("#120c0b", 0.95);
            ctx.fill(komora);
            kreskuj(ctx, komora, 0.62, 6, rgba(BARWA.atrament, 0.4), 1);
            ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.6);
            ctx.lineWidth = 1.4;
            ctx.stroke(komora);

            // podłoga i ołtarz
            ctx.strokeStyle = rgba(BARWA.atrament, 0.5);
            ctx.beginPath();
            ctx.moveTo(cx - s * 1.2, podloga);
            ctx.lineTo(cx + s * 1.2, podloga);
            ctx.stroke();
            var oltarz = new Path2D();
            oltarz.rect(cx - s * 0.13, podloga - s * 0.22, s * 0.26, s * 0.22);
            ctx.fillStyle = rgba("#191110", 0.95);
            ctx.fill(oltarz);
            kreskuj(ctx, oltarz, 1.4, 4, rgba(BARWA.zarBlady, 0.6), 1);
            ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.7);
            ctx.stroke(oltarz);

            // modlący się — od nich wszystko się zaczyna
            for (int i = 0; i < 5; i++)
            {
                var x = cx + (i - 2) * s * 0.36;
                var drg = JsM.Sin(t * 0.002 + i) * s * 0.012;
                sylwetka(ctx, x, podloga + drg, s * 0.24, i == 2 ? "kowal" : "goblin", 0.95);
            }

            // --- takt 1: WIARA jako dym pod stropem
            var wiara = Math.Max(0, Math.Min(1, etap - 0.6));
            if (wiara > 0)
            {
                for (int i = 0; i < 9; i++)
                {
                    var faza = (t * 0.00025 + i * 0.13) % 1;
                    var x = cx + (i - 4) * s * 0.26 + JsM.Sin(t * 0.0009 + i) * s * 0.05;
                    var y = podloga - s * 0.3 - faza * s * 0.55;
                    var r = s * (0.06 + faza * 0.16);
                    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
                    g.addColorStop(0, rgba(BARWA.papier, 0.16 * wiara * (1 - faza)));
                    g.addColorStop(1, rgba(BARWA.papier, 0));
                    ctx.fillStyle = g;
                    ctx.fillRect(x - r, y - r, r * 2, r * 2);
                }
                ctx.fillStyle = rgba(BARWA.atramentMocny, 0.8 * wiara);
                ctx.font = $"{Js.Js.S(Math.Max(11, s * 0.13))}px serif";
                ctx.textAlign = "center";
                ctx.fillText("WIARA", cx, podloga - s * 0.95);
            }

            // --- takt 2: KREW w szczelinie pod podłogą
            var krew = Math.Max(0, Math.Min(1, etap - 1.6));
            if (krew > 0)
            {
                double kx0 = cx + s * 0.2, kx1 = cx + s * 1.15;
                var szczelina = new Path2D();
                szczelina.moveTo(kx0, h);
                for (int i = 0; i <= 16; i++)
                {
                    var u = i / 16.0;
                    var taper = Math.Pow(JsM.Sin(u * PI), 0.7);
                    szczelina.lineTo(kx0 + u * (kx1 - kx0), h - (h - podloga) * 0.92 * taper * (0.5 + 0.5 * Math.Abs(JsM.Sin(u * 8.3))));
                }
                szczelina.lineTo(kx1, h);
                szczelina.closePath();
                ctx.save();
                ctx.clip(szczelina);
                var poziom = (h - podloga) * 0.85 * krew;
                var gk = ctx.createLinearGradient(0, h - poziom, 0, h);
                gk.addColorStop(0, rgba(BARWA.krew, 0.9));
                gk.addColorStop(1, rgba("#2a0607", 0.95));
                ctx.fillStyle = gk;
                ctx.fillRect(kx0 - 10, h - poziom, kx1 - kx0 + 20, poziom + 10);
                ctx.restore();
                ctx.strokeStyle = rgba(BARWA.atrament, 0.45);
                ctx.lineWidth = 1.1;
                ctx.stroke(szczelina);
                ctx.fillStyle = rgba(BARWA.krewJasna, 0.9 * krew);
                ctx.fillText("KREW", (kx0 + kx1) / 2, h - (h - podloga) * 0.18);
            }

            // --- takt 3: OTCHŁAŃ jako dziura w rysunku
            var otchlan = Math.Max(0, Math.Min(1, etap - 2.6));
            if (otchlan > 0)
            {
                double ox = cx - s * 2.1, oy = podloga - s * 0.38;
                var orr = s * 0.55 * otchlan;
                ctx.beginPath();
                for (int k = 0; k <= 24; k++)
                {
                    var a = (k / 24.0) * PI * 2;
                    var wr = orr * (0.72 + pseudo(k * 2.7) * 0.55) * (1 + 0.02 * JsM.Sin(t * 0.0012 + k));
                    double px = ox + JsM.Cos(a) * wr, py = oy + JsM.Sin(a) * wr * 0.82;
                    if (k == 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fillStyle = rgba(BARWA.papier, 0.97);
                ctx.fill();
                blask(ctx, ox, oy, orr * 1.8, BARWA.otchlan, 0.05);
                ctx.fillStyle = rgba("#3a332c", 0.92);
                ctx.font = $"{Js.Js.S(Math.Max(11, s * 0.13))}px serif";
                ctx.fillText("OTCHŁAŃ", ox, oy + orr * 0.12);
            }
            ctx.restore();
        }

        /// <summary>
        /// Rycina celu gry: takt 0 — w głębi bije rdzeń zamknięty w kamiennej skorupie, takt 1 — u góry nacja się modli,
        /// takt 2 — warta schodzi pod skorupę, kamień pęka, takt 3 — skorupa otwarta, wierny klęka i zalewa światło.
        /// </summary>
        public static void rysujCel(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            var etap = P.takt + P.taktP;
            double cx = w / 2, cy = h * 0.72;
            var R = Math.Min(h * 0.2, w * 0.12);
            ctx.save();

            // skała: cały przekrój kreskowany, ciemniejszy w głębi
            var skala = new Path2D();
            skala.rect(0, 0, w, h);
            ctx.fillStyle = "#100c0a";
            ctx.fill(skala);
            kreskuj(ctx, skala, 0.66, 6, rgba(BARWA.atrament, 0.08), 1);

            // gniazdo u góry
            double gx = w * 0.26, gy = h * 0.16;
            var gniazdo = new Path2D();
            gniazdo.ellipse(gx, gy, w * 0.13, h * 0.08, 0, 0, PI * 2);
            ctx.fillStyle = "#0a0706";
            ctx.fill(gniazdo);
            ctx.strokeStyle = rgba(BARWA.atrament, 0.45);
            ctx.lineWidth = 1.2;
            ctx.stroke(gniazdo);
            var modli = Math.Min(1, Math.Max(0, etap - 1));
            for (int i = 0; i < 7; i++)
            {
                double x = gx - w * 0.08 + i * w * 0.027, y = gy + h * 0.035;
                ctx.fillStyle = rgba(BARWA.atramentMocny, 0.85);
                ctx.beginPath(); ctx.arc(x, y - 6, 2.6, 0, PI * 2); ctx.fill();
                ctx.fillRect(x - 2, y - 3, 4, 6);
                // wiara: jasne nitki w górę, gdy się modlą
                if (modli > 0)
                {
                    ctx.strokeStyle = Barwa.Rgba(250, 216, 150, 0.5 * modli * (0.5 + 0.5 * JsM.Sin(t * 0.004 + i)));
                    ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + JsM.Sin(t * 0.002 + i) * 3, y - 22); ctx.stroke();
                }
            }

            // droga w dół: kropki od gniazda pod skorupę
            var zejscie = Math.Min(1, Math.Max(0, etap - 1.5));
            if (zejscie > 0)
            {
                var pkt = new[] { (gx + w * 0.06, gy + h * 0.07), (w * 0.36, h * 0.3), (w * 0.33, h * 0.42), (w * 0.44, h * 0.46), (cx, cy - R * 1.9) };
                ctx.setLineDash(3, 6);
                ctx.lineDashOffset = -t * 0.02;
                ctx.strokeStyle = Barwa.Rgba(250, 196, 110, 0.8 * zejscie);
                ctx.lineWidth = 2;
                ctx.beginPath();
                for (int i = 0; i < pkt.Length; i++) { if (i > 0) ctx.lineTo(pkt[i].Item1, pkt[i].Item2); else ctx.moveTo(pkt[i].Item1, pkt[i].Item2); }
                ctx.stroke();
                ctx.setLineDash();
            }

            // skorupa: pierścień ciosanych bloków; pęknięcia wypadają od góry
            var pekniete = Math.Max(0, Math.Min(5, Math.Floor((etap - 2) * 5)));
            var otwarta = etap >= 3;
            const int bloki = 20;
            for (int i = 0; i < bloki; i++)
            {
                var a0 = (i / (double)bloki) * PI * 2 - PI / 2 - PI / bloki;
                var a1 = a0 + (PI * 2) / bloki - 0.04;
                // bloki na samej górze wypadają jeden po drugim, gdy warta się modli
                var odGory = Math.Min(i, bloki - i);
                if (odGory == 0 && pekniete >= 1) continue;
                if (odGory == 1 && pekniete >= 3 && (i == 1 || pekniete >= 5)) continue;
                var blok = new Path2D();
                blok.arc(cx, cy, R * 1.55, a0, a1);
                blok.arc(cx, cy, R * 1.12, a1, a0, true);
                blok.closePath();
                ctx.fillStyle = "rgba(58,46,40,0.97)";
                ctx.fill(blok);
                kreskuj(ctx, blok, 0.9, 3.5, rgba(BARWA.atrament, 0.22), 1);
                ctx.strokeStyle = "rgba(214,176,128,0.55)";
                ctx.lineWidth = 1;
                ctx.stroke(blok);
            }
            // rysy biegnące przez skorupę, zanim pęknie
            if (etap > 1.8 && !otwarta)
            {
                ctx.strokeStyle = Barwa.Rgba(255, 206, 130, 0.4 + 0.4 * JsM.Sin(t * 0.006));
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                for (int k = 0; k < 3; k++)
                {
                    var a = -PI / 2 + (k - 1) * 0.35;
                    ctx.moveTo(cx + JsM.Cos(a) * R * 1.55, cy + JsM.Sin(a) * R * 1.55);
                    ctx.lineTo(cx + JsM.Cos(a + 0.05) * R * 1.35, cy + JsM.Sin(a + 0.05) * R * 1.35 + pseudo(k) * 3);
                    ctx.lineTo(cx + JsM.Cos(a - 0.03) * R * 1.15, cy + JsM.Sin(a - 0.03) * R * 1.15);
                }
                ctx.stroke();
            }

            // warta nad skorupą
            if (etap > 1.9)
            {
                for (int i = 0; i < 3; i++)
                {
                    double x = cx + (i - 1) * R * 0.5, y = cy - R * 1.72;
                    ctx.fillStyle = rgba(BARWA.atramentMocny, 0.9);
                    ctx.beginPath(); ctx.arc(x, y - 7, 3, 0, PI * 2); ctx.fill();
                    ctx.fillRect(x - 2.5, y - 4, 5, 7);
                }
            }

            // rdzeń: serce z kamienia z podwójnym uderzeniem
            var f = (t % 1600) / 1600;
            var uderz = Math.Max(0, 1 - Math.Abs(f - 0.08) * 14) + 0.7 * Math.Max(0, 1 - Math.Abs(f - 0.26) * 14);
            var swiatlo = otwarta ? Math.Min(1, (etap - 3) * 1.6) : 0;
            var halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * (2.2 + swiatlo * 4));
            halo.addColorStop(0, Barwa.Rgba(255, 140, 90, 0.55 + 0.2 * uderz + swiatlo * 0.3));
            halo.addColorStop(1, "rgba(160,30,30,0)");
            ctx.globalCompositeOperation = "lighter";
            ctx.fillStyle = halo;
            ctx.fillRect(0, 0, w, h);
            ctx.globalCompositeOperation = "source-over";
            var r0 = R * 0.72 * (1 + 0.06 * uderz);
            var kanty = new Path2D();
            for (int i = 0; i < 8; i++)
            {
                var a = (i / 8.0) * PI * 2 + PI / 8;
                var rr = r0 * (i % 2 != 0 ? 0.92 : 1);
                if (i == 0) kanty.moveTo(cx + JsM.Cos(a) * rr, cy + JsM.Sin(a) * rr);
                else kanty.lineTo(cx + JsM.Cos(a) * rr, cy + JsM.Sin(a) * rr);
            }
            kanty.closePath();
            var gr = ctx.createRadialGradient(cx - r0 * 0.25, cy - r0 * 0.3, r0 * 0.05, cx, cy, r0);
            gr.addColorStop(0, swiatlo > 0 ? "#fff4d8" : "#ffd2a6");
            gr.addColorStop(0.35, swiatlo > 0 ? "#f2a04a" : "#e2553c");
            gr.addColorStop(0.8, "#7a1618");
            gr.addColorStop(1, "#2a0808");
            ctx.fillStyle = gr;
            ctx.fill(kanty);
            ctx.strokeStyle = "rgba(255,220,180,0.85)";
            ctx.lineWidth = 1.6;
            ctx.stroke(kanty);

            // klęczący przy rdzeniu i promienie uwolnienia
            if (swiatlo > 0)
            {
                ctx.fillStyle = rgba(BARWA.atramentMocny, 0.95);
                double kx = cx, ky = cy - r0 * 1.25;
                ctx.beginPath(); ctx.arc(kx, ky - 5, 3, 0, PI * 2); ctx.fill();
                ctx.fillRect(kx - 3, ky - 2, 6, 5);
                ctx.globalCompositeOperation = "lighter";
                ctx.strokeStyle = Barwa.Rgba(255, 220, 160, 0.35 * swiatlo);
                ctx.lineWidth = 2;
                ctx.beginPath();
                for (int i = 0; i < 16; i++)
                {
                    var a = (i / 16.0) * PI * 2 + t * 0.0002;
                    ctx.moveTo(cx + JsM.Cos(a) * R * 1.7, cy + JsM.Sin(a) * R * 1.7);
                    ctx.lineTo(cx + JsM.Cos(a) * R * (2.6 + swiatlo * 2), cy + JsM.Sin(a) * R * (2.6 + swiatlo * 2));
                }
                ctx.stroke();
                ctx.globalCompositeOperation = "source-over";
            }
            ctx.restore();
        }

        /// <summary>
        /// Rycina otwierająca: takt 0 — kontur góry rysuje się na oczach, takt 1 — otwierają się komory i korytarze,
        /// takt 2 — pojawiają się mieszkańcy, a ich myśli płyną do rdzenia, takt 3 — rdzeń bije pełną mocą.
        /// </summary>
        public static void rysujGore(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            double cx = w / 2, dol = h * 0.97;
            var szer = Math.Min(w * 0.3, h * 0.92);
            var etap = P.takt + P.taktP;

            var punkty = new List<(double, double)> { (cx - szer * 1.55, dol) };
            var bryla = new Path2D();
            bryla.moveTo(cx - szer * 1.55, dol);
            for (int i = 0; i <= 34; i++)
            {
                var u = i / 34.0;
                var x = cx - szer * 1.55 + u * szer * 3.1;
                var profil = Math.Pow(JsM.Sin(u * PI), 0.75);
                var y = dol - profil * szer * 1.22 - pseudo(i * 3.7) * szer * 0.07;
                bryla.lineTo(x, y);
                punkty.Add((x, y));
            }
            bryla.lineTo(cx + szer * 1.55, dol);
            bryla.closePath();
            punkty.Add((cx + szer * 1.55, dol));

            ctx.save();
            // --- takt 0: sama kreska konturu, potem wypełnienie
            var konturP = Math.Min(1, etap * 1.6);
            var wypelnienie = Math.Max(0, Math.Min(1, etap * 1.2 - 0.25));
            if (wypelnienie > 0)
            {
                ctx.save();
                ctx.globalAlpha = wypelnienie;
                ctx.fillStyle = rgba("#120c0b", 0.97);
                ctx.fill(bryla);
                kreskuj(ctx, bryla, 0.62, 5, rgba(BARWA.atrament, 0.55), 1);
                kreskuj(ctx, bryla, -0.85, 9, rgba(BARWA.atrament, 0.3), 1);
                kreskuj(ctx, bryla, 1.45, 17, rgba(BARWA.atrament, 0.16), 1);
                ctx.restore();
            }
            if (konturP < 1) obrysPostep(ctx, punkty, rgba(BARWA.atramentMocny, 0.95), 1.8, konturP);
            else obrys(ctx, punkty, rgba(BARWA.atramentMocny, 0.95), 1.8);

            ctx.save();
            ctx.clip(bryla);

            var komory = new List<(double x, double y, double r)>();
            for (int i = 0; i < 10; i++)
            {
                var kx = cx + (pseudo(i * 5.1) - 0.5) * szer * 2.2;
                var ky = dol - szer * (0.12 + pseudo(i * 2.7) * 0.95);
                var kr = szer * (0.055 + pseudo(i * 9.3) * 0.085);
                komory.Add((kx, ky, kr));
            }

            // --- takt 1: korytarze rosną, komory otwierają się po kolei
            var otwarte = Math.Max(0, (etap - 0.9)) * komory.Count * 1.4;
            ctx.strokeStyle = rgba(BARWA.atrament, 0.35);
            ctx.lineWidth = Math.Max(1, szer * 0.012);
            for (int i = 1; i < komory.Count; i++)
            {
                var widok = Math.Max(0, Math.Min(1, otwarte - i + 1));
                if (widok <= 0) continue;
                var (ax, ay, _) = komory[i - 1];
                var (bx, by, _) = komory[i];
                double mx = (ax + bx) / 2 + (pseudo(i) - 0.5) * szer * 0.4, my = (ay + by) / 2;
                ctx.globalAlpha = widok;
                ctx.beginPath();
                ctx.moveTo(ax, ay);
                ctx.quadraticCurveTo(mx, my, ax + (bx - ax) * widok, ay + (by - ay) * widok);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            for (int i = 0; i < komory.Count; i++)
            {
                var widok = Math.Max(0, Math.Min(1, otwarte - i));
                if (widok <= 0) continue;
                var (kx, ky, kr) = komory[i];
                var oddech = 1 + 0.02 * JsM.Sin(t * 0.0012 + i);
                var komora = new Path2D();
                komora.ellipse(kx, ky, kr * 1.6 * widok * oddech, kr * widok * oddech, pseudo(i) * 2, 0, PI * 2);
                ctx.fillStyle = rgba("#080606", 0.96);
                ctx.fill(komora);
                kreskuj(ctx, komora, 1.1, 8, rgba(BARWA.atrament, 0.22), 1);
                ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.5 * widok);
                ctx.lineWidth = 1.2;
                ctx.stroke(komora);

                // --- takt 2: mieszkańcy i ich myśli
                if (etap > 1.9 && widok > 0.8)
                {
                    var ludzie = Math.Max(0, Math.Min(1, (etap - 1.9) * 2.5));
                    var ilu = i % 3 == 0 ? 2 : 1;
                    for (int k = 0; k < ilu; k++)
                    {
                        var chwianie = JsM.Sin(t * 0.0025 + i * 2 + k) * kr * 0.08;
                        sylwetka(ctx, kx + (k - (ilu - 1) / 2.0) * kr * 0.9 + chwianie, ky + kr * 0.75,
                            Math.Max(6, kr * 0.62), i % 4 == 1 ? "kowal" : "goblin", 0.8 * ludzie);
                    }
                    // myśl płynąca do rdzenia — to jest dosłownie twój pokarm
                    if (etap > 2.1)
                    {
                        var faza = (t * 0.0004 + i * 0.37) % 1;
                        var rx = dol - szer * 0.2;
                        var px = kx + (cx - kx) * faza;
                        var py = ky + (rx - ky) * faza;
                        ctx.fillStyle = rgba(BARWA.atramentMocny, 0.5 * (1 - faza) * ludzie);
                        ctx.beginPath();
                        ctx.arc(px, py, Math.Max(1, szer * 0.008), 0, PI * 2);
                        ctx.fill();
                    }
                }
            }

            // komora rdzenia
            if (etap > 0.8)
            {
                var ryK = dol - szer * 0.2;
                var jama = new Path2D();
                jama.ellipse(cx, ryK, szer * 0.34, szer * 0.26, 0, 0, PI * 2);
                ctx.fillStyle = rgba("#0a0605", 0.96);
                ctx.fill(jama);
                kreskuj(ctx, jama, 0.4, 7, rgba(BARWA.krew, 0.3), 1);
                ctx.strokeStyle = rgba(BARWA.krewJasna, 0.55);
                ctx.lineWidth = 1.3;
                ctx.stroke(jama);
            }

            // żyła rudy
            if (etap > 1.4)
            {
                ctx.strokeStyle = rgba(BARWA.zarBlady, 0.4);
                ctx.lineWidth = Math.Max(1, szer * 0.016);
                ctx.setLineDash(szer * 0.04, szer * 0.03);
                ctx.lineDashOffset = -t * 0.004;
                ctx.beginPath();
                ctx.moveTo(cx - szer * 1.2, dol - szer * 0.55);
                ctx.quadraticCurveTo(cx, dol - szer * 0.85, cx + szer * 1.1, dol - szer * 0.45);
                ctx.stroke();
                ctx.setLineDash();
            }
            ctx.restore();

            // --- rdzeń: ledwie tli się na początku, bije pełną mocą w ostatnim takcie
            var moc = Math.Max(0.15, Math.Min(1, (etap - 0.6) / 2.2));
            var puls = 0.55 + 0.45 * JsM.Sin(t * 0.0016);
            var ry = dol - szer * 0.2;
            blask(ctx, cx, ry, szer * (0.5 + puls * 0.3) * (0.6 + moc), BARWA.krew, 0.34 * moc);
            var rdzen = new Path2D();
            rdzen.ellipse(cx, ry, szer * 0.12 * (0.8 + moc * 0.2), szer * 0.095 * (0.8 + moc * 0.2), 0, 0, PI * 2);
            ctx.fillStyle = rgba(BARWA.krew, (0.4 + puls * 0.3) * moc + 0.15);
            ctx.fill(rdzen);
            kreskuj(ctx, rdzen, 1.2, 3, rgba(BARWA.krewJasna, 0.8 * moc), 1);
            ctx.strokeStyle = rgba(BARWA.krewJasna, 0.7 * moc);
            ctx.lineWidth = 1.2;
            ctx.stroke(rdzen);

            if (etap > 2.8)
            {
                var promienie = Math.Min(1, (etap - 2.8) * 2);
                ctx.strokeStyle = rgba(BARWA.krew, 0.3 * promienie);
                for (int i = 0; i < 12; i++)
                {
                    var a = (i / 12.0) * PI * 2 + t * 0.00012;
                    double r1 = szer * 0.17, r2 = szer * (0.24 + puls * 0.1) * (0.6 + promienie * 0.8);
                    ctx.beginPath();
                    ctx.moveTo(cx + JsM.Cos(a) * r1, ry + JsM.Sin(a) * r1 * 0.85);
                    ctx.lineTo(cx + JsM.Cos(a) * r2, ry + JsM.Sin(a) * r2 * 0.85);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }

        /// <summary>Skażenie: zmieniasz krew gatunku. Zmiana idzie w dół pokoleń i nie wraca.</summary>
        public static void rysujKrew(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h;
            var etap = P.takt + P.taktP;
            double cx = w / 2, cy = h / 2;
            var s = Math.Min(w * 0.26, h * 0.4);

            ctx.save();
            // rodowód: jedno stworzenie u góry, coraz więcej niżej
            const int rzedy = 4;
            for (int r = 0; r < rzedy; r++)
            {
                var ile = r + 1;
                var skazenie = Math.Max(0, Math.Min(1, (etap - 1.2) * 0.9 - r * 0.3));
                for (int i = 0; i < ile; i++)
                {
                    var x = cx + (i - (ile - 1) / 2.0) * s * 0.55;
                    var y = cy - s * 0.75 + r * s * 0.5;
                    ctx.save();
                    if (skazenie > 0) blask(ctx, x, y - s * 0.12, s * 0.22 * skazenie, BARWA.krew, 0.35 * skazenie);
                    sylwetka(ctx, x, y, s * 0.3 * (1 + skazenie * 0.25), "goblin", 1);
                    ctx.restore();
                    if (r > 0)
                    {
                        ctx.strokeStyle = rgba(BARWA.krew, 0.25 + 0.5 * skazenie);
                        ctx.lineWidth = 1 + skazenie * 2;
                        ctx.beginPath();
                        ctx.moveTo(cx + (Math.Floor(i / 2.0) - (r - 1) / 2.0) * s * 0.55, y - s * 0.5 + s * 0.02);
                        ctx.lineTo(x, y - s * 0.32);
                        ctx.stroke();
                    }
                }
            }

            // kropla, która zmienia wszystko poniżej
            var kropla = new Path2D();
            var spadanie = Math.Max(0, Math.Min(1, etap - 0.7));
            var ky = cy - s * 1.15 + spadanie * s * 0.35;
            kropla.moveTo(cx, ky - s * 0.12);
            kropla.quadraticCurveTo(cx + s * 0.07, ky, cx, ky + s * 0.08);
            kropla.quadraticCurveTo(cx - s * 0.07, ky, cx, ky - s * 0.12);
            ctx.fillStyle = rgba(BARWA.krew, 0.85);
            ctx.fill(kropla);
            kreskuj(ctx, kropla, 1.1, 3, rgba(BARWA.krewJasna, 0.8), 1);
            blask(ctx, cx, ky, s * 0.18, BARWA.krew, 0.3);
            ctx.restore();
        }

        /// <summary>Kronika: zapis tego, czym byłeś dla tych, którzy w tobie mieszkali.</summary>
        public static void rysujKronike(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t, p = P.p;
            double cx = w / 2, cy = h / 2;
            double kw = Math.Min(w * 0.52, 520), kh = Math.Min(h * 0.62, 420);

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-0.02 + JsM.Sin(t * 0.0004) * 0.004);

            var karta = new Path2D();
            karta.moveTo(-kw / 2, -kh / 2);
            for (int i = 0; i <= 12; i++) karta.lineTo(-kw / 2 + (i / 12.0) * kw, -kh / 2 + JsM.Sin(i * 1.9) * 3);
            karta.lineTo(kw / 2, kh / 2);
            for (int i = 12; i >= 0; i--) karta.lineTo(-kw / 2 + (i / 12.0) * kw, kh / 2 + JsM.Sin(i * 2.3) * 3);
            karta.closePath();
            ctx.fillStyle = rgba(BARWA.papier, 0.95);
            ctx.fill(karta);
            ctx.strokeStyle = rgba("#2a211c", 0.5);
            ctx.lineWidth = 1.2;
            ctx.stroke(karta);
            kreskuj(ctx, karta, -0.7, 26, rgba("#7a6b58", 0.18), 1);

            // linijki tekstu pojawiają się jedna po drugiej
            const int linie = 13;
            ctx.strokeStyle = rgba("#241c18", 0.62);
            ctx.lineWidth = 1.3;
            for (int i = 0; i < linie; i++)
            {
                var widoczna = Math.Max(0, Math.Min(1, p * linie - i));
                if (widoczna <= 0) continue;
                var y = -kh / 2 + kh * 0.14 + i * (kh * 0.062);
                var dl = (kw * 0.72) * (0.55 + pseudo(i * 3.7) * 0.45) * widoczna;
                ctx.beginPath();
                ctx.moveTo(-kw * 0.33, y);
                ctx.lineTo(-kw * 0.33 + dl, y);
                ctx.stroke();
            }
            ctx.restore();
        }

        /// <summary>Pięć sposobów istnienia w jednym szeregu — każdy inny, żaden nie „lepszy”.</summary>
        public static void rysujRasy(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            var etap = P.takt + P.taktP;
            var s = Math.Min(w * 0.062, h * 0.26);
            var typy = new[] { "goblin", "kowal", "trol", "przadka" };
            var nazwy = new[] { "Ślepy Lud", "Żużlowcy", "Trole", "Prządki", "Grzybnia" };
            var ile = nazwy.Length;
            var rozstaw = Math.Min((w * 0.82) / ile, s * 2.6);
            var x0 = w / 2 - (rozstaw * (ile - 1)) / 2;
            var podloga = h * 0.62;

            ctx.save();
            var grunt = new Path2D();
            grunt.rect(0, podloga, w, Math.Max(h - podloga, s * 1.1));
            ctx.fillStyle = rgba("#100b0a", 0.92);
            ctx.fill(grunt);
            kreskuj(ctx, grunt, 0.6, 6, rgba(BARWA.atrament, 0.35), 1);

            for (int i = 0; i < ile; i++)
            {
                var x = x0 + i * rozstaw;
                // kolejne rasy wchodzą w kadr w takt narracji, nie na raz
                var widoczny = Math.Min(1, Math.Max(0, (etap / 4) * ile - i));
                if (widoczny <= 0) continue;
                ctx.save();
                ctx.globalAlpha = widoczny;
                if (i < 4)
                {
                    // każda rasa porusza się inaczej
                    var chod = i == 0 ? JsM.Sin(t * 0.004 + i) * s * 0.05
                        : i == 1 ? (Math.Floor(JsM.Sin(t * 0.002) * 2 + 0.5) / 2) * s * 0.05
                        : i == 2 ? JsM.Sin(t * 0.0008) * s * 0.02
                        : (Math.Floor(t / 900) % 2) * s * 0.06;
                    var wejscieX = (1 - widoczny) * -s * 1.5;
                    sylwetka(ctx, x + chod + wejscieX, podloga, s * (i == 2 ? 1.05 : 0.8), typy[i], 1);
                }
                else
                {
                    var grzyb = new Path2D();
                    for (int k = 0; k < 9; k++)
                    {
                        var gx = x - s * 0.4 + (k / 8.0) * s * 0.8;
                        var gy = podloga - s * (0.12 + 0.28 * Math.Abs(JsM.Sin(k * 1.7))) * (0.6 + 0.4 * Math.Min(1, widoczny * 1.5 + JsM.Sin(t * 0.0006 + k) * 0.1));
                        grzyb.moveTo(gx, podloga);
                        grzyb.lineTo(gx, gy);
                        grzyb.ellipse(gx, gy, s * 0.09, s * 0.06, 0, 0, PI * 2);
                    }
                    ctx.strokeStyle = rgba(BARWA.biolumina, 0.85);
                    ctx.lineWidth = 1.4;
                    ctx.stroke(grzyb);
                }
                ctx.restore();
                ctx.fillStyle = rgba(BARWA.atrament, 0.9 * widoczny);
                ctx.font = $"{Js.Js.S(Math.Max(11, s * 0.3))}px serif";
                ctx.textAlign = "center";
                ctx.fillText(nazwy[i], x, podloga + s * 0.62);
            }
            ctx.restore();
        }

        /// <summary>Korytarze jako żyły: ktoś drąży w tobie i to jest twój układ krwionośny.</summary>
        public static void rysujZyly(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t, p = P.p;
            double cx = w / 2, cy = h / 2;
            var skala = Math.Min(w * 0.3, h * 0.46);

            var skala2 = new Path2D();
            skala2.rect(cx - skala * 1.6, cy - skala, skala * 3.2, skala * 2);
            ctx.save();
            ctx.fillStyle = rgba("#100b0a", 0.95);
            ctx.fill(skala2);
            kreskuj(ctx, skala2, 0.62, 6, rgba(BARWA.atrament, 0.42), 1);
            ctx.strokeStyle = rgba(BARWA.atrament, 0.45);
            ctx.lineWidth = 1.2;
            ctx.stroke(skala2);

            // żyły rosną z postępem sceny — rysunek powstaje na oczach
            const int galezie = 5;
            for (int g = 0; g < galezie; g++)
            {
                var kat = -PI / 2 + (g - (galezie - 1) / 2.0) * 0.55;
                double x = cx, y = cy + skala * 0.8;
                var punkty = new List<(double, double)> { (x, y) };
                var dlugosc = Math.Floor(14 * Math.Min(1, p * 1.4) + 0.5);
                for (int i = 0; i < dlugosc; i++)
                {
                    var rozchwianie = (pseudo(g * 12.1 + i * 3.3) - 0.5) * 0.8;
                    x += JsM.Cos(kat + rozchwianie) * skala * 0.11;
                    y += JsM.Sin(kat + rozchwianie) * skala * 0.11;
                    punkty.Add((x, y));
                }
                var zyla = new Path2D();
                zyla.moveTo(punkty[0].Item1, punkty[0].Item2);
                foreach (var (px, py) in punkty) zyla.lineTo(px, py);
                ctx.save();
                ctx.strokeStyle = rgba("#070505", 1);
                ctx.lineWidth = skala * 0.055;
                ctx.lineCap = "round";
                ctx.stroke(zyla);
                ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.5);
                ctx.lineWidth = 1.2;
                ctx.stroke(zyla);
                ctx.restore();
                obrys(ctx, punkty.ConvertAll(q => (q.Item1, q.Item2 - skala * 0.03)), rgba(BARWA.atrament, 0.3), 1);
            }

            // kilofy przy końcach — to nie erozja, to czyjaś praca
            for (int g = 0; g < 3; g++)
            {
                var faza = (t * 0.0012 + g) % 1;
                var x = cx + (g - 1) * skala * 0.5;
                var y = cy - skala * 0.2 + JsM.Sin(faza * PI * 2) * 2;
                sylwetka(ctx, x, y, skala * 0.17, g == 1 ? "kowal" : "goblin", 0.9 * p);
            }
            ctx.restore();
        }
    }
}
