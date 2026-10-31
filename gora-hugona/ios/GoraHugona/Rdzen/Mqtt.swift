import Foundation
import Network

/// Mały klient MQTT 3.1.1 (Network.framework, bez zewnętrznych bibliotek) — tyle, ile potrzebuje gra:
/// połączenie z czystą sesją, jedna subskrypcja, publikowanie QoS 0/1 z flagą „zachowaj”, odbiór QoS 0/1,
/// podtrzymywanie (PINGREQ) i samo wznawianie po zerwaniu, na zmianę z kolejnymi serwerami z listy.
/// Wszystko dzieje się na jednej kolejce `q`; zdarzenia dla gry też idą z tej kolejki.
final class Mqtt {
    struct Serwer {
        let host: String
        let port: UInt16
        let tls: Bool

        /// "ssl://broker.hivemq.com:8883" albo "tcp://broker.hivemq.com:1883".
        init?(_ adres: String) {
            let tls: Bool
            let reszta: Substring
            if adres.hasPrefix("ssl://") { tls = true; reszta = adres.dropFirst(6) }
            else if adres.hasPrefix("tcp://") { tls = false; reszta = adres.dropFirst(6) }
            else { return nil }
            let cz = reszta.split(separator: ":")
            guard cz.count == 2, let p = UInt16(cz[1]) else { return nil }
            host = String(cz[0])
            port = p
            self.tls = tls
        }
    }

    /// Połączono (po CONNACK). Wołane z kolejki klienta.
    var naPolaczenie: (() -> Void)?
    /// Połączenie zerwane (wznowi się samo). Wołane z kolejki klienta.
    var naRozlaczenie: (() -> Void)?
    /// Wiadomość: temat, treść, czy zachowana na serwerze. Wołane z kolejki klienta.
    var naWiadomosc: ((String, Data, Bool) -> Void)?

    let q = DispatchQueue(label: "gorahugona.mqtt")
    private let serwery: [Serwer]
    private let id: String
    private let podtrzymanie: UInt16 = 30
    private var polaczenie: NWConnection?
    private var bufor = Data()
    private var ktory = 0, proba = 0
    private var nrPakietu: UInt16 = 0
    private var gotowy = false, zamkniety = false
    private var ostatnioOdebrane = Date()
    private var zegar: DispatchSourceTimer?
    private var pokolenie = 0                                   // stare połączenia nie ruszają stanu nowych

    private let klucz = DispatchSpecificKey<Bool>()

    init(serwery: [String], id: String) {
        self.serwery = serwery.compactMap(Serwer.init)
        self.id = id
        q.setSpecific(key: klucz, value: true)
    }

    /// Na kolejce klienta od razu, z innego wątku — przez q.sync (bez zakleszczenia, gdy woła sama kolejka).
    private func naKolejce<T>(_ f: () -> T) -> T {
        DispatchQueue.getSpecific(key: klucz) == true ? f() : q.sync(execute: f)
    }

    /// Czy połączony (po CONNACK). Bezpieczne z dowolnego wątku.
    var polaczony: Bool { naKolejce { gotowy } }

    func polacz() {
        q.async { self.probuj() }
    }

    // MARK: połączenie

    private func probuj() {
        guard !zamkniety, !serwery.isEmpty else { return }
        rozlacz()
        pokolenie += 1
        let moje = pokolenie
        let s = serwery[ktory % serwery.count]
        let tcp = NWProtocolTCP.Options()
        tcp.connectionTimeout = 15
        tcp.enableKeepalive = true
        let parametry = s.tls ? NWParameters(tls: NWProtocolTLS.Options(), tcp: tcp) : NWParameters(tls: nil, tcp: tcp)
        let c = NWConnection(host: NWEndpoint.Host(s.host), port: NWEndpoint.Port(rawValue: s.port)!, using: parametry)
        polaczenie = c
        bufor = Data()
        c.stateUpdateHandler = { [weak self] st in
            guard let self = self, moje == self.pokolenie else { return }
            switch st {
            case .ready:
                self.wyslij(self.pakietConnect())
                self.czytaj(c, moje)
            case .failed, .cancelled:
                self.zerwane()
            default:
                break
            }
        }
        c.start(queue: q)
        // bez CONNACK w 20 s — następny serwer
        q.asyncAfter(deadline: .now() + 20) { [weak self] in
            guard let self = self, moje == self.pokolenie, !self.gotowy, !self.zamkniety else { return }
            self.zerwane()
        }
    }

