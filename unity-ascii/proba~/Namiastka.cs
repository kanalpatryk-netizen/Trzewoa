// Namiastka Unity do prób bez Unity: tylko to, czego używa LochAscii.cs.
// Niczego nie rysuje ani nie odtwarza — pamięta piksele tekstury i udaje klawiaturę.
using System.Collections.Generic;

namespace UnityEngine
{
    public class Object
    {
        public static void Destroy(Object o) { }
    }

    public class Component : Object { public GameObject gameObject; }
    public class Behaviour : Component { public bool enabled = true; }
    public class MonoBehaviour : Behaviour { public bool useGUILayout = true; }

    public class GameObject : Object
    {
        public static readonly List<Component> dodane = new List<Component>();
        public GameObject(string nazwa) { }
        public T AddComponent<T>() where T : Component, new()
        {
            T c = new T();
            c.gameObject = this;
            dodane.Add(c);
            return c;
        }
    }

    public enum RuntimeInitializeLoadType { AfterSceneLoad, BeforeSceneLoad }

    [System.AttributeUsage(System.AttributeTargets.Method)]
    public class RuntimeInitializeOnLoadMethodAttribute : System.Attribute
    {
        public RuntimeInitializeOnLoadMethodAttribute(RuntimeInitializeLoadType kiedy) { }
    }

    public static class Mathf
    {
        public const float PI = 3.14159265f;
        public static float Sin(float a) { return (float)System.Math.Sin(a); }
        public static float Cos(float a) { return (float)System.Math.Cos(a); }
        public static float Sqrt(float a) { return (float)System.Math.Sqrt(a); }
        public static float Abs(float a) { return a < 0f ? -a : a; }
        public static int Abs(int a) { return a < 0 ? -a : a; }
        public static float Min(float a, float b) { return a < b ? a : b; }
        public static int Min(int a, int b) { return a < b ? a : b; }
        public static float Max(float a, float b) { return a > b ? a : b; }
        public static int Max(int a, int b) { return a > b ? a : b; }
        public static float Floor(float a) { return (float)System.Math.Floor(a); }
        public static int FloorToInt(float a) { return (int)System.Math.Floor(a); }
        public static int CeilToInt(float a) { return (int)System.Math.Ceiling(a); }
        public static int RoundToInt(float a) { return (int)System.Math.Round(a); }
        public static int Clamp(int a, int min, int max) { return a < min ? min : a > max ? max : a; }
        public static float Clamp(float a, float min, float max) { return a < min ? min : a > max ? max : a; }
    }

    public struct Color
    {
        public float r, g, b, a;
        public Color(float r, float g, float b, float a) { this.r = r; this.g = g; this.b = b; this.a = a; }
        public static Color black { get { return new Color(0f, 0f, 0f, 1f); } }
        public static Color white { get { return new Color(1f, 1f, 1f, 1f); } }
    }

    public struct Color32
    {
        public byte r, g, b, a;
        public Color32(byte r, byte g, byte b, byte a) { this.r = r; this.g = g; this.b = b; this.a = a; }
    }

    public struct Rect
    {
        public float x, y, width, height;
        public Rect(float x, float y, float width, float height) { this.x = x; this.y = y; this.width = width; this.height = height; }
    }

    public enum TextureFormat { RGBA32 }
    public enum FilterMode { Point, Bilinear }
    public enum TextureWrapMode { Repeat, Clamp }
    public enum ScaleMode { StretchToFill, ScaleAndCrop, ScaleToFit }
    public enum CameraClearFlags { Skybox, SolidColor }
    public enum EventType { Repaint, Layout }

    public class Texture : Object { public FilterMode filterMode; public TextureWrapMode wrapMode; }

    public class Texture2D : Texture
    {
        public readonly int width, height;
        public Color32[] dane;       // ostatnio wgrane piksele (wiersz 0 na dole, jak w Unity)
        public int wgrania;
        public Texture2D(int width, int height, TextureFormat format, bool mipChain) { this.width = width; this.height = height; }
        public void SetPixels32(Color32[] piksele)
        {
            if (piksele.Length != width * height) throw new System.ArgumentException("zla liczba pikseli");
            dane = piksele;   // bez kopii: gra i tak wgrywa za każdym razem tę samą tablicę
        }
        public void Apply(bool updateMipmaps) { wgrania++; }
        public static Texture2D whiteTexture { get { return new Texture2D(4, 4, TextureFormat.RGBA32, false); } }
    }

