// Teksty tablic atlasu z kodu TS (do porównania z C#): node narzedzia/atlas/teksty.mjs → testy/zlote/atlas-teksty.json
import { TABLICE } from '../../../alpha-1/src/atlas/tablice';

export function teksty(): unknown {
  return TABLICE.map((t) => ({ id: t.id, grupa: t.grupa, nazwa: t.nazwa, lacina: t.lacina, opis: t.opis, kiedy: t.kiedy, koszt: t.koszt ?? null }));
}
