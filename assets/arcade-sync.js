/* Durable action journal. A network failure never locks the board. */
(() => {
 const key='santa.arcade.journal.v3';let journals={};try{journals=JSON.parse(localStorage.getItem(key)||'{}')}catch{}
 const write=()=>{try{localStorage.setItem(key,JSON.stringify(journals))}catch{}};
 class Session {
  constructor(payload,{api,owner,onSaved,onStatus}){
   this.id=payload.id;this.owner=owner;this.api=api;this.onSaved=onSaved;this.onStatus=onStatus;this.runtime=payload.runtime;this.version=payload.version;
   this.pending=payload.pending||[];this.skew=(payload.server_time||Date.now()/1000)-Date.now()/1000;this.sending=false;this.delay=1000;this.timer=null;this.closed=false;
   this.view=()=>WinterEngine.publicState(this.runtime,Date.now()/1000+this.skew);this.persist();
  }
  persist(){journals[this.id]={id:this.id,owner:this.owner,runtime:this.runtime,version:this.version,pending:this.pending,server_time:Date.now()/1000+this.skew,saved:Date.now()};write()}
  step(action){
   const elapsed_ms=Math.max((Date.now()/1000+this.skew-this.runtime.started)*1000,this.runtime._clock? (this.runtime._clock-this.runtime.started)*1000:0);
   const item={...action,elapsed_ms};this.runtime=WinterEngine.step(this.runtime,item);this.pending.push(item);this.persist();
   clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),this.runtime.won||this.runtime.lost?0:120);
   return {id:this.id,version:this.version+this.pending.length,state:this.view(),runtime:this.runtime};
  }
  async flush(){
   if(this.sending||!this.pending.length||this.closed)return;this.sending=true;
   const actions=this.pending.slice(0,64),base=this.version;
   try{
    const result=await this.api('/api/games/session/'+this.id+'/move',{method:'POST',body:JSON.stringify({version:base,actions})});
    this.pending.splice(0,actions.length);this.version=result.version;this.delay=1000;
    // Keep the locally advanced board; an acknowledgement must never rewind it.
    this.persist();this.onStatus?.('');this.onSaved?.(result,this);
    if(!this.pending.length){delete journals[this.id];write()}
   }catch(error){
    if(error.status===409){
     try{const server=await this.api('/api/games/session/'+this.id);const applied=server.version-this.version;if(applied>=0&&applied<=this.pending.length){this.pending.splice(0,applied);this.version=server.version;this.persist()}else throw error;}catch{this.onStatus?.('Не удалось сверить сохранение. Попробуем ещё раз.');}
    }else if([400,401,403,404].includes(error.status)){
     this.onStatus?.(error.status===401?'Открой приложение заново для сохранения.':'Не удалось подтвердить партию: '+error.message);this.closed=true;
    }else{this.onStatus?.('Нет связи — ходы сохранены на устройстве');this.delay=Math.min(15000,this.delay*1.6)}
   }finally{
    this.sending=false;
    if(this.pending.length&&!this.closed)this.timer=setTimeout(()=>this.flush(),this.delay);
   }
  }
 }
 function restore(options){const sessions=[];for(const [id,j]of Object.entries(journals)){if(j.owner!==options.owner)continue;if(Date.now()-j.saved>7200000){delete journals[id];continue}if(j.pending?.length){const session=new Session(j,options);sessions.push(session);session.flush()}}write();return sessions}
 window.ArcadeSync={Session,restore};
})();
