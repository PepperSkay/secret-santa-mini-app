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
  let sudokuValue=1;
  const put=(el,value)=>{if(el.textContent!==String(value))el.textContent=value};
  function render(ctx){
    const {board:b,state:s}=ctx;b._context=ctx;
    if(b.dataset.mountedGame!==s.game){
      b.dataset.mountedGame=s.game;b.className="board holiday-board "+s.game;b.style.gridTemplateColumns=`repeat(${s.n},minmax(0,1fr))`;b._source=null;b._ready=s.game!=="sequence";
      const cell=i=>`<button class="holiday-cell" data-holiday="${i}"></button>`;
      if(s.game==="hanoi")b.innerHTML=s.towers.map((t,i)=>`<button class="tower" data-holiday="${i}" aria-label="Башня ${i+1}"><div class="tower-rings"></div><small>${i+1}</small></button>`).join("");
      else if(s.game==="math")b.innerHTML='<h2 class="quiz-question"></h2>'+[0,1,2,3].map(cell).join("");
      else if(s.game==="nonogram"){
        b.style.gridTemplateColumns=`38px repeat(${s.n},minmax(0,1fr))`;
        b.innerHTML='<span></span>'+s.cols.map(a=>'<span class="nonogram-clue">'+a.join('<br>')+'</span>').join('')+s.rows.map((a,r)=>'<span class="nonogram-clue">'+a.join(' ')+'</span>'+Array.from({length:s.n},(_,c)=>cell(r*s.n+c)).join('')).join('');
        const check=document.createElement("button");check.className="primary wide";check.textContent="Проверить узор";check.onclick=()=>b._context.send({check:true});b.after(check);
      }else b.innerHTML=Array.from({length:s.game==="sequence"?9:s.board.length},(_,i)=>cell(i)).join("");
      b._cells=[...b.querySelectorAll("[data-holiday]")];
      if(s.game==="sudoku"){const controls=document.createElement("div");controls.className="direction-controls";controls.innerHTML=[1,2,3,4].map(v=>`<button class="secondary" data-number="${v}">${v}</button>`).join("");b.after(controls);b._numbers=controls;controls.onclick=e=>{if(e.target.dataset.number){sudokuValue=+e.target.dataset.number;controls.querySelectorAll("button").forEach(el=>el.classList.toggle("selected",+el.dataset.number===sudokuValue))}}}
      if(s.game==="pipes"){const model=document.createElement("div");model.className="constellation-model";model.style.gridTemplateColumns=`repeat(${s.n},1fr)`;model.innerHTML=s.model.map(v=>'<span>'+['↑','→','↓','←'][v]+'</span>').join('');b.before(model)}
      b.onclick=e=>{
        const el=e.target.closest("[data-holiday]");if(!el||!b.contains(el)||!b._ready)return;
        const {state:current,send}=b._context,i=+el.dataset.holiday;
        if(current.game==="hanoi"){
          if(b._source===null){if(!current.towers[i].length)return;b._source=i;el.classList.add("selected")}
          else{const from=b._source;b._source=null;b._cells.forEach(c=>c.classList.remove("selected"));if(from!==i)send({a:from,b:i})}
        }else send({i,value:sudokuValue});
      };
      if(s.game==="sequence"){
        let cursor=0;const play=()=>{if(!b.isConnected)return;if(cursor===s.pattern.length){b._ready=true;put(document.querySelector("#game-status"),`Повтори мелодию: ${b._context.state.cursor} / ${s.pattern.length}`);return}
          const el=b._cells[s.pattern[cursor++]];if(ctx.motion())gsap.fromTo(el,{scale:1,backgroundColor:"#583d80"},{scale:1.16,backgroundColor:"#c69cff",duration:.25,yoyo:true,repeat:1,overwrite:"auto"});else{el.classList.add("lit");setTimeout(()=>el.classList.remove("lit"),450)}
          b._playback=setTimeout(play,650)};
        b._playback=setTimeout(play,500);b._dispose=()=>clearTimeout(b._playback);
      }
    }
    const cells=b._cells;
    if(s.game==="hanoi"){
      s.towers.forEach((tower,i)=>{const box=cells[i].firstElementChild,vals=[...tower].reverse();while(box.children.length>vals.length)box.lastChild.remove();vals.forEach((v,k)=>{let disk=box.children[k];if(!disk){disk=document.createElement("span");box.append(disk)}disk.style.width=Math.min(94,25+v*11)+"%";put(disk,v)})});
    }else if(s.game==="math"){put(b.firstElementChild,s.question+" = ?");s.options.forEach((v,i)=>put(cells[i],v))}
    else if(s.game==="sequence")cells.forEach(el=>put(el,"❄"));
    else s.board.forEach((v,i)=>{const el=cells[i];const label=s.game==="lights"?(v?"💡":"·"):["sudoku","slide"].includes(s.game)?v||"":s.game==="nonogram"?v?"❄":"·":s.game==="maze"?i===s.position?"🎅":i===s.goal?"🎁":v?"🌲":"·":s.game==="words"?v:["↑","→","↓","←"][v];put(el,label);el.className="holiday-cell"+(((s.game==="lights"||s.game==="nonogram")&&v)?" lit":"")+(s.fixed?.includes(i)?" fixed":"")+(s.selected?.includes(i)?" selected":"")});
    if(b._numbers)b._numbers.querySelectorAll("button").forEach(el=>el.classList.toggle("selected",+el.dataset.number===sudokuValue));
    const status=document.querySelector("#game-status");put(status,s.game==="sequence"?!b._ready?"Запоминай мелодию…":`Повтори мелодию: ${s.cursor} / ${s.pattern.length}`:s.game==="words"?"Найди: "+s.word:s.game==="math"?`Верно: ${s.round} / ${s.target}`:"Каждый ход приближает зимнюю победу");
    if(ctx.motion()&&s.effects?.length)gsap.fromTo(b.querySelectorAll(".holiday-cell.selected,.holiday-cell.lit"),{scale:.88},{scale:1,duration:.3,ease:"back.out(1.8)",overwrite:"auto"});
    if(ctx.motion()&&s.game!=="sequence")gsap.fromTo(b.children,{opacity:.8,y:4},{opacity:1,y:0,duration:.22,ease:"power2.out",overwrite:"auto",clearProps:"transform,opacity"});
  }
  window.WinterHoliday={games,render};
})();
