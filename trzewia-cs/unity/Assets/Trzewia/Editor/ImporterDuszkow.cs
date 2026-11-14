// Trzewia — importer duszków do Unity. Skopiuj folder trzewia-cs/dane/grafika/duszki do projektu (np. Assets/Trzewia/
// Duszki/Arkusze), zaznacz go w oknie Project i wybierz z menu: Trzewia → Importuj duszki z zaznaczonego folderu.
// Dla każdego <nazwa>.json importer:
//   1. tnie strony PNG jednego poziomu wielkości na Sprite'y (prostokąt i punkt zaczepienia — środek stóp — z opisu),
//   2. tworzy zasób DuszekDane (klatki w kolejności arkusza, animacje ze sterownikami, światła klatek),
//   3. tworzy klipy animacji (.anim, klatki w równych odstępach) i kontroler Animatora ze stanem na każdą animację.
// Format opisu: trzewia-cs/PLAN.md, punkt 9. UWAGA: skrypt napisany bez dostępu do Unity — nie był uruchamiany
// (środowisko, w którym powstał port, nie ma Unity); poprawki po pierwszym imporcie są możliwe.
#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;

namespace Trzewia.Unity
{
    public static class ImporterDuszkow
    {
        [MenuItem("Trzewia/Importuj duszki z zaznaczonego folderu (największy poziom)")]
        public static void ImportujNajwiekszy() => Importuj(-1);

        [MenuItem("Trzewia/Importuj duszki z zaznaczonego folderu (poziom 40 px — zwykłe przybliżenie)")]
        public static void ImportujSredni() => Importuj(40);

        static void Importuj(int wysokosc)
        {
            var folder = AssetDatabase.GetAssetPath(Selection.activeObject);
            if (string.IsNullOrEmpty(folder) || !AssetDatabase.IsValidFolder(folder)) { Debug.LogError("Trzewia: zaznacz folder z arkuszami (pliki .json i .png)."); return; }
            var opisy = Directory.GetFiles(folder, "*.json").OrderBy(x => x).ToArray();
            int ile = 0;
            try
            {
                foreach (var plik in opisy)
                {
                    EditorUtility.DisplayProgressBar("Trzewia — duszki", Path.GetFileName(plik), ile / (float)opisy.Length);
                    if (ImportujArkusz(plik.Replace('\\', '/'), wysokosc)) ile++;
                }
            }
            finally { EditorUtility.ClearProgressBar(); }
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log($"Trzewia: zaimportowano {ile} arkuszy duszków z {folder}.");
        }

