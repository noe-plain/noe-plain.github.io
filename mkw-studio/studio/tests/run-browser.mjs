import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.wasm':'application/wasm','.otf':'font/otf','.icc':'application/octet-stream'};
const server=http.createServer(async(request,response)=>{try{const url=new URL(request.url,'http://localhost'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));if(!file.startsWith(root))throw Error('Outside root');response.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');response.end(await readFile(file))}catch{response.writeHead(404);response.end('Not found')}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const studioURL=process.env.STUDIO_URL||`http://127.0.0.1:${server.address().port}/`;
const tests=process.argv.slice(2);if(!tests.length)tests.push('project-storage','project-migration','render-export','batch-import','asset-cache','advanced-tools','paint-paths','paint-rendering','paint-position','appearance-carousel-psd','carousel-frames-text','carousel-alignment','carousel-pdf','workspace-ui','user-fonts','editor-forms','post-workspace');let failed=0;
try{for(const test of tests){console.log(`\nBrowser: ${test}`);const code=await new Promise(resolve=>{const child=spawn(process.execPath,[`tests/${test.replace(/\.cjs$/,'')}.cjs`],{cwd:root,stdio:'inherit',env:{...process.env,STUDIO_URL:studioURL}}),timeout=setTimeout(()=>{console.error('Browser test timed out');child.kill('SIGTERM')},180000);child.on('exit',code=>{clearTimeout(timeout);resolve(code??1)});child.on('error',error=>{clearTimeout(timeout);console.error(error);resolve(1)})});if(code)failed++}}finally{server.close()}
if(failed)process.exitCode=1;console.log(`\n${tests.length-failed}/${tests.length} browser suites passed.`);
