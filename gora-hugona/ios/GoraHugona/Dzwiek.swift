import AVFoundation
import AudioToolbox
import MediaPlayer
import UIKit

/// Dźwięki strażnika i głośnik krótkofalówki — jeden silnik audio na całą aplikację (`silnik`).
///
/// Sesja audio „playAndRecord + domyślnie głośnik + miksowanie z innymi”: gra także przy przełączniku wyciszenia
/// (jak strumień alarmu na Androidzie), nie zabiera muzyki innym aplikacjom i pozwala krótkofalówce nagrywać.
/// Silnik chodzi bez przerwy od STARTU do STOPU — dzięki temu syrena może ruszyć także w tle, przy zgaszonym ekranie
/// (iOS nie pozwala zacząć dźwięku w tle aplikacji, która go wcześniej nie grała).
/// iOS nie daje aplikacjom ustawiać głośności; na czas syreny podnosimy ją do 80% suwakiem systemu (MPVolumeView) —
/// tak jak robi to wiele aplikacji z alarmem; gdyby system kiedyś na to nie pozwolił, syrena gra z ustawioną głośnością.
final class Dzwiek {
    static let shared = Dzwiek()

    let silnik = AVAudioEngine()
    private let gracz = AVAudioPlayerNode()          // syrena
    private let efekty = AVAudioPlayerNode()         // piski
    private let probkowanie = 22050.0
    private let format: AVAudioFormat
    private var buforSyreny: AVAudioPCMBuffer?
    private(set) var syrenaGra = false
    private var test = false
    private var wibracje: Timer?
    private var glosnoscPrzed: Float = -1
    /// Suwak głośności systemu (z niewidocznego MPVolumeView w oknie mapy).
    weak var suwak: UISlider?

