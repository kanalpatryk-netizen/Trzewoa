// Port: krag-3-beta/src/render/konwoj.ts (zaprzegnieci) — Krąg Trzeci: zamiast koni wóz z resztkami ciągną potępieni
// w uprzęży — dwóch obok siebie, pochyleni, z pasem przez pierś (jednostki: kafle, stopy w y = 0, przód w +x). Dalsi
// ciemniejsi. Woła go Konwoj.rysujKonwoj, gdy Krag.Wlaczony.
using System;
using Trzewia.Plotna;

namespace Trzewia.Rysunek
{
    public static partial class Konwoj
    {
        static readonly (double dx, double przes)[] ZAPRZEG = { (-0.55, 0), (0.75, Math.PI * 0.7) };

        static void zaprzegnieci(IPlotno ctx, double faza, double tempo, double teraz, double lw, bool dalsi)
        {
            var sk = dalsi ? "rgb(96,92,78)" : "rgb(140,134,112)";
            const string tusz = "rgba(14,10,8,0.95)";
            foreach (var (dx, przes) in ZAPRZEG)
            {
                var f = faza + przes;
                var krok = Math.Sin(f) * 0.32 * Math.Max(0.2, tempo);
                var unies = Math.Max(0, Math.Cos(f)) * 0.18 * Math.Max(0.2, tempo);
                var bob = -Math.Abs(Math.Sin(f)) * 0.04;
                var pochyl = 0.62 + 0.04 * Math.Sin(teraz * 0.002 + dx);
                ctx.save();
                ctx.translate(dx, 0);
                ctx.lineCap = "round"; ctx.lineJoin = "round";
                // nogi
                (double x, double y) biodro = (0, -0.95 + bob);
                for (int n = 0; n < 2; n++)
                {
                    double s0 = n == 0 ? 1 : -1;
                    (double x, double y) stopa = (krok * s0, -(s0 > 0 ? unies : 0));
                    (double x, double y) kolano = ((biodro.x + stopa.x) / 2 + 0.16, (biodro.y + stopa.y) / 2);
                    ctx.strokeStyle = tusz; ctx.lineWidth = 0.2 + lw;
                    ctx.beginPath(); ctx.moveTo(biodro.x, biodro.y); ctx.lineTo(kolano.x, kolano.y); ctx.lineTo(stopa.x, stopa.y); ctx.stroke();
                    ctx.strokeStyle = sk; ctx.lineWidth = 0.16;
                    ctx.beginPath(); ctx.moveTo(biodro.x, biodro.y); ctx.lineTo(kolano.x, kolano.y); ctx.lineTo(stopa.x, stopa.y); ctx.stroke();
                }
                // tułów pochylony do przodu
                (double x, double y) bark = (biodro.x + Math.Sin(pochyl) * 0.72, biodro.y - Math.Cos(pochyl) * 0.72);
                ctx.strokeStyle = tusz; ctx.lineWidth = 0.42 + lw;
                ctx.beginPath(); ctx.moveTo(biodro.x, biodro.y); ctx.lineTo(bark.x, bark.y); ctx.stroke();
                ctx.strokeStyle = sk; ctx.lineWidth = 0.38;
                ctx.beginPath(); ctx.moveTo(biodro.x, biodro.y); ctx.lineTo(bark.x, bark.y); ctx.stroke();
                // łachman na biodrach
                ctx.fillStyle = dalsi ? "rgb(48,40,32)" : "rgb(70,58,44)";
                ctx.beginPath(); ctx.ellipse(biodro.x + 0.05, biodro.y + 0.05, 0.24, 0.16, pochyl * 0.5, 0, Math.PI * 2); ctx.fill();
                // głowa nisko
                ctx.fillStyle = sk; ctx.strokeStyle = tusz; ctx.lineWidth = lw;
                ctx.beginPath(); ctx.arc(bark.x + 0.2, bark.y + 0.02, 0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                // ręce zaciśnięte na pasie przy piersi, pas do tyłu (do wozu)
                ctx.strokeStyle = sk; ctx.lineWidth = 0.12;
                ctx.beginPath(); ctx.moveTo(bark.x, bark.y + 0.05); ctx.lineTo(bark.x + 0.12, bark.y + 0.35); ctx.lineTo(bark.x - 0.08, bark.y + 0.3); ctx.stroke();
                ctx.strokeStyle = "rgba(60,42,26,1)"; ctx.lineWidth = 0.06;
                ctx.beginPath(); ctx.moveTo(bark.x - 0.05, bark.y + 0.25); ctx.lineTo(-1.2, -0.95); ctx.stroke();
                ctx.restore();
            }
        }
    }
}
