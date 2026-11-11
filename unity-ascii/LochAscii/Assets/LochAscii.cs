// LOCH ASCII — mała gra „3D” widziana z trzeciej osoby, narysowana w całości znakami ASCII.
//
// Uruchomienie: wrzuć ten plik do folderu Assets dowolnego projektu Unity i wciśnij Play.
// Niczego nie trzeba podpinać — gra sama tworzy swój obiekt (i kamerę, gdy w scenie jej nie ma).
//
// Cel: zbierz 3 kryształy, potem wyjdź bramą. Duchy przenikają przez ściany — nie daj się dotknąć.
// Błysk pochodni odpędza duchy, które są blisko. Trzy poziomy trudności: łatwy, normalny, trudny.
// Sterowanie: W/S albo strzałki góra/dół — chód, A/D albo strzałki lewo/prawo — obrót, Q/E — krok w bok,
//             spacja — błysk pochodni, 1/2/3 — poziom trudności i start, Enter — start, R — nowy loch,
//             Esc — ekran tytułowy.
//
// Obraz to siatka 106x45 znaków. Czcionka 5x7 jest zapisana niżej, w tym pliku, więc gra wygląda tak samo
// na każdym komputerze i nie potrzebuje żadnych innych plików.
#if ENABLE_INPUT_SYSTEM && !ENABLE_LEGACY_INPUT_MANAGER
#define NOWE_WEJSCIE
#endif
using UnityEngine;
#if NOWE_WEJSCIE
using UnityEngine.InputSystem;
#endif

public class LochAscii : MonoBehaviour
{
    // ---------- nastawy ----------
    const int SZ = 106, WY = 45;             // ekran w znakach: kolumny i wiersze
    const int ZX = 6, ZY = 8;                // komórka znaku w pikselach (glif 5x7 i odstęp)
    const int PX = 640, PY = 360, MARG = 2;  // obraz w pikselach przy skali 1 i lewy margines
    const int WID = 80;                      // szerokość widoku 3D w znakach; na prawo od niego jest panel
    const int MW = 21, MH = 15;              // loch w kaflach (wymiary nieparzyste)
    const float POLE = 0.66f;                // tangens połowy kąta widzenia
    const float SKALA = WID * ZX / (2f * POLE * ZY);   // ile wierszy ma ściana (wysoka na kafel) widziana z 1 kafla
    const float HOR = 17f;                   // wiersz horyzontu — kamera patrzy lekko w dół
    const float KAM_WYS = 0.58f, KAM_TYL = 1.1f;       // kamera: wysokość nad podłogą i odległość za plecami postaci
    const int POSTAC_X = 34, POSTAC_Y = 28;  // lewy górny róg rysunku postaci (stopy wypadają 1,1 kafla od kamery)
    const int KRYSZTALY = 3, DUCHY = 3, ZYCIA = 3, RZECZY = KRYSZTALY + DUCHY;   // DUCHY — najwięcej naraz
    const float CHOD = 2.4f, OBROT = 2.2f;   // kafle i radiany na sekundę
    const int TYTUL = 0, GRA = 1, WYGRANA = 2, PRZEGRANA = 3;

    // barwy 0xRRGGBB
    const int B_MUR = 0xD8BC94, B_PODLOGA = 0x7890B0, B_KRYSZTAL = 0x66E0FF, B_DUCH = 0xFF5A5A, B_ZLOTO = 0xFFC84A,
              B_TEKST = 0xD0D0D0, B_SZARY = 0x787878, B_RAMKA = 0x9A8050, B_ZIELEN = 0x6CF08C, B_PLASZCZ = 0x58C8A0,
              B_SKORA = 0xB8875A, B_OGIEN = 0xFFB030;

    // Czcionka: 95 znaków ASCII (32..126) po 7 wierszy; wiersz to 5 bitów zapisanych jako znak '0' + bity.
    const string CZCIONKA =
        "00000004444404::00000::O:O::4?D>5N4HI248C3<BD8EB=44800002488842842224804E>E40044O4400000<48000O" +
        "00000000<<01248@0>ACEIA>4<4444>>A1248OO2421A>26:BO22O@N11A>68@NAA>O124888>AA>AA>>AA?12<0<<0<<00" +
        "<<0<48248@84200O0O008421248>A12404>A1=EE>>AAAOAANAANAAN>A@@@A>LBAAABLO@@N@@OO@@N@@@>A@GAA?AAAOA" +
        "AA>44444>72222B<ABDHDBA@@@@@@OAKEEAAAAAIECAA>AAAAA>NAAN@@@>AAAEB=NAANDBA?@@>11NO444444AAAAAA>AA" +
        "AAA:4AAAEEE:AA:4:AAAAA:444O1248@O>88888>0@84210>22222>4:A0000000000O842000000>1?A?@@FIAAN00>@@A" +
        ">11=CAA?00>AO@>698L8880?AA?1>@@FIAAA40<444>20622B<@@BDHDB<44444>00JEEAA00FIAAA00>AAA>0NAAN@@0?A" +
        "A?1100FI@@@00>@>1N88L889600AAAC=00AAA:400AAEE:00A:4:A0AAA?1>00O248O244844244444448442448008E200";

    // Postać widziana od tyłu: kaptur, płaszcz i pochodnia w prawej ręce. Nogi mają trzy układy (stoi, dwa kroki).
    static readonly string[] POSTAC = {
        @"    ___       , ",
        @"   /###\     (#)",
        @"  |#####|     | ",
        @"  |#####|     | ",
        @"   \###/     /  ",
        @"  /#####\___/   ",
        @" /#######\      ",
        @" |#######|      ",
        @" |#######|      ",
        @" |#######|      ",
        @" \#######/      ",
    };
    static readonly string[] NOGI = {
        @"   || ||", @"   db db",
        @"   |/ ||", @"   '  db",
        @"   || \|", @"   db  '",
    };

    // Poziomy trudności (łatwy, normalny, trudny): ile duchów, ile błysków pochodni, jak szybko duch leci
    // (kafle na sekundę) i z ilu kafli wyczuwa postać.
    static readonly string[] P_NAZWA = { "LATWY", "NORMALNY", "TRUDNY" };
    static readonly int[] P_DUCHY = { 1, 2, 3 }, P_FLARY = { 4, 3, 2 };
    static readonly float[] P_PED = { 0.7f, 0.85f, 1.05f }, P_WECH = { 4f, 5f, 6.5f };

