(() => {
  const specs=[
    ['lights','Огни Рублёвки','💡','Погаси все огоньки. Нажатие меняет клетку и четыре соседние.'],
    ['sudoku','Судоку Санты','🔢','Заполни поле числами 1–4. Числа не должны повторяться в строках, столбцах и квадратах 2×2.'],
    ['nonogram','Снежный японский кроссворд','❄','Закрась узор по числам: они показывают длины групп в каждой строке и столбце. Между группами нужен пробел.'],
    ['hanoi','Башни подарков','🎁','Перенеси все кольца на правую башню. Большое кольцо нельзя класть на маленькое.'],
    ['slide','Зимние пятнашки','🧩','Передвигай плитки рядом с пустым местом. Собери числа от 1 до 15 по порядку.'],
    ['maze','Лабиринт деда','🛷','Проведи Санту к подарку. Нажимай соседние клетки дорожки.'],
    ['math','Математика подарков','⭐','Решай примеры и набери нужное число верных ответов до окончания попыток.'],
    ['sequence','Мелодия снежинок','🎵','Посмотри последовательность подсветки, затем повтори её нажатием на снежинки.'],
    ['words','Слова под снегом','🔎','Найди указанное слово: нажимай его буквы по порядку в соседних клетках.'],
    ['pipes','Созвездие Санты','🌠','Поворачивай звёздные стрелки, чтобы все они совпали с маленьким образцом.']
  ];
  const games=specs.map(([id,name,icon,desc])=>({id,name,icon,desc,genre:id==='sequence'?'Память':'Логика',sub:'Зимняя головоломка',holiday:true}));
  let playback=null,sudokuValue=1;
  function render({board:b,state:s,send,toast,motion}){
    clearTimeout(playback);const status=document.querySelector('#game-status');
    b.className='board holiday-board '+s.game;b.style.gridTemplateColumns=`repeat(${s.n},minmax(0,1fr))`;
    const button=(label,i,cls='')=>`<button class="holiday-cell ${cls}" data-holiday="${i}">${label}</button>`;
    let value=sudokuValue,source=null,ready=s.game!=='sequence';
    if(s.game==='hanoi'){
      b.innerHTML=s.towers.map((tower,i)=>`<button class="tower" data-holiday="${i}" aria-label="Башня ${i+1}">${[...tower].reverse().map(v=>`<span style="width:${Math.min(94,25+v*11)}%">${v}</span>`).join('')}<small>${i+1}</small></button>`).join('');
    }else if(s.game==='math')b.innerHTML=`<h2 class="quiz-question">${s.question} = ?</h2>`+s.options.map((v,i)=>button(v,i)).join('');
    else if(s.game==='sequence')b.innerHTML=Array.from({length:9},(_,i)=>button('❄',i)).join('');
    else b.innerHTML=s.board.map((v,i)=>button(s.game==='lights'?(v?'💡':'·'):s.game==='sudoku'||s.game==='slide'?(v||''):s.game==='nonogram'?(v?'❄':'·'):s.game==='maze'?(i===s.position?'🎅':i===s.goal?'🎁':v?'🌲':'·'):s.game==='words'?v:['↑','→','↓','←'][v],i,`${s.game==='lights'&&v?'lit':''} ${s.fixed?.includes(i)?'fixed':''} ${s.selected?.includes(i)?'selected':''} ${s.game==='nonogram'&&v?'lit':''}`)).join('');
    if(s.game==='sudoku'){
      const tools=document.createElement('div');tools.className='direction-controls';tools.innerHTML=[1,2,3,4].map(v=>`<button class="secondary ${v===sudokuValue?'selected':''}" data-number="${v}">${v}</button>`).join('');b.after(tools);
      tools.onclick=e=>{if(e.target.dataset.number){value=sudokuValue=+e.target.dataset.number;tools.querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===e.target));}};
    }
    if(s.game==='nonogram'){
      b.style.gridTemplateColumns=`38px repeat(${s.n},minmax(0,1fr))`;b.innerHTML='<span></span>'+s.cols.map(a=>'<span class="nonogram-clue">'+a.join('<br>')+'</span>').join('')+s.rows.map((a,r)=>'<span class="nonogram-clue">'+a.join(' ')+'</span>'+s.board.slice(r*s.n,r*s.n+s.n).map((v,c)=>button(v?'❄':'·',r*s.n+c,v?'lit':'')).join('')).join('');
      const check=document.createElement('button');check.className='primary wide';check.textContent='Проверить узор';check.onclick=()=>send({check:true});b.after(check);
    }
    if(s.game==='pipes'){
      const model=document.createElement('div');model.className='constellation-model';model.style.gridTemplateColumns=`repeat(${s.n},1fr)`;model.innerHTML=s.model.map(v=>`<span>${['↑','→','↓','←'][v]}</span>`).join('');b.before(model);
    }
    b.onclick=e=>{const el=e.target.closest('[data-holiday]');if(!el||!ready)return;const i=+el.dataset.holiday;
      if(s.game==='hanoi'){if(source===null){source=i;el.classList.add('selected');return}if(source===i){source=null;el.classList.remove('selected');return}const a=source;source=null;send({a,b:i});}
      else send({i,value});
    };
    if(s.game==='sequence'){
      status.textContent='Запоминай мелодию…';b.style.pointerEvents='none';let cursor=0;
      const play=()=>{if(!b.isConnected)return;if(cursor>=s.pattern.length){ready=true;b.style.pointerEvents='';status.textContent=`Повтори мелодию: ${s.cursor} / ${s.pattern.length}`;return}
        const el=b.children[s.pattern[cursor++]];
        if(motion())gsap.fromTo(el,{scale:1,backgroundColor:'#583d80'},{scale:1.16,backgroundColor:'#c69cff',duration:.25,yoyo:true,repeat:1});
        else {el.classList.add('lit');setTimeout(()=>el.classList.remove('lit'),450)}
        playback=setTimeout(play,650);
      };
      if(s.cursor===0)playback=setTimeout(play,500);else {ready=true;b.style.pointerEvents='';status.textContent=`Повтори мелодию: ${s.cursor} / ${s.pattern.length}`;}
    }else status.textContent=s.game==='words'?`Найди: ${s.word}`:s.game==='math'?`Верно: ${s.round} / ${s.target}`:'Каждый ход приближает зимнюю победу';
    if(motion()&&s.effects?.length)gsap.fromTo(b.querySelectorAll('.holiday-cell.selected,.holiday-cell.lit'),{scale:.88},{scale:1,duration:.3,ease:'back.out(1.8)'});
    if(motion()&&s.game!=='sequence')gsap.fromTo(b.children,{opacity:.8,y:4},{opacity:1,y:0,duration:.22,ease:'power2.out',clearProps:'transform,opacity'});
  }
  window.WinterHoliday={games,render};
})();
