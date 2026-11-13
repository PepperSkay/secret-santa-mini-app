/* Placement preview is read-only: only a valid pointer release commits a move. */
(() => {
  function preview(state, pieceIndex, x, y) {
    const piece=state.tray[pieceIndex],n=state.n||8,cells=[];
    if(!piece||!Number.isInteger(x)||!Number.isInteger(y))return {valid:false,cells,lines:[]};
    let valid=true;
    for(const [dx,dy] of piece){const col=x+dx,row=y+dy;
      if(col<0||col>=n||row<0||row>=n){valid=false;continue}
      const i=row*n+col;cells.push(i);if(state.board[i])valid=false;
    }
    const lines=[];
    if(valid){const occupied=new Set(cells);
      for(let k=0;k<n;k++){
        const row=Array.from({length:n},(_,i)=>k*n+i),col=Array.from({length:n},(_,i)=>i*n+k);
        for(const line of [row,col])if(line.every(i=>state.board[i]||occupied.has(i)))lines.push(...line);
      }
    }
    return {valid,cells,lines:[...new Set(lines)]};
  }
  function mount(board,tray,shape) {
    let drag=null,ghost=null,frame=null,geometry=null,geometryDirty=true,lastPoint=null;
    let painted=[],lit=[],previewKey='',suppressClick=false,disposed=false;
    const children=[...board.children];
    const select=index=>{board._piece=index;[...tray.children].forEach((el,i)=>{el.classList.toggle('selected',i===index);el.setAttribute('aria-pressed',String(i===index))})};
    const clearPreview=()=>{
      painted.forEach(i=>children[i].classList.remove('preview-valid','preview-invalid'));
      lit.forEach(i=>children[i].classList.remove('preview-line'));
      painted=[];lit=[];previewKey='';delete board.dataset.previewValid;delete board.dataset.previewOrigin;
    };
    function measure(){
      const a=children[0].getBoundingClientRect(),b=children[1].getBoundingClientRect(),c=children[8].getBoundingClientRect();
      geometry={left:a.left,top:a.top,width:a.width,height:a.height,pitchX:b.left-a.left,pitchY:c.top-a.top};geometryDirty=false;
    }
    function paint(index,x,y){
      const key=index+':'+x+':'+y;
      if(previewKey===key)return preview(board._context.state,index,x,y);
      const result=preview(board._context.state,index,x,y);clearPreview();previewKey=key;
      painted=result.cells;lit=result.lines;
      board.dataset.previewValid=String(result.valid);board.dataset.previewOrigin=x+','+y;
      board.style.setProperty('--placement-fill',['#70b9ff','#efa65d','#b495ff'][index]||'#b495ff');
      painted.forEach(i=>children[i].classList.add(result.valid?'preview-valid':'preview-invalid'));
      lit.forEach(i=>children[i].classList.add('preview-line'));
      return result;
    }
    function atPoint(point){
      if(geometryDirty||!geometry)measure();
      const piece=board._context.state.tray[drag.index];if(!piece)return null;
      const g=geometry,cols=Math.max(...piece.map(([x])=>x))+1,rows=Math.max(...piece.map(([,y])=>y))+1;
      const width=g.width+(cols-1)*g.pitchX,height=g.height+(rows-1)*g.pitchY;
      // The complete shape is lifted above a finger; the same anchor drives the preview and drop.
      const left=point.x-width/2,top=point.y-drag.lift-height/2;
      const x=Math.round((left-g.left)/g.pitchX),y=Math.round((top-g.top)/g.pitchY);
      const result=paint(drag.index,x,y);
      if(ghost){ghost.style.transform=`translate3d(${left}px,${top}px,0)`;ghost.dataset.valid=String(result.valid)}
      return {x,y,...result};
    }
    function makeGhost(){
      const piece=board._context.state.tray[drag.index];if(!piece)return;
      if(geometryDirty||!geometry)measure();
      ghost=document.createElement('div');ghost.className='block-ghost placement-ghost';ghost.setAttribute('aria-hidden','true');
      ghost.innerHTML=shape(piece,drag.index);const mini=ghost.firstElementChild,g=geometry;
      mini.style.width=(g.width+Math.max(...piece.map(([x])=>x))*g.pitchX)+'px';
      mini.style.height=(g.height+Math.max(...piece.map(([,y])=>y))*g.pitchY)+'px';
      [...mini.children].forEach((el,i)=>{el.style.width=g.width+'px';el.style.height=g.height+'px';el.style.transform=`translate(${piece[i][0]*g.pitchX}px,${piece[i][1]*g.pitchY}px)`});
      document.body.append(ghost);tray.children[drag.index].classList.add('dragging');
    }
    function stop(){
      if(frame!==null)cancelAnimationFrame(frame);frame=null;ghost?.remove();ghost=null;
      tray.querySelector('.dragging')?.classList.remove('dragging');clearPreview();
      const old=drag;drag=null;lastPoint=null;
      if(old&&tray.hasPointerCapture?.(old.id))tray.releasePointerCapture(old.id);
    }
    function hover(e){
      if(drag||disposed||e.pointerType==='touch')return;
      const el=e.target.closest('[data-block-cell]');if(!el||!board.contains(el)||board._piece<0){clearPreview();return}
      const i=+el.dataset.blockCell;paint(board._piece,i%8,Math.floor(i/8));
    }
    function refresh(){clearPreview();geometryDirty=true;[...tray.children].forEach((el,i)=>el.setAttribute('aria-pressed',String(i===board._piece)))}
    tray.onclick=e=>{
      if(suppressClick){suppressClick=false;e.preventDefault();return}
      const el=e.target.closest('[data-piece]');if(!el||el.disabled)return;clearPreview();select(+el.dataset.piece);
    };
    tray.onpointerdown=e=>{
      const el=e.target.closest('[data-piece]');if(!el||el.disabled||drag||e.isPrimary===false||e.button>0||disposed)return;
      suppressClick=false;clearPreview();select(+el.dataset.piece);geometryDirty=true;measure();
      drag={id:e.pointerId,index:board._piece,startX:e.clientX,startY:e.clientY,lift:e.pointerType==='touch'?60:0,moved:false};
      tray.setPointerCapture(e.pointerId);
    };
    tray.onpointermove=e=>{
      if(!drag||e.pointerId!==drag.id)return;
      if(!drag.moved&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<8)return;
      if(!drag.moved){drag.moved=true;makeGhost()}
      lastPoint={x:e.clientX,y:e.clientY};
      if(frame===null)frame=requestAnimationFrame(()=>{frame=null;if(drag&&lastPoint)atPoint(lastPoint)});
    };
    tray.onpointerup=e=>{
      if(!drag||e.pointerId!==drag.id)return;
      const current=drag,candidate=current.moved?atPoint({x:e.clientX,y:e.clientY}):null;
      if(current.moved)suppressClick=true;stop();
      if(candidate?.valid)board._context.send({piece:current.index,x:candidate.x,y:candidate.y});
    };
    tray.onpointercancel=stop;tray.onlostpointercapture=()=>{if(drag)stop()};
    board.addEventListener('pointermove',hover);const leave=()=>{if(!drag)clearPreview()};board.addEventListener('pointerleave',leave);
    const invalidate=()=>geometryDirty=true;
    const blur=()=>{if(drag)suppressClick=true;stop()};
    const visibility=()=>{if(document.hidden)blur()};
    window.addEventListener('resize',invalidate);window.addEventListener('scroll',invalidate,{passive:true,capture:true});window.addEventListener('blur',blur);
    document.addEventListener('visibilitychange',visibility);
    const dispose=()=>{disposed=true;stop();board.removeEventListener('pointermove',hover);board.removeEventListener('pointerleave',leave);window.removeEventListener('resize',invalidate);window.removeEventListener('scroll',invalidate,true);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility)};
    return {refresh,clearPreview,dispose};
  }
  window.BlockPlacement={preview,mount};
})();
