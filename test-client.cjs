const assert=require('node:assert/strict');const {performance}=require('node:perf_hooks');
global.window=global;const storage=new Map();let writes=0;global.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>{writes++;storage.set(k,v)},removeItem:k=>storage.delete(k)};
if(process.argv.includes('--indexeddb'))global.indexedDB=require('fake-indexeddb').indexedDB;
require('./assets/engine.js');require('./assets/arcade-sync.js');
const runtime={game:'merge2048',level:0,score:0,won:false,lost:false,steps:0,reward:0,record_mode:true,engine_version:2,seed:321,started:Date.now()/1000,n:4,board:[2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0],target:null,moves:5000,turns:0};
(async()=>{
 let resolveRequest,calls=[];const session=new ArcadeSync.Session({id:'test',runtime,version:0,server_time:Date.now()/1000},{owner:'fixture',api:async(path,opts)=>{calls.push(JSON.parse(opts.body));return await new Promise(resolve=>resolveRequest=resolve)}});
 const before=writes,begin=performance.now();session.step({direction:'left'});const renderMs=performance.now()-begin;assert.equal(session.runtime.score,4);assert.ok(renderMs<50);assert.equal(calls.length,0);assert.equal(writes,before,'No synchronous storage inside input');
 const pending=session.flush();assert.equal(calls.length,1);session.step({direction:'down'});assert.equal(session.pending.length,2);assert.ok(session.runtime.turns===2);
 resolveRequest({version:1,balance:10});await pending;assert.equal(session.pending.length,1);assert.equal(session.version,1);clearTimeout(session.timer);session.timer=null;
 const second=session.flush();assert.equal(calls[1].version,1);resolveRequest({version:2,balance:10});await second;assert.equal(session.pending.length,0);clearTimeout(session.timer);session.timer=null;
 const offline=new ArcadeSync.Session({id:'offline',runtime,version:0},{owner:'fixture',api:async()=>{throw Error('Load failed')}});
 offline.step({direction:'left'});await offline.flush();assert.equal(offline.pending.length,1);await ArcadeSync.flushJournal();
 if(!process.argv.includes('--indexeddb'))assert.ok(JSON.parse(storage.get('santa.arcade.journal.v3')).offline);
 offline.step({direction:'down'});assert.equal(offline.runtime.turns,2);clearTimeout(offline.timer);offline.timer=null;offline.closed=true;await ArcadeSync.flushJournal();
 if(process.argv.includes('--indexeddb')){const rows=await new Promise((resolve,reject)=>{const open=indexedDB.open('santa-arcade',1);open.onsuccess=()=>{const request=open.result.transaction('sessions').objectStore('sessions').getAll();request.onsuccess=()=>{resolve(request.result);open.result.close()};request.onerror=reject};open.onerror=reject});assert.equal(rows.find(j=>j.id==='offline').pending.length,2);assert.ok(!rows.some(j=>j.id==='test'),'Acknowledged journal removed from disk')}
 const recovered=await ArcadeSync.restore({owner:'fixture',api:async()=>{throw Error('offline')}});assert.equal(recovered[0].pending.length,2);for(const s of recovered){s.closed=true;clearTimeout(s.timer)}
 assert.equal((await ArcadeSync.restore({owner:'someone-else',api:async()=>{}})).length,0);
 const burst=new ArcadeSync.Session({id:'burst',runtime,version:0},{owner:'fixture',api:async()=>{throw Error('offline')}});const times=[];
 for(let i=0;i<120&&!burst.runtime.lost;i++){const t=performance.now();try{burst.step({direction:['left','down','right','up'][i%4]})}catch{}times.push(performance.now()-t)}burst.closed=true;clearTimeout(burst.timer);
 assert.ok(Math.max(...times)<50);await ArcadeSync.flushJournal();
 console.log(JSON.stringify({storage:process.argv.includes('--indexeddb')?'IndexedDB':'fallback',inputMs:renderMs,maxBurstMs:Math.max(...times),rapidMoves:times.length,offlineActionsPreserved:offline.pending.length,status:'PASS'}));
})().catch(e=>{console.error(e);process.exit(1)});
