/* Christmas workshop: server-owned inventory, clocks and recipes; local scene interaction. */
(() => {
 const image=id=>`assets/workshop/${id}.webp`;
 const uuid=()=>crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');

 const total=bag=>Object.values(bag).reduce((a,b)=>a+b,0);
 function mount(ctx){
  const {view,api,esc,fmt,motion,toast,sheet,closeSheet}=ctx;
  let dead=false,busy=false,state,sceneData,section='recipes',tier=1,gift='gift_1_1',slots=Array(9).fill(null),material=null,chosenToy=null,point=null,cursors=[null],page=0,ticker=null,skew=0;
  let mode=ctx.mode,ignoreSlotClickUntil=0,sceneResize=null,frame=null,sceneRect=null,placing=false;
  const key='santa.workshop.pending.'+ctx.owner;
  let pending=null;try{pending=JSON.parse(localStorage.getItem(key)||'null')}catch{}
  const $=s=>view.querySelector(s);
  const gifts=()=>Object.fromEntries(state.gifts.map(g=>[g.id,g]));
  const mats=()=>Object.fromEntries(state.catalog.map(m=>[m.id,m]));
  const art=(id,cls='')=>`<img class="wl-gift-art ${cls}" src="${image(id)}" alt="${esc(gifts()[id]?.name||'Украшение')}" loading="lazy" width="160" height="176">`;
  const mat=m=>`<span class="wl-material-icon" data-tier="${m.tier}" style="--rarity:${m.color}" aria-hidden="true"><img src="assets/workshop/material_${m.kind}.webp" alt="" width="64" height="64" loading="lazy"></span>`;
  function animate(selector){if(motion()&&!dead)gsap.fromTo(view.querySelectorAll(selector),{opacity:0,y:13},{opacity:1,y:0,duration:.42,stagger:.035,ease:'power3.out',clearProps:'opacity,transform'})}
  function savePending(value){try{if(value)localStorage.setItem(key,JSON.stringify(value));else localStorage.removeItem(key);pending=value;return true}catch{toast('Не удалось сохранить действие на устройстве. Освободи место и попробуй ещё раз.');return false}}
  async function request(path,method='GET',body){return api(path,{method,...(body?{body:JSON.stringify(body)}:{})})}
  async function refresh(){
   const data=await api('/api/workshop');if(dead)return;state=data;skew=Date.parse(data.server_time)-Date.now();
   if(pending?.kind==='start'&&data.jobs.some(j=>j.id===pending.body.request_id))savePending(null);
   if(data.drops.length)toast(`В мастерскую доставлено ${data.drops.reduce((n,d)=>n+d.quantity,0)} материалов за достижения`);
   if(mode!=='craft'){
    const path='/api/workshop/tree';
    const data=await api(path+(cursors[page]?'?cursor='+encodeURIComponent(cursors[page]):''));if(dead)return;sceneData=data;
   }
   if(chosenToy&&!state.toys[chosenToy])chosenToy=null;
   render();
  }
  function cost(g){const out={};for(const s of g.slots)if(s)out[s.material]=(out[s.material]||0)+s.quantity;return out}
  function affordable(g){return Object.entries(cost(g)).every(([m,q])=>(state.materials[m]||0)>=q)}
  function duration(seconds){return seconds<3600?`${seconds/60} мин`:Number.isInteger(seconds/3600)?`${seconds/3600} ч`:'1 ч 30 мин'}
  function remaining(job){return Math.max(0,Math.ceil((Date.parse(job.ready_at)-Date.now()-skew)/1000))}
  function timeLabel(s){const h=Math.floor(s/3600),m=Math.floor(s%3600/60),n=s%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(n).padStart(2,'0')}`:`${m}:${String(n).padStart(2,'0')}`}
  function clock(){
   clearTimeout(ticker);if(dead||!state)return;
   for(const el of view.querySelectorAll('[data-job-clock]')){
    const j=state.jobs.find(j=>j.id===el.dataset.jobClock);if(!j)continue;const left=remaining(j);el.textContent=left?timeLabel(left):'Готово!';
    const button=el.closest('.wl-job').querySelector('[data-claim]');button.disabled=busy||left>0;button.textContent=left?'Волшебство готовится':'Забрать подарок';
    const fill=el.closest('.wl-job').querySelector('.wl-job-progress i');fill.style.transform=`scaleX(${Math.min(1,(Date.now()+skew-Date.parse(j.started_at))/(Date.parse(j.ready_at)-Date.parse(j.started_at)))})`;
   }
   if(state.jobs.length)ticker=setTimeout(clock,1000);
  }
  function status(message){const el=$('#wl-status');if(el)el.textContent=message}
  function tabs(){return `<div class="wl-tabs" role="tablist" aria-label="Мастерская">${[['recipes','Подарки'],['toys',`Игрушки · ${total(state.toys)}`],['materials',`Материалы · ${total(state.materials)}`]].map(([id,name])=>`<button role="tab" aria-selected="${section===id}" data-wl="section" data-value="${id}">${name}</button>`).join('')}</div>`}
  function jobCards(){return state.jobs.length?`<section class="wl-jobs"><h2>На столе у эльфов <small>${state.jobs.length}/3</small></h2>${state.jobs.map(j=>`<article class="wl-job">${art(j.gift)}<div><strong>${esc(gifts()[j.gift].name)}</strong><span data-job-clock="${j.id}"></span><div class="wl-job-progress"><i></i></div><button class="secondary" data-claim="${j.id}" disabled>Волшебство готовится</button></div></article>`).join('')}</section>`:''}
  function render(){
   if(dead)return;clearTimeout(ticker);
   view.classList.add('wl-view');view.classList.toggle('wl-motion',!!motion());
   if(mode==='craft')renderCraft();else renderScene();
   view.insertAdjacentHTML('afterbegin',`<p id="wl-status" class="wl-status" role="status"></p>${pending?'<div class="wl-recovery">Есть неподтверждённое действие. <button class="secondary" data-wl="recover">Проверить результат</button></div>':''}`);
   clock();
  }
  function renderCraft(){
   view.innerHTML=`<header class="wl-heading"><span>НОВОГОДНЯЯ СКАЗКА</span><h1>Мастерская чудес</h1><p>Собирай по крупицам. Создавай на века.</p><div class="wl-craft-tools" aria-hidden="true"><img src="assets/workshop/material_ribbon.webp" alt=""><img src="assets/workshop/material_bell.webp" alt=""><img src="assets/workshop/material_stardust.webp" alt=""></div></header>${tabs()}${section==='recipes'?recipes():section==='toys'?toyInventory():materialInventory()}${jobCards()}`;
   if(section==='recipes')bindBoard();
  }
  function recipes(){
   const selected=gifts()[gift],catalog=mats();
   return `<div class="wl-tier-list" aria-label="Редкость подарка">${state.gifts.filter(g=>g.variant===0).map(g=>`<button data-wl="tier" data-value="${g.tier}" style="--rarity:${g.color}" class="${tier===g.tier?'selected':''}"><span>${g.tier}</span>${esc(g.rarity)}</button>`).join('')}</div><div class="wl-gift-shelf">${state.gifts.filter(g=>g.tier===tier).map(g=>`<button class="wl-gift-card ${g.id===gift?'selected':''}" data-wl="gift" data-value="${g.id}" style="--rarity:${g.color}">${art(g.id)}<strong>${esc(g.name)}</strong><small>${duration(g.seconds)}</small></button>`).join('')}</div><section class="wl-recipe" style="--rarity:${selected.color}"><div class="wl-recipe-title">${art(selected.id)}<div><span>${esc(selected.rarity)} · ${duration(selected.seconds)}</span><h2>${esc(selected.name)}</h2><p>Забрать после завершения таймера</p></div></div><div class="wl-costs">${Object.entries(cost(selected)).map(([m,q])=>`<span class="${(state.materials[m]||0)<q?'short':''}">${mat(catalog[m])}<span>${esc(catalog[m].name)}<b>${state.materials[m]||0} / ${q}</b></span></span>`).join('')}</div><div class="wl-tables"><section><h3>Образец рецепта</h3><div class="wl-pattern" aria-label="Образец раскладки">${selected.slots.map(s=>`<div>${s?`${mat(catalog[s.material])}<small>×${s.quantity}</small>`:'<span class="wl-empty-dot">·</span>'}</div>`).join('')}</div></section><section><h3>Твой волшебный стол</h3><div class="wl-board" role="group" aria-label="Стол для сборки">${slots.map((m,i)=>`<button data-slot="${i}" aria-label="Клетка ${i+1}${m?': '+esc(catalog[m].name):': пусто'}">${m?mat(catalog[m]):'<span>+</span>'}<small>${m?'×'+(selected.slots[i]?.quantity||1):''}</small></button>`).join('')}</div></section></div><p class="wl-hint">Выбери материал ниже и нажми нужную клетку. Можно перетащить. Повторное нажатие очищает клетку.</p><div class="wl-palette" aria-label="Материалы для раскладки">${Object.keys(cost(selected)).map(id=>`<button data-material="${id}" class="${material===id?'selected':''}" style="--rarity:${catalog[id].color}">${mat(catalog[id])}<span>${esc(catalog[id].name)}<small>В наличии: ${state.materials[id]||0}</small></span></button>`).join('')}</div><div class="wl-bench-actions"><button class="secondary" data-wl="clear">Очистить стол</button><button class="primary" id="wl-magic" data-wl="start" ${busy||!affordable(selected)||state.jobs.length>=3?'disabled':''}>✦ Слепить волшебство</button></div><p class="wl-hint">${!affordable(selected)?'Материалы приходят за уровни и рубежи рекордов.':'Материалы спишутся только при правильной сборке.'} Один материал — 50%, от двух до пяти — остальные 50%.</p><button class="secondary wide" data-tab="games">Добыть материалы в играх</button></section>`;
  }
  function toyInventory(){
   const owned=state.gifts.filter(g=>state.toys[g.id]>0);
   return `<section class="wl-inventory-heading"><h2>Твои игрушки <b>${total(state.toys)}</b></h2><p>Свободные игрушки. Украшения на ёлке вернутся сюда, если их снять.</p></section>${owned.length?`<div class="wl-toy-grid">${owned.map(g=>`<article style="--rarity:${g.color}">${art(g.id)}<span class="wl-quantity">×${state.toys[g.id]}</span><h3>${esc(g.name)}</h3><small>${esc(g.rarity)}</small></article>`).join('')}</div><div class="wl-bench-actions"><button class="primary" data-tab="tree">На Новогоднюю ёлку</button></div>`:'<div class="wl-empty"><img src="assets/workshop/gift_1_2.webp" alt="Подарок" width="110" height="121"><h3>Первое чудо ещё впереди</h3><p>Выбери рецепт, собери материалы и создай игрушку.</p><button class="primary" data-wl="section" data-value="recipes">Создать подарок</button></div>'}`;
  }
  function materialInventory(){return `<section class="wl-inventory-heading"><h2>Кладовая материалов <b>${total(state.materials)}</b></h2><p>Материалы разных уровней используются вместе. Сохраняй даже самые обычные ленточки.</p></section><div class="wl-tier-list">${state.gifts.filter(g=>g.variant===0).map(g=>`<button data-wl="material-tier" data-value="${g.tier}" class="${tier===g.tier?'selected':''}" style="--rarity:${g.color}">${esc(g.rarity)}</button>`).join('')}</div><div class="wl-material-grid">${state.catalog.filter(m=>m.tier===tier).map(m=>`<article style="--rarity:${m.color}">${mat(m)}<span>${esc(m.name)}</span><b>×${state.materials[m.id]||0}</b></article>`).join('')}</div><details class="wl-help"><summary>Как получать материалы</summary><p>За каждый впервые пройденный уровень и каждый новый рубеж рекорда выдаётся от 1 до 5 материалов. Вероятности количества: 1 — 50%, 2 — 25%, 3 — 12%, 4 — 8%, 5 — 5%. Более сложные достижения открывают редкие материалы. Повторное прохождение награду не дублирует.</p><p>Первые рубежи в «Зимних блоках» и 2048: 250, 500, 1 000, 2 000, 4 000 очков — затем каждый раз вдвое выше.</p></details><button class="primary wide" data-tab="games">Отправиться за материалами</button>`}
  function hanging(d,preview=false){
   return `<span class="wl-hung-cord"></span><span class="wl-hung-body">${art(d.gift)}</span><span class="wl-needle-occlusion" data-crop-x="${d.x||50}" data-crop-y="${d.y||46}" aria-hidden="true"></span>`;
  }
  function renderScene(){
   const items=sceneData.items,owned=state.gifts.filter(g=>state.toys[g.id]>0);
   view.innerHTML=`<header class="wl-heading wl-scene-heading"><span>НОВОГОДНЯЯ СКАЗКА</span><h1>Ёлка наших чудес</h1><p>${fmt(sceneData.total)} украшений · у каждого своя история</p></header><div class="wl-toy-picker">${owned.map(g=>`<button data-wl="toy" data-value="${g.id}" class="${g.id===chosenToy?'selected':''}" aria-label="${esc(g.name)}, количество: ${state.toys[g.id]}">${art(g.id)}<small>×${state.toys[g.id]}</small></button>`).join('')}</div><div class="wl-scene wl-tree ${placing?'wl-is-placing':''}" id="wl-scene" tabindex="0" aria-label="Новогодняя ёлка. Выбери игрушку и её ветку; стрелки перемещают предпросмотр."><img class="wl-scene-background" src="assets/workshop/tree-v2.webp" alt="Пышная заснеженная ёлка на праздничной площади" width="1086" height="1448"><div class="wl-tree-sparkles" aria-hidden="true">${Array.from({length:12},(_,i)=>`<i style="--x:${26+(i*17)%49}%;--y:${22+(i*13)%58}%;--delay:${i*.37}s"></i>`).join('')}</div><div class="wl-decoration-layer">${[...items].reverse().map(d=>`<button class="wl-decoration wl-hanging" style="left:${d.x}%;top:${d.y}%;--swing:${(d.branch||0)%5-2}deg" data-decoration="${d.id}" aria-label="${esc(gifts()[d.gift].name)} · ${esc(d.owner)}">${hanging(d)}</button>`).join('')}</div><div class="wl-placement-preview wl-hanging" id="wl-preview" hidden></div><span class="wl-scene-plaque">СОЗДАНО НАШИМИ РУКАМИ</span></div><div class="wl-scene-meta"><span>Игрушки крепятся к веткам. Количество не ограничено.</span><button class="secondary" data-wl="refresh">Обновить</button></div>${sceneData.total>60?`<div class="wl-pages"><button class="secondary" data-wl="prev" ${page===0?'disabled':''}>← Предыдущие</button><span>Слой ${page+1}</span><button class="secondary" data-wl="next" ${!sceneData.next?'disabled':''}>Следующие →</button></div>`:''}<section class="wl-decorate-tools"><div class="wl-section-title"><span>ТВОЯ КОЛЛЕКЦИЯ</span><h2>Повесь своё чудо</h2></div>${owned.length?`<p class="wl-hint">Выбери фигурку и наведи на ветку. На телефоне — коснись ёлки или проведи по ней пальцем. Размер и подвес уже видны в предпросмотре.</p><button class="primary wide" data-wl="place" id="wl-place" disabled>Выбери ветку на ёлке</button><button class="secondary wide" data-wl="cancel-place">Осмотреть украшения</button>`:'<p>Создай свою первую игрушку — и у неё появится место в этой сказке.</p>'}<button class="secondary wide" data-tab="craft">Создать новую игрушку</button></section>`;
   point=null;bindScene();animate('.wl-scene');
  }
  function bindBoard(){
   let dragged=null,start=null,ghost=null;
   view.onpointerdown=e=>{
    const chip=e.target.closest('[data-material]');if(!chip)return;
    material=chip.dataset.material;view.querySelectorAll('[data-material]').forEach(el=>el.classList.toggle('selected',el===chip));start={x:e.clientX,y:e.clientY};dragged=material;try{chip.setPointerCapture?.(e.pointerId)}catch{}
   };
   view.onpointermove=e=>{
    if(!dragged||!start||Math.hypot(e.clientX-start.x,e.clientY-start.y)<8)return;
    if(!ghost){ghost=document.createElement('div');ghost.className='wl-drag-material';ghost.innerHTML=mat(mats()[dragged]);document.body.append(ghost)}
    ghost.style.transform=`translate(${e.clientX-25}px,${e.clientY-25}px)`;e.preventDefault();
   };
   view.onpointerup=e=>{
    if(ghost){const cell=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-slot]');if(cell){slots[Number(cell.dataset.slot)]=dragged;updateBoard();ignoreSlotClickUntil=Date.now()+150}ghost.remove();ghost=null}
    dragged=null;start=null;
   };
   view.onpointercancel=()=>{ghost?.remove();ghost=null;dragged=null;start=null};
  }
  function updateBoard(){
   const recipe=gifts()[gift];view.querySelectorAll('[data-slot]').forEach((el,i)=>{const m=slots[i];el.classList.remove('incorrect');el.innerHTML=m?mat(mats()[m])+`<small>×${recipe.slots[i]?.quantity||1}</small>`:'<span>+</span><small></small>';el.setAttribute('aria-label',`Клетка ${i+1}: ${m?mats()[m].name:'пусто'}`)});
  }
  function bindScene(){
   const scene=$('#wl-scene'),preview=$('#wl-preview');sceneResize?.disconnect();
   function measure(){sceneRect=scene.getBoundingClientRect();scene.style.setProperty('--tree-width',sceneRect.width+'px');scene.style.setProperty('--tree-height',sceneRect.height+'px');scene.querySelectorAll('.wl-needle-occlusion').forEach(el=>el.style.backgroundPosition=`${12.5-sceneRect.width*Number(el.dataset.cropX)/100}px ${3-sceneRect.height*Number(el.dataset.cropY)/100}px`)}
   measure();if(window.ResizeObserver){sceneResize=new ResizeObserver(measure);sceneResize.observe(scene)}
   function show(x,y){
    if(!chosenToy||busy)return;
    if(x<8||x>92||y<17||y>88||Math.abs(x-50)>15+(y-23)*34/61){preview.hidden=true;point=null;$('#wl-place').disabled=true;return}
    point=state.branches.reduce((best,b)=>(b.x-x)**2+(b.y-y)**2<(best.x-x)**2+(best.y-y)**2?b:best,state.branches[0]);
    const previewKey=chosenToy+':'+point.id;
    if(preview.dataset.previewKey!==previewKey){preview.innerHTML=hanging({...point,gift:chosenToy});preview.style.left=point.x+'%';preview.style.top=point.y+'%';preview.dataset.previewKey=previewKey;const crop=preview.querySelector('.wl-needle-occlusion');crop.style.backgroundPosition=`${12.5-sceneRect.width*point.x/100}px ${3-sceneRect.height*point.y/100}px`}preview.hidden=false;
    const button=$('#wl-place');button.disabled=false;button.textContent='Повесить на эту ветку';
   }
   function pointer(e){if(e.target.closest('[data-decoration]')&&!placing)return;const x=(e.clientX-sceneRect.left)/sceneRect.width*100,y=(e.clientY-sceneRect.top)/sceneRect.height*100;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>show(x,y))}
   scene.onpointerenter=measure;
   scene.onpointerdown=e=>{if(e.target.closest('[data-decoration]')&&!placing)return;placing=true;measure();try{scene.setPointerCapture(e.pointerId)}catch{}pointer(e)};
   scene.onpointermove=e=>{if(e.pointerType==='mouse'||e.buttons)pointer(e)};
   scene.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();show((point?.x||50)+(e.key==='ArrowRight'?8:e.key==='ArrowLeft'?-8:0),(point?.y||46)+(e.key==='ArrowDown'?8:e.key==='ArrowUp'?-8:0))};
  }
  async function mutate(path,method='POST',body){
   if(busy||dead)return;busy=true;view.querySelectorAll('button:not([data-tab])').forEach(b=>b.disabled=true);
   try{const result=await request(path,method,body);if(dead)return;busy=false;await refresh();return result}
   catch(e){if(!dead){busy=false;render();status(e.message);toast(e.message)}throw e}
   finally{busy=false}
  }
  async function sendPending(){
   if(!pending||busy)return;const saved=pending;
   try{const result=await mutate(saved.kind==='start'?'/api/workshop/start':'/api/workshop/decorations','POST',saved.body);if(dead)return;if(result){savePending(null);if(saved.kind==='start'){slots.fill(null);material=null}if(saved.kind==='decorate')placing=false;render();toast(saved.kind==='start'?'Эльфы начали творить волшебство!':'Игрушка нашла своё место ✨');if(motion())animate(saved.kind==='start'?'.wl-job':'.wl-decoration')}}
   catch(e){if([400,403,404,409].includes(e.status)){savePending(null);if(!dead)render()}else if(!dead)status('Нет подтверждения. Нажми «Проверить результат» — повторного списания не будет.')}
  }
  async function click(e){
   const slot=e.target.closest('[data-slot]');if(slot){if(Date.now()<ignoreSlotClickUntil)return;const i=Number(slot.dataset.slot);slots[i]=slots[i]?null:material;updateBoard();return}
   const chip=e.target.closest('[data-material]');if(chip){material=chip.dataset.material;view.querySelectorAll('[data-material]').forEach(el=>el.classList.toggle('selected',el===chip));return}
   const claim=e.target.closest('[data-claim]');if(claim){const result=await mutate('/api/workshop/jobs/'+claim.dataset.claim+'/claim');if(result&&!dead)sheet(`<div class="wl-reveal">${art(result.gift)}<h2>Волшебство получилось!</h2><p>${esc(gifts()[result.gift].name)} уже в твоих игрушках.</p><button class="primary wide" data-tab="tree">Украсить Новогоднюю ёлку</button></div>`);return}
   const decoration=e.target.closest('[data-decoration]');if(decoration){const d=sceneData.items.find(d=>d.id===decoration.dataset.decoration);if(!d)return;sheet(`<div class="wl-reveal">${art(d.gift)}<h2>${esc(gifts()[d.gift].name)}</h2><p>Создатель: ${esc(d.owner)}</p>${d.mine?`<button class="secondary wide" id="wl-remove">Снять и вернуть в игрушки</button>`:''}</div>`);document.querySelector('#wl-remove')?.addEventListener('click',async()=>{closeSheet();try{await mutate('/api/workshop/decorations/'+d.id,'DELETE')}catch{}});return}
   const button=e.target.closest('[data-wl]');if(!button||busy)return;
   const action=button.dataset.wl,value=button.dataset.value;
   if(action==='section'){section=value;render();animate('.wl-gift-card,.wl-toy-grid article,.wl-material-grid article');return}
   if(action==='material-tier'){tier=Number(value);render();animate('.wl-material-grid article');return}
   if(action==='tier'){tier=Number(value);gift=state.gifts.find(g=>g.tier===tier).id;slots.fill(null);material=null;render();animate('.wl-gift-card');return}
   if(action==='gift'){gift=value;slots.fill(null);material=null;render();return}
   if(action==='clear'){slots.fill(null);updateBoard();return}
   if(action==='start'){
    if(pending){status('Сначала проверь неподтверждённое действие.');return}
    const expected=gifts()[gift].slots.map(s=>s?.material||null);let wrong=false;
    view.querySelectorAll('[data-slot]').forEach((el,i)=>{const bad=slots[i]!==expected[i];el.classList.toggle('incorrect',bad);wrong||=bad});
    if(wrong){status('Сверь раскладку с образцом. Материалы остались у тебя.');toast('Материалы нужно расположить как в рецепте');return}
    savePending({kind:'start',body:{request_id:uuid(),gift,slots:[...slots]}});if(!pending)return;await sendPending();return;
   }
   if(action==='recover'){await sendPending();return}
   if(action==='toy'){placing=true;$('#wl-scene').classList.add('wl-is-placing');chosenToy=value;point=null;view.querySelectorAll('[data-wl="toy"]').forEach(el=>el.classList.toggle('selected',el===button));$('#wl-preview').hidden=true;$('#wl-place').disabled=true;return}
   if(action==='cancel-place'){placing=false;$('#wl-scene').classList.remove('wl-is-placing');point=null;$('#wl-preview').hidden=true;$('#wl-place').disabled=true;return}
   if(action==='place'){
    if(!point||!chosenToy||pending)return;if(savePending({kind:'decorate',body:{request_id:uuid(),gift:chosenToy,target:'tree',...point}}))await sendPending();return;
   }
   if(action==='prev'){page--;await refresh();return}
   if(action==='next'){cursors[++page]=sceneData.next;await refresh();return}
   if(action==='refresh'){await refresh();return}

  }
  view.addEventListener('click',onClick);
  function onClick(e){click(e).catch(error=>{if(!dead)toast(error.message)})}
  view.innerHTML='<div class="wl-loading"><span class="spinner"></span><h2>Открываем двери в сказку…</h2></div>';
  refresh().catch(e=>{if(!dead){view.innerHTML=`<section class="panel"><h2>Не удалось открыть мастерскую</h2><p>${esc(e.message)}</p><button class="primary wide" data-tab="${ctx.mode==='craft'?'craft':'tree'}">Попробовать ещё</button></section>`}});
  return {dispose(){dead=true;clearTimeout(ticker);sceneResize?.disconnect();if(frame!==null)cancelAnimationFrame(frame);view.removeEventListener('click',onClick);view.onpointerdown=view.onpointermove=view.onpointerup=view.onpointercancel=null;view.classList.remove('wl-view','wl-motion');document.querySelectorAll('.wl-drag-material').forEach(el=>el.remove())}};
 }
 window.WinterWonderland={mount};
})();
