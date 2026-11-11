import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {parseStatus,aggregate,readWorkspace,createStatusCache} from '../git-status.js';
test('porcelain -z handles Unicode spaces newlines and renames',()=>{
 const rows=parseStatus(' M a space.txt\0?? 中文\nfile.txt\0R  new.txt\0old.txt\0A  staged.txt\0UU conflict\0!! ignored/\0');
 assert.deepEqual(rows.map(r=>r.badge),['M','U','R','A','!','']);
 assert.equal(rows[1].file,'中文\nfile.txt');assert.equal(rows[2].file,'new.txt');
});
test('directory summaries prioritize conflicts',()=>{
 const rows=aggregate([{path:'/repo/src/a',kind:'added',badge:'A'},{path:'/repo/src/b',kind:'conflict',badge:'!'}]);
 assert.equal(rows.find(r=>r.path==='/repo/src').kind,'conflict');
});
test('cache coalesces concurrent requests',async()=>{
 let count=0;const cache=createStatusCache(async()=>{count++;await new Promise(r=>setTimeout(r,10));return {rows:[]};});
 await Promise.all([cache.get('/repo'),cache.get('/repo')]);await cache.get('/repo');assert.equal(count,1);
});
test('real repo modified staged untracked and ignored without writes',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'dsh-git-decorations-'));
 try{
  const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8'});
  git('init','-q');git('config','user.name','Test');git('config','user.email','test@example.invalid');
  await writeFile(path.join(root,'tracked.txt'),'before');await writeFile(path.join(root,'.gitignore'),'ignored/\n');
  git('add','.');git('commit','-qm','fixture');
  await writeFile(path.join(root,'tracked.txt'),'after');await writeFile(path.join(root,'new.txt'),'new');
  await writeFile(path.join(root,'staged.txt'),'staged');git('add','staged.txt');
  const before=git('status','--porcelain=v1');const result=await readWorkspace(root);const after=git('status','--porcelain=v1');
  assert.equal(before,after);assert.equal(result.state,'ready');
  assert.equal(result.rows.find(r=>r.path===path.join(root,'tracked.txt')).badge,'M');
  assert.equal(result.rows.find(r=>r.path===path.join(root,'new.txt')).badge,'U');
  assert.equal(result.rows.find(r=>r.path===path.join(root,'staged.txt')).badge,'A');
 }finally{assert.ok(root.startsWith(path.join(tmpdir(),'dsh-git-decorations-')));await rm(root,{recursive:true,force:true});}
});
