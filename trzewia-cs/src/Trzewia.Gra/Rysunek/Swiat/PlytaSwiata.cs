// Świat na płycie w kolejności z alpha-1/src/app/screens/game.ts (render(): od eng.rysuj do rysujAniola) — wspólne dla
// ekranu i testu podglądu. Wołane po ctx.translate(plate.x, plate.y) i obcięciu do płyty. Warstw, których jeszcze nie
// przeniesiono (pomieszczenia, ołtarz, ruiny, schody, katedra, wiadra, pomnik, efekty, zarys, urobki — etap 3c),
// tu brak; ich miejsca opisują komentarze „(3c)”.
using System;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Rdzen.SettingsStore;

namespace Trzewia.Rysunek
{
    public static class PlytaSwiata
    {
        public static void Rysuj(IPlotno ctx, Sim sim, Camera cam, Rycina eng, Tajemnica tajemnica, double teraz, bool pauza, double oddech)
        {
            ctx.save();
            // wygładzanie zawsze: płyta bywa większa od bufora (skala ekranu), a najbliższy sąsiad szarpał kreskę
            ctx.imageSmoothingEnabled = true;
            eng.rysuj(ctx, cam, ustawienia.jasnosc);
            // fresk: faktura tynku przyklejona do świata — jedzie razem ze skałą, gdy przesuwasz kamerę
            if (eng.fresk) Fresk.tynkSwiata(ctx, cam);
            eng.poswiata(ctx, cam, true);
            tajemnica.znaki(ctx, sim, cam, oddech, pauza);
            RysRdzen.rysujRdzen(ctx, sim, cam, teraz);
            // kruszec w skale: bryłki żelaza i żyłki złota (pod rysami kucia i pod mrokiem)
            Zyly.rysujZyly(ctx, sim, cam, teraz);
            // skała napoczęta kilofem pęka coraz mocniej
            Kucie.rysujKucie(ctx, sim, cam, teraz);
            // (3c) pokoje.rysujWnetrza, oltarz.rysuj, ruiny.rysuj
            RysLoch.rysujLoch(ctx, sim, cam, teraz);
            // (3c) rysujSchodyDrogi, rysujBudoweSchodow
            // katedra na powierzchni nad szybem ze światłem — kamień (szkło rozety i płomienie świec — nad mrokiem)
            Katedra.rysujKatedre(ctx, sim, cam);
            Shafts.smugiSwiatla(ctx, sim, cam, teraz);
            Overlay.drawParticles(ctx, sim, cam);
            RysTrupy.rysujTrupy(ctx, sim, cam, teraz);
            double grunt(double x) => World.SURFACE_Y - Grzbiet.wysokoscGrzbietu(sim.world, x);
            Konwoj.rysujKonwoj(ctx, sim, cam, teraz, grunt);
            RysWiadra.rysujWiadra(ctx, sim, cam, teraz);
            // mrok: świat widać tylko w świetle lampek, obozów, rdzenia i Cudu; żar i kryształy świecą przez ciemność
            RysMrok.rysujMrok(ctx, sim, cam, teraz, pauza);
            if (Nastawy.NastawyMrok.MROK.wlaczony) eng.poswiata(ctx, cam, false);
            // katedra: witraże rozety i okien, płomienie świec — świecą przez mrok; z rozety pada promień na ołtarz
            Katedra.rysujKatedreNad(ctx, sim, cam, teraz);
            Promien.rysujPromien(ctx, sim, cam, teraz);
            Konwoj.rysujKonwojNad(ctx, sim, cam, teraz, grunt);
            // etap 5: Wielki Pomnik demona — nad mrokiem (żarzy się sam i trzeba go widzieć z krypty)
            if (Nastawy.NastawyPomnik.POMNIK.wlaczony) RysPomnik.rysujPomnik(ctx, sim, cam, teraz);
            // (3c) urobki.rysujNaMapie, pokoje.rysujNad, oltarz.rysujNad, ruiny.rysujNad
            RysLoch.rysujLochNad(ctx, sim, cam, teraz);
            // (3c) plan drogi / droga pielgrzymów, rysujZarys, rysujZaznaczenie
            Figury.rysujStworzenia(ctx, sim, cam, teraz);
            // (3c) pokoje.rysujPrzod
            RysWiadra.rysujPrzodWiader(ctx, sim, cam, teraz);
            // (3c) polecenia na mapie, rysujEfekty, znaczniki ludu
            RysStraznicy.rysujStraznikowWSkale(ctx, sim, cam, teraz);
            // etap 5: błyski pomnika, rozpad i konanie demona (fala światła, popiół)
            RysPomnik.rysujNadPomnikiem(ctx, sim, cam, teraz);
            RysDlon.rysujDlon(ctx, sim, cam, teraz);
            RysDlonDemona.rysujDlonDemona(ctx, sim, cam, teraz);
            RysAniol.rysujAniola(ctx, sim, cam, teraz);
            if (pauza)
            {
                // czas stoi: świat przygasa
                ctx.fillStyle = "rgba(8,6,10,0.26)";
                ctx.fillRect(-cam.vw, -cam.vh, cam.vw * 3, cam.vh * 3);
            }
            ctx.restore();
        }
    }
}
