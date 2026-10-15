import { defineConfig, type Plugin } from 'vite';

// CSP: production = strict (no network at all). Dev server / dev-scenes builds
// relax it only so the simulator scene server and HMR can talk to localhost.
const STRICT =
  "default-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data: blob:; " +
  "style-src 'self' 'unsafe-inline'; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'none'";

function csp(relaxed: boolean): Plugin {
  const policy = relaxed
    ? STRICT.replace("script-src 'self'", "script-src 'self' 'unsafe-eval' 'unsafe-inline'")
        .replace("connect-src 'self'", "connect-src 'self' http://localhost:8912 ws://localhost:* http://localhost:*")
    : STRICT;
  return {
    name: 'galim-csp',
    transformIndexHtml(html) {
      return html.replace('%CSP%', policy);
    },
  };
}

export default defineConfig(({ command }) => ({
  base: './',
  plugins: [csp(command === 'serve' || !!process.env.VITE_DEV_SCENES)],
  build: { outDir: 'dist', assetsInlineLimit: 0, target: 'es2020', sourcemap: false },
  test: { environment: 'node' },
}));
