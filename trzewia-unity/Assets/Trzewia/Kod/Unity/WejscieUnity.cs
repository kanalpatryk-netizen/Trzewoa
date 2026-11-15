// Mysz i klawiatura z Unity do gry — jak zdarzenia przeglądarki w TS i Okno/OknoGry.cs + Okno/Klawisze.cs w Trzewia.exe:
// pozycja w pikselach CSS (piksele okna / gęstość ekranu), przyciski i maska przycisków jak w przeglądarce, kółko po 100
// na ząbek (Chrome na Windows), klawisze jako KeyboardEvent.key („a”, „A”, „ą”, „Escape”, „ArrowUp”, „F3”, „ ”) i .code
// („KeyA”, „Digit1”…), z powtarzaniem przy przytrzymaniu. F11 (pełny ekran) zostaje u gospodarza, gra go nie widzi.
using System;
using System.Collections.Generic;
using Trzewia.Aplikacja;
using Trzewia.Most;
using UnityEngine;

namespace Trzewia.Unity
{
    public sealed class WejscieUnity
    {
        Vector3 ostatniaMysz = new Vector3(float.NaN, float.NaN, 0);
        readonly HashSet<KeyCode> wcisniete = new HashSet<KeyCode>();
        /// <summary>Jaki „key” poszedł do gry przy wciśnięciu — ten sam przy puszczeniu.</summary>
        readonly Dictionary<KeyCode, string> nazwy = new Dictionary<KeyCode, string>();
        /// <summary>
        /// Klawisz znaku czeka na zdarzenie ze znakiem (Unity podaje je osobno: najpierw klawisz, potem znak z Shiftem
        /// i AltGr) — „key” w przeglądarce to właśnie ten znak.
        /// </summary>
        KeyCode czeka = KeyCode.None;
        bool czekaPowtorka, czekaShift, czekaCtrl, czekaAlt, czekaMeta;

        static readonly KeyCode[] Przyciski = { KeyCode.Mouse0, KeyCode.Mouse1, KeyCode.Mouse2 };

        /// <summary>Unity: 0 lewy, 1 prawy, 2 środkowy → przeglądarka: 0 lewy, 1 środkowy, 2 prawy.</summary>
        static int Przycisk(int u) => u == 0 ? 0 : u == 1 ? 2 : 1;

        /// <summary>Maska wciśniętych przycisków jak w przeglądarce (lewy 1, prawy 2, środkowy 4).</summary>
        static int Maska() => (Input.GetMouseButton(0) ? 1 : 0) | (Input.GetMouseButton(1) ? 2 : 0) | (Input.GetMouseButton(2) ? 4 : 0);

        static bool Shift => Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
        static bool Ctrl => Input.GetKey(KeyCode.LeftControl) || Input.GetKey(KeyCode.RightControl);
        static bool Alt => Input.GetKey(KeyCode.LeftAlt) || Input.GetKey(KeyCode.RightAlt);

        /// <summary>Mysz: ruch, przyciski i kółko z bieżącej klatki Unity (zawołać w Update).</summary>
        public void Mysz(WatekGry gra, KursorUnity kursor, double dpr)
        {
            var p = Input.mousePosition;
            double x = p.x / dpr, y = (Screen.height - p.y) / dpr;
            bool sh = Shift, ct = Ctrl, al = Alt;
            int maska = Maska();
            if (p != ostatniaMysz)
            {
                ostatniaMysz = p;
                kursor.Ruch(maska);
                gra.Wejscie(app => app.NaWskaznik(Faza.ruch, x, y, -1, maska, sh, ct, al));
            }
            for (int u = 0; u < 3; u++)
            {
                if (Input.GetMouseButtonDown(u))
                {
                    kursor.Wcisnij();
                    int b = Przycisk(u);
                    gra.Wejscie(app => app.NaWskaznik(Faza.dol, x, y, b, maska, sh, ct, al));
                }
                if (Input.GetMouseButtonUp(u))
                {
                    kursor.Pusc();
                    int b = Przycisk(u);
                    gra.Wejscie(app => app.NaWskaznik(Faza.gora, x, y, b, maska, sh, ct, al));
                }
            }
            var k = Input.mouseScrollDelta;
            if (k.x != 0 || k.y != 0)
            {
                // Unity: y > 0 — kółko od siebie; przeglądarka: deltaY < 0. Ząbek = 100 (Chrome na Windows)
                double dx = k.x * 100, dy = -k.y * 100;
                gra.Wejscie(app => app.NaKolko(x, y, dx, dy, sh, ct));
            }
        }

