// Draws the Galim icon as SVG and rasterises it with sharp.
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const W = 1024;
function waves(scale = 1, cx = 512, cy = 512) {
  const L = 160 * scale, A = 34 * scale, gap = 112 * scale, sw = 46 * scale;
  const x0 = cx - 2 * L;
  const line = (y, c) => `<path d="M${x0} ${y} Q${x0 + L / 2} ${y - 2 * A} ${x0 + L} ${y} T${x0 + 2 * L} ${y} T${x0 + 3 * L} ${y} T${x0 + 4 * L} ${y}" stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`;
  return line(cy - gap, '#6D28D9') + line(cy, '#8E7CE0') + line(cy + gap, '#5DB892');
}
const grad = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EDE4FF"/><stop offset="1" stop-color="#FCE6D8"/></linearGradient></defs>`;
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}">${grad}<rect width="${W}" height="${W}" fill="url(#g)"/>${waves()}</svg>`;
const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}">${grad}<rect width="${W}" height="${W}" fill="url(#g)"/></svg>`;
const fg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}">${waves(0.8)}</svg>`;
const S = 2732, ic = 300;
const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><rect width="${S}" height="${S}" fill="#F6F2FB"/>
<svg x="${(S - ic) / 2}" y="${(S - ic) / 2}" width="${ic}" height="${ic}" viewBox="0 0 ${W} ${W}"><defs><clipPath id="r"><rect width="${W}" height="${W}" rx="230"/></clipPath>${grad.slice(6, -7)}</defs><g clip-path="url(#r)"><rect width="${W}" height="${W}" fill="url(#g)"/>${waves()}</g></svg></svg>`;

writeFileSync('resources/icon.svg', icon);
await sharp(Buffer.from(icon)).flatten({ background: '#EDE4FF' }).removeAlpha().png().toFile('resources/icon.png');
await sharp(Buffer.from(icon)).flatten({ background: '#EDE4FF' }).removeAlpha().png().toFile('resources/icon-only.png');
await sharp(Buffer.from(bg)).png().toFile('resources/icon-background.png');
await sharp(Buffer.from(fg)).png().toFile('resources/icon-foreground.png');
await sharp(Buffer.from(splash)).flatten({ background: '#F6F2FB' }).png().toFile('resources/splash.png');
await sharp(Buffer.from(splash)).flatten({ background: '#F6F2FB' }).png().toFile('resources/splash-dark.png');
await sharp(Buffer.from(icon)).resize(180).png().toFile('../qa/icon-180.png');
await sharp(Buffer.from(icon)).resize(58).png().toFile('../qa/icon-58.png');
console.log('icons done');
