import CoreLocation
import UIKit
import UserNotifications

/// Strażnik granicy — odpowiednik usługi Straz.java z Androida. Bierze pozycję z GPS (także w tle, ze zgaszonym
/// ekranem: tryb „location” w tle i niebieska strzałka na pasku), sprawdza, czy telefon jest w obszarze, i podnosi
/// alarm (syrena + wibracje + powiadomienie), gdy z niego wyjdzie. Gdy gracz jest zalogowany, prowadzi też jego udział
/// w grze w chowanego (`Gra`): wysyła pozycję, odbiera stan gry, pokazuje powiadomienia od mistrza gry i szukających,
/// a szukającym i mistrzowi gry sam odtwarza głos z krótkofalówki (`Glosnik`).
/// Reguły alarmu — te same co w Straz.java i app.js (DOKLADNOSC, POZA_RAZY, CISZA_GPS, strefa z 5 m zapasu).
/// Wszystko na głównym wątku (zdarzenia gry są na niego przekładane).
final class Straz: NSObject, CLLocationManagerDelegate, GraSluchacz {
    static let shared = Straz()

    /// Pomiar gorszy niż tyle metrów rozstrzyga tylko, gdy odległość od granicy jest większa niż jego błąd.
    private static let dokladnosc = 35.0
    /// Tyle kolejnych pewnych pomiarów poza granicą włącza alarm (odsiewa pojedyncze skoki GPS).
    private static let pozaRazy = 2
    /// Bez nowej pozycji przez tyle sekund — „brak sygnału GPS”.
    private static let ciszaGps: TimeInterval = 20

    /// Okno mapy: stan (JSON) i błędy (kody jak w Mapa.java).
    var naStan: ((String) -> Void)?
    var naBlad: ((String) -> Void)?

    private(set) var dziala = false
    private(set) var ostatniStan: String?
    /// Gra w chowanego, gdy gracz jest zalogowany i pilnowanie trwa.
    private(set) var gra: Gra?

    private let lm = CLLocationManager()
    private let prefs = UserDefaults.standard
    private var granica: Granica?
    private var strefa = 15.0
    private var wibracje = true, ostrzegaj = true
    private var ja = 0

    private var pozycja: CLLocation?
    private var wewnatrz = true, blisko = false, alarm = false, gpsWylaczony = false
    private var odleglosc = -1.0
    private var poza = 0
    private var wyciszonyDo: Date?
    private var ostatniPomiar = Date()
    private var zegar: Timer?
    private var czekaNaZgode = false
    private var zmianaCzeka = false
    /// Głośnik krótkofalówki — czytany też z kolejki sieci, więc pod zamkiem.
    private let zamekGlosnika = NSLock()
    private var _glosnik: Glosnik?
    private var glosnik: Glosnik? {
        get { zamekGlosnika.lock(); defer { zamekGlosnika.unlock() }; return _glosnik }
        set { zamekGlosnika.lock(); _glosnik = newValue; zamekGlosnika.unlock() }
    }

    private override init() {
        super.init()
        lm.delegate = self
    }

    // MARK: polecenia z mapy

