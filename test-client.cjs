const assert=require('node:assert/strict');const {performance}=require('node:perf_hooks');
global.window=global;const storage=new Map();global.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
require('./assets/engine.js');require('./assets/arcade-sync.js');
const runtime={game:'merge2048',level:0,score:0,won:false,lost:false,steps:0,reward:0,record_mode:true,engine_version:2,seed:321,started:Date.now()/1000,n:4,board:[2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0],target:null,moves:5000,turns:0};
(async()=>{
 let resolveRequest,calls=[];const session=new ArcadeSync.Session({id:'test',runtime,version:0,server_time:Date.now()/1000},{owner:'fixture',api:async(path,opts)=>{calls.push(JSON.parse(opts.body));return await new Promise(resolve=>resolveRequest=resolve)}});
 const begin=performance.now();session.step({direction:'left'});const renderMs=performance.now()-begin;assert.equal(session.runtime.score,4);assert.ok(renderMs<50);assert.equal(calls.length,0);
 const pending=session.flush();assert.equal(calls.length,1);session.step({direction:'down'});assert.equal(session.pending.length,2);assert.ok(session.runtime.turns===2);
 resolveRequest({version:1,balance:10});await pending;assert.equal(session.pending.length,1);assert.equal(session.version,1);clearTimeout(session.timer);
 const second=session.flush();assert.equal(calls[1].version,1);resolveRequest({version:2,balance:10});await second;assert.equal(session.pending.length,0);clearTimeout(session.timer);
 let failures=0;const offline=new ArcadeSync.Session({id:'offline',runtime,version:0},{owner:'fixture',api:async()=>{failures++;throw Error('Load failed')}});
 offline.step({direction:'left'});await offline.flush();assert.equal(offline.pending.length,1);assert.ok(JSON.parse(storage.get('santa.arcade.journal.v3')).offline);offline.step({direction:'down'});assert.equal(offline.runtime.turns,2);clearTimeout(offline.timer);offline.closed=true;
 console.log(JSON.stringify({inputSimulationMs:renderMs,backgroundAcknowledgements:calls.length,offlineActionsPreserved:offline.pending.length,status:'PASS'}));
})().catch(e=>{console.error(e);process.exit(1)});
