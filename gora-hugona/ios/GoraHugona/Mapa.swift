import AVFoundation
import MediaPlayer
import UIKit
import WebKit

/// Okno z mapą: ta sama strona co w aplikacji na Androida i w przeglądarce (gora-hugona/www, w aplikacji jako folder
/// „www”). Strona rozpoznaje aplikację po obiekcie `HugonAndroid` — tutaj podstawia go skrypt `most` z tymi samymi
/// metodami co Mapa.java. Metody strony są synchroniczne (zwracają wynik od razu), a WKWebView umie tak odpowiadać
/// tylko na `prompt()` — więc most woła `prompt("hugon:<metoda>", "[argumenty JSON]")`, a okno odpowiada od razu.
/// Stan wraca na stronę przez `hugonStan(…)`, błędy przez `hugonBlad('kod')`.
final class Mapa: UIViewController, WKUIDelegate, WKNavigationDelegate {
    private var widok: WKWebView!

    /// Podstawiany stronie przed jej skryptami: `HugonAndroid` jak w aplikacji na Androida (+ `ios: true`).
    private static let most = """
    (function () {
      function wolaj(m, a) {
        try { return window.prompt('hugon:' + m, JSON.stringify(a || [])); } catch (e) { return null; }
      }
      window.HugonAndroid = {
        ios: true,
        start: function (g, u) { wolaj('start', [g, u]); },
        ustaw: function (g, u) { wolaj('ustaw', [g, u]); },
        stop: function () { wolaj('stop'); },
        wycisz: function (s) { wolaj('wycisz', [s]); },
        dziala: function () { return wolaj('dziala') === 'true'; },
        stan: function () { return wolaj('stan'); },
        testAlarmu: function () { wolaj('testAlarmu'); },
        testOstrzezenia: function () { wolaj('testOstrzezenia'); },
        baterie: function () { },
        lokalizacja: function () { wolaj('lokalizacja'); },
        mowStart: function () { return wolaj('mowStart') || 'mikrofon'; },
        mowStop: function () { wolaj('mowStop'); },
        ustawRole: function (j) { return wolaj('ustawRole', [j]) === 'true'; },
        ustawCzas: function (m) { return wolaj('ustawCzas', [m]) === 'true'; },
        wyslij: function (d, t) { return wolaj('wyslij', [d, t]) === 'true'; },
        bezOszczedzania: function () { return true; }
      };
    })();
    """

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }

    override func viewDidLoad() {
        super.viewDidLoad()
        let tlo = UIColor(red: 19 / 255, green: 32 / 255, blue: 26 / 255, alpha: 1)
        view.backgroundColor = tlo

        let k = WKWebViewConfiguration()
        k.userContentController.addUserScript(WKUserScript(source: Mapa.most, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        k.mediaTypesRequiringUserActionForPlayback = []
        k.allowsInlineMediaPlayback = true
        k.applicationNameForUserAgent = "GoraHugona/1.0"      // serwery map chcą wiedzieć, kto pyta
        widok = WKWebView(frame: view.bounds, configuration: k)
        widok.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        widok.isOpaque = false
        widok.backgroundColor = tlo
        widok.scrollView.backgroundColor = tlo
        widok.scrollView.bounces = false
        widok.scrollView.isScrollEnabled = false              // mapę przesuwa Leaflet, nie WKWebView
        widok.scrollView.contentInsetAdjustmentBehavior = .never   // marginesy (notch, pasek) liczy strona: env(safe-area-inset-*)
        widok.uiDelegate = self
        widok.navigationDelegate = self
        view.addSubview(widok)

        // niewidoczny suwak głośności — przez niego syrena podgłaśnia telefon (patrz Dzwiek.swift)
        let glosnosc = MPVolumeView(frame: CGRect(x: -200, y: -200, width: 100, height: 40))
        glosnosc.alpha = 0.01
        glosnosc.isUserInteractionEnabled = false
        view.addSubview(glosnosc)
        Dzwiek.shared.suwak = glosnosc.subviews.compactMap { $0 as? UISlider }.first

        let straz = Straz.shared
        straz.naStan = { [weak self] json in self?.js("window.hugonStan&&hugonStan(\(json))") }
        straz.naBlad = { [weak self] kod in self?.blad(kod) }

        if let www = Bundle.main.url(forResource: "www", withExtension: nil) {
            widok.loadFileURL(www.appendingPathComponent("index.html"), allowingReadAccessTo: www)
        }

        let nc = NotificationCenter.default
        nc.addObserver(self, selector: #selector(wTle), name: UIApplication.willResignActiveNotification, object: nil)
        nc.addObserver(self, selector: #selector(naWierzchu), name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    @objc private func wTle() {
        Nadajnik.stop()                                       // krótkofalówka nadaje tylko przy otwartej aplikacji
    }

    @objc private func naWierzchu() {
        if let s = Straz.shared.ostatniStan { js("window.hugonStan&&hugonStan(\(s))") }
    }

    private func js(_ kod: String) {
        guard isViewLoaded, widok != nil else { return }
        widok.evaluateJavaScript(kod, completionHandler: nil)
    }

    private func blad(_ kod: String) {
        js("window.hugonBlad&&hugonBlad('\(kod)')")
    }

    // MARK: most — prompt("hugon:<metoda>", "[…]")

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        guard prompt.hasPrefix("hugon:") else { completionHandler(nil); return }
        let a = (try? JSONSerialization.jsonObject(with: Data((defaultText ?? "[]").utf8))) as? [Any] ?? []
        completionHandler(wywolaj(String(prompt.dropFirst(6)), a))
    }

    private func wywolaj(_ m: String, _ a: [Any]) -> String? {
        let straz = Straz.shared
        func s(_ i: Int) -> String { i < a.count ? (a[i] as? String ?? "") : "" }
        func n(_ i: Int) -> Int { i < a.count ? ((a[i] as? NSNumber)?.intValue ?? Int(s(i)) ?? 0) : 0 }
        func tak(_ w: Bool) -> String { w ? "true" : "false" }
        switch m {
        case "start":
            let g = s(0), u = s(1)
            DispatchQueue.main.async { straz.start(granica: g, ustawienia: u) }
        case "ustaw":
            let g = s(0), u = s(1)
            DispatchQueue.main.async { straz.ustaw(granica: g, ustawienia: u) }
        case "stop":
            DispatchQueue.main.async { straz.stop() }
        case "wycisz":
            let sek = n(0)
            DispatchQueue.main.async { straz.wycisz(sekundy: sek) }
        case "dziala":
            return tak(straz.dziala)
        case "stan":
            return straz.ostatniStan ?? ""
        case "testAlarmu":
            DispatchQueue.main.async { Dzwiek.shared.probaAlarmu() }
        case "testOstrzezenia":
            DispatchQueue.main.async { Dzwiek.shared.pisk(wibruj: true) }
        case "lokalizacja":
            DispatchQueue.main.async {
                if let u = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(u) }
            }
        case "mowStart":
            return mowStart()
        case "mowStop":
            Nadajnik.stop()
        case "ustawRole":
            return tak(straz.gra?.ustawRole(s(0)) ?? false)
        case "ustawCzas":
            return tak(straz.gra?.ustawCzas(minuty: n(0)) ?? false)
        case "wyslij":
            return tak(straz.gra?.wyslijWiadomosc(do: s(0), tekst: s(1)) ?? false)
        default:
            break
        }
        return nil
    }

    /// Krótkofalówka: wciśnięty przycisk MÓW. „zgoda” — właśnie pytamy o mikrofon (trzeba wcisnąć jeszcze raz).
    private func mowStart() -> String {
        let sesja = AVAudioSession.sharedInstance()
        switch sesja.recordPermission {
        case .granted:
            return Nadajnik.start()
        case .denied:
            DispatchQueue.main.async { self.blad("mikrofon-brak") }
            return "zgoda"
        default:
            sesja.requestRecordPermission { jest in
                DispatchQueue.main.async { self.blad(jest ? "mikrofon-ok" : "mikrofon-brak") }
            }
            return "zgoda"
        }
    }

    // MARK: linki z mapy (np. atrybucja podkładu) — w Safari, nie w oknie aplikacji

    func webView(_ webView: WKWebView, decidePolicyFor a: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let u = a.request.url, u.scheme == "http" || u.scheme == "https", a.navigationType == .linkActivated {
            UIApplication.shared.open(u)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    // zwykłe okienka JS (gdyby strona ich kiedyś użyła)
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping () -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        present(a, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping (Bool) -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "Anuluj", style: .cancel) { _ in completionHandler(false) })
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        present(a, animated: true)
    }

    /// Strona przestała działać (system zabił proces WebKitu w tle) — wczytaj ją jeszcze raz.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.reload()
    }
}