        static bool ImportujArkusz(string plikJson, int wysokosc)
        {
            if (!(MiniJson.Czytaj(File.ReadAllText(plikJson)) is Dictionary<string, object> o) || !o.ContainsKey("poziomy")) return false;
            var folder = Path.GetDirectoryName(plikJson).Replace('\\', '/');
            var nazwa = Path.GetFileNameWithoutExtension(plikJson);
            var poziomy = (List<object>)o["poziomy"];
            // poziom: żądana wysokość albo największy
            Dictionary<string, object> poziom = null;
            foreach (Dictionary<string, object> p in poziomy)
                if (poziom == null || (wysokosc > 0 ? Math.Abs(L(p["h"]) - wysokosc) < Math.Abs(L(poziom["h"]) - wysokosc) : L(p["h"]) > L(poziom["h"]))) poziom = p;
            float h = (float)L(poziom["h"]);
            var strony = ((List<object>)poziom["strony"]).Select(x => (string)x).ToArray();
            var klatki = (List<object>)poziom["klatki"];

            // 1. strony → Sprite'y
            var sprite = new Sprite[klatki.Count];
            for (int s = 0; s < strony.Length; s++)
            {
                var sciezka = folder + "/" + strony[s];
                var ti = AssetImporter.GetAtPath(sciezka) as TextureImporter;
                if (ti == null) { Debug.LogError("Trzewia: brak strony arkusza " + sciezka); return false; }
                int wysTekstury = WysokoscPng(sciezka);
                var meta = new List<SpriteMetaData>();
                for (int k = 0; k < klatki.Count; k++)
                {
                    var kl = (List<object>)klatki[k];
                    if ((int)L(kl[0]) != s) continue;
                    float x = (float)L(kl[1]), y = (float)L(kl[2]), w = (float)L(kl[3]), wys = (float)L(kl[4]), ox = (float)L(kl[5]), oy = (float)L(kl[6]);
                    if (w <= 0 || wys <= 0) continue;                    // pusta klatka
                    meta.Add(new SpriteMetaData
                    {
                        name = $"{nazwa}_{k:0000}",
                        rect = new Rect(x, wysTekstury - y - wys, w, wys),        // Unity liczy od dołu
                        alignment = (int)SpriteAlignment.Custom,
                        // (ox, oy) — lewy górny róg klatki względem środka stóp (y w dół) → punkt zaczepienia w ułamkach klatki
                        pivot = new Vector2(-ox / w, 1f + oy / wys),
                    });
                }
                ti.textureType = TextureImporterType.Sprite;
                ti.spriteImportMode = SpriteImportMode.Multiple;
                ti.spritePixelsPerUnit = h;                              // postać ludu = 1 jednostka wysokości
                ti.mipmapEnabled = false;
                ti.alphaIsTransparency = true;
                ti.filterMode = FilterMode.Bilinear;
                ti.textureCompression = TextureImporterCompression.Uncompressed;
                ti.maxTextureSize = 4096;
#pragma warning disable 0618
                ti.spritesheet = meta.ToArray();
#pragma warning restore 0618
                EditorUtility.SetDirty(ti);
                ti.SaveAndReimport();
                foreach (var a in AssetDatabase.LoadAllAssetsAtPath(sciezka).OfType<Sprite>())
                {
                    int podkr = a.name.LastIndexOf('_');
                    if (podkr >= 0 && int.TryParse(a.name.Substring(podkr + 1), out int nr) && nr < sprite.Length) sprite[nr] = a;
                }
            }

            // 2. zasób z danymi arkusza
            var wyj = folder + "/" + nazwa + "_unity";
            if (!AssetDatabase.IsValidFolder(wyj)) AssetDatabase.CreateFolder(folder, nazwa + "_unity");
            var danePlik = wyj + "/" + nazwa + ".asset";
            var dane = AssetDatabase.LoadAssetAtPath<DuszekDane>(danePlik);
            if (dane == null) { dane = ScriptableObject.CreateInstance<DuszekDane>(); AssetDatabase.CreateAsset(dane, danePlik); }
            dane.nazwa = nazwa;
            dane.postac = o.TryGetValue("postac", out var po) ? po as string : "";
            dane.wariant = o.TryGetValue("wariant", out var wa) ? wa as string : "";
            dane.mnoznik = o.TryGetValue("mnoznik", out var mn) ? (float)L(mn) : 1;
            dane.pikseliNaPostac = h;
            dane.klatki = sprite;
            dane.swiatla = new SwiatlaKlatki[klatki.Count];
            if (poziom.TryGetValue("swiatla", out var sw) && sw is List<object> swl)
                for (int k = 0; k < swl.Count && k < klatki.Count; k++)
                    if (swl[k] is List<object> jedna && jedna.Count > 0)
                        dane.swiatla[k] = new SwiatlaKlatki { dane = jedna.SelectMany(x => ((List<object>)x).Select(v => (float)L(v))).ToArray() };

            // 3. animacje: klipy i kontroler
            dane.animacje.Clear();
            var kontrolerPlik = wyj + "/" + nazwa + ".controller";
            AssetDatabase.DeleteAsset(kontrolerPlik);
            var kontroler = AnimatorController.CreateAnimatorControllerAtPath(kontrolerPlik);
            foreach (var para in (Dictionary<string, object>)o["animacje"])
            {
                var a = (Dictionary<string, object>)para.Value;
                var an = new AnimacjaDuszka
                {
                    nazwa = para.Key, od = (int)L(a["od"]), n = (int)L(a["n"]), ster = a["ster"] as string,
                    mnoz = a.TryGetValue("mnoz", out var m1) ? (float)L(m1) : 0, przes = a.TryGetValue("przes", out var p1) ? (float)L(p1) : 0,
                    ms = (float)L(a["ms"]), petla = a.TryGetValue("petla", out var pe) && pe is bool pb && pb,
                    srodki = a.TryGetValue("srodki", out var sr) && sr is bool sb && sb,
                };
                var klip = new AnimationClip { name = an.nazwa };
                float klatekNaS = an.ms > 0 ? an.n / (an.ms / 1000f) : 12f;
                klip.frameRate = Mathf.Max(1f, klatekNaS);
                var klucze = new List<ObjectReferenceKeyframe>();
                for (int i = 0; i < an.n; i++)
                    if (an.od + i < sprite.Length && sprite[an.od + i] != null)
                        klucze.Add(new ObjectReferenceKeyframe { time = i / klatekNaS, value = sprite[an.od + i] });
                AnimationUtility.SetObjectReferenceCurve(klip, new EditorCurveBinding { type = typeof(SpriteRenderer), path = "", propertyName = "m_Sprite" }, klucze.ToArray());
                var ust = AnimationUtility.GetAnimationClipSettings(klip);
                ust.loopTime = an.petla;
                AnimationUtility.SetAnimationClipSettings(klip, ust);
                var klipPlik = wyj + "/" + nazwa + "@" + an.nazwa + ".anim";
                AssetDatabase.DeleteAsset(klipPlik);
                AssetDatabase.CreateAsset(klip, klipPlik);
                an.klip = klip;
                dane.animacje.Add(an);
                kontroler.AddMotion(klip);
            }
            EditorUtility.SetDirty(dane);
            return true;
        }

