import Foundation

/// Zdarzenia gry. Wszystkie (poza koniecCzasu) przychodzą z kolejki sieci.
protocol GraSluchacz: AnyObject {
    /// Zmieniło się połączenie, pozycje, role albo czas.
    func zmiana()
    /// Wiadomość do mnie od gracza `od` (7 = mistrz gry).
    func wiadomosc(od: Int, tekst: String)
    /// Czas gry właśnie minął. Wołane z wątku, który woła `sprawdzCzas`.
    func koniecCzasu()
    /// Pakiet krótkofalówki od innego gracza na kanale (`Radio`).
    func glos(od: Int, pakiet: Data)
}

/// Gra w chowanego przez sieć — wierne przeniesienie Gra.java z aplikacji na Androida (te same tematy, ten sam
/// szyfr, te same pola JSON), więc iPhone'y i Androidy grają razem w jednej grze. Tematy pod `temat`
/// (wszystkie zachowywane na serwerze, więc kto dołączy później, od razu dostaje aktualny stan):
/// `gracz/<n>` — ostatnia pozycja gracza n (1–6 gracze, 7 mistrz gry); `role` — kto szuka, kto się chowa
/// (ustawia tylko mistrz gry); `czas` — kiedy kończy się gra; `wiadomosc` — ostatnie powiadomienie.
/// Poza tym `glos/<n>` — krótkofalówka: pakiety głosu na żywo, niezachowywane.
/// Kto kogo widzi: mistrz gry — wszystkich; szukający — innych szukających; chowający się — nikogo.
final class Gra {
    static let serwery = ["ssl://broker.hivemq.com:8883", "tcp://broker.hivemq.com:1883"]
    static let temat = "gorahugona/3bb33ac48e2c89ff/"
    static let mistrz = 7
    static let szuka = "szuka", chowa = "chowa"
    /// Własna pozycja idzie nie częściej niż co tyle ms (wyjście za granicę i powrót — od razu).
    static let coIlePozycja: Int64 = 3000
    /// Zachowana na serwerze wiadomość starsza niż tyle ms nie wyskakuje już jako powiadomienie.
    static let staraWiadomosc: Int64 = 120000

    typealias Json = [String: Any]

    let ja: Int
    private let temat: String
    private weak var sluchacz: GraSluchacz?
    private let klient: Mqtt
    private let zamek = NSLock()

    /// Do wysłania po (ponownym) połączeniu: klucz → (temat, treść, qos); wiadomości — każda osobno.
    private var czeka: [(klucz: String, temat: String, tresc: Data, qos: UInt8)] = []

    private var role = [String](repeating: "", count: Gra.mistrz + 1)
    private var pozycje = [Json?](repeating: nil, count: Gra.mistrz + 1)
    private var widziane = Set<String>()
    private var historia = [Json]()
    private var koniec: Int64 = 0, ogloszonyKoniec: Int64 = 0, ostatniaPozycja: Int64 = 0
    private var czasOd = 0
    private var ostatnioPoza = false
    private var zamkniety = false

    static func teraz() -> Int64 { Int64((Date().timeIntervalSince1970 * 1000).rounded()) }

    init(ja: Int, serwery: [String] = Gra.serwery, temat: String = Gra.temat, sluchacz: GraSluchacz) {
        self.ja = ja
        self.temat = temat
        self.sluchacz = sluchacz
        klient = Mqtt(serwery: serwery, id: "gh\(ja)-" + String(UInt64.random(in: 0...UInt64.max), radix: 16))
        klient.naPolaczenie = { [weak self] in
            guard let self = self else { return }
            self.klient.subskrybuj(self.temat + "#", qos: 1)
            self.wyslijZalegle()
            self.sluchacz?.zmiana()
        }
        klient.naRozlaczenie = { [weak self] in self?.sluchacz?.zmiana() }
        klient.naWiadomosc = { [weak self] t, tresc, zachowana in self?.odbierz(t, tresc, zachowana) }
    }

    private func zamkniete<T>(_ f: () -> T) -> T {
        zamek.lock()
        defer { zamek.unlock() }
        return f()
    }

