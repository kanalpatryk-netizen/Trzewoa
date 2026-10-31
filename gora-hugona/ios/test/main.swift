// Testy rdzenia aplikacji na iPhone'a (Szyfr, Radio, Mqtt, Gra) — na Macu, bez iPhone'a:
//   swiftc -O ../GoraHugona/Rdzen/*.swift main.swift -o testy
//   ./testy siec ssl://broker.hivemq.com:8883,tcp://broker.hivemq.com:1883   — gra na prawdziwym serwerze (jak TestGry.java)
//   ./testy wektory-zrob plik / wektory-sprawdz plik                          — zgodność z Javą (Wektory.java)
//   ./testy mieszany <serwery> <temat>                                        — iPhone'y grają z Androidem (TestMieszany.java)
import Foundation

var bledy = 0

func sprawdz(_ w: Bool, _ opis: String) {
    print((w ? "OK    " : "BŁĄD  ") + opis)
    if !w { bledy += 1 }
}

func czekaj(_ ms: Int, _ w: () -> Bool) -> Bool {
    let koniec = Date().addingTimeInterval(Double(ms) / 1000)
    while Date() < koniec {
        if w() { return true }
        Thread.sleep(forTimeInterval: 0.1)
    }
    return w()
}

func spij(_ ms: Int) { Thread.sleep(forTimeInterval: Double(ms) / 1000) }

func koncz() -> Never {
    print(bledy == 0 ? "WSZYSTKO OK" : "BŁĘDÓW: \(bledy)")
    exit(bledy == 0 ? 0 : 1)
}

final class Zapis: GraSluchacz {
    private let z = NSLock()
    private var _wiadomosci = [String](), _glosy = [Data](), _odKogo = [Int](), _konce = 0

    var wiadomosci: [String] { z.lock(); defer { z.unlock() }; return _wiadomosci }
    var glosy: [Data] { z.lock(); defer { z.unlock() }; return _glosy }
    var odKogo: [Int] { z.lock(); defer { z.unlock() }; return _odKogo }
    var konce: Int { z.lock(); defer { z.unlock() }; return _konce }

    func zmiana() {}
    func wiadomosc(od: Int, tekst: String) { z.lock(); _wiadomosci.append("\(od):\(tekst)"); z.unlock() }
    func koniecCzasu() { z.lock(); _konce += 1; z.unlock() }
    func glos(od: Int, pakiet: Data) { z.lock(); _odKogo.append(od); _glosy.append(pakiet); z.unlock() }
}

func rola(_ g: Gra) -> String { g.stan()["rola"] as? String ?? "" }
func rolaGracza(_ g: Gra, _ n: Int) -> String { (g.stan()["role"] as? [String: Any])?[String(n)] as? String ?? "?" }
func gracze(_ g: Gra) -> [[String: Any]] { g.stan()["gracze"] as? [[String: Any]] ?? [] }
func widzi(_ g: Gra) -> Set<Int> { Set(gracze(g).map { Gra.int($0, "n") }) }
func gracz(_ g: Gra, _ n: Int) -> [String: Any]? { gracze(g).first { Gra.int($0, "n") == n } }
func koniec(_ g: Gra) -> Int64 { Gra.long(g.stan(), "koniec") }
func liczbaWiadomosci(_ g: Gra) -> Int { (g.stan()["wiadomosci"] as? [Any])?.count ?? -1 }

/// Głos testowy: 1 s tonu 440 Hz w ramkach po 20 ms (jak TestGry.java).
func nadanieTestowe() -> [Data] {
    let n = Radio.Nadawanie(czestotliwosc: 8000)
    var p = [Data]()
    for r in 0..<50 {
        let ramka = (0..<160).map { i in Int16(8000 * sin(2 * .pi * 440 * Double(r * 160 + i) / 8000)) }
        p += n.dodaj(ramka)
    }
    return p + n.zakoncz()
}

