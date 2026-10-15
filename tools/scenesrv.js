// Scene server for the Galim simulator QA (dev-scenes builds only).
// GET /set?c=<scene> queues a scene, GET /cmd is polled by the app,
// POST /log collects eval output (GET /logs drains it), POST /file?name= saves a base64 file to ../qa/.
const http = require('http');
const fs = require('fs');
const path = require('path');
let cmd = { id: 0, url: '' };
let logs = [];
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const u = new URL(req.url, 'http://x');
  const body = (fn) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => fn(b)); };
  if (u.pathname === '/set') { cmd = { id: cmd.id + 1, url: u.searchParams.get('c') }; res.end('ok ' + cmd.id); return; }
  if (u.pathname === '/log') { body((b) => { logs.push(b); res.end('ok'); }); return; }
  if (u.pathname === '/logs') { res.end(logs.join('\n')); logs = []; return; }
  if (u.pathname === '/file') {
    body((b) => {
      const name = path.basename(u.searchParams.get('name') || 'out.bin');
      const out = path.join(__dirname, '..', 'qa', name);
      fs.writeFileSync(out, Buffer.from(b, 'base64'));
      res.end('saved ' + out);
    });
    return;
  }
  if (u.pathname === '/cmd') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(cmd)); return; }
  res.end('galim scene server');
}).listen(8913);