    // MARK: połączenie

    func polacz() { klient.polacz() }

    var polaczony: Bool { klient.polaczony }

    /// Kończy grę na tym telefonie: zostawia ostatnią pozycję z dopiskiem „wyłączony” i rozłącza się.
    func zamknij() {
        let ostatnia: Json? = zamkniete {
            zamkniety = true
            guard var p = pozycje[ja] else { return nil }
            p["aktywny"] = false
            p["t"] = NSNumber(value: Gra.teraz())
            return p
        }
        if let o = ostatnia, let tekst = Gra.napis(o), let b = Szyfr.zaszyfruj(tekst) {
            klient.zamknij(ostatnia: (temat + "gracz/\(ja)", b))
        } else {
            klient.zamknij()
        }
    }

    // MARK: wysyłanie

    /// Moja pozycja; `poza` = trwa alarm granicy.
    func pozycja(szer: Double, dl: Double, dokl: Double, poza: Bool) {
        let teraz = Gra.teraz()
        let j: Json? = zamkniete {
            if teraz - ostatniaPozycja < Gra.coIlePozycja && poza == ostatnioPoza { return nil }
            let j: Json = ["n": ja, "lat": Gra.zaokr(szer), "lon": Gra.zaokr(dl), "dokl": Int(dokl.rounded()),
                           "poza": poza, "t": NSNumber(value: teraz), "aktywny": true]
            ostatniaPozycja = teraz
            ostatnioPoza = poza
            pozycje[ja] = j
            return j
        }
        if let j = j { wyslij("gracz/\(ja)", j, qos: 0) }
    }

    /// Mistrz gry ustala role: {"1":"szuka","2":"chowa",…}; brak albo coś innego = nie gra.
    func ustawRole(_ json: String) -> Bool {
        guard ja == Gra.mistrz,
              let r = (try? JSONSerialization.jsonObject(with: Data(json.utf8))) as? Json else { return false }
        let w: Json = zamkniete {
            var czyste = Json()
            for n in 1..<Gra.mistrz {
                let v = Gra.poprawnaRola(r[String(n)] as? String ?? "")
                role[n] = v
                czyste[String(n)] = v
            }
            return ["role": czyste, "od": ja, "t": NSNumber(value: Gra.teraz())]
        }
        wyslij("role", w, qos: 1)
        sluchacz?.zmiana()
        return true
    }

    /// Czas gry od teraz (0 — wyłącza odliczanie).
    func ustawCzas(minuty: Int) -> Bool {
        ustawKoniec(minuty > 0 ? Gra.teraz() + Int64(minuty) * 60000 : 0)
    }

    func ustawKoniec(_ k: Int64) -> Bool {
        let w: Json? = zamkniete {
            guard mozeSterowacBez() else { return nil }
            koniec = max(0, k)
            czasOd = ja
            return ["koniec": NSNumber(value: max(0, k)), "od": ja, "t": NSNumber(value: Gra.teraz())]
        }
        guard let w = w else { return false }
        wyslij("czas", w, qos: 1)
        sluchacz?.zmiana()
        return true
    }

    /// Powiadomienie: do „wszyscy”, „szukajacy”, „chowajacy” albo numeru gracza.
    func wyslijWiadomosc(do doKogo: String, tekst: String) -> Bool {
        guard Gra.poprawnyAdresat(doKogo) else { return false }
        var tekst = tekst.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !tekst.isEmpty else { return false }
        if tekst.utf16.count > 300 { tekst = String(decoding: Array(tekst.utf16.prefix(300)), as: UTF16.self) }
        let w: Json? = zamkniete {
            guard mozeSterowacBez() else { return nil }
            let id = String(UInt64.random(in: 0...UInt64.max), radix: 16)
            let w: Json = ["id": id, "od": ja, "do": doKogo, "tekst": tekst, "t": NSNumber(value: Gra.teraz())]
            widziane.insert(id)
            dopiszDoHistorii(w)
            return w
        }
        guard let w = w else { return false }
        wyslij("wiadomosc", w, qos: 1)
        sluchacz?.zmiana()
        return true
    }

