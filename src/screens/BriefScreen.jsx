import { T, BB, DM, DS } from '../data/theme.js';
import { buildPlan } from '../logic/buildPlan.js';
import { getSuggestedWeight } from '../logic/insights.js';
import { getExerciseNames } from '../logic/history.js';

export function BriefScreen({ routine, ctx, sessionSkip, setSessionSkip, sessionOverride, setSessionOverride, sessionLinks, setSessionLinks, linkingFrom, setLinkingFrom, gd, onStart, onBack }) {
  const plan = buildPlan(routine, ctx, sessionSkip, sessionOverride, sessionLinks);
  const exCount = [...new Set(plan.map(s => s.ex.id))].length;
  const estMin = Math.round(plan.reduce((a, s) => a + s.rest, 0) / 60) + Math.round(plan.length * 0.75);

  const bloques = [];
  for (const blk of routine.bloques) {
    if (ctx.tiempo !== "completo" && routine.cutTime?.[ctx.tiempo]?.includes(blk.id)) continue;
    if (ctx.bjj && routine.bjjCut?.includes(blk.id)) continue;
    bloques.push({ blk, exs: blk.ejercicios });
  }

  function toggleSkip(id) {
    setSessionSkip(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function adjustSeries(exId, delta, currentS) {
    const newVal = Math.max(1, Math.min(6, (sessionOverride[exId] ?? currentS) + delta));
    setSessionOverride(prev => ({ ...prev, [exId]: newVal }));
  }

  function toggleLink(exId) {
    if (linkingFrom === null) { setLinkingFrom(exId); return; }
    if (linkingFrom === exId) { setLinkingFrom(null); return; }
    setSessionLinks(prev => {
      const filtered = prev.filter(([a, b]) => a !== exId && b !== exId && a !== linkingFrom && b !== linkingFrom);
      return [...filtered, [linkingFrom, exId]];
    });
    setLinkingFrom(null);
  }

  function unlinkExercise(exId) {
    setSessionLinks(prev => prev.filter(([a, b]) => a !== exId && b !== exId));
  }

  function isLinked(exId) { return sessionLinks.some(([a, b]) => a === exId || b === exId); }

  function getLinkedPartner(exId) {
    const names = getExerciseNames();
    const pair = sessionLinks.find(([a, b]) => a === exId || b === exId);
    if (!pair) return null;
    const partnerId = pair[0] === exId ? pair[1] : pair[0];
    return names[partnerId] || partnerId;
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.t1, ...DS, maxWidth: 480, margin: "0 auto", paddingBottom: 100 }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 200, background: `radial-gradient(ellipse at top, ${routine.clr}14, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />

      <div style={{ padding: "20px 18px 14px", borderBottom: `1px solid ${T.bd}`, background: `${T.bg}F0`, position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(12px)" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.t3, fontSize: 13, cursor: "pointer", marginBottom: 10, ...DS }}>← Contexto</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ ...BB, fontSize: 36, color: routine.clr, lineHeight: 1 }}>{routine.label}</div>
            <div style={{ ...DS, color: T.t3, fontSize: 12, marginTop: 2 }}>SESIÓN DE HOY</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ ...BB, fontSize: 28, color: T.t1 }}>~{estMin} min</div>
            <div style={{ ...DM, color: T.t3, fontSize: 10 }}>{plan.length} sets · {exCount} ejercicios</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 14px 0", position: "relative", zIndex: 1 }}>
        {sessionSkip.size > 0 && (
          <div style={{ background: `${T.acc}11`, border: `1px solid ${T.acc}33`, borderRadius: 10, padding: "8px 14px", marginBottom: 10, ...DS, fontSize: 12, color: T.acc }}>
            {sessionSkip.size} ejercicio{sessionSkip.size > 1 ? "s" : ""} excluido{sessionSkip.size > 1 ? "s" : ""} · toca para restaurar
          </div>
        )}
        {linkingFrom !== null && (
          <div style={{ background: `${T.acc}14`, border: `1px solid ${T.acc}44`, borderRadius: 10, padding: "8px 14px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ ...DS, fontSize: 12, color: T.acc }}>Toca ⇄ en otro ejercicio para combinar como biserie</span>
            <button onClick={() => setLinkingFrom(null)} style={{ background: "none", border: "none", color: T.t3, fontSize: 16, cursor: "pointer", padding: "0 4px" }}>✕</button>
          </div>
        )}

        {bloques.map(({ blk, exs }) => (
          <div key={blk.id} style={{ marginBottom: 10 }}>
            <div style={{ ...DM, fontSize: 9, letterSpacing: 2, color: T.t3, marginBottom: 6, paddingLeft: 4 }}>
              {blk.label.toUpperCase()}
              {blk.tipo === "biserie" && (
                <span style={{ marginLeft: 8, background: `${routine.clr}22`, color: routine.clr, border: `1px solid ${routine.clr}44`, borderRadius: 4, padding: "1px 7px", fontSize: 8 }}>BISERIE</span>
              )}
            </div>

            <div style={{ background: T.s1, border: `1px solid ${T.bd}`, borderRadius: 16, overflow: "hidden" }}>
              {exs.map((ex, i) => {
                const isSkipped = sessionSkip.has(ex.id);
                const currentS = sessionOverride[ex.id] ?? ex.s;
                const isBiserie = blk.tipo === "biserie";
                const isLastInBlk = i === exs.length - 1;
                const linked = isLinked(ex.id);
                const partner = getLinkedPartner(ex.id);
                const isLinking = linkingFrom === ex.id;
                const linkBtnClr = isLinking ? T.acc : linked ? routine.clr : T.t3;

                return (
                  <div key={ex.id} style={{
                    padding: "12px 14px",
                    borderBottom: isLastInBlk ? "none" : `1px solid ${T.bd}`,
                    borderLeft: (isBiserie || linked) ? `3px solid ${isSkipped ? T.bd : routine.clr}` : "none",
                    opacity: isSkipped ? 0.4 : 1,
                    transition: "opacity 0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}>
                    <button onClick={() => toggleSkip(ex.id)} style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: isSkipped ? T.s2 : `${routine.clr}22`,
                      border: `1px solid ${isSkipped ? T.bd : routine.clr}`,
                      color: isSkipped ? T.t3 : routine.clr,
                      fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isSkipped ? "+" : "✓"}
                    </button>

                    <button onClick={() => linked ? unlinkExercise(ex.id) : toggleLink(ex.id)} style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: isLinking ? `${T.acc}22` : linked ? `${routine.clr}22` : T.s2,
                      border: `1px solid ${isLinking ? T.acc : linked ? routine.clr : T.bd}`,
                      color: linkBtnClr,
                      fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>⇄</button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                        <div style={{ ...BB, fontSize: 18, lineHeight: 1.1, color: isSkipped ? T.t3 : T.t1 }}>{ex.nombre}</div>
                        {!ex.noLog && (()=>{const sug=getSuggestedWeight(ex.id,gd);return sug?.isSuggested&&<span style={{...DM,fontSize:9,color:"#000",background:T.grn,borderRadius:4,padding:"2px 6px"}}>+{sug.increment} lbs</span>;})()}
                      </div>
                      {linked && partner && (
                        <div style={{ ...DM, fontSize: 9, color: routine.clr, marginTop: 2 }}>⇄ BISERIE con {partner}</div>
                      )}
                      <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                        {[
                          `${ex.rMin}–${ex.rMax}${ex.perSide ? "/l" : ""} reps`,
                          ex.tempo,
                          ex.rir !== null ? `RIR ${ex.rir}` : null,
                        ].filter(Boolean).map((tag, j) => (
                          <span key={j} style={{ ...DM, fontSize: 10, color: T.t3 }}>{tag}</span>
                        ))}
                      </div>
                    </div>

                    {!isSkipped && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => adjustSeries(ex.id, -1, ex.s)} style={{
                          width: 28, height: 28, borderRadius: 7, background: T.s2, border: `1px solid ${T.bd}`,
                          color: T.red, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        }}>−</button>
                        <div style={{ ...BB, fontSize: 22, color: T.t1, minWidth: 24, textAlign: "center" }}>{currentS}</div>
                        <button onClick={() => adjustSeries(ex.id, 1, ex.s)} style={{
                          width: 28, height: 28, borderRadius: 7, background: T.s2, border: `1px solid ${T.bd}`,
                          color: T.grn, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        }}>+</button>
                        <div style={{ ...DM, fontSize: 9, color: T.t3, marginLeft: 2 }}>series</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {blk.rest > 0 && (
              <div style={{ ...DM, fontSize: 9, color: T.t3, textAlign: "right", marginTop: 4, paddingRight: 4 }}>
                descanso {blk.rest}s{blk.tipo === "biserie" ? " · tras el par" : ""}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, padding: "16px 14px 32px", background: `linear-gradient(transparent, ${T.bg} 40%)`, zIndex: 20 }}>
        <button onClick={onStart} style={{
          width: "100%", background: routine.clr, color: "#000", border: "none",
          borderRadius: 16, padding: "18px", ...BB, fontSize: 24, letterSpacing: 1, cursor: "pointer",
        }}>
          EMPEZAR SESIÓN ({plan.length} sets) →
        </button>
      </div>
    </div>
  );
}
