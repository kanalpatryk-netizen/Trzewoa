// Próba gry bez Unity: kompiluje LochAscii.cs z namiastką Unity (Namiastka.cs), gra botem i zapisuje klatki.
//
//   dotnet run -- klatki <ziarno> <folder>   zapisuje obrazy (PPM) i tekst wybranych chwil gry
//   dotnet run -- bot <ile>                  bot przechodzi <ile> lochów: bez duchów musi wygrać każdy
//   dotnet run -- losowo <ile>               losowe klawisze w <ile> lochach — szuka wyjątków
using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Text;
using UnityEngine;

static class Proba
{
    const BindingFlags BF = BindingFlags.Instance | BindingFlags.Static | BindingFlags.NonPublic | BindingFlags.Public;
    const int MW = 21, MH = 15, SZ = 106, WY = 45, KRYSZTALY = 3, RZECZY = 6;
    static LochAscii gra;

    static T Pole<T>(string nazwa) { return (T)typeof(LochAscii).GetField(nazwa, BF).GetValue(gra); }
    static void Ustaw(string nazwa, object v) { typeof(LochAscii).GetField(nazwa, BF).SetValue(gra, v); }
    static void Wolaj(string nazwa)
    {
        try { typeof(LochAscii).GetMethod(nazwa, BF).Invoke(gra, null); }
        catch (TargetInvocationException e) { throw e.InnerException; }
    }

    static void Nowa(uint ziarno)
    {
        GameObject.dodane.Clear();
        Camera.allCamerasCount = 0;
        typeof(LochAscii).GetField("zywa", BF).SetValue(null, null);
        typeof(LochAscii).GetMethod("Autostart", BF).Invoke(null, null);
        gra = (LochAscii)GameObject.dodane[0];
        Wolaj("Awake");
        Wolaj("Start");
        Ustaw("ziarno", ziarno);
        Wolaj("NowyLoch");
    }

    static void Klatka(params string[] klawisze)
    {
        Klawisze.wcisniete.Clear();
        foreach (string k in klawisze) if (!Klawisze.trzymane.Contains(k)) Klawisze.wcisniete.Add(k);
        Klawisze.trzymane.Clear();
        foreach (string k in klawisze) Klawisze.trzymane.Add(k);
        Wolaj("Update");
        Wolaj("OnGUI");
    }

    static string Tekst()
    {
        int[] e = Pole<int[]>("ekran");
        StringBuilder sb = new StringBuilder();
        for (int y = 0; y < WY; y++)
        {
            for (int x = 0; x < SZ; x++) sb.Append((char)(e[y * SZ + x] & 255));
            sb.Append('\n');
        }
        return sb.ToString();
    }

    static void Zapisz(string folder, string nazwa)
    {
        Texture2D t = Pole<Texture2D>("obraz");
        using (FileStream f = File.Create(Path.Combine(folder, nazwa + ".ppm")))
        {
            byte[] nagl = Encoding.ASCII.GetBytes("P6\n" + t.width + " " + t.height + "\n255\n");
            f.Write(nagl, 0, nagl.Length);
            byte[] wiersz = new byte[t.width * 3];
            for (int y = t.height - 1; y >= 0; y--)
            {
                for (int x = 0; x < t.width; x++)
                {
                    Color32 c = t.dane[y * t.width + x];
                    wiersz[x * 3] = c.r; wiersz[x * 3 + 1] = c.g; wiersz[x * 3 + 2] = c.b;
                }
                f.Write(wiersz, 0, wiersz.Length);
            }
        }
        File.WriteAllText(Path.Combine(folder, nazwa + ".txt"), Tekst());
        Console.WriteLine("zapisano " + nazwa);
    }

    // ---- bot: idzie po kaflach najkrótszą drogą do najbliższego kryształu, a potem do bramy ----
    static int[] Odleglosci(byte[] mapa, int cel)
    {
        int[] odl = new int[MW * MH];
        for (int i = 0; i < odl.Length; i++) odl[i] = -1;
        Queue<int> q = new Queue<int>();
        q.Enqueue(cel); odl[cel] = 0;
        int[] krok = { 1, MW, -1, -MW };
        while (q.Count > 0)
        {
            int k = q.Dequeue();
            foreach (int d in krok)
            {
                int s = k + d;
                if (s < 0 || s >= odl.Length || mapa[s] != 0 || odl[s] >= 0) continue;
                odl[s] = odl[k] + 1; q.Enqueue(s);
            }
        }
        return odl;
    }

