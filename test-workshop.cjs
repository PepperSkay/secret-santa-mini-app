const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {parseHTML}=require('linkedom');const {document}=parseHTML('<html><body><main id="view"></main></body></html>').window;
document.defaultView.HTMLElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width:320,height:426});
const tree={items:[],total:0,next:null};
const view=document.querySelector('#view'),storage=new Map(),timers=new Map();let timerId=0,fail=false,calls=[],readyPost,delay=false,missingStorage=false;
const recipe={id:'gift_1_1',name:'Test star',tier:1,variant:0,rarity:'Обычный',seconds:900,color:'#eee',slots:[{material:'1_ribbon',quantity:2},null,{material:'1_wood',quantity:1},null,{material:'1_shard',quantity:1},null,{material:'1_ribbon',quantity:1},null,{material:'1_wood',quantity:1}]};
const data={gifts:[recipe],catalog:['ribbon','wood','shard'].map(kind=>({id:'1_'+kind,tier:1,kind,name:kind,color:'#eee'})),materials:{'1_ribbon':12,'1_wood':8,'1_shard':4},toys:{},home:{theme:'cranberry',lights:true},jobs:[],server_time:new Date().toISOString(),public_code:'synthetic-fixture-code',alias:'Test',likes:0,drops:[]};
const api=async(path,options)=>{
 if(!options||options.method==='GET')return structuredClone(path==='/api/workshop/tree'?tree:data);
 calls.push({path,...options,body:JSON.parse(options.body||'{}')});if(fail)throw Error('offline');
 if(delay)await new Promise(resolve=>readyPost=resolve);
 if(path==='/api/workshop/decorations'){const d=calls.at(-1).body;data.toys[d.gift]--;tree.items.push({...d,id:d.request_id,mine:true,owner:'Test'});tree.total++;return {decoration:tree.items.at(-1)}}
 if(path==='/api/workshop/start'){
  const body=calls.at(-1).body;if(!data.jobs.some(j=>j.id===body.request_id))data.jobs.push({id:body.request_id,gift:body.gift,started_at:new Date().toISOString(),ready_at:new Date(Date.now()+900000).toISOString(),claimed:false});
  return {job:data.jobs.at(-1)};
 }
};
const alerts=[];const sandbox=vm.createContext({window:null,document,crypto,Date,Math,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(missingStorage)throw Error('full');storage.set(k,v)},removeItem:k=>storage.delete(k)},setTimeout:fn=>{timers.set(++timerId,fn);return timerId},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>{fn();return 1},cancelAnimationFrame(){},gsap:{fromTo(){}},console});sandbox.window=sandbox;
vm.runInContext(fs.readFileSync('assets/wonderland.js','utf8'),sandbox);
const options={view,api,owner:'fixture',mode:'craft',fmt:String,esc:String,motion:()=>false,toast:m=>alerts.push(m),sheet(){},closeSheet(){}};
const flush=async()=>{for(let i=0;i<6;i++)await new Promise(setImmediate)};
const click=selector=>{const el=view.querySelector(selector);assert.ok(el,selector);el.dispatchEvent(new document.defaultView.Event('click',{bubbles:true}))};
async function fill(){
 for(const [material,indices] of [['1_ribbon',[0,6]],['1_wood',[2,8]],['1_shard',[4]]]){click(`[data-material="${material}"]`);for(const i of indices)click(`[data-slot="${i}"]`)}
}
(async()=>{
 let controller=sandbox.WinterWonderland.mount(options);await flush();
 click('#wl-magic');await flush();assert.equal(calls.length,0);assert.ok(view.querySelector('[data-slot="0"]').classList.contains('incorrect'));
 await fill();delay=true;click('#wl-magic');click('#wl-magic');assert.equal(calls.length,1);assert.ok(storage.size===1);readyPost();await flush();assert.equal(storage.size,0);assert.equal(data.jobs.length,1);assert.ok(view.querySelector('[data-slot="0"]').getAttribute('aria-label').includes('пусто'));controller.dispose();assert.equal(timers.size,0);
 // Offline starts preserve the request identifier across a page reload.
 data.jobs=[];delay=false;fail=true;controller=sandbox.WinterWonderland.mount(options);await flush();await fill();click('#wl-magic');await flush();const saved=JSON.parse([...storage.values()][0]);controller.dispose();
 fail=false;controller=sandbox.WinterWonderland.mount(options);await flush();click('[data-wl="recover"]');await flush();assert.equal(calls.at(-1).body.request_id,saved.body.request_id);assert.equal(storage.size,0);controller.dispose();
 // A closed page must never paint its late network response over another page.
 data.jobs=[];delay=true;controller=sandbox.WinterWonderland.mount(options);await flush();await fill();click('#wl-magic');controller.dispose();view.innerHTML='<p id="another-page">Another page</p>';readyPost();await flush();assert.ok(view.querySelector('#another-page'));assert.equal(timers.size,0);storage.clear();
 // Without durable storage no material-consuming request is sent.
 delay=false;data.jobs=[];missingStorage=true;controller=sandbox.WinterWonderland.mount(options);await flush();await fill();const before=calls.length;click('#wl-magic');await flush();assert.equal(calls.length,before);controller.dispose();
 missingStorage=false;data.toys={'gift_1_1':2};data.branches=[{id:0,x:50,y:46}];
 controller=sandbox.WinterWonderland.mount({...options,mode:'tree'});await flush();const scene=view.querySelector('#wl-scene');const count=calls.length;click('[data-wl="toy"]');scene.onpointerdown({clientX:160,clientY:200,target:scene,pointerId:1});assert.equal(calls.length,count);assert.equal(view.querySelector('#wl-preview').hidden,false);assert.equal(view.querySelector('#wl-place').disabled,false);click('#wl-place');await flush();assert.equal(calls.at(-1).body.x,50);assert.equal(calls.at(-1).body.y,46);assert.equal(tree.total,1);assert.equal(data.toys['gift_1_1'],1);controller.dispose();
 console.log(JSON.stringify({wrongLayoutSafe:true,duplicateStartSafe:true,durableRetry:true,lateResponseSafe:true,storageFailureSafe:true,timerCleanup:true,status:'PASS'}));
})().catch(e=>{console.error(e);process.exitCode=1});
