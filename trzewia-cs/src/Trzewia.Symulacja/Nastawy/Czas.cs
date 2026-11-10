using System;
using System.Collections.Generic;
using System.Linq;
// Port: alpha-1/src/nastawy/czas.ts
namespace Trzewia.Nastawy
{

/// <summary>
/// CZAS — jak liczy się czas gry.
///
/// Symulacja idzie w tikach: zwykły czas to 120 tików na sekundę (TEMPO.tikowNaSekunde
/// w Nastawy/Sterowanie.cs), niezależnie od klatek obrazu. Wszystkie „tiki” w innych
/// nastawach przeliczaj przez TIKOW_NA_MINUTE: 600 tików to 1/12 minuty gry.
/// </summary>
public static class CZAS
{
    /// <summary>Ile tików trwa jedna minuta gry (do przeliczeń w kronice, rytuale i wyroku).</summary>
    public const int TIKOW_NA_MINUTE = 7200;
}
}