    public static class Screen { public static int width = 1280, height = 720; }
    public static class Time { public static float deltaTime = 1f / 60f; }

    public class Event
    {
        public EventType type = EventType.Repaint;
        public static Event current = new Event();
    }

    public static class GUI
    {
        public static Color color;
        public static Texture ostatnia;
        public static Rect ostatniProstokat;
        public static void DrawTexture(Rect gdzie, Texture obraz) { }
        public static void DrawTexture(Rect gdzie, Texture obraz, ScaleMode tryb, bool przezroczystosc) { ostatnia = obraz; ostatniProstokat = gdzie; }
    }

    public class Camera : Behaviour
    {
        public static int allCamerasCount;
        public CameraClearFlags clearFlags;
        public Color backgroundColor;
        public int cullingMask = -1;
    }

    public class AudioListener : Behaviour { }

    public class AudioClip : Object
    {
        public int probki;
        public static AudioClip Create(string nazwa, int lengthSamples, int channels, int frequency, bool stream)
        {
            if (lengthSamples <= 0 || channels != 1) throw new System.ArgumentException("zly klip");
            return new AudioClip { probki = lengthSamples };
        }
        public bool SetData(float[] dane, int offsetSamples)
        {
            if (dane.Length != probki) throw new System.ArgumentException("zla dlugosc danych");
            foreach (float p in dane) if (!(p >= -1f && p <= 1f)) throw new System.ArgumentException("probka poza zakresem");
            return true;
        }
    }

    public class AudioSource : Behaviour
    {
        public bool playOnAwake = true;
        public static int odtworzenia;
        public void PlayOneShot(AudioClip klip) { if (klip == null) throw new System.ArgumentNullException("klip"); odtworzenia++; }
    }

    // Klawiatura do prób: Proba wpisuje tu nazwy trzymanych i właśnie wciśniętych klawiszy (jak w KeyCode).
    public static class Klawisze
    {
        public static readonly HashSet<string> trzymane = new HashSet<string>(), wcisniete = new HashSet<string>();
    }

    public enum KeyCode { W, S, A, D, Q, E, R, UpArrow, DownArrow, LeftArrow, RightArrow, Return, KeypadEnter, Space, Escape,
        Alpha1, Alpha2, Alpha3, Keypad1, Keypad2, Keypad3 }

    public static class Input
    {
#if ENABLE_INPUT_SYSTEM && !ENABLE_LEGACY_INPUT_MANAGER
        // jak w Unity: gdy projekt ma włączony tylko nowy system wejścia, stara klasa Input rzuca wyjątek
        public static bool GetKey(KeyCode k) { throw new System.InvalidOperationException("stare wejscie jest wylaczone"); }
        public static bool GetKeyDown(KeyCode k) { throw new System.InvalidOperationException("stare wejscie jest wylaczone"); }
#else
        public static bool GetKey(KeyCode k) { return Klawisze.trzymane.Contains(k.ToString()); }
        public static bool GetKeyDown(KeyCode k) { return Klawisze.wcisniete.Contains(k.ToString()); }
#endif
    }
}

namespace UnityEngine.InputSystem
{
    public class KeyControl
    {
        readonly string nazwa;
        public KeyControl(string nazwa) { this.nazwa = nazwa; }
        public bool isPressed { get { return Klawisze.trzymane.Contains(nazwa); } }
        public bool wasPressedThisFrame { get { return Klawisze.wcisniete.Contains(nazwa); } }
    }

    public class Keyboard
    {
        public static Keyboard current = new Keyboard();
        public KeyControl wKey = new KeyControl("W"), sKey = new KeyControl("S"), aKey = new KeyControl("A"), dKey = new KeyControl("D"),
            qKey = new KeyControl("Q"), eKey = new KeyControl("E"), rKey = new KeyControl("R"),
            upArrowKey = new KeyControl("UpArrow"), downArrowKey = new KeyControl("DownArrow"),
            leftArrowKey = new KeyControl("LeftArrow"), rightArrowKey = new KeyControl("RightArrow"),
            enterKey = new KeyControl("Return"), numpadEnterKey = new KeyControl("KeypadEnter"),
            spaceKey = new KeyControl("Space"), escapeKey = new KeyControl("Escape"),
            digit1Key = new KeyControl("Alpha1"), digit2Key = new KeyControl("Alpha2"), digit3Key = new KeyControl("Alpha3"),
            numpad1Key = new KeyControl("Keypad1"), numpad2Key = new KeyControl("Keypad2"), numpad3Key = new KeyControl("Keypad3");
    }
}
