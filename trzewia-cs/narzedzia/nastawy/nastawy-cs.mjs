// Nastawy z TS do C#: alpha-1/src/nastawy/**/*.ts → trzewia-cs/src/Trzewia.Symulacja/Nastawy/**/*.cs
//
// Wartości biorę z WYKONANIA prawdziwego modułu TS (node --experimental-transform-types) — dokładnie te liczby,
// teksty i tablice, których używa gra (także policzone wyrażeniami i funkcjami pomocniczymi). Budowę (rekordy,
// interfejsy, nazwy typów) i komentarze biorę z drzewa składni TypeScriptu. Wynik:
//   - każdy plik TS → statyczna klasa Nastawy<Plik> z polami jak eksporty TS (SWIAT, RDZEN…) — kod gry pisze
//     `using static Trzewia.Nastawy.NastawySwiat;` i dalej `SWIAT.jaskinie.prog`, jak w TS;
//   - obiekty → klasy z polami (liczby → double, pola opcjonalne → double?), rekordy (Record<K, V>) → klasy z polem na
//     klucz, listą `klucze` (kolejność Object.keys) i indeksem po nazwie; typy-unie napisów → stałe;
//   - Rejestr.cs — spis plików dla nadpisywania liczb plikami dane/nastawy/*.json (NastawyJson.cs).
// Uruchomienie (z folderu trzewia-cs): node --experimental-transform-types narzedzia/nastawy/nastawy-cs.mjs
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { register } from 'node:module';

register('./ts-rozwiazywanie.mjs', import.meta.url);

const TU = path.dirname(url.fileURLToPath(import.meta.url));
const ZRODLO = path.resolve(TU, '../../../alpha-1/src/nastawy');
const CEL = path.resolve(TU, '../../src/Trzewia.Symulacja/Nastawy');
const POMIJANE_PLIKI = new Set(['index.ts']);
/** Tylko wersja na telefon (decyzja użytkownika 5.11 — tylko komputer). */
const POMIJANE_EKSPORTY = new Set(['TELEFON']);

const SLOWA_CS = new Set(('abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum ' +
  'event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace new null object ' +
  'operator out override params private protected public readonly ref return sbyte sealed short sizeof stackalloc static string struct switch this ' +
  'throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while').split(' '));
const id = (n) => (SLOWA_CS.has(n) ? '@' + n : n);
const pascal = (s) => s.split(/[-_/]/).filter(Boolean).map((c) => c[0].toUpperCase() + c.slice(1)).join('');
const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ostrzezenia = [];

// ───────────────────────────── komentarze z drzewa ─────────────────────────────

function komentarz(tekst, wezel) {
  const zakresy = ts.getLeadingCommentRanges(tekst, wezel.getFullStart()) ?? [];
  const linie = [];
  for (const z of zakresy) {
    let k = tekst.slice(z.pos, z.end);
    if (k.startsWith('/*')) {
      k = k.replace(/^\/\*\*?/, '').replace(/\*\/$/, '');
      for (const l of k.split('\n')) linie.push(l.replace(/^\s*\* ?/, '').trim());
    } else linie.push(k.replace(/^\/\/\s?/, ''));
  }
  while (linie.length && !linie[0].trim()) linie.shift();
  while (linie.length && !linie[linie.length - 1].trim()) linie.pop();
  return linie;
}

function docCs(linie, wciecie) {
  if (!linie || !linie.length) return '';
  const w = ' '.repeat(wciecie);
  if (linie.length === 1) return `${w}/// <summary>${xml(linie[0])}</summary>\n`;
  return `${w}/// <summary>\n${linie.map((l) => `${w}/// ${xml(l)}`.replace(/\s+$/, '')).join('\n')}\n${w}/// </summary>\n`;
}

