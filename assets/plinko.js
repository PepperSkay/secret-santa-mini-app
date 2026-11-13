/* Canvas animation is local; each virtual-currency result is settled once by the API. */
(() => {
  const values=[2,5,10,20,50,100,50,20,10,5,2];
  const label=m=>'x'+String(m/10).replace('.',',');
  const requestId=()=>crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
  function points(path,width,height){
    const pitch=(width-24)/11,gap=(height-104)/10;let x=width/2;
    const result=[{x,y:16}];
    for(let i=0;i<10;i++){x+=(path[i]==='1'?1:-1)*pitch/2;result.push({x,y:54+i*gap})}
    result.push({x,y:height-28});return result;
  }
  function sample(path,t){
    const p=Math.min(.999999,Math.max(0,t))*(path.length-1),i=Math.floor(p),f=p-i,a=path[i],b=path[i+1];
    return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f-Math.sin(f*Math.PI)*5};
  }
  function mount(ctx){
    const {view,api,esc,fmt,motion,onBalance}=ctx;
    let disposed=false,data=null,busy=false,request=null,raf=null,resize=null,animationEnd=null;
    let canvas,drawing,backdrop,width=340,height=330,dpr=1,paint=null;
    let storageKey='santa.plinko.pending.'+ctx.owner;
    try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved?.request_id&&Number.isInteger(saved.stake))request=saved}catch{}
    const clearPending=id=>{try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved?.request_id===id)localStorage.removeItem(storageKey)}catch{}};
    const $=selector=>view.querySelector(selector);
    const setStatus=(message,kind='')=>{const el=$('#plinko-result');if(el){el.textContent=message;el.dataset.kind=kind}};
    function updateControls(){
      if(!data||disposed)return;
      const input=$('#plinko-stake'),stake=Number(input.value),valid=Number.isInteger(stake)&&stake>=data.rules.min_stake&&stake<=data.rules.max_stake;
      input.disabled=busy||!!request;view.querySelectorAll('[data-stake]').forEach(el=>el.disabled=busy||!!request);
      const button=$('#plinko-throw');button.disabled=busy||(!request&&(!valid||stake>data.balance));
      button.textContent=busy?'Снежок в пути…':request?'Проверить незавершённый бросок':'Бросить снежок';
      $('#plinko-balance').textContent=fmt(data.balance)+' ❄';
      $('#plinko-error').textContent=!valid?'Введи целую ставку от '+data.rules.min_stake+' до '+fmt(data.rules.max_stake)+' ❄':!request&&stake>data.balance?'Недостаточно снежинок':'';
    }
    function draw(ball=null,slot=-1){
      if(!drawing||disposed)return;
      drawing.setTransform(dpr,0,0,dpr,0,0);drawing.clearRect(0,0,width,height);drawing.drawImage(backdrop,0,0,width,height);
      if(slot>=0){const pitch=(width-24)/11;drawing.fillStyle='#ffe6a977';drawing.fillRect(12+slot*pitch,height-48,pitch-2,40)}
      if(ball){
        for(let k=7;k>=1;k--){const p=sample(ball.path,Math.max(0,ball.t-k*.009));drawing.beginPath();drawing.arc(p.x,p.y,Math.max(1,5-k*.5),0,Math.PI*2);drawing.fillStyle=`rgba(185,224,255,${.28-k*.03})`;drawing.fill()}
        const p=sample(ball.path,ball.t);drawing.beginPath();drawing.arc(p.x,p.y,6,0,Math.PI*2);drawing.fillStyle='#e4f6ff';drawing.shadowColor='#a6d9ff';drawing.shadowBlur=10;drawing.fill();drawing.shadowBlur=0;
        drawing.beginPath();drawing.arc(p.x-1.5,p.y-2,2.2,0,Math.PI*2);drawing.fillStyle='#fff';drawing.fill();
      }
    }
    function measure(){
      if(disposed||!canvas)return;
      width=Math.max(250,Math.min(500,canvas.getBoundingClientRect().width||340));height=width*.92;dpr=Math.min(window.devicePixelRatio||1,2);
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);drawing=canvas.getContext('2d');
      backdrop=document.createElement('canvas');backdrop.width=canvas.width;backdrop.height=canvas.height;
      const c=backdrop.getContext('2d');c.scale(dpr,dpr);
      const gradient=c.createLinearGradient(0,0,0,height);gradient.addColorStop(0,'#25204b');gradient.addColorStop(1,'#17132c');c.fillStyle=gradient;c.fillRect(0,0,width,height);
      const pitch=(width-24)/11,gap=(height-104)/10;
      for(let row=0;row<10;row++)for(let col=0;col<=row;col++){
        const x=width/2+(col-row/2)*pitch,y=42+row*gap;c.beginPath();c.arc(x,y,3,0,Math.PI*2);c.fillStyle=row%2?'#bfbbef':'#94c9e9';c.fill();c.beginPath();c.arc(x-.6,y-.8,1,0,Math.PI*2);c.fillStyle='#fff';c.fill();
      }
      values.forEach((v,i)=>{
        c.fillStyle=v>=50?'#ab7549':v>=10?'#7653a2':'#2e4265';c.fillRect(12+i*pitch,height-48,pitch-2,40);
        c.fillStyle='#fff6e7';c.font=`700 ${Math.max(9,Math.min(12,pitch*.4))}px -apple-system, sans-serif`;c.textAlign='center';c.fillText(label(v),12+(i+.5)*pitch-1,height-23);
      });
      c.fillStyle='#daeaff';c.font='19px sans-serif';c.textAlign='center';c.fillText('❄',width/2,22);
      if(paint){const path=points(paint.raw,width,height);draw({path,t:paint.t})}else draw();
    }
    function animate(round){
      if(!motion()){draw(null,round.slot);return Promise.resolve()}
      return new Promise(resolve=>{
        animationEnd=resolve;const started=performance.now(),duration=1850;
        const frame=now=>{
          if(disposed){resolve();return}
          const t=Math.min(1,(now-started)/duration);paint={raw:round.path,t};draw({path:points(round.path,width,height),t},t>.96?round.slot:-1);
          if(t<1)raf=requestAnimationFrame(frame);else{raf=null;paint=null;animationEnd=null;draw(null,round.slot);resolve()}
        };raf=requestAnimationFrame(frame);
      });
    }
    async function send(){
      if(busy||disposed)return;
      const stake=Number($('#plinko-stake').value);
      if(!request){if(!Number.isInteger(stake)||stake<5||stake>data.rules.max_stake||stake>data.balance)return;
        request={request_id:requestId(),stake,rules_version:data.rules.version};
        try{localStorage.setItem(storageKey,JSON.stringify(request))}catch{setStatus('Не удалось сохранить бросок на устройстве. Освободи место и попробуй ещё раз.','error');request=null;return}
      }
      busy=true;updateControls();setStatus('Принимаем игровой бросок…');
      const sentId=request.request_id;
      try{
        const result=await api('/api/plinko/throw',{method:'POST',body:JSON.stringify(request)});
        request=null;clearPending(sentId);data.balance=result.balance;data.history=[result.round,...data.history.filter(r=>r.request_id!==result.round.request_id)].slice(0,20);
        if(disposed)return;
        onBalance(result.balance);
        updateControls();setStatus('Снежок летит…');await animate(result.round);if(disposed)return;
        const r=result.round,net=r.payout-r.stake;
        setStatus(`${label(r.multiplier)} · вернулось ${fmt(r.payout)} ❄ · ${net>0?'+':''}${fmt(net)} ❄ к балансу`,net>0?'plus':net<0?'minus':'neutral');
        if(motion())gsap.fromTo($('#plinko-result'),{scale:.94,opacity:.6},{scale:1,opacity:1,duration:.35,ease:'back.out(1.4)',overwrite:true});
      }catch(e){
        if([400,403,409,429].includes(e.status)){request=null;clearPending(sentId)}
        if(!disposed)setStatus(request?'Связь прервалась. Нажми «Проверить бросок»: повторного списания не будет.':e.message,'error');
      }finally{busy=false;if(!disposed)updateControls()}
    }
    async function load(){
      view.innerHTML='<section class="panel">Открываем снежную Plinko…</section>';
      try{
        const state=await api('/api/plinko');if(disposed)return;data=state;onBalance(data.balance);
        if(state.owner&&storageKey!=='santa.plinko.pending.'+state.owner){storageKey='santa.plinko.pending.'+state.owner;request=null;try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved?.request_id&&Number.isInteger(saved.stake))request=saved}catch{}}
        if(request&&data.history.some(r=>r.request_id===request.request_id)){clearPending(request.request_id);request=null}
        view.innerHTML=`<section class="plinko-intro"><div><span class="eyebrow">СНЕЖНАЯ АРКАДА</span><h1>Новогодняя Plinko</h1><p>Запусти снежок и смотри, куда он попадёт</p></div><span class="plinko-intro-art" aria-hidden="true">❄</span></section><div class="plinko-wallet"><span>Игровые снежинки</span><strong id="plinko-balance"></strong></div><div class="plinko-stakes"><label for="plinko-stake">Ставка, ❄<input id="plinko-stake" type="number" inputmode="numeric" min="5" max="100000" step="1" value="${request?.stake||5}" aria-describedby="plinko-error"></label><div class="plinko-presets">${[5,10,25,50].map(v=>`<button class="secondary" data-stake="${v}">${v}</button>`).join('')}</div></div><p class="plinko-error" id="plinko-error" role="status"></p><div class="plinko-board"><canvas aria-label="Снежок падает между ледяными штырьками в одну из 11 ячеек"></canvas></div><div id="plinko-result" class="plinko-result" role="status">${request?'Есть незавершённый бросок — проверь его результат':'Выбери ставку. Бросок запускается только кнопкой ниже.'}</div><button class="primary wide" id="plinko-throw">Бросить снежок</button>`;
        canvas=$('canvas');measure();if(window.ResizeObserver){resize=new ResizeObserver(measure);resize.observe(canvas)}
        $('#plinko-stake').oninput=updateControls;$('#plinko-throw').onclick=send;
        view.querySelectorAll('[data-stake]').forEach(el=>el.onclick=()=>{$('#plinko-stake').value=el.dataset.stake;updateControls()});
        updateControls();if(motion())gsap.fromTo(view.children,{opacity:0,y:15},{opacity:1,y:0,duration:.4,stagger:.025,ease:'power3.out',clearProps:'opacity,transform'});
      }catch(e){if(!disposed){view.innerHTML='<section class="panel"><h2>Plinko пока недоступна</h2><p>'+esc(e.message)+'</p><button class="primary wide" id="plinko-retry">Повторить</button></section>';$('#plinko-retry').onclick=load}}
    }
    load();return {dispose(){disposed=true;resize?.disconnect();if(raf!==null)cancelAnimationFrame(raf);animationEnd?.();animationEnd=null;paint=null}};
  }
  window.WinterPlinko={mount,points,sample,values};
})();
