// Trzewia — duszki postaci w Unity: najprostsze odtwarzanie animacji arkusza (zasób DuszekDane) na SpriteRendererze.
using UnityEngine;

namespace Trzewia.Unity
{
    /// <summary>
    /// Najprostsze odtwarzanie na obiekcie ze SpriteRendererem: animacja po nazwie, w jej własnym tempie (`ms`).
    /// W grze klatkę wybiera sterownik (krok z przebytej drogi itd.) — wtedy zamiast tego: renderer.sprite = dane.Klatka(nazwa, u).
    /// </summary>
    [RequireComponent(typeof(SpriteRenderer))]
    public class Duszek : MonoBehaviour
    {
        public DuszekDane dane;
        public string animacja = "stoi";
        float czas;
        SpriteRenderer rysownik;

        void Awake() { rysownik = GetComponent<SpriteRenderer>(); }

        public void Graj(string nazwa) { if (animacja != nazwa) { animacja = nazwa; czas = 0; } }

        void Update()
        {
            if (dane == null) return;
            var a = dane.Animacja(animacja);
            if (a == null) return;
            czas += Time.deltaTime * 1000f;
            float u = a.ms > 0 ? czas / a.ms : 0;
            var s = dane.Klatka(animacja, u);
            if (s != null) rysownik.sprite = s;
        }
    }
}
