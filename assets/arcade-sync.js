/* Local input never waits for persistence or the network. */
(() => {
 const key='santa.arcade.journal.v3';let journals={},dirty=new Set(),scheduled=false,writing=Promise.resolve(),storageFailed=false;
 try{journals=JSON.parse(localStorage.getItem(key)||'{}')}catch{}
 const database=new Promise(resolve=>{
  if(!globalThis.indexedDB)return resolve(null);
  try{const request=indexedDB.open('santa-arcade',1);request.onupgradeneeded=()=>request.result.createObjectStore('sessions',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=request.onblocked=()=>resolve(null)}catch{resolve(null)}
 });
 const ready=database.then(db=>new Promise(resolve=>{
  if(!db)return resolve();const request=db.transaction('sessions').objectStore('sessions').getAll();request.onsuccess=()=>{for(const j of request.result){if(!journals[j.id]||journals[j.id].saved<j.saved)journals[j.id]=j}for(const id of Object.keys(journals))mark(id);resolve()};request.onerror=()=>resolve();
 }));
 function flushJournal(){
  scheduled=false;
  writing=writing.catch(()=>{}).then(async()=>{
   await ready;const ids=[...dirty];dirty.clear();if(!ids.length)return;
   const db=storageFailed?null:await database;
   if(db){try{await new Promise((resolve,reject)=>{const tx=db.transaction('sessions','readwrite'),store=tx.objectStore('sessions');for(const id of ids){if(journals[id])store.put(journals[id]);else store.delete(id)}tx.oncomplete=()=>{try{localStorage.removeItem(key)}catch{}resolve()};tx.onerror=tx.onabort=()=>reject(tx.error)})}
    catch{storageFailed=true;try{localStorage.setItem(key,JSON.stringify(journals))}catch{}}}
   else try{localStorage.setItem(key,JSON.stringify(journals))}catch{}
  });return writing;
 }
 function schedule(){if(scheduled)return;scheduled=true;
  // Persistence runs after paint, outside the pointer handler.
  if(globalThis.requestIdleCallback)requestIdleCallback(flushJournal,{timeout:800});else setTimeout(flushJournal,32);
 }
 function mark(id){dirty.add(id);schedule()}
 class Session {
  constructor(payload,{api,owner,onSaved,onStatus}){
   this.id=payload.id;this.owner=owner;this.api=api;this.onSaved=onSaved;this.onStatus=onStatus;this.runtime=payload.runtime;this.version=payload.version;
   this.pending=payload.pending||[];this.skew=(payload.server_time||Date.now()/1000)-Date.now()/1000;this.sending=false;this.delay=1000;this.timer=null;this.closed=false;
   this.view=()=>WinterEngine.publicState(this.runtime,Date.now()/1000+this.skew);this.persist();
  }
  persist(){if(!this.pending.length){delete journals[this.id];mark(this.id);return}
   journals[this.id]={id:this.id,owner:this.owner,runtime:this.runtime,version:this.version,pending:this.pending,server_time:Date.now()/1000+this.skew,saved:Date.now()};mark(this.id)
  }
  step(action){
   const elapsed_ms=Math.max((Date.now()/1000+this.skew-this.runtime.started)*1000,this.runtime._clock? (this.runtime._clock-this.runtime.started)*1000:0);
   const item={...action,elapsed_ms};this.runtime=WinterEngine.step(this.runtime,item);this.pending.push(item);this.persist();
   if(!this.timer)this.timer=setTimeout(()=>{this.timer=null;this.flush()},this.runtime.won||this.runtime.lost?0:120);
   return {id:this.id,version:this.version+this.pending.length,state:this.view(),runtime:this.runtime};
  }
  async flush(){
   if(this.sending||!this.pending.length||this.closed)return;clearTimeout(this.timer);this.timer=null;this.sending=true;
   const actions=this.pending.slice(0,64),base=this.version;
   try{
    const result=await this.api('/api/games/session/'+this.id+'/move',{method:'POST',body:JSON.stringify({version:base,actions})});
    this.pending.splice(0,actions.length);this.version=result.version;this.delay=1000;
    this.persist();this.onStatus?.('');this.onSaved?.(result,this);
   }catch(error){
    if(error.status===409){
     try{const server=await this.api('/api/games/session/'+this.id);const applied=server.version-this.version;if(applied>=0&&applied<=this.pending.length){this.pending.splice(0,applied);this.version=server.version;this.persist()}else throw error}catch{this.onStatus?.('Не удалось сверить сохранение. Попробуем ещё раз.')}
    }else if([400,401,403,404].includes(error.status)){
     this.onStatus?.(error.status===401?'Открой приложение заново для сохранения.':'Не удалось подтвердить партию: '+error.message);this.closed=true;
    }else{this.onStatus?.('Нет связи — ходы сохранены на устройстве');this.delay=Math.min(15000,this.delay*1.6)}
   }finally{this.sending=false;if(this.pending.length&&!this.closed&&!this.timer)this.timer=setTimeout(()=>{this.timer=null;this.flush()},this.delay)}
  }
 }
 async function restore(options){await ready;const sessions=[];for(const [id,j]of Object.entries(journals)){if(j.owner!==options.owner)continue;if(Date.now()-j.saved>7200000){delete journals[id];mark(id);continue}if(j.pending?.length){const session=new Session(j,options);sessions.push(session);session.flush()}}return sessions}
 if(globalThis.addEventListener)addEventListener('pagehide',flushJournal);
 window.ArcadeSync={Session,restore,flushJournal};
})();
