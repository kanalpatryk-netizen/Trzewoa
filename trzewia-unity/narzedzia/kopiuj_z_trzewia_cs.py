#!/usr/bin/env python3
"""
Składa projekt Unity z gry C# w trzewia-cs/ — kod gry, dane i biblioteki:

  trzewia-cs/src/Trzewia.Symulacja, Trzewia.Gra, Trzewia.Skia (*.cs)  →  Assets/Trzewia/Kod/Symulacja, Gra, Skia
  trzewia-cs/dane                                                     →  Assets/StreamingAssets/dane
  SkiaSharp, HarfBuzzSharp, NLayer, ANGLE (z paczek NuGet)            →  Assets/Plugins/Trzewia (Windows i Linux x64)

UWAGA: nadpisuje te pliki tym, co jest w trzewia-cs/ — zmiany zrobione w Unity w tych folderach przepadną.
Pliki .asmdef, csc.rsp i .meta zostają. Uruchamiać z dowolnego miejsca: python3 trzewia-unity/narzedzia/kopiuj_z_trzewia_cs.py
Paczki NuGet muszą być pobrane (wystarczy raz zbudować trzewia-cs: dotnet build).
"""
import hashlib
import os
import shutil
import sys

UNITY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(UNITY)
CS = os.path.join(REPO, "trzewia-cs")
NUGET = os.environ.get("NUGET_PACKAGES") or os.path.join(os.path.expanduser("~"), ".nuget", "packages")

SKIA = "4.155.0"
HARFBUZZ = "14.4.0"
NLAYER = "3.0.1"
ANGLE = "2.1.27548.20260419"
UNSAFE = "6.0.0"


def guid(sciezka):
    """Stały identyfikator Unity dla pliku (ten sam przy każdym uruchomieniu)."""
    return hashlib.md5(("trzewia:" + sciezka.replace(os.sep, "/")).encode()).hexdigest()


def kopiuj_kod():
    for nazwa in ("Symulacja", "Gra", "Skia"):
        zrodlo = os.path.join(CS, "src", "Trzewia." + nazwa)
        cel = os.path.join(UNITY, "Assets", "Trzewia", "Kod", nazwa)
        jest = set()
        for korzen, katalogi, pliki in os.walk(zrodlo):
            katalogi[:] = [k for k in katalogi if k not in ("bin", "obj")]
            for p in pliki:
                if not p.endswith(".cs"):
                    continue
                wzgl = os.path.relpath(os.path.join(korzen, p), zrodlo)
                jest.add(wzgl)
                docel = os.path.join(cel, wzgl)
                os.makedirs(os.path.dirname(docel), exist_ok=True)
                shutil.copy2(os.path.join(korzen, p), docel)
        # pliki .cs, których już nie ma w trzewia-cs (razem z ich .meta)
        for korzen, _, pliki in os.walk(cel):
            for p in pliki:
                if p.endswith(".cs") and os.path.relpath(os.path.join(korzen, p), cel) not in jest:
                    os.remove(os.path.join(korzen, p))
                    if os.path.exists(os.path.join(korzen, p + ".meta")):
                        os.remove(os.path.join(korzen, p + ".meta"))
        print(f"kod {nazwa}: {len(jest)} plików")


def kopiuj_dane():
    zrodlo = os.path.join(CS, "dane")
    cel = os.path.join(UNITY, "Assets", "StreamingAssets", "dane")
    jest = set()
    for korzen, _, pliki in os.walk(zrodlo):
        for p in pliki:
            wzgl = os.path.relpath(os.path.join(korzen, p), zrodlo)
            jest.add(wzgl)
            docel = os.path.join(cel, wzgl)
            os.makedirs(os.path.dirname(docel), exist_ok=True)
            if not os.path.exists(docel) or os.path.getsize(docel) != os.path.getsize(os.path.join(korzen, p)) \
                    or open(docel, "rb").read() != open(os.path.join(korzen, p), "rb").read():
                shutil.copy2(os.path.join(korzen, p), docel)
    for korzen, _, pliki in os.walk(cel):
        for p in pliki:
            if p.endswith(".meta"):
                continue
            if os.path.relpath(os.path.join(korzen, p), cel) not in jest:
                os.remove(os.path.join(korzen, p))
                if os.path.exists(os.path.join(korzen, p + ".meta")):
                    os.remove(os.path.join(korzen, p + ".meta"))
    print(f"dane: {len(jest)} plików")


# platforma → (wykluczenia, ustawienia edytora, platforma gry)
PLATFORMY = {
    "Windows": ("Win64", "Windows", "x86_64"),
    "Linux": ("Linux64", "Linux", "x86_64"),
    "macOS": ("OSXUniversal", "OSX", "AnyCPU"),
}


