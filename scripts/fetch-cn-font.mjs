/* Build a tiny Chinese webfont subset from the page's own copy.
 * Run from the project root: node scripts/fetch-cn-font.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sources = ['index.html', 'styles.css', 'main.js', 'scene.js', 'audio.js'];
let text = '';
for (const file of sources) {
  text += await readFile(path.join(root, file), 'utf8');
}

// Every CJK character used by the artwork, plus punctuation that can appear
// in the writing surface and the small amount of UI chrome around it.
const glyphSet = new Set();
for (const char of text) {
  if (/[\u3000-\u303f\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]/.test(char)) {
    glyphSet.add(char);
  }
}
// Extra characters a guest may reasonably type into the wish textarea.
const extras = '你好我你他她它们我们的了是在有和就不人都一这那会来去说对时也要想看爱被让很还等可以吗呢吧啊呀愿旦快乐平安夜冬雪星光明月亮暖风花梦思念家回家礼物幸福健康顺遂成功未来过去现在永远一生一世喜欢想念记得忘记遇见陪伴青春岁月温柔勇敢自由远方旅行动力希望实现成真惊喜浪漫美好日子天天开心每分每秒们您吗嘛啦哦嗯谢谢再见圣诞新年春快平安喜乐万事胜意岁岁欢愉';
for (const char of extras) glyphSet.add(char);
const glyphs = Array.from(glyphSet).join('');
await writeFile(path.join(root, 'assets', 'glyphs.txt'), glyphs, 'utf8');
console.log('Unique glyphs:', glyphSet.size);

const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const api = `https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600&display=swap&text=${encodeURIComponent(glyphs)}`;
const cssRes = await fetch(api, { headers: { 'User-Agent': ua } });
if (!cssRes.ok) throw new Error(`Google Fonts CSS: ${cssRes.status}`);
const css = await cssRes.text();
const blocks = css.split('@font-face').slice(1).map((s) => '@font-face' + s.split('}')[0] + '}');
console.log('@font-face blocks:', blocks.length);
const rules = [];
for (const block of blocks) {
  const weight = /font-weight:\s*(\d+)/.exec(block)?.[1] || '400';
  // Google's text= endpoint returns a dynamic /l/font URL, not a .woff2 path.
  const url = /url\((https:[^)]+)\)/.exec(block)?.[1];
  if (!url) continue;
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  const name = `noto-serif-sc-${weight}.woff2`;
  await writeFile(path.join(root, 'assets', 'fonts', name), buf);
  console.log(name, `${(buf.length / 1024).toFixed(1)} KiB`);
  rules.push(`@font-face {
  font-family: 'Noto Serif SC';
  font-style: normal;
  font-weight: ${weight};
  font-display: swap;
  src: url('./assets/fonts/${name}') format('woff2');
}`);
}
await writeFile(path.join(root, 'assets', 'fonts', 'noto-serif-sc.css'), rules.join('\n\n') + '\n');

// OFL notices are part of both fonts' distribution requirements.
for (const [name, url] of [
  ['OFL-CormorantGaramond.txt', 'https://raw.githubusercontent.com/google/fonts/main/ofl/cormorantgaramond/OFL.txt'],
  ['OFL-NotoSerifSC.txt', 'https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifsc/OFL.txt']
]) {
  try {
    const res = await fetch(url);
    if (res.ok) {
      await writeFile(path.join(root, 'assets', name), await res.text(), 'utf8');
      console.log('wrote', name);
    }
  } catch (error) {
    console.warn('license download skipped:', name, error.message);
  }
}
