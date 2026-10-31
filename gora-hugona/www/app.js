/* Góra Hugona — mapa obszaru, znacznik użytkownika, alarm po wyjściu za granicę i gra w chowanego.
 *
 * W przeglądarce pozycję daje navigator.geolocation, a alarm gra Web Audio — działa tylko przy włączonym ekranie.
 * W aplikacji na Androida (obiekt HugonAndroid) pozycją i alarmem zajmuje się usługa Straz.java, także w tle;
 * aplikacja na iPhone'a (gora-hugona/ios) podstawia ten sam obiekt z `ios: true` i robi to samo w Straz.swift;
 * strona dostaje od niej stan przez hugonStan(…) i tylko go pokazuje. Reguły alarmu są w obu miejscach te same
 * (DOKLADNOSC, POZA_RAZY, CISZA_GPS, strefa ostrzeżenia z 5 m zapasu) — zmieniając je, zmień też Straz.java.
 *
 * Gra w chowanego (tylko w aplikacji): 7 profili — admin1…admin6 to gracze, admin7 to mistrz gry. Siecią zajmuje się
 * Gra.java; tutaj przychodzi gotowy stan (stan.gra): role, pozycje widocznych graczy, czas gry, powiadomienia.
 * Krótkofalówka szukających i mistrza gry: przycisk MÓW (przytrzymaj) → Nadajnik.java; odtwarza Glosnik.java,
 * stan w stan.radio.
 */
