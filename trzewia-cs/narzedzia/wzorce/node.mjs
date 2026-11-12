// Ta sama funkcja co chromium.mjs, ale w Node (do porównań Node ↔ Chromium).
//   node --experimental-transform-types narzedzia/wzorce/node.mjs <plik.ts> <funkcja> '<argumenty JSON>'
import { register } from 'node:module';
import path from 'node:path';
import url from 'node:url';
register('../nastawy/ts-rozwiazywanie.mjs', import.meta.url);
const [wejscie, funkcja, argJson = '[]'] = process.argv.slice(2);
const m = await import(url.pathToFileURL(path.resolve(wejscie)).href);
process.stdout.write(JSON.stringify(m[funkcja](...JSON.parse(argJson))));