    // wszechwiedzacy: zna cały loch i miejsca kryształów (sprawdza, czy loch da się przejść).
    // Inaczej bot gra jak człowiek: idzie tylko do tego, co już widział, a gdy nie widzi celu — odkrywa loch.
    // blyska: gdy duch jest tuż obok, używa błysku pochodni.
    static string[] Bot(bool wszechwiedzacy, bool blyska)
    {
        byte[] mapa = Pole<byte[]>("mapa");
        bool[] znane = Pole<bool[]>("znane");
        float gx = Pole<float>("gx"), gy = Pole<float>("gy"), kat = Pole<float>("kat");
        float[] rzX = Pole<float[]>("rzX"), rzY = Pole<float[]>("rzY"), rzStrach = Pole<float[]>("rzStrach");
        bool[] rzJest = Pole<bool[]>("rzJest");
        int brama = Pole<int>("brama"), zebrane = Pole<int>("zebrane"), tu = (int)gy * MW + (int)gx;
        List<string> klawisze = new List<string>();

        if (blyska && Pole<int>("flary") > 0 && Pole<float>("nietykalny") <= 0f)
            for (int i = KRYSZTALY; i < RZECZY; i++)
                if (rzJest[i] && rzStrach[i] <= 0f && Math.Sqrt((rzX[i] - gx) * (rzX[i] - gx) + (rzY[i] - gy) * (rzY[i] - gy)) < 1.2) { klawisze.Add("Space"); break; }

        // po czym bot umie chodzić: po całym lochu albo tylko po tym, co widział
        byte[] teren = mapa;
        if (!wszechwiedzacy)
        {
            teren = new byte[mapa.Length];
            for (int i = 0; i < teren.Length; i++) teren[i] = znane[i] ? mapa[i] : (byte)1;
        }
        int[] odTu = Odleglosci(teren, tu);

        float celX = 0f, celY = 0f; int celKafel = -1, najblizej = int.MaxValue;
        for (int i = 0; i < KRYSZTALY; i++)
        {
            if (!rzJest[i]) continue;
            int k = (int)rzY[i] * MW + (int)rzX[i];
            if (wszechwiedzacy && odTu[k] < 0) throw new Exception("krysztal nieosiagalny");
            if (odTu[k] >= 0 && odTu[k] < najblizej) { najblizej = odTu[k]; celKafel = k; celX = rzX[i]; celY = rzY[i]; }
        }
        if (celKafel < 0 && zebrane == KRYSZTALY && (wszechwiedzacy || znane[brama]))
        {
            // wszystkie kryształy zebrane: kafel przy bramie, a z niego prosto w bramę
            int bx = brama % MW, by = brama / MW;
            int px = bx == 0 ? 1 : bx == MW - 1 ? MW - 2 : bx, py = by == 0 ? 1 : by == MH - 1 ? MH - 2 : by;
            if (wszechwiedzacy && odTu[py * MW + px] < 0) throw new Exception("brama nieosiagalna");
            if (odTu[py * MW + px] >= 0) { celKafel = py * MW + px; celX = bx + 0.5f; celY = by + 0.5f; }
        }
        if (celKafel < 0)
        {
            // odkrywanie: najbliższy znany kafel, który sąsiaduje z nieznanym
            for (int k = 0; k < teren.Length; k++)
            {
                if (odTu[k] < 0 || odTu[k] >= najblizej) continue;
                if (znane[k + 1] && znane[k - 1] && znane[k + MW] && znane[k - MW]) continue;
                najblizej = odTu[k]; celKafel = k; celX = k % MW + 0.5f; celY = k / MW + 0.5f;
            }
            if (celKafel < 0) throw new Exception("nie ma czego odkrywac, a cel nieznany");
            if (celKafel == tu && Math.Abs(gx - celX) < 0.15f && Math.Abs(gy - celY) < 0.15f) { klawisze.Add("D"); return klawisze.ToArray(); }   // rozgląda się
        }

        float wx = celX, wy = celY;
        if (tu != celKafel)
        {
            int[] doCelu = Odleglosci(teren, celKafel);
            int nast = tu;
            foreach (int d in new[] { 1, MW, -1, -MW })
                if (doCelu[tu + d] >= 0 && doCelu[tu + d] < doCelu[nast]) nast = tu + d;
            bool poziomo = nast / MW == tu / MW;
            float obok = poziomo ? Math.Abs(gy - (tu / MW + 0.5f)) : Math.Abs(gx - (tu % MW + 0.5f));
            int w = obok > 0.12f ? tu : nast;   // najpierw na środek kafla, potem prosto do następnego
            wx = w % MW + 0.5f; wy = w / MW + 0.5f;
        }
        double roznica = Math.Atan2(wy - gy, wx - gx) - kat;
        roznica = Math.Atan2(Math.Sin(roznica), Math.Cos(roznica));
        if (roznica > 0.08) klawisze.Add("D");
        if (roznica < -0.08) klawisze.Add("A");
        if (Math.Abs(roznica) < 0.5) klawisze.Add("W");
        return klawisze.ToArray();
    }

