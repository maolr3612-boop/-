import fs from 'node:fs';
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png'};
const paths=['index.html','style.css','cover.css','turntable.js','library.css','library.js','assets/maolongrui-turntable.png','assets/maolongrui-turntable-v2.png','projects/laowu/index.html','projects/laowu/cover.png'];
const assets={};for(const p of paths){const ext=p.slice(p.lastIndexOf('.'));assets['/'+p]={type:types[ext],data:fs.readFileSync('web/'+p).toString('base64')}}
fs.mkdirSync('dist/server',{recursive:true});fs.mkdirSync('dist/.openai',{recursive:true});
fs.writeFileSync('dist/server/index.js',`const ASSETS=${JSON.stringify(assets)};\nconst IMPORTED_WORKS=${fs.readFileSync('worker/imports.json','utf8')};\n`+fs.readFileSync('worker/index.js','utf8'));
fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');console.log('Built Worker with embedded website assets and cloud portfolio storage.');

