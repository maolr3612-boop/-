import {build} from 'esbuild';
await build({entryPoints:['src/model-viewer.js'],bundle:true,minify:true,format:'iife',outfile:'web/model-viewer.js',legalComments:'eof'});