/// Sygnał do porównania z Javą — same liczby całkowite, żeby obie strony miały go co do bitu (48 kHz).
func sygnalWektorow() -> [Int16] {
    var x: Int64 = 12345
    return (0..<(48000 * 3)).map { i in
        let p = i % 200
        let tri = p < 100 ? p * 200 - 10000 : (200 - p) * 200 - 10000
        x = (x * 1103515245 + 12345) & 0x7fffffff
        let szum = Int((x >> 16) % 2001) - 1000
        let cichy = i < 48000 ? 1 : 4                           // najpierw cicho (wzmacnianie), potem głośno
        return Int16(max(-32768, min(32767, (tri + szum) * cichy / 4)))
    }
}

func pakietyWektorow() -> [Data] {
    let n = Radio.Nadawanie(czestotliwosc: 48000, id: 0x0BADCAFE)
    let s = sygnalWektorow()
    var p = [Data]()
    var i = 0
    while i < s.count {
        p += n.dodaj(Array(s[i..<min(s.count, i + 960)]))
        i += 960
    }
    return p + n.zakoncz()
}

let tekstWektorow = "Zażółć gęślą jaźń — 📣 {\"lat\":50.2776,\"poza\":true}"

func hex(_ d: Data) -> String { d.map { String(format: "%02x", $0) }.joined() }

/// Pakiet bez bajtów id nadania (2–5) — id jest losowe po stronie Javy.
func bezId(_ d: Data) -> Data {
    var b = [UInt8](d)
    if b.count >= 6 { for i in 2...5 { b[i] = 0 } }
    return Data(b)
}

let arg = CommandLine.arguments
guard arg.count >= 2 else {
    print("użycie: testy siec <serwery> | wektory-zrob <plik> | wektory-sprawdz <plik> | mieszany <serwery> <temat>")
    exit(2)
}