def meta_natywnej(sciezka_w_projekcie, platforma):
    gra, os_edytora, cpu = PLATFORMY[platforma]
    wykl = {k: (0 if k == gra else 1) for k in ("Linux64", "OSXUniversal", "Win", "Win64")}
    def stan(p):
        return (1, cpu) if p == gra else (0, "None")
    linie = [
        "fileFormatVersion: 2",
        f"guid: {guid(sciezka_w_projekcie)}",
        "PluginImporter:",
        "  externalObjects: {}",
        "  serializedVersion: 2",
        "  iconMap: {}",
        "  executionOrder: {}",
        "  defineConstraints: []",
        "  isPreloaded: 0",
        "  isOverridable: 0",
        "  isExplicitlyReferenced: 0",
        "  validateReferences: 1",
        "  platformData:",
        "  - first:",
        "      : Any",
        "    second:",
        "      enabled: 0",
        "      settings:",
        "        Exclude Editor: 0",
        f"        Exclude Linux64: {wykl['Linux64']}",
        f"        Exclude OSXUniversal: {wykl['OSXUniversal']}",
        f"        Exclude Win: {wykl['Win']}",
        f"        Exclude Win64: {wykl['Win64']}",
        "  - first:",
        "      Any: ",
        "    second:",
        "      enabled: 0",
        "      settings: {}",
        "  - first:",
        "      Editor: Editor",
        "    second:",
        "      enabled: 1",
        "      settings:",
        f"        CPU: {cpu}",
        "        DefaultValueInitialized: true",
        f"        OS: {os_edytora}",
    ]
    for p in ("Linux64", "OSXUniversal", "Win", "Win64"):
        wl, c = stan(p)
        linie += ["  - first:", f"      Standalone: {p}", "    second:", f"      enabled: {wl}", "      settings:", f"        CPU: {c}"]
    linie += ["  userData: ", "  assetBundleName: ", "  assetBundleVariant: ", ""]
    return "\n".join(linie)


def meta_zarzadzanej(sciezka_w_projekcie):
    return "\n".join([
        "fileFormatVersion: 2",
        f"guid: {guid(sciezka_w_projekcie)}",
        "PluginImporter:",
        "  externalObjects: {}",
        "  serializedVersion: 2",
        "  iconMap: {}",
        "  executionOrder: {}",
        "  defineConstraints: []",
        "  isPreloaded: 0",
        "  isOverridable: 0",
        "  isExplicitlyReferenced: 0",
        "  validateReferences: 1",
        "  platformData:",
        "  - first:",
        "      Any: ",
        "    second:",
        "      enabled: 1",
        "      settings: {}",
        "  - first:",
        "      Editor: Editor",
        "    second:",
        "      enabled: 0",
        "      settings:",
        "        DefaultValueInitialized: true",
        "  userData: ",
        "  assetBundleName: ",
        "  assetBundleVariant: ",
        "",
    ])


def wtyczka(zrodlo, wzgl_cel, meta):
    if not os.path.exists(zrodlo):
        sys.exit(f"brak {zrodlo} — zbuduj najpierw trzewia-cs (dotnet build), żeby pobrać paczki NuGet")
    cel = os.path.join(UNITY, wzgl_cel)
    os.makedirs(os.path.dirname(cel), exist_ok=True)
    shutil.copy2(zrodlo, cel)
    with open(cel + ".meta", "w", newline="\n") as f:
        f.write(meta)


def kopiuj_wtyczki():
    P = "Assets/Plugins/Trzewia"
    zarz = [
        (f"skiasharp/{SKIA}/lib/netstandard2.1/SkiaSharp.dll", "SkiaSharp.dll"),
        (f"skiasharp.harfbuzz/{SKIA}/lib/netstandard2.1/SkiaSharp.HarfBuzz.dll", "SkiaSharp.HarfBuzz.dll"),
        (f"harfbuzzsharp/{HARFBUZZ}/lib/netstandard2.1/HarfBuzzSharp.dll", "HarfBuzzSharp.dll"),
        (f"nlayer/{NLAYER}/lib/netstandard2.0/NLayer.dll", "NLayer.dll"),
        (f"system.runtime.compilerservices.unsafe/{UNSAFE}/lib/netstandard2.0/System.Runtime.CompilerServices.Unsafe.dll",
         "System.Runtime.CompilerServices.Unsafe.dll"),
    ]
    for z, c in zarz:
        wzgl = f"{P}/Biblioteki/{c}"
        wtyczka(os.path.join(NUGET, z), wzgl, meta_zarzadzanej(wzgl))
    natywne = [
        (f"skiasharp.nativeassets.win32/{SKIA}/runtimes/win-x64/native/libSkiaSharp.dll", "Windows/x86_64/libSkiaSharp.dll", "Windows"),
        (f"harfbuzzsharp.nativeassets.win32/{HARFBUZZ}/runtimes/win-x64/native/libHarfBuzzSharp.dll", "Windows/x86_64/libHarfBuzzSharp.dll", "Windows"),
        (f"avalonia.angle.windows.natives/{ANGLE}/runtimes/win-x64/native/av_libglesv2.dll", "Windows/x86_64/av_libglesv2.dll", "Windows"),
        (f"skiasharp.nativeassets.linux/{SKIA}/runtimes/linux-x64/native/libSkiaSharp.so", "Linux/x86_64/libSkiaSharp.so", "Linux"),
        (f"harfbuzzsharp.nativeassets.linux/{HARFBUZZ}/runtimes/linux-x64/native/libHarfBuzzSharp.so", "Linux/x86_64/libHarfBuzzSharp.so", "Linux"),
    ]
    for z, c, plat in natywne:
        wzgl = f"{P}/{c}"
        wtyczka(os.path.join(NUGET, z), wzgl, meta_natywnej(wzgl, plat))
    print(f"wtyczki: {len(zarz)} zarządzanych, {len(natywne)} natywnych")


if __name__ == "__main__":
    kopiuj_kod()
    kopiuj_dane()
    kopiuj_wtyczki()