const rozpakuj = (e) => {
  while (e && (ts.isAsExpression(e) || ts.isSatisfiesExpression?.(e) || ts.isParenthesizedExpression(e) || ts.isTypeAssertionExpression?.(e))) e = e.expression;
  return e;
};
const typAs = (e) => {
  const t = [];
  while (e && (ts.isAsExpression(e) || ts.isSatisfiesExpression?.(e) || ts.isParenthesizedExpression(e))) { if (e.type) t.push(e.type.getText()); e = e.expression; }
  return t.find((x) => x !== 'const') ?? null;
};
const nazwaWlasciwosci = (p) => (p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) || ts.isNumericLiteral(p.name)) ? p.name.text : null);

/** Komentarze i deklarowane typy właściwości obiektu literalnego (rekurencyjnie). */
function opisObiektu(tekst, obj) {
  const wynik = new Map();
  if (!obj || !ts.isObjectLiteralExpression(obj)) return wynik;
  for (const p of obj.properties) {
    const n = nazwaWlasciwosci(p);
    if (n == null) continue;
    const init = ts.isPropertyAssignment(p) ? p.initializer : null;
    const rozp = init ? rozpakuj(init) : null;
    wynik.set(n, {
      doc: komentarz(tekst, p),
      typ: init ? typAs(init) : null,
      wyrazenie: init && !ts.isObjectLiteralExpression(rozp) && !ts.isArrayLiteralExpression(rozp) && !ts.isNumericLiteral(rozp)
        && !ts.isStringLiteral(rozp) && rozp.kind !== ts.SyntaxKind.TrueKeyword && rozp.kind !== ts.SyntaxKind.FalseKeyword
        && !(ts.isPrefixUnaryExpression(rozp) && ts.isNumericLiteral(rozp.operand)) && !ts.isNoSubstitutionTemplateLiteral(rozp) ? init.getText().replace(/\s+/g, ' ') : null,
      obiekt: rozp && ts.isObjectLiteralExpression(rozp) ? rozp : null,
      tablica: rozp && ts.isArrayLiteralExpression(rozp) ? rozp : null,
    });
  }
  return wynik;
}

// ───────────────────────────── typy ─────────────────────────────

/** Interfejsy i aliasy-unie ze wszystkich plików nastaw: nazwa → opis. */
const interfejsy = new Map();
const unie = new Map();

function typZTs(t, kontekst) {
  if (!t) return null;
  const s = t.getText();
  if (t.kind === ts.SyntaxKind.NumberKeyword) return 'double';
  if (t.kind === ts.SyntaxKind.StringKeyword) return 'string';
  if (t.kind === ts.SyntaxKind.BooleanKeyword) return 'bool';
  if (ts.isLiteralTypeNode(t)) return ts.isStringLiteral(t.literal) ? 'string' : t.literal.kind === ts.SyntaxKind.NumericLiteral ? 'double' : 'bool';
  if (ts.isUnionTypeNode(t)) {
    const r = [...new Set(t.types.map((x) => typZTs(x, kontekst)))];
    return r.length === 1 ? r[0] : 'object';
  }
  if (ts.isArrayTypeNode(t)) { const e = typZTs(t.elementType, kontekst); return e ? e + '[]' : null; }
  if (ts.isTupleTypeNode(t)) { const e = [...new Set(t.elements.map((x) => typZTs(x, kontekst)))]; return e.length === 1 ? e[0] + '[]' : 'object[]'; }
  if (ts.isTypeReferenceNode(t)) {
    const n = t.typeName.getText();
    if (unie.has(n)) return 'string';
    if (interfejsy.has(n)) return n;
    if (n === 'Record' || n === 'Partial') return null;
  }
  ostrzezenia.push(`${kontekst}: nieznany typ „${s}” — z wartości`);
  return null;
}

// ───────────────────────────── kształt z wartości ─────────────────────────────

const czyObiekt = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Klasy do wypisania: nazwa → { pola: Map(nazwa → { typ, doc }), rekord?: { klucze, typElementu } , doc } */
const klasy = new Map();