    private func rozlacz() {
        zegar?.cancel()
        zegar = nil
        if let c = polaczenie {
            c.stateUpdateHandler = nil
            c.cancel()
        }
        polaczenie = nil
    }

    private func zerwane() {
        let byl = gotowy
        gotowy = false
        pokolenie += 1                                            // reszta zdarzeń starego połączenia — bez znaczenia
        rozlacz()
        if byl { naRozlaczenie?() }
        guard !zamkniety else { return }
        ktory += 1                                                // na zmianę: TLS, potem bez TLS, …
        let s = byl ? 1 : min(60, 5 << min(proba, 4))             // po zerwaniu — od razu; potem 5, 10, 20, 40, 60 s
        proba += 1
        let moje = pokolenie
        q.asyncAfter(deadline: .now() + .seconds(s)) { [weak self] in
            guard let self = self, moje == self.pokolenie, !self.zamkniety else { return }
            self.probuj()
        }
    }

    private func czytaj(_ c: NWConnection, _ moje: Int) {
        c.receive(minimumIncompleteLength: 1, maximumLength: 65536) { [weak self] dane, _, koniec, blad in
            guard let self = self, moje == self.pokolenie else { return }
            if let d = dane, !d.isEmpty {
                self.bufor.append(d)
                self.ostatnioOdebrane = Date()
                self.rozbierz()
            }
            if koniec || blad != nil {
                self.zerwane()
                return
            }
            if moje == self.pokolenie { self.czytaj(c, moje) }
        }
    }

    private func podtrzymuj() {
        let z = DispatchSource.makeTimerSource(queue: q)
        z.schedule(deadline: .now() + .seconds(Int(podtrzymanie)), repeating: .seconds(Int(podtrzymanie)))
        z.setEventHandler { [weak self] in
            guard let self = self, self.gotowy else { return }
            if Date().timeIntervalSince(self.ostatnioOdebrane) > Double(self.podtrzymanie) * 2 {
                self.zerwane()                                    // serwer milczy — połączenie martwe
                return
            }
            self.wyslij(Data([0xC0, 0x00]))                       // PINGREQ
        }
        z.resume()
        zegar = z
    }

    // MARK: pakiety MQTT

    private func rozbierz() {
        while true {
            guard bufor.count >= 2 else { return }
            let b = [UInt8](bufor.prefix(5))
            var dl = 0, mnoznik = 1, i = 1
            while true {
                guard i < b.count else {
                    if b.count >= 5 { zerwane() }                 // długość dłuższa niż 4 bajty — śmieci
                    return
                }
                dl += Int(b[i] & 127) * mnoznik
                mnoznik *= 128
                i += 1
                if b[i - 1] & 128 == 0 { break }
                if i > 4 { zerwane(); return }
            }
            guard bufor.count >= i + dl else { return }
            let start = bufor.startIndex
            let typ = b[0]
            let tresc = Data(bufor[(start + i)..<(start + i + dl)])
            bufor = Data(bufor[(start + i + dl)...])
            let moje = pokolenie
            obsluz(typ, tresc)
            if moje != pokolenie { return }                       // połączenie właśnie zerwane
        }
    }

    private func obsluz(_ naglowek: UInt8, _ t: Data) {
        let t = [UInt8](t)
        switch naglowek >> 4 {
        case 2:                                                   // CONNACK
            guard t.count >= 2, t[1] == 0 else { zerwane(); return }
            gotowy = true
            proba = 0
            podtrzymuj()
            naPolaczenie?()
        case 3:                                                   // PUBLISH
            guard t.count >= 2 else { return }
            let qos = (naglowek >> 1) & 3, zachowana = naglowek & 1 != 0
            let dlTematu = Int(t[0]) << 8 | Int(t[1])
            var p = 2 + dlTematu
            guard t.count >= p else { return }
            let temat = String(decoding: t[2..<p], as: UTF8.self)
            if qos > 0 {
                guard t.count >= p + 2 else { return }
                let nr0 = t[p], nr1 = t[p + 1]
                p += 2
                if qos == 1 { wyslij(Data([0x40, 0x02, nr0, nr1])) }          // PUBACK
                else { wyslij(Data([0x50, 0x02, nr0, nr1])) }                 // PUBREC (QoS 2 — nie zamawiamy, ale niech nie wisi)
            }
            naWiadomosc?(temat, Data(t[p...]), zachowana)
        case 6:                                                   // PUBREL → PUBCOMP
            if t.count >= 2 { wyslij(Data([0x70, 0x02, t[0], t[1]])) }
        default:                                                  // SUBACK, PUBACK, PINGRESP…
            break
        }
    }

