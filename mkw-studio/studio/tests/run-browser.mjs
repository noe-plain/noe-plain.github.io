import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm', '.otf': 'font/otf', '.icc': 'application/octet-stream' };
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname) + (url.pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(root)) throw Error('Outside root');
    response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    response.end(await readFile(file));
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const studioURL = process.env.STUDIO_URL || `http://127.0.0.1:${server.address().port}/`;
const tests = process.argv.slice(2);
if (!tests.length) tests.push('material-cards', 'material-inspectors', 'material-start', 'material-workflow', 'material-controls', 'material-ui', 'dialog-layout', 'designer-layout', 'path-continuation', 'templates', 'template-library', 'carousel-limits', 'inline-fidelity', 'text-hyphenation', 'post-text-size-scope', 'text-justification', 'sponsor-auto', 'post-text-stack', 'advanced-typography', 'post-safezones', 'angle-axis', 'post-angle', 'native-incremental-save', 'setup-file', 'large-project-frames', 'sponsors-help', 'project-retention', 'carousel-photo-effects', 'carousel-refinements', 'interactive-performance', 'project-storage', 'project-migration', 'render-export', 'carousel-export-images', 'project-open', 'asset-cache', 'advanced-tools', 'paint-paths', 'paint-rendering', 'paint-position', 'path-bounds', 'appearance-carousel-psd', 'carousel-frames-text', 'carousel-text-alignment', 'carousel-alignment', 'carousel-pdf', 'workspace-ui', 'user-fonts', 'editor-forms', 'post-workspace');
let failed = 0;
try {
  for (const test of tests) {
    console.log(`\nBrowser: ${test}`);
    let output = '';
    const code = await new Promise(resolve => {
      const child = spawn(process.execPath, [`tests/${test.replace(/\.cjs$/, '')}.cjs`], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, STUDIO_URL: studioURL } });
      const record = (stream, chunk) => {
        stream.write(chunk);
        output = (output + chunk.toString()).slice(-12000);
      };
      child.stdout.on('data', chunk => record(process.stdout, chunk));
      child.stderr.on('data', chunk => record(process.stderr, chunk));
      const timeout = setTimeout(() => {
        output += '\nBrowser test timed out';
        console.error('Browser test timed out');
        child.kill('SIGTERM');
      }, 180000);
      child.on('exit', code => { clearTimeout(timeout); resolve(code ?? 1); });
      child.on('error', error => { clearTimeout(timeout); output += '\n' + error.message; console.error(error); resolve(1); });
    });
    if (code) {
      failed++;
      // Surface the actual failure in the run summary, including for readers who
      // cannot open GitHub's authenticated raw logs. Never reduce test assertions.
      if (process.env.GITHUB_ACTIONS === 'true') {
        const message = output.replace(/\u001b\[[0-9;]*m/g, '').trim().slice(-4000).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
        console.error(`::error title=Browser test ${test}::${message}`);
      }
    }
  }
} finally {
  server.close();
}
if (failed) process.exitCode = 1;
console.log(`\n${tests.length - failed}/${tests.length} browser suites passed.`);
