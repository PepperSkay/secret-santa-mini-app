const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {parseHTML}=require('linkedom');
const {window}=parseHTML('<html><body><main id="view"></main></body></html>'),document=window.document;
const storage=new Map(),frames=new Map();let clock=0,sequence=0;
const drawContext=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(obj,key)=>obj[key]||(()=>{})});
window.HTMLCanvasElement.prototype.getContext=()=>drawContext;
window.HTMLElement.prototype.getBoundingClientRect=()=>({width:340});
const sandbox=vm.createContext({window:null,document,crypto,performance:{now:()=>clock},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},requestAnimationFrame:fn=>{frames.set(++sequence,fn);return sequence},cancelAnimationFrame:id=>frames.delete(id),gsap:{fromTo(){}}});sandbox.window=sandbox;
vm.runInContext(fs.readFileSync('assets/plinko.js','utf8'),sandbox);const {mount,points,sample}=sandbox.WinterPlinko;
const rules={version:'virtual-collectible-20261113',min_stake:5,max_stake:100000,prize_description:'Virtual only',outcomes:[{multiplier:2,weight:4000},{multiplier:5,weight:4000},{multiplier:10,weight:1000},{multiplier:20,weight:600},{multiplier:50,weight:300},{multiplier:100,weight:100}]};
const view=document.querySelector('#view'),fmt=String,esc=String,balances=[];
const ready=()=>new Promise(setImmediate);
let postCalls=[],resolvePost,fail=false,animate=false;
const api=async(path,opts)=>{
 if(!opts)return {rules,owner:1,balance:100,history:[]};
 postCalls.push(JSON.parse(opts.body));if(fail)throw Error('offline');return await new Promise(resolve=>resolvePost=resolve);
};
const options={view,api,owner:'1',fmt,esc,motion:()=>animate,onBalance:b=>balances.push(b)};
const result=()=>({balance:96,round:{request_id:postCalls.at(-1).request_id,stake:5,multiplier:2,payout:1,path:'0000000000',slot:0}});
(async()=>{
 for(let slot=0;slot<11;slot++){
  const path=points('1'.repeat(slot)+'0'.repeat(10-slot),340,312.8),end=sample(path,1);
  assert.ok(Math.abs(end.x-(340/2+(slot-5)*(340-24)/11))<.001);
  assert.ok(path.every(p=>p.x>=0&&p.x<=340));
 }
 let controller=mount(options);await ready();const button=view.querySelector('#plinko-throw'),input=view.querySelector('#plinko-stake');
 assert.equal(button.disabled,false);assert.equal(view.querySelector('#plinko-consent'),null);assert.equal(view.querySelector('.plinko-rules'),null);assert.equal(view.querySelector('.plinko-prize'),null);assert.equal(view.querySelector('#plinko-history'),null);
 input.value='5.5';input.oninput();assert.equal(button.disabled,true);input.value='101';input.oninput();assert.equal(button.disabled,true);
 input.value='5';input.oninput();assert.equal(button.disabled,false);
 const sending=button.onclick();button.onclick();assert.equal(postCalls.length,1);assert.ok(storage.size===1);resolvePost(result());await sending;
 assert.equal(storage.size,0);assert.equal(view.querySelector('#plinko-balance').textContent,'96 ❄');assert.equal(view.querySelector('#plinko-result').dataset.kind,'minus');assert.equal(frames.size,0);controller.dispose();
 // A network retry must retain its original identifier and stake.
 fail=true;controller=mount(options);await ready();await view.querySelector('#plinko-throw').onclick();
 const pending=postCalls.at(-1);assert.equal(view.querySelector('#plinko-stake').disabled,true);assert.ok(storage.size===1);
 fail=false;const retry=view.querySelector('#plinko-throw').onclick();assert.equal(postCalls.at(-1).request_id,pending.request_id);resolvePost(result());await retry;assert.equal(storage.size,0);controller.dispose();
 // A late response from a disposed page cannot erase a newer page's pending round or rewind balance.
 controller=mount(options);await ready();const late=view.querySelector('#plinko-throw').onclick();controller.dispose();
 storage.set('santa.plinko.pending.1',JSON.stringify({request_id:'newer-round-identifier',stake:5}));const lastBalance=balances.at(-1);resolvePost(result());await late;
 assert.equal(JSON.parse(storage.get('santa.plinko.pending.1')).request_id,'newer-round-identifier');assert.equal(balances.at(-1),lastBalance);storage.clear();
 // Normal motion resolves, cleans its RAF, and leaves the controls usable.
 animate=true;controller=mount(options);await ready();const animated=view.querySelector('#plinko-throw').onclick();resolvePost(result());await ready();
 assert.ok(frames.size>0);clock=2000;for(const [id,fn]of frames){frames.delete(id);fn(clock)}await animated;assert.equal(frames.size,0);assert.equal(view.querySelector('#plinko-throw').disabled,false);controller.dispose();
 console.log(JSON.stringify({virtualRules:true,trajectorySlots:11,noDoubleSubmission:true,offlineRetry:true,lateResponseSafe:true,reducedMotion:true,animationCompletes:true,status:'PASS'}));
})().catch(e=>{console.error(e);process.exitCode=1});
