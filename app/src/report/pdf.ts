// Minimal PDF writer: one full-page image per page. Lossless (Flate) when the
// platform has CompressionStream, otherwise high-quality JPEG.

const enc = new TextEncoder();

async function deflate(data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const cs = new CompressionStream('deflate');
  const stream = new Blob([data]).stream().pipeThrough(cs);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

interface PageImage {
  w: number;
  h: number;
  filter: 'FlateDecode' | 'DCTDecode';
  bytes: Uint8Array<ArrayBuffer>;
}

async function encodePage(c: HTMLCanvasElement): Promise<PageImage> {
  if (typeof CompressionStream !== 'undefined') {
    const ctx = c.getContext('2d')!;
    const px = ctx.getImageData(0, 0, c.width, c.height).data;
    const rgb = new Uint8Array(c.width * c.height * 3);
    for (let i = 0, j = 0; i < px.length; i += 4, j += 3) {
      rgb[j] = px[i];
      rgb[j + 1] = px[i + 1];
      rgb[j + 2] = px[i + 2];
    }
    return { w: c.width, h: c.height, filter: 'FlateDecode', bytes: await deflate(rgb) };
  }
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('jpeg'))), 'image/jpeg', 0.92));
  return { w: c.width, h: c.height, filter: 'DCTDecode', bytes: new Uint8Array(await blob.arrayBuffer()) };
}

export async function buildPdf(canvases: HTMLCanvasElement[], wMm: number, hMm: number): Promise<Uint8Array<ArrayBuffer>> {
  const W = ((wMm / 25.4) * 72).toFixed(2);
  const H = ((hMm / 25.4) * 72).toFixed(2);
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let pos = 0;
  const push = (b: Uint8Array | string) => {
    const u = typeof b === 'string' ? enc.encode(b) : b;
    chunks.push(u);
    pos += u.length;
  };
  const n = canvases.length;
  // object numbers: 1 catalog, 2 pages, 3 info, then per page: page, content, image
  const pageObj = (i: number) => 4 + i * 3;
  const obj = (num: number, body: string) => {
    offsets[num] = pos;
    push(`${num} 0 obj\n${body}\nendobj\n`);
  };

  push('%PDF-1.4\n');
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Count ${n} /Kids [${canvases.map((_, i) => `${pageObj(i)} 0 R`).join(' ')}] >>`);
  obj(3, '<< /Producer (Galim) /Creator (Galim) >>');
  for (let i = 0; i < n; i++) {
    const img = await encodePage(canvases[i]);
    const p = pageObj(i);
    obj(p, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${p + 2} 0 R >> >> /Contents ${p + 1} 0 R >>`);
    const content = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
    obj(p + 1, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    offsets[p + 2] = pos;
    push(`${p + 2} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /${img.filter} /Length ${img.bytes.length} >>\nstream\n`);
    push(img.bytes);
    push('\nendstream\nendobj\n');
  }
  const total = 4 + n * 3;
  const xref = pos;
  let x = `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (let i = 1; i < total; i++) x += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  push(x);
  push(`trailer\n<< /Size ${total} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(pos);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}