    private init() {
        format = AVAudioFormat(standardFormatWithSampleRate: probkowanie, channels: 1)!
        silnik.attach(gracz)
        silnik.attach(efekty)
        silnik.connect(gracz, to: silnik.mainMixerNode, format: format)
        silnik.connect(efekty, to: silnik.mainMixerNode, format: format)
        buforSyreny = zrobSyrene()
        let nc = NotificationCenter.default
        nc.addObserver(forName: .AVAudioEngineConfigurationChange, object: silnik, queue: .main) { [weak self] _ in self?.wznow() }
        nc.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] n in
            // po rozmowie telefonicznej (albo innym przerwaniu) — silnik z powrotem
            guard let typ = n.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
                  AVAudioSession.InterruptionType(rawValue: typ) == .ended else { return }
            self?.wznow()
        }
        nc.addObserver(forName: AVAudioSession.mediaServicesWereResetNotification, object: nil, queue: .main) { [weak self] _ in
            self?.wznow()
        }
    }

    // MARK: sesja i silnik

    private var wlaczony = false

    /// Włącza sesję audio i silnik (START pilnowania albo próba alarmu). Główny wątek.
    func przygotuj() {
        wlaczony = true
        let s = AVAudioSession.sharedInstance()
        do {
            try s.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .mixWithOthers, .allowBluetoothA2DP])
            try s.setActive(true)
        } catch {
            NSLog("Góra Hugona: sesja audio: \(error)")
        }
        uruchomSilnik()
    }

    private func uruchomSilnik() {
        guard !silnik.isRunning else { return }
        silnik.prepare()
        do { try silnik.start() } catch { NSLog("Góra Hugona: silnik audio: \(error)") }
    }

    /// Po zmianie wyjścia, przerwaniu albo resecie usług audio: silnik znowu chodzi, a wyjąca syrena wyje dalej.
    private func wznow() {
        guard wlaczony else { return }
        try? AVAudioSession.sharedInstance().setActive(true)
        uruchomSilnik()
        if syrenaGra { grajSyrene() }
        Glosnik.aktywny?.poZmianieSilnika()
    }

    /// STOP pilnowania: silnik staje, sesja oddana innym aplikacjom.
    func wylacz() {
        ucisz()
        wlaczony = false
        efekty.stop()
        silnik.stop()
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    // MARK: syrena

    /// Wyjąca syrena w pętli (650 → 1300 → 650 Hz co sekundę), aż do `ucisz` — jak Dzwiek.java.
    private func zrobSyrene() -> AVAudioPCMBuffer? {
        let n = Int(probkowanie)
        guard let b = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(n)), let k = b.floatChannelData?[0] else { return nil }
        var faza = 0.0
        for i in 0..<n {
            let t = Double(i) / Double(n)
            let f = t < 0.5 ? 650 + 1300 * t : 650 + 1300 * (1 - t)
            faza += 2 * .pi * f / probkowanie
            k[i] = Float((0.72 * sin(faza) + 0.22 * sin(3 * faza)) * 32000 / 32768)
        }
        b.frameLength = AVAudioFrameCount(n)
        return b
    }

    private func grajSyrene() {
        guard let b = buforSyreny else { return }
        gracz.stop()
        gracz.scheduleBuffer(b, at: nil, options: .loops)
        gracz.volume = 1
        gracz.play()
    }

    func syrena(wibruj: Bool) {
        test = false                                         // prawdziwy alarm przejmuje syrenę z próby
        if !syrenaGra {
            if !wlaczony { przygotuj() }
            podglosnij()
            syrenaGra = true
            grajSyrene()
        }
        wibracje?.invalidate()
        wibracje = nil
        if wibruj {
            AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
            wibracje = Timer.scheduledTimer(withTimeInterval: 1.05, repeats: true) { _ in
                AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
            }
        }
    }

    /// Próba alarmu z ustawień: 3 s syreny; nie rusza syreny, która już wyje.
    func probaAlarmu() {
        guard !syrenaGra else { return }
        syrena(wibruj: true)
        test = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
            guard let self = self, self.test else { return }
            self.ucisz()
            if !Straz.shared.dziala { self.wylacz() }
        }
    }

    func ucisz() {
        test = false
        wibracje?.invalidate()
        wibracje = nil
        if syrenaGra {
            syrenaGra = false
            gracz.stop()
            przywrocGlosnosc()
        }
    }

    // MARK: krótkie sygnały

    /// Krótkie ostrzeżenie: zbliżasz się do granicy (trzy piski).
    func pisk(wibruj: Bool) {
        if !wlaczony { przygotuj() }
        let p = Radio.ton(1200, 150, 0.6, probkowanie: Int(probkowanie)), c = [Int16](repeating: 0, count: Int(probkowanie) / 10)
        graj(p + c + p + c + p)
        if wibruj {
            AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { AudioServicesPlaySystemSound(kSystemSoundID_Vibrate) }
        }
    }

    /// Wróciłeś do środka (dwa rosnące tony).
    func powrot() {
        let r = Int(probkowanie)
        graj(Radio.ton(880, 120, 0.6, probkowanie: r) + [Int16](repeating: 0, count: r / 25) + Radio.ton(1320, 180, 0.6, probkowanie: r))
    }

    private func graj(_ probki: [Int16]) {
        guard silnik.isRunning, let b = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(probki.count)),
              let k = b.floatChannelData?[0] else { return }
        for (i, v) in probki.enumerated() { k[i] = Float(v) / 32768 }
        b.frameLength = AVAudioFrameCount(probki.count)
        efekty.scheduleBuffer(b, at: nil, options: [], completionHandler: nil)
        if !efekty.isPlaying { efekty.play() }
    }

    // MARK: głośność

    private func podglosnij() {
        let teraz = AVAudioSession.sharedInstance().outputVolume
        guard teraz < 0.8, let s = suwak else { return }
        glosnoscPrzed = teraz
        s.value = 0.8
        s.sendActions(for: .valueChanged)
    }

    private func przywrocGlosnosc() {
        guard glosnoscPrzed >= 0 else { return }
        if let s = suwak {
            s.value = glosnoscPrzed
            s.sendActions(for: .valueChanged)
        }
        glosnoscPrzed = -1
    }
}
