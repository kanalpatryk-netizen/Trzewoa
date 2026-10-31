import AVFoundation

/// Mikrofon krótkofalówki: póki szukający trzyma przycisk MÓW, nagrywa i co 250 ms wysyła pakiet głosu (`Radio`)
/// przez grę (`Gra.glos`) — jak Nadajnik.java. Nagrywa tylko przy otwartej aplikacji; najwyżej 60 s naraz.
/// Zgodę na mikrofon sprawdza okno mapy, zanim zawoła `start`.
enum Nadajnik {
    private static let maksS: TimeInterval = 60
    private static let q = DispatchQueue(label: "gorahugona.nadajnik")
    private static let zamek = NSLock()
    private static var _nadaje = false
    private static var silnik: AVAudioEngine?
    private static var nadawanie: Radio.Nadawanie?
    private static var gra: Gra?
    private static var poczatek = Date()

    static var nadaje: Bool {
        zamek.lock()
        defer { zamek.unlock() }
        return _nadaje
    }

    private static func ustawNadaje(_ v: Bool) {
        zamek.lock()
        _nadaje = v
        zamek.unlock()
    }

    /// Wciśnięcie przycisku. Zwraca „ok”, „start” (gra nie działa — trzeba nacisnąć START), „rola” (mówią tylko
    /// szukający i mistrz gry) albo „mikrofon” (nie da się go włączyć). Główny wątek.
    static func start() -> String {
        guard let g = Straz.shared.gra, g.polaczony else { return "start" }
        guard g.mozeMowic else { return "rola" }
        return q.sync { () -> String in
            if silnik != nil {                                // jeszcze nagrywa — po prostu mów dalej
                poczatek = Date()
                return "ok"
            }
            let e = AVAudioEngine()
            let wejscie = e.inputNode
            let f = wejscie.outputFormat(forBus: 0)
            guard f.sampleRate > 0, f.channelCount > 0 else { return "mikrofon" }
            let n = Radio.Nadawanie(czestotliwosc: f.sampleRate)
            wejscie.installTap(onBus: 0, bufferSize: AVAudioFrameCount(f.sampleRate / 50), format: f) { b, _ in
                guard let k = b.floatChannelData?[0] else { return }
                let probki = (0..<Int(b.frameLength)).map { i in Int16(max(-32768, min(32767, k[i] * 32767))) }
                q.async {
                    guard nadawanie === n, let g = gra else { return }
                    for p in n.dodaj(probki) { g.glos(p) }
                    if Date().timeIntervalSince(poczatek) > maksS { zakoncz() }
                }
            }
            do {
                e.prepare()
                try e.start()
            } catch {
                wejscie.removeTap(onBus: 0)
                return "mikrofon"
            }
            silnik = e
            nadawanie = n
            gra = g
            poczatek = Date()
            ustawNadaje(true)
            return "ok"
        }
    }

    /// Puszczenie przycisku (albo schowanie aplikacji).
    static func stop() {
        q.async { zakoncz() }
    }

    /// Na kolejce nadajnika: koniec nagrania i ostatni pakiet z flagą końca.
    private static func zakoncz() {
        guard let e = silnik else { return }
        e.inputNode.removeTap(onBus: 0)
        e.stop()
        if let n = nadawanie, let g = gra {
            for p in n.zakoncz() { g.glos(p) }
        }
        silnik = nil
        nadawanie = nil
        gra = nil
        ustawNadaje(false)
    }
}
