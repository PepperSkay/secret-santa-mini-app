const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {performance}=require('node:perf_hooks'),{parseHTML}=require('linkedom');
const {window}=parseHTML('<html><body><div id="board"></div><div id="tray"></div></body></html>');
const board=window.document.querySelector('#board'),tray=window.document.querySelector('#tray');
board.innerHTML=Array.from({length:64},(_,i)=>`<button class="block-cell" data-block-cell="${i}"></button>`).join('');
tray.innerHTML=[0,1,2].map(i=>`<button data-piece="${i}"></button>`).join('');
for(let i=0;i<64;i++)board.children[i].getBoundingClientRect=()=>({left:100+i%8*44,top:50+Math.floor(i/8)*44,width:40,height:40});
let captured=null,frames=new Map(),seq=0,sent=[];
tray.setPointerCapture=id=>captured=id;tray.hasPointerCapture=id=>captured===id;tray.releasePointerCapture=()=>captured=null;
const context=vm.createContext({window,document:window.document,requestAnimationFrame:fn=>{frames.set(++seq,fn);return seq},cancelAnimationFrame:id=>frames.delete(id)});
vm.runInContext(fs.readFileSync('assets/block-placement.js','utf8'),context);const {preview,mount}=window.BlockPlacement;
const state={n:8,board:Array(64).fill(0),tray:[[[0,0],[1,0]],[[0,0]],null],score:0};
board._piece=0;board._context={state,send:action=>sent.push(action)};
const controller=mount(board,tray,piece=>'<span class="mini-shape">'+piece.map(()=>'<i></i>').join('')+'</span>');
const stepFrames=()=>{for(const [id,fn]of frames){frames.delete(id);fn()}};
const event=(x,y,type='touch',id=1)=>({target:tray.children[0],clientX:x,clientY:y,pointerType:type,pointerId:id,isPrimary:true,button:0});
const down=(type='touch')=>tray.onpointerdown(event(80,500,type));
const move=(x,y,type='touch')=>{tray.onpointermove(event(x,y,type));stepFrames()};
let cases=0;
// Whole-shape fit, overlap, board edges, no row wrapping, and exact crossing-line prediction.
assert.equal(preview(state,0,7,0).valid,false);assert.equal(preview(state,0,-1,0).valid,false);assert.equal(preview(state,0,0,8).valid,false);assert.equal(preview(state,2,0,0).valid,false);cases+=4;
state.board[0]=1;assert.equal(preview(state,0,0,0).valid,false);state.board[0]=0;cases++;
const cross={...state,board:Array(64).fill(0)};for(let i=0;i<7;i++){cross.board[56+i]=1;cross.board[i*8+7]=1}
const planned=preview(cross,1,7,7);assert.equal(planned.valid,true);assert.equal(planned.lines.length,15);cases++;
const before=JSON.stringify(state);down();move(230,262);assert.equal(board.dataset.previewOrigin,'2,3');assert.equal(board.dataset.previewValid,'true');assert.equal(board.querySelectorAll('.preview-valid').length,2);assert.equal(sent.length,0);assert.equal(JSON.stringify(state),before);assert.ok(window.document.querySelector('.block-ghost'));cases++;
tray.onpointerup(event(230,262));assert.equal(JSON.stringify(sent),JSON.stringify([{piece:0,x:2,y:3}]));assert.equal(board.querySelectorAll('.preview-valid').length,0);assert.equal(window.document.querySelector('.block-ghost'),null);assert.equal(captured,null);cases++;
// Final release location wins even when the last scheduled animation frame has not executed.
sent=[];down();move(230,262);tray.onpointermove(event(274,306));tray.onpointerup(event(274,306));stepFrames();assert.equal(JSON.stringify(sent),JSON.stringify([{piece:0,x:3,y:4}]));cases++;
// Invalid and off-board releases never enter the engine or consume the piece.
sent=[];state.board[26]=1;down();move(230,262);assert.equal(board.dataset.previewValid,'false');assert.equal(board.querySelectorAll('.preview-invalid').length,2);tray.onpointerup(event(230,262));assert.equal(sent.length,0);state.board[26]=0;cases++;
down();move(-400,-400);tray.onpointerup(event(-400,-400));assert.equal(sent.length,0);assert.equal(board.querySelectorAll('.preview-invalid').length,0);cases++;
// Cancellation and multi-touch cannot accidentally place a piece or leave a ghost behind.
down();move(230,262);tray.onpointercancel();assert.equal(sent.length,0);assert.equal(window.document.querySelector('.block-ghost'),null);assert.equal(frames.size,0);cases++;
down();tray.onpointermove(event(230,262,'touch',2));stepFrames();assert.equal(board.dataset.previewOrigin,undefined);tray.onpointerup(event(230,262,'touch',2));assert.equal(captured,1);tray.onpointercancel();cases++;
// Mouse coordinates use the same anchor without the finger lift; keyboard/tap selection survives.
down('mouse');move(230,202,'mouse');assert.equal(board.dataset.previewOrigin,'2,3');tray.onpointerup(event(230,202,'mouse'));assert.equal(sent.length,1);cases++;
tray.onpointerdown({...event(80,500),target:tray.children[1]});tray.onpointerup({...event(80,500),target:tray.children[1]});tray.onclick({target:tray.children[1]});assert.equal(board._piece,1);assert.equal(tray.children[1].getAttribute('aria-pressed'),'true');cases++;
const hover=new window.Event('pointermove',{bubbles:true});hover.pointerType='mouse';board.children[12].dispatchEvent(hover);assert.equal(board.dataset.previewOrigin,'4,1');assert.equal(sent.length,1);controller.refresh();assert.equal(board.querySelectorAll('.preview-valid').length,0);cases++;
board._piece=0;down();move(230,262);controller.dispose();assert.equal(window.document.querySelector('.block-ghost'),null);assert.equal(captured,null);cases++;
// A drag coalesces repeated pointer events into one preview per animation frame.
const fresh=mount(board,tray,piece=>'<span>'+piece.map(()=>'<i></i>').join('')+'</span>');down();for(let i=0;i<200;i++)tray.onpointermove(event(230+i/100,262));assert.equal(frames.size,1);stepFrames();fresh.dispose();cases++;
const t=performance.now();for(let i=0;i<10000;i++)preview(state,0,i%8,Math.floor(i/8)%8);const avg=(performance.now()-t)/10000;assert.ok(avg<1);
// Previewed line clears must match the actual engine for varied shapes and board layouts.
vm.runInContext(fs.readFileSync('assets/engine.js','utf8'),context);
const fixture=JSON.parse(fs.readFileSync('tests/render-fixtures.json','utf8')).find(c=>c.state.game==='blocks').state;
const shapes=[[[0,0]],[[0,0],[1,0],[2,0]],[[0,0],[0,1],[0,2]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[0,1],[1,1]]];let checked=0;
for(let k=0;k<300;k++){
 const cells=Array.from({length:64},(_,i)=>(i*17+k*13)%19<7?1:0);
 const runtime={...fixture,board:cells,tray:[shapes[k%shapes.length],[[0,0]],[[0,0]]],lost:false,won:false};
 const x=k%8,y=Math.floor(k/8)%8,landing=preview(runtime,0,x,y);
 if(!landing.valid)continue;
 const result=window.WinterEngine.step(runtime,{piece:0,x,y});
 assert.equal(JSON.stringify([...landing.lines].sort((a,b)=>a-b)),JSON.stringify([...result.cleared].sort((a,b)=>a-b)));checked++;
}
assert.ok(checked>30);
console.log(JSON.stringify({placementCases:cases,engineAgreementCases:checked,previewAverageMs:avg,previewDoesNotCommit:true,touchAndMouse:true,status:'PASS'}));
