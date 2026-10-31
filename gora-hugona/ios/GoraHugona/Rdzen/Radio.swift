import Foundation

/// Krótkofalówka szukających i mistrza gry — część bez iOS, bajt w bajt jak Radio.java (Android):
/// kodek IMA ADPCM (8 kHz, 4 bity na próbkę), pakiety po 250 ms, przeliczanie dźwięku z mikrofonu na 8 kHz,
/// wzmacnianie cichego głosu i sygnały początku i końca jak w walkie-talkie.
///
/// Pakiet (przed szyfrowaniem): 'R', wersja 1, id nadania (4 B), numer kawałka (2 B), flagi (1 B, 1 = ostatni),
/// stan kodeka na początek kawałka — predyktor (2 B) i indeks kroku (1 B) — a potem dane ADPCM, 2 próbki na bajt.
enum Radio {
    static let hz = 8000
    /// Próbek w jednym pakiecie: 250 ms.
    static let kawalek = hz / 4
    static let naglowek = 12
    private static let typ = UInt8(ascii: "R"), wersja: UInt8 = 1

    struct Pakiet {
        let id: Int32
        let nr: Int
        let ostatni: Bool
        let probki: [Int16]
    }

    // MARK: kodek IMA ADPCM

    private static let kroki: [Int] = [
        7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66, 73, 80, 88, 97,
        107, 118, 130, 143, 157, 173, 190, 209, 230, 253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796,
        876, 963, 1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327, 3660, 4026, 4428, 4871,
        5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623,
        27086, 29794, 32767]
    private static let zmiana: [Int] = [-1, -1, -1, -1, 2, 4, 6, 8, -1, -1, -1, -1, 2, 4, 6, 8]

    /// Stan kodeka: predyktor i indeks kroku — zmienia się tak samo u kodera i dekodera.
    struct Stan {
        var predyktor = 0
        var indeks = 0
    }

    static func koduj(_ probka: Int, _ stan: inout Stan) -> Int {
        let krok = kroki[stan.indeks]
        var roznica = probka - stan.predyktor
        var kod = 0
        if roznica < 0 {
            kod = 8
            roznica = -roznica
        }
        if roznica >= krok {
            kod |= 4
            roznica -= krok
        }
        if roznica >= krok >> 1 {
            kod |= 2
            roznica -= krok >> 1
        }
        if roznica >= krok >> 2 { kod |= 1 }
        _ = dekoduj(kod, &stan)
        return kod
    }

    static func dekoduj(_ kod: Int, _ stan: inout Stan) -> Int {
        let krok = kroki[stan.indeks]
        var delta = krok >> 3
        if kod & 4 != 0 { delta += krok }
        if kod & 2 != 0 { delta += krok >> 1 }
        if kod & 1 != 0 { delta += krok >> 2 }
        let p = stan.predyktor + (kod & 8 != 0 ? -delta : delta)
        stan.predyktor = max(-32768, min(32767, p))
        stan.indeks = max(0, min(88, stan.indeks + zmiana[kod]))
        return stan.predyktor
    }

    /// Buduje pakiet z `ile` próbek (parzyście); `stan` kodeka przechodzi na następny pakiet.
    static func pakiet(id: Int32, nr: Int, ostatni: Bool, probki: [Int16], ile: Int, stan: inout Stan) -> Data {
        var b = [UInt8](repeating: 0, count: naglowek + ile / 2)
        let u = UInt32(bitPattern: id)
        b[0] = typ
        b[1] = wersja
        b[2] = UInt8(truncatingIfNeeded: u >> 24)
        b[3] = UInt8(truncatingIfNeeded: u >> 16)
        b[4] = UInt8(truncatingIfNeeded: u >> 8)
        b[5] = UInt8(truncatingIfNeeded: u)
        b[6] = UInt8(truncatingIfNeeded: nr >> 8)
        b[7] = UInt8(truncatingIfNeeded: nr)
        b[8] = ostatni ? 1 : 0
        b[9] = UInt8(truncatingIfNeeded: stan.predyktor >> 8)
        b[10] = UInt8(truncatingIfNeeded: stan.predyktor)
        b[11] = UInt8(truncatingIfNeeded: stan.indeks)
        var i = 0
        while i + 1 < ile {
            let a = koduj(Int(probki[i]), &stan), c = koduj(Int(probki[i + 1]), &stan)
            b[naglowek + i / 2] = UInt8(truncatingIfNeeded: a | c << 4)
            i += 2
        }
        return Data(b)
    }

    /// Odczytuje i dekoduje pakiet; nil, gdy to nie pakiet krótkofalówki.
    static func odczytaj(_ dane: Data) -> Pakiet? {
        let b = [UInt8](dane)
        guard b.count >= naglowek, b[0] == typ, b[1] == wersja else { return nil }
        let dl = b.count - naglowek, idx = Int(b[11])
        guard dl <= kawalek / 2, idx <= 88 else { return nil }
        let id = Int32(bitPattern: UInt32(b[2]) << 24 | UInt32(b[3]) << 16 | UInt32(b[4]) << 8 | UInt32(b[5]))
        let nr = Int(b[6]) << 8 | Int(b[7])
        var stan = Stan(predyktor: Int(Int16(bitPattern: UInt16(b[9]) << 8 | UInt16(b[10]))), indeks: idx)
        var p = [Int16](repeating: 0, count: dl * 2)
        for i in 0..<dl {
            let v = Int(b[naglowek + i])
            p[2 * i] = Int16(dekoduj(v & 15, &stan))
            p[2 * i + 1] = Int16(dekoduj(v >> 4, &stan))
        }
        return Pakiet(id: id, nr: nr, ostatni: b[8] & 1 != 0, probki: p)
    }

