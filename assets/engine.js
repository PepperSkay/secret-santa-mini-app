/* Deterministic mobile simulation. The API replays actions; clients never award points. */
(() => {
 const clone=x=>JSON.parse(JSON.stringify(x)),eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b),bad=m=>{throw Error(m)},range=n=>Array.from({length:n},(_,i)=>i);
 class RNG {
  constructor(seed){this.state=seed>>>0} random(){let t=this.state=(this.state+0x6D2B79F5)>>>0;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}
  randrange(n){return Math.floor(this.random()*n)} randint(a,b){return a+this.randrange(b-a+1)} choice(a){return a[this.randrange(a.length)]}
  shuffle(a){for(let i=a.length-1;i>0;i--){const j=this.randrange(i+1);[a[i],a[j]]=[a[j],a[i]]}return a} sample(a,n){return this.shuffle([...a]).slice(0,n)}
 }
 const shapes=[[[0,0]],[[0,0],[1,0]],[[0,0],[0,1]],[[0,0],[1,0],[2,0]],[[0,0],[0,1],[0,2]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[0,1],[1,1]],[[0,0],[1,0],[2,0],[1,1]],[[0,0],[1,0],[2,0],[3,0]],[[0,0],[0,1],[0,2],[0,3]],[[0,0],[0,1],[0,2],[1,2]]];
 const around=(i,n)=>[i-n,i+n,i-1,i+1].filter(j=>j>=0&&j<n*n&&Math.abs(Math.floor(j/n)-Math.floor(i/n))+Math.abs(j%n-i%n)===1);
 const neighbors=(i,n)=>range(n*n).filter(j=>j!==i&&Math.abs(Math.floor(j/n)-Math.floor(i/n))<=1&&Math.abs(j%n-i%n)<=1);
 const integer=(v,hi)=>{if(!Number.isInteger(v)||v<0||v>=hi)bad('Выбери клетку');return v};
 function matches(b,n){const found=new Set();for(let line=0;line<n;line++)for(const vertical of [false,true]){let run=[];for(let k=0;k<=n;k++){const i=vertical?k*n+line:line*n+k,v=k<n?b[i]:null;if(run.length&&(k===n||b[run.at(-1)]!==v)){if(run.length>=3)run.forEach(x=>found.add(x));run=[]}if(k<n&&v!==null)run.push(i)}}return [...found].sort((a,b)=>a-b)}
 function swaps(b,n){const out=[];for(let a=0;a<b.length;a++)for(const c of [a+1,a+n]){if(c>=b.length||(c===a+1&&Math.floor(a/n)!==Math.floor(c/n)))continue;[b[a],b[c]]=[b[c],b[a]];if(matches(b,n).length)out.push([a,c]);[b[a],b[c]]=[b[c],b[a]]}return out}
 function free(tiles,i){const t=tiles[i];if(t.gone)return false;let left=false,right=false;for(const o of tiles){if(o.gone||o===t)continue;if(o.z>t.z&&Math.abs(o.x-t.x)<1&&Math.abs(o.y-t.y)<1)return false;if(o.z===t.z&&Math.abs(o.y-t.y)<.9){left ||= o.x-t.x<-.01&&o.x-t.x>-1.1;right ||= o.x-t.x>.01&&o.x-t.x<1.1}}return !(left&&right)}
 function slide(b,dir){const out=[...b];let points=0;for(let row=0;row<4;row++){let ix=range(4).map(i=>['left','right'].includes(dir)?row*4+i:i*4+row);if(['right','down'].includes(dir))ix.reverse();const vals=ix.map(i=>b[i]).filter(Boolean),merged=[];for(let i=0;i<vals.length;i++){if(vals[i]===vals[i+1]){merged.push(vals[i]*2);points+=vals[i]*2;i++}else merged.push(vals[i])}while(merged.length<4)merged.push(0);ix.forEach((i,k)=>out[i]=merged[k])}return [out,points]}
 function fits(b,p,x,y){return p&&p.every(([dx,dy])=>x+dx>=0&&x+dx<8&&y+dy>=0&&y+dy<8&&!b[(y+dy)*8+x+dx])}
 function placements(s){return s.tray.some(p=>p&&range(64).some(i=>fits(s.board,p,i%8,Math.floor(i/8))))}
 function clues(a){let out=[],count=0;for(const v of [...a,0]){if(v)count++;else if(count){out.push(count);count=0}}return out.length?out:[0]}
 function question(s,rng){const a=rng.randint(2,9+s.level*3),b=rng.randint(2,10);s.question=s.round%2===0?`${a} + ${b}`:`${a} × ${b}`;s.answer=s.round%2===0?a+b:a*b;const options=[s.answer];while(options.length<4){const v=Math.max(0,s.answer+rng.randint(-12,12));if(!options.includes(v))options.push(v)}s.options=rng.shuffle(options)}
 function step(state,a){const s=clone(state),g=s.game,n=s.n,now=s.started+(a.elapsed_ms||0)/1000;s._clock=now;
  if(s.won||s.lost)bad('Партия уже завершена');s.steps++;s.effects=[];for(const k of ['hint','frames','swap','invalid','reshuffled','cleared'])delete s[k];
  if(a.type==='hint'){
   if(!['match3','mahjong'].includes(g)||s.moves<=1)bad('Подсказка недоступна');s.moves--;s.hint=g==='match3'?(swaps(s.board,n)[0]||[]):[];
   if(g==='mahjong'){const f=range(s.tiles.length).filter(i=>free(s.tiles,i));for(const x of f){const y=f.find(y=>y!==x&&s.tiles[x].value===s.tiles[y].value);if(y!==undefined){s.hint=[x,y];break}}}return s;
  }
  if(g==='match3'){
   const x=integer(a.a,n*n),y=integer(a.b,n*n);if(!(Math.abs(x-y)===n||(Math.abs(x-y)===1&&Math.floor(x/n)===Math.floor(y/n))))bad('Выбери соседние фишки');const b=s.board;[b[x],b[y]]=[b[y],b[x]];s.swap=[x,y];s.frames=[];let hit=matches(b,n);
   if(!hit.length){[b[x],b[y]]=[b[y],b[x]];s.invalid=[x,y];return s} s.moves--;s.turns++;const rng=new RNG(s.seed+s.turns*7919);let cascade=0;
   while(hit.length&&cascade<40){cascade++;s.score+=hit.length*35*cascade;s.effects.push(hit);const before=[...b];hit.forEach(i=>b[i]=null);const drops=[];for(let col=0;col<n;col++){const survivors=range(n).filter(r=>b[r*n+col]!==null).map(r=>[r,b[r*n+col]]),missing=n-survivors.length,vals=range(missing).map(()=>rng.randrange(s.colors)).concat(survivors.map(x=>x[1]));for(let r=0;r<missing;r++)drops.push({from:(r-missing)*n+col,to:r*n+col,value:vals[r]});survivors.forEach(([r,v],k)=>{if(missing+k!==r)drops.push({from:r*n+col,to:(missing+k)*n+col,value:v})});vals.forEach((v,r)=>b[r*n+col]=v)}s.frames.push({before,clear:hit,after:[...b],drops});hit=matches(b,n)}
   s.combo=cascade;s.won=s.score>=s.target;if(!s.won&&!swaps(b,n).length){for(let k=0;k<1000;k++){rng.shuffle(b);if(!matches(b,n).length&&swaps(b,n).length)break}s.reshuffled=true}
  }else if(g==='mahjong'){
   if(a.type==='shuffle'){if(!s.shuffles)bad('Перемешивания закончились');const pending=clone(s.tiles),rng=new RNG(s.seed+s.steps);while(pending.some(t=>!t.gone)){const [x,y]=rng.sample(range(pending.length).filter(i=>free(pending,i)),2),v=rng.randrange(8);s.tiles[x].value=s.tiles[y].value=v;pending[x].gone=pending[y].gone=true}s.shuffles--;s.score=Math.max(0,s.score-75);return s}
   const x=integer(a.a,s.tiles.length),y=integer(a.b,s.tiles.length);if(x===y||!free(s.tiles,x)||!free(s.tiles,y))bad('Эта плитка закрыта');s.moves--;if(s.tiles[x].value===s.tiles[y].value){s.tiles[x].gone=s.tiles[y].gone=true;s.pairs++;s.score+=120;s.effects=[[x,y]]}s.won=s.pairs===s.target;
  }else if(g==='tree'){
   if(now<s.memorize_until)bad('Сначала запомни образец');if(a.type==='check'){if(s.placed.includes(-1))bad('Сначала расставь все игрушки');s.won=eq(s.placed,s.target);s.lost=!s.won;s.score=s.won?s.placed.length*150:0;return s}integer(a.i,s.target.length);integer(a.value,6);s.placed[a.i]=a.value;s.moves=s.placed.filter(v=>v<0).length;return s;
  }else if(g==='puzzle'){
   const x=integer(a.a,n*n),y=integer(a.b,n*n);if(x===y)bad('Выбери два разных фрагмента');[s.board[x],s.board[y]]=[s.board[y],s.board[x]];s.moves--;const correct=s.board.filter((v,i)=>v===i).length;s.score=correct*100;s.won=correct===n*n;s.effects=[[x,y]];
  }else if(g==='blocks'){
   const p=integer(a.piece,3),x=integer(a.x,8),y=integer(a.y,8),piece=s.tray[p];if(!fits(s.board,piece,x,y))bad('Здесь фигура не помещается');const changed=[];for(const [dx,dy]of piece){const i=(y+dy)*8+x+dx;s.board[i]=p+1;changed.push(i)}s.tray[p]=null;s.moves--;s.score+=piece.length*10;const rows=range(8).filter(r=>range(8).every(c=>s.board[r*8+c])),cols=range(8).filter(c=>range(8).every(r=>s.board[r*8+c])),clear=[...new Set(rows.flatMap(r=>range(8).map(c=>r*8+c)).concat(cols.flatMap(c=>range(8).map(r=>r*8+c))))].sort((a,b)=>a-b);clear.forEach(i=>s.board[i]=0);const lines=rows.length+cols.length;s.combo=lines?s.combo+1:0;s.lines+=lines;s.score+=lines*150*Math.max(1,s.combo);s.effects=[clear.length?clear:changed];s.cleared=clear;if(!s.tray.some(Boolean)){s.bags++;s.tray=clone(new RNG(s.seed+s.bags*6113).sample(shapes,3))}s.lost=!placements(s);
  }else if(g==='merge2048'){
   if(!['up','down','left','right'].includes(a.direction))bad('Выбери направление');const [b,points]=slide(s.board,a.direction);if(eq(b,s.board))bad('В этом направлении нет хода');s.board=b;s.turns++;s.moves--;s.score+=points;const rng=new RNG(s.seed+s.turns*9151),empty=range(16).filter(i=>!b[i]);if(empty.length){const spawn=rng.random()<.1?4:2;b[rng.choice(empty)]=spawn;}s.lost=!['left','right','up','down'].some(d=>!eq(slide(b,d)[0],b));
  }else if(g==='sort'){
   const x=integer(a.a,s.tubes.length),y=integer(a.b,s.tubes.length),src=s.tubes[x],dst=s.tubes[y];if(x===y||!src.length||dst.length>=4||(dst.length&&src.at(-1)!==dst.at(-1)))bad('Шар можно класть только на такой же цвет или в пустую колбу');dst.push(src.pop());s.moves--;s.score=s.tubes.filter(t=>t.length===4&&new Set(t).size===1).length*300;s.won=s.tubes.every(t=>!t.length||(t.length===4&&new Set(t).size===1));
  }else if(g==='mines'){
   const i=integer(a.i,n*n);if(s.opened.includes(i))bad('Клетка уже открыта');if(a.type==='flag'){if(s.flags.includes(i))s.flags=s.flags.filter(x=>x!==i);else s.flags.push(i);return s}if(s.flags.includes(i))bad('Сначала убери флажок');if(!s.mines.length){const excluded=[i,...neighbors(i,n)];s.mines=new RNG(s.seed).sample(range(n*n).filter(i=>!excluded.includes(i)),s.mine_count)}s.moves--;if(s.mines.includes(i)){s.lost=true;s.exploded=i;return s}const queue=[i],opened=new Set(s.opened);while(queue.length){const j=queue.pop();if(opened.has(j)||s.mines.includes(j)||s.flags.includes(j))continue;opened.add(j);if(!neighbors(j,n).some(k=>s.mines.includes(k)))queue.push(...neighbors(j,n))}s.opened=[...opened].sort((a,b)=>a-b);s.score=s.opened.length*25;s.won=s.opened.length===s.target;if(s.won)s.score+=s.mine_count*75;
  }else if(g==='memory'){
   if(now<s.peek_until)bad('Запомни открытые карточки');const i=integer(a.i,s.deck.length);if(s.found.includes(i)||s.opened.includes(i))bad('Карточка уже открыта');s.peek=[];s.opened.push(i);if(s.opened.length===2){const[x,y]=s.opened;s.moves--;if(s.deck[x]===s.deck[y]){s.found.push(x,y);s.pairs++;s.score+=150;s.effects=[[x,y]]}else{s.peek=[x,y];s.peek_until=now+.8}s.opened=[]}s.won=s.pairs===s.target;
  }else return holiday(s,a);
  if(s.won)s.score+=Math.max(0,s.moves)*(['match3','mahjong','puzzle'].includes(g)?20:5);s.lost=s.lost||(s.moves<=0&&!s.won);return s;
 }
 function holiday(s,a){const g=s.game,n=s.n,i=a.i;
  if(g==='hanoi'){const x=integer(a.a,3),y=integer(a.b,3),src=s.towers[x],dst=s.towers[y];if(x===y||!src.length)bad('Выбери две разные башни');if(dst.length&&dst.at(-1)<src.at(-1))bad('Большое кольцо нельзя класть на маленькое');dst.push(src.pop());s.won=s.towers[2].length===s.count;
  }else if(g==='math'){integer(i,4);if(s.options[i]===s.answer){s.round++;s.score+=100}s.won=s.round===s.target;question(s,new RNG(s.seed+s.steps));
  }else if(g==='nonogram'&&a.check){s.won=range(n).every(r=>eq(clues(s.board.slice(r*n,r*n+n)),s.rows[r]))&&range(n).every(c=>eq(clues(range(n).map(r=>s.board[r*n+c])),s.cols[c]));if(!s.won)bad('Узор пока не совпадает с подсказками');
  }else{integer(i,n*n);
   if(g==='lights'){for(const j of [i,...around(i,n)])s.board[j]^=1;s.won=!s.board.some(Boolean)}
   else if(g==='sudoku'){if(s.fixed.includes(i)||!Number.isInteger(a.value)||a.value<1||a.value>4)bad('Выбери пустую клетку и число');s.board[i]=a.value;const valid=x=>new Set(x).size===4&&x.every(v=>v>=1&&v<=4);s.won=range(4).every(r=>valid(s.board.slice(r*4,r*4+4)))&&range(4).every(c=>valid(range(4).map(r=>s.board[r*4+c])))&&[0,2].every(r=>[0,2].every(c=>valid([s.board[r*4+c],s.board[r*4+c+1],s.board[(r+1)*4+c],s.board[(r+1)*4+c+1]])))}
   else if(g==='nonogram')s.board[i]^=1;
   else if(g==='slide'){const z=s.board.indexOf(0);if(!around(z,4).includes(i))bad('Передвинь плитку рядом с пустым местом');[s.board[i],s.board[z]]=[s.board[z],s.board[i]];s.won=eq(s.board,[...range(15).map(i=>i+1),0])}
   else if(g==='maze'){if(!around(s.position,n).includes(i)||s.board[i])bad('Иди по дорожке в соседнюю клетку');s.position=i;s.won=i===s.goal}
   else if(g==='sequence'){if(i!==s.pattern[s.cursor])s.lost=true;else{s.cursor++;s.won=s.cursor===s.pattern.length}s.moves++}
   else if(g==='words'){if(s.selected.includes(i))s.selected=[];else s.selected.push(i);if(s.selected.length===s.word.length){s.won=s.selected.map(j=>s.board[j]).join('')===s.word&&s.selected.every((j,k)=>k===0||around(s.selected[k-1],n).includes(j));if(!s.won)s.selected=[]}}
   else if(g==='pipes'){s.board[i]=(s.board[i]+1)%4;s.won=eq(s.board,s.answer)}s.effects=[[i]];
  }s.moves--;if(s.won)s.score+=500+s.level*100+Math.max(0,s.moves)*5;s.lost=s.lost||(s.moves<=0&&!s.won);return s;
 }
 function publicState(state,now=Date.now()/1000){const s=clone(state);delete s.seed;delete s.started;delete s._last_batch;delete s._clock;delete s.solution;
  if(s.game==='tree'&&now>=s.memorize_until){s.slots=s.target.length;delete s.target}
  if(s.game==='mahjong')s.tiles.forEach((t,i)=>t.free=free(s.tiles,i));
  if(s.game==='mines'){const mines=s.mines;s.board=range(s.n*s.n).map(i=>s.lost&&mines.includes(i)?9:s.opened.includes(i)?neighbors(i,s.n).filter(j=>mines.includes(j)).length:s.flags.includes(i)?-2:-1);delete s.mines}
  if(s.game==='memory'){s.cards=s.deck.map((v,i)=>s.found.includes(i)||s.opened.includes(i)||(now<s.peek_until&&s.peek.includes(i))?v:null);delete s.deck}
  if(s.game==='pipes')s.model=s.answer;delete s.answer;return s;
 }
 window.WinterEngine={step,publicState,RNG,slide,swaps,free,placements,clues};
})();
