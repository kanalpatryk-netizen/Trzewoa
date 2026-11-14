// Świat na płycie w kolejności z alpha-1/src/app/screens/game.ts (render(): od eng.rysuj do rysujAniola) — wspólne dla
// ekranu i testu podglądu. Wołane po ctx.translate(plate.x, plate.y) i obcięciu do płyty. Trzyma rysunki ze stanem
// (pomieszczenia, ołtarz, ruiny, urobki), jak pola ekranu gry w TS. Tego, co należy do sterowania (zaznaczenie, rozkazy,
// polecenia na mapie, ramka, podgląd planu pod kursorem, znaczniki ludu, panel deweloperski, cel podpowiedzi), tu brak —
// to warstwy ekranu gry (etap 4); ich miejsca opisują komentarze „(4)”.
using System;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Rdzen.SettingsStore;

namespace Trzewia.Rysunek
{
    public sealed class PlytaSwiata
    {
        public readonly Rycina rycina = new Rycina();
        public readonly Tajemnica tajemnica = new Tajemnica();
        public readonly Pokoje pokoje = new Pokoje();
        public readonly RysOltarz oltarz = new RysOltarz();
        public readonly RysRuiny ruiny = new RysRuiny();
        public readonly Urobki urobki = new Urobki();
        /// <summary>Czy znaki nieznanego były w tej klatce widoczne (game.ts: znakowWidac).</summary>
        public int znakowWidac;

        /// <summary>
        /// Świat na płycie. `pomPod` i `oltarzPod` — co pod kursorem (podpisy); `oddech` — oddech rdzenia (Tajemnica).
        /// </summary>
        public void Rysuj(IPlotno ctx, Sim sim, Camera cam, double teraz, bool pauza, double oddech, PodKursorem? pomPod = null, string? oltarzPod = null)
        {
            var eng = rycina;
            ctx.save();
            // wygładzanie zawsze: płyta bywa większa od bufora (skala ekranu), a najbliższy sąsiad szarpał kreskę
            ctx.imageSmoothingEnabled = true;
            eng.rysuj(ctx, cam, ustawienia.jasnosc);
            // fresk: faktura tynku przyklejona do świata — jedzie razem ze skałą, gdy przesuwasz kamerę
            if (eng.fresk) Fresk.tynkSwiata(ctx, cam);
            eng.poswiata(ctx, cam, true);
            znakowWidac = tajemnica.znaki(ctx, sim, cam, oddech, pauza);
            RysRdzen.rysujRdzen(ctx, sim, cam, teraz);
            // kruszec w skale: bryłki żelaza i żyłki złota (pod rysami kucia i pod mrokiem)
            Zyly.rysujZyly(ctx, sim, cam, teraz);
            // skała napoczęta kilofem pęka coraz mocniej
            Kucie.rysujKucie(ctx, sim, cam, teraz);
            // etap 3c: wyposażenie gotowych pomieszczeń — w mroku ginie jak skała
            pokoje.rysujWnetrza(ctx, sim, cam, teraz);
            // etap 3d: ołtarz na środku sali — kamień i drewno (świece i smuga dnia — nad mrokiem)
            oltarz.rysuj(ctx, sim, cam);
            // etap 3e: ruiny — mury, łuki, belki, zabytek na posadzce (światło zabytku — nad mrokiem)
            ruiny.rysuj(ctx, sim, cam);
            RysLoch.rysujLoch(ctx, sim, cam, teraz);
            // droga wiernych: schody kręcone — tylko to, co już zbudowano (po lochu: dół schodów stoi w komnacie z kotłem)
            Schody.rysujSchodyDrogi(ctx, sim, cam, teraz);
            // 6.11: budowa schodów — drabina, rusztowanie, kołowrót z kubłem urobku albo opuszczanym stopniem, hałda
            RysBudowaSchodow.rysujBudoweSchodow(ctx, sim, cam, teraz);
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
            // etap 3b: rozbity kafel rudy błyska (złoto) albo sypie iskry (żelazo) — to światło, więc nad mrokiem
            urobki.zbierz(sim, teraz);
            urobki.rysujNaMapie(ctx, cam, teraz);
            // etap 3c: plany, ogień paleniska, złoto w tyglu, iskry, „z z z” — nad mrokiem
            pokoje.zbierz(sim, teraz, urobki);
            pokoje.rysujNad(ctx, sim, cam, teraz, pomPod);
            // etap 3d: smuga dnia, świece, rytuał w toku — nad mrokiem
            oltarz.zbierz(sim, teraz, urobki);
            oltarz.rysujNad(ctx, sim, cam, teraz, oltarzPod);
            // etap 3e: odkrycie zabytku, wzięcie, zostawienie
            ruiny.rysujNad(ctx, sim, cam, teraz);
            // 6.11: wywar w kotle i zaklinanie, płomienie, runy bramy, krąg modlitwy za innych — nad mrokiem
            RysLoch.rysujLochNad(ctx, sim, cam, teraz);
            // (4) podgląd planu pod kursorem: pokoje.podglad
            // droga pielgrzymów: którędy wierni zejdą pod rdzeń (25.10: droga wiernych jako szyb — plan widać zawsze)
            var plan = Pielgrzymka.aktualnyPlan(sim);
            if (plan?.szyb != null && !sim.rytual.otwarta) Zarys.rysujPlanDrogi(ctx, sim, cam, plan, teraz);
            else if (plan != null && plan.kopac.Count > 0 && !sim.rytual.otwarta && sim.tick - plan.tick < 3000)
                Zarys.rysujDrogePielgrzymow(ctx, sim, cam, plan, teraz, false);
            Zarys.rysujZarys(ctx, sim, cam, teraz);
            // (4) rysujZaznaczenie
            Figury.rysujStworzenia(ctx, sim, cam, teraz);
            // etap 3f: część zbroi w rękach rycerza i błysk, gdy ją założy — przed postaciami
            pokoje.rysujPrzod(ctx, sim, cam, teraz);
            RysWiadra.rysujPrzodWiader(ctx, sim, cam, teraz);
            // (4) rysujPoleceniaNaMapie, rysujRamke, rysujDev
            Efekty.rysujEfekty(ctx, sim.efekty, cam, teraz, sim);
            // (4) rysujZnacznikiLudu
            RysStraznicy.rysujStraznikowWSkale(ctx, sim, cam, teraz);
            // etap 5: błyski pomnika, rozpad i konanie demona (fala światła, popiół)
            RysPomnik.rysujNadPomnikiem(ctx, sim, cam, teraz);
            RysDlon.rysujDlon(ctx, sim, cam, teraz);
            RysDlonDemona.rysujDlonDemona(ctx, sim, cam, teraz);
            RysAniol.rysujAniola(ctx, sim, cam, teraz);
            if (pauza)
            {
                // czas stoi: świat przygasa (4: a na nim plan rozkazów — rysujRozkazy)
                ctx.fillStyle = "rgba(8,6,10,0.26)";
                ctx.fillRect(-cam.vw, -cam.vh, cam.vw * 3, cam.vh * 3);
            }
            // (4) podswietlCel
            ctx.restore();
        }
    }
}