    // MARK: nadawanie: mikrofon → pakiety

    /// Jedno nadanie (od wciśnięcia do puszczenia przycisku).
    final class Nadawanie {
        let id: Int32
        private let przelicznik: DoOsmiu
        private var kawalek = [Int16](repeating: 0, count: Radio.kawalek)
        private var stan = Stan()
        private var ile = 0, nr = 0
        private var obwiednia = 0.0, wzmocnienie = 1.0
        private var wy = [Int16]()

        init(czestotliwosc: Double, id: Int32 = Int32.random(in: Int32.min...Int32.max)) {
            self.id = id
            przelicznik = DoOsmiu(czestotliwosc: czestotliwosc)
        }

        /// Próbki z mikrofonu (w jego częstotliwości); zwraca gotowe pakiety (zwykle 0 albo 1).
        func dodaj(_ we: [Int16]) -> [Data] {
            var gotowe = [Data]()
            if wy.count < we.count + 2 { wy = [Int16](repeating: 0, count: we.count + 2) }
            let k = przelicznik.przerob(we, &wy)
            for i in 0..<k {
                kawalek[ile] = wzmocnij(wy[i])
                ile += 1
                if ile == Radio.kawalek { gotowe.append(zrobKawalek(ostatni: false)) }
            }
            return gotowe
        }

        /// Koniec nadawania: reszta próbek z flagą „ostatni” (także pusty pakiet — odbiorca wie, że to koniec).
        func zakoncz() -> [Data] {
            [zrobKawalek(ostatni: true)]
        }

        private func zrobKawalek(ostatni: Bool) -> Data {
            if ile & 1 != 0 {
                kawalek[ile] = 0
                ile += 1
            }
            let p = Radio.pakiet(id: id, nr: nr & 0xffff, ostatni: ostatni, probki: kawalek, ile: ile, stan: &stan)
            nr += 1
            ile = 0
            return p
        }

        /// Cichy głos podnosi do ok. połowy skali (najwyżej 4×) — jak Radio.Nadawanie.wzmocnij w Javie.
        func wzmocnij(_ x: Int16) -> Int16 {
            obwiednia = max(Double(abs(Int(x))), obwiednia * 0.9997)
            let cel = max(1, min(4, 0.5 * 32767 / max(obwiednia, 600)))
            wzmocnienie += (cel - wzmocnienie) * (cel < wzmocnienie ? 0.02 : 0.0003)
            let v = (Double(x) * wzmocnienie + 0.5).rounded(.down)    // Math.round z Javy
            return Int16(max(-32768, min(32767, v)))
        }
    }

    /// Przeliczanie częstotliwości mikrofonu (8, 16, 44,1 albo 48 kHz) na 8 kHz: średnia z okna.
    final class DoOsmiu {
        private let okno: Double
        private var granica: Double
        private var n: Int64 = 0
        private var suma: Int64 = 0
        private var ile: Int64 = 0

        init(czestotliwosc: Double) {
            okno = czestotliwosc / Double(Radio.hz)
            granica = okno
        }

        func przerob(_ we: [Int16], _ wy: inout [Int16]) -> Int {
            var k = 0
            for v in we {
                suma += Int64(v)
                ile += 1
                n += 1
                if Double(n) >= granica {
                    wy[k] = Int16(suma / ile)
                    k += 1
                    suma = 0
                    ile = 0
                    granica += okno
                }
            }
            return k
        }
    }

    // MARK: sygnały

    static func cisza(_ ms: Int) -> [Int16] {
        [Int16](repeating: 0, count: hz * ms / 1000)
    }

    static func ton(_ czest: Double, _ ms: Int, _ glosnosc: Double, probkowanie: Int = hz) -> [Int16] {
        let n = probkowanie * ms / 1000
        let zbocze = Double(probkowanie) * 0.005
        var t = [Int16](repeating: 0, count: n)
        for i in 0..<n {
            let obw = min(1, Double(min(i, n - 1 - i)) / zbocze)
            t[i] = Int16(sin(2 * .pi * czest * Double(i) / Double(probkowanie)) * glosnosc * 32767 * obw)
        }
        return t
    }

    /// Ktoś zaczyna mówić: dwa krótkie, rosnące piski.
    static func sygnalPoczatek() -> [Int16] {
        ton(900, 50, 0.3) + cisza(25) + ton(1300, 70, 0.3)
    }

    /// Koniec nadawania („roger beep”): dwa opadające piski.
    static func sygnalKoniec() -> [Int16] {
        cisza(40) + ton(1300, 60, 0.3) + cisza(20) + ton(900, 90, 0.3)
    }
}
