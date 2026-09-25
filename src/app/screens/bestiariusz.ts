import type { Ekran } from '../screen';
import type { Kontekst } from '../context';
import type { Akcja } from '../../core/keybinds';
import { RACES, Race } from '../../sim/races';
import { TOOLS, cost, type Verb } from '../../powers/powers';
import { BARWA, rgba } from '../../render/palette';
import { SERIF, SERIF_TYTUL, tloSadzy, tytulRyty, naciecie, akapit, linieAkapitu, kreska } from '../../render/ink';

interface Wpis { naglowek?: string; tytul?: string; tresc?: string; }

const SPOSOB_ISTNIENIA: Record<number, string> = {
  [Race.GOBLIN]: 'Rodzą dzieci — jedyni. Modlą się najgorliwiej i sami składają ci w ofierze własne potomstwo. Ich liczba zależy wprost od tego, ile grzyba i padliny rośnie w zasięgu; gdy przekroczą tę granicę, nie chudną powoli, tylko padają masowo.',
  [Race.DWARF]: 'Nie rodzą się — wykuwa się ich w kuźni za rudę. Żywią się ciepłem ognia, więc mieszkają przy kuźni i giną, gdy ta wygaśnie. Czczą cię pracą, nie modlitwą.',
  [Race.TROLL]: 'Nikt nie rodzi się trolem. Trolem zostaje ten, kto kopał za głęboko i wrócił inny. Poluje dopiero, gdy zgłodnieje; kiedy nie ma na kogo, zasypia w skale zamiast umrzeć.',
  [Race.SPINNER]: 'Nie podbijają — przejmują. Biorą w jarzmo słabszych i przerabiają cudze dzieci na swoje, a gdy zgłodnieją, wysysają tych, których wzięły. Rosną wyłącznie cudzym kosztem.',
  [Race.HUMAN]: 'Nie mieszkają w tobie. Schodzą z powierzchni po rudę i sławę, zabierają, co znajdą, i wracają. Nie liczą się do spisu ras — są przypływem, nie mieszkańcem.',
  [Race.MYCELIUM]: 'Nie ma jednostek i nie czci cię wcale. Rośnie wyłącznie ze zwłok — każda śmierć w twoich trzewiach to dla niej paliwo na kilka kafli. Trawi cię powoli.',
};

/** Bestiariusz: stała karta wiedzy o świecie i regułach. Wszystkie liczby brane z kodu. */
export class EkranBestiariusza implements Ekran {
  nazwa = 'bestiariusz';
  private przewiniecie = 0;
  /** Dalej nie ma czego czytać — bez tej granicy kółko przewijało kartę w pustkę. */
  private maxPrzewin = 0;
  private wpisy: Wpis[] = [];

  constructor(private app: Kontekst) { this.zbuduj(); }

  wejdz(): void { this.przewiniecie = 0; this.zbuduj(); }