        /// <summary>Klawiatura ze zdarzeń IMGUI (zawołać w OnGUI dla każdego zdarzenia).</summary>
        public void Zdarzenie(Event e, WatekGry gra)
        {
            if (e.type == EventType.KeyDown)
            {
                if (e.keyCode == KeyCode.None)
                {
                    // znak do klawisza, który właśnie przyszedł (albo sam znak, np. z metody wprowadzania)
                    var c = e.character;
                    if (c == '\0' || char.IsControl(c)) return;
                    if (czeka != KeyCode.None)
                    {
                        Wyslij(gra, czeka, c.ToString(), czekaPowtorka, czekaShift, czekaCtrl, czekaAlt, czekaMeta);
                        czeka = KeyCode.None;
                    }
                    else Wyslij(gra, KeyCode.None, c.ToString(), false, e.shift, e.control, e.alt, e.command);
                    return;
                }
                if (e.keyCode == KeyCode.F11) return;
                Dokoncz(gra);
                bool powtorka = !wcisniete.Add(e.keyCode);
                var nazwa = Nazwa(e.keyCode);
                if (nazwa != null) { Wyslij(gra, e.keyCode, nazwa, powtorka, e.shift, e.control, e.alt, e.command); return; }
                // znak: czekamy na zdarzenie ze znakiem; Unity bywa, że podaje go od razu w tym samym zdarzeniu
                if (e.character != '\0' && !char.IsControl(e.character))
                {
                    Wyslij(gra, e.keyCode, e.character.ToString(), powtorka, e.shift, e.control, e.alt, e.command);
                    return;
                }
                czeka = e.keyCode; czekaPowtorka = powtorka;
                czekaShift = e.shift; czekaCtrl = e.control; czekaAlt = e.alt; czekaMeta = e.command;
            }
            else if (e.type == EventType.KeyUp && e.keyCode != KeyCode.None)
            {
                if (e.keyCode == KeyCode.F11) return;
                Dokoncz(gra);
                wcisniete.Remove(e.keyCode);
                if (!nazwy.TryGetValue(e.keyCode, out var nazwa)) nazwa = Nazwa(e.keyCode) ?? Znak(e.keyCode, e.shift) ?? "Unidentified";
                nazwy.Remove(e.keyCode);
                var z = new Klawisz
                {
                    key = nazwa, code = Kod(e.keyCode),
                    shiftKey = e.shift, ctrlKey = e.control, altKey = e.alt, metaKey = e.command,
                };
                gra.Wejscie(app => app.NaKlawiszPuszczony(z));
            }
        }

        /// <summary>Koniec klatki: klawisz, do którego nie przyszedł znak (np. z Ctrl), idzie z nazwą z układu US.</summary>
        public void KoniecKlatki(WatekGry? gra)
        {
            if (gra != null) Dokoncz(gra);
            // klawisze puszczone, gdy okno nie miało fokusu — Unity nie przyśle KeyUp
            if (wcisniete.Count > 0 && !Input.anyKey) { wcisniete.Clear(); nazwy.Clear(); }
        }

        void Dokoncz(WatekGry gra)
        {
            if (czeka == KeyCode.None) return;
            var nazwa = Znak(czeka, czekaShift) ?? "Unidentified";
            Wyslij(gra, czeka, nazwa, czekaPowtorka, czekaShift, czekaCtrl, czekaAlt, czekaMeta);
            czeka = KeyCode.None;
        }

        void Wyslij(WatekGry gra, KeyCode kod, string nazwa, bool powtorka, bool shift, bool ctrl, bool alt, bool meta)
        {
            if (kod != KeyCode.None) nazwy[kod] = nazwa;
            var z = new Klawisz
            {
                key = nazwa, code = Kod(kod),
                shiftKey = shift, ctrlKey = ctrl, altKey = alt, metaKey = meta, repeat = powtorka,
            };
            gra.Wejscie(app => app.NaKlawisz(z));
        }

        /// <summary>Klawisze bez znaku → KeyboardEvent.key; null — klawisz znaku.</summary>
        static string? Nazwa(KeyCode k)
        {
            if (k >= KeyCode.F1 && k <= KeyCode.F15) return "F" + (k - KeyCode.F1 + 1);
            switch (k)
            {
                case KeyCode.Return: case KeyCode.KeypadEnter: return "Enter";
                case KeyCode.Escape: return "Escape";
                case KeyCode.Backspace: return "Backspace";
                case KeyCode.Tab: return "Tab";
                case KeyCode.Delete: return "Delete";
                case KeyCode.Insert: return "Insert";
                case KeyCode.Home: return "Home";
                case KeyCode.End: return "End";
                case KeyCode.PageUp: return "PageUp";
                case KeyCode.PageDown: return "PageDown";
                case KeyCode.UpArrow: return "ArrowUp";
                case KeyCode.DownArrow: return "ArrowDown";
                case KeyCode.LeftArrow: return "ArrowLeft";
                case KeyCode.RightArrow: return "ArrowRight";
                case KeyCode.CapsLock: return "CapsLock";
                case KeyCode.Numlock: return "NumLock";
                case KeyCode.ScrollLock: return "ScrollLock";
                case KeyCode.Pause: case KeyCode.Break: return "Pause";
                case KeyCode.Print: case KeyCode.SysReq: return "PrintScreen";
                case KeyCode.Clear: return "Clear";
                case KeyCode.Menu: return "ContextMenu";
                case KeyCode.LeftShift: case KeyCode.RightShift: return "Shift";
                case KeyCode.LeftControl: case KeyCode.RightControl: return "Control";
                case KeyCode.LeftAlt: return "Alt";
                case KeyCode.RightAlt: case KeyCode.AltGr: return "AltGraph";
                case KeyCode.LeftCommand: case KeyCode.RightCommand: case KeyCode.LeftWindows: case KeyCode.RightWindows: return "Meta";
            }
            return null;
        }

