window.__ModuleLoader__.load({id:'dsh-git-decorations',factory(require){
 const React=require('react'),h=React.createElement;
 const colors={modified:'var(--dsw-alias-state-warn-primary)',added:'var(--dsw-alias-state-success-primary)',untracked:'var(--dsw-alias-state-success-primary)',renamed:'var(--dsw-alias-brand-primary)',deleted:'var(--dsw-alias-state-error-primary)',conflict:'var(--dsw-alias-state-error-primary)',ignored:'var(--dsw-alias-label-secondary)'};
 function cssFor(rows){
  return rows.map(row=>{
   // JSON quoting is valid CSS string syntax except literal control characters.
   const quote=s=>JSON.stringify(s).replace(/\\n/g,'\\a ').replace(/\\r/g,'\\d ');
   const file=row.path.replace(/\\/g,'/');
   const li='li[data-files-path='+quote(file)+']';
   const action=li+'>div>:is(button,span):first-child';
   return action+'>span:last-child{color:'+colors[row.kind]+'!important}'+
    action+'::after{content:'+quote(row.badge)+';color:'+colors[row.kind]+';margin-left:auto;padding-left:8px;font-size:11px;flex:none}';
  }).join('\n');
 }
 return {name:'dsh-git-decorations-client',inject:['slots','connection','locale'],apply(ctx){
  ctx.locale.register('gitDecorations',{zh:{refresh:'刷新 Git 状态',ready:'Git 状态',unavailable:'Git 状态不可用',loading:'正在读取 Git 状态'},en:{refresh:'Refresh Git status',ready:'Git status',unavailable:'Git status unavailable',loading:'Reading Git status'}});
  function Decorations({sessionId,t}){
   const [data,setData]=React.useState(null),[busy,setBusy]=React.useState(false);
   const alive=React.useRef(true),pending=React.useRef(false),last=React.useRef('');
   const refresh=React.useCallback(async()=>{
    if(pending.current||document.hidden)return;
    pending.current=true;setBusy(true);
    try{
     const response=await fetch('/api/gitDecorations/status',{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId})});
     if(!response.ok)throw new Error('Git status HTTP '+response.status);
     const next=await response.json(),signature=JSON.stringify(next);
     if(alive.current&&signature!==last.current){last.current=signature;setData({...next,css:cssFor(next.rows??[])});}
    }catch{if(alive.current)setData({state:'unavailable',rows:[],css:''});}
    finally{pending.current=false;if(alive.current)setBusy(false);}
   },[sessionId]);
   React.useEffect(()=>{
    alive.current=true;refresh();const timer=setInterval(refresh,8000);
    const onVisible=()=>{if(!document.hidden)refresh();};
    document.addEventListener('visibilitychange',onVisible);window.addEventListener('focus',onVisible);
    return()=>{alive.current=false;clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);window.removeEventListener('focus',onVisible);};
   },[refresh]);
   const ready=data?.state==='ready'||data?.state==='partial';
   const label=busy?t('loading'):ready?t('ready'):t('unavailable');
   return h(React.Fragment,null,
    h('style',{'data-dsh-git-decorations':sessionId},data?.css??''),
    h('button',{type:'button',onClick:refresh,disabled:busy,title:label+' · '+(data?.rows?.length??0)+' · '+t('refresh'),'aria-label':label,style:{border:'1px solid var(--dsw-alias-border-l1)',borderRadius:6,background:'transparent',color:ready?'var(--dsw-alias-state-success-primary)':'var(--dsw-alias-label-secondary)',fontSize:11,padding:'3px 6px',cursor:'pointer'}},busy?'Git …':'Git'));
  }
  ctx.slots.inject('conversation.session.header.utilities',()=>ctx.slots.register({name:'conversation.session.header.utilities',id:'git-decorations',order:60,locale:'gitDecorations'},Decorations));
 }};
}});
