using SDL;

namespace Trzewia.Okno;

/// <summary>
/// Klawisz z SDL → nazwa jak KeyboardEvent.key w przeglądarce (' ', 'Escape', 'ArrowUp', 'F3', 'q', 'Q', '+'),
/// żeby przypisania z Rdzen/Keybinds.cs i kod ekranów działały tak samo jak w TS. SDL3 domyślnie podaje znak
/// z uwzględnieniem Shift (Shift+= → '+', Shift+q → 'Q') — tak jak e.key.
/// </summary>
public static class Klawisze
{
    const uint MaskaSkanu = 0x40000000;

    public static string Nazwa(uint kod, uint skan, SDL_Keymod mod)
    {
        switch (kod)
        {
            case 13: return "Enter";
            case 27: return "Escape";
            case 8: return "Backspace";
            case 9: return "Tab";
            case 127: return "Delete";
        }
        if ((kod & MaskaSkanu) == 0)
        {
            // zwykły znak (także polskie litery z AltGr)
            return kod <= 0xFFFF ? ((char)kod).ToString() : char.ConvertFromUtf32((int)kod);
        }
        bool numLock = (mod & SDL_Keymod.SDL_KMOD_NUM) != 0;
        uint s = kod & ~MaskaSkanu;
        switch (s)
        {
            case >= 58 and <= 69: return "F" + (s - 57);          // F1–F12
            case >= 104 and <= 115: return "F" + (s - 91);        // F13–F24
            case 57: return "CapsLock";
            case 70: return "PrintScreen";
            case 71: return "ScrollLock";
            case 72: return "Pause";
            case 73: return "Insert";
            case 74: return "Home";
            case 75: return "PageUp";
            case 77: return "End";
            case 78: return "PageDown";
            case 79: return "ArrowRight";
            case 80: return "ArrowLeft";
            case 81: return "ArrowDown";
            case 82: return "ArrowUp";
            case 83: return "NumLock";
            case 84: return "/";
            case 85: return "*";
            case 86: return "-";
            case 87: return "+";
            case 88: return "Enter";
            case >= 89 and <= 97: return numLock ? ((char)('1' + (s - 89))).ToString() : NumBezBlokady(s);
            case 98: return numLock ? "0" : "Insert";
            case 99: return numLock ? "." : "Delete";
            case 101: return "ContextMenu";
            case 224: case 228: return "Control";
            case 225: case 229: return "Shift";
            case 226: return "Alt";
            case 230: return "AltGraph";
            case 227: case 231: return "Meta";
        }
        return "Unidentified";
    }

    static string NumBezBlokady(uint s) => s switch
    {
        89 => "End", 90 => "ArrowDown", 91 => "PageDown", 92 => "ArrowLeft", 93 => "Clear",
        94 => "ArrowRight", 95 => "Home", 96 => "ArrowUp", _ => "PageUp",
    };

    /// <summary>Fizyczny klawisz jak KeyboardEvent.code („KeyA”, „Digit1”, „Space”…) — tylko najczęstsze.</summary>
    public static string Kod(uint skan) => skan switch
    {
        >= 4 and <= 29 => "Key" + (char)('A' + (skan - 4)),
        >= 30 and <= 38 => "Digit" + (char)('1' + (skan - 30)),
        39 => "Digit0",
        40 => "Enter", 41 => "Escape", 42 => "Backspace", 43 => "Tab", 44 => "Space",
        45 => "Minus", 46 => "Equal", 47 => "BracketLeft", 48 => "BracketRight",
        >= 58 and <= 69 => "F" + (skan - 57),
        79 => "ArrowRight", 80 => "ArrowLeft", 81 => "ArrowDown", 82 => "ArrowUp",
        86 => "NumpadSubtract", 87 => "NumpadAdd",
        225 => "ShiftLeft", 229 => "ShiftRight", 224 => "ControlLeft", 228 => "ControlRight",
        _ => "",
    };
}
