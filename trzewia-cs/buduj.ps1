# Buduje grę do wysyłki (Windows, PowerShell): folder jak w grach ze Steama (Trzewia.exe, biblioteki, dane/) i zip.
#   .\buduj.ps1                      → publikacja\win-x64\Trzewia\ i publikacja\Trzewia-win-x64.zip
#   .\buduj.ps1 -JedenPlik           → jeden plik Trzewia.exe (na testy; dane w środku)
# Potrzebny .NET 10 SDK (https://dotnet.microsoft.com/download).
param([string]$Rid = "win-x64", [switch]$JedenPlik)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$cel = "publikacja\$Rid"
if (Test-Path $cel) { Remove-Item -Recurse -Force $cel }
if ($JedenPlik) {
  dotnet publish src\Trzewia\Trzewia.csproj -c Release -r $Rid --self-contained -p:JedenPlik=true -o "$cel\Trzewia-jeden-plik"
  Write-Host "Jeden plik: $cel\Trzewia-jeden-plik\Trzewia.exe"
  exit 0
}
dotnet publish src\Trzewia\Trzewia.csproj -c Release -r $Rid --self-contained -o "$cel\Trzewia"
New-Item -ItemType Directory -Force "$cel\symbole" | Out-Null
Get-ChildItem "$cel\Trzewia\*.pdb" | Move-Item -Destination "$cel\symbole"
$zip = "publikacja\Trzewia-$Rid.zip"
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path "$cel\Trzewia" -DestinationPath $zip -CompressionLevel Optimal
Write-Host "Folder: $cel\Trzewia, zip: $zip"