function typWartosci(v, nazwaKlasy, opis, kontekst, deklarowany) {
  if (typeof v === 'number') return 'double';
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'string') return 'string';
  if (Array.isArray(v)) {
    if (deklarowany && deklarowany.endsWith('[]') && (interfejsy.has(deklarowany.slice(0, -2)) || deklarowany.startsWith('double') || deklarowany.startsWith('string'))) {
      const el = deklarowany.slice(0, -2);
      if (interfejsy.has(el)) for (const x of v) dopiszKlase(el, x, null, kontekst);
      return deklarowany;
    }
    if (v.length === 0) return 'double[]';
    if (v.every((x) => typeof x === 'number')) return 'double[]';
    if (v.every((x) => typeof x === 'string')) return 'string[]';
    if (v.every((x) => typeof x === 'boolean')) return 'bool[]';
    if (v.every((x) => Array.isArray(x) && x.every((y) => typeof y === 'number'))) return 'double[][]';
    if (v.every((x) => Array.isArray(x) && x.every((y) => typeof y === 'string'))) return 'string[][]';
    if (v.every(czyObiekt)) {
      for (const x of v) dopiszKlase(nazwaKlasy, x, null, kontekst);
      return nazwaKlasy + '[]';
    }
    ostrzezenia.push(`${kontekst}: tablica mieszana`);
    return 'object[]';
  }
  if (czyObiekt(v)) {
    // klucze, które nie są nazwami w C# ('rasa-0', 'ryt-zasiej') — słownik napis → wartość (kolejność jak w TS)
    if (Object.keys(v).some((k) => !/^[\p{L}_][\p{L}\p{N}_]*$/u.test(k))) {
      const w = Object.values(v);
      const el = w.every((x) => typeof x === 'string') ? 'string' : w.every((x) => typeof x === 'number') ? 'double'
        : w.every((x) => typeof x === 'boolean') ? 'bool' : w.every(czyObiekt) ? (w.forEach((x) => dopiszKlase(`${nazwaKlasy}_wpis`, x, null, kontekst)), `${nazwaKlasy}_wpis`) : 'object';
      return `Dictionary<string, ${el}>`;
    }
    dopiszKlase(nazwaKlasy, v, opis, kontekst);
    return nazwaKlasy;
  }
  return 'object';
}

/** Dopisuje (scala) kształt obiektu v do klasy nazwa. opis — komentarze i typy z drzewa. */
function dopiszKlase(nazwa, v, opis, kontekst, rekord = null) {
  let k = klasy.get(nazwa);
  if (!k) { k = { pola: new Map(), wystapien: 0, rekord: null, doc: null }; klasy.set(nazwa, k); }
  k.wystapien++;
  if (rekord) k.rekord = rekord;
  const iface = interfejsy.get(nazwa);
  for (const [klucz, wart] of Object.entries(v)) {
    if (typeof wart === 'function' || wart === undefined) continue;
    const o = opis?.get(klucz);
    const zIface = iface?.pola.get(klucz);
    const podnazwa = rekord ? rekord.typElementu : `${nazwa}_${klucz}`;
    const deklarowany = zIface?.typ ?? null;
    let typ;
    const typRekordu = o?.typ && /^(Partial<)?Record</.test(o.typ) ? o.typ : null;
    if (typRekordu && czyObiekt(wart)) typ = dopiszRekord(`${nazwa}_${klucz}`, wart, o, typRekordu, `${kontekst}.${klucz}`);
    else typ = typWartosci(wart, deklarowany && interfejsy.has(deklarowany.replace('[]', '')) ? deklarowany.replace('[]', '') : podnazwa, o?.obiekt ? opisObiektu(plikTekst, o.obiekt) : null, `${kontekst}.${klucz}`, deklarowany);
    const stare = k.pola.get(klucz);
    if (stare && stare.typ !== typ) {
      if (stare.typ === 'double[]' && typ.endsWith('[]')) stare.typ = typ;
      else if (!(typ === 'double[]' && stare.typ.endsWith('[]'))) ostrzezenia.push(`${kontekst}.${klucz}: różne typy ${stare.typ} / ${typ}`);
    }
    if (!stare) k.pola.set(klucz, { typ, doc: o?.doc?.length ? o.doc : zIface?.doc ?? null, obecne: 0, wyrazenie: o?.wyrazenie ?? null });
    k.pola.get(klucz).obecne++;
  }
  if (iface) for (const [klucz, p] of iface.pola) if (!k.pola.has(klucz)) k.pola.set(klucz, { typ: p.typ ?? 'object', doc: p.doc, obecne: 0 });
}

