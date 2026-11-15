// Trzewia — duszki postaci w Unity. Dane jednego arkusza (np. „robotnik-3”): klatki jako Sprite'y w kolejności arkusza,
// animacje i ich sterowniki — to samo, co gra C# czyta z dane/grafika/duszki/<nazwa>.json (trzewia-cs/PLAN.md, punkt 9).
// Zasób tworzy importer (Editor/ImporterDuszkow.cs). Wybór klatki jest taki sam jak w grze: Klatka("idzie", u).
using System;
using System.Collections.Generic;
using UnityEngine;

namespace Trzewia.Unity
{
    [Serializable]
    public class AnimacjaDuszka
    {
        public string nazwa;
        /// <summary>pierwsza klatka i liczba klatek</summary>
        public int od, n;
        /// <summary>czym gra wybiera klatkę: faza (krok z przebytej drogi), fazaPion, zegar (zegar czynności w s), czas (zegar ekranu w ms), postep (0..1)</summary>
        public string ster;
        /// <summary>zegar i czas: u = frac(x · mnoz + id · przes)</summary>
        public float mnoz, przes;
        /// <summary>czas całej animacji przy zwykłym odtwarzaniu [ms]</summary>
        public float ms;
        public bool petla;
        /// <summary>true — zdjęcia w środkach przedziałów (klatka = ⌊u·n⌋); false — od początku do końca (klatka = round(u·(n−1)))</summary>
        public bool srodki;
        /// <summary>gotowy klip Unity (te same klatki w równych odstępach przez `ms`)</summary>
        public AnimationClip klip;

        /// <summary>Numer klatki w arkuszu dla sterownika u (pętle: liczy się część ułamkowa; przebiegi: 0…1).</summary>
        public int Klatka(float u)
        {
            if (n <= 1) return od;
            if (petla || srodki)
            {
                if (petla) u -= Mathf.Floor(u); else u = Mathf.Clamp01(u);
                int i = Mathf.FloorToInt(u * n);
                return od + Mathf.Clamp(i, 0, n - 1);
            }
            // zaokrąglenie „od zera”, jak Math.round w grze TS dla liczb nieujemnych
            return od + Mathf.FloorToInt(Mathf.Clamp01(u) * (n - 1) + 0.5f);
        }
    }

    /// <summary>Światła jednej klatki (poświata lampki, świecy, księgi): po 7 liczb — x, y, promień w ułamkach wysokości postaci; R, G, B (0–255); siła.</summary>
    [Serializable]
    public class SwiatlaKlatki { public float[] dane; }

    [CreateAssetMenu(menuName = "Trzewia/Duszek (dane arkusza)")]
    public class DuszekDane : ScriptableObject
    {
        public string nazwa, postac, wariant;
        /// <summary>ile razy sylwetka jest wyższa od postaci ludu (rycerz 1,3; Strażnik 2)</summary>
        public float mnoznik = 1;
        /// <summary>wysokość postaci ludu w pikselach na zaimportowanym poziomie (= piksele na jednostkę Sprite'ów)</summary>
        public float pikseliNaPostac;
        /// <summary>klatki w kolejności arkusza (pusta klatka — null); punkt zaczepienia każdej to środek stóp</summary>
        public Sprite[] klatki;
        public List<AnimacjaDuszka> animacje = new List<AnimacjaDuszka>();
        public SwiatlaKlatki[] swiatla;

        public AnimacjaDuszka Animacja(string n)
        {
            foreach (var a in animacje) if (a.nazwa == n) return a;
            return null;
        }

        /// <summary>Klatka animacji dla sterownika u — null, gdy nie ma takiej animacji albo klatka jest pusta.</summary>
        public Sprite Klatka(string animacja, float u)
        {
            var a = Animacja(animacja);
            if (a == null) return null;
            int k = a.Klatka(u);
            return k >= 0 && k < klatki.Length ? klatki[k] : null;
        }
    }
}
