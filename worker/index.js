const OWNER_EMAIL='maolr3612@gmail.com';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const json=(data,status=200)=>Response.json(data,{status,headers});
const editable=(req,env)=>env?.AUTH_PROVIDER!=='cloudflare'&&(req.headers.get('oai-authenticated-user-email')||'').toLowerCase()===OWNER_EMAIL;
const validId=id=>/^[a-f0-9-]{36}$/.test(id);
const categorySet=new Set(['AI 智能体','产品设计','视觉设计','其他']);
// Explicit user-requested imports run once per record. A durable marker preserves
// later edits and deletions; deployments never recreate an imported work.
async function importWorks(bucket){for(const source of IMPORTED_WORKS){const marker='portfolio/imports/'+source.id+'.json';if(await bucket.get(marker))continue;const key='portfolio/records/'+source.id+'.json';if(!await bucket.get(key)){const coverKey='portfolio/covers/'+source.id+'.png';const asset=ASSETS[source.coverAsset];await bucket.put(coverKey,Uint8Array.from(atob(asset.data),x=>x.charCodeAt(0)),{httpMetadata:{contentType:'image/png'},onlyIf:{etagDoesNotMatch:'*'}});const {coverAsset,...record}=source;await bucket.put(key,JSON.stringify({...record,coverKey,coverUrl:'/api/covers/'+source.id+'.png',updatedAt:source.createdAt}),{httpMetadata:{contentType:'application/json'},onlyIf:{etagDoesNotMatch:'*'}})}await bucket.put(marker,JSON.stringify({id:source.id,completed:true}),{httpMetadata:{contentType:'application/json'}})}}
async function listAll(bucket){let objects=[],cursor;do{const page=await bucket.list({prefix:'portfolio/records/',cursor});objects.push(...page.objects);cursor=page.truncated?page.cursor:undefined}while(cursor);const records=await Promise.all(objects.map(async x=>{const obj=await bucket.get(x.key);return obj?obj.json():null}));return records.filter(Boolean).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
async function api(req,env,url){const path=url.pathname,method=req.method;
if(path==='/api/session'&&method==='GET')return json({canEdit:editable(req,env)});
if(!env.BUCKET&&path==='/api/works'&&method==='GET'&&env.AUTH_PROVIDER==='cloudflare')return json({works:IMPORTED_WORKS.map(({coverAsset,...work})=>{const link=new URL(work.link);return {...work,coverUrl:coverAsset,updatedAt:work.createdAt,link:link.hostname==='stillform-designer.cocoafairy13.chatgpt.site'&&link.pathname.startsWith('/projects/')?new URL(link.pathname+link.search+link.hash,url.origin).href:link.href}}),readOnly:true});
if(!env.BUCKET)return json({error:'作品存储尚未就绪，请稍后重试。'},503);
if(path==='/api/works'&&method==='GET'){await importWorks(env.BUCKET);return json({works:await listAll(env.BUCKET)})}
if(path.startsWith('/api/covers/')&&method==='GET'){const key=path.slice('/api/covers/'.length);if(!/^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(key))return json({error:'封面不存在'},404);const obj=await env.BUCKET.get('portfolio/covers/'+key);if(!obj)return json({error:'封面不存在'},404);return new Response(obj.body,{headers:{'Content-Type':obj.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff'}})}
const id=path.startsWith('/api/works/')?path.slice('/api/works/'.length):null;
if((path==='/api/works'&&method==='POST')||(id&&['PUT','DELETE'].includes(method))){
if(!editable(req,env))return json({error:'仅网站所有者可以编辑作品。'},403);
if(req.headers.get('Origin')!==url.origin||req.headers.get('X-Requested-With')!=='portfolio')return json({error:'请求来源不正确，请刷新后重试。'},403);
if(id&&!validId(id))return json({error:'作品不存在。'},404);
const key=id?'portfolio/records/'+id+'.json':null,existing=key?await env.BUCKET.get(key):null;
if(id&&!existing)return json({error:'作品已被删除，请刷新列表。'},404);
const old=existing?await existing.json():null;
if(method==='DELETE'){await env.BUCKET.delete(key);if(old.coverKey)await env.BUCKET.delete(old.coverKey);return json({ok:true})}
if(Number(req.headers.get('Content-Length')||0)>6*1024*1024)return json({error:'上传内容过大，封面请控制在 5 MB 内。'},413);
const form=await req.formData();const title=String(form.get('title')||'').trim(),description=String(form.get('description')||'').trim(),category=String(form.get('category')||''),link=String(form.get('link')||'').trim(),tags=String(form.get('tags')||'').split(/[,，]/).map(x=>x.trim()).filter(Boolean);
if(!title||title.length>80||description.length>4000||!categorySet.has(category)||tags.length>8||tags.some(t=>t.length>24))return json({error:'请填写标题（最多 80 字）和分类，简介最多 4000 字，标签最多 8 个、每个 24 字。'},400);
if(link){try{const u=new URL(link);if(!['https:','http:'].includes(u.protocol)||link.length>2048)throw Error()}catch{return json({error:'项目链接须为完整的 http 或 https 地址。'},400)}}
const cover=form.get('cover'),remove=form.get('removeCover')==='true',workId=id||crypto.randomUUID();let coverKey=remove?null:old?.coverKey||null,newCover=null;
if(cover&&typeof cover!=='string'&&cover.size){if(cover.size>5*1024*1024)return json({error:'封面图片不能超过 5 MB。'},413);const data=new Uint8Array(await cover.arrayBuffer());let type,ext;if(data[0]===137&&data[1]===80&&data[2]===78&&data[3]===71){type='image/png';ext='png'}else if(data[0]===255&&data[1]===216&&data[2]===255){type='image/jpeg';ext='jpg'}else if(String.fromCharCode(...data.slice(0,4))==='RIFF'&&String.fromCharCode(...data.slice(8,12))==='WEBP'){type='image/webp';ext='webp'}else return json({error:'封面仅支持 PNG、JPG、WebP 图片。'},400);coverKey='portfolio/covers/'+crypto.randomUUID()+'.'+ext;newCover=coverKey;await env.BUCKET.put(coverKey,data,{httpMetadata:{contentType:type}})}
const now=new Date().toISOString(),work={id:workId,title,description,category,link,tags,coverKey,coverUrl:coverKey?'/api/covers/'+coverKey.split('/').pop():null,createdAt:old?.createdAt||now,updatedAt:now};
try{const options={httpMetadata:{contentType:'application/json'}};if(existing?.etag)options.onlyIf={etagMatches:existing.etag};const saved=await env.BUCKET.put('portfolio/records/'+workId+'.json',JSON.stringify(work),options);if(!saved){if(newCover)await env.BUCKET.delete(newCover);return json({error:'作品已在其他页面更新，请刷新后重试。'},409)}}catch(e){if(newCover)await env.BUCKET.delete(newCover);throw e}
if(old?.coverKey&&old.coverKey!==coverKey)await env.BUCKET.delete(old.coverKey);return json({work},id?200:201);
}return json({error:'接口不存在。'},404)}
export default {async fetch(req,env){const url=new URL(req.url);try{if(url.pathname.startsWith('/api/'))return await api(req,env,url);const asset=ASSETS[url.pathname==='/'?'/index.html':url.pathname];if(!asset)return new Response('Not found',{status:404});if(!['GET','HEAD'].includes(req.method))return new Response('Method not allowed',{status:405});const bytes=Uint8Array.from(atob(asset.data),x=>x.charCodeAt(0));return new Response(req.method==='HEAD'?null:bytes,{headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}})}catch(e){console.error('Portfolio request failed:',e.message);return json({error:'暂时无法保存或读取作品，请稍后重试。'},500)}}};