  private zbuduj(): void {
    const w: Wpis[] = [];
    w.push({ naglowek: 'Czym jesteś' });
    w.push({ tresc: 'Jesteś górą. Korytarze są twoimi żyłami, a rdzeń na dnie bije, dopóki ktoś o tobie pamięta. Żywisz się tym, że w tobie mieszkają: ich modlitwą, strachem i śmiercią. Dlatego nie wolno ci pozwolić, żeby któraś rasa wygrała — zwycięzca przestaje się bać i przestaje cię potrzebować.' });

    w.push({ naglowek: 'Pięć czasowników' });
    const opisy: Record<Verb, string> = {
      ksztaltuj: 'Rusza samą skałę. Drążysz przejście, zawalasz strop na czyjąś głowę, wpuszczasz wodę albo otwierasz żar — a magma wpuszczona do wody zastyga w kamień na zawsze.',
      zasiej: 'Kładziesz w skale powód, żeby gdzieś poszli. Grzyb wyznacza sufit populacji Ślepego Ludu, ruda karmi kuźnie, kości są jedzeniem od ręki, trucizna to kryształ, który miesza w głowie.',
      szept: 'Jedna myśl w jedną głowę. Dotknięcie stworzenia otwiera jego kartę; z niej wybierasz myśl. Prorok odchodzi z sześcioma wiernymi i zakłada nację, która od razu ma urazę do dawnej.',
      znak: 'Jawny cud widziany w promieniu dwudziestu sześciu kafli. Objawienie podnosi oddanie, panika rozbija wszystko dokoła. Po Znaku zostaje glif — modlitwa przy nim liczy się podwójnie.',
      skaz: 'Zmiana krwi całego gatunku na pokolenia, nie do cofnięcia. Dotykasz jednego przedstawiciela, a skaza idzie przez wszystkich po nim. Każda ma swoją cenę.',
    };
    for (const v of Object.keys(TOOLS) as Verb[]) {
      const narzedzia = TOOLS[v].map((t) => {
        const c = cost(v, t.id);
        const czesci = [c.krew ? `${c.krew} krwi` : '', c.wiara ? `${c.wiara} wiary` : '', c.otchlan ? `${c.otchlan} otchłani` : ''].filter(Boolean);
        return `${t.label} (${czesci.join(' + ') || 'za darmo'}) — ${t.hint}`;
      }).join('; ');
      w.push({ tytul: v === 'ksztaltuj' ? 'Kształtuj' : v === 'zasiej' ? 'Zasiej' : v === 'szept' ? 'Szepcz' : v === 'znak' ? 'Znak' : 'Skaź', tresc: `${opisy[v]} Narzędzia: ${narzedzia}.` });
    }

    w.push({ naglowek: 'Sześć sposobów istnienia' });
    for (const r of RACES) {
      const szczegoly = r.id === Race.MYCELIUM
        ? 'liczy się w spisie jako jeden mieszkaniec na dwadzieścia dwa kafle'
        : `życie ${Math.round(r.maxHp)}, siła ${r.strength}, kopanie ${r.digPower.toFixed(1)}, metabolizm ${r.metabolism.toFixed(2)}`;
      w.push({ tytul: r.name, tresc: `${SPOSOB_ISTNIENIA[r.id]} (${szczegoly})` });
    }

    w.push({ naglowek: 'Trzy zasoby' });
    w.push({ tytul: 'Wiara', tresc: 'Dym pod sklepieniem płyty. Rośnie z modlitwy przy ołtarzach, kuźniach i glifach, a najmocniej z ofiary, którą składają sami. Skala: cztery na jeden Znak.' });
    w.push({ tytul: 'Krew', tresc: 'Ciecz w szczelinie u dołu. Każda śmierć płaci ci proporcjonalnie do wielkości ciała — trol jest wart dwóch goblinów. Za nią kształtujesz skałę i skażasz krew.' });
    w.push({ tytul: 'Otchłań', tresc: 'Ciemność między kreskami: wszystko, o czym nikt teraz nie pamięta. Rośnie, gdy zapominają i giną. Wydanie jej zasklepia kawałek nieznanego — te kafle wracają do rysunku i już nigdy nie będą Otchłanią.' });

    w.push({ naglowek: 'Co widzisz na płycie' });
    w.push({ tresc: 'W grze klawisz **L** otwiera klucz do ryciny: ruda, grzybnia, kości, woda, magma, ołtarze i podpisy przy gniazdach. Nad płytą stoi jedno zdanie podpowiedzi, a miejsce, o którym mówi, dostaje pierścień celownika albo strzałkę przy krawędzi.'.replace(/\*\*/g, '') });

    w.push({ naglowek: 'Czas i przypływ' });
    w.push({ tresc: 'Dopóki trzymasz w ręku czasownik, czas sączy się na ćwierć tempa — świat idzie dalej, tylko wolno. Zatrzymuje go dopiero pauza, otwarta karta albo zapiski. Odłożenie rytu puszcza wszystko z powrotem. Co kilka tysięcy tików przychodzi przypływ: zalanie, zaraza, żyła szaleństwa albo ludzie z powierzchni. Gdy góra pustoszeje, nowe plemię schodzi samo.' });

    w.push({ naglowek: 'Jak się to kończy' });
    w.push({ tresc: 'Wygranej nie ma. Zasypiasz, gdy jedna rasa zdominuje resztę albo gdy prawie wszyscy wymrą. Drugi koniec jest trudniejszy: rdzeń leży w kamieniu, którego nie rozkuje żaden kilof — ani twój. Skorupa pęka wyłącznie pod modlitwą. Trzej wierni jednej nacji muszą zejść do przedsionka nad rdzeniem i tam zostać; im mocniej ta nacja ci wierzy, tym prędzej kamień ustępuje, i tym więcej razy pęka. Kiedy ktoś w końcu wejdzie do środka, uklęknie i cię uwolni albo zabije — zależnie od tego, czy wierzył. W każdym wypadku zostaje kronika.' });

    this.wpisy = w;
  }