    static readonly int[] DX = { 1, 0, -1, 0 }, DY = { 0, 1, 0, -1 };
    static readonly Color32 CZERN = new Color32(0, 0, 0, 255);
    static LochAscii zywa;

    // ---------- stan ----------
    readonly int[] ekran = new int[SZ * WY], poprz = new int[SZ * WY];   // komórka: znak | barwa << 8
    Color32[] piksele;
    Texture2D obraz;
    int powiekszenie;

    readonly byte[] mapa = new byte[MW * MH];        // 0 — przejście, 1 — mur, 2 — brama
    readonly bool[] znane = new bool[MW * MH];       // co postać już widziała (do mapy na panelu)
    readonly int[] odl = new int[MW * MH], kolejka = new int[MW * MH];
    readonly float[] glebia = new float[WID], trafW = new float[WID];
    readonly int[] trafKafel = new int[WID], trafBok = new int[WID];

    readonly float[] rzX = new float[RZECZY], rzY = new float[RZECZY], rzGl = new float[RZECZY];   // kryształy, potem duchy
    readonly float[] rzCelX = new float[RZECZY], rzCelY = new float[RZECZY], rzStrach = new float[RZECZY];   // tylko duchy
    readonly bool[] rzJest = new bool[RZECZY], rzGoni = new bool[RZECZY];
    readonly int[] kolej = new int[RZECZY];

    float gx, gy, kat;                         // postać: miejsce i kierunek
    float kamX, kamY, kamTyl, patrzX, patrzY;  // kamera za plecami postaci
    int stan, poziom = 1, zycia, zebrane, flary, brama;
    float czas, zegar, nietykalny, blysk, flara, krok, komCzas;   // blysk — czerwień po ciosie, flara — błysk pochodni
    readonly float[] rekord = new float[3];    // najlepszy czas na każdym poziomie
    bool idzie;
    string kom = "";
    uint ziarno;
    AudioSource glos;
    AudioClip dzwKrysztal, dzwCios, dzwBrama, dzwWygrana, dzwKoniec, dzwFlara, dzwDuch;

    // ---------- start ----------
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Autostart()
    {
        if (zywa == null) new GameObject("LochAscii").AddComponent<LochAscii>();
    }

    void Awake()
    {
        if (zywa != null && zywa != this) { enabled = false; Destroy(this); return; }
        zywa = this;
        useGUILayout = false;
        glos = gameObject.AddComponent<AudioSource>();
        glos.playOnAwake = false;
        dzwKrysztal = Ton(660f, 1320f, 0.16f);
        dzwCios = Ton(200f, 60f, 0.35f);
        dzwBrama = Ton(330f, 990f, 0.5f);
        dzwWygrana = Ton(440f, 1760f, 0.8f);
        dzwKoniec = Ton(260f, 40f, 1f);
        dzwFlara = Ton(1400f, 300f, 0.3f);
        dzwDuch = Ton(110f, 150f, 0.5f);
        ziarno = (uint)System.DateTime.Now.Ticks | 1u;
        NowyLoch();
    }

    void Start()
    {
        if (Camera.allCamerasCount > 0) return;   // w scenie bez kamery Unity pisze po ekranie „No cameras rendering”
        Camera kam = new GameObject("Kamera (LochAscii)").AddComponent<Camera>();
        kam.clearFlags = CameraClearFlags.SolidColor;
        kam.backgroundColor = Color.black;
        kam.cullingMask = 0;
        kam.gameObject.AddComponent<AudioListener>();
    }

    void OnDestroy()
    {
        if (zywa == this) zywa = null;
        if (obraz != null) Destroy(obraz);
    }

    // Krótki pisk o zmiennej wysokości (fala prostokątna) — wszystkie dźwięki gry.
    static AudioClip Ton(float f0, float f1, float sekundy)
    {
        const int PROBKI = 22050;
        int n = (int)(PROBKI * sekundy);
        float[] p = new float[n];
        float faza = 0f;
        for (int i = 0; i < n; i++)
        {
            float a = (float)i / n;
            faza += (f0 + (f1 - f0) * a) / PROBKI;
            p[i] = (faza - Mathf.Floor(faza) < 0.5f ? 0.1f : -0.1f) * (1f - a);
        }
        AudioClip klip = AudioClip.Create("ton", n, 1, PROBKI, false);
        klip.SetData(p, 0);
        return klip;
    }

    // ---------- klatka ----------
    void Update()
    {
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        zegar += dt;
        float naprzod, obrot, bok;
        bool start, spacja, nowy, wyjscie;
        int wybor;
        Wejscie(out naprzod, out obrot, out bok, out start, out spacja, out nowy, out wyjscie, out wybor);
        idzie = false;
        if (stan == GRA)
        {
            Graj(dt, naprzod, obrot, bok, spacja);
            if (nowy) NowyLoch();
            if (wyjscie) { NowyLoch(); stan = TYTUL; }
        }
        else
        {
            if (stan == TYTUL) kat += dt * 0.3f;   // na ekranie tytułowym kamera krąży wokół postaci
            if (wybor >= 0) poziom = wybor;   // 1, 2, 3 — wybór poziomu i od razu start
            if (start || spacja || wybor >= 0) { NowyLoch(); stan = GRA; }
            else if (wyjscie && stan != TYTUL) { NowyLoch(); stan = TYTUL; }
        }
        if (komCzas > 0f) komCzas -= dt;
        if (blysk > 0f) blysk -= dt;
        if (flara > 0f) flara -= dt * 1.2f;
        Kamera(dt);
        Rysuj();
        Wyswietl();
    }

