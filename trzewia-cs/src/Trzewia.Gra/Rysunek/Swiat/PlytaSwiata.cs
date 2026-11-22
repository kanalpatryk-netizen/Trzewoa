// Świat na płycie w kolejności z alpha-1/src/app/screens/game.ts (render(): od eng.rysuj do rysujAniola) — wspólne dla
// ekranu i testu podglądu. Wołane po ctx.translate(plate.x, plate.y) i obcięciu do płyty. Trzyma rysunki ze stanem
// (pomieszczenia, ołtarz, ruiny, urobki), jak pola ekranu gry w TS. Tego, co należy do sterowania (zaznaczenie, rozkazy,
// polecenia na mapie, ramka, podgląd planu pod kursorem, znaczniki ludu, panel deweloperski, cel podpowiedzi), tu brak —
// to warstwy ekranu gry (etap 4); ich miejsca opisują komentarze „(4)”.
using System;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Rdzen.SettingsStore;
using Czesc = Trzewia.Rdzen.Czesc;

namespace Trzewia.Rysunek
{
    /// <summary>
    /// Warstwy ekranu gry wplecione w świat (game.ts: render) — w miejscach „(4)” z kolejności rysowania. Ekran próbny
    /// i test podglądu ich nie mają.
    /// </summary>
    public interface IWarstwySterowania
    {
        /// <summary>Kogo karta mieszkańca jest otwarta (rysujStworzenia go wyróżnia).</summary>
        double? wybrany { get; }
        /// <summary>Podgląd planu pod kursorem (pokoje.podglad) — po rysujLochNad.</summary>
        void podglad(IPlotno ctx, Camera cam, double teraz);
        /// <summary>Złoty pierścień pod zaznaczonymi — przed postaciami.</summary>
        void zaznaczenie(IPlotno ctx, Camera cam, double teraz);
        /// <summary>Polecenia na mapie, ramka, rysunki trybu deweloperskiego — po przodach wiader.</summary>
        void polecenia(IPlotno ctx, Camera cam, double teraz);
        /// <summary>Znaczniki ludu (obozy) — po efektach.</summary>
        void znacznikiLudu(IPlotno ctx, Camera cam, double teraz);
        /// <summary>W pauzie, po przygaszeniu świata: szkice rozkazów.</summary>
        void rozkazy(IPlotno ctx, Camera cam, double teraz);
        /// <summary>Cel podpowiedzi — na samym końcu.</summary>
        void cel(IPlotno ctx, Camera cam, double teraz);
    }

    public sealed class PlytaSwiata
    {
        public readonly Rycina rycina = new Rycina();
        public readonly Tajemnica tajemnica = new Tajemnica();
        public readonly Pokoje pokoje = new Pokoje();
        public readonly RysOltarz oltarz = new RysOltarz();
        public readonly RysRuiny ruiny = new RysRuiny();
        public readonly Urobki urobki = new Urobki();
        /// <summary>Oprawa walki, etap 1: warstwa światła (Visual/SwiatloOprawy.cs) — tylko z włączoną oprawą (F9).</summary>
        readonly Visual.SwiatloOprawy swiatlo = new Visual.SwiatloOprawy();
        /// <summary>Czy znaki nieznanego były w tej klatce widoczne (game.ts: znakowWidac).</summary>
        public int znakowWidac;

