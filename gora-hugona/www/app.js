/* Góra Hugona — mapa obszaru, znacznik użytkownika i alarm po wyjściu za granicę.
 *
 * W przeglądarce pozycję daje navigator.geolocation, a alarm gra Web Audio — działa tylko przy włączonym ekranie.
 * W aplikacji na Androida (obiekt HugonAndroid) pozycją i alarmem zajmuje się usługa Straz.java, także w tle;
 * strona dostaje od niej stan przez hugonStan(…) i tylko go pokazuje. Reguły alarmu są w obu miejscach te same
 * (DOKLADNOSC, POZA_RAZY, CISZA_GPS, strefa ostrzeżenia z 5 m zapasu) — zmieniając je, zmień też Straz.java.
 */
'use strict';
(() => {
  const A = window.HugonAndroid || null;
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
  const ustawieniaNatywne = () => JSON.stringify({ strefa: ust.strefa, wibracje: ust.wibracje, ostrzegaj: ust.strefa > 0 });

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
  mapa.on('dragstart', () => { sledz = false; $('b-ja').classList.remove('wl'); });

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
    if (!navigator.geolocation) { dymek('Ta przeglądarka nie podaje położenia. Użyj aplikacji na Androida.'); return; }
    dzwiek.odblokuj();
    Object.assign(p, { dziala: true, poz: null, wewnatrz: true, odl: -1, pozaRazy: 0, alarm: false, blisko: false, wyciszonyDo: 0, ostatniPomiar: Date.now(), gpsWylaczony: false });
    p.obserwator = navigator.geolocation.watchPosition(naPozycje, naBlad, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
    p.tik = setInterval(tik, 1000);
    trzymajEkran();
    nadaj();
    if (!czytaj('powiedzianoOEkranie', false)) {
      pisz('powiedzianoOEkranie', true);
      dymek('W przeglądarce pilnowanie działa tylko przy włączonym ekranie i otwartej stronie. Żeby alarm działał z telefonem w kieszeni, użyj aplikacji na Androida.', 7000);
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
    const maPoz = s.lat != null && s.odl != null && s.odl >= 0;
    const o = maPoz ? ocenPunkt(s.lat, s.lon) : null;
    let rodzaj, tytul, opis;
    if (!s.dziala) {
      rodzaj = 'spoczynek'; tytul = 'Góra Hugona'; opis = 'Naciśnij START, żeby pilnować granicy.';
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
      if (!s.wewnatrz) {
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
  }

  // stan z aplikacji na Androida
  window.hugonStan = (s) => pokaz(s);
  window.hugonBlad = (kod) => {
    const t = {
      'brak-zgody': 'Bez zgody na lokalizację aplikacja nie wie, gdzie jesteś. Zezwól w: Ustawienia → Aplikacje → Góra Hugona → Uprawnienia → Lokalizacja.',
      przyblizona: 'Wybrano przybliżoną lokalizację — do pilnowania granicy potrzebna jest dokładna. Zezwól na „Dokładną lokalizację” i naciśnij START jeszcze raz.',
      usluga: 'Nie udało się uruchomić pilnowania. Spróbuj jeszcze raz.',
    }[kod];
    dymek(t || 'Coś poszło nie tak.', 8000);
  };
  window.hugonWstecz = () => {
    if (!$('pytanie').hidden) { $('pytanie').hidden = true; return true; }
    if (!$('panel').hidden) { zamknijPanel(); return true; }
    if (edycja.wl) { koniecEdycji(false); return true; }
    return false;
  };

  // ---------- przyciski ----------
  $('b-start').onclick = () => {
    if (!dziala()) start();
    else pytaj('Zakończyć pilnowanie granicy?', stop);
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
    $('u-jak').textContent = A
      ? 'Po STARCIE aplikacja pilnuje granicy także przy zgaszonym ekranie i schowana — widać to po powiadomieniu. Za granicą wyje syrena (także w trybie cichym) i telefon wibruje, aż wrócisz albo wyciszysz alarm. Pojedyncze skoki GPS są odsiewane: alarm rusza po 2 pomiarach za granicą.'
      : 'Strona pilnuje granicy, dopóki jest otwarta i ekran świeci. Za granicą wyje syrena i telefon wibruje. Pojedyncze skoki GPS są odsiewane: alarm rusza po 2 pomiarach za granicą. Do pilnowania z telefonem w kieszeni użyj aplikacji na Androida.';
    if (A) {
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
  $('tlo').onclick = zamknijPanel;
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
  window.addEventListener('resize', () => mapa.invalidateSize());
})();
