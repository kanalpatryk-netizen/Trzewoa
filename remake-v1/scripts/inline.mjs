// Sklejenie builda w jeden plik HTML — do wysłania, obejrzenia i wrzucenia w WebView.
import fs from 'fs';
import path from 'path';

const dist = path.resolve('dist');
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

html = html.replace(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g, (_m, src) => {
  const js = fs.readFileSync(path.join(dist, src.replace(/^\.?\//, '')), 'utf8');
  return `<script type="module">\n${js}\n</script>`;
});
html = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_m, href) => {
  const css = fs.readFileSync(path.join(dist, href.replace(/^\.?\//, '')), 'utf8');
  return `<style>\n${css}\n</style>`;
});

// Każdy obrazek ma siedzieć w środku jako data:. Obrazek wydany jako osobny plik znaczy, że
// po pobraniu samego HTML-a grafiki znikną — wtedy lepiej przerwać niż wydać taką grę.
const pliki = (d) => fs.readdirSync(d, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? pliki(path.join(d, e.name)) : [path.join(d, e.name)]));
const obrazki = pliki(dist).filter((f) => /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(f));
if (obrazki.length) {
  console.error(`Nie wbudowane w HTML: ${obrazki.map((f) => path.relative(dist, f)).join(', ')}`);
  process.exit(1);
}

const out = path.resolve('trzewia.html');
fs.writeFileSync(out, html);
console.log(`${out} — ${(fs.statSync(out).size / 1024).toFixed(1)} kB`);