    /// START: zapisuje granicę i ustawienia, pyta o zgody i zaczyna pilnować.
    func start(granica g: String, ustawienia u: String) {
        zapisz(g, u)
        guard wczytaj() else { naBlad?("usluga"); return }
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in }
        sprawdzZgodeIUruchom()
    }

    func ustaw(granica g: String, ustawienia u: String) {
        guard dziala else { return }
        zapisz(g, u)
        _ = wczytaj()
        przestawGre()
        if let p = pozycja { ocen(p) }
        nadaj()
    }

    func stop() { zakoncz() }

    /// Po ponownym uruchomieniu aplikacji: jeśli pilnowanie trwało, gdy system ją zamknął — wznawia je samo.
    func przywroc() {
        guard prefs.bool(forKey: "straz.dziala"), wczytaj() else { return }
        let z = lm.authorizationStatus
        if z == .authorizedWhenInUse || z == .authorizedAlways { uruchom() }
    }

    private func sprawdzZgodeIUruchom() {
        switch lm.authorizationStatus {
        case .notDetermined:
            czekaNaZgode = true
            lm.requestWhenInUseAuthorization()
        case .denied, .restricted:
            naBlad?("brak-zgody")
        default:
            if lm.accuracyAuthorization == .reducedAccuracy {
                lm.requestTemporaryFullAccuracyAuthorization(withPurposeKey: "granica") { [weak self] _ in
                    guard let self = self else { return }
                    if self.lm.accuracyAuthorization == .reducedAccuracy { self.naBlad?("przyblizona") }
                    else if !self.dziala { self.uruchom() }
                }
                return
            }
            if !dziala { uruchom() } else { przestawGre(); nadaj() }
        }
    }

    func locationManagerDidChangeAuthorization(_ m: CLLocationManager) {
        if czekaNaZgode && m.authorizationStatus != .notDetermined {
            czekaNaZgode = false
            sprawdzZgodeIUruchom()
        } else if dziala {
            sprawdzUslugi()
        }
    }

    // MARK: ustawienia (zapisane, żeby po ponownym uruchomieniu wiedzieć, czego pilnować)

    private func zapisz(_ g: String, _ u: String) {
        prefs.set(g, forKey: "straz.granica")
        prefs.set(u, forKey: "straz.ustawienia")
    }

    private func wczytaj() -> Bool {
        guard let gj = prefs.string(forKey: "straz.granica"), let g = Granica(json: gj) else { return false }
        granica = g
        let u = (try? JSONSerialization.jsonObject(with: Data((prefs.string(forKey: "straz.ustawienia") ?? "{}").utf8))) as? [String: Any] ?? [:]
        strefa = (u["strefa"] as? NSNumber)?.doubleValue ?? 15
        wibracje = (u["wibracje"] as? Bool) ?? true
        ostrzegaj = (u["ostrzegaj"] as? Bool) ?? true
        ja = (u["ja"] as? NSNumber)?.intValue ?? 0
        return true
    }

    // MARK: start i koniec

    private func uruchom() {
        Dzwiek.shared.przygotuj()                             // silnik audio chodzi od teraz — syrena zagra i w tle
        lm.desiredAccuracy = kCLLocationAccuracyBest
        lm.distanceFilter = kCLDistanceFilterNone
        lm.activityType = .fitness
        lm.pausesLocationUpdatesAutomatically = false
        lm.allowsBackgroundLocationUpdates = true
        lm.showsBackgroundLocationIndicator = true
        lm.startUpdatingLocation()

        glosnik = Glosnik { [weak self] in self?.zmiana() }
        dziala = true
        prefs.set(true, forKey: "straz.dziala")
        poza = 0
        alarm = false
        blisko = false
        wewnatrz = true
        odleglosc = -1
        pozycja = nil
        wyciszonyDo = nil
        ostatniPomiar = Date()                                // „brak sygnału” liczymy od startu
        zegar?.invalidate()
        zegar = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in self?.tik() }
        sprawdzUslugi()
        przestawGre()
        nadaj()
    }

    private func zakoncz() {
        dziala = false
        prefs.set(false, forKey: "straz.dziala")
        zegar?.invalidate()
        zegar = nil
        lm.stopUpdatingLocation()
        lm.allowsBackgroundLocationUpdates = false
        Nadajnik.stop()
        glosnik?.zamknij()
        glosnik = nil
        Dzwiek.shared.wylacz()
        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: ["alarm"])
        let g = gra
        gra = nil
        g?.zamknij()
        alarm = false
        nadaj()
    }

    /// Gra zgodna z zalogowanym profilem: nowa po zalogowaniu, zamknięta po wylogowaniu.
    private func przestawGre() {
        if let g = gra, g.ja == ja { return }
        gra?.zamknij()
        gra = nil
        guard ja >= 1 && ja <= Gra.mistrz else { return }
        let g = Gra(ja: ja, sluchacz: self)
        g.polacz()
        gra = g
    }

    private func tik() {
        guard dziala else { return }
        if alarm, let w = wyciszonyDo, Date() >= w {
            wyciszonyDo = nil
            Dzwiek.shared.syrena(wibruj: wibracje)
            pokazAlarm()
        }
        gra?.sprawdzCzas()
        sprawdzUslugi()
        nadaj()
    }

    /// Czy lokalizacja w telefonie jest włączona (sprawdzane poza głównym wątkiem — tak każe iOS).
    private func sprawdzUslugi() {
        DispatchQueue.global(qos: .utility).async {
            let wl = CLLocationManager.locationServicesEnabled()
            DispatchQueue.main.async {
                let wyl = !wl || self.lm.authorizationStatus == .denied
                if wyl != self.gpsWylaczony {
                    self.gpsWylaczony = wyl
                    self.nadaj()
                }
            }
        }
    }

    // MARK: pozycja

    func locationManager(_ m: CLLocationManager, didUpdateLocations l: [CLLocation]) {
        guard dziala, let p = l.last, p.horizontalAccuracy >= 0 else { return }
        ostatniPomiar = Date()
        pozycja = p
        ocen(p)
        gra?.pozycja(szer: p.coordinate.latitude, dl: p.coordinate.longitude, dokl: p.horizontalAccuracy, poza: alarm)
        nadaj()
    }

    func locationManager(_ m: CLLocationManager, didFailWithError e: Error) {
        if (e as? CLError)?.code == .denied { sprawdzUslugi() }
    }

    private func ocen(_ p: CLLocation) {
        guard let g = granica else { return }
        let szer = p.coordinate.latitude, dl = p.coordinate.longitude
        let w = g.wewnatrz(szer, dl)
        let d = g.odleglosc(szer, dl)
        let blad = p.horizontalAccuracy >= 0 ? p.horizontalAccuracy : 99
        wewnatrz = w
        odleglosc = d
        let pewny = blad <= Straz.dokladnosc || d >= blad
        guard pewny else { return }
        if !w {
            poza += 1
            if poza >= Straz.pozaRazy && !alarm { wlaczAlarm() }
        } else {
            poza = 0
            if alarm { wylaczAlarm() }
            if d <= strefa {
                if !blisko && ostrzegaj { Dzwiek.shared.pisk(wibruj: wibracje) }
                blisko = true
            } else if d > strefa + 5 {
                blisko = false                                // 5 m zapasu, żeby nie piszczało na krawędzi strefy
            }
        }
    }

    private func wlaczAlarm() {
        alarm = true
        blisko = false
        wyciszonyDo = nil
        Dzwiek.shared.syrena(wibruj: wibracje)
        pokazAlarm()
    }

    private func wylaczAlarm() {
        alarm = false
        wyciszonyDo = nil
        Dzwiek.shared.ucisz()
        Dzwiek.shared.powrot()
        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: ["alarm"])
    }

    func wycisz(sekundy: Int) {
        guard dziala, alarm else { return }
        wyciszonyDo = Date().addingTimeInterval(TimeInterval(sekundy))
        Dzwiek.shared.ucisz()
        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: ["alarm"])
        nadaj()
    }

    // MARK: powiadomienia i stan dla mapy

    private func pokazAlarm() {
        let t = odleglosc >= 0 ? "Jesteś \(Int(odleglosc.rounded())) m za granicą. Wróć do obszaru." : "Wróć do obszaru."
        powiadom(id: "alarm", tytul: "POZA GRANICĄ!", tekst: t, kategoria: "ALARM", dzwiek: false)
    }

    private func powiadom(id: String, tytul: String, tekst: String, kategoria: String? = nil, dzwiek: Bool) {
        let c = UNMutableNotificationContent()
        c.title = tytul
        c.body = tekst
        if dzwiek { c.sound = .default }                      // syrenę gra sama aplikacja — alarm bez dźwięku powiadomienia
        if let k = kategoria { c.categoryIdentifier = k }
        c.interruptionLevel = .timeSensitive
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: id, content: c, trigger: nil))
    }

    private var nrPowiadomienia = 0

    /// Wiadomość w grze albo koniec czasu — zwykłe powiadomienie (dźwięk według ustawień telefonu).
    private func powiadomOGrze(_ tytul: String, _ tekst: String) {
        nrPowiadomienia += 1
        powiadom(id: "gra-\(nrPowiadomienia % 50)", tytul: tytul, tekst: tekst, dzwiek: true)
    }

    func nadaj() {
        let teraz = Date()
        let brak = dziala && teraz.timeIntervalSince(ostatniPomiar) > Straz.ciszaGps
        var wycisz = 0
        if alarm, let w = wyciszonyDo, w > teraz { wycisz = Int(ceil(w.timeIntervalSince(teraz))) }
        var s: [String: Any] = ["dziala": dziala, "alarm": alarm, "wyciszony": wycisz, "brak": brak, "gpsWylaczony": gpsWylaczony]
        if let p = pozycja {
            s["lat"] = p.coordinate.latitude
            s["lon"] = p.coordinate.longitude
            s["dokl"] = p.horizontalAccuracy >= 0 ? p.horizontalAccuracy as Any : NSNull()
            s["kurs"] = p.course >= 0 && p.speed > 0.6 ? p.course as Any : NSNull()
            s["wiek"] = Int(teraz.timeIntervalSince(p.timestamp) * 1000)
            s["wewnatrz"] = wewnatrz
            s["odl"] = odleglosc
        }
        if let g = gra { s["gra"] = g.stan() }
        s["radio"] = ["mowi": glosnik?.mowia ?? [], "nadaje": Nadajnik.nadaje]
        if let j = Gra.napis(s) {
            ostatniStan = j
            naStan?(j)
        }
    }

    // MARK: GraSluchacz — zdarzenia z sieci przekładane na główny wątek

    func zmiana() {
        DispatchQueue.main.async {
            // wiele zmian naraz (np. pozycje kilku graczy) — jedno odświeżenie strony
            guard !self.zmianaCzeka else { return }
            self.zmianaCzeka = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                self.zmianaCzeka = false
                self.nadaj()
            }
        }
    }

    func wiadomosc(od: Int, tekst: String) {
        let kto = od == Gra.mistrz ? "Mistrz gry" : "Gracz \(od)"
        DispatchQueue.main.async { self.powiadomOGrze("📣 " + kto, tekst) }
    }

    func koniecCzasu() {
        DispatchQueue.main.async { self.powiadomOGrze("⏱ Koniec czasu!", "Czas gry minął.") }
    }

    func glos(od: Int, pakiet: Data) {
        glosnik?.odbierz(od: od, pakiet: pakiet)
    }
}
