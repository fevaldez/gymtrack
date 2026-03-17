import { useState } from "react";
import { T, BB, DM, DS } from '../data/theme.js';

export function SwapDrawer({ex,sessionSwaps,setSessionSwaps,onClose}) {
  const active=sessionSwaps[ex.id];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:100,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div style={{background:T.s1,borderRadius:"20px 20px 0 0",padding:"24px 20px 48px",width:"100%",border:`1px solid ${T.bd}`}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <div style={{...BB,fontSize:28}}>Alternativas</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.t3,fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{...DS,color:T.t3,fontSize:12,marginBottom:20}}>En lugar de: {ex.nombre}</div>
        {active&&(
          <div onClick={()=>{setSessionSwaps(p=>{const n={...p};delete n[ex.id];return n;});onClose();}}
            style={{background:`${T.acc}11`,border:`1px solid ${T.acc}33`,borderRadius:12,padding:"12px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}>
            <span style={{color:T.acc,...BB,fontSize:18}}>↩</span>
            <span style={{...DS,color:T.acc,fontSize:14}}>Restaurar original</span>
          </div>
        )}
        {!ex.swaps||ex.swaps.length===0
          ?<div style={{...DS,color:T.t3,textAlign:"center",marginTop:12}}>Sin alternativas</div>
          :ex.swaps.map((s,i)=>(
            <div key={i} onClick={()=>{setSessionSwaps(p=>({...p,[ex.id]:s}));onClose();}}
              style={{background:active===s?`${T.acc}18`:T.s2,border:`1px solid ${active===s?T.acc:T.bd}`,borderRadius:12,padding:"14px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}>
              <span style={{color:T.acc,...BB,fontSize:20}}>↪</span>
              <span style={{...DS,color:T.t1,fontSize:15}}>{s}</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}

export function PlanView({plan,idx,setPlan,midSkip,setMidSkip,sessionSwaps,setSessionSwaps,routine,onClose}) {
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [swapTarget, setSwapTarget] = useState(null);

  const upcomingSteps = plan.slice(idx + 1);

  function buildGroups(steps) {
    const seen = new Map();
    const order = [];
    for (const step of steps) {
      if (!seen.has(step.ex.id)) {
        seen.set(step.ex.id, []);
        order.push(step.ex.id);
      }
      seen.get(step.ex.id).push(step);
    }
    return order.map(id => seen.get(id));
  }

  const groups = buildGroups(upcomingSteps);

  function areAdjacentBiserie(i) {
    if (i >= groups.length - 1) return false;
    const a = groups[i][0], b = groups[i+1][0];
    return a.biserie && b.biserie && a.blk.id === b.blk.id;
  }

  function doReorder(fromIdx, toIdx) {
    setDragIdx(null);
    setDragOverIdx(null);
    if (fromIdx === toIdx) return;
    const newGroups = [...groups];
    const [moved] = newGroups.splice(fromIdx, 1);
    newGroups.splice(toIdx, 0, moved);
    setPlan([
      ...plan.slice(0, idx + 1),
      ...newGroups.flat(),
    ]);
  }

  function breakBiserie(exId1, exId2) {
    setPlan(prev => prev.map((step, i) => {
      if (i <= idx) return step;
      if (step.ex.id === exId1 || step.ex.id === exId2) {
        return { ...step, biserie: false, paired: null, rest: step.blk.rest };
      }
      return step;
    }));
  }

  function createLink(exId1, exId2) {
    const g1 = groups.find(g => g[0].ex.id === exId1);
    const g2 = groups.find(g => g[0].ex.id === exId2);
    if (!g1 || !g2) return;
    const name1 = g1[0].ex.nombre;
    const name2 = g2[0].ex.nombre;
    const pairRest = Math.max(g1[0].blk.rest||0, g2[0].blk.rest||0);
    setPlan(prev => prev.map((step, i) => {
      if (i <= idx) return step;
      if (step.ex.id === exId1)
        return { ...step, biserie: true, paired: name2, rest: 0 };
      if (step.ex.id === exId2)
        return { ...step, biserie: true, paired: name1, rest: pairRest };
      return step;
    }));
  }

  function toggleSkip(exId) {
    setMidSkip(prev => {
      const n = new Set(prev);
      n.has(exId) ? n.delete(exId) : n.add(exId);
      return n;
    });
  }

  const doneSec = [...new Map(plan.slice(0,idx).map(s=>[s.ex.id,s])).values()];
  const currStep = plan[idx];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:150,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div style={{background:T.s1,borderRadius:"20px 20px 0 0",padding:"20px 16px 48px",width:"100%",maxWidth:480,margin:"0 auto",border:`1px solid ${T.bd}`,maxHeight:"85vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{...BB,fontSize:24}}>PLAN DE SESIÓN</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.t3,fontSize:20,cursor:"pointer"}}>✕</button>
        </div>

        <div style={{overflowY:"auto",flex:1}}>

          {doneSec.length > 0 && (
            <div style={{marginBottom:14}}>
              <div style={{...DM,fontSize:10,letterSpacing:2,color:T.t2,marginBottom:6}}>COMPLETADOS</div>
              {doneSec.map(step => (
                <div key={step.ex.id} style={{background:T.s2,border:`1px solid ${T.bd}`,borderRadius:12,padding:"10px 14px",marginBottom:6,opacity:0.4}}>
                  <div style={{...BB,fontSize:16,color:T.t1}}>{sessionSwaps[step.ex.id]||step.ex.nombre}</div>
                </div>
              ))}
            </div>
          )}

          {currStep && (
            <div style={{marginBottom:14}}>
              <div style={{...DM,fontSize:10,letterSpacing:2,color:T.t2,marginBottom:6}}>ACTUAL</div>
              <div style={{background:`${routine.clr}12`,border:`1px solid ${routine.clr}`,borderLeft:`3px solid ${routine.clr}`,borderRadius:12,padding:"12px 14px",marginBottom:6}}>
                <div style={{...BB,fontSize:20,color:routine.clr}}>{sessionSwaps[currStep.ex.id]||currStep.ex.nombre}</div>
                <div style={{...DM,fontSize:11,color:T.t2,marginTop:3}}>{currStep.ex.s}s · {currStep.ex.rMin}–{currStep.ex.rMax} · {currStep.ex.tempo}</div>
              </div>
            </div>
          )}

          {groups.length > 0 && (
            <div style={{marginBottom:14}}>
              <div style={{...DM,fontSize:10,letterSpacing:2,color:T.t2,marginBottom:6}}>PRÓXIMOS</div>
              {groups.map((group, i) => {
                const ex = group[0].ex;
                const isSkipped = midSkip.has(ex.id);
                const displayName = sessionSwaps[ex.id] || ex.nombre;
                const hasSwaps = Array.isArray(ex.swaps) && ex.swaps.length > 0;
                const isDragging = dragIdx === i;
                const isDragOver = dragOverIdx === i && dragIdx !== null && dragIdx !== i;

                // Derive biserie state from current adjacency — never from stale flags
                const isFirstOfPair = areAdjacentBiserie(i);
                const isSecondOfPair = i > 0 && areAdjacentBiserie(i - 1);
                const inBiserie = isFirstOfPair || isSecondOfPair;

                const showBreakBtn = isFirstOfPair;
                const showLinkBtn = !showBreakBtn
                  && i < groups.length - 1
                  && !isSkipped
                  && !midSkip.has(groups[i+1][0].ex.id)
                  && !groups[i][0].biserie
                  && !groups[i+1][0].biserie;

                const partnerName = isFirstOfPair
                  ? (sessionSwaps[groups[i+1][0].ex.id] || groups[i+1][0].ex.nombre)
                  : isSecondOfPair
                  ? (sessionSwaps[groups[i-1][0].ex.id] || groups[i-1][0].ex.nombre)
                  : null;

                return (
                  <div key={ex.id}>
                    {isDragOver && (
                      <div style={{height:2,background:routine.clr,borderRadius:1,marginBottom:4}}/>
                    )}

                    <div
                      data-group-index={i}
                      style={{
                        background:T.s2,
                        border:`1px solid ${T.bd}`,
                        borderLeft: inBiserie && !isSkipped
                          ? `3px solid ${routine.clr}`
                          : `1px solid ${T.bd}`,
                        borderRadius:12,
                        padding:"12px 14px",
                        marginBottom:(showBreakBtn||showLinkBtn) ? 0 : 6,
                        opacity: isDragging ? 0.4 : isSkipped ? 0.35 : 1,
                        display:"flex",alignItems:"center",gap:8,
                      }}>

                      <div
                        style={{color:T.t3,fontSize:20,flexShrink:0,width:28,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center",cursor:"grab",touchAction:"none",userSelect:"none"}}
                        onTouchStart={e=>{e.stopPropagation();setDragIdx(i);}}
                        onTouchMove={e=>{
                          e.preventDefault();
                          const touch=e.touches[0];
                          const el=document.elementFromPoint(touch.clientX,touch.clientY);
                          const raw=el?.closest('[data-group-index]')?.getAttribute('data-group-index');
                          if(raw!=null) setDragOverIdx(Number(raw));
                        }}
                        onTouchEnd={()=>{
                          if(dragIdx!==null && dragOverIdx!==null && dragIdx!==dragOverIdx){
                            doReorder(dragIdx,dragOverIdx);
                          } else {
                            setDragIdx(null);
                            setDragOverIdx(null);
                          }
                        }}
                      >≡</div>

                      <div style={{flex:1,minWidth:0}}>
                        <div style={{...BB,fontSize:17,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{displayName}</div>
                        <div style={{...DM,fontSize:11,color:T.t2,marginTop:2}}>
                          {group.length}s · {ex.rMin}–{ex.rMax} reps · {ex.tempo}{ex.rir!==null?` · RIR ${ex.rir}`:""}
                        </div>
                        {inBiserie && !isSkipped && partnerName && (
                          <div style={{...DM,fontSize:10,color:routine.clr,marginTop:2}}>biserie → {partnerName}</div>
                        )}
                      </div>

                      <div style={{display:"flex",gap:6,flexShrink:0}}>
                        {hasSwaps && (
                          <button onClick={()=>setSwapTarget(ex)} style={{background:"none",border:`1px solid ${T.bd}`,borderRadius:8,color:T.t2,...DM,fontSize:11,padding:"6px 10px",cursor:"pointer"}}>Alt</button>
                        )}
                        <button onClick={()=>toggleSkip(ex.id)} style={{background:isSkipped?`${T.acc}18`:"none",border:`1px solid ${isSkipped?T.acc:T.bd}`,borderRadius:8,color:isSkipped?T.acc:T.t2,...DM,fontSize:11,padding:"6px 10px",cursor:"pointer"}}>
                          {isSkipped?"✓ skip":"skip"}
                        </button>
                      </div>
                    </div>

                    {showBreakBtn && (
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,marginBottom:6}}>
                        <button onClick={()=>breakBiserie(ex.id,groups[i+1][0].ex.id)} style={{background:"none",border:`1px solid ${T.bd}`,borderRadius:6,color:T.t3,...DM,fontSize:11,letterSpacing:"0.06em",padding:"4px 12px",cursor:"pointer"}}>✕ biserie</button>
                        <div style={{...DM,fontSize:9,color:T.t3,opacity:0.5}}>permanente · mover separa temporalmente</div>
                      </div>
                    )}

                    {showLinkBtn && (
                      <div style={{display:"flex",justifyContent:"center",alignItems:"center",height:28,marginBottom:6}}>
                        <button onClick={()=>createLink(ex.id,groups[i+1][0].ex.id)} style={{background:"none",border:"none",color:routine.clr,fontSize:20,cursor:"pointer",padding:"0 16px",opacity:0.8}}>⇄</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {swapTarget && (
        <SwapDrawer ex={swapTarget} sessionSwaps={sessionSwaps} setSessionSwaps={setSessionSwaps} onClose={()=>setSwapTarget(null)}/>
      )}
    </div>
  );
}