    static void OdsunDuchy()
    {
        float[] rzX = Pole<float[]>("rzX"), rzY = Pole<float[]>("rzY");
        for (int i = KRYSZTALY; i < RZECZY; i++) { rzX[i] = -60f; rzY[i] = -60f; }
    }

    static void Klatki(uint ziarno, string folder)
    {
        Directory.CreateDirectory(folder);
        Nowa(ziarno);
        for (int i = 0; i < 40; i++) Klatka();
        Zapisz(folder, "01-tytul");
        Klatka("Return");
        Ustaw("kat", 0.35f);
        for (int i = 0; i < 30; i++) Klatka();
        Zapisz(folder, "02-start");

        // duch i kryształ postawione przed postacią — żeby obejrzeć, jak wyglądają z bliska i z daleka
        {
            float gx = Pole<float>("gx"), gy = Pole<float>("gy"), kat = Pole<float>("kat");
            float[] rzX = Pole<float[]>("rzX"), rzY = Pole<float[]>("rzY");
            float[] stareX = (float[])rzX.Clone(), stareY = (float[])rzY.Clone();
            float c = (float)Math.Cos(kat), s = (float)Math.Sin(kat);
            rzX[3] = gx + c * 1.6f + s * 0.9f; rzY[3] = gy + s * 1.6f - c * 0.9f;
            rzX[4] = gx + c * 3.4f - s * 1.2f; rzY[4] = gy + s * 3.4f + c * 1.2f;
            rzX[0] = gx + c * 1.2f - s * 0.8f; rzY[0] = gy + s * 1.2f + c * 0.8f;
            rzX[1] = gx + c * 3.0f + s * 0.2f; rzY[1] = gy + s * 3.0f - c * 0.2f;
            Wolaj("Rysuj"); Wolaj("Wyswietl");
            Zapisz(folder, "02b-duch-i-krysztal");
            Ustaw("flara", 0.9f); Pole<float[]>("rzStrach")[3] = 3f;
            Wolaj("Rysuj"); Wolaj("Wyswietl");
            Zapisz(folder, "02c-blysk");
            Ustaw("flara", 0f); Pole<float[]>("rzStrach")[3] = 0f;
            Array.Copy(stareX, rzX, RZECZY); Array.Copy(stareY, rzY, RZECZY);
        }

        // bot idzie do pierwszego kryształu; po drodze zdjęcia co 2,5 s i tuż przed kryształem
        int zdjecie = 3; bool przyKrysztale = false, przyDuchu = false;
        for (int t = 0; t < 60 * 200 && Pole<int>("stan") == 1; t++)
        {
            float gx = Pole<float>("gx"), gy = Pole<float>("gy");
            float[] rzX = Pole<float[]>("rzX"), rzY = Pole<float[]>("rzY"), rzGl = Pole<float[]>("rzGl");
            bool[] rzJest = Pole<bool[]>("rzJest");
            if (Pole<int>("zebrane") < 2) OdsunDuchy();   // dwa pierwsze kryształy w spokoju, potem z duchami
            Klatka(Bot(true, false));
            if (t % 150 == 149 && zdjecie < 12) Zapisz(folder, (zdjecie++).ToString("00") + "-droga");
            for (int i = 0; i < RZECZY; i++)
            {
                if (!rzJest[i]) continue;
                double d = Math.Sqrt((rzX[i] - gx) * (rzX[i] - gx) + (rzY[i] - gy) * (rzY[i] - gy));
                if (i < KRYSZTALY && !przyKrysztale && d < 1.6 && rzGl[i] > 1.5f) { Zapisz(folder, "20-krysztal"); przyKrysztale = true; }
                if (i >= KRYSZTALY && !przyDuchu && d < 2.2 && rzGl[i] > 2.0f) { Zapisz(folder, "21-duch"); przyDuchu = true; }
            }
            if (Pole<float>("blysk") > 0.3f && !File.Exists(Path.Combine(folder, "22-cios.ppm"))) Zapisz(folder, "22-cios");
            if (Pole<int>("zebrane") == 3 && !File.Exists(Path.Combine(folder, "23-brama-otwarta.ppm")) && Pole<float>("komCzas") < 2.3f) Zapisz(folder, "23-brama-otwarta");
        }
        for (int i = 0; i < 20; i++) Klatka();
        Zapisz(folder, "30-koniec-" + (Pole<int>("stan") == 2 ? "wygrana" : Pole<int>("stan") == 3 ? "przegrana" : "trwa"));

        // przegrana: postać stoi, duchy robią swoje
        Nowa(ziarno + 7);
        Klatka("Return");
        for (int t = 0; t < 60 * 300 && Pole<int>("stan") == 1; t++) Klatka();
        for (int i = 0; i < 20; i++) Klatka();
        Zapisz(folder, "31-koniec-" + (Pole<int>("stan") == 3 ? "przegrana" : "inny"));
    }

