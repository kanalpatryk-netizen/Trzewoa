global using System;
global using System.Collections.Generic;

// Nastawy są wspólne dla całej gry (pola statyczne) — test, który je na chwilę zmienia, nie może biec obok testów
// świata i symulacji.
[assembly: Xunit.CollectionBehavior(DisableTestParallelization = true)]
