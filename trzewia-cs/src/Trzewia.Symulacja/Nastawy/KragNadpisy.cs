// Tryb Kręgu Trzeciego: nastawy, którymi krąg (krag-3-beta/src/nastawy) różni się od Alphy 1 (alpha-1/src/nastawy).
// Wygenerowane porównaniem wzorców TS obu wersji (narzedzia/nastawy/nastawy-cs.mjs → nastawy-ts.json dla alpha-1
// i dla krag-3-beta): tylko liście, które się różnią — nazwa bossa, nazwy i opisy ruchów walki (pies zamiast demona),
// wysokość kamery nad tarasem, kilka napisów. Krag.Ustaw(true) nakłada je przez NastawyJson.Wczytaj, a wyłączenie
// kręgu przywraca wartości sprzed włączenia. Nowe nastawy kręgu (KRAG, SCIECIE_GLOW, ruch „Ścięcie głowy”) są
// w Nastawy/Krag.cs. Test: NastawyTesty (tryb kręgu = wszystkie nastawy jak w krag-3-beta).
using System;
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    public static class KragNadpisy
    {
        /// <summary>Plik nastaw (jak w dane/nastawy) → JSON z wartościami kręgu.</summary>
        public static readonly Dictionary<string, string> Pliki = new Dictionary<string, string>
        {
            ["aniol"] = @"{""DAR"": {""ludzie"": {""opis"": ""stawia przy ołtarzu nowego grabarza""}}}",
            ["pomnik"] = @"{""DEMON"": {""nazwa"": ""Cerber""}}",
            ["sterowanie"] = @"{""KAMERA"": {""niebo"": 42}}",
            ["walka"] = @"{""RUCHY_RYCERZA"": {""finta"": {""opis"": ""Weteran: udaje cięcie z góry, a gdy wróg się zasłoni — nagłe pchnięcie dołem. Cerber nie zdąży zasłonić się ręką.""}, ""powalony"": {""opis"": ""Najcięższe ciosy Cerbera zwalają go z nóg: pada na plecy, leży i wstaje, podpierając się mieczem.""}}, ""RUCHY_BOSSA"": {""zGory"": {""nazwa"": ""Kłapnięcie z góry"", ""opis"": ""Staje lekko dęba, łeb w górę i z całej siły paszczą w dół — powala rycerza, jeśli się nie obroni.""}, ""zamach"": {""nazwa"": ""Szarpnięcie łapą"", ""opis"": ""Przednia łapa wysoko w górę i łukiem przed siebie — pazury rozdzierają każdego w zasięgu.""}, ""podciecie"": {""nazwa"": ""Chwyt za nogi"", ""opis"": ""Przysiad i najniższa głowa nisko nad ziemią — zęby w łydki i szarpnięcie, wyrzuca rycerza z nóg.""}, ""podwojnyZamach"": {""nazwa"": ""Dwie paszcze"", ""opis"": ""Najpierw kłapie jedna głowa, zaraz druga — dwa ugryzienia jedno po drugim.""}, ""zgniecenie"": {""nazwa"": ""Trzy paszcze naraz"", ""opis"": ""Przysiad i trzy głowy jednocześnie w jedno miejsce — kły zamykają się na rycerzu, ogłuszony.""}, ""przygniecenie"": {""nazwa"": ""Łapa na piersi"", ""opis"": ""Przednia łapa spada na rycerza i przygniata go do ziemi, głowy szarpią — dociska jeszcze raz, potem puszcza.""}, ""odepchniecie"": {""nazwa"": ""Uderzenie łbem"", ""opis"": ""Gdy rycerz podejdzie za blisko: skok do przodu i łbem w pierś — odrzuca go daleko.""}, ""tupniecie"": {""opis"": ""Staje dęba i oboma przednimi łapami w posadzkę — fala ziemi rani i chwieje każdego wokół.""}, ""tchnienie"": {""opis"": ""Gdy słabnie: środkowa głowa wciąga powietrze, odchyla się i zieje ogniem przed siebie — pali każdego w płomieniach.""}, ""wybuchAureoli"": {""nazwa"": ""Wycie trzech gardeł"", ""opis"": ""Od połowy życia: kuli się, a potem trzy łby wyją w górę — fala wycia i żaru zwala z nóg tych blisko.""}, ""biczLancucha"": {""nazwa"": ""Bicz z ogona"", ""opis"": ""Wężowy ogon w łuskach smaga jak bicz — sięga rycerza z pięciu kafli.""}, ""szarza"": {""opis"": ""Przysiada, łby nisko — i rzuca się na rycerza z kilku kafli; przy zderzeniu go powala i odrzuca.""}, ""uderzenieWZiemie"": {""opis"": ""Co jakiś czas: staje dęba z rykiem i całym ciężarem spada przednimi łapami — zasypuje kawałek drogi wiernych.""}, ""ryk"": {""opis"": ""Po zabiciu kogoś, po klęknięciu i w ciszy: trzy łby w górę, paszcze rozwarte, wyje na trzy gardła.""}, ""blok"": {""nazwa"": ""Zasłona łapą"", ""opis"": ""Gdy rycerz bierze zamach, czasem unosi przednią łapę i odbija ostrze pazurami — cios zostawia połowę rany (fintę przepuszcza).""}, ""zachwianie"": {""opis"": ""Po ciężkim ciosie zatacza się i nie gryzie; przy połowie i ćwierci życia pada na przednie łapy, a potem ryczy.""}}}",
            ["wyglad-frontyspis"] = @"{""FRONTYSPIS"": {""podpisy"": {""e"": ""Cienie Żarłoków""}}}",
            ["wyglad-menu"] = @"{""MENU"": {""wersja"": ""Krąg Trzeci · beta""}}",
        };

        /// <summary>Klasa nastaw pliku z rejestru (null — nie ma takiego pliku).</summary>
        public static Type? Typ(string plik)
        {
            foreach (var kv in Rejestr.Pliki) if (kv.Key == plik) return kv.Value;
            return null;
        }
    }
}