/** Rekord Record<K, V> → klasa z polem na klucz, listą kluczy i indeksem. */
function dopiszRekord(nazwa, v, opis, typTekst, kontekst) {
  const m = /Record<\s*([^,]+?)\s*,\s*([\s\S]+)>\s*>?$/.exec(typTekst);
  let nazwaElementu = m ? m[2].trim().replace(/>$/, '').trim() : null;
  if (!nazwaElementu || !/^[A-Za-z_]\w*$/.test(nazwaElementu) || !interfejsy.has(nazwaElementu)) nazwaElementu = null;
  const wartosci = Object.values(v);
  const klucze = Object.keys(v);
  const opisObiektow = opis?.obiekt ? opisObiektu(plikTekst, opis.obiekt) : new Map();
  // Record<string, …> (klucze otwarte) albo klucze, które nie są nazwami w C# → słownik napis → wartość
  const kluczTyp = m ? m[1].trim() : '';
  if (!klucze.every((x) => /^\d+$/.test(x)) && (kluczTyp === 'string' || klucze.some((x) => !/^[\p{L}_][\p{L}\p{N}_]*$/u.test(x)))) {
    const el = wartosci.every((x) => typeof x === 'string') ? 'string' : wartosci.every((x) => typeof x === 'number') ? 'double'
      : wartosci.every((x) => typeof x === 'boolean') ? 'bool'
      : wartosci.every(czyObiekt) ? (wartosci.forEach((x) => dopiszKlase(nazwaElementu ?? `${nazwa}_wpis`, x, null, kontekst)), nazwaElementu ?? `${nazwa}_wpis`)
      : wartosci.every((x) => Array.isArray(x)) ? typWartosci(wartosci[0], `${nazwa}_wpis`, null, kontekst) : 'object';
    return `Dictionary<string, ${el}>`;
  }
  if (klucze.every((x) => /^\d+$/.test(x))) {
    // klucze liczbowe → słownik
    const el = wartosci.length && czyObiekt(wartosci[0]) ? (nazwaElementu ?? `${nazwa}_wpis`) : null;
    const typEl = el ? (wartosci.forEach((x) => dopiszKlase(el, x, null, kontekst)), el) : typWartosci(wartosci[0], `${nazwa}_wpis`, null, kontekst);
    return `Dictionary<int, ${typEl}>`;
  }
  const typEl = wartosci.every(czyObiekt)
    ? (nazwaElementu ?? `${nazwa}_wpis`)
    : wartosci.every((x) => typeof x === 'number') ? 'double?' : wartosci.every((x) => typeof x === 'string') ? 'string' : wartosci.every((x) => typeof x === 'boolean') ? 'bool' : wartosci.every((x) => Array.isArray(x)) ? typWartosci(wartosci[0], `${nazwa}_wpis`, null, kontekst) : 'object';
  if (wartosci.every(czyObiekt)) for (const [kl, x] of Object.entries(v)) dopiszKlase(typEl, x, opisObiektow.get(kl)?.obiekt ? opisObiektu(plikTekst, opisObiektow.get(kl).obiekt) : null, `${kontekst}.${kl}`);
  let k = klasy.get(nazwa);
  if (!k) { k = { pola: new Map(), wystapien: 1, rekord: { klucze, typElementu: typEl }, doc: null }; klasy.set(nazwa, k); }
  for (const kl of klucze) if (!k.pola.has(kl)) k.pola.set(kl, { typ: typEl, doc: opisObiektow.get(kl)?.doc ?? null, obecne: 1 });
  return nazwa;
}

// ───────────────────────────── wartości C# ─────────────────────────────

function liczba(v) {
  if (Number.isNaN(v)) return 'double.NaN';
  if (v === Infinity) return 'double.PositiveInfinity';
  if (v === -Infinity) return 'double.NegativeInfinity';
  if (Object.is(v, -0)) return '-0.0';
  return String(v);
}
const napis = (s) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '"';