switch arg[1] {
case "wektory-zrob":
    var w = "szyfr " + hex(Szyfr.zaszyfruj(tekstWektorow)!) + "\n"
    for p in pakietyWektorow() { w += "radio " + hex(p) + "\n" }
    try! w.write(toFile: arg[2], atomically: true, encoding: .utf8)
    print("zapisano \(arg[2])")
    exit(0)

case "wektory-sprawdz":
    let linie = try! String(contentsOfFile: arg[2], encoding: .utf8).split(separator: "\n")
    let szyfr = linie.filter { $0.hasPrefix("szyfr ") }.map { Szyfr.hex(String($0.dropFirst(6))) }
    let radio = linie.filter { $0.hasPrefix("radio ") }.map { Szyfr.hex(String($0.dropFirst(6))) }
    sprawdz(szyfr.count == 1 && Szyfr.odszyfruj(szyfr[0]) == tekstWektorow, "Swift odszyfrowuje wiadomość z Javy")
    var zly = szyfr.first ?? Data()
    if zly.count > 20 { zly[20] ^= 1 }
    sprawdz(Szyfr.odszyfruj(zly) == nil, "uszkodzona wiadomość z Javy odrzucona")
    let moje = pakietyWektorow()
    sprawdz(radio.count == moje.count && radio.count > 10, "tyle samo pakietów głosu (\(radio.count) z Javy, \(moje.count) ze Swifta)")
    let zgodne = zip(radio, moje).filter { bezId($0) == bezId($1) }.count
    sprawdz(zgodne == moje.count, "pakiety głosu Swifta bajt w bajt jak z Javy (\(zgodne) z \(moje.count))")
    let odczytane = radio.compactMap(Radio.odczytaj)
    sprawdz(odczytane.count == radio.count && odczytane.last?.ostatni == true
            && odczytane.enumerated().allSatisfy { $0.element.nr == $0.offset && $0.element.id == odczytane[0].id },
            "Swift odczytuje pakiety Javy: kolejne numery, jedno nadanie, ostatni z flagą końca")
    koncz()

case "siec":
    let serwery = arg[2].split(separator: ",").map(String.init)
    let temat = "gorahugona-test/" + String(UInt64.random(in: 0...UInt64.max), radix: 16) + "/"
    print("Serwer: \(serwery.joined(separator: ", "))  temat: \(temat)")

    let zm = Zapis(), z1 = Zapis(), z2 = Zapis(), z3 = Zapis()
    let mistrz = Gra(ja: 7, serwery: serwery, temat: temat, sluchacz: zm)
    let s1 = Gra(ja: 1, serwery: serwery, temat: temat, sluchacz: z1)
    let s2 = Gra(ja: 2, serwery: serwery, temat: temat, sluchacz: z2)
    let ch = Gra(ja: 3, serwery: serwery, temat: temat, sluchacz: z3)
    let wszyscy = [mistrz, s1, s2, ch]
    wszyscy.forEach { $0.polacz() }
    sprawdz(czekaj(30000) { wszyscy.allSatisfy { $0.polaczony } }, "4 telefony połączone z serwerem")

    sprawdz(!ch.ustawRole("{\"1\":\"szuka\"}"), "gracz 3 nie może ustawiać ról")
    sprawdz(mistrz.ustawRole("{\"1\":\"szuka\",\"2\":\"szuka\",\"3\":\"chowa\",\"4\":\"zle\"}"), "mistrz ustawia role")
    sprawdz(czekaj(10000) { rola(s1) == "szuka" && rola(s2) == "szuka" && rola(ch) == "chowa" },
            "role dotarły do graczy (1, 2 szukają, 3 się chowa)")
    sprawdz(rolaGracza(mistrz, 4) == "" && rolaGracza(mistrz, 7) == "mistrz", "nieznana rola = nie gra; 7 = mistrz")

    mistrz.pozycja(szer: 50.27750, dl: 18.91600, dokl: 5, poza: false)
    s1.pozycja(szer: 50.27760, dl: 18.91610, dokl: 5, poza: false)
    s2.pozycja(szer: 50.27770, dl: 18.91620, dokl: 6, poza: false)
    ch.pozycja(szer: 50.27800, dl: 18.91700, dokl: 8, poza: true)
    sprawdz(czekaj(10000) { widzi(mistrz) == [1, 2, 3] }, "mistrz widzi graczy 1, 2 i 3")
    sprawdz(czekaj(10000) { widzi(s1) == [2] }, "szukający 1 widzi tylko szukającego 2")
    sprawdz(czekaj(10000) { widzi(s2) == [1] }, "szukający 2 widzi tylko szukającego 1")
    spij(1500)
    sprawdz(widzi(ch).isEmpty, "chowający się nie widzi nikogo")
    let p3 = gracz(mistrz, 3)
    sprawdz(p3 != nil && abs(((p3?["lat"] as? NSNumber)?.doubleValue ?? 0) - 50.278) < 1e-6
            && (p3?["poza"] as? Bool) == true && (p3?["rola"] as? String) == "chowa",
            "mistrz zna pozycję, rolę i „poza granicą” gracza 3")

    sprawdz(!ch.ustawCzas(minuty: 10), "chowający się nie ustawia czasu")
    sprawdz(s1.ustawCzas(minuty: 15), "szukający ustawia czas 15 min")
    let k = koniec(s1)
    sprawdz(abs(k - (Gra.teraz() + 15 * 60000)) < 5000, "koniec za 15 min")
    sprawdz(czekaj(10000) { koniec(mistrz) == k && koniec(s2) == k && koniec(ch) == k }, "czas dotarł do wszystkich")

    sprawdz(mistrz.wyslijWiadomosc(do: "wszyscy", tekst: "Start!"), "mistrz wysyła do wszystkich")
    sprawdz(czekaj(10000) { [z1, z2, z3].allSatisfy { $0.wiadomosci.contains("7:Start!") } }, "„do wszystkich” dotarło do 1, 2 i 3")
    sprawdz(zm.wiadomosci.isEmpty, "nadawca nie dostaje własnego powiadomienia")
    sprawdz(s1.wyslijWiadomosc(do: "chowajacy", tekst: "Szukamy!"), "szukający wysyła do chowających się")
    sprawdz(czekaj(10000) { z3.wiadomosci.contains("1:Szukamy!") }, "„do chowających” dostał gracz 3")
    sprawdz(mistrz.wyslijWiadomosc(do: "2", tekst: "Tylko do 2"), "mistrz wysyła do gracza 2")
    sprawdz(czekaj(10000) { z2.wiadomosci.contains("7:Tylko do 2") }, "„do gracza 2” dostał gracz 2")
    spij(1500)
    sprawdz(!z2.wiadomosci.contains("1:Szukamy!") && !z1.wiadomosci.contains("7:Tylko do 2") && !z3.wiadomosci.contains("7:Tylko do 2"),
            "inni nie dostali cudzych powiadomień")
    sprawdz(!ch.wyslijWiadomosc(do: "wszyscy", tekst: "hej") && !s1.wyslijWiadomosc(do: "nikt", tekst: "hej"),
            "chowający się nie wysyła; zły adresat odrzucony")
    sprawdz(liczbaWiadomosci(mistrz) == 3 && liczbaWiadomosci(ch) == 2, "historia: mistrz widzi 3 wiadomości, gracz 3 swoje 2")

    let nadane = nadanieTestowe()
    for p in nadane {
        sprawdz(s1.glos(p), "szukający 1 nadaje pakiet \(Radio.odczytaj(p)?.nr ?? -1)")
        spij(250)
    }
    sprawdz(czekaj(10000) { z2.glosy.count == nadane.count && zm.glosy.count == nadane.count },
            "szukający 2 i mistrz gry słyszą szukającego 1 (\(z2.glosy.count) i \(zm.glosy.count) z \(nadane.count) pakietów)")
    sprawdz(z2.glosy == nadane && zm.glosy == nadane && Radio.odczytaj(z2.glosy.last ?? Data())?.ostatni == true,
            "pakiety głosu doszły po kolei i bez zmian, ostatni z flagą końca")
    spij(1000)
    sprawdz(z1.glosy.isEmpty && z3.glosy.isEmpty, "chowający się i sam nadawca nic nie słyszą")
    sprawdz(!ch.glos(nadane[0]), "chowający się nie nadaje")
    var mistrzNadaje = true
    for p in nadane {
        mistrzNadaje = mistrz.glos(p) && mistrzNadaje
        spij(100)
    }
    sprawdz(mistrzNadaje, "mistrz gry nadaje")
    sprawdz(czekaj(10000) { z1.glosy.count == nadane.count && z2.glosy.count == 2 * nadane.count }, "szukający 1 i 2 słyszą mistrza gry")
    sprawdz(z1.odKogo.allSatisfy { $0 == 7 } && zm.odKogo.allSatisfy { $0 == 1 }, "nadawca rozpoznany: 7 = mistrz gry, 1 = szukający")

    let zp = Zapis()
    let pozny = Gra(ja: 7, serwery: serwery, temat: temat, sluchacz: zp)
    pozny.polacz()
    sprawdz(czekaj(20000) { pozny.polaczony && widzi(pozny) == [1, 2, 3] && koniec(pozny) == k
            && rolaGracza(pozny, 1) == "szuka" && rolaGracza(pozny, 3) == "chowa" },
            "telefon włączony później dostaje role, czas i pozycje")
    spij(1500)
    sprawdz(zp.wiadomosci.isEmpty && zp.glosy.isEmpty, "…i nie dostaje cudzej wiadomości ani starego głosu")

    sprawdz(mistrz.ustawKoniec(Gra.teraz() + 1500), "mistrz skraca czas do 1,5 s")
    let k2 = koniec(mistrz)
    sprawdz(czekaj(10000) { koniec(s1) == k2 && koniec(s2) == k2 && koniec(ch) == k2 }, "nowy czas dotarł")
    spij(2000)
    for _ in 0..<3 { wszyscy.forEach { $0.sprawdzCzas() } }
    sprawdz([zm, z1, z2, z3].allSatisfy { $0.konce == 1 }, "koniec czasu ogłoszony raz u każdego")

    ch.zamknij()
    sprawdz(czekaj(10000) { (gracz(mistrz, 3)?["aktywny"] as? Bool) == false }, "mistrz widzi, że gracz 3 wyłączył grę")
    sprawdz(Szyfr.odszyfruj(Data(count: 40)) == nil && Szyfr.odszyfruj(Data("{\"lat\":1}".utf8)) == nil,
            "obce i uszkodzone wiadomości są pomijane")

    // sprzątanie: rozłącz „telefony”, usuń zachowane wiadomości testu z serwera
    [mistrz, s1, s2, pozny].forEach { $0.zamknij() }
    spij(2500)
    let sprzatacz = Mqtt(serwery: serwery, id: "ghtest-" + String(UInt32.random(in: 0...UInt32.max), radix: 16))
    sprzatacz.polacz()
    if czekaj(15000, { sprzatacz.polaczony }) {
        for t in ["role", "czas", "wiadomosc", "gracz/1", "gracz/2", "gracz/3", "gracz/7"] {
            sprzatacz.publikuj(temat + t, Data(), qos: 1, zachowaj: true)
        }
        spij(1000)
        sprzatacz.zamknij()
        spij(700)
    }
    koncz()

case "mieszany":
    // iPhone'y (Swift): szukający 1 i chowający się 3; mistrz gry to Android (TestMieszany.java) w tym samym czasie
    let serwery = arg[2].split(separator: ",").map(String.init)
    let temat = arg[3]
    let z1 = Zapis(), z3 = Zapis()
    let s1 = Gra(ja: 1, serwery: serwery, temat: temat, sluchacz: z1)
    let ch = Gra(ja: 3, serwery: serwery, temat: temat, sluchacz: z3)
    s1.polacz()
    ch.polacz()
    sprawdz(czekaj(30000) { s1.polaczony && ch.polaczony }, "[iPhone] 2 iPhone'y połączone")
    s1.pozycja(szer: 50.27760, dl: 18.91610, dokl: 5, poza: false)
    ch.pozycja(szer: 50.27800, dl: 18.91700, dokl: 8, poza: true)
    sprawdz(czekaj(90000) { rola(s1) == "szuka" && rola(ch) == "chowa" }, "[iPhone] role od mistrza z Androida dotarły")
    sprawdz(czekaj(30000) { koniec(s1) > Gra.teraz() && koniec(ch) == koniec(s1) }, "[iPhone] czas gry z Androida dotarł")
    sprawdz(czekaj(30000) { z1.wiadomosci.contains("7:Start z Androida!") && z3.wiadomosci.contains("7:Start z Androida!") },
            "[iPhone] powiadomienie z Androida dotarło do obu")
    sprawdz(czekaj(30000) { z1.glosy.count >= 4 && Radio.odczytaj(z1.glosy.last ?? Data())?.ostatni == true },
            "[iPhone] szukający słyszy krótkofalówkę mistrza z Androida (\(z1.glosy.count) pakietów, do końca nadania)")
    let pk = z1.glosy.compactMap(Radio.odczytaj)
    sprawdz(pk.count == z1.glosy.count && pk.last?.ostatni == true && z1.odKogo.allSatisfy { $0 == 7 },
            "[iPhone] pakiety z Androida odczytane, od mistrza, ostatni z flagą końca")
    sprawdz(z3.glosy.isEmpty, "[iPhone] chowający się nie słyszy krótkofalówki")
    sprawdz(czekaj(10000) { widzi(s1).isEmpty } && widzi(ch).isEmpty, "[iPhone] szukający nie widzi chowającego się (i odwrotnie)")
    sprawdz(s1.wyslijWiadomosc(do: "7", tekst: "Znalazłem z iPhone'a!"), "[iPhone] szukający wysyła do mistrza")
    var ok = true
    let nad = nadanieTestowe()
    for p in Array(nad.prefix(3)) + [nad[nad.count - 1]] {
        ok = s1.glos(p) && ok
        spij(250)
    }
    sprawdz(ok, "[iPhone] szukający nadaje głos do mistrza")
    spij(8000)                                              // niech Android zdąży odebrać i sprawdzić
    s1.zamknij()
    ch.zamknij()
    spij(2000)
    koncz()

default:
    print("nieznane polecenie: \(arg[1])")
    exit(2)
}