    private func wyslij(_ co: String, _ j: Json, qos: UInt8) {
        guard let tekst = Gra.napis(j), let b = Szyfr.zaszyfruj(tekst) else { return }
        if klient.publikuj(temat + co, b, qos: qos, zachowaj: true) { return }
        let klucz = co == "wiadomosc" ? co + "/" + (j["id"] as? String ?? "") : co
        zamkniete {
            czeka.removeAll { $0.klucz == klucz }
            czeka.append((klucz, temat + co, b, qos))
        }
        if klient.polaczony { klient.q.async { self.wyslijZalegle() } }  // połączyło się w międzyczasie
    }

    /// Na kolejce klienta.
    private func wyslijZalegle() {
        let kopia = zamkniete { () -> [(klucz: String, temat: String, tresc: Data, qos: UInt8)] in
            let k = czeka
            czeka.removeAll()
            return k
        }
        for z in kopia where !klient.publikujTutaj(z.temat, z.tresc, qos: z.qos, zachowaj: true) {
            zamkniete {
                if !czeka.contains(where: { $0.klucz == z.klucz }) { czeka.append(z) }
            }
        }
    }

    // MARK: krótkofalówka (szukający i mistrz gry)

    /// Czy gracz `n` jest na kanale krótkofalówki: mistrz gry albo szukający. Pod zamkiem.
    private func naRadiu(_ n: Int) -> Bool {
        n == Gra.mistrz || role[n] == Gra.szuka
    }

    var mozeMowic: Bool { zamkniete { naRadiu(ja) } }

    /// Pakiet głosu do reszty kanału: od razu albo wcale (spóźniony głos nikomu nie pomoże).
    @discardableResult
    func glos(_ pakiet: Data) -> Bool {
        guard mozeMowic, let b = Szyfr.zaszyfruj(pakiet) else { return false }
        return klient.publikuj(temat + "glos/\(ja)", b, qos: 0, zachowaj: false)
    }

    // MARK: odbieranie (kolejka klienta)

    private func odbierz(_ t: String, _ tresc: Data, _ zachowana: Bool) {
        guard t.hasPrefix(temat) else { return }
        let co = String(t.dropFirst(temat.count))
        if co.hasPrefix("glos/") {
            guard let n = Int(co.dropFirst(5)) else { return }
            let moje = zamkniete { n != ja && n >= 1 && n <= Gra.mistrz && naRadiu(ja) && naRadiu(n) }
            if !moje || zachowana { return }
            if let p = Szyfr.odszyfrujBajty(tresc) { sluchacz?.glos(od: n, pakiet: p) }
            return
        }
        guard let tekst = Szyfr.odszyfruj(tresc),
              let j = (try? JSONSerialization.jsonObject(with: Data(tekst.utf8))) as? Json else { return }
        var powiadom: (od: Int, tekst: String)?
        let zmiana: Bool = zamkniete {
            if co.hasPrefix("gracz/") {
                let n = Gra.int(j, "n")
                guard n >= 1, n <= Gra.mistrz, co == "gracz/\(n)" else { return false }
                if let p = pozycje[n], Gra.long(p, "t") > Gra.long(j, "t") { return false }   // mam nowszą
                pozycje[n] = j
            } else if co == "role" {
                guard let r = j["role"] as? Json else { return false }
                for n in 1..<Gra.mistrz { role[n] = Gra.poprawnaRola(r[String(n)] as? String ?? "") }
            } else if co == "czas" {
                koniec = max(0, Gra.long(j, "koniec"))
                czasOd = Gra.int(j, "od")
            } else if co == "wiadomosc" {
                let id = j["id"] as? String ?? ""
                guard !id.isEmpty, widziane.insert(id).inserted else { return false }
                dopiszDoHistorii(j)
                let wiek = Gra.teraz() - Gra.long(j, "t")
                if Gra.int(j, "od") != ja, doMnie(j["do"] as? String ?? "wszyscy"),
                   !zachowana || wiek < Gra.staraWiadomosc {
                    powiadom = (Gra.int(j, "od"), j["tekst"] as? String ?? "")
                }
            } else {
                return false
            }
            return true
        }
        guard zmiana else { return }
        if let p = powiadom { sluchacz?.wiadomosc(od: p.od, tekst: p.tekst) }
        sluchacz?.zmiana()
    }