function wartoscCs(v, typ, w) {
  if (v === undefined || v === null) return 'null';
  const t = typ.replace(/\?$/, '');
  if (t === 'double') return liczba(v);
  if (t === 'bool') return v ? 'true' : 'false';
  if (t === 'string') return napis(String(v));
  if (t.startsWith('Dictionary<int, ')) {
    const el = t.slice('Dictionary<int, '.length, -1);
    return `new ${t} { ${Object.entries(v).map(([k, x]) => `[${k}] = ${wartoscCs(x, el, w)}`).join(', ')} }`;
  }
  if (t.startsWith('Dictionary<string, ')) {
    const el = t.slice('Dictionary<string, '.length, -1);
    const sp = ' '.repeat(w + 4);
    return `new ${t}\n${' '.repeat(w)}{\n${Object.entries(v).map(([k, x]) => `${sp}[${napis(k)}] = ${wartoscCs(x, el, w + 4)},`).join('\n')}\n${' '.repeat(w)}}`;
  }
  if (t.endsWith('[]')) {
    const el = t.slice(0, -2);
    if (!v.length) return `new ${el}[0]`;
    const elementy = v.map((x) => wartoscCs(x, el, w + 4));
    const jednaLinia = `new ${t} { ${elementy.join(', ')} }`;
    if (jednaLinia.length < 110 && !el.startsWith('Nast') && !klasy.has(el)) return jednaLinia;
    const sp = ' '.repeat(w + 4);
    return `new ${t}\n${' '.repeat(w)}{\n${elementy.map((e) => sp + e).join(',\n')},\n${' '.repeat(w)}}`;
  }
  const k = klasy.get(t);
  if (k) {
    const sp = ' '.repeat(w + 4);
    const pola = [];
    for (const [kl, p] of k.pola) if (v[kl] !== undefined && typeof v[kl] !== 'function') pola.push(`${sp}${id(kl)} = ${wartoscCs(v[kl], p.typ, w + 4)},`);
    if (!pola.length) return `new ${t}()`;
    return `new ${t}\n${' '.repeat(w)}{\n${pola.join('\n')}\n${' '.repeat(w)}}`;
  }
  ostrzezenia.push(`brak typu ${typ} dla wartości ${JSON.stringify(v).slice(0, 60)}`);
  return 'null';
}

function typPola(p) {
  const t = p.typ;
  if (p.obecne === 0 || p.opcjonalne) return (t === 'double' || t === 'bool') ? t + '?' : t;
  return t;
}

function klasaCs(nazwa, k) {
  let s = docCs(k.doc ?? interfejsy.get(nazwa)?.doc, 4);
  s += `    public sealed partial class ${nazwa}\n    {\n`;
  for (const [kl, p] of k.pola) {
    const opcj = p.obecne < k.wystapien || (interfejsy.get(nazwa)?.pola.get(kl)?.opcjonalne ?? false);
    p.opcjonalne = opcj && !k.rekord;
    s += docCs(p.doc, 8);
    if (p.wyrazenie) s += `        // w TS: ${p.wyrazenie}\n`;
    s += `        public ${typPola(p)} ${id(kl)}${p.typ.endsWith('[]') || klasy.has(p.typ) || p.typ.startsWith('Dictionary') ? '' : ''};\n`;
  }
  if (k.rekord) {
    const el = k.rekord.typElementu;
    s += `\n        /// <summary>Klucze w kolejności z TS (Object.keys).</summary>\n`;
    s += `        public static readonly string[] klucze = { ${k.rekord.klucze.map(napis).join(', ')} };\n`;
    s += `\n        /// <summary>Wpis po kluczu (jak REKORD[klucz] w TS); brak — ${el.endsWith('?') ? 'null' : 'domyślny'}.</summary>\n`;
    s += `        public ${el} this[string klucz] => klucz switch\n        {\n`;
    for (const kl of k.rekord.klucze) s += `            ${napis(kl)} => ${id(kl)},\n`;
    s += `            _ => default!,\n        };\n`;
  }
  s += '    }\n';
  return s;
}

