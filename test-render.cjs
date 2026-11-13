const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),{performance}=require('perf_hooks');
const {parseHTML}=require('linkedom');
const {window}=parseHTML(fs.readFileSync('index.html','utf8'));const document=window.document;
const timers=new Set();const later=(fn,ms)=>{const t=setTimeout(()=>{timers.delete(t);fn()},ms);timers.add(t);return t};
let animationCalls=0;const tween=()=>{animationCalls++;return Promise.resolve()};const gsap={to:tween,fromTo:tween,set:()=>{},killTweensOf:()=>{},globalTimeline:{resume(){}},timeline:()=>{const chain={to(){animationCalls++;return chain},fromTo(){return chain}};return chain}};
const context=vm.createContext({window:null,document,console,performance,Date,Map,Set,Promise,Math,JSON,localStorage:{getItem:()=>null,setItem(){},removeItem(){}},matchMedia:()=>({matches:false,addEventListener(){}}),setTimeout:later,clearTimeout,requestAnimationFrame:fn=>later(fn,0),gsap,location:{search:'',protocol:'http:',origin:'http://localhost'},URLSearchParams,AbortController,fetch:async()=>{throw Error('Network deliberately unavailable')},addEventListener(){},scrollTo(){},innerWidth:390,innerHeight:844});context.window=context;context.Telegram=null;
for(const name of ['engine','arcade-sync','extra-games','holiday-games'])vm.runInContext(fs.readFileSync('assets/'+name+'.js','utf8'),context);
let source=fs.readFileSync('assets/winter.js','utf8');const pos=source.lastIndexOf('  boot();');source=source.slice(0,pos)+`window.testApp={S,drawGame,sendMove,openLevels,setupNav,attach(payload){S.tab='playing';S.game=payload.runtime.game;S.level=payload.runtime.level;S.session={...payload,state:WinterEngine.publicState(payload.runtime,Date.now()/1000)};S.me={user:{id:1,active:true,snowflakes:10}};activeSync=new ArcadeSync.Session(payload,{owner:'fixture',api:async()=>{throw Error('offline')}});return activeSync}};`+source.slice(pos+9);vm.runInContext(source,context);
const app=context.testApp;app.setupNav();const cases=JSON.parse(fs.readFileSync('tests/render-fixtures.json','utf8'));const covered=new Set(),times=[];
(async()=>{
 for(const c of cases){const k=c.state.game+':'+c.state.level;covered.add(k);
  const sync=app.attach({id:k,runtime:c.state,version:0});const begin=performance.now();app.drawGame();const board=document.querySelector('#play-board'),first=board.querySelector('button,span'),tools=document.querySelector('#restart');
  await app.sendMove(c.action);times.push({game:k,ms:performance.now()-begin});
  assert.strictEqual(document.querySelector('#play-board'),board,k+' board identity');assert.strictEqual(document.querySelector('#restart'),tools,k+' control identity');assert.strictEqual(board.querySelector('button,span'),first,k+' cell identity');
  assert.equal(sync.pending.length,1,k+' input recorded');assert.ok(!document.querySelector('#toast').textContent.includes('undefined'),k+' renderer exception');sync.closed=true;clearTimeout(sync.timer);
 }
 // Same live direction buttons survive 120 rapid pointer inputs while the network is offline.
 const c=cases.find(c=>c.state.game==='merge2048');const sync=app.attach({id:'stress2048',runtime:c.state,version:0});app.drawGame();const button=document.querySelector('[data-direction="left"]'),controls=button.parentElement,board=document.querySelector('#play-board');const t=performance.now();
 for(let i=0;i<120&&!sync.runtime.lost;i++){const el=controls.querySelector('[data-direction="'+['left','down','right','up'][i%4]+'"]');controls.onpointerdown({target:el,button:0,preventDefault(){}})}
 assert.strictEqual(document.querySelector('[data-direction="left"]'),button);assert.strictEqual(document.querySelector('#play-board'),board);assert.ok(sync.pending.length>50);sync.closed=true;clearTimeout(sync.timer);
 assert.equal(new Set([...covered].map(k=>k.split(':')[0])).size,19);assert.ok(animationCalls>30);
 console.log(JSON.stringify({games:19,gameLevelCases:covered.size,stableNodes:true,offlineRapidMoves:sync.pending.length,burstMs:performance.now()-t,animationCalls,maxMountAndMoveMs:Math.max(...times.map(t=>t.ms)),status:'PASS'}));
 for(const t of timers)clearTimeout(t);
})().catch(e=>{console.error(e);for(const t of timers)clearTimeout(t);process.exitCode=1});
