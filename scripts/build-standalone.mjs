/* Build a fully self-contained copy of the page:
 *   node scripts/build-standalone.mjs
 * All fonts are embedded as base64, so the single HTML file works offline
 * from a USB stick, an email attachment, or file://.
 */
import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFile(path.join(root, file), 'utf8');

let html = await read('index.html');
let css = await read('styles.css');
const audio = await read('audio.js');
const scene = await read('scene.js');
const main = await read('main.js');

for (const [label, source] of [['audio', audio], ['scene', scene], ['main', main]]) {
  if (source.includes('</script')) throw new Error(`${label}.js contains a closing script tag`);
}
if (css.includes('</style')) throw new Error('styles.css contains a closing style tag');

const fontCache = new Map();
async function fontDataUri(file) {
  if (!fontCache.has(file)) {
    const buf = await readFile(path.join(root, 'assets', 'fonts', file));
    fontCache.set(file, `data:font/woff2;base64,${buf.toString('base64')}`);
  }
  return fontCache.get(file);
}

const fontFiles = [...new Set([...css.matchAll(/url\('\.\/assets\/fonts\/([^']+)'\)/g)].map((m) => m[1]))];
for (const file of fontFiles) {
  const uri = await fontDataUri(file);
  css = css.split(`url('./assets/fonts/${file}')`).join(`url('${uri}')`);
}

const escapeHtml = (text) => text
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const licenses = await Promise.all([
  read('assets/OFL-CormorantGaramond.txt'),
  read('assets/OFL-NotoSerifSC.txt')
]);

html = html.replace(
  '  <link rel="stylesheet" href="styles.css">',
  () => `  <!-- Standalone edition: type, paint and sound are all embedded below. -->\n  <style>\n${css}\n  </style>`
);

const scriptTags = '  <script src="audio.js"></script>\n  <script src="scene.js"></script>\n  <script src="main.js"></script>';
if (!html.includes(scriptTags)) throw new Error('Could not find script tags to inline');
// Use a replacer function: a string replacement would interpret `$$` in the
// source as a literal `$` and silently corrupt JavaScript code.
html = html.replace(
  scriptTags,
  () => `  <script>\n${audio}\n${scene}\n${main}\n  </script>`
);

const licenseBlock = `  <div hidden id="font-licenses" aria-hidden="true">\n` +
  `<pre>${escapeHtml(licenses.join('\n\n' + '-'.repeat(72) + '\n\n'))}</pre>\n` +
  `  </div>\n`;
html = html.replace('  <div class="toast-region"', () => licenseBlock + '  <div class="toast-region"');

await writeFile(path.join(root, 'noel-standalone.html'), html, 'utf8');
const info = await stat(path.join(root, 'noel-standalone.html'));
console.log(`Wrote noel-standalone.html (${(info.size / 1024).toFixed(0)} KiB, ${fontFiles.length} embedded font files)`);
