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

export function PlanView({ plan, idx, setPlan, midSkip, setMidSkip, sessionSwaps, setSessionSwaps, routine, onClose }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [swapTarget, setSwapTarget] = useState(null);

  function buildGroups(steps) {
    const groups = [];
    let i = 0;
    while (i < steps.length) {
      const exId = steps[i].ex.id;
      const group = [];
      while (i < steps.length && steps[i].ex.id === exId) {
        group.push(steps[i]);
        i++;
      }
      groups.push(group);
    }
    return groups;
  }

  const upcomingSteps = plan.slice(idx + 1);
  const groups = buildGroups(upcomingSteps);

  function doReorder(fromIdx, toIdx) {
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

  function areAdjacentBiserie(i) {
    if (i >= groups.length - 1) return false;
    const a = groups[i][0], b = groups[i + 1][0];
    return a.biserie && b.biserie && a.blk.id === b.blk.id;
  }

  function toggleSkip(exId) {
    if (midSkip.has(exId)) { setMidSkip(prev => { const n = new Set(prev); n.delete(exId); return n; }); }
    else { setMidSkip(prev => new Set([...prev, exId])); }
  }

  const doneExs = [...new Map(plan.slice(0, idx).map(s => [s.ex.id, s])).values()];
  const currentStep = plan[idx];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 150, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div style={{ background: T.s1, borderRadius: "20px 20px 0 0", padding: "20px 16px 48px", width: "100%", maxWidth: 480, margin: "0 auto", border: `1px solid ${T.bd}`, maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ ...BB, fontSize: 24 }}>PLAN DE SESIÓN</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.t3, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>

          {/* COMPLETADOS */}
          {doneExs.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ ...DM, fontSize: 10, letterSpacing: 2, color: T.t2, marginBottom: 6 }}>COMPLETADOS</div>
              {doneExs.map(step => {
                const ex = step.ex;
                return (
                  <div key={ex.id} style={{ background: T.s2, border: `1px solid ${T.bd}`, borderRadius: 12, padding: "12px 14px", marginBottom: 6, opacity: 0.45 }}>
                    <div style={{ ...BB, fontSize: 18, color: T.t1, lineHeight: 1.1 }}>{sessionSwaps[ex.id] || ex.nombre}</div>
                    <div style={{ ...DM, fontSize: 12, color: T.t2, marginTop: 3 }}>{ex.s}s · {ex.rMin}–{ex.rMax} · {ex.tempo}{ex.rir !== null ? ` · RIR ${ex.rir}` : ""}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ACTUAL */}
          {currentStep && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ ...DM, fontSize: 10, letterSpacing: 2, color: T.t2, marginBottom: 6 }}>ACTUAL</div>
              <div style={{ background: `${routine.clr}12`, border: `1px solid ${routine.clr}`, borderLeft: `3px solid ${routine.clr}`, borderRadius: 12, padding: "12px 14px", marginBottom: 6 }}>
                <div style={{ ...BB, fontSize: 22, color: routine.clr, lineHeight: 1.1 }}>{sessionSwaps[currentStep.ex.id] || currentStep.ex.nombre}</div>
                {sessionSwaps[currentStep.ex.id] && <div style={{ ...DM, fontSize: 10, color: T.acc, marginTop: 2 }}>alternativa</div>}
                <div style={{ ...DM, fontSize: 12, color: T.t2, marginTop: 3 }}>{currentStep.ex.s}s · {currentStep.ex.rMin}–{currentStep.ex.rMax} · {currentStep.ex.tempo}{currentStep.ex.rir !== null ? ` · RIR ${currentStep.ex.rir}` : ""}</div>
              </div>
            </div>
          )}

          {/* PRÓXIMOS */}
          {groups.length > 0 && (
            <div>
              <div style={{ ...DM, fontSize: 10, letterSpacing: 2, color: T.t2, marginBottom: 6 }}>PRÓXIMOS</div>
              {groups.map((group, i) => {
                const ex = group[0].ex;
                const isSkipped = midSkip.has(ex.id);
                const displayName = sessionSwaps[ex.id] || ex.nombre;
                const inBiserie = group[0].biserie;
                const isDragging = dragIdx === i;
                const isDragOver = dragOverIdx === i && dragIdx !== null && dragIdx !== i;
                const showBreakBtn = areAdjacentBiserie(i);
                return (
                  <div key={ex.id}>
                    {isDragOver && (
                      <div style={{ height: 2, background: routine.clr, borderRadius: 1, marginBottom: 4, transition: "opacity 0.15s" }} />
                    )}
                    <div
                      data-group-index={i}
                      style={{
                        background: T.s2,
                        border: `1px solid ${T.bd}`,
                        borderLeft: inBiserie && !isSkipped ? `3px solid ${routine.clr}` : undefined,
                        borderRadius: 12,
                        marginBottom: showBreakBtn ? 0 : 6,
                        padding: "12px 14px",
                        opacity: isDragging ? 0.4 : isSkipped ? 0.35 : 1,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                      }}>
                      {/* Drag handle */}
                      <div
                        style={{ color: T.t3, fontSize: 20, flexShrink: 0, width: 28, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab", touchAction: "none", userSelect: "none" }}
                        onTouchStart={e => { e.stopPropagation(); setDragIdx(i); }}
                        onTouchMove={e => {
                          e.preventDefault();
                          const touch = e.touches[0];
                          const el = document.elementFromPoint(touch.clientX, touch.clientY);
                          const raw = el?.closest('[data-group-index]')?.getAttribute('data-group-index');
                          if (raw !== null && raw !== undefined) setDragOverIdx(Number(raw));
                        }}
                        onTouchEnd={() => {
                          if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
                            doReorder(dragIdx, dragOverIdx);
                          }
                          setDragIdx(null);
                          setDragOverIdx(null);
                        }}
                      >≡</div>
                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...BB, fontSize: 18, color: isSkipped ? T.t3 : T.t1, lineHeight: 1.1 }}>{displayName}</div>
                        {!!sessionSwaps[ex.id] && <div style={{ ...DM, fontSize: 10, color: T.acc, marginTop: 2 }}>alternativa</div>}
                        <div style={{ ...DM, fontSize: 12, color: T.t2, marginTop: 3 }}>{group.length}s · {ex.rMin}–{ex.rMax} · {ex.tempo}{ex.rir !== null ? ` · RIR ${ex.rir}` : ""}</div>
                      </div>
                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {ex.swaps?.length > 0 && (
                          <button onClick={() => setSwapTarget(ex)} style={{ background: "none", border: `1px solid ${T.bd}`, borderRadius: 8, color: T.t2, fontSize: 12, padding: "6px 10px", cursor: "pointer", ...DM }}>Alt →</button>
                        )}
                        <button onClick={() => toggleSkip(ex.id)} style={{ background: isSkipped ? T.s1 : "none", border: `1px solid ${isSkipped ? T.acc : T.bd}`, borderRadius: 8, color: isSkipped ? T.acc : T.t2, fontSize: 12, padding: "6px 10px", cursor: "pointer", ...DM }}>
                          {isSkipped ? "✓ skip" : "skip"}
                        </button>
                      </div>
                    </div>
                    {/* ✕ biserie between active adjacent pairs */}
                    {showBreakBtn && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, marginBottom: 6 }}>
                        <button onClick={() => breakBiserie(group[0].ex.id, groups[i + 1][0].ex.id)} style={{
                          background: "none", border: `1px solid ${T.bd}`, borderRadius: 6,
                          color: T.t3, ...DM, fontSize: 11, letterSpacing: "0.06em",
                          padding: "4px 12px", cursor: "pointer",
                        }}>✕ biserie</button>
                        <div style={{ ...DM, fontSize: 9, color: T.t3, opacity: 0.5 }}>
                          permanente · mover separa temporalmente
                        </div>
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
        <SwapDrawer ex={swapTarget} sessionSwaps={sessionSwaps} setSessionSwaps={setSessionSwaps} onClose={() => setSwapTarget(null)} />
      )}
    </div>
  );
}
