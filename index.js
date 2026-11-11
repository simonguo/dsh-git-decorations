import {createStatusCache} from './git-status.js';
export const inject=['connection','agents','workingDirectory'];
export function apply(ctx){
 const cache=createStatusCache();
 ctx.effect(()=>ctx.connection.fetch.register({
  path:'/api/gitDecorations/status',methods:['POST'],requestBody:'buffered',
  async fetch(request){
   let payload;try{payload=await request.json();}catch{return Response.json({state:'invalid-request',rows:[]},{status:400});}
   if(typeof payload?.sessionId!=='string')return Response.json({state:'invalid-request',rows:[]},{status:400});
   const agent=ctx.agents.get(payload.sessionId);
   if(!agent)return Response.json({state:'inactive-session',rows:[]});
   const cwd=ctx.workingDirectory.get(agent.session);
   try{return Response.json({...await cache.get(cwd),cwd});}
   catch{return Response.json({state:'unavailable',rows:[],cwd});}
  }
 }));
 ctx.effect(()=>()=>cache.clear());
}
