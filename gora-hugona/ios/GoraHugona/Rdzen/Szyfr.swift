import Foundation
import CryptoKit

/// Szyfrowanie wiadomości gry (AES-GCM) — bajt w bajt jak Szyfr.java w aplikacji na Androida, żeby iPhone'y
/// i Androidy grały razem. Format: [1 bajt wersji = 1][12 bajtów IV][szyfrogram z 16-bajtowym znacznikiem].
/// Klucz jest wpisany w aplikację: chroni przed przypadkowymi podglądaczami publicznego serwera, nie przed kimś,
/// kto rozbierze aplikację.
enum Szyfr {
    private static let klucz = SymmetricKey(data: hex("e0bb393b9d727efecb085413f5dc6ea18e3c2827874632d5204b3214473be5c7"))
    private static let wersja: UInt8 = 1
    private static let iv = 12, znacznik = 16

    static func zaszyfruj(_ tekst: String) -> Data? {
        zaszyfruj(Data(tekst.utf8))
    }

    static func zaszyfruj(_ dane: Data) -> Data? {
        guard let s = try? AES.GCM.seal(dane, using: klucz), let polaczone = s.combined else { return nil }
        var w = Data([wersja])
        w.append(polaczone)                                  // IV (12 B) + szyfrogram + znacznik (16 B)
        return w
    }

    /// Odszyfrowany tekst albo nil, gdy to nie nasza wiadomość (inny klucz, śmieci, uszkodzenie).
    static func odszyfruj(_ b: Data) -> String? {
        guard let d = odszyfrujBajty(b) else { return nil }
        return String(data: d, encoding: .utf8)
    }

    static func odszyfrujBajty(_ b: Data) -> Data? {
        let b = Data(b)                                      // indeksy od zera
        guard b.count >= 1 + iv + znacznik, b[0] == wersja else { return nil }
        guard let pudelko = try? AES.GCM.SealedBox(combined: b.subdata(in: 1..<b.count)) else { return nil }
        return try? AES.GCM.open(pudelko, using: klucz)
    }

    static func hex(_ h: String) -> Data {
        var d = Data()
        var i = h.startIndex
        while i < h.endIndex {
            let j = h.index(i, offsetBy: 2)
            d.append(UInt8(h[i..<j], radix: 16) ?? 0)
            i = j
        }
        return d
    }
}
