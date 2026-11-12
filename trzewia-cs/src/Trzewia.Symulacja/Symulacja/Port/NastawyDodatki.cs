// Dostęp do nastaw po nazwie pola (jak obiekt[klucz] w TS) — dopisane ręcznie do klas wygenerowanych z TS.
namespace Trzewia.Nastawy
{
    public sealed partial class MnoznikiRoli
    {
        /// <summary>LUD.role[r][co] w TS (keyof MnoznikiRoli).</summary>
        public double this[string co] => co switch
        {
            "hp" => hp, "sila" => sila, "szybkosc" => szybkosc, "kopanie" => kopanie, "modlitwa" => modlitwa, "glod" => glod,
            _ => double.NaN,
        };
    }

    public sealed partial class Typ_LUD_helm
    {
        public double this[string co] => co switch { "hp" => hp, "sila" => sila, _ => double.NaN };
    }

    public sealed partial class Typ_BLOGOSLAWIENSTWO_dary_wpis
    {
        public double? this[string co] => co switch { "sila" => sila, "szybkosc" => szybkosc, "kopanie" => kopanie, "modlitwa" => modlitwa, _ => null };
    }
}

namespace Trzewia.Nastawy
{
    public sealed partial class Typ_ZBROJA_premie_wpis
    {
        /// <summary>ZBROJA.premie[z]?.[co] w TS.</summary>
        public double? this[string co] => co switch { "hp" => hp, "sila" => sila, "szybkosc" => szybkosc, "rany" => rany, _ => null };
    }
}
