/* Download local webfonts so the page stays beautiful offline. Run:
 *   node scripts/fetch-fonts.mjs
 * Only Latin subsets of Cormorant Garamond are downloaded here. The Chinese
 * subset is generated later from the final page copy (see build-standalone.py).
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'assets', 'fonts');

async function getText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function getBuffer(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

const css = await getText(
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap'
);

// Keep only the latin @font-face blocks, and de-duplicate by URL.
const blocks = css.split('/*').slice(1).map((chunk) => '/*' + chunk);
const wanted = [];
for (const block of blocks) {
  if (!/\/\* latin \*\//.test(block)) continue;
  const style = /font-style:\s*(\w+)/.exec(block)?.[1];
  const weight = /font-weight:\s*(\d+)/.exec(block)?.[1];
  const url = /url\((https:[^)]+\.woff2)\)/.exec(block)?.[1];
  if (!url) continue;
  const key = `${style}-${weight}`;
  if (wanted.some((w) => w.key === key)) continue;
  wanted.push({ key, style, weight, url });
}

console.log('Cormorant faces:', wanted.map((w) => w.key).join(', '));
const cssRules = [];
for (const face of wanted) {
  const buf = await getBuffer(face.url);
  const name = `cormorant-garamond-${face.style}-${face.weight}.woff2`;
  await writeFile(path.join(outDir, name), buf);
  console.log(name, `${(buf.length / 1024).toFixed(1)} KiB`);
  cssRules.push(`@font-face {
  font-family: 'Cormorant Garamond';
  font-style: ${face.style};
  font-weight: ${face.weight};
  font-display: swap;
  src: url('./assets/fonts/${name}') format('woff2');
}`);
}

await writeFile(path.join(outDir, 'cormorant.css'), cssRules.join('\n\n') + '\n');
console.log('wrote cormorant.css');
