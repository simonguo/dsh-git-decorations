import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readdir,realpath} from 'node:fs/promises';
import path from 'node:path';
const exec = promisify(execFile);
const OPTIONS = {timeout: 8000, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8', env: {...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0'}};
const PRIORITY = {ignored:0, untracked:1, added:2, renamed:3, modified:4, deleted:5, conflict:6};
export function parseStatus(text) {
  const chunks = text.split('\0'); const result = [];
  for (let i=0; i<chunks.length; i++) {
    const record=chunks[i]; if(record.length<4) continue;
    const xy=record.slice(0,2), file=record.slice(3);
    if(/[RC]/.test(xy)) i++; // -z emits destination then original for rename/copy.
    let kind, badge;
    if(xy==='??'){kind='untracked';badge='U';}
    else if(xy==='!!'){kind='ignored';badge='';}
    else if(xy.includes('U') || ['AA','DD'].includes(xy)){kind='conflict';badge='!';}
    else if(xy.includes('D')){kind='deleted';badge='D';}
    else if(xy.includes('R')){kind='renamed';badge='R';}
    else if(xy.includes('A')){kind='added';badge='A';}
    else if(xy.includes('M') || xy.includes('T') || xy.includes('C')){kind='modified';badge='M';}
    else continue;
    result.push({file,kind,badge,xy});
  }
  return result;
}
async function git(cwd,args){return (await exec('git',['-C',cwd,...args],OPTIONS)).stdout;}
export function aggregate(entries) {
  const rows=new Map();
  const put=(file,kind,badge,directory=false)=>{
    const old=rows.get(file);if(!old || PRIORITY[kind]>PRIORITY[old.kind])rows.set(file,{path:file,kind,badge,directory});
  };
  for(const item of entries){
    const file=item.path.replace(/\/$/,'');put(file,item.kind,item.badge,item.path.endsWith('/'));
    if(item.kind==='ignored')continue;
    let parent=path.dirname(file);
    while(parent!==file && parent!==path.dirname(parent)){put(parent,item.kind,'●',true);parent=path.dirname(parent);}
  }
  return [...rows.values()].sort((a,b)=>a.path.localeCompare(b.path));
}
export async function readWorkspace(cwd) {
  // A workspace may be a Git repo, a repo subdirectory, or a container of repos.
  // Never recursively crawl a workspace: only inspect at most 32 direct directories.
  const canonical=await realpath(cwd);
  const roots=new Set();
  try {roots.add((await git(cwd,['rev-parse','--show-toplevel'])).trim());}
  catch(error){if(error.code==='ENOENT')return {state:'git-missing',rows:[]};}
  if(!roots.size){
    let children;try{children=await readdir(cwd,{withFileTypes:true});}catch{return {state:'unavailable',rows:[]};}
    for(const child of children.filter(e=>e.isDirectory()&&!e.name.startsWith('.')).slice(0,32)){
      try{roots.add((await git(path.join(cwd,child.name),['rev-parse','--show-toplevel'])).trim());}catch{}
    }
  }
  if(!roots.size)return {state:'not-repository',rows:[]};
  const entries=[];let failed=0,truncated=false;
  for(const root of roots){
    try{
      const raw=await git(root,['status','--porcelain=v1','-z','--untracked-files=normal','--ignored=matching']);
      for(const item of parseStatus(raw)){
        const absolute=path.resolve(root,item.file), relative=path.relative(canonical,absolute);
        if(relative.startsWith('..'+path.sep)||relative==='..'||path.isAbsolute(relative))continue;
        entries.push({...item,path:path.join(cwd,relative)+(item.file.endsWith('/')?'/':'')});
        if(entries.length>=10000){truncated=true;break;}
      }
    }catch{failed++;}
    if(truncated)break;
  }
  return {state:failed?'partial':'ready',repositories:roots.size,truncated,rows:aggregate(entries)};
}
export function createStatusCache(read=readWorkspace, ttl=5000){
  const cache=new Map();
  return {
    async get(cwd){
      let slot=cache.get(cwd);
      if(slot?.pending)return slot.pending;
      if(slot && Date.now()-slot.time<ttl)return slot.value;
      slot=slot??{};cache.set(cwd,slot);
      slot.pending=read(cwd).then(value=>{slot.value=value;slot.time=Date.now();return value;}).finally(()=>{slot.pending=null;});
      if(cache.size>32)cache.delete(cache.keys().next().value);
      return slot.pending;
    },
    clear(){cache.clear();}
  };
}