    private func pakietConnect() -> Data {
        var z = Data()
        z.append(napis("MQTT"))
        z.append(4)                                               // MQTT 3.1.1
        z.append(0x02)                                            // czysta sesja
        z.append(UInt8(podtrzymanie >> 8))
        z.append(UInt8(podtrzymanie & 0xff))
        z.append(napis(id))
        return ramka(0x10, z)
    }

    private func napis(_ s: String) -> Data {
        let u = Data(s.utf8)
        var d = Data([UInt8(u.count >> 8), UInt8(u.count & 0xff)])
        d.append(u)
        return d
    }

    private func ramka(_ naglowek: UInt8, _ z: Data) -> Data {
        var d = Data([naglowek])
        var dl = z.count
        repeat {
            var bajt = UInt8(dl % 128)
            dl /= 128
            if dl > 0 { bajt |= 128 }
            d.append(bajt)
        } while dl > 0
        d.append(z)
        return d
    }

    private func nastepnyNr() -> UInt16 {
        nrPakietu = nrPakietu == UInt16.max ? 1 : nrPakietu + 1
        return nrPakietu
    }

    private func wyslij(_ d: Data, gotowe: (() -> Void)? = nil) {
        guard let c = polaczenie else { gotowe?(); return }
        c.send(content: d, completion: .contentProcessed { _ in gotowe?() })
    }

    // MARK: dla gry

    /// Subskrypcja (np. "temat/#"). Woła się po połączeniu (czysta sesja — po każdym połączeniu od nowa).
    func subskrybuj(_ filtr: String, qos: UInt8) {
        q.async {
            guard self.gotowy else { return }
            let nr = self.nastepnyNr()
            var z = Data([UInt8(nr >> 8), UInt8(nr & 0xff)])
            z.append(self.napis(filtr))
            z.append(qos)
            self.wyslij(self.ramka(0x82, z))
        }
    }

    /// Publikuje od razu albo wcale: false, gdy nie ma połączenia. Bezpieczne z dowolnego wątku.
    @discardableResult
    func publikuj(_ temat: String, _ tresc: Data, qos: UInt8, zachowaj: Bool) -> Bool {
        naKolejce { publikujTutaj(temat, tresc, qos: qos, zachowaj: zachowaj) }
    }

    /// To samo, ale na kolejce klienta (np. z naPolaczenie).
    func publikujTutaj(_ temat: String, _ tresc: Data, qos: UInt8, zachowaj: Bool, gotowe: (() -> Void)? = nil) -> Bool {
        guard gotowy, polaczenie != nil else { return false }
        var z = napis(temat)
        if qos > 0 {
            let nr = nastepnyNr()
            z.append(contentsOf: [UInt8(nr >> 8), UInt8(nr & 0xff)])
        }
        z.append(tresc)
        wyslij(ramka(0x30 | (qos & 3) << 1 | (zachowaj ? 1 : 0), z), gotowe: gotowe)
        return true
    }

    /// Koniec: opcjonalnie ostatnia wiadomość, potem DISCONNECT i zamknięcie gniazda.
    func zamknij(ostatnia: (temat: String, tresc: Data)? = nil) {
        q.async {
            self.zamkniety = true
            let koniec = {
                guard self.polaczenie != nil else { return }
                if self.gotowy { self.wyslij(Data([0xE0, 0x00])) }
                self.gotowy = false
                self.q.asyncAfter(deadline: .now() + 0.5) {
                    self.pokolenie += 1
                    self.rozlacz()
                }
            }
            if let o = ostatnia, self.publikujTutaj(o.temat, o.tresc, qos: 1, zachowaj: true, gotowe: { self.q.async(execute: koniec) }) {
                // DISCONNECT po wysłaniu ostatniej pozycji (albo najwyżej po 3 s)
                self.q.asyncAfter(deadline: .now() + 3, execute: koniec)
            } else {
                koniec()
            }
        }
    }
}
