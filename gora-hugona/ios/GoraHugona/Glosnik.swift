import AVFoundation

/// Głośnik krótkofalówki: sam odtwarza głos innych szukających i mistrza gry — bez dotykania czegokolwiek, także
/// przy zgaszonym ekranie i ze schowaną aplikacją (jak Glosnik.java). Każdy nadający ma własny odtwarzacz; na początku
/// 200 ms zapasu na nierówno przychodzące pakiety i krótki sygnał, na końcu „roger beep”.
/// Wszystko dzieje się na osobnej kolejce, żeby nie blokować sieci.
final class Glosnik {
    /// Działający głośnik (żeby silnik audio mógł go powiadomić o swoim restarcie).
    static weak var aktywny: Glosnik?

    private static let zapasMs = 200, koniecPoMs = 2000

    private final class Strumien {
        let od: Int
        let id: Int32
        let gracz = AVAudioPlayerNode()
        var nastepny = 0
        var cisza: DispatchWorkItem?

        init(od: Int, id: Int32) {
            self.od = od
            self.id = id
        }
    }

    private let zmiana: () -> Void
    private let q = DispatchQueue(label: "gorahugona.glosnik")
    private let format = AVAudioFormat(standardFormatWithSampleRate: Double(Radio.hz), channels: 1)!
    private var strumienie = [Int: Strumien]()
    private var wygasaja = [ObjectIdentifier: AVAudioPlayerNode]()
    private let zamek = NSLock()
    private var _mowia = [Int]()
    private var silnik: AVAudioEngine { Dzwiek.shared.silnik }

    /// `zmiana` — wołane, gdy ktoś zaczyna albo kończy mówić (z kolejki głośnika).
    init(zmiana: @escaping () -> Void) {
        self.zmiana = zmiana
        Glosnik.aktywny = self
    }

    /// Numery graczy, którzy teraz mówią.
    var mowia: [Int] {
        zamek.lock()
        defer { zamek.unlock() }
        return _mowia
    }

    /// Pakiet z sieci (z dowolnego wątku).
    func odbierz(od: Int, pakiet: Data) {
        q.async { self.przyjmij(od, pakiet) }
    }

    func zamknij() {
        q.async {
            for s in self.strumienie.values {
                s.cisza?.cancel()
                self.zwolnij(s.gracz)
            }
            self.strumienie.removeAll()
            for g in self.wygasaja.values { self.zwolnij(g) }
            self.wygasaja.removeAll()
            self.odswiez()
        }
    }

    /// Silnik audio wstał po przerwie (np. zmiana słuchawek) — odtwarzacze trzeba puścić od nowa.
    func poZmianieSilnika() {
        q.async {
            for s in self.strumienie.values where !s.gracz.isPlaying && self.silnik.isRunning { s.gracz.play() }
        }
    }

    private func przyjmij(_ od: Int, _ b: Data) {
        guard let p = Radio.odczytaj(b) else { return }
        // półdupleks jak w prawdziwej krótkofalówce: kiedy sam mówisz, cudzy głos nie leci z głośnika do mikrofonu
        let mowie = Nadajnik.nadaje
        var s = strumienie[od]
        if let st = s, st.id != p.id {                        // nowe nadanie, a stare bez końca
            zakoncz(st, sygnal: !mowie)
            s = nil
        }
        if s == nil {
            if mowie || (p.ostatni && p.probki.isEmpty) { return }   // mówię albo samo puszczenie przycisku
            s = nowy(od, p.id)
        }
        guard let st = s else { return }
        if p.nr < st.nastepny { return }                      // powtórka albo spóźniony
        st.nastepny = p.nr + 1
        if !mowie { pisz(st.gracz, p.probki) }
        st.cisza?.cancel()
        if p.ostatni {
            zakoncz(st, sygnal: !mowie)
        } else {
            let w = DispatchWorkItem { [weak self, weak st] in
                guard let self = self, let st = st, self.strumienie[st.od] === st else { return }
                self.zakoncz(st, sygnal: true)                // zgubiony pakiet końca — kończymy sami
            }
            st.cisza = w
            q.asyncAfter(deadline: .now() + .milliseconds(Glosnik.koniecPoMs), execute: w)
        }
    }

    private func nowy(_ od: Int, _ id: Int32) -> Strumien? {
        guard silnik.isRunning else { return nil }
        let s = Strumien(od: od, id: id)
        silnik.attach(s.gracz)
        silnik.connect(s.gracz, to: silnik.mainMixerNode, format: format)
        strumienie[od] = s
        pisz(s.gracz, Radio.cisza(Glosnik.zapasMs) + Radio.sygnalPoczatek())
        s.gracz.play()
        odswiez()
        return s
    }

    private func zakoncz(_ s: Strumien, sygnal: Bool) {
        s.cisza?.cancel()
        strumienie[s.od] = nil
        let g = s.gracz
        wygasaja[ObjectIdentifier(g)] = g
        // dogrywa to, co już zapisane (z sygnałem końca), i dopiero wtedy znika
        pisz(g, sygnal ? Radio.sygnalKoniec() : Radio.cisza(20)) { [weak self] in
            self?.q.async {
                guard let self = self, self.wygasaja.removeValue(forKey: ObjectIdentifier(g)) != nil else { return }
                self.zwolnij(g)
            }
        }
        // na wypadek, gdyby silnik stanął i dogrywanie nigdy się nie skończyło
        q.asyncAfter(deadline: .now() + 6) { [weak self] in
            guard let self = self, self.wygasaja.removeValue(forKey: ObjectIdentifier(g)) != nil else { return }
            self.zwolnij(g)
        }
        odswiez()
    }

    private func pisz(_ g: AVAudioPlayerNode, _ probki: [Int16], potem: (() -> Void)? = nil) {
        guard !probki.isEmpty, g.engine != nil,
              let b = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(probki.count)),
              let k = b.floatChannelData?[0] else { potem?(); return }
        for (i, v) in probki.enumerated() { k[i] = Float(v) / 32768 }
        b.frameLength = AVAudioFrameCount(probki.count)
        if let potem = potem {
            g.scheduleBuffer(b, completionCallbackType: .dataPlayedBack) { _ in potem() }
        } else {
            g.scheduleBuffer(b, completionHandler: nil)
        }
    }

    private func zwolnij(_ g: AVAudioPlayerNode) {
        g.stop()
        if g.engine != nil { silnik.detach(g) }
    }

    private func odswiez() {
        let m = strumienie.keys.sorted()
        zamek.lock()
        _mowia = m
        zamek.unlock()
        zmiana()
    }
}
