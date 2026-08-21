/* Branch context: inject the active branch into all branch-scoped Supabase queries. */
(function(){'use strict';
 const tables=new Set(['students','batches','teachers','payments','exams','notices','expenses','admission_leads','routine_slots']);
 const key='eduflow.activeBranch'; const get=()=>localStorage.getItem(key)||'';
 const original=window.supabase?.createClient;
 if(!original)return;
 const wrapBuilder=(builder,table)=>new Proxy(builder,{get(target,prop,recv){const value=Reflect.get(target,prop,recv);if(typeof value!=='function')return value;return function(...args){
   if(tables.has(table)&&get()){
    if(prop==='insert'||prop==='upsert'){
      const branch=get(), data=args[0];
      const add=x=>x&&typeof x==='object'&&x.branch_id==null?{...x,branch_id:branch}:x;
      args[0]=Array.isArray(data)?data.map(add):add(data);
    }
    const result=value.apply(target,args);
    if(['select','update','delete','upsert'].includes(String(prop))&&result&&typeof result.eq==='function')return result.eq('branch_id',get());
    return result;
   }
   return value.apply(target,args);
 };}});
 window.supabase.createClient=function(...args){const client=original.apply(window.supabase,args);const from=client.from.bind(client);client.from=function(table){const builder=from(table);return tables.has(table)?wrapBuilder(builder,table):builder;};return client;};
 window.EduFlowBranchContext={tables,activeBranch:get,setActiveBranch:id=>id?localStorage.setItem(key,id):localStorage.removeItem(key)};
})();
