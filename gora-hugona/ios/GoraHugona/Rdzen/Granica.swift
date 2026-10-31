import Foundation

/// Obszar jako wielokąt [[szer, dł], …] — jak Granica.java i app.js (trzymać wszystkie trzy zgodne).
/// Liczy na płaskim rzucie wokół środka obszaru: czy punkt jest w środku i ile ma metrów do najbliższego boku.
struct Granica {
    private let szer0, dl0, kx, ky: Double
    private let x, y: [Double]

    init?(json: String) {
        guard let a = try? JSONSerialization.jsonObject(with: Data(json.utf8)) as? [[Any]], a.count >= 3 else { return nil }
        var la = [Double](), lo = [Double]()
        for p in a {
            guard p.count >= 2, let s = (p[0] as? NSNumber)?.doubleValue, let d = (p[1] as? NSNumber)?.doubleValue else { return nil }
            la.append(s)
            lo.append(d)
        }
        let n = Double(la.count)
        let s0 = la.reduce(0, +) / n, d0 = lo.reduce(0, +) / n
        let kY = 110574.0, kX = 111320.0 * cos(s0 * .pi / 180)
        szer0 = s0
        dl0 = d0
        ky = kY
        kx = kX
        x = lo.map { ($0 - d0) * kX }
        y = la.map { ($0 - s0) * kY }
    }

    func wewnatrz(_ szer: Double, _ dl: Double) -> Bool {
        let px = (dl - dl0) * kx, py = (szer - szer0) * ky
        var w = false
        var j = x.count - 1
        for i in 0..<x.count {
            if (y[i] > py) != (y[j] > py), px < (x[j] - x[i]) * (py - y[i]) / (y[j] - y[i]) + x[i] { w.toggle() }
            j = i
        }
        return w
    }

    /// Metry do najbliższego boku granicy (bez znaku).
    func odleglosc(_ szer: Double, _ dl: Double) -> Double {
        let px = (dl - dl0) * kx, py = (szer - szer0) * ky
        var najm = Double.greatestFiniteMagnitude
        var j = x.count - 1
        for i in 0..<x.count {
            let ax = x[j], ay = y[j], bx = x[i], by = y[i]
            let dx = bx - ax, dy = by - ay
            var t = (dx == 0 && dy == 0) ? 0 : ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
            t = max(0, min(1, t))
            let ex = ax + t * dx - px, ey = ay + t * dy - py
            najm = min(najm, (ex * ex + ey * ey).squareRoot())
            j = i
        }
        return najm
    }
}
