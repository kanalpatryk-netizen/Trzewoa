import UIKit
import UserNotifications

/// Góra Hugona na iPhone'a: jedno okno z mapą (`Mapa`) i strażnik granicy (`Straz`), który pilnuje także w tle.
/// Odpowiednik aplikacji na Androida z gora-hugona/apk — ta sama strona, ta sama sieć gry, te same reguły alarmu.
@main
final class Aplikacja: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions opcje: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let c = UNUserNotificationCenter.current()
        c.delegate = self
        // przyciski w powiadomieniu o alarmie — jak w aplikacji na Androida
        let wycisz = UNNotificationAction(identifier: "WYCISZ", title: "Wycisz na 1 min", options: [])
        let stop = UNNotificationAction(identifier: "STOP", title: "Zakończ pilnowanie", options: [.destructive])
        c.setNotificationCategories([UNNotificationCategory(identifier: "ALARM", actions: [wycisz, stop], intentIdentifiers: [], options: [])])

        let w = UIWindow(frame: UIScreen.main.bounds)
        w.rootViewController = Mapa()
        w.makeKeyAndVisible()
        window = w
        // pilnowanie trwało, gdy system zamknął aplikację — wznów je
        DispatchQueue.main.async { Straz.shared.przywroc() }
        return true
    }

    func application(_ application: UIApplication, supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask {
        .portrait
    }

    // powiadomienia także przy otwartej aplikacji (alarm bez dźwięku — syrenę gra sama aplikacja)
    func userNotificationCenter(_ c: UNUserNotificationCenter, willPresent n: UNNotification,
                                withCompletionHandler gotowe: @escaping (UNNotificationPresentationOptions) -> Void) {
        gotowe(n.request.content.sound == nil ? [.banner, .list] : [.banner, .list, .sound])
    }

    func userNotificationCenter(_ c: UNUserNotificationCenter, didReceive r: UNNotificationResponse,
                                withCompletionHandler gotowe: @escaping () -> Void) {
        switch r.actionIdentifier {
        case "WYCISZ": Straz.shared.wycisz(sekundy: 60)
        case "STOP": Straz.shared.stop()
        default: break
        }
        gotowe()
    }
}