        /// <summary>
        /// Świat na płycie. `pomPod` i `oltarzPod` — co pod kursorem (podpisy); `oddech` — oddech rdzenia (Tajemnica).
        /// </summary>
        public double Rysuj(IPlotno ctx, Sim sim, Camera cam, double teraz, bool pauza, double oddech, PodKursorem? pomPod = null, string? oltarzPod = null, double t = -1, IWarstwySterowania? sterowanie = null)
        {
            // licznik F3: części klatki jak w game.ts (rycina, poświata, świat, mrok, postacie)
            var L = global::Trzewia.Rdzen.Wydajnosc.licznik;
            if (t < 0) t = global::Trzewia.Rdzen.Wydajnosc.Teraz();
            var eng = rycina;
            // oprawa walki (etap 1): źródła światła tej klatki zbierane przed postaciami — ich krawędź łapie ogień i piec
            var oprawa = Visual.VisualConfig.Aktywne(Visual.VisualConfig.Swiatlo);
            if (oprawa) swiatlo.Zbierz(sim, cam, teraz); else Visual.SwiatloOprawy.Uniewaznij();
            // oprawa (etap 2): czytelność — początek klatki (układ płyty, boss z poprzedniej klatki, puste etykiety)
            var czytelnosc = Visual.Czytelnosc.Aktywna;
            if (czytelnosc) Visual.Czytelnosc.PoczatekKlatki(ctx);
            ctx.save();
            // wygładzanie zawsze: płyta bywa większa od bufora (skala ekranu), a najbliższy sąsiad szarpał kreskę
            ctx.imageSmoothingEnabled = true;
            if (oprawa)
            {
                // tło (skała, ściany, korytarze): ciemniej, mniej koloru — plan akcji rozjaśni potem mapa świateł
                Visual.SwiatloOprawy.start();
                ctx.save();
                ctx.filter = Visual.VisualConfig.Swiatla.FiltrTla;
                eng.rysuj(ctx, cam, ustawienia.jasnosc);
                ctx.restore();
                Visual.SwiatloOprawy.znacz(8);
            }
            else eng.rysuj(ctx, cam, ustawienia.jasnosc);
            // fresk: faktura tynku przyklejona do świata — jedzie razem ze skałą, gdy przesuwasz kamerę
            if (eng.fresk) Fresk.tynkSwiata(ctx, cam);
            var krag = Krag.Wlaczony;
            if (krag)
            {
                // Krąg Trzeci: rycina przygaszona i podgrzana (zakrzepła krew, zgniła żółć); nad tarasem wnętrze leja piekła,
                // na skraju przepaść do kręgu czwartego, a na tarasie cuchnące błoto z kośćmi i szczątkami
                RysKrag.barwaKregu(ctx, 0, 0, cam.vw, cam.vh);
                KragSwiat.rysujLej(ctx, sim, cam, teraz);
                KragSwiat.rysujPrzepasc(ctx, sim, cam, teraz);
                RysKrag.rysujGruntKregu(ctx, sim, cam, teraz);
            }
            t = L.znacz(Czesc.rycina, t);
            eng.poswiata(ctx, cam, true);
            t = L.znacz(Czesc.poswiata, t);
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
            // Krąg Trzeci: krew na murach, wisielcy na łańcuchach, kopce czaszek
            if (krag) PiekloLochu.rysujPiekloLochu(ctx, sim, cam, teraz);
            // droga wiernych: schody kręcone — tylko to, co już zbudowano (po lochu: dół schodów stoi w komnacie z kotłem)
            Schody.rysujSchodyDrogi(ctx, sim, cam, teraz);
            // 6.11: budowa schodów — drabina, rusztowanie, kołowrót z kubłem urobku albo opuszczanym stopniem, hałda
            RysBudowaSchodow.rysujBudoweSchodow(ctx, sim, cam, teraz);
            // katedra na powierzchni nad szybem ze światłem — kamień (szkło rozety i płomienie świec — nad mrokiem)
            if (krag)
            {
                // Krąg Trzeci: zamiast katedry — żarłocy w błocie i w trzewiach, krople ze stropów, ciała w ścianach
                // (brzeg kręgu — nad niebem, niżej)
                Potepieni.rysujPotepionych(ctx, sim, cam, teraz);
                RysKrag.rysujKrople(ctx, sim, cam, teraz);
                KragSwiat.rysujCialaWScianach(ctx, sim, cam, teraz);
            }
            else Katedra.rysujKatedre(ctx, sim, cam);
            Shafts.smugiSwiatla(ctx, sim, cam, teraz);
            Overlay.drawParticles(ctx, sim, cam);
            RysTrupy.rysujTrupy(ctx, sim, cam, teraz);
            double grunt(double x) => World.SURFACE_Y - Grzbiet.wysokoscGrzbietu(sim.world, x);
            Konwoj.rysujKonwoj(ctx, sim, cam, teraz, grunt);
            RysWiadra.rysujWiadra(ctx, sim, cam, teraz);
            // mrok: świat widać tylko w świetle lampek, obozów, rdzenia i Cudu; żar i kryształy świecą przez ciemność
            t = L.znacz(Czesc.swiat, t);
            RysMrok.rysujMrok(ctx, sim, cam, teraz, pauza);
            t = L.znacz(Czesc.mrok, t);
            if (Nastawy.NastawyMrok.MROK.wlaczony) eng.poswiata(ctx, cam, false);
            t = L.znacz(Czesc.poswiata, t);
            // katedra: witraże rozety i okien, płomienie świec — świecą przez mrok; z rozety pada promień na ołtarz
            if (!krag) Katedra.rysujKatedreNad(ctx, sim, cam, teraz);
            Promien.rysujPromien(ctx, sim, cam, teraz);
            Konwoj.rysujKonwojNad(ctx, sim, cam, teraz, grunt);
            if (krag)
            {
                // Krąg Trzeci: wieczny deszcz, w ulewie grad, brudny śnieg i błyskawice; zamiast katedry skalny brzeg kręgu
                // ze szczeliną światła (po niebie, żeby chmury go nie zakryły); Cerber krąży po tarasie kręgu
                RysKrag.rysujNieboKregu(ctx, sim, cam, teraz);
                RysKrag.rysujBrzegKregu(ctx, sim, cam);
                RysKrag.rysujBrzegKreguNad(ctx, sim, cam, teraz);
                KragSwiat.rysujCerberaNaKregu(ctx, sim, cam, teraz);
            }
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
            if (krag) PiekloLochu.rysujPiekloLochuNad(ctx, sim, cam, teraz);
            // (4) podgląd planu pod kursorem: pokoje.podglad
            sterowanie?.podglad(ctx, cam, teraz);
            // droga pielgrzymów: którędy wierni zejdą pod rdzeń (25.10: droga wiernych jako szyb — plan widać zawsze)
            var plan = Pielgrzymka.aktualnyPlan(sim);
            if (plan?.szyb != null && !sim.rytual.otwarta) Zarys.rysujPlanDrogi(ctx, sim, cam, plan, teraz);
            else if (plan != null && plan.kopac.Count > 0 && !sim.rytual.otwarta && sim.tick - plan.tick < 3000)
                Zarys.rysujDrogePielgrzymow(ctx, sim, cam, plan, teraz, false);
            t = L.znacz(Czesc.swiat, t);
            Zarys.rysujZarys(ctx, sim, cam, teraz);
            // (4) rysujZaznaczenie
            sterowanie?.zaznaczenie(ctx, cam, teraz);
            Figury.rysujStworzenia(ctx, sim, cam, teraz, sterowanie?.wybrany);
            // Krąg Trzeci: obżarci (smród nad głową), przejedzeni w błocie, okup lecący do paszczy Cerbera
            if (krag) RysKrag.rysujZarlokow(ctx, sim, cam, teraz);
            // etap 3f: część zbroi w rękach rycerza i błysk, gdy ją założy — przed postaciami
            pokoje.rysujPrzod(ctx, sim, cam, teraz);
            RysWiadra.rysujPrzodWiader(ctx, sim, cam, teraz);
            // (4) rysujPoleceniaNaMapie, rysujRamke, rysujDev
            sterowanie?.polecenia(ctx, cam, teraz);
            Efekty.rysujEfekty(ctx, sim.efekty, cam, teraz, sim);
            // oprawa (etap 3): plamy i krople krwi, pył, popiół — materia, pod mapą świateł
            var uderzenie = Visual.Uderzenie.Aktywne;
            if (uderzenie) Visual.Czasteczki.RysujPod(ctx, cam, teraz);
            // (4) rysujZnacznikiLudu
            sterowanie?.znacznikiLudu(ctx, cam, teraz);
            RysStraznicy.rysujStraznikowWSkale(ctx, sim, cam, teraz);
            // oprawa (etap 4): trup bossa — symulacja go już nie rysuje (martwy), ale nie znika bez śladu, tylko się rozsypuje
            if (Visual.VisualConfig.Aktywne(Visual.VisualConfig.Przerywniki)) Visual.Cutscena.RysujTrupa(ctx, sim, cam, teraz);
            // etap 5: błyski pomnika, rozpad i konanie demona (fala światła, popiół)
            RysPomnik.rysujNadPomnikiem(ctx, sim, cam, teraz);
            RysDlon.rysujDlon(ctx, sim, cam, teraz);
            RysDlonDemona.rysujDlonDemona(ctx, sim, cam, teraz);
            RysAniol.rysujAniola(ctx, sim, cam, teraz);
            // oprawa walki (etap 1): mapa świateł, poświata, błyski zdarzeń, przygaszenie przy konaniu bossa, winieta
            if (oprawa) swiatlo.Naloz(ctx, sim, cam, teraz);
            // oprawa (etap 3): iskry świecą same — po mapie świateł
            if (uderzenie) Visual.Czasteczki.RysujNad(ctx, cam, teraz);
            // oprawa (etap 2): znaki głów bossa i etykiety nad postaciami — po świetle, żeby ich nie gasiło
            if (czytelnosc) Visual.Czytelnosc.NadSwiatlem(ctx, sim, cam, teraz);
            if (pauza)
            {
                // czas stoi: świat przygasa (4: a na nim plan rozkazów — rysujRozkazy)
                ctx.fillStyle = "rgba(8,6,10,0.26)";
                ctx.fillRect(-cam.vw, -cam.vh, cam.vw * 3, cam.vh * 3);
                sterowanie?.rozkazy(ctx, cam, teraz);
            }
            // (4) podswietlCel
            sterowanie?.cel(ctx, cam, teraz);
            ctx.restore();
            return L.znacz(Czesc.postacie, t);
        }
    }
}
