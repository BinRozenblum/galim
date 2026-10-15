// Fails if the built app contains any http(s) URL other than the explicit
// outbound links (opened in the OS, never fetched) and inert identifiers.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ALLOW = [
  'https://binrozenblum.co.il', // credit link
  'https://binrozenblum.co.il/galim/privacy', // privacy policy link
  'https://binrozenblum.co.il/galim/terms', // terms of use link
  'https://binrozenblum.co.il/galim/accessibility', // accessibility statement link
  'https://sahar.org.il', // crisis support link
  'http://www.w3.org/2000/svg', // SVG namespace identifier, not a request
  'https://capacitorjs.com/', // license comment
];
const BAN = ['localhost:8913', 'demoData', '__qa', 'unsafe-eval'];

const files = [];
const walk = (d) => readdirSync(d).forEach((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : files.push(join(d, f))));
walk('dist');
let bad = 0;
for (const f of files) {
  if (!/\.(js|css|html|json|svg)$/.test(f)) continue;
  const s = readFileSync(f, 'utf8');
  for (const m of s.matchAll(/https?:\/\/[^\s"'`)<>\\]+/g)) {
    if (!ALLOW.includes(m[0])) {
      console.log('URL not allowed:', m[0], 'in', f);
      bad++;
    }
  }
  for (const b of BAN) if (s.includes(b)) { console.log('dev-only code in production build:', b, 'in', f); bad++; }
}
const html = readFileSync('dist/index.html', 'utf8');
if (!html.includes("default-src 'self'") || !html.includes("connect-src 'self';")) { console.log('strict CSP missing'); bad++; }
console.log(bad ? `FAIL (${bad})` : `OK: ${files.length} files, only allowed outbound links`);
process.exit(bad ? 1 : 0);
