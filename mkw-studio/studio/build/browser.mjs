import {build} from 'esbuild';
import {cp,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
for(const [entry,name,out] of [['vision-entry.js','MKWVision','vision.js'],['png-entry.js','MKWPNG','png.js']])await build({absWorkingDir:root,entryPoints:['build/'+entry],bundle:true,minify:true,format:'iife',globalName:name,outfile:'static/vendor/'+out});
await mkdir(path.join(root,'static/vendor/vision-wasm'),{recursive:true});
await cp(path.join(root,'node_modules/@mediapipe/tasks-vision/wasm'),path.join(root,'static/vendor/vision-wasm'),{recursive:true});