    static void BotSeria(int ile)
    {
        string[] nazwy = { "zna loch, bez duchow", "odkrywa, bez duchow", "odkrywa, duchy, bez blysku", "odkrywa, duchy, blysk z bliska" };
        string[] poziomy = { "latwy", "normalny", "trudny" };
        Screen.width = 640; Screen.height = 360;   // najmniejsza tekstura — próba idzie szybciej
        for (int tryb = 0; tryb < 4; tryb++)
            for (int poziom = tryb < 2 ? 1 : 0; poziom < (tryb < 2 ? 2 : 3); poziom++)
            {
                int wygrane = 0, przegrane = 0, utkniete = 0, zycia = 0; double czasy = 0;
                for (uint z = 1; z <= ile; z++)
                {
                    Nowa(z * 2654435761u | 1u);
                    Klatka("Alpha" + (poziom + 1));
                    if (Pole<int>("poziom") != poziom || Pole<int>("stan") != 1) throw new Exception("wybor poziomu nie zadzialal");
                    for (int t = 0; t < 60 * 400 && Pole<int>("stan") == 1; t++)
                    {
                        if (tryb < 2) OdsunDuchy();
                        Klatka(Bot(tryb == 0, tryb == 3));
                    }
                    int stan = Pole<int>("stan");
                    if (stan == 2) { wygrane++; czasy += Pole<float>("czas"); zycia += Pole<int>("zycia"); }
                    else if (stan == 3) przegrane++;
                    else { utkniete++; Console.WriteLine("  utknal: ziarno " + z + "\n" + Tekst()); }
                }
                Console.WriteLine((nazwy[tryb] + " [" + poziomy[poziom] + "]:").PadRight(44) + "wygrane " + wygrane + ", przegrane " + przegrane + ", utkniete " + utkniete
                    + (wygrane > 0 ? ", sredni czas " + (czasy / wygrane).ToString("0.0") + " s, zostaje zyc " + ((double)zycia / wygrane).ToString("0.0") : ""));
                if (tryb < 2 && wygrane != ile) throw new Exception("bez duchow bot powinien wygrac kazdy loch");
            }
        Screen.width = 1280; Screen.height = 720;
    }

    static void Losowo(int ile)
    {
        string[] wszystkie = { "W", "S", "A", "D", "Q", "E", "R", "UpArrow", "DownArrow", "LeftArrow", "RightArrow", "Return", "KeypadEnter", "Space", "Escape",
            "Alpha1", "Alpha2", "Alpha3", "Keypad1", "Keypad2", "Keypad3", "Space", "Space" };
        Random los = new Random(12345);
        long klatki = 0; int[] stany = new int[4];
        for (uint z = 1; z <= ile; z++)
        {
            Nowa(z * 40503u | 1u);
            Screen.width = 300 + los.Next(3000); Screen.height = 200 + los.Next(2000);
            string[] trzymane = new string[0];
            for (int t = 0; t < 3000; t++)
            {
                if (los.Next(12) == 0)
                {
                    List<string> l = new List<string>();
                    // ruch często, klawisze zmiany stanu rzadko — żeby gra zdążyła się toczyć
                    for (int i = 0; i < 6; i++) if (los.Next(3) == 0) l.Add(wszystkie[i < 4 ? i : 4 + los.Next(2)]);
                    if (los.Next(40) == 0) l.Add(wszystkie[6 + los.Next(wszystkie.Length - 6)]);
                    trzymane = l.ToArray();
                }
                Time.deltaTime = los.Next(50) == 0 ? 0.5f : 1f / (20 + los.Next(200));
                Klatka(trzymane);
                stany[Pole<int>("stan")]++;
                klatki++;
            }
        }
        Screen.width = 1280; Screen.height = 720; Time.deltaTime = 1f / 60f;
        Console.WriteLine("losowo: " + klatki + " klatek bez wyjatku; klatki w stanach tytul/gra/wygrana/przegrana: " + string.Join("/", stany));
    }

    static int Main(string[] a)
    {
        if (a.Length >= 3 && a[0] == "klatki") { Klatki(uint.Parse(a[1]), a[2]); return 0; }
        if (a.Length >= 2 && a[0] == "bot") { BotSeria(int.Parse(a[1])); return 0; }
        if (a.Length >= 2 && a[0] == "losowo") { Losowo(int.Parse(a[1])); return 0; }
        Console.WriteLine("uzycie: klatki <ziarno> <folder> | bot <ile> | losowo <ile>");
        return 1;
    }
}
