using System;
using System.Collections.Generic;
using System.Linq;
namespace Trzewia.Aplikacja
{

/// <summary>Faza wskaźnika: jak pointerdown / pointermove / pointerup w TS ('dol' | 'ruch' | 'gora').</summary>
public enum Faza { dol, ruch, gora }

/// <summary>
/// Zdarzenie wskaźnika (mysz) w pikselach logicznych gry — te pola, których używa kod TS z PointerEvent.
/// button: 0 lewy, 1 środkowy, 2 prawy; buttons: maska 1 lewy, 2 prawy, 4 środkowy (jak w przeglądarce).
/// </summary>
public sealed class Wskaznik
{
    public double clientX, clientY;
    public int button = -1, buttons;
    public bool shiftKey, ctrlKey, altKey;
    public int pointerId = 1;
    public string pointerType = "mouse";
    public void preventDefault() { }
}

/// <summary>Zdarzenie kółka w pikselach logicznych; deltaY &gt; 0 — kółko do siebie (oddala), jak WheelEvent.</summary>
public sealed class Kolko
{
    public double clientX, clientY;
    /// <summary>Jeden ząbek kółka to 100 (tyle podaje Chrome na Windows), przewijanie płytką dotykową — mniej.</summary>
    public double deltaX, deltaY;
    public int deltaMode;
    public bool shiftKey, ctrlKey;
    public void preventDefault() { }
}

/// <summary>Zdarzenie klawisza: key jak KeyboardEvent.key (' ', 'Escape', 'ArrowUp', 'q', 'Q', '+'), code jak KeyboardEvent.code.</summary>
public sealed class Klawisz
{
    public string key = "", code = "";
    public bool shiftKey, ctrlKey, altKey, metaKey, repeat;
    public void preventDefault() { }
}
}
