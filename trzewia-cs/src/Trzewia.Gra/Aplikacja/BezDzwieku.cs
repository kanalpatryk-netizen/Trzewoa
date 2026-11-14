// Dźwięk i muzyka — zaślepki (decyzja użytkownika 14.11: „wstrzymaj się z dźwiękiem … zrobimy to dopiero, gdy wszystko
// inne będzie dopięte na ostatni guzik”). Ekrany wołają te same metody co w TS (core/audio.ts: Resonance, core/music.ts:
// Muzyka, core/gesty.ts: Gesty, core/mikser.ts: mikser), więc gdy przyjdzie czas na dźwięk, wystarczy wypełnić te klasy.
// Wszystko tu jest celowo puste; metody zwracające bool zwracają false (TS: „nie zagrało”).
namespace Trzewia.Aplikacja
{
    /// <summary>core/audio.ts: Resonance — dźwięki świata.</summary>
    public sealed class Dzwiek
    {
        public void toll() { }
        public void kropla() { }
        public void kruszec(bool zloto) { }
        public void rytual(string faza, bool krwawy) { }
        public void wiadro() { }
        /// <summary>Oddech rdzenia z dźwięku (render/tajemnica.ts: oddechRdzenia) — bez dźwięku: null, oddech z zegara.</summary>
        public double? oddech(double sen) => null;
        public void update(double glebia, double kopanie, double wiara, double ludnosc, double sen, bool stoi) { }
    }

    /// <summary>core/music.ts: Muzyka.</summary>
    public sealed class Muzyka
    {
        public void ustawScene(string scena) { }
        public void ustawNapiecie(double n) { }
        public void otchlan() { }
        public void zabranie() { }
    }

    /// <summary>core/gesty.ts: Gesty — dźwięki gestów, głosy ludu, dzwony.</summary>
    public sealed class Gesty
    {
        public void klik() { }
        public void odmowa() { }
        public void alarm(bool kryzys) { }
        public void wykonanie(int udanych, int nieudanych) { }
        public bool glosOdmowy(string kto, double pan) => false;
        public bool maGlos(string rola) => false;
        public bool glosLudu(string rola, string rodzaj, double pan, bool ucinaj = false) => false;
        public void pekniecie() { }
        public void rozpadPomnika() { }
        public void ostatnieUderzenie() { }
        public void dlonWyrasta(bool zawal) { }
        public void rzutDloni() { }
        public void odbicieOdDloni() { }
        public void zawalStropu() { }
        public void upadek() { }
        public void tonPauzy(bool stoi) { }
        public void pauza(bool stoi, bool zAlarmem) { }
        public void szkic() { }
        public void skresl(bool wszystko) { }
        public void kartka() { }
        public void tablica() { }
    }

    /// <summary>core/mikser.ts: mikser.</summary>
    public static class Mikser
    {
        public static void zawies(double ile) { }
    }
}