    void Wejscie(out float naprzod, out float obrot, out float bok, out bool start, out bool spacja, out bool nowy, out bool wyjscie, out int wybor)
    {
        naprzod = 0f; obrot = 0f; bok = 0f; start = false; spacja = false; nowy = false; wyjscie = false; wybor = -1;
#if NOWE_WEJSCIE
        Keyboard k = Keyboard.current;
        if (k == null) return;
        if (k.wKey.isPressed || k.upArrowKey.isPressed) naprzod += 1f;
        if (k.sKey.isPressed || k.downArrowKey.isPressed) naprzod -= 1f;
        if (k.dKey.isPressed || k.rightArrowKey.isPressed) obrot += 1f;
        if (k.aKey.isPressed || k.leftArrowKey.isPressed) obrot -= 1f;
        if (k.eKey.isPressed) bok += 1f;
        if (k.qKey.isPressed) bok -= 1f;
        start = k.enterKey.wasPressedThisFrame || k.numpadEnterKey.wasPressedThisFrame;
        spacja = k.spaceKey.wasPressedThisFrame;
        nowy = k.rKey.wasPressedThisFrame;
        wyjscie = k.escapeKey.wasPressedThisFrame;
        if (k.digit1Key.wasPressedThisFrame || k.numpad1Key.wasPressedThisFrame) wybor = 0;
        if (k.digit2Key.wasPressedThisFrame || k.numpad2Key.wasPressedThisFrame) wybor = 1;
        if (k.digit3Key.wasPressedThisFrame || k.numpad3Key.wasPressedThisFrame) wybor = 2;
#else
        if (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow)) naprzod += 1f;
        if (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow)) naprzod -= 1f;
        if (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow)) obrot += 1f;
        if (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow)) obrot -= 1f;
        if (Input.GetKey(KeyCode.E)) bok += 1f;
        if (Input.GetKey(KeyCode.Q)) bok -= 1f;
        start = Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.KeypadEnter);
        spacja = Input.GetKeyDown(KeyCode.Space);
        nowy = Input.GetKeyDown(KeyCode.R);
        wyjscie = Input.GetKeyDown(KeyCode.Escape);
        if (Input.GetKeyDown(KeyCode.Alpha1) || Input.GetKeyDown(KeyCode.Keypad1)) wybor = 0;
        if (Input.GetKeyDown(KeyCode.Alpha2) || Input.GetKeyDown(KeyCode.Keypad2)) wybor = 1;
        if (Input.GetKeyDown(KeyCode.Alpha3) || Input.GetKeyDown(KeyCode.Keypad3)) wybor = 2;
