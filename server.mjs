import http from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const publicRoot=fileURLToPath(new URL('./dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.ico':'image/x-icon'};
const inside=(root,target)=>{const relative=path.relative(root,target);return relative!==''&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative);};
export function createGuideServer(root=publicRoot){
  return http.createServer(async(req,res)=>{
    const reply=(code,message,headers={})=>{res.writeHead(code,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store',...headers});res.end(req.method==='HEAD'?undefined:message);};
    if(!['GET','HEAD'].includes(req.method))return reply(405,'Only GET and HEAD are supported.',{Allow:'GET, HEAD'});
    let pathname;
    try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{return reply(400,'Invalid URL.');}
    if(pathname.includes('\0')||pathname.includes('\\')||pathname.split('/').some(p=>p.startsWith('.')))return reply(403,'Not available.');
    const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!inside(root,target))return reply(403,'Not available.');
    try{
      const [canonicalRoot,canonicalTarget]=await Promise.all([realpath(root),realpath(target)]);
      if(!inside(canonicalRoot,canonicalTarget))return reply(403,'Not available.');
      const info=await stat(canonicalTarget);
      if(!info.isFile())return reply(404,'Not found.');
      const body=req.method==='HEAD'?null:await readFile(canonicalTarget);
      res.writeHead(200,{'Content-Type':types[path.extname(target).toLowerCase()]||'application/octet-stream','Content-Length':body?body.length:info.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      res.end(body);
    }catch(error){reply(['ENOENT','ENOTDIR','EACCES','EPERM'].includes(error.code)?404:500,'Unable to serve this file.');}
  });
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const server=createGuideServer();
  server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Port 4173 is already in use. If the guide is already running, open http://127.0.0.1:4173. Otherwise stop the other server and try again.':error.message);process.exitCode=1;});
  server.listen(4173,'127.0.0.1',()=>console.log('\nZephyr RP guide is running\n\n  http://127.0.0.1:4173\n\nServing dist/ directly. No compilation needed.\nSave your files, then refresh the browser.\nKeep this window open. Press Ctrl+C to stop.\n'));
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