'use strict';
(() => {
  const A = window.HugonAndroid || null;
  const IOS = !!(A && A.ios);
  const ZAPIS = 'goraHugona.';
  const DOKLADNOSC = 35;      // m — gorszy pomiar rozstrzyga tylko, gdy odległość od granicy przekracza jego błąd
  const POZA_RAZY = 2;        // tyle kolejnych pewnych pomiarów za granicą włącza alarm
  const CISZA_GPS = 20000;    // ms bez pozycji — „brak sygnału”
  const ORYGINAL = window.GRANICA_HUGONA;
  const SWIAT = [[89, -179.9], [89, 179.9], [-89, 179.9], [-89, -179.9]];

  const $ = (id) => document.getElementById(id);
  const czytaj = (k, d) => {
    try { const v = localStorage.getItem(ZAPIS + k); return v ? JSON.parse(v) : d; } catch (e) { return d; }
  };
  const pisz = (k, v) => {
    try { if (v === null) localStorage.removeItem(ZAPIS + k); else localStorage.setItem(ZAPIS + k, JSON.stringify(v)); } catch (e) { /* bez zapisu */ }
  };
  const poprawna = (g) => Array.isArray(g) && g.length >= 3 && g.every((p) => Array.isArray(p) && isFinite(p[0]) && isFinite(p[1]));

  let granica = poprawna(czytaj('granica', null)) ? czytaj('granica') : ORYGINAL.map((p) => p.slice());
  const ust = Object.assign({ strefa: 15, wibracje: true }, czytaj('ustawienia', {}));

  // ---------- profil gracza ----------
  const MISTRZ = 7;
  let profil = (() => { const n = +czytaj('profil', 0); return n >= 1 && n <= MISTRZ ? n : 0; })();
  const nazwa = (n) => (n === MISTRZ ? 'Mistrz gry' : `Gracz ${n}`);
  const ROLE = { szuka: 'Szukający', chowa: 'Chowa się', mistrz: 'Mistrz gry', '': 'Nie gra' };
  /** Login i hasło: admin1/admin1 … admin7/admin7 (wielkość liter i spacje bez znaczenia). Zwraca numer profilu albo 0. */
  function sprawdzLogin(login, haslo) {
    const l = login.trim().toLowerCase(), h = haslo.trim().toLowerCase();
    const r = /^admin([1-7])$/.exec(l);
    return r && h === l ? +r[1] : 0;
  }
  const ustawieniaNatywne = () => JSON.stringify({ strefa: ust.strefa, wibracje: ust.wibracje, ostrzegaj: ust.strefa > 0, ja: profil });

  // ---------- geometria (płaski rzut wokół środka obszaru — jak Granica.java) ----------
  let P = plaska(granica);
  function plaska(g) {
    let s = 0, d = 0;
    for (const p of g) { s += p[0]; d += p[1]; }
    const szer0 = s / g.length, dl0 = d / g.length;
    const ky = 110574, kx = 111320 * Math.cos(szer0 * Math.PI / 180);
    return { szer0, dl0, kx, ky, x: g.map((p) => (p[1] - dl0) * kx), y: g.map((p) => (p[0] - szer0) * ky) };
  }
  function ocenPunkt(szer, dl) {
    const px = (dl - P.dl0) * P.kx, py = (szer - P.szer0) * P.ky;
    const { x, y } = P;
    let w = false, min = Infinity, nx = 0, ny = 0;
    for (let i = 0, j = x.length - 1; i < x.length; j = i++) {
      if ((y[i] > py) !== (y[j] > py) && px < (x[j] - x[i]) * (py - y[i]) / (y[j] - y[i]) + x[i]) w = !w;
      const dx = x[i] - x[j], dy = y[i] - y[j];
      let t = dx || dy ? ((px - x[j]) * dx + (py - y[j]) * dy) / (dx * dx + dy * dy) : 0;
      t = Math.max(0, Math.min(1, t));
      const ex = x[j] + t * dx, ey = y[j] + t * dy, o = Math.hypot(ex - px, ey - py);
      if (o < min) { min = o; nx = ex; ny = ey; }
    }
    return {
      wewnatrz: w,
      odl: min,
      najblizszy: [P.szer0 + ny / P.ky, P.dl0 + nx / P.kx],
      kierunek: (Math.atan2(nx - px, ny - py) * 180 / Math.PI + 360) % 360,
    };
  }
  function poleIObwod() {
    const { x, y } = P;
    let pole = 0, obw = 0;
    for (let i = 0, j = x.length - 1; i < x.length; j = i++) {
      pole += x[j] * y[i] - x[i] * y[j];
      obw += Math.hypot(x[i] - x[j], y[i] - y[j]);
    }
    return { ha: Math.abs(pole) / 2 / 1e4, km: obw / 1000 };
  }
  const STRONY = ['północ', 'północny wschód', 'wschód', 'południowy wschód', 'południe', 'południowy zachód', 'zachód', 'północny zachód'];
  const strona = (st) => STRONY[Math.round(st / 45) % 8];
  const m = (v) => (v >= 1000 ? (v / 1000).toFixed(2).replace('.', ',') + ' km' : Math.round(v) + ' m');

  // ---------- mapa ----------
  const mapa = L.map('mapa', { zoomControl: false, maxZoom: 20, tap: false });
  const podklady = {
    satelita: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 20, maxNativeZoom: 19, attribution: 'Zdjęcia © Esri, Maxar, Earthstar Geographics',
    }),
    mapa: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20, maxNativeZoom: 19, attribution: '© autorzy <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }),
  };
  let podklad = podklady[czytaj('podklad', 'satelita')] ? czytaj('podklad', 'satelita') : 'satelita';
  podklady[podklad].addTo(mapa);

  const maska = L.polygon([SWIAT, granica], { stroke: false, fillColor: '#07100b', fillOpacity: 0.45, interactive: false }).addTo(mapa);
  const linia = L.polygon(granica, { color: '#f2c14e', weight: 3, fill: false, interactive: false }).addTo(mapa);
  const doGranicy = L.polyline([], { color: '#ff5a5f', weight: 3, dashArray: '6 8', interactive: false });
  const krag = L.circle([0, 0], { radius: 1, color: '#2f7bf6', weight: 1, opacity: 0.6, fillOpacity: 0.12, interactive: false });
  const ja = L.marker([0, 0], {
    icon: L.divIcon({ className: 'ja', html: '<div class="kurs"></div><div class="kropka"></div>', iconSize: [24, 24] }),
    interactive: false, keyboard: false, zIndexOffset: 1000,
  });

  function pokazObszar(animuj) {
    const gora = $('pasek').offsetHeight + 20, dol = $('dol').offsetHeight + 24;
    mapa.fitBounds(L.latLngBounds(granica), { paddingTopLeft: [16, gora], paddingBottomRight: [70, dol], animate: !!animuj });
  }
  function rysujGranice(g) {
    linia.setLatLngs(g);
    maska.setLatLngs([SWIAT, g]);
  }
  pokazObszar(false);

  let sledz = true;          // mapa jedzie za mną, dopóki ktoś jej nie przesunie
  let bylaPozycja = false;
  let chowa = false;         // tryb chowającego się: tylko mapa, swój znacznik, pozostały czas i wylogowanie
  let powrotSledzenia = null;
  mapa.on('dragstart', () => { sledz = false; $('b-ja').classList.remove('wl'); clearTimeout(powrotSledzenia); });
  // chowający się nie ma przycisku „pokaż mnie” — mapa sama wraca do niego 8 s po przesunięciu
  mapa.on('dragend', () => {
    if (!chowa) return;
    powrotSledzenia = setTimeout(() => {
      sledz = true;
      if (chowa && stan && stan.lat != null) mapa.panTo([stan.lat, stan.lon]);
    }, 8000);
  });

  // ---------- dźwięk w przeglądarce (w aplikacji gra Dzwiek.java) ----------
  const dzwiek = {
    ac: null, syrena: null, wibr: null,
    odblokuj() {
      try {
        if (!this.ac) this.ac = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ac.state === 'suspended') this.ac.resume();
      } catch (e) { this.ac = null; }
    },
    wyj(start) {
      if (this.syrena || !this.ac) return;
      const ac = this.ac, osc = ac.createOscillator(), lfo = ac.createOscillator(), glebia = ac.createGain(), g = ac.createGain();
      osc.type = 'square'; osc.frequency.value = 975;
      lfo.type = 'triangle'; lfo.frequency.value = 1; glebia.gain.value = 325;   // 650 → 1300 Hz co sekundę
      lfo.connect(glebia).connect(osc.frequency);
      g.gain.value = 0.35;
      osc.connect(g).connect(ac.destination);
      osc.start(); lfo.start();
      this.syrena = [osc, lfo];
      if (start && ust.wibracje && navigator.vibrate) {
        navigator.vibrate([700, 350]);
        this.wibr = setInterval(() => navigator.vibrate([700, 350]), 1050);
      }
    },
    cisza() {
      if (this.syrena) { this.syrena.forEach((o) => { try { o.stop(); } catch (e) { /* już stoi */ } }); this.syrena = null; }
      if (this.wibr) { clearInterval(this.wibr); this.wibr = null; }
      if (navigator.vibrate) navigator.vibrate(0);
    },
    tony(lista) {
      if (!this.ac) return;
      let t = this.ac.currentTime + 0.02;
      for (const [f, d] of lista) {
        const o = this.ac.createOscillator(), g = this.ac.createGain();
        o.frequency.value = f; g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
        o.connect(g).connect(this.ac.destination); o.start(t); o.stop(t + d + 0.02);
        t += d + 0.08;
      }
    },
    pisk() {
      this.tony([[1200, 0.18], [1200, 0.18]]);
      if (ust.wibracje && navigator.vibrate) navigator.vibrate([250, 150, 250]);
    },
    powrot() { this.tony([[700, 0.12], [1050, 0.2]]); },
  };

  // ---------- pilnowanie w przeglądarce (w aplikacji robi to Straz.java) ----------
  const p = {
    dziala: false, poz: null, wewnatrz: true, odl: -1, pozaRazy: 0, alarm: false, blisko: false,
    wyciszonyDo: 0, ostatniPomiar: 0, gpsWylaczony: false, obserwator: null, tik: null, blokada: null,
  };
  function startPrzegladarka() {
    if (!navigator.geolocation) { dymek('Ta przeglądarka nie podaje położenia. Użyj aplikacji (Android albo iPhone).'); return; }
    dzwiek.odblokuj();
    Object.assign(p, { dziala: true, poz: null, wewnatrz: true, odl: -1, pozaRazy: 0, alarm: false, blisko: false, wyciszonyDo: 0, ostatniPomiar: Date.now(), gpsWylaczony: false });
    p.obserwator = navigator.geolocation.watchPosition(naPozycje, naBlad, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
    p.tik = setInterval(tik, 1000);
    trzymajEkran();
    nadaj();
    if (!czytaj('powiedzianoOEkranie', false)) {
      pisz('powiedzianoOEkranie', true);
      dymek('W przeglądarce pilnowanie działa tylko przy włączonym ekranie i otwartej stronie. Żeby alarm działał z telefonem w kieszeni, użyj aplikacji (Android albo iPhone).', 7000);
    }
  }
  function stopPrzegladarka() {
    if (p.obserwator !== null) navigator.geolocation.clearWatch(p.obserwator);
    clearInterval(p.tik);
    p.obserwator = null;
    p.dziala = false;
    p.alarm = false;
    dzwiek.cisza();
    if (p.blokada) { p.blokada.release().catch(() => {}); p.blokada = null; }
    nadaj();
  }
  function naPozycje(poz) {
    const c = poz.coords;
    p.poz = { lat: c.latitude, lon: c.longitude, dokl: c.accuracy, kurs: c.heading != null && !isNaN(c.heading) && (c.speed || 0) > 0.6 ? c.heading : null };
    p.ostatniPomiar = Date.now();
    p.gpsWylaczony = false;
    ocen();
    nadaj();
  }
  function naBlad(e) {
    if (e.code === 1) {
      stopPrzegladarka();
      dymek('Brak zgody na lokalizację. Zezwól tej stronie na dostęp do położenia (ikona kłódki przy adresie) i naciśnij START jeszcze raz.', 8000);
    } else if (e.code === 2) {
      p.gpsWylaczony = true;
      nadaj();
    }
  }
  function ocen() {
    const o = ocenPunkt(p.poz.lat, p.poz.lon);
    p.wewnatrz = o.wewnatrz;
    p.odl = o.odl;
    const blad = p.poz.dokl || 99;
    if (!(blad <= DOKLADNOSC || o.odl >= blad)) return;
    if (!o.wewnatrz) {
      p.pozaRazy++;
      if (p.pozaRazy >= POZA_RAZY && !p.alarm) { p.alarm = true; p.blisko = false; p.wyciszonyDo = 0; dzwiek.wyj(true); }
    } else {
      p.pozaRazy = 0;
      if (p.alarm) { p.alarm = false; p.wyciszonyDo = 0; dzwiek.cisza(); dzwiek.powrot(); }
      if (o.odl <= ust.strefa) {
        if (!p.blisko && ust.strefa > 0) dzwiek.pisk();
        p.blisko = true;
      } else if (o.odl > ust.strefa + 5) {
        p.blisko = false;
      }
    }
  }
  function tik() {
    if (p.alarm && p.wyciszonyDo && Date.now() >= p.wyciszonyDo) { p.wyciszonyDo = 0; dzwiek.wyj(true); }
    nadaj();
  }
  function nadaj() {
    const teraz = Date.now();
    const s = {
      dziala: p.dziala, alarm: p.alarm, gpsWylaczony: p.gpsWylaczony,
      brak: p.dziala && teraz - p.ostatniPomiar > CISZA_GPS,
      wyciszony: p.alarm && p.wyciszonyDo > teraz ? Math.ceil((p.wyciszonyDo - teraz) / 1000) : 0,
    };
    if (p.poz) Object.assign(s, p.poz, { wewnatrz: p.wewnatrz, odl: p.odl, wiek: teraz - p.ostatniPomiar });
    pokaz(s);
  }
  async function trzymajEkran() {
    try { if ('wakeLock' in navigator && p.dziala && document.visibilityState === 'visible') p.blokada = await navigator.wakeLock.request('screen'); } catch (e) { /* bez blokady */ }
  }
  document.addEventListener('visibilitychange', () => {
    if (!A && p.dziala && document.visibilityState === 'visible') { trzymajEkran(); dzwiek.odblokuj(); }
  });

  // ---------- sterowanie (wspólne) ----------
  const dziala = () => (A ? !!(stan && stan.dziala) : p.dziala);
  function start() {
    if (A) A.start(JSON.stringify(granica), ustawieniaNatywne());
    else startPrzegladarka();
    sledz = true;
    $('b-ja').classList.add('wl');
  }
  function stop() {
    if (A) A.stop(); else stopPrzegladarka();
  }
  function wycisz() {
    if (A) { A.wycisz(60); return; }
    if (!p.alarm) return;
    p.wyciszonyDo = Date.now() + 60000;
    dzwiek.cisza();
    nadaj();
  }

  // ---------- pokazywanie stanu ----------
  let stan = null;
  function pokaz(s) {
    stan = s;
    ustawTrybChowajacego(!!(profil && profil !== MISTRZ && s.gra && s.gra.rola === 'chowa'));
    const maPoz = s.lat != null && s.odl != null && s.odl >= 0;
    const o = maPoz ? ocenPunkt(s.lat, s.lon) : null;
    let rodzaj, tytul, opis;
    if (!s.dziala) {
      rodzaj = 'spoczynek'; tytul = 'Góra Hugona';
      opis = profil ? 'Naciśnij START, żeby dołączyć do gry i pilnować granicy.' : 'Zaloguj się i naciśnij START.';
    } else if (s.gpsWylaczony) {
      rodzaj = 'brak'; tytul = 'Lokalizacja wyłączona'; opis = A ? 'Włącz lokalizację (GPS) — dotknij tutaj.' : 'Włącz lokalizację (GPS) w telefonie.';
    } else if (!maPoz) {
      rodzaj = 'brak'; tytul = 'Szukam sygnału GPS…'; opis = 'Wyjdź na otwartą przestrzeń, jeśli to trwa długo.';
    } else if (s.alarm && s.wyciszony > 0) {
      rodzaj = 'wyciszony'; tytul = 'Poza granicą (wyciszone)';
      opis = `${m(s.odl)} za granicą. Alarm wróci za ${s.wyciszony} s. Wróć na ${strona(o.kierunek)}.`;
    } else if (s.alarm) {
      rodzaj = 'poza'; tytul = 'POZA GRANICĄ!';
      opis = `${m(s.odl)} za granicą — wróć na ${strona(o.kierunek)}.`;
    } else if (!s.wewnatrz) {
      rodzaj = 'chyba'; tytul = 'Chyba za granicą…'; opis = `${m(s.odl)} za granicą — sprawdzam pozycję.`;
    } else if (ust.strefa > 0 && s.odl <= ust.strefa) {
      rodzaj = 'blisko'; tytul = 'Blisko granicy'; opis = `Do granicy ${m(s.odl)} (na ${strona(o.kierunek)}).`;
    } else {
      rodzaj = 'wewnatrz'; tytul = 'W obszarze'; opis = `Do granicy ${m(s.odl)}.`;
    }
    document.body.dataset.stan = rodzaj;
    $('s-tytul').textContent = tytul;
    $('s-opis').textContent = opis;

    const gps = $('s-gps');
    if (s.dziala && maPoz) {
      const sek = Math.round((s.wiek || 0) / 1000);
      gps.hidden = false;
      gps.textContent = s.brak ? `Brak sygnału GPS od ${sek} s — pokazuję ostatnią pozycję` : `GPS ±${Math.round(s.dokl || 0)} m`;
    } else gps.hidden = true;

    $('b-start').textContent = s.dziala ? 'STOP' : 'START';
    $('b-start').classList.toggle('stop', !!s.dziala);
    $('b-wycisz').hidden = !(s.alarm && !(s.wyciszony > 0));

    if (maPoz) {
      const ll = [s.lat, s.lon];
      if (!mapa.hasLayer(ja)) { krag.addTo(mapa); ja.addTo(mapa); }
      ja.setLatLng(ll);
      krag.setLatLng(ll).setRadius(s.dokl || 1);
      const el = ja.getElement();
      if (el) {
        el.classList.toggle('stara', !!s.brak);
        el.classList.toggle('ma-kurs', s.kurs != null);
        if (s.kurs != null) el.querySelector('.kurs').style.transform = `rotate(${s.kurs}deg)`;
      }
      if (!s.wewnatrz && !chowa) {
        doGranicy.setLatLngs([ll, o.najblizszy]);
        if (!mapa.hasLayer(doGranicy)) doGranicy.addTo(mapa);
      } else if (mapa.hasLayer(doGranicy)) doGranicy.remove();
      if (sledz && s.dziala && !edycja.wl) {
        if (!bylaPozycja) mapa.setView(ll, Math.max(mapa.getZoom(), 17));
        else mapa.panTo(ll, { animate: true });
      }
      bylaPozycja = true;
    } else if (!s.dziala) {
      if (mapa.hasLayer(ja)) { ja.remove(); krag.remove(); }
      if (mapa.hasLayer(doGranicy)) doGranicy.remove();
      bylaPozycja = false;
    }
    pokazGre(s);
  }

  // stan z aplikacji (Android albo iPhone)
  window.hugonStan = (s) => pokaz(s);
  window.hugonBlad = (kod) => {
    const t = {
      'brak-zgody': IOS
        ? 'Bez zgody na lokalizację aplikacja nie wie, gdzie jesteś. Zezwól w: Ustawienia → Góra Hugona → Lokalizacja → „Podczas używania aplikacji”.'
        : 'Bez zgody na lokalizację aplikacja nie wie, gdzie jesteś. Zezwól w: Ustawienia → Aplikacje → Góra Hugona → Uprawnienia → Lokalizacja.',
      przyblizona: IOS
        ? 'Wybrano przybliżoną lokalizację — do pilnowania granicy potrzebna jest dokładna. Włącz: Ustawienia → Góra Hugona → Lokalizacja → „Dokładna lokalizacja” i naciśnij START jeszcze raz.'
        : 'Wybrano przybliżoną lokalizację — do pilnowania granicy potrzebna jest dokładna. Zezwól na „Dokładną lokalizację” i naciśnij START jeszcze raz.',
      usluga: 'Nie udało się uruchomić pilnowania. Spróbuj jeszcze raz.',
      'mikrofon-ok': 'Mikrofon włączony. Przytrzymaj MÓW i mów.',
      'mikrofon-brak': 'Bez zgody na mikrofon nie powiesz nic przez krótkofalówkę (słyszeć innych możesz).'
        + (IOS ? ' Zezwól w: Ustawienia → Góra Hugona → Mikrofon.' : ''),
    }[kod];
    dymek(t || 'Coś poszło nie tak.', 8000);
  };
  window.hugonWstecz = () => {
    if (!$('pytanie').hidden) { $('pytanie').hidden = true; return true; }
    if (!$('panel').hidden) { zamknijPanel(); return true; }
    if (!$('panel-gra').hidden) { zamknijPanelGry(); return true; }
    if (edycja.wl) { koniecEdycji(false); return true; }
    return false;
  };

  // ---------- przyciski ----------
  $('b-start').onclick = () => {
    if (!profil) { pokazLogowanie(); return; }
    if (!dziala()) start();
    else pytaj('Zakończyć pilnowanie granicy i grę na tym telefonie?', stop);
  };
  $('b-wycisz').onclick = wycisz;
  $('b-ja').onclick = () => {
    sledz = true;
    $('b-ja').classList.add('wl');
    if (stan && stan.lat != null) mapa.setView([stan.lat, stan.lon], Math.max(mapa.getZoom(), 17));
    else if (!dziala()) dymek('Naciśnij START — wtedy pokażę, gdzie jesteś.', 3000);
  };
  $('b-caly').onclick = () => { sledz = false; $('b-ja').classList.remove('wl'); pokazObszar(true); };
  $('b-warstwa').onclick = () => {
    mapa.removeLayer(podklady[podklad]);
    podklad = podklad === 'satelita' ? 'mapa' : 'satelita';
    podklady[podklad].addTo(mapa);
    pisz('podklad', podklad);
    dymek(podklad === 'satelita' ? 'Podkład: zdjęcia satelitarne' : 'Podkład: mapa OpenStreetMap', 1600);
  };
  $('pasek').onclick = () => { if (A && stan && stan.gpsWylaczony) A.lokalizacja(); };

  // ---------- panel ustawień ----------
  function otworzPanel() {
    $('u-strefa').value = ust.strefa;
    $('u-strefa-w').textContent = ust.strefa > 0 ? ust.strefa + ' m' : 'wyłączone';
    $('u-wibracje').checked = ust.wibracje;
    const po = poleIObwod();
    $('u-obszar').textContent = `Obszar: ${po.ha.toFixed(1).replace('.', ',')} ha, obwód ${po.km.toFixed(2).replace('.', ',')} km, ${granica.length} punktów.`;
    $('u-przywroc').hidden = czytaj('granica', null) === null;
    $('u-jak').textContent = IOS
      ? 'Po STARCIE aplikacja pilnuje granicy także przy zgaszonym ekranie i schowana — widać to po niebieskiej strzałce lokalizacji na pasku u góry. Nie zamykaj jej machnięciem w górę w przełączniku aplikacji: wtedy iOS kończy pilnowanie. Za granicą wyje syrena (także przy wyciszonym telefonie) i telefon wibruje, aż wrócisz albo wyciszysz alarm. Pojedyncze skoki GPS są odsiewane: alarm rusza po 2 pomiarach za granicą.'
      : A
      ? 'Po STARCIE aplikacja pilnuje granicy także przy zgaszonym ekranie i schowana — widać to po powiadomieniu. Za granicą wyje syrena (także w trybie cichym) i telefon wibruje, aż wrócisz albo wyciszysz alarm. Pojedyncze skoki GPS są odsiewane: alarm rusza po 2 pomiarach za granicą.'
      : 'Strona pilnuje granicy, dopóki jest otwarta i ekran świeci. Za granicą wyje syrena i telefon wibruje. Pojedyncze skoki GPS są odsiewane: alarm rusza po 2 pomiarach za granicą. Do pilnowania z telefonem w kieszeni użyj aplikacji (Android albo iPhone).';
    if (A && !IOS) {                                     // iPhone nie usypia pilnowania — tam nie ma czego wyłączać
      $('u-android').hidden = false;
      const ok = A.bezOszczedzania();
      $('u-bateria').classList.toggle('ostrzezenie', !ok);
      $('u-bateria-opis').textContent = ok
        ? 'Wyłączone — telefon nie uśpi pilnowania.'
        : 'Włączone — telefon może uśpić pilnowanie w tle. Dotknij, żeby wyłączyć (zalecane).';
    }
    $('panel').hidden = false;
    $('tlo').hidden = false;
  }
  function zamknijPanel() { $('panel').hidden = true; $('tlo').hidden = true; }
  function zapiszUstawienia() {
    pisz('ustawienia', ust);
    if (A && dziala()) A.ustaw(JSON.stringify(granica), ustawieniaNatywne());
  }
  $('b-ustawienia').onclick = otworzPanel;
  $('u-zamknij').onclick = zamknijPanel;
  $('tlo').onclick = () => { zamknijPanel(); zamknijPanelGry(); };
  $('u-strefa').oninput = (e) => {
    ust.strefa = +e.target.value;
    $('u-strefa-w').textContent = ust.strefa > 0 ? ust.strefa + ' m' : 'wyłączone';
  };
  $('u-strefa').onchange = zapiszUstawienia;
  $('u-wibracje').onchange = (e) => { ust.wibracje = e.target.checked; zapiszUstawienia(); };
  $('u-test').onclick = () => {
    if (A) { A.testAlarmu(); return; }
    dzwiek.odblokuj();
    if (dzwiek.syrena) return;
    dzwiek.wyj(true);
    setTimeout(() => { if (!p.alarm) dzwiek.cisza(); }, 3000);
  };
  $('u-test-ostrz').onclick = () => { if (A) A.testOstrzezenia(); else { dzwiek.odblokuj(); dzwiek.pisk(); } };
  $('u-bateria').onclick = () => { if (A) A.baterie(); };
  $('u-edytuj').onclick = () => { zamknijPanel(); edytuj(); };
  $('u-przywroc').onclick = () => pytaj('Przywrócić granicę z obrazka? Twoje poprawki znikną.', () => {
    pisz('granica', null);
    ustawGranice(ORYGINAL.map((q) => q.slice()));
    zamknijPanel();
    dymek('Przywrócono granicę z obrazka.', 2500);
  });

  function ustawGranice(g) {
    granica = g;
    P = plaska(granica);
    rysujGranice(granica);
    if (A && dziala()) A.ustaw(JSON.stringify(granica), ustawieniaNatywne());
    else if (!A && p.dziala && p.poz) { ocen(); nadaj(); }
  }

  // ---------- poprawianie granicy ----------
  const edycja = { wl: false, punkty: null, wybrany: -1, historia: [], warstwa: L.layerGroup() };
  const ikonaPunktu = (wybrany) => L.divIcon({ className: 'wierzcholek' + (wybrany ? ' wybrany' : ''), iconSize: [22, 22] });
  const ikonaSrodka = L.divIcon({ className: 'srodek', iconSize: [14, 14] });

  function edytuj() {
    edycja.wl = true;
    edycja.punkty = granica.map((q) => q.slice());
    edycja.wybrany = -1;
    edycja.historia = [];
    document.body.classList.add('edycja');
    $('edycja').hidden = false;
    edycja.warstwa.addTo(mapa);
    if (mapa.getZoom() < 16) pokazObszar(true);
    rysujEdycje();
  }
  function zapamietaj() {
    edycja.historia.push(edycja.punkty.map((q) => q.slice()));
    if (edycja.historia.length > 50) edycja.historia.shift();
  }
  function rysujEdycje() {
    const pk = edycja.punkty;
    edycja.warstwa.clearLayers();
    rysujGranice(pk);
    const mapaEl = mapa.getContainer();
    pk.forEach((q, i) => {
      const mk = L.marker(q, { draggable: true, icon: ikonaPunktu(i === edycja.wybrany), keyboard: false, autoPan: true, zIndexOffset: 1000 }).addTo(edycja.warstwa);
      mk.on('dragstart', () => { zapamietaj(); mapaEl.classList.add('przeciaganie'); });
      mk.on('drag', (e) => { const ll = e.target.getLatLng(); pk[i] = [ll.lat, ll.lng]; rysujGranice(pk); });
      mk.on('dragend', () => { mapaEl.classList.remove('przeciaganie'); rysujEdycje(); });
      mk.on('click', () => { edycja.wybrany = edycja.wybrany === i ? -1 : i; rysujEdycje(); });
    });
    pk.forEach((q, i) => {
      const r = pk[(i + 1) % pk.length];
      // kółko „dodaj punkt” tylko na bokach dość długich na ekranie, żeby nie zasłaniało punktów
      if (mapa.latLngToLayerPoint(q).distanceTo(mapa.latLngToLayerPoint(r)) < 44) return;
      const sr = L.marker([(q[0] + r[0]) / 2, (q[1] + r[1]) / 2], { draggable: true, icon: ikonaSrodka, keyboard: false, autoPan: true }).addTo(edycja.warstwa);
      let nowy = false;
      const wstaw = (ll) => { zapamietaj(); pk.splice(i + 1, 0, [ll.lat, ll.lng]); nowy = true; };
      sr.on('dragstart', (e) => { wstaw(e.target.getLatLng()); mapaEl.classList.add('przeciaganie'); });
      sr.on('drag', (e) => { const ll = e.target.getLatLng(); pk[i + 1] = [ll.lat, ll.lng]; rysujGranice(pk); });
      sr.on('dragend', () => { mapaEl.classList.remove('przeciaganie'); edycja.wybrany = i + 1; rysujEdycje(); });
      sr.on('click', (e) => { if (!nowy) { wstaw(e.target.getLatLng()); edycja.wybrany = i + 1; rysujEdycje(); } });
    });
    $('e-usun').disabled = edycja.wybrany < 0 || pk.length <= 3;
    $('e-cofnij').disabled = edycja.historia.length === 0;
  }
  function koniecEdycji(zapisz) {
    edycja.wl = false;
    edycja.warstwa.clearLayers();
    edycja.warstwa.remove();
    document.body.classList.remove('edycja');
    $('edycja').hidden = true;
    if (zapisz) {
      pisz('granica', edycja.punkty);
      ustawGranice(edycja.punkty);
      dymek('Zapisano nową granicę.', 2000);
    } else {
      rysujGranice(granica);
    }
  }
  $('e-usun').onclick = () => {
    if (edycja.wybrany < 0 || edycja.punkty.length <= 3) return;
    zapamietaj();
    edycja.punkty.splice(edycja.wybrany, 1);
    edycja.wybrany = -1;
    rysujEdycje();
  };
  $('e-cofnij').onclick = () => {
    if (!edycja.historia.length) return;
    edycja.punkty = edycja.historia.pop();
    edycja.wybrany = -1;
    rysujEdycje();
  };
  mapa.on('zoomend', () => { if (edycja.wl) rysujEdycje(); });
  $('e-anuluj').onclick = () => koniecEdycji(false);
  $('e-zapisz').onclick = () => koniecEdycji(true);


  // ---------- gra w chowanego ----------
  let gra = null;                 // stan.gra z aplikacji (null w przeglądarce i przed STARTEM)
  const znaczniki = new Map();    // numer gracza → { mk, klasa }
  let ostatniaWiadomosc = 0;      // czas najnowszego pokazanego powiadomienia
  const temu = (ms) => (ms < 10000 ? 'przed chwilą' : ms < 60000 ? `${Math.round(ms / 1000)} s temu`
    : ms < 3600000 ? `${Math.round(ms / 60000)} min temu` : 'ponad godzinę temu');
  const zegar = (ms) => {
    const c = Math.ceil(ms / 1000), h = Math.floor(c / 3600), mi = Math.floor((c % 3600) / 60), se = c % 60;
    return (h ? `${h}:${String(mi).padStart(2, '0')}` : `${mi}`) + ':' + String(se).padStart(2, '0');
  };
  const graczPoz = (n) => ((gra && gra.gracze) || []).find((x) => x.n === n);
  function opisGracza(x) {
    const gdzie = x.aktywny === false ? 'wyłączył grę' : x.poza ? 'POZA GRANICĄ' : 'w obszarze';
    return `${nazwa(x.n)} · ${ROLE[x.rola] || ''} · ${gdzie} · ${temu(Date.now() - x.t)}`;
  }

  function pokazGre(s) {
    gra = s.gra || null;
    $('s-gra').hidden = !profil;
    if (profil) {
      $('s-kto').textContent = nazwa(profil) + (gra && profil !== MISTRZ ? ` · ${ROLE[gra.rola] || ''}` : '');
      $('s-siec').hidden = !(A && s.dziala);
      $('s-siec').className = 'kropka-sieci' + (gra && gra.polaczony ? ' jest' : '');
    }
    pokazRadio(s);
    rysujZnaczniki();
    licznik();
    nowePowiadomienia();
    if (!$('panel-gra').hidden) rysujPanelGry();
  }

  /** Znaczniki innych graczy — tylko tych, których wolno mi widzieć (filtruje już Gra.java). */
  function rysujZnaczniki() {
    const teraz = Date.now(), sa = new Set();
    for (const x of (gra && gra.gracze) || []) {
      if (teraz - x.t > 30 * 60000) continue;                 // pozycja z dawnej gry
      sa.add(x.n);
      const klasa = `gracz ${x.rola || 'brak'}${x.poza ? ' poza' : ''}${x.aktywny === false ? ' wylaczony' : teraz - x.t > 60000 ? ' stary' : ''}`
        + (radio.mowia.includes(x.n) ? ' mowi' : '');
      let z = znaczniki.get(x.n);
      if (!z) {
        const mk = L.marker([x.lat, x.lon], { keyboard: false, zIndexOffset: 500 })
          .on('click', () => { const y = graczPoz(x.n); if (y) dymek(opisGracza(y), 4000); })
          .addTo(mapa);
        z = { mk, klasa: '' };
        znaczniki.set(x.n, z);
      }
      z.mk.setLatLng([x.lat, x.lon]);
      if (z.klasa !== klasa) {
        z.mk.setIcon(L.divIcon({ className: klasa, html: String(x.n), iconSize: [30, 30] }));
        z.klasa = klasa;
      }
    }
    for (const [n, z] of znaczniki) if (!sa.has(n)) { z.mk.remove(); znaczniki.delete(n); }
  }

  function licznik() {
    const k = (gra && gra.koniec) || 0, reszta = k - Date.now();
    const jest = !!k && reszta >= -3600000, koniec = jest && reszta <= 0;
    const el = $('s-czas');
    el.hidden = !jest;
    el.textContent = !jest ? '' : koniec ? '⏱ koniec czasu' : `⏱ ${zegar(reszta)}`;
    el.classList.toggle('koniec', koniec);
    for (const id of ['g-licznik', 'ch-czas']) $(id).textContent = !jest ? '—' : koniec ? 'Koniec czasu!' : zegar(reszta);
    $('g-licznik').classList.toggle('koniec', koniec);
    $('ch-czas-box').classList.toggle('koniec', koniec);
  }
  setInterval(licznik, 1000);

  /** Nowe powiadomienie widać też na mapie (powiadomienie systemowe wysyła usługa). */
  function nowePowiadomienia() {
    for (const w of (gra && gra.wiadomosci) || []) {
      if (!chowa && w.t > ostatniaWiadomosc && w.od !== profil && Date.now() - w.t < 120000) {
        dymek(`📣 ${nazwa(w.od)}: ${w.tekst}`, 8000);
      }
      ostatniaWiadomosc = Math.max(ostatniaWiadomosc, w.t);
    }
  }

  // panel gry
  function otworzPanelGry() {
    if (!profil) { pokazLogowanie(); return; }
    $('panel-gra').hidden = false;
    $('tlo').hidden = false;
    $('panel-gra').scrollTop = 0;
    rysujPanelGry();
  }
  function zamknijPanelGry() { $('panel-gra').hidden = true; $('tlo').hidden = true; }
  function rysujPanelGry() {
    const mistrz = profil === MISTRZ, rola = gra ? gra.rola : mistrz ? 'mistrz' : '';
    $('g-ja').textContent = nazwa(profil);
    $('g-rola').textContent = ROLE[rola] || '';
    $('g-rola').className = 'rola ' + rola;
    $('g-rola').hidden = mistrz || !gra;                  // u mistrza nazwa profilu mówi wszystko
    $('g-siec').textContent = !A || !dziala() ? '' : gra && gra.polaczony ? '● połączono' : '○ łączenie…';
    $('g-siec').classList.toggle('jest', !!(gra && gra.polaczony));
    let info = '';
    if (!A) info = 'Gra (znaczniki innych graczy, czas gry, powiadomienia) działa w aplikacji (Android albo iPhone).';
    else if (!dziala() || !gra) info = 'Naciśnij START, żeby dołączyć do gry.';
    else if (!gra.polaczony) info = 'Łączę z serwerem gry… Potrzebny jest internet.';
    else if (!mistrz && !gra.rola) info = 'Mistrz gry nie dał Ci jeszcze roli.';
    else if (gra.rola === 'chowa') info = 'Chowasz się — nie widzisz innych graczy. Powiadomienia przyjdą same.';
    else if (gra.rola === 'szuka' || mistrz) {
      info = `📻 Krótkofalówka: przytrzymaj czerwony przycisk MÓW na mapie i mów — ${mistrz ? 'szukający' : 'inni szukający i mistrz gry'} `
        + 'usłyszą Cię od razu, bez dotykania telefonu (głośność multimediów).';
    }
    $('g-info').textContent = info;
    $('g-info').hidden = !info;

    const steruje = !!(gra && gra.mozeSterowac);
    $('g-czas-ster').hidden = !steruje;
    $('g-wiad-blok').hidden = !steruje;
    $('g-role-blok').hidden = !(mistrz && gra);
    if (mistrz && gra) rysujRole();
    const widzi = !!gra && (mistrz || gra.rola === 'szuka');
    $('g-gracze-blok').hidden = !widzi;
    if (widzi) rysujListeGraczy();
    rysujHistorie();
    $('g-wyloguj-opis').textContent = dziala() ? 'Najpierw zakończ pilnowanie (STOP).' : `Zmień profil na tym telefonie (teraz: admin${profil}).`;
    licznik();
  }

  // role (mistrz gry) — przyciski powstają raz, potem zmienia się tylko podświetlenie
  function rysujRole() {
    const box = $('g-role');
    if (!box.childElementCount) {
      for (let n = 1; n < MISTRZ; n++) {
        const w = document.createElement('div');
        w.className = 'role-wiersz';
        w.innerHTML = `<span>Gracz ${n}</span><div class="seg"><button data-n="${n}" data-rola="szuka">Szuka</button>`
          + `<button data-n="${n}" data-rola="chowa">Chowa się</button><button data-n="${n}" data-rola="">Nie gra</button></div>`;
        box.appendChild(w);
      }
    }
    box.querySelectorAll('button').forEach((b) => b.classList.toggle('wl', (gra.role[b.dataset.n] || '') === b.dataset.rola));
  }
  $('g-role').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b || !gra) return;
    const role = {};
    for (let n = 1; n < MISTRZ; n++) role[n] = gra.role[n] || '';
    role[b.dataset.n] = b.dataset.rola;
    if (A && A.ustawRole(JSON.stringify(role))) {
      Object.assign(gra.role, role);                   // od razu na ekranie; reszta przyjdzie z usługi
      rysujRole();
    } else dymek('Nie udało się — naciśnij START, żeby połączyć się z grą.', 3500);
  };

  // lista graczy: mistrz — wszyscy, szukający — inni szukający
  let skladListy = '';
  function rysujListeGraczy() {
    const mistrz = profil === MISTRZ, lista = [];
    for (let n = 1; n < MISTRZ; n++) if (n !== profil && (mistrz || gra.role[n] === 'szuka')) lista.push(n);
    $('g-gracze-tytul').textContent = mistrz ? 'Gracze' : 'Inni szukający';
    const box = $('g-gracze');
    if (skladListy !== lista.join(',')) {
      skladListy = lista.join(',');
      box.innerHTML = '';
      for (const n of lista) {
        const w = document.createElement('div');
        w.className = 'gracz-wiersz';
        w.dataset.n = n;
        w.innerHTML = `<i class="gracz">${n}</i><div class="opis"></div><button data-n="${n}">Pokaż</button>`;
        box.appendChild(w);
      }
      if (!lista.length) box.innerHTML = '<p class="info">Nikogo — mistrz gry nie przydzielił jeszcze ról.</p>';
    }
    const teraz = Date.now();
    for (const w of box.querySelectorAll('.gracz-wiersz')) {
      const n = +w.dataset.n, x = graczPoz(n), rola = gra.role[n] || '';
      w.querySelector('.gracz').className = `gracz ${rola || 'brak'}`;
      const opis = w.querySelector('.opis');
      opis.innerHTML = '';
      const b = document.createElement('b');
      b.textContent = `${nazwa(n)} `;
      opis.append(b, ROLE[rola] || '', document.createElement('br'));
      if (!x || teraz - x.t > 30 * 60000) opis.append('brak pozycji');
      else {
        const st = document.createElement('span');
        if (x.aktywny === false) st.textContent = 'wyłączył grę';
        else if (x.poza) { st.textContent = 'POZA GRANICĄ'; st.className = 'alarm'; } else st.textContent = 'w obszarze';
        opis.append(st, ` · ${temu(teraz - x.t)}`);
      }
      w.querySelector('button').disabled = !x || teraz - x.t > 30 * 60000;
    }
  }
  $('g-gracze').onclick = (e) => {
    const b = e.target.closest('button');
    const x = b && graczPoz(+b.dataset.n);
    if (!x) return;
    sledz = false;
    $('b-ja').classList.remove('wl');
    zamknijPanelGry();
    mapa.setView([x.lat, x.lon], 18);
    dymek(opisGracza(x), 3500);
  };
  $('g-wszyscy').onclick = () => {
    const pkt = [...znaczniki.values()].map((z) => z.mk.getLatLng());
    if (stan && stan.lat != null) pkt.push(L.latLng(stan.lat, stan.lon));
    if (!pkt.length) { dymek('Na mapie nie ma jeszcze nikogo.', 2500); return; }
    sledz = false;
    $('b-ja').classList.remove('wl');
    zamknijPanelGry();
    mapa.fitBounds(L.latLngBounds(pkt).pad(0.3), { maxZoom: 18 });
  };

  let skladHistorii = '';
  function rysujHistorie() {
    const lista = ((gra && gra.wiadomosci) || []).slice().reverse();
    $('g-historia-blok').hidden = !lista.length;
    const sklad = lista.map((w) => w.t).join(',');
    if (sklad === skladHistorii) return;
    skladHistorii = sklad;
    const box = $('g-historia');
    box.innerHTML = '';
    const DO = { wszyscy: 'do wszystkich', szukajacy: 'do szukających', chowajacy: 'do chowających się' };
    for (const w of lista) {
      const d = document.createElement('div'), m = document.createElement('small');
      d.className = 'wiad';
      const godz = new Date(w.t).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
      const doKogo = DO[w.do] || (+w.do === MISTRZ ? 'do mistrza gry' : `do gracza ${w.do}`);
      m.textContent = `${godz} · ${w.od === profil ? 'Ty' : nazwa(w.od)} ${doKogo}`;
      d.append(m, w.tekst);
      box.appendChild(d);
    }
  }

  // czas gry i powiadomienia (mistrz gry i szukający)
  $('g-czas-ster').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const min = +b.dataset.min;
    const ustaw = () => {
      if (A && A.ustawCzas(min)) dymek(min ? `⏱ Czas gry: ${min} min — odliczanie u wszystkich graczy.` : 'Odliczanie wyłączone.', 3000);
      else dymek('Nie udało się — naciśnij START, żeby połączyć się z grą.', 3500);
    };
    if (gra && gra.koniec > Date.now()) pytaj(min ? `Ustawić nowy czas gry: ${min} min od teraz?` : 'Wyłączyć odliczanie czasu gry?', ustaw);
    else ustaw();
  };
  $('g-szybkie').onclick = (e) => {
    const b = e.target.closest('button');
    if (b) $('g-tekst').value = b.textContent;
  };
  $('g-wyslij').onclick = () => {
    const tekst = $('g-tekst').value.trim();
    if (!tekst) { dymek('Wpisz treść albo wybierz gotową.', 2500); return; }
    if (A && A.wyslij($('g-do').value, tekst)) {
      $('g-tekst').value = '';
      dymek('📣 Wysłano.', 2000);
    } else dymek('Nie wysłano — naciśnij START, żeby połączyć się z grą.', 3500);
  };
  $('b-gra').onclick = otworzPanelGry;
  $('g-zamknij').onclick = zamknijPanelGry;

  // logowanie
  function pokazLogowanie() {
    $('l-login').value = '';
    $('l-haslo').value = '';
    $('l-blad').hidden = true;
    $('logowanie').hidden = false;
  }
  $('l-form').onsubmit = (e) => {
    e.preventDefault();
    const n = sprawdzLogin($('l-login').value, $('l-haslo').value);
    if (!n) {
      $('l-blad').hidden = false;
      $('l-haslo').value = '';
      return;
    }
    profil = n;
    pisz('profil', n);
    $('logowanie').hidden = true;
    if (document.activeElement) document.activeElement.blur();
    pokaz(stan || { dziala: false });
    dymek(`Zalogowano: ${nazwa(n)}. Naciśnij START, żeby dołączyć do gry.`, 3500);
  };
  function wyloguj() {
    profil = 0;
    pisz('profil', null);
    zamknijPanelGry();
    pokaz(stan || { dziala: false });
    pokazLogowanie();
  }
  $('g-wyloguj').onclick = () => {
    if (dziala()) { dymek('Najpierw zakończ pilnowanie przyciskiem STOP.', 3000); return; }
    pytaj(`Wylogować z profilu „${nazwa(profil)}”?`, wyloguj);
  };

  // ---------- chowający się: tylko mapa, swój znacznik, pozostały czas i wylogowanie ----------
  function ustawTrybChowajacego(tak) {
    if (chowa === tak) return;
    chowa = tak;
    document.body.classList.toggle('chowa', tak);
    if (!tak) return;
    zamknijPanel();
    zamknijPanelGry();
    if (edycja.wl) koniecEdycji(false);
    if (mapa.hasLayer(doGranicy)) doGranicy.remove();
    sledz = true;
  }
  // chowający się nie ma przycisku STOP — wylogowanie od razu kończy jego udział w grze
  $('ch-wyloguj').onclick = () => pytaj('Wylogować? Zakończy to Twój udział w grze na tym telefonie.', () => {
    if (dziala()) stop();
    wyloguj();
  });

  // ---------- krótkofalówka (szukający i mistrz gry) ----------
  const radio = { nadaje: false, od: 0, mowia: [] };
  function pokazRadio(s) {
    const r = s.radio || {};
    radio.mowia = (r.mowi || []).filter((n) => n !== profil);
    const moze = !!(A && s.dziala && gra && gra.polaczony && (gra.rola === 'szuka' || profil === MISTRZ));
    $('b-radio').hidden = !moze;
    if (!moze) puscRadio();
    else if (radio.nadaje && r.nadaje === false && Date.now() - radio.od > 2500) {
      puscRadio();                                       // usługa skończyła sama (najwyżej 60 s naraz)
      dymek('Koniec nadawania — puść i wciśnij MÓW jeszcze raz.', 3000);
    }
    const t = radio.mowia.length ? `📻 ${radio.mowia.map((n) => nazwa(n)).join(', ')} ${radio.mowia.length > 1 ? 'mówią' : 'mówi'}…` : '';
    $('s-radio').textContent = t;
    $('s-radio').hidden = !t;
  }
  function wcisnijRadio(e) {
    e.preventDefault();
    if (radio.nadaje || !A) return;
    try { $('b-radio').setPointerCapture(e.pointerId); } catch (x) { /* bez przechwycenia palca */ }
    const w = A.mowStart();
    if (w === 'ok') {
      radio.nadaje = true;
      radio.od = Date.now();
      $('b-radio').classList.add('nadaje');
      $('b-radio-tekst').textContent = 'NADAJESZ';
      if (navigator.vibrate) navigator.vibrate(40);
      return;
    }
    dymek({
      zgoda: 'Zezwól aplikacji na mikrofon — potem przytrzymaj MÓW jeszcze raz.',
      start: 'Brak połączenia z grą — sprawdź internet albo naciśnij START.',
      rola: 'Krótkofalówka jest tylko dla szukających i mistrza gry.',
      mikrofon: 'Nie mogę włączyć mikrofonu — może używa go inna aplikacja.',
    }[w] || 'Krótkofalówka nie działa.', 4000);
  }
  function puscRadio() {
    if (!radio.nadaje) return;
    radio.nadaje = false;
    if (A) A.mowStop();
    $('b-radio').classList.remove('nadaje');
    $('b-radio-tekst').textContent = 'MÓW';
  }
  $('b-radio').addEventListener('pointerdown', wcisnijRadio);
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) $('b-radio').addEventListener(t, puscRadio);
  $('b-radio').addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('visibilitychange', () => { if (document.hidden) puscRadio(); });

  // ---------- dymki i pytania ----------
  let dymekCzas = null;
  function dymek(tekst, ms = 4000) {
    const d = $('dymek');
    d.textContent = tekst;
    d.hidden = false;
    clearTimeout(dymekCzas);
    dymekCzas = setTimeout(() => { d.hidden = true; }, ms);
  }
  $('dymek').onclick = () => { $('dymek').hidden = true; };
  function pytaj(tekst, tak) {
    $('p-tresc').textContent = tekst;
    $('pytanie').hidden = false;
    $('p-tak').onclick = () => { $('pytanie').hidden = true; tak(); };
    $('p-nie').onclick = () => { $('pytanie').hidden = true; };
  }

  // ---------- start ----------
  if (A) {
    let s = null;
    try { s = JSON.parse(A.stan() || 'null'); } catch (e) { s = null; }
    pokaz(s || { dziala: false });
  } else {
    pokaz({ dziala: false });
  }
  if (!profil) pokazLogowanie();
  window.addEventListener('resize', () => mapa.invalidateSize());
})();
