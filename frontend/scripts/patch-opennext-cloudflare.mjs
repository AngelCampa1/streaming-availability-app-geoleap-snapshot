import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const serverRoot = path.join(root, '.open-next', 'server-functions', 'default');
const handlerPath = path.join(serverRoot, 'handler.mjs');
const metaPath = path.join(serverRoot, 'handler.mjs.meta.json');
const ogSourceDir = path.join(root, 'node_modules', 'next', 'dist', 'compiled', '@vercel', 'og');
const ogOutputDir = path.join(serverRoot, 'node_modules', 'next', 'dist', 'compiled', '@vercel', 'og');

function patchPrefetchHintsManifest() {
  let handler = fs.readFileSync(handlerPath, 'utf8');

  const marker = 'path2.endsWith(".next/BUILD_ID"))return process.env.NEXT_BUILD_ID;';
  if (!handler.includes(marker)) {
    throw new Error('Could not find OpenNext loadManifest BUILD_ID marker');
  }

  const optionalManifestHandlers = [
    'if(path2.endsWith("/prefetch-hints.json"))return{};',
    'if(path2.endsWith("/subresource-integrity-manifest.json"))return{};',
    'if(path2.endsWith("/dynamic-css-manifest"))return{};',
  ];

  let replacement = marker;
  for (const manifestHandler of optionalManifestHandlers) {
    if (!handler.includes(manifestHandler)) {
      replacement += manifestHandler;
    }
  }

  if (replacement !== marker) {
    handler = handler.replace(marker, replacement);
  }

  fs.writeFileSync(handlerPath, handler);
}

function patchVercelOgAssets() {
  fs.mkdirSync(ogOutputDir, { recursive: true });

  for (const filename of ['yoga.wasm', 'resvg.wasm']) {
    const source = path.join(ogSourceDir, filename);
    const destination = path.join(ogOutputDir, filename);
    if (fs.existsSync(source) && !fs.existsSync(destination)) {
      fs.copyFileSync(source, destination);
    }
  }

  if (!fs.existsSync(metaPath)) {
    return;
  }

  const escapedServerRoot = serverRoot.replaceAll(path.sep, '/').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const relativePrefix = '.open-next/server-functions/default';
  const absoluteServerRootPattern = new RegExp(escapedServerRoot, 'gi');
  const meta = fs.readFileSync(metaPath, 'utf8').replace(absoluteServerRootPattern, relativePrefix);
  fs.writeFileSync(metaPath, meta);
}

patchPrefetchHintsManifest();
patchVercelOgAssets();