// ───────────────────────────── pliki ─────────────────────────────

let plikTekst = '';

function plikiTs(kat) {
  const w = [];
  for (const n of fs.readdirSync(kat, { withFileTypes: true })) {
    if (n.isDirectory()) w.push(...plikiTs(path.join(kat, n.name)));
    else if (n.name.endsWith('.ts') && !POMIJANE_PLIKI.has(n.name)) w.push(path.join(kat, n.name));
  }
  return w.sort();
}

const pliki = plikiTs(ZRODLO);
// najpierw interfejsy i unie ze wszystkich plików (pliki odwołują się do siebie)
const drzewa = new Map();
for (const f of pliki) {
  const tekst = fs.readFileSync(f, 'utf8');
  const sf = ts.createSourceFile(f, tekst, ts.ScriptTarget.Latest, true);
  drzewa.set(f, { tekst, sf });
  for (const st of sf.statements) {
    if (ts.isTypeAliasDeclaration(st) && ts.isUnionTypeNode(st.type) && st.type.types.every((x) => ts.isLiteralTypeNode(x) && ts.isStringLiteral(x.literal)))
      unie.set(st.name.text, { wartosci: st.type.types.map((x) => x.literal.text), doc: komentarz(tekst, st) });
    if (ts.isInterfaceDeclaration(st)) interfejsy.set(st.name.text, { wezel: st, doc: komentarz(tekst, st), pola: new Map(), tekst });
  }
}
for (const [n, i] of interfejsy) {
  for (const m of i.wezel.members) {
    if (!ts.isPropertySignature(m)) continue;
    const kl = nazwaWlasciwosci(m);
    i.pola.set(kl, { typ: typZTs(m.type, `${n}.${kl}`), doc: komentarz(i.tekst, m), opcjonalne: !!m.questionToken });
  }
}

