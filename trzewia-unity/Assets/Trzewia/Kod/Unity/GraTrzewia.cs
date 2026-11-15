// Trzewia w Unity — gospodarz gry: to, co w Trzewia.exe robią Program.cs i OknoGry (SDL3), tylko na Unity.
// Gra (Trzewia.Symulacja, Trzewia.Gra, Trzewia.Skia — te same pliki co w trzewia-cs) chodzi we własnym wątku
// (Trzewia.Most.WatekGry) i rysuje Skią na karcie graficznej; gotowa klatka trafia tu do tekstury, a kamera pokazuje ją
// na cały ekran. Unity daje okno, mysz, klawiaturę, dźwięk (OnAudioFilterRead), kursor i budowanie gry.
using System;
using System.Collections.Concurrent;
using System.IO;
using System.Threading.Tasks;
using Trzewia.Aplikacja;
using Trzewia.Most;
using Trzewia.Rdzen;
using UnityEngine;

namespace Trzewia.Unity
{
    [RequireComponent(typeof(Camera))]
    [RequireComponent(typeof(AudioListener))]
    [DisallowMultipleComponent]
    public sealed class GraTrzewia : MonoBehaviour
    {
        [Tooltip("Ekran po ładowaniu (jak --ekran w Trzewia.exe): puste — film intro i menu; gra, samouczek, menu, ustawienia, osiagniecia, bestiariusz; proba — ekran próbny bez ładowania.")]
        public string ekranStartowy = "";
        [Tooltip("Tryb deweloperski (jak --dev): okienko dewelopera, przyspieszanie czasu.")]
        public bool trybDeweloperski;
        [Tooltip("Licznik wydajności (F3) od startu.")]
        public bool licznik;
        [Tooltip("Wpisy dziennika gry także w konsoli Unity.")]
        public bool dziennikWKonsoli = true;

        /// <summary>Gra stawia się sama w każdej scenie, w której jej nie ma (wyłącz, gdy zaczniesz budować własne sceny).</summary>
        public static bool SamaWstaje = true;
        static GraTrzewia? ten;

        WatekGry? gra;
        Texture2D? tekstura;
        WyjscieDzwieku? dzwiek;
        readonly ConcurrentQueue<Action> wGlownym = new ConcurrentQueue<Action>();
        readonly WejscieUnity wejscie = new WejscieUnity();
        readonly KursorUnity kursor = new KursorUnity();
        string? blad;
        string folderGracza = "";
        int szer, wys;
        double gestosc;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Wstan()
        {
            if (!SamaWstaje || ten != null) return;
            var o = new GameObject("Trzewia");
            o.AddComponent<GraTrzewia>();
        }

        void Awake()
        {
            if (ten != null && ten != this) { Destroy(gameObject); return; }
            ten = this;
            DontDestroyOnLoad(gameObject);
            var kamera = GetComponent<Camera>();
            kamera.clearFlags = CameraClearFlags.SolidColor;
            kamera.backgroundColor = Color.black;
            kamera.cullingMask = 0;
            kamera.orthographic = true;
            kamera.allowHDR = false;
            kamera.allowMSAA = false;
            // jeden słuchacz dźwięku: gra w scenie z inną kamerą (np. nowa scena Unity z Main Camera)
            foreach (var s in FindObjectsByType<AudioListener>(FindObjectsSortMode.None))
                if (s.gameObject != gameObject && s.enabled) { s.enabled = false; Debug.Log("[Trzewia] wyłączony drugi AudioListener na " + s.gameObject.name); }
            QualitySettings.vSyncCount = 1;
            Application.targetFrameRate = 240;
            Application.runInBackground = true;

            Tryb.Dev = trybDeweloperski;
            if (dziennikWKonsoli) Dziennik.Sluchacz = linia => Debug.Log("[Trzewia] " + linia);
            folderGracza = PlikiNaDysku.FolderGracza();
            var pliki = new PlikiNaDysku(Path.Combine(Application.streamingAssetsPath, "dane"), folderGracza);
            WatekGry.Przygotuj(pliki, pliki, $"Unity {Application.unityVersion} ({SystemInfo.graphicsDeviceType})");
            Gospodarz.UstawPelnyEkran = v => wGlownym.Enqueue(() => UstawPelnyEkran(v));
            Gospodarz.OtworzAdres = adres => wGlownym.Enqueue(() => Application.OpenURL(adres));

            dzwiek = new WyjscieDzwieku(AudioSettings.outputSampleRate);
            Task.Run(WyjscieDzwieku.Rozgrzej);

            Zmierz();
            gra = new WatekGry
            {
                EkranStartowy = ekranStartowy.Trim(),
                Licznik = licznik,
                NaBlad = opis => wGlownym.Enqueue(() => Debug.LogError("[Trzewia] gra padła: " + opis)),
            };
            gra.Uruchom(szer, wys, gestosc);
            // pełny ekran z ustawień gracza (w edytorze nic nie zmienia)
            wGlownym.Enqueue(() => { if (SettingsStore.ustawienia.pelnyEkran && !Application.isEditor) UstawPelnyEkran(true); });
        }