        static double L(object x) => x is double d ? d : Convert.ToDouble(x, CultureInfo.InvariantCulture);

        /// <summary>Wysokość obrazka PNG z nagłówka pliku (IHDR) — bez wczytywania tekstury.</summary>
        static int WysokoscPng(string sciezka)
        {
            using (var f = File.OpenRead(sciezka))
            {
                var b = new byte[24];
                if (f.Read(b, 0, 24) < 24) throw new IOException("zły plik PNG: " + sciezka);
                return (b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23];
            }
        }
    }

    /// <summary>Mały czytnik JSON (obiekt → Dictionary, tablica → List, liczba → double) — JsonUtility nie czyta tablic w tablicach.</summary>
    static class MiniJson
    {
        public static object Czytaj(string s) { int i = 0; return Wartosc(s, ref i); }

        static void Biale(string s, ref int i) { while (i < s.Length && char.IsWhiteSpace(s[i])) i++; }

        static object Wartosc(string s, ref int i)
        {
            Biale(s, ref i);
            char c = s[i];
            if (c == '{')
            {
                var d = new Dictionary<string, object>();
                i++; Biale(s, ref i);
                if (s[i] == '}') { i++; return d; }
                while (true)
                {
                    Biale(s, ref i);
                    var klucz = Napis(s, ref i);
                    Biale(s, ref i); i++;                                // dwukropek
                    d[klucz] = Wartosc(s, ref i);
                    Biale(s, ref i);
                    if (s[i++] == '}') return d;                          // przecinek albo koniec
                }
            }
            if (c == '[')
            {
                var l = new List<object>();
                i++; Biale(s, ref i);
                if (s[i] == ']') { i++; return l; }
                while (true)
                {
                    l.Add(Wartosc(s, ref i));
                    Biale(s, ref i);
                    if (s[i++] == ']') return l;
                }
            }
            if (c == '"') return Napis(s, ref i);
            if (string.CompareOrdinal(s, i, "true", 0, 4) == 0) { i += 4; return true; }
            if (string.CompareOrdinal(s, i, "false", 0, 5) == 0) { i += 5; return false; }
            if (string.CompareOrdinal(s, i, "null", 0, 4) == 0) { i += 4; return null; }
            int od = i;
            while (i < s.Length && (char.IsDigit(s[i]) || s[i] == '-' || s[i] == '+' || s[i] == '.' || s[i] == 'e' || s[i] == 'E')) i++;
            return double.Parse(s.Substring(od, i - od), CultureInfo.InvariantCulture);
        }

        static string Napis(string s, ref int i)
        {
            var w = new System.Text.StringBuilder();
            i++;                                                         // cudzysłów
            while (s[i] != '"')
            {
                if (s[i] == '\\')
                {
                    i++;
                    char e = s[i];
                    if (e == 'u') { w.Append((char)Convert.ToInt32(s.Substring(i + 1, 4), 16)); i += 4; }
                    else w.Append(e == 'n' ? '\n' : e == 't' ? '\t' : e == 'r' ? '\r' : e == 'b' ? '\b' : e == 'f' ? '\f' : e);
                }
                else w.Append(s[i]);
                i++;
            }
            i++;
            return w.ToString();
        }
    }
}
#endif