const rejestr = [];
/** Wzorzec do testu: wartości wszystkich eksportów prosto z TS (testy/zlote/nastawy-ts.json). */
const wzorzec = {};
fs.mkdirSync(CEL, { recursive: true });
for (const f of pliki) {
  const wzgl = path.relative(ZRODLO, f).replace(/\\/g, '/');
  const nazwaPliku = pascal(wzgl.replace(/\.ts$/, '').replace(/^wyglad\//, 'wyglad-'));
  const klasaPliku = 'Nastawy' + nazwaPliku;
  const { tekst, sf } = drzewa.get(f);
  plikTekst = tekst;
  const mod = await import(url.pathToFileURL(f).href);
  klasy.clear();
  const pola = [];
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st) || !st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
    for (const d of st.declarationList.declarations) {
      const nazwa = d.name.getText();
      if (POMIJANE_EKSPORTY.has(nazwa)) continue;
      const v = mod[nazwa];
      if (typeof v === 'function') continue;
      const deklTyp = d.type ? d.type.getText() : typAs(d.initializer);
      const obj = rozpakuj(d.initializer);
      const opis = obj && ts.isObjectLiteralExpression(obj) ? opisObiektu(tekst, obj) : null;
      let typ;
      if (deklTyp && /^(Partial<)?Record</.test(deklTyp) && czyObiekt(v)) typ = dopiszRekord(`Typ_${nazwa}`, v, { obiekt: obj }, deklTyp, nazwa);
      else if (deklTyp && interfejsy.has(deklTyp) && czyObiekt(v)) { dopiszKlase(deklTyp, v, opis, nazwa); typ = deklTyp; }
      else if (deklTyp && deklTyp.endsWith('[]') && interfejsy.has(deklTyp.slice(0, -2))) { for (const x of v) dopiszKlase(deklTyp.slice(0, -2), x, null, nazwa); typ = deklTyp; }
      else typ = typWartosci(v, `Typ_${nazwa}`, opis, nazwa, null);
      if (klasy.has(typ) && !klasy.get(typ).doc) klasy.get(typ).doc = komentarz(tekst, st);
      (wzorzec[wzgl.replace(/\.ts$/, '').replace(/^wyglad\//, 'wyglad-')] ??= {})[nazwa] = v;
      pola.push({ nazwa, typ, v, doc: komentarz(tekst, st), wyrazenie: d.initializer && !obj?.properties && !ts.isArrayLiteralExpression(obj) && !ts.isNumericLiteral(obj) ? d.initializer.getText() : null });
    }
  }
  // unie i interfejsy z tego pliku, których nikt nie użył jako klasy — też wypisuję (kod gry ich potrzebuje)
  for (const st of sf.statements) if (ts.isInterfaceDeclaration(st) && !klasy.has(st.name.text)) {
    const i = interfejsy.get(st.name.text);
    klasy.set(st.name.text, { pola: new Map([...i.pola].map(([k, p]) => [k, { typ: p.typ ?? 'object', doc: p.doc, obecne: p.opcjonalne ? 0 : 1 }])), wystapien: 1, rekord: null, doc: i.doc });
  }
  const docPliku = [`Nastawy z alpha-1/src/nastawy/${wzgl} — pola jak eksporty w TS.`];
  let cs = `// Wygenerowane z alpha-1/src/nastawy/${wzgl} przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.\n`;
  cs += `// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/${wzgl.replace(/\.ts$/, '.json').replace(/^wyglad\//, 'wyglad-')}.\n`;
  cs += `using System.Collections.Generic;\n\nnamespace Trzewia.Nastawy\n{\n`;
  cs += docCs(docPliku, 4);
  cs += `    public static partial class ${klasaPliku}\n    {\n`;
  for (const p of pola) {
    cs += docCs(p.doc, 8);
    if (p.wyrazenie) cs += `        // w TS: ${p.wyrazenie.replace(/\s+/g, ' ').slice(0, 160)}\n`;
    cs += `        public static ${p.typ} ${id(p.nazwa)} = ${wartoscCs(p.v, p.typ, 8)};\n\n`;
  }
  for (const st of sf.statements) if (ts.isTypeAliasDeclaration(st) && unie.has(st.name.text)) {
    const u = unie.get(st.name.text);
    cs += docCs(u.doc.length ? u.doc : [`Typ ${st.name.text} z TS — dozwolone napisy.`], 8);
    cs += `        public static readonly string[] ${st.name.text} = { ${u.wartosci.map(napis).join(', ')} };\n\n`;
  }
  cs = cs.replace(/\n\n$/, '\n') + '    }\n';
  for (const [n, k] of klasy) cs += '\n' + klasaCs(n, k);
  cs += '}\n';
  const plikCs = path.join(CEL, (wzgl.startsWith('wyglad/') ? 'Wyglad/' : '') + pascal(path.basename(wzgl, '.ts')) + '.cs');
  fs.mkdirSync(path.dirname(plikCs), { recursive: true });
  fs.writeFileSync(plikCs, cs);
  rejestr.push([wzgl.replace(/\.ts$/, '').replace(/^wyglad\//, 'wyglad-'), klasaPliku]);
  console.log(`${wzgl} → ${path.relative(path.resolve(TU, '../..'), plikCs)} (${pola.length} eksportów, ${klasy.size} klas)`);
}

let r = `// Wygenerowane przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.\nusing System;\nusing System.Collections.Generic;\n\nnamespace Trzewia.Nastawy\n{\n`;
r += `    /// <summary>Spis plików nastaw: nazwa pliku w dane/nastawy (bez .json) → klasa z jego eksportami.</summary>\n`;
r += `    public static class Rejestr\n    {\n        public static readonly KeyValuePair<string, Type>[] Pliki =\n        {\n`;
for (const [n, k] of rejestr) r += `            new KeyValuePair<string, Type>(${napis(n)}, typeof(${k})),\n`;
r += `        };\n    }\n}\n`;
fs.writeFileSync(path.join(CEL, 'Rejestr.cs'), r);
fs.writeFileSync(path.resolve(TU, '../../testy/zlote/nastawy-ts.json'), JSON.stringify(wzorzec, (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v)));
if (ostrzezenia.length) { console.log('\nOSTRZEŻENIA:'); for (const o of ostrzezenia) console.log('  ' + o); }