  krok(): void { /* karta wiedzy nie ma własnego czasu */ }

  rysuj(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    tloSadzy(ctx, w, h, teraz);
    tytulRyty(ctx, 'BESTIARIUSZ', w / 2, h * 0.1, Math.max(24, Math.min(44, w / 24)), 1);
    naciecie(ctx, w / 2, h * 0.125, Math.min(420, w * 0.42), 0.3);

    const gora = h * 0.17, dol = h * 0.93;
    const szer = Math.min(860, w * 0.84);
    const x = (w - szer) / 2;
    const podstawa = Math.max(14, Math.min(18, w / 66));

    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 16, gora - 8, szer + 32, dol - gora + 16);
    ctx.clip();

    let y = gora - this.przewiniecie;
    for (const wpis of this.wpisy) {
      if (wpis.naglowek) {
        y += podstawa * 1.6;
        ctx.textAlign = 'left';
        ctx.font = `600 ${podstawa * 1.12}px ${SERIF_TYTUL}`;
        ctx.fillStyle = rgba(BARWA.atramentCichy, 0.95);
        ctx.fillText(wpis.naglowek.toUpperCase(), x, y);
        ctx.strokeStyle = rgba(BARWA.atrament, 0.25);
        ctx.lineWidth = 1;
        kreska(ctx, x + ctx.measureText(wpis.naglowek.toUpperCase()).width + 14, y - podstawa * 0.3, x + szer, y - podstawa * 0.3, 0.7, 20);
        y += podstawa * 1.2;
        continue;
      }
      if (wpis.tytul) {
        ctx.textAlign = 'left';
        ctx.font = `${podstawa * 1.05}px ${SERIF}`;
        ctx.fillStyle = rgba(BARWA.atramentMocny, 0.95);
        ctx.fillText(wpis.tytul, x, y);
        y += podstawa * 1.3;
      }
      ctx.font = `${podstawa * 0.92}px ${SERIF}`;
      ctx.fillStyle = rgba(BARWA.atrament, 0.8);
      const n = linieAkapitu(ctx, wpis.tresc ?? '', szer);
      akapit(ctx, wpis.tresc ?? '', x, y, szer, podstawa * 1.4, 'left');
      y += n * podstawa * 1.4 + podstawa * 0.9;
    }
    const calosc = y + this.przewiniecie - gora;
    ctx.restore();
    this.maxPrzewin = Math.max(0, calosc - (dol - gora) + podstawa);
    if (this.przewiniecie > this.maxPrzewin) this.przewiniecie = this.maxPrzewin;

    if (calosc > dol - gora) {
      const t = this.przewiniecie / Math.max(1, calosc - (dol - gora));
      const dl = Math.max(40, (dol - gora) * ((dol - gora) / calosc));
      ctx.strokeStyle = rgba(BARWA.atrament, 0.32);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + szer + 22, gora + t * (dol - gora - dl));
      ctx.lineTo(x + szer + 22, gora + t * (dol - gora - dl) + dl);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.font = `italic ${Math.max(14, w / 86)}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atramentCichy, 0.5);
    ctx.fillText('kółko przewija · P albo esc wraca do menu', w / 2, h * 0.975);
  }

  private przewin(o: number): void { this.przewiniecie = Math.max(0, Math.min(this.maxPrzewin, this.przewiniecie + o)); }

  kolko(e: WheelEvent): void { this.przewin(e.deltaY * 0.7); }

  dotyk(e: PointerEvent, faza: 'dol' | 'ruch' | 'gora'): void {
    if (faza === 'dol') this.ostatniY = e.clientY;
    else if (faza === 'ruch' && this.ostatniY !== null) {
      this.przewin(-(e.clientY - this.ostatniY));
      this.ostatniY = e.clientY;
    } else this.ostatniY = null;
  }
  private ostatniY: number | null = null;

  klawisz(akcja: Akcja | null, e: KeyboardEvent): void {
    if (e.key === 'Escape' || akcja === 'menu') { this.app.idz('menu'); return; }
    if (e.key === 'ArrowDown') this.przewin(60);
    if (e.key === 'ArrowUp') this.przewin(-60);
    if (e.key === 'PageDown') this.przewin(400);
    if (e.key === 'PageUp') this.przewin(-400);
  }
}