    /// Woła strażnik co parę sekund; gdy czas gry właśnie minął — `koniecCzasu()` (raz).
    func sprawdzCzas(_ teraz: Int64 = Gra.teraz()) {
        let oglos: Bool = zamkniete {
            guard koniec > 0, teraz >= koniec, ogloszonyKoniec != koniec else { return false }
            ogloszonyKoniec = koniec
            return teraz - koniec < 60000                   // nie ogłaszaj gry, która skończyła się dawno
        }
        if oglos { sluchacz?.koniecCzasu() }
    }

    // MARK: stan dla mapy

    /// Stan gry dla strony; pozycje tylko tych graczy, których wolno mi widzieć.
    func stan() -> Json {
        let pol = polaczony
        return zamkniete {
            var r = Json()
            for n in 1...Gra.mistrz { r[String(n)] = rola(n) }
            var g = [Json]()
            for n in 1...Gra.mistrz where n != ja && widzi(n) {
                guard var p = pozycje[n] else { continue }
                p["rola"] = rola(n)
                g.append(p)
            }
            let w = historia.filter { m in
                ja == Gra.mistrz || Gra.int(m, "od") == ja || doMnie(m["do"] as? String ?? "wszyscy")
            }
            return ["ja": ja, "rola": rola(ja), "polaczony": pol, "mozeSterowac": mozeSterowacBez(),
                    "koniec": NSNumber(value: koniec), "czasOd": czasOd, "role": r, "gracze": g, "wiadomosci": w]
        }
    }

    var mozeSterowac: Bool { zamkniete { mozeSterowacBez() } }

    private func mozeSterowacBez() -> Bool {
        ja == Gra.mistrz || role[ja] == Gra.szuka
    }

    private func widzi(_ n: Int) -> Bool {
        if ja == Gra.mistrz { return true }
        return role[ja] == Gra.szuka && role[n] == Gra.szuka
    }

    private func rola(_ n: Int) -> String {
        n == Gra.mistrz ? "mistrz" : role[n]
    }

    private func doMnie(_ doKogo: String) -> Bool {
        switch doKogo {
        case "wszyscy": return true
        case "szukajacy": return role[ja] == Gra.szuka
        case "chowajacy": return role[ja] == Gra.chowa
        default: return Int(doKogo) == ja
        }
    }

    private func dopiszDoHistorii(_ w: Json) {
        historia.append(w)
        if historia.count > 10 { historia.removeFirst(historia.count - 10) }
    }

    // MARK: pomocnicze

    private static func poprawnyAdresat(_ d: String) -> Bool {
        if d == "wszyscy" || d == "szukajacy" || d == "chowajacy" { return true }
        guard let n = Int(d) else { return false }
        return n >= 1 && n <= mistrz
    }

    private static func poprawnaRola(_ r: String) -> String {
        r == szuka || r == chowa ? r : ""
    }

    private static func zaokr(_ v: Double) -> Double {
        (v * 1e6).rounded() / 1e6
    }

    static func int(_ j: Json, _ k: String) -> Int {
        if let n = j[k] as? NSNumber { return n.intValue }
        if let s = j[k] as? String, let n = Int(s) { return n }
        return 0
    }

    static func long(_ j: Json, _ k: String) -> Int64 {
        if let n = j[k] as? NSNumber { return n.int64Value }
        if let s = j[k] as? String, let n = Int64(s) { return n }
        return 0
    }

    static func napis(_ j: Any) -> String? {
        guard JSONSerialization.isValidJSONObject(j), let d = try? JSONSerialization.data(withJSONObject: j) else { return nil }
        return String(data: d, encoding: .utf8)
    }
}