#endif
    }

    // ---------- zasady ----------
    void Graj(float dt, float naprzod, float obrot, float bok, bool spacja)
    {
        czas += dt;
        nietykalny -= dt;
        kat += obrot * OBROT * dt;
        float c = Mathf.Cos(kat), s = Mathf.Sin(kat);
        if (naprzod != 0f && bok != 0f) { naprzod *= 0.7071f; bok *= 0.7071f; }
        float vx = (c * naprzod - s * bok) * CHOD * dt, vy = (s * naprzod + c * bok) * CHOD * dt;
        float x0 = gx, y0 = gy;
        if (Wolne(gx + vx, gy, 0.22f)) gx += vx;   // osobno w każdej osi — postać ślizga się wzdłuż muru
        if (Wolne(gx, gy + vy, 0.22f)) gy += vy;
        float przeszla = Mathf.Sqrt(Kw(gx - x0) + Kw(gy - y0));
        idzie = przeszla > 0.0001f;
        krok += przeszla;

        for (int i = 0; i < KRYSZTALY; i++)
        {
            if (!rzJest[i] || Kw(rzX[i] - gx) + Kw(rzY[i] - gy) > 0.2f) continue;
            rzJest[i] = false;
            zebrane++;
            if (zebrane == KRYSZTALY) { Powiedz("BRAMA OTWARTA! SZUKAJ WYJSCIA (E)"); glos.PlayOneShot(dzwBrama); }
            else { Powiedz("KRYSZTAL! JESZCZE " + (KRYSZTALY - zebrane)); glos.PlayOneShot(dzwKrysztal); }
        }

        // błysk pochodni: duchy w pobliżu uciekają i przez chwilę nie mogą dotknąć postaci
        if (spacja && flary > 0)
        {
            flary--;
            flara = 1f;
            for (int i = KRYSZTALY; i < RZECZY; i++)
                if (Kw(rzX[i] - gx) + Kw(rzY[i] - gy) < Kw(P_WECH[poziom] + 1f)) rzStrach[i] = 4f;
            glos.PlayOneShot(dzwFlara);
        }

        // duchy przenikają przez ściany: błąkają się po lochu, a gdy wyczują postać — lecą prosto na nią
        for (int i = KRYSZTALY; i < RZECZY; i++)
        {
            if (!rzJest[i]) continue;
            float dx = gx - rzX[i], dy = gy - rzY[i], d = Mathf.Sqrt(dx * dx + dy * dy), ped;
            rzStrach[i] -= dt;
            if (d > P_WECH[poziom] + 1f) rzGoni[i] = false;
            if (rzStrach[i] > 0f) { dx = -dx; dy = -dy; ped = 2.4f; }
            else if (d < P_WECH[poziom] || rzGoni[i])
            {
                ped = P_PED[poziom] + 0.15f * zebrane;   // każdy kryształ je przyspiesza
                if (!rzGoni[i]) { rzGoni[i] = true; Powiedz("DUCH CIE WYCZUL!"); glos.PlayOneShot(dzwDuch); }
            }
            else
            {
                dx = rzCelX[i] - rzX[i]; dy = rzCelY[i] - rzY[i]; ped = 0.6f;
                if (dx * dx + dy * dy < 0.3f) { rzCelX[i] = 1.5f + Los(MW - 2); rzCelY[i] = 1.5f + Los(MH - 2); }
            }
            float e = Mathf.Sqrt(dx * dx + dy * dy);
            if (e > 0.01f)
            {
                rzX[i] = Mathf.Clamp(rzX[i] + dx / e * ped * dt, 0.5f, MW - 0.5f);
                rzY[i] = Mathf.Clamp(rzY[i] + dy / e * ped * dt, 0.5f, MH - 0.5f);
            }
            if (d > 0.45f || nietykalny > 0f || rzStrach[i] > 0f) continue;
            zycia--;
            nietykalny = 2f;
            blysk = 0.45f;
            Daleko(i);
            if (zycia > 0) { Powiedz("DUCH CIE DOTKNAL!"); glos.PlayOneShot(dzwCios); }
            else { stan = PRZEGRANA; blysk = 9999f; glos.PlayOneShot(dzwKoniec); }
        }

        if (stan == GRA && Mathf.Abs(gx - (brama % MW + 0.5f)) < 0.95f && Mathf.Abs(gy - (brama / MW + 0.5f)) < 0.95f)
        {
            if (zebrane < KRYSZTALY) Powiedz("BRAMA ZAMKNIETA - BRAKUJE KRYSZTALOW: " + (KRYSZTALY - zebrane));
            else
            {
                stan = WYGRANA;
                if (rekord[poziom] <= 0f || czas < rekord[poziom]) rekord[poziom] = czas;
                glos.PlayOneShot(dzwWygrana);
            }
        }
    }

    // Czy kwadrat o połowie boku r, ze środkiem w (x, y), mieści się w przejściu.
    bool Wolne(float x, float y, float r)
    {
        return mapa[(int)(y - r) * MW + (int)(x - r)] == 0 && mapa[(int)(y - r) * MW + (int)(x + r)] == 0
            && mapa[(int)(y + r) * MW + (int)(x - r)] == 0 && mapa[(int)(y + r) * MW + (int)(x + r)] == 0;
    }

    void Powiedz(string tekst) { kom = tekst; komCzas = 2.5f; }

    static float Kw(float a) { return a * a; }

    int Los(int n)
    {
        ziarno ^= ziarno << 13; ziarno ^= ziarno >> 17; ziarno ^= ziarno << 5;
        return (int)(ziarno % (uint)n);
    }

    // Przenosi rzecz na losowy kafel daleko od postaci (start ducha i jego odwrót po dotknięciu).
    void Daleko(int i)
    {
        for (int proba = 0; proba < 200; proba++)
        {
            int x = 1 + 2 * Los(MW / 2), y = 1 + 2 * Los(MH / 2);
            if (Kw(x + 0.5f - gx) + Kw(y + 0.5f - gy) < (proba < 150 ? 64f : 9f)) continue;
            rzX[i] = rzCelX[i] = x + 0.5f; rzY[i] = rzCelY[i] = y + 0.5f;
            rzGoni[i] = false; rzStrach[i] = 0f;
            return;
        }
    }

    // ---------- loch ----------
    void NowyLoch()
    {
        for (int i = 0; i < mapa.Length; i++) { mapa[i] = 1; znane[i] = false; }

        // labirynt: wędrówka z nawrotami po kaflach o nieparzystych współrzędnych
        int n = 0;
        kolejka[n++] = MW + 1;
        mapa[MW + 1] = 0;
        while (n > 0)
        {
            int k = kolejka[n - 1], x = k % MW, y = k / MW, od = Los(4), i = 0;
            for (; i < 4; i++)
            {
                int d = (od + i) & 3, nx = x + 2 * DX[d], ny = y + 2 * DY[d];
                if (nx < 1 || ny < 1 || nx > MW - 2 || ny > MH - 2 || mapa[ny * MW + nx] == 0) continue;
                mapa[k + DX[d] + MW * DY[d]] = 0;
                mapa[ny * MW + nx] = 0;
                kolejka[n++] = ny * MW + nx;
                break;
            }
            if (i == 4) n--;
        }
        // trochę dodatkowych przejść, żeby korytarze się zapętlały, i trzy sale (w środkowej stoi postać)
        for (int y = 1; y < MH - 1; y++)
            for (int x = 1; x < MW - 1; x++)
                if (((x ^ y) & 1) == 1 && Los(100) < 14) mapa[y * MW + x] = 0;
        int sx = MW / 2 | 1, sy = MH / 2 | 1;
        Sala(sx, sy, 2);
        Sala(1 + 2 * Los(MW / 2), 1 + 2 * Los(MH / 2), 1);
        Sala(1 + 2 * Los(MW / 2), 1 + 2 * Los(MH / 2), 1);
        gx = sx + 0.5f; gy = sy + 0.5f; kat = 0f;

        // odległości od startu (w krokach po kaflach)
        for (int i = 0; i < odl.Length; i++) odl[i] = -1;
        int glowa = 0, ogon = 0;
        kolejka[ogon++] = sy * MW + sx;
        odl[sy * MW + sx] = 0;
        while (glowa < ogon)
        {
            int k = kolejka[glowa++];
            for (int d = 0; d < 4; d++)
            {
                int s = k + DX[d] + MW * DY[d];
                if (mapa[s] != 0 || odl[s] >= 0) continue;
                odl[s] = odl[k] + 1;
                kolejka[ogon++] = s;
            }
        }

        // brama: w zewnętrznym murze, przy kaflu najdalszym od startu
        int najdalej = -1, bx = 0, by = 0;
        for (int y = 1; y < MH - 1; y += 2)
            for (int x = 1; x < MW - 1; x += 2)
            {
                if (odl[y * MW + x] <= najdalej) continue;
                int px = x == 1 ? 0 : x == MW - 2 ? MW - 1 : x, py = px != x ? y : y == 1 ? 0 : y == MH - 2 ? MH - 1 : y;
                if (px == x && py == y) continue;   // kafel nie leży przy zewnętrznym murze
                najdalej = odl[y * MW + x]; bx = px; by = py;
            }
        brama = by * MW + bx;
        mapa[brama] = 2;

        // kryształy: daleko od startu, od bramy i od siebie nawzajem
        for (int i = 0; i < KRYSZTALY; i++)
        {
            int najlepsza = -1;
            for (int y = 1; y < MH - 1; y += 2)
                for (int x = 1; x < MW - 1; x += 2)
                {
                    int ocena = Mathf.Min(odl[y * MW + x], 2 * (Mathf.Abs(x - bx) + Mathf.Abs(y - by)));
                    for (int j = 0; j < i; j++)
                        ocena = Mathf.Min(ocena, 2 * (Mathf.Abs(x - (int)rzX[j]) + Mathf.Abs(y - (int)rzY[j])));
                    ocena = ocena * 4 + Los(4);
                    if (ocena <= najlepsza) continue;
                    najlepsza = ocena; rzX[i] = x + 0.5f; rzY[i] = y + 0.5f;
                }
            rzJest[i] = true;
        }
        for (int i = KRYSZTALY; i < RZECZY; i++)
        {
            rzJest[i] = i < KRYSZTALY + P_DUCHY[poziom];
            if (rzJest[i]) Daleko(i);
        }

        zycia = ZYCIA; flary = P_FLARY[poziom]; zebrane = 0; czas = 0f; nietykalny = 0f; blysk = 0f; flara = 0f; krok = 0f; komCzas = 0f; kamTyl = 0f;
    }

    void Sala(int cx, int cy, int r)
    {
        for (int y = cy - r; y <= cy + r; y++)
            for (int x = cx - r; x <= cx + r; x++)
                if (x > 0 && y > 0 && x < MW - 1 && y < MH - 1) mapa[y * MW + x] = 0;
    }

    // ---------- kamera ----------
    // Kamera stoi za plecami postaci i patrzy tam, gdzie ona. Gdy za plecami jest mur, podjeżdża bliżej.
    void Kamera(float dt)
    {
        patrzX = Mathf.Cos(kat); patrzY = Mathf.Sin(kat);
        float t = 0f;
        while (t < KAM_TYL && Wolne(gx - patrzX * (t + 0.05f), gy - patrzY * (t + 0.05f), 0.13f)) t += 0.05f;
        kamTyl = Mathf.Min(t, kamTyl + dt * 3f);   // odjeżdża płynnie, dosuwa się od razu (żeby nie wejść w mur)
        kamX = gx - patrzX * kamTyl; kamY = gy - patrzY * kamTyl;
    }

    // ---------- rysowanie ----------
    void Znak(int x, int y, char z, int barwa)
    {
        if (x >= 0 && y >= 0 && x < SZ && y < WY) ekran[y * SZ + x] = z | (barwa << 8);
    }

    void Napis(int x, int y, string s, int barwa)
    {
        for (int i = 0; i < s.Length; i++) Znak(x + i, y, s[i], barwa);
    }

    // Napis wyśrodkowany w widoku 3D.
    void Srodek(int y, string s, int barwa) { Napis((WID - s.Length) / 2, y, s, barwa); }

    void Ramka(int x0, int y0, int x1, int y1, int barwa, bool czysc)
    {
        for (int y = y0; y <= y1; y++)
            for (int x = x0; x <= x1; x++)
            {
                bool pion = x == x0 || x == x1, poziom = y == y0 || y == y1;
                if (pion || poziom) Znak(x, y, pion && poziom ? '+' : pion ? '|' : '-', barwa);
                else if (czysc) Znak(x, y, ' ', 0);
            }
    }

    // Wielkie litery złożone ze znaków '#': każdy piksel czcionki to dwa znaki obok siebie.
    void Wielki(int x, int y, string s, int barwa)
    {
        for (int i = 0; i < s.Length; i++)
            for (int r = 0; r < 7; r++)
            {
                int bity = CZCIONKA[(s[i] - 32) * 7 + r] - '0';
                for (int k = 0; k < 5; k++)
                    if ((bity & (16 >> k)) != 0) Napis(x + i * 12 + k * 2, y + r, "##", Jasnosc(barwa, 1f - r * 0.07f));
            }
    }

    static int Jasnosc(int barwa, float f)
    {
        if (f < 0f) f = 0f;
        int r = (int)(((barwa >> 16) & 255) * f), g = (int)(((barwa >> 8) & 255) * f), b = (int)((barwa & 255) * f);
        return (r > 255 ? 255 : r) << 16 | (g > 255 ? 255 : g) << 8 | (b > 255 ? 255 : b);
    }

    // Światło pochodni: im dalej od postaci, tym ciemniej.
    float Swiatlo(float x, float y)
    {
        return Mathf.Max(0.14f, Mathf.Min(1f, (1.2f + 5f * Mathf.Max(flara, 0f)) / (1f + (Kw(x - gx) + Kw(y - gy)) * 0.1f)));
    }

    // Pozioma krawędź na wysokości p (w wierszach): najbliższa z kresek '-' (środek komórki) i '_' (jej dół).
    // Dzięki temu skosy ścian mają dwa stopnie na wiersz zamiast jednego.
    static char Kreska(float p, out int wiersz)
    {
        wiersz = Mathf.FloorToInt(p);
        float f = p - wiersz;
        if (f < 0.125f) { wiersz--; return '_'; }
        return f < 0.625f ? '-' : '_';
    }

    // Czy kolumny a i b patrzą na różne ściany: 0 — ta sama, 1 — inny kafel tego samego muru, 2 — róg albo uskok.
    int Styk(int a, int b)
    {
        if (trafBok[a] != trafBok[b]) return 2;
        int ka = trafKafel[a], kb = trafKafel[b];
        if (ka == kb) return 0;
        return (trafBok[a] == 0 ? ka % MW == kb % MW : ka / MW == kb / MW) ? 1 : 2;
    }

    void Rysuj()
    {
        for (int i = 0; i < ekran.Length; i++) ekran[i] = ' ';
        Widok();
        Rzeczy();
        if (blysk > 0f)   // dotknięcie ducha: widok na chwilę czerwienieje
            for (int y = 0; y < WY; y++)
                for (int x = 0; x < WID; x++)
                {
                    int k = ekran[y * SZ + x], j = Mathf.Max((k >> 24) & 255, Mathf.Max((k >> 16) & 255, (k >> 8) & 255));
                    ekran[y * SZ + x] = (k & 255) | (j << 24) | ((j / 5) << 16) | ((j / 5) << 8);
                }
        if (stan == GRA && komCzas > 0f) Srodek(WY - 2, "  " + kom + "  ", B_ZLOTO);
        Panel();
        if (stan == TYTUL) EkranTytulowy();
        if (stan == WYGRANA) EkranKonca("WOLNY!", "WYSZEDLES Z LOCHU W CZASIE " + Zegar(czas), B_ZIELEN);
        if (stan == PRZEGRANA) EkranKonca("KONIEC", "DUCHY CIE DOPADLY", B_DUCH);
    }

    // Widok 3D: z kamery idzie po jednym promieniu na kolumnę znaków, aż trafi w mur.
    void Widok()
    {
        float prawoX = -patrzY * POLE, prawoY = patrzX * POLE;
        bool otwarta = zebrane == KRYSZTALY;

        for (int x = 0; x < WID; x++)
        {
            float cam = 2f * (x + 0.5f) / WID - 1f, px = patrzX + prawoX * cam, py = patrzY + prawoY * cam;
            if (Mathf.Abs(px) < 0.00001f) px = 0.00001f;
            if (Mathf.Abs(py) < 0.00001f) py = 0.00001f;
            int mx = (int)kamX, my = (int)kamY, kx = px < 0f ? -1 : 1, ky = py < 0f ? -1 : 1, bok;
            float ddx = Mathf.Abs(1f / px), ddy = Mathf.Abs(1f / py);
            float sdx = (px < 0f ? kamX - mx : mx + 1f - kamX) * ddx, sdy = (py < 0f ? kamY - my : my + 1f - kamY) * ddy;
            do
            {
                znane[my * MW + mx] = true;
                if (sdx < sdy) { sdx += ddx; mx += kx; bok = 0; } else { sdy += ddy; my += ky; bok = 1; }
            } while (mapa[my * MW + mx] == 0);
            znane[my * MW + mx] = true;
            float d = Mathf.Max(bok == 0 ? sdx - ddx : sdy - ddy, 0.02f);
            glebia[x] = d; trafKafel[x] = my * MW + mx; trafBok[x] = bok;
            trafW[x] = bok == 0 ? kamY + d * py : kamX + d * px;   // miejsce trafienia mierzone wzdłuż muru
        }

        for (int x = 0; x < WID; x++)
        {
            float cam = 2f * (x + 0.5f) / WID - 1f, px = patrzX + prawoX * cam, py = patrzY + prawoY * cam;
            float d = glebia[x], gora = HOR - SKALA * (1f - KAM_WYS) / d, dol = HOR + SKALA * KAM_WYS / d, wys = dol - gora;
            int bok = trafBok[x];
            bool wrota = mapa[trafKafel[x]] == 2;
            float jas = Swiatlo(kamX + px * d, kamY + py * d) * (bok == 1 ? 0.62f : 1f);
            // pionowa krawędź należy do tej z dwóch sąsiednich kolumn, która jest bliżej
            int styk = Mathf.Max(x > 0 && d <= glebia[x - 1] ? Styk(x, x - 1) : 0, x < WID - 1 && d < glebia[x + 1] ? Styk(x, x + 1) : 0);
            bool cegly = wys >= 8f && !wrota, tenSamMur = x > 0 && Styk(x, x - 1) < 2;
            int rg, rd, s1 = -9, s2 = -9, s3 = -9;
            char zg = Kreska(gora, out rg), zd = Kreska(dol, out rd), c1 = ' ', c2 = ' ', c3 = ' ';
            if (cegly)
            {
                c1 = Kreska(gora + wys * 0.25f, out s1); c2 = Kreska(gora + wys * 0.5f, out s2); c3 = Kreska(gora + wys * 0.75f, out s3);
            }

            for (int y = Mathf.Max(rg, 0); y <= rd && y < WY; y++)
            {
                char z;
                float j = jas;
                int barwa = B_MUR;
                if (y == rg) z = rd > rg ? zg : '=';
                else if (y == rd) z = zd;
                else if (styk == 2) z = '|';
                else if (wrota)
                {
                    int pas = (int)((trafW[x] - Mathf.Floor(trafW[x])) * 9f);
                    if (otwarta) { z = ".:*+"[(pas + y + (int)(zegar * 8f)) & 3]; barwa = B_ZIELEN; j = Mathf.Max(j, 0.7f); }
                    else { z = (pas & 1) == 0 ? '#' : (y & 3) == 0 ? '=' : ' '; barwa = B_DUCH; j = Mathf.Max(j, 0.35f); }
                }
                else if (cegly)
                {
                    // mur z cegieł: cztery warstwy, co druga przesunięta o pół cegły
                    if (y == s1) z = c1;
                    else if (y == s2) z = c2;
                    else if (y == s3) z = c3;
                    else
                    {
                        float przes = ((int)((y + 0.5f - gora) / wys * 4f) & 1) * 0.5f;
                        bool spoina = tenSamMur && Mathf.Floor(trafW[x] * 2f + przes) != Mathf.Floor(trafW[x - 1] * 2f + przes);
                        z = spoina ? '|' : '.';
                        if (!spoina) j *= 0.4f;
                    }
                }
                else
                {
                    z = styk == 1 ? '|' : '.';
                    if (styk != 1) j *= 0.4f;
                }
                Znak(x, y, z, Jasnosc(barwa, Mathf.Max(j, 0.09f)));
            }

            // podłoga w szachownicę pod ścianą; sufit zostaje czarny
            for (int y = Mathf.Max(rd + 1, 0); y < WY; y++)
            {
                float dr = SKALA * KAM_WYS / (y + 0.5f - HOR), wx = kamX + px * dr, wy = kamY + py * dr;
                if (dr > d || (((int)(wx * 2f) + (int)(wy * 2f)) & 1) == 0) continue;   // dr > d: to już za ścianą
                float j = Swiatlo(wx, wy);
                Znak(x, y, j > 0.6f ? ':' : '.', Jasnosc(B_PODLOGA, j));
            }
        }
    }

    // Kryształy, duchy i postać — od najdalszych do najbliższych; mur zasłania to, co za nim.
    void Rzeczy()
    {
        int n = 0;
        for (int i = 0; i < RZECZY; i++)
        {
            if (!rzJest[i]) continue;
            rzGl[i] = (rzX[i] - kamX) * patrzX + (rzY[i] - kamY) * patrzY;
            int j = n++;
            while (j > 0 && rzGl[kolej[j - 1]] < rzGl[i]) { kolej[j] = kolej[j - 1]; j--; }
            kolej[j] = i;
        }
        bool postacGotowa = false;
        for (int q = 0; q <= n; q++)
        {
            int i = q < n ? kolej[q] : -1;
            if (!postacGotowa && (i < 0 || rzGl[i] <= kamTyl)) { Postac(); postacGotowa = true; }
            if (i < 0 || rzGl[i] < 0.15f) continue;

            bool duch = i >= KRYSZTALY;
            float gl = rzGl[i], bok = (rzX[i] - kamX) * -patrzY + (rzY[i] - kamY) * patrzX;
            float h0 = duch ? 0.1f + 0.04f * Mathf.Sin(zegar * 2.5f + i) : 0.1f + 0.05f * Mathf.Sin(zegar * 3f + i);
            float h1 = h0 + (duch ? 0.56f : 0.44f);
            float gora = HOR - SKALA * (h1 - KAM_WYS) / gl, dol = HOR + SKALA * (KAM_WYS - h0) / gl;
            float szer = (dol - gora) * ZY / ZX * (duch ? 0.9f : 0.75f), sx = (0.5f + 0.5f * bok / (gl * POLE)) * WID;
            float jas = Mathf.Max(Swiatlo(rzX[i], rzY[i]), duch ? 0.55f : 0.9f);   // świecą własnym światłem

            for (int x = Mathf.Max(0, Mathf.CeilToInt(sx - szer * 0.5f - 0.5f)); x < WID && x + 0.5f < sx + szer * 0.5f; x++)
            {
                if (gl >= glebia[x]) continue;
                float u = (x + 0.5f - sx) / (szer * 0.5f);
                for (int y = Mathf.Max(0, Mathf.CeilToInt(gora - 0.5f)); y < WY && y + 0.5f < dol; y++)
                {
                    float v = (y + 0.5f - gora) / (dol - gora) * 2f - 1f;
                    int k = duch ? Duch(u, v, jas, rzStrach[i] > 0f) : Krysztal(u, v, jas);
                    if (k != 0) ekran[y * SZ + x] = k;
                }
            }
        }
    }

    // Kształty rzeczy liczone ze wzoru (u, v od -1 do 1), żeby były ostre z każdej odległości. 0 = nic.
    int Krysztal(float u, float v, float jas)
    {
        float a = Mathf.Abs(u) + Mathf.Abs(v);
        if (a > 1f) return 0;
        char z = a > 0.7f ? (u * v > 0f ? '/' : '\\') : a < 0.3f ? '*' : '#';
        return z | (Jasnosc(B_KRYSZTAL, jas * (0.75f - 0.25f * (u + v))) << 8);
    }

    int Duch(float u, float v, float jas, bool strach)
    {
        float au = Mathf.Abs(u);
        bool wSrodku = v < -0.2f ? u * u + Kw(v + 0.2f) < 0.64f : au < 0.8f && v < 0.82f + 0.16f * Mathf.Sin(u * 9f + zegar * 6f);
        if (!wSrodku) return 0;
        if (Kw(au - 0.34f) + Kw(v + 0.3f) * 0.6f < 0.03f) return ' ';   // puste oczy
        if (strach) return ':' | (Jasnosc(B_TEKST, 0.7f - 0.2f * v) << 8);   // wystraszony blednie
        return '&' | (Jasnosc(B_DUCH, jas * (0.95f - 0.3f * v)) << 8);
    }

    void Postac()
    {
        if (nietykalny > 0f && stan == GRA && ((int)(zegar * 12f) & 1) == 0) return;   // po dotknięciu ducha postać miga
        int nogi = idzie ? 2 + 2 * ((int)(krok * 2.5f) & 1) : 0, plomien = (int)(zegar * 9f);
        for (int r = 0; r < POSTAC.Length + 2; r++)
        {
            string wiersz = r < POSTAC.Length ? POSTAC[r] : NOGI[nogi + r - POSTAC.Length];
            for (int c = 0; c < wiersz.Length; c++)
            {
                char z = wiersz[c];
                if (z == ' ') continue;
                int barwa = Jasnosc(B_PLASZCZ, 0.7f + 0.03f * c);
                if (r >= POSTAC.Length) barwa = B_SKORA;
                else if (c > 10 && r < 2) { barwa = (plomien & 1) == 0 ? B_OGIEN : B_ZLOTO; z = z == '#' ? "*#@%"[plomien & 3] : z == ',' ? ",'`."[plomien & 3] : z; }
                else if (c > 10 && r < 4) barwa = B_SKORA;
                Znak(POSTAC_X + c, POSTAC_Y + r, z, barwa);
            }
        }
        if (flara <= 0.25f) return;
        int fx = POSTAC_X + 14, fy = POSTAC_Y + 1;   // środek płomienia
        Znak(fx, fy, '*', 0xFFFFFF);
        Znak(fx, fy - 2, '|', B_ZLOTO); Znak(fx - 2, fy - 1, '\\', B_ZLOTO); Znak(fx + 2, fy - 1, '/', B_ZLOTO);
        Napis(fx - 4, fy, "--", B_ZLOTO); Napis(fx + 3, fy, "--", B_ZLOTO);
        Znak(fx - 2, fy + 1, '/', B_ZLOTO); Znak(fx + 2, fy + 1, '\\', B_ZLOTO);
    }

    static string Zegar(float t)
    {
        int s = (int)t;
        return (s / 60).ToString("00") + ":" + (s % 60).ToString("00");
    }

    void Panel()
    {
        for (int y = 0; y < WY; y++) Znak(WID, y, '|', B_RAMKA);
        int x = WID + 2;
        Napis(x + 2, 1, "L O C H   A S C I I", B_ZLOTO);
        Napis(x, 3, "ZYCIE", B_SZARY);
        for (int i = 0; i < ZYCIA; i++) Napis(x + 11 + i * 3, 3, "<3", i < zycia ? B_DUCH : 0x402020);
        Napis(x, 4, "KRYSZTALY", B_SZARY);
        for (int i = 0; i < KRYSZTALY; i++) Znak(x + 11 + i * 3, 4, i < zebrane ? '*' : '.', i < zebrane ? B_KRYSZTAL : B_SZARY);
        Napis(x, 5, "BLYSK", B_SZARY);
        for (int i = 0; i < P_FLARY[poziom]; i++) Znak(x + 11 + i * 3, 5, i < flary ? '*' : '.', i < flary ? B_OGIEN : B_SZARY);
        Napis(x, 6, "POZIOM", B_SZARY);
        Napis(x + 11, 6, P_NAZWA[poziom], B_TEKST);
        Napis(x, 7, "CZAS", B_SZARY);
        Napis(x + 11, 7, Zegar(czas), B_TEKST);
        if (rekord[poziom] > 0f) { Napis(x, 8, "REKORD", B_SZARY); Napis(x + 11, 8, Zegar(rekord[poziom]), B_SZARY); }

        // mapa: tylko to, co postać już widziała
        int mx = x + 1, my = 11;
        Ramka(mx - 1, my - 1, mx + MW, my + MH, B_RAMKA, false);
        for (int i = 0; i < mapa.Length; i++)
        {
            if (!znane[i]) continue;
            if (mapa[i] == 1) Znak(mx + i % MW, my + i / MW, '#', 0x5A4E3C);
            else if (mapa[i] == 2) Znak(mx + i % MW, my + i / MW, 'E', zebrane == KRYSZTALY ? B_ZIELEN : B_DUCH);
            else Znak(mx + i % MW, my + i / MW, '.', 0x303840);
        }
        for (int i = 0; i < RZECZY; i++)
        {
            if (!rzJest[i]) continue;
            int rx = (int)rzX[i], ry = (int)rzY[i];
            if (rx < 0 || ry < 0 || rx >= MW || ry >= MH) continue;
            if (i >= KRYSZTALY) Znak(mx + rx, my + ry, 'G', B_DUCH);
            else if (znane[ry * MW + rx]) Znak(mx + rx, my + ry, '*', B_KRYSZTAL);
        }
        Znak(mx + (int)gx, my + (int)gy, ">v<^"[Mathf.RoundToInt(kat / (Mathf.PI * 0.5f)) & 3], B_ZLOTO);

        int w = my + MH + 2;
        Napis(x, w, "CEL", B_ZLOTO);
        Napis(x, w + 1, "ZBIERZ 3 KRYSZTALY (*)", B_TEKST);
        Napis(x, w + 2, "I WYJDZ BRAMA (E).", B_TEKST);
        Napis(x, w + 3, "DUCHY (G) PRZENIKAJA", B_TEKST);
        Napis(x, w + 4, "PRZEZ SCIANY - BLYSK", B_TEKST);
        Napis(x, w + 5, "POCHODNI JE ODPEDZA.", B_TEKST);
        Napis(x, w + 7, "STEROWANIE", B_ZLOTO);
        Napis(x, w + 8, "W S     NAPRZOD / W TYL", B_TEKST);
        Napis(x, w + 9, "A D     OBROT", B_TEKST);
        Napis(x, w + 10, "Q E     KROK W BOK", B_TEKST);
        Napis(x, w + 11, "        (STRZALKI TEZ)", B_SZARY);
        Napis(x, w + 12, "SPACJA  BLYSK POCHODNI", B_TEKST);
        Napis(x, w + 13, "R       NOWY LOCH", B_TEKST);
        Napis(x, w + 14, "ESC     EKRAN TYTULOWY", B_TEKST);
    }

    void EkranTytulowy()
    {
        Ramka(13, 2, 66, 26, B_RAMKA, true);
        Wielki(17, 4, "LOCH", B_ZLOTO);
        Srodek(12, "A S C I I", B_TEKST);
        Srodek(15, "ZBIERZ 3 KRYSZTALY, A BRAMA CIE WYPUSCI.", B_TEKST);
        Srodek(16, "DUCHY PRZENIKAJA PRZEZ SCIANY.", B_TEKST);
        Srodek(17, "SPACJA - BLYSK POCHODNI - ODPEDZA JE.", B_TEKST);
        Poziomy(20);
        if (((int)(zegar * 2f) & 1) == 0) Srodek(24, "[ ENTER ]  WEJDZ DO LOCHU", B_ZLOTO);
    }

    void EkranKonca(string wielki, string opis, int barwa)
    {
        Ramka(3, 3, 76, 26, B_RAMKA, true);
        Wielki(5, 5, wielki, barwa);
        Srodek(14, opis, B_TEKST);
        if (stan == WYGRANA) Srodek(16, "REKORD POZIOMU " + Zegar(rekord[poziom]), B_SZARY);
        Poziomy(20);
        if (((int)(zegar * 2f) & 1) == 0) Srodek(24, "[ ENTER ]  NOWY LOCH", B_ZLOTO);
    }

    // Wybór poziomu trudności: trzy nazwy w jednym wierszu, wybrana świeci.
    void Poziomy(int y)
    {
        Srodek(y - 1, "POZIOM TRUDNOSCI - KLAWISZE 1, 2, 3", B_SZARY);
        int x = 21;
        for (int i = 0; i < 3; i++)
        {
            string s = (i == poziom ? "> " : "  ") + (i + 1) + " " + P_NAZWA[i] + (i == poziom ? " <" : "  ");
            Napis(x, y, s, i == poziom ? B_ZLOTO : B_SZARY);
            x += s.Length + 1;
        }
    }

    // ---------- znaki na piksele ----------
    // Przerysowuje tylko komórki, które się zmieniły. Tekstura ma tyle razy większe piksele, ile mieści okno.
    void Wyswietl()
    {
        int p = Mathf.Clamp(Mathf.CeilToInt(Mathf.Min((float)Screen.width / PX, (float)Screen.height / PY)), 1, 3);
        if (obraz == null || p != powiekszenie)
        {
            if (obraz != null) Destroy(obraz);
            powiekszenie = p;
            obraz = new Texture2D(PX * p, PY * p, TextureFormat.RGBA32, false);
            obraz.filterMode = FilterMode.Bilinear;
            obraz.wrapMode = TextureWrapMode.Clamp;
            piksele = new Color32[PX * p * PY * p];
            for (int i = 0; i < piksele.Length; i++) piksele[i] = CZERN;
            for (int i = 0; i < poprz.Length; i++) poprz[i] = -1;
        }
        bool zmiana = false;
        int szer = PX * p;
        for (int i = 0; i < ekran.Length; i++)
        {
            int k = ekran[i];
            if (k == poprz[i]) continue;
            poprz[i] = k;
            zmiana = true;
            int znak = (k & 255) - 32;
            if (znak < 0 || znak > 94) znak = 0;
            Color32 barwa = new Color32((byte)((k >> 24) & 255), (byte)((k >> 16) & 255), (byte)((k >> 8) & 255), 255);
            int x0 = (MARG + i % SZ * ZX) * p, y0 = i / SZ * ZY * p;
            for (int r = 0; r < 7; r++)
            {
                int bity = CZCIONKA[znak * 7 + r] - '0';
                for (int c = 0; c < 5; c++)
                {
                    Color32 b = (bity & (16 >> c)) != 0 ? barwa : CZERN;
                    for (int py = 0; py < p; py++)
                    {
                        int gdzie = (PY * p - 1 - (y0 + r * p + py)) * szer + x0 + c * p;   // tekstura ma wiersz 0 na dole
                        for (int px = 0; px < p; px++) piksele[gdzie + px] = b;
                    }
                }
            }
        }
        if (!zmiana) return;
        obraz.SetPixels32(piksele);
        obraz.Apply(false);
    }

    void OnGUI()
    {
        if (obraz == null || Event.current.type != EventType.Repaint) return;
        GUI.color = Color.black;
        GUI.DrawTexture(new Rect(0f, 0f, Screen.width, Screen.height), Texture2D.whiteTexture);
        GUI.color = Color.white;
        float s = Mathf.Min((float)Screen.width / PX, (float)Screen.height / PY), w = PX * s, h = PY * s;
        GUI.DrawTexture(new Rect((Screen.width - w) * 0.5f, (Screen.height - h) * 0.5f, w, h), obraz, ScaleMode.StretchToFill, false);
    }
}