        /// <summary>Znak klawisza w układzie US (gdy Unity nie podało znaku — np. z Ctrl).</summary>
        static string? Znak(KeyCode k, bool shift)
        {
            if (k >= KeyCode.A && k <= KeyCode.Z)
            {
                var c = (char)('a' + (k - KeyCode.A));
                return (shift ? char.ToUpperInvariant(c) : c).ToString();
            }
            if (k >= KeyCode.Alpha0 && k <= KeyCode.Alpha9)
                return shift ? ")!@#$%^&*(".Substring(k - KeyCode.Alpha0, 1) : ((char)('0' + (k - KeyCode.Alpha0))).ToString();
            if (k >= KeyCode.Keypad0 && k <= KeyCode.Keypad9) return ((char)('0' + (k - KeyCode.Keypad0))).ToString();
            switch (k)
            {
                case KeyCode.Space: return " ";
                case KeyCode.Minus: return shift ? "_" : "-";
                case KeyCode.Equals: return shift ? "+" : "=";
                case KeyCode.LeftBracket: return shift ? "{" : "[";
                case KeyCode.RightBracket: return shift ? "}" : "]";
                case KeyCode.Backslash: return shift ? "|" : "\\";
                case KeyCode.Semicolon: return shift ? ":" : ";";
                case KeyCode.Quote: return shift ? "\"" : "'";
                case KeyCode.Comma: return shift ? "<" : ",";
                case KeyCode.Period: return shift ? ">" : ".";
                case KeyCode.Slash: return shift ? "?" : "/";
                case KeyCode.BackQuote: return shift ? "~" : "`";
                case KeyCode.KeypadPeriod: return ".";
                case KeyCode.KeypadDivide: return "/";
                case KeyCode.KeypadMultiply: return "*";
                case KeyCode.KeypadMinus: return "-";
                case KeyCode.KeypadPlus: return "+";
                case KeyCode.KeypadEquals: return "=";
                case KeyCode.Plus: return "+";
            }
            return null;
        }

        /// <summary>Fizyczny klawisz jak KeyboardEvent.code („KeyA”, „Digit1”, „Space”…) — te same co w Trzewia.exe.</summary>
        static string Kod(KeyCode k)
        {
            if (k >= KeyCode.A && k <= KeyCode.Z) return "Key" + (char)('A' + (k - KeyCode.A));
            if (k >= KeyCode.Alpha0 && k <= KeyCode.Alpha9) return "Digit" + (char)('0' + (k - KeyCode.Alpha0));
            if (k >= KeyCode.F1 && k <= KeyCode.F12) return "F" + (k - KeyCode.F1 + 1);
            switch (k)
            {
                case KeyCode.Return: return "Enter";
                case KeyCode.Escape: return "Escape";
                case KeyCode.Backspace: return "Backspace";
                case KeyCode.Tab: return "Tab";
                case KeyCode.Space: return "Space";
                case KeyCode.Minus: return "Minus";
                case KeyCode.Equals: return "Equal";
                case KeyCode.LeftBracket: return "BracketLeft";
                case KeyCode.RightBracket: return "BracketRight";
                case KeyCode.RightArrow: return "ArrowRight";
                case KeyCode.LeftArrow: return "ArrowLeft";
                case KeyCode.DownArrow: return "ArrowDown";
                case KeyCode.UpArrow: return "ArrowUp";
                case KeyCode.KeypadMinus: return "NumpadSubtract";
                case KeyCode.KeypadPlus: return "NumpadAdd";
                case KeyCode.LeftShift: return "ShiftLeft";
                case KeyCode.RightShift: return "ShiftRight";
                case KeyCode.LeftControl: return "ControlLeft";
                case KeyCode.RightControl: return "ControlRight";
            }
            return "";
        }
    }
}
