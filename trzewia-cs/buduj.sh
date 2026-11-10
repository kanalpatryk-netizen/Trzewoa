#!/usr/bin/env bash
# Buduje grę do wysyłki: folder jak w grach ze Steama (Trzewia.exe, biblioteki, dane/) i zip.
#   ./buduj.sh                 → publikacja/win-x64/Trzewia/ i publikacja/Trzewia-win-x64.zip
#   ./buduj.sh linux-x64       → to samo na Linuksa (do testów)
#   ./buduj.sh win-x64 jeden-plik → jeden plik Trzewia.exe (na testy; dane w środku)
# Potrzebny .NET 10 SDK; biblioteki (SkiaSharp, SDL3, ANGLE) i pakiety .NET dla Windows przychodzą z NuGet.
set -euo pipefail
cd "$(dirname "$0")"
RID="${1:-win-x64}"
TRYB="${2:-folder}"
CEL="publikacja/$RID"
rm -rf "$CEL"
if [ "$TRYB" = "jeden-plik" ]; then
  dotnet publish src/Trzewia/Trzewia.csproj -c Release -r "$RID" --self-contained -p:JedenPlik=true -o "$CEL/Trzewia-jeden-plik"
  echo "Jeden plik: $CEL/Trzewia-jeden-plik/"
  ls -la "$CEL/Trzewia-jeden-plik/"
  exit 0
fi
dotnet publish src/Trzewia/Trzewia.csproj -c Release -r "$RID" --self-contained -o "$CEL/Trzewia"
# symbole do szukania błędów zostają obok, nie w paczce dla gracza
mkdir -p "$CEL/symbole"
find "$CEL/Trzewia" -maxdepth 1 -name "*.pdb" -exec mv {} "$CEL/symbole/" \;
( cd "$CEL" && rm -f "../Trzewia-$RID.zip" && zip -qr9 "../Trzewia-$RID.zip" Trzewia )
echo "Folder: $CEL/Trzewia ($(du -sh "$CEL/Trzewia" | cut -f1)), zip: publikacja/Trzewia-$RID.zip ($(du -h "publikacja/Trzewia-$RID.zip" | cut -f1))"
