(() => {
  let selectedPiece = 0,
    flagMode = false;
  const symbols = [
    "🎁",
    "🎄",
    "⭐",
    "❄️",
    "🔔",
    "🧦",
    "🍬",
    "⛄",
    "🦌",
    "🦊",
    "🕯️",
    "🛷",
    "🍪",
    "🧸",
    "🎀",
    "🪄",
  ];
  const games = [
    {
      id: "blocks",
      name: "Зимние блоки",
      sub: "Бесконечная игра на рекорд",
      genre: "Логика",
      icon: "🧊",
      endless: true,
      desc: "Размещай фигуры из трёх предложенных на поле 8×8. Полностью заполненные строки и столбцы эффектно исчезают. Игра продолжается, пока для фигур остаётся место. Побей свой максимальный рекорд.",
    },
    {
      id: "merge2048",
      name: "Зимние 2048",
      sub: "Бесконечная игра на рекорд",
      genre: "Логика",
      icon: "🔢",
      endless: true,
      desc: "Свайпай всё поле в одну сторону. Две одинаковые плитки сливаются в одну, после успешного хода появляется двойка или четвёрка. Играй до заполнения поля и побей свой максимальный рекорд.",
    },
    {
      id: "sort",
      name: "Сортировка шаров",
      sub: "Каждому цвету — своя колба",
      genre: "Логика",
      icon: "🔴",
      desc: "Разложи ёлочные шары по цветам. Выбери колбу, затем другую: верхний шар можно переместить на такой же цвет или в пустую колбу. В колбе четыре места. Собери каждый цвет целиком.",
    },
    {
      id: "mines",
      name: "Снежный сапёр",
      sub: "Читай следы на снегу",
      genre: "Логика",
      icon: "🚩",
      desc: "Открой все безопасные клетки. Число показывает, сколько ловушек в восьми соседних клетках. Переключись на флажок, чтобы отметить опасное место. Первый открытый участок безопасен.",
    },
    {
      id: "memory",
      name: "Пары подарков",
      sub: "Запоминай и находи",
      genre: "Память",
      icon: "🎴",
      desc: "Переворачивай по две карточки и находи одинаковые подарки. Совпавшие пары остаются открытыми, остальные снова закрываются. На следующих уровнях карточек больше и меньше права на ошибку.",
    },
  ];
  function progress(s) {
    if (s.record_mode) return 0;
    if (s.game === "sort")
      return (
        (s.tubes.filter((t) => t.length === 4 && new Set(t).size === 1).length /
          s.target) *
        100
      );
    if (s.game === "mines") return (s.opened.length / s.target) * 100;
    return (s.pairs / s.target) * 100;
  }
  const text=(el,value)=>{const v=String(value);if(el.textContent!==v)el.textContent=v};
  function render(context) {
    const {board:b,state:s}=context;
    b._context=context;
    if(b.dataset.mountedGame!==s.game){
      b.dataset.mountedGame=s.game;b.className="board extra-board "+s.game;
      b.style.gridTemplateColumns=s.game==="sort"?"":`repeat(${s.n||4},minmax(0,1fr))`;
      if(s.game==="sort"){
        b.className="sort-board";b.innerHTML=s.tubes.map((t,i)=>`<button class="tube" data-tube="${i}" aria-label="Колба ${i+1}"><span class="tube-glass"></span><small>${i+1}</small></button>`).join("");
      }else{
        const count=s.game==="memory"?s.cards.length:s.board.length;
        b.innerHTML=Array.from({length:count},(_,i)=>s.game==="merge2048"?'<span class="merge-tile"></span>':`<button class="${s.game==="blocks"?"block-cell":s.game==="mines"?"mine-cell":"memory-card"}" data-index="${i}" ${s.game==="blocks"?`data-block-cell="${i}"`:""}></button>`).join("");
      }
      b.onclick=e=>{
        const ctx=b._context,st=ctx.state,el=e.target.closest("[data-index],[data-tube]");if(!el||!b.contains(el))return;
        const i=+(el.dataset.index??el.dataset.tube);
        if(st.game==="blocks"){if(b._piece>=0)ctx.send({piece:b._piece,x:i%8,y:Math.floor(i/8)})}
        else if(st.game==="mines")ctx.send({i,type:b._flag?"flag":"open"});
        else if(st.game==="memory")ctx.send({i});
        else if(st.game==="sort"){
          if(b._tube==null){if(!st.tubes[i].length)return ctx.toast("Выбери колбу с шарами");b._tube=i;el.classList.add("selected")}
          else {const from=b._tube;b._tube=null;b.querySelectorAll(".selected").forEach(x=>x.classList.remove("selected"));if(from!==i)ctx.send({a:from,b:i})}
        }
      };
      if(s.game==="blocks"){
        b._piece=0;const tray=document.createElement("div");tray.className="block-tray";tray.innerHTML=[0,1,2].map(i=>`<button class="tray-piece" data-piece="${i}" aria-label="Фигура ${i+1}"></button>`).join("");b.after(tray);b._tray=tray;
        tray.onclick=e=>{const el=e.target.closest("[data-piece]");if(!el||el.disabled)return;b._piece=+el.dataset.piece;tray.querySelectorAll("button").forEach(x=>x.classList.toggle("selected",x===el))};
        let drag=null,ghost=null;
        const clear=()=>{ghost?.remove();ghost=null;drag=null};
        tray.onpointerdown=e=>{const el=e.target.closest("[data-piece]");if(!el||el.disabled)return;b._piece=+el.dataset.piece;drag={x:e.clientX,y:e.clientY};tray.setPointerCapture(e.pointerId)};
        tray.onpointermove=e=>{if(!drag||Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<10&&!ghost)return;if(!ghost){ghost=document.createElement("div");ghost.className="block-ghost";ghost.innerHTML=shape(b._context.state.tray[b._piece],b._piece);document.body.append(ghost)}ghost.style.transform=`translate(${e.clientX}px,${e.clientY-42}px)`};
        tray.onpointerup=e=>{if(!drag)return;const moved=!!ghost;clear();if(moved){const cell=document.elementFromPoint(e.clientX,e.clientY-30)?.closest("[data-block-cell]");if(cell&&b.contains(cell)){const i=+cell.dataset.blockCell;b._context.send({piece:b._piece,x:i%8,y:Math.floor(i/8)})}}};
        tray.onpointercancel=clear;b._dispose=clear;
      }
      if(s.game==="merge2048"){
        const controls=document.createElement("div");controls.className="direction-controls";controls.innerHTML=["left","up","down","right"].map((d,i)=>`<button class="secondary" data-direction="${d}" aria-label="${["Влево","Вверх","Вниз","Вправо"][i]}">${["←","↑","↓","→"][i]}</button>`).join("");b.after(controls);
        controls.onpointerdown=e=>{const el=e.target.closest("[data-direction]");if(!el||e.button>0)return;e.preventDefault();b._context.send({direction:el.dataset.direction})};
        controls.onclick=e=>{if(e.detail!==0)return;const el=e.target.closest("[data-direction]");if(el)b._context.send({direction:el.dataset.direction})};
        let down=null;b.onpointerdown=e=>{down=[e.clientX,e.clientY];b.setPointerCapture(e.pointerId)};b.onpointercancel=()=>down=null;
        b.onpointerup=e=>{if(!down)return;const dx=e.clientX-down[0],dy=e.clientY-down[1];down=null;if(Math.hypot(dx,dy)<20)return;b._context.send({direction:Math.abs(dx)>Math.abs(dy)?dx>0?"right":"left":dy>0?"down":"up"})};
        b.tabIndex=0;b.onkeydown=e=>{const d={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right"}[e.key];if(d){e.preventDefault();b._context.send({direction:d})}};
      }
      if(s.game==="mines"){const flag=document.createElement("button");flag.className="secondary wide flag-mode";b.after(flag);b._flagControl=flag;flag.onclick=()=>{b._flag=!b._flag;text(flag,b._flag?"🚩 Флажки включены · сменить на открытие":"❄ Открываем клетки · включить флажки")}}
    }
    const status=document.querySelector("#game-status"),cells=[...b.children];
    if(s.game==="blocks"){
      s.board.forEach((v,i)=>{const el=cells[i];const cls="block-cell"+(v?" filled color-"+v:"");if(el.className!==cls)el.className=cls});
      if(!s.tray[b._piece])b._piece=s.tray.findIndex(Boolean);
      s.tray.forEach((piece,i)=>{const el=b._tray.children[i],signature=JSON.stringify(piece);el.disabled=!piece;el.classList.toggle("selected",b._piece===i);if(el.dataset.shape!==signature){el.dataset.shape=signature;el.innerHTML=piece?shape(piece,i):"<span>✓</span>"}});
      text(status,`Очищено линий: ${s.lines}${s.combo>1?" · Комбо ×"+s.combo:""} · игра до заполнения поля`);
    }else if(s.game==="merge2048"){
      s.board.forEach((v,i)=>{const el=cells[i];text(el,v||"");el.setAttribute("aria-label",v||"Пусто");const cls="merge-tile"+(v?" v-"+Math.min(11,Math.log2(v)):"");if(el.className!==cls)el.className=cls});
      text(status,`Максимальная плитка: ${Math.max(...s.board)} · игра до заполнения поля`);
    }else if(s.game==="sort"){
      s.tubes.forEach((t,i)=>{const glass=cells[i].firstElementChild;while(glass.children.length>t.length)glass.lastChild.remove();t.forEach((v,k)=>{let ball=glass.children[k];if(!ball){ball=document.createElement("span");glass.append(ball)}ball.className="sort-ball ball-"+v;text(ball,["●","◆","★","❄","♥","✦"][v])})});
      text(status,`Собери ${s.colors} цветов в полные колбы`);
    }else if(s.game==="mines"){
      s.board.forEach((v,i)=>{const el=cells[i];el.className="mine-cell"+(v>=0?" opened":"")+(v===9?" trap":"");el.dataset.count=v;text(el,v===-2?"🚩":v===-1?"":v===9?"💥":v||"")});
      text(b._flagControl,b._flag?"🚩 Флажки включены · сменить на открытие":"❄ Открываем клетки · включить флажки");text(status,`Открыто ${s.opened.length} / ${s.target} · флажков ${s.flags.length} / ${s.mine_count}`);
    }else{
      s.cards.forEach((v,i)=>{const el=cells[i];el.className="memory-card"+(v!==null?" face-up":"")+(s.found.includes(i)?" found":"");el.disabled=s.found.includes(i);text(el,v!==null?symbols[v]:"❄")});
      text(status,`Пары: ${s.pairs} / ${s.target}`);clearTimeout(b._peekTimer);if(s.peek_until>Date.now()/1000)b._peekTimer=setTimeout(()=>{if(b.isConnected)b._context.refresh()},Math.max(50,(s.peek_until-Date.now()/1000)*1000+60));
    }
    if(context.motion()&&window.gsap&&s.effects?.flat().length&&s.game!=="blocks")gsap.fromTo(b,{opacity:.8},{opacity:1,duration:.15,overwrite:"auto"});
  }
  function shape(piece, color) {
    const cols = Math.max(...piece.map(([x]) => x)) + 1,
      rows = Math.max(...piece.map(([, y]) => y)) + 1;
    return `<span class="mini-shape" style="width:${cols * 18}px;height:${rows * 18}px">${piece.map(([x, y]) => `<i class="color-${color + 1}" style="transform:translate(${x * 18}px,${y * 18}px)"></i>`).join("")}</span>`;
  }
  window.WinterExtras = { games, render, progress };
})();
