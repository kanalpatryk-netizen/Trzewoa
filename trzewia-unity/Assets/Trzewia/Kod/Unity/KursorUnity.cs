// Port: alpha-1/src/core/kursor.ts — rękawica jako kursor Unity (w Trzewia.exe: Okno/Kursor.cs, kursor SDL).
// Zwykle kursor1.png, póki przycisk myszy jest wciśnięty — kursor2.png (najkrócej KURSOR.klikMinMs).
// Brak obrazka — zostaje zwykła strzałka.
using System;
using Trzewia.Most;
using Trzewia.Rdzen;
using UnityEngine;
using static Trzewia.Nastawy.NastawyEkran;

namespace Trzewia.Unity
{
    public sealed class KursorUnity : IDisposable
    {
        Texture2D? zwykly, klik;
        Vector2 czubekZwykly, czubekKlik;
        double gestosc = -1;
        bool wcisniety;
        double wcisnietyOd, puscO = -1;

        /// <summary>Rękawice dla tej gęstości ekranu (od nowa, gdy okno przejdzie na ekran o innej skali).</summary>
        public void Ustaw(double dpr)
        {
            if (dpr == gestosc) return;
            gestosc = dpr;
            Zwolnij();
            zwykly = Rekawica("grafika/kursor1.png", KURSOR.czubek.x, KURSOR.czubek.y, dpr, out czubekZwykly);
            klik = Rekawica("grafika/kursor2.png", KURSOR.czubekKlik.x, KURSOR.czubekKlik.y, dpr, out czubekKlik);
            Pokaz(wcisniety);
        }

        void Pokaz(bool k)
        {
            puscO = -1;
            wcisniety = k;
            var t = k ? klik : zwykly;
            if (t != null) Cursor.SetCursor(t, k ? czubekKlik : czubekZwykly, CursorMode.Auto);
        }

        public void Wcisnij() { Pokaz(true); wcisnietyOd = Wydajnosc.Teraz(); }

        public void Pusc()
        {
            if (!wcisniety) return;
            puscO = Math.Max(Wydajnosc.Teraz(), wcisnietyOd + KURSOR.klikMinMs);
        }

        public void Ruch(int przyciski) { if (wcisniety && przyciski == 0 && puscO < 0) Pusc(); }

        public void Rozmycie() => Pokaz(false);

        public void Krok() { if (puscO >= 0 && Wydajnosc.Teraz() >= puscO) Pokaz(false); }

        static Texture2D? Rekawica(string plik, double czubekX, double czubekY, double dpr, out Vector2 czubek)
        {
            czubek = Vector2.zero;
            var o = ObrazKursora.Zrob(plik, czubekX, czubekY, KURSOR.rozmiar, dpr);
            if (o == null) return null;
            // Unity: wiersze tekstury od dołu
            var odwr = new byte[o.Piksele.Length];
            int wiersz = o.W * 4;
            for (int y = 0; y < o.H; y++) Buffer.BlockCopy(o.Piksele, y * wiersz, odwr, (o.H - 1 - y) * wiersz, wiersz);
            var t = new Texture2D(o.W, o.H, TextureFormat.RGBA32, false) { name = plik, filterMode = FilterMode.Bilinear, wrapMode = TextureWrapMode.Clamp };
            t.LoadRawTextureData(odwr);
            t.Apply(false, false);
            czubek = new Vector2(o.CzubekX, o.CzubekY);
            return t;
        }

        void Zwolnij()
        {
            Cursor.SetCursor(null, Vector2.zero, CursorMode.Auto);
            if (zwykly != null) { UnityEngine.Object.Destroy(zwykly); zwykly = null; }
            if (klik != null) { UnityEngine.Object.Destroy(klik); klik = null; }
        }

        public void Dispose() => Zwolnij();
    }
}