        /// <summary>Rozmiar obrazu w pikselach i gęstość ekranu (Windows 125% → 1,25 — jak devicePixelRatio).</summary>
        void Zmierz()
        {
            szer = Math.Max(1, Screen.width);
            wys = Math.Max(1, Screen.height);
            double d = 1;
            if (Application.platform == RuntimePlatform.WindowsPlayer || Application.platform == RuntimePlatform.WindowsEditor)
                d = Screen.dpi > 0 ? Screen.dpi / 96.0 : 1;
            gestosc = Math.Max(1, Math.Min(4, d));
        }

        static void UstawPelnyEkran(bool v)
        {
            if (v == Screen.fullScreen) return;
            if (v)
            {
                var r = Screen.currentResolution;
                Screen.SetResolution(r.width, r.height, FullScreenMode.FullScreenWindow);
            }
            else Screen.fullScreenMode = FullScreenMode.Windowed;
        }

        void Update()
        {
            while (wGlownym.TryDequeue(out var a))
            {
                try { a(); } catch (Exception e) { Debug.LogException(e); }
            }
            var g = gra;
            if (g == null) return;
            if (g.Blad != null && blad == null) blad = g.Blad;
            int w = szer, h = wys; double d = gestosc;
            Zmierz();
            if (w != szer || h != wys || d != gestosc) g.Rozmiar(szer, wys, gestosc);
            kursor.Ustaw(gestosc);
            kursor.Krok();
            wejscie.Mysz(g, kursor, gestosc);
            if (Input.GetKeyDown(KeyCode.F11)) UstawPelnyEkran(!Screen.fullScreen);
            g.Popros();
            var k = g.Odbierz();
            if (k != null) Pokaz(k);
        }

        /// <summary>Klatka gry do tekstury (wiersze od góry — kamera odwraca przy pokazaniu).</summary>
        void Pokaz(KlatkaObrazu k)
        {
            if (tekstura == null || tekstura.width != k.W || tekstura.height != k.H)
            {
                if (tekstura != null) Destroy(tekstura);
                tekstura = new Texture2D(k.W, k.H, TextureFormat.RGBA32, false, false)
                {
                    name = "Trzewia — obraz gry",
                    filterMode = FilterMode.Point,
                    wrapMode = TextureWrapMode.Clamp,
                };
            }
            tekstura.LoadRawTextureData(k.Piksele);
            tekstura.Apply(false, false);
        }

        void OnGUI()
        {
            var e = Event.current;
            if (gra != null) wejscie.Zdarzenie(e, gra);
            if (blad != null && e.type == EventType.Repaint)
            {
                var s = new GUIStyle(GUI.skin.label) { fontSize = 18, wordWrap = true };
                s.normal.textColor = new Color(1f, 0.85f, 0.7f);
                GUI.Label(new Rect(40, 40, Screen.width - 80, Screen.height - 80),
                    "Gra napotkała błąd i musiała się zatrzymać.\n\n" + blad + "\n\nSzczegóły są w pliku:\n" + Path.Combine(folderGracza, "dziennik.txt"), s);
            }
        }

        void LateUpdate() => wejscie.KoniecKlatki(gra);

        void OnRenderImage(RenderTexture zrodlo, RenderTexture cel)
        {
            if (tekstura == null) { Graphics.Blit(zrodlo, cel); return; }
            // tekstura ma wiersze od góry — odwrócona w pionie wypełnia cały ekran
            Graphics.Blit(tekstura, cel, new Vector2(1, -1), new Vector2(0, 1));
        }

        void OnAudioFilterRead(float[] dane, int kanaly) => dzwiek?.Mieszaj(dane, kanaly);

        void OnApplicationFocus(bool fokus)
        {
            if (!fokus) kursor.Rozmycie();
        }

        void OnApplicationPause(bool pauza)
        {
            if (pauza) Mikser.usnij();
            else { Mikser.wznow(); gra?.Wznow(); }
        }

        void OnDestroy()
        {
            if (ten != this) return;
            ten = null;
            gra?.Dispose(); gra = null;
            dzwiek?.Zamknij(); dzwiek = null;
            kursor.Dispose();
            if (tekstura != null) Destroy(tekstura);
            Gospodarz.UstawPelnyEkran = null;
            Gospodarz.OtworzAdres = null;
            Dziennik.Sluchacz = null;
            Dziennik.Zamknij();
        }
    }
}
