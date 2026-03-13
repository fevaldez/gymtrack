import { useState, useMemo } from "react";
import { T, BB, DM, DS } from '../data/theme.js';
import { buildPlan } from '../logic/buildPlan.js';
import { getSuggestedWeight } from '../logic/insights.js';

export function BriefScreen({
  routine, ctx,
  sessionSkip, setSessionSkip,
  sessionOverride, setSessionOverride,
  sessionLinks, setSessionLinks,
  brokenLinks, setBrokenLinks,
  sessionSwaps, setSessionSwaps,
  sessionOrder, setSessionOrder,
  sessionOverrideReps, setSessionOverrideReps,
  gd, onStart, onBack
}) {
  const [editMode, setEditMode] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [swapTarget, setSwapTarget] = useState(null);

  const plan = buildPlan(routine, ctx, sessionSkip, sessionOverride, sessionLinks);
  const exCount = [...new Set(plan.map(s => s.ex.id))].length;
  const estMin = Math.round(plan.reduce((a, s) => a + s.rest, 0) / 60) + Math.round(plan.length * 0.75);

  // Build visible exercises list from routine schema
  const allVisibleExs = useMemo(() => {
    const result = [];
    for (const blk of routine.bloques) {
      if (ctx.tiempo !== "completo" && routine.cutTime?.[ctx.tiempo]?.includes(blk.id)) continue;
      if (ctx.bjj && routine.bjjCut?.includes(blk.id)) continue;
      for (const ex of blk.ejercicios) result.push({ ex, blk });
    }
    return result;
  }, [routine, ctx]);

  // Apply user-specified order on top of schema order
  const displayExs = useMemo(() => {
    if (!sessionOrder.length) return allVisibleExs;
    return [
      ...sessionOrder.map(id => allVisibleExs.find(item => item.ex.id === id)).filter(Boolean),
      ...allVisibleExs.filter(item => !sessionOrder.includes(item.ex.id)),
    ];
  }, [allVisibleExs, sessionOrder]);

  // ─── SINGLE SOURCE OF TRUTH FOR BISERIE STATE ───────────────────────────────
  // activePairs: Set of "idA|idB" (sorted) representing currently active pairs.
  // Built from two sources, then filtered by current adjacency.
  const activePairs = useMemo(() => {
    const pairs = new Set();

    // FUENTE 1: schema biseries from plan steps — skip explicitly broken pairs.
    for (let i = 0; i < plan.length - 1; i++) {
      const curr = plan[i], next = plan[i + 1];
      if (curr.biserie && next.biserie && curr.blk.id === next.blk.id && curr.ex.id !== next.ex.id) {
        const key = [curr.ex.id, next.ex.id].sort().join('|');
        if (!brokenLinks.has(key)) pairs.add(key);
      }
    }

    // FUENTE 2: user-created ad-hoc biseries (cross-block, different blk.id).
    for (const [id1, id2] of sessionLinks) {
      pairs.add([id1, id2].sort().join('|'));
    }

    // Current display order — used to validate adjacency.
    // If sessionOrder is set use it; otherwise derive from plan (deduped).
    const orderedIds = sessionOrder.length > 0
      ? sessionOrder
      : (() => {
          const seen = new Set(), ids = [];
          for (const step of plan) {
            if (!seen.has(step.ex.id)) { seen.add(step.ex.id); ids.push(step.ex.id); }
          }
          return ids;
        })();

    // Remove any pair whose exercises are not currently adjacent.
    // This is what implicitly "breaks" a biserie when the user reorders.
    for (const key of [...pairs]) {
      const [id1, id2] = key.split('|');
      const i1 = orderedIds.indexOf(id1), i2 = orderedIds.indexOf(id2);
      if (i1 === -1 || i2 === -1 || Math.abs(i1 - i2) !== 1) pairs.delete(key);
    }

    // Remove any pair where either exercise is skipped.
    // A skipped exercise cannot be part of an active biserie.
    for (const key of [...pairs]) {
      const [id1, id2] = key.split('|');
      if (sessionSkip.has(id1) || sessionSkip.has(id2)) pairs.delete(key);
    }

    return pairs;
  }, [plan, sessionLinks, sessionOrder, brokenLinks, sessionSkip]);

  function hasBiseriePartner(exId) {
    for (const pair of activePairs) {
      if (pair.split('|').includes(exId)) return true;
    }
    return false;
  }

  function areBiseriePartners(id1, id2) {
    return activePairs.has([id1, id2].sort().join('|'));
  }
  // ────────────────────────────────────────────────────────────────────────────

  function toggleSkip(id) {
    setSessionSkip(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function adjustSeries(exId, delta, currentS) {
    setSessionOverride(prev => ({ ...prev, [exId]: Math.max(1, Math.min(6, (prev[exId] ?? currentS) + delta)) }));
  }

  function adjustReps(exId, ex, delta) {
    const cur = sessionOverrideReps[exId] ?? { rMin: ex.rMin, rMax: ex.rMax };
    setSessionOverrideReps(prev => ({ ...prev, [exId]: { rMin: Math.max(1, cur.rMin + delta), rMax: Math.max(1, cur.rMax + delta) } }));
  }

  function doReorder(fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    const newOrder = displayExs.map(item => item.ex.id);
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    // Only update order — activePairs adjacency check handles biserie breakage implicitly.
    // sessionLinks is NOT pruned here; pairs become inactive automatically when non-adjacent.
    setSessionOrder(newOrder);
  }

  function createLink(id1, id2) {
    setSessionLinks(prev => {
      const f = prev.filter(([a, b]) => a !== id1 && b !== id1 && a !== id2 && b !== id2);
      return [...f, [id1, id2]];
    });
  }

  function breakLink(id1, id2) {
    const key = [id1, id2].sort().join('|');
    setBrokenLinks(prev => new Set([...prev, key]));
    setSessionLinks(prev => prev.filter(([a, b]) => [a, b].sort().join('|') !== key));
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.t1, ...DS, maxWidth: 480, margin: "0 auto" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 200, background: `radial-gradient(ellipse at top, ${routine.clr}14, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />

      {/* Sticky header */}
      <div style={{ padding: "20px 18px 14px", borderBottom: `1px solid ${T.bd}`, background: `${T.bg}F0`, position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(12px)" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.t3, fontSize: 13, cursor: "pointer", marginBottom: 10, ...DS }}>← Contexto</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ ...BB, fontSize: 36, color: routine.clr, lineHeight: 1 }}>{routine.label}</div>
            <div style={{ ...DS, color: T.t3, fontSize: 12, marginTop: 2 }}>SESIÓN DE HOY</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ ...BB, fontSize: 28, color: T.t1 }}>~{estMin} min</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
              <div style={{ ...DM, color: T.t2, fontSize: 11 }}>{plan.length} sets · {exCount} ejercicios</div>
              <button onClick={() => setEditMode(e => !e)} style={{ background: "none", border: "none", color: routine.clr, ...DM, fontSize: 12, cursor: "pointer", padding: "2px 0" }}>
                {editMode ? "Listo" : "Editar"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Exercise list */}
      <div style={{ padding: "12px 14px 0", position: "relative", zIndex: 1 }}>
        {sessionSkip.size > 0 && (
          <div style={{ background: `${T.acc}11`, border: `1px solid ${T.acc}33`, borderRadius: 10, padding: "8px 14px", marginBottom: 10, ...DS, fontSize: 12, color: T.acc }}>
            {sessionSkip.size} ejercicio{sessionSkip.size > 1 ? "s" : ""} excluido{sessionSkip.size > 1 ? "s" : ""} · toca ✓ para restaurar
          </div>
        )}

        {displayExs.map(({ ex, blk }, i) => {
          const isSkipped = sessionSkip.has(ex.id);
          const currentS = sessionOverride[ex.id] ?? ex.s;
          const curReps = sessionOverrideReps[ex.id] ?? { rMin: ex.rMin, rMax: ex.rMax };

          // All biserie state comes exclusively from activePairs
          const inBiserie = hasBiseriePartner(ex.id);
          const nextEx = displayExs[i + 1]?.ex;
          const prevEx = displayExs[i - 1]?.ex;
          const isFirstOfPair = nextEx ? areBiseriePartners(ex.id, nextEx.id) : false;
          const isSecondOfPair = prevEx ? areBiseriePartners(ex.id, prevEx.id) : false;

          const isDragging = dragIdx === i;
          const isDragOver = dragOverIdx === i && dragIdx !== null && dragIdx !== i;
          const isSwapped = !!sessionSwaps[ex.id];
          const displayName = sessionSwaps[ex.id] || ex.nombre;
          const hasSwaps = Array.isArray(ex.swaps) && ex.swaps.length > 0;

          const seenBlkIds = new Set(
            displayExs.slice(0, i).map(item => item.blk.id)
          );
          const showBlkHeader = !seenBlkIds.has(blk.id);
          const nextSameBlk = i + 1 < displayExs.length && displayExs[i + 1].blk.id === blk.id;

          // ✕ biserie — shown between two currently active biserie partners in edit mode
          const showBreakBtn = editMode
            && i < displayExs.length - 1
            && areBiseriePartners(ex.id, displayExs[i + 1].ex.id);

          // ⇄ shown between any two adjacent exercises without an active biserie in edit mode
          const showLinkBtn = editMode
            && !showBreakBtn
            && i < displayExs.length - 1
            && !isSkipped
            && !sessionSkip.has(displayExs[i + 1].ex.id)
            && !hasBiseriePartner(ex.id)
            && !hasBiseriePartner(displayExs[i + 1].ex.id);

          return (
            <div key={ex.id}>
              {/* Bloque header */}
              {showBlkHeader && (
                <div style={{ ...DM, fontSize: 11, letterSpacing: 2, color: T.t2, marginBottom: 6, paddingLeft: 4, marginTop: i > 0 ? 10 : 0 }}>
                  {blk.label.toUpperCase()}
                  {isFirstOfPair && (
                    <span style={{ marginLeft: 8, background: `${routine.clr}22`, color: routine.clr, border: `1px solid ${routine.clr}44`, borderRadius: 4, padding: "1px 7px", fontSize: 10 }}>BISERIE</span>
                  )}
                </div>
              )}

              {/* Drop indicator line */}
              {isDragOver && (
                <div style={{ height: 2, background: routine.clr, borderRadius: 1, marginBottom: 4, transition: "opacity 0.15s" }} />
              )}

              {/* Exercise card */}
              <div
                data-exercise-index={i}
                style={{
                  background: T.s1,
                  border: `1px solid ${T.bd}`,
                  borderLeft: inBiserie && !isSkipped ? `3px solid ${routine.clr}` : undefined,
                  borderRadius: 12,
                  marginBottom: (showBreakBtn || showLinkBtn) ? 0 : 8,
                  padding: "12px 14px",
                  opacity: isDragging ? 0.4 : isSkipped ? 0.4 : 1,
                  transition: "opacity 0.2s",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}>

                {/* Drag handle — touch events only */}
                {editMode && (
                  <div
                    style={{ color: T.t3, fontSize: 20, flexShrink: 0, width: 28, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab", touchAction: "none", userSelect: "none" }}
                    onTouchStart={e => { e.stopPropagation(); setDragIdx(i); }}
                    onTouchMove={e => {
                      e.preventDefault();
                      const touch = e.touches[0];
                      const el = document.elementFromPoint(touch.clientX, touch.clientY);
                      const raw = el?.closest('[data-exercise-index]')?.getAttribute('data-exercise-index');
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
                )}

                {/* Skip toggle */}
                <button onClick={e => { e.stopPropagation(); toggleSkip(ex.id); }} style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
                  background: isSkipped ? T.s2 : `${routine.clr}22`,
                  border: `1px solid ${isSkipped ? T.bd : routine.clr}`,
                  color: isSkipped ? T.t3 : routine.clr,
                  fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {isSkipped ? "+" : "✓"}
                </button>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", overflow: "hidden" }}>
                    <div style={{ ...BB, fontSize: 18, lineHeight: 1.1, color: isSkipped ? T.t3 : T.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{displayName}</div>
                    {!ex.noLog && (() => { const sug = getSuggestedWeight(ex.id, gd); return sug?.isSuggested && <span style={{ ...DM, fontSize: 9, color: "#000", background: T.grn, borderRadius: 4, padding: "2px 6px" }}>+{sug.increment} lbs</span>; })()}
                  </div>
                  {isSwapped && <div style={{ ...DM, fontSize: 10, color: routine.clr, marginTop: 2 }}>alternativa</div>}
                  <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                    {[
                      `${curReps.rMin}–${curReps.rMax}${ex.perSide ? "/l" : ""} reps`,
                      ex.tempo,
                      ex.rir !== null ? `RIR ${ex.rir}` : null,
                    ].filter(Boolean).map((tag, j) => (
                      <span key={j} style={{ ...DM, fontSize: 11, color: T.t2 }}>{tag}</span>
                    ))}
                  </div>
                  {/* Reps controls — edit mode only */}
                  {editMode && !isSkipped && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                      <button onClick={e => { e.stopPropagation(); adjustReps(ex.id, ex, -1); }} style={{
                        width: 28, height: 28, borderRadius: 7, background: T.s2, border: `1px solid ${T.bd}`,
                        color: T.red, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>−</button>
                      <div style={{ ...DM, fontSize: 11, color: T.t2, minWidth: 52, textAlign: "center" }}>{curReps.rMin}–{curReps.rMax} reps</div>
                      <button onClick={e => { e.stopPropagation(); adjustReps(ex.id, ex, 1); }} style={{
                        width: 28, height: 28, borderRadius: 7, background: T.s2, border: `1px solid ${T.bd}`,
                        color: T.grn, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>+</button>
                    </div>
                  )}
                </div>

                {/* Right: Alt + Series controls */}
                {!isSkipped && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {hasSwaps && (
                      <button onClick={e => { e.stopPropagation(); setSwapTarget(ex.id); }} style={{
                        background: "none", border: `1px solid ${T.bd}`, borderRadius: 6,
                        color: T.t2, ...DM, fontSize: 11, padding: "4px 8px", cursor: "pointer", flexShrink: 0,
                      }}>Alt</button>
                    )}
                    <button onClick={e => { e.stopPropagation(); adjustSeries(ex.id, -1, ex.s); }} style={{
                      width: 28, height: 28, borderRadius: 7, background: T.s2, border: `1px solid ${T.bd}`,
                      color: T.red, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>−</button>
                    <div style={{ ...BB, fontSize: 22, color: T.t1, minWidth: 18, textAlign: "center" }}>{currentS}</div>
                    <button onClick={e => { e.stopPropagation(); adjustSeries(ex.id, 1, ex.s); }} style={{
                      width: 28, height: 28, borderRadius: 7, background: T.s2, border: `1px solid ${T.bd}`,
                      color: T.grn, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>+</button>
                    <div style={{ ...DM, fontSize: 11, color: T.t2, marginLeft: 2 }}>s</div>
                  </div>
                )}
              </div>

              {/* ✕ biserie — break active pair in edit mode */}
              {showBreakBtn && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, marginBottom: 8 }}>
                  <button onClick={() => breakLink(ex.id, displayExs[i + 1].ex.id)} style={{
                    background: "none", border: `1px solid ${T.bd}`, borderRadius: 6,
                    color: T.t3, ...DM, fontSize: 11, letterSpacing: "0.06em",
                    padding: "4px 12px", cursor: "pointer",
                  }}>✕ biserie</button>
                  <div style={{ ...DM, fontSize: 9, color: T.t3, opacity: 0.5 }}>
                    permanente · mover separa temporalmente
                  </div>
                </div>
              )}

              {/* ⇄ — link button between adjacent exercises without active biserie */}
              {showLinkBtn && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 28, marginBottom: 8 }}>
                  <button onClick={() => createLink(ex.id, displayExs[i + 1].ex.id)} style={{
                    background: "none", border: "none", color: routine.clr,
                    fontSize: 20, cursor: "pointer", padding: "0 16px", opacity: 0.8,
                  }}>⇄</button>
                </div>
              )}

              {/* Rest info — suppress for first of pair, show "tras el par" for second of pair */}
              {!showBreakBtn && !showLinkBtn && !nextSameBlk && !isFirstOfPair && blk.rest > 0 && !editMode && (
                <div style={{ ...DM, fontSize: 11, color: T.t2, textAlign: "right", marginTop: -4, marginBottom: 4, paddingRight: 4 }}>
                  descanso {blk.rest}s{isSecondOfPair ? " · tras el par" : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Swap mini-drawer */}
      {swapTarget && (() => {
        const targetItem = allVisibleExs.find(item => item.ex.id === swapTarget);
        if (!targetItem) return null;
        const tEx = targetItem.ex;
        const curSwap = sessionSwaps[swapTarget];
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 100, display: "flex", alignItems: "flex-end" }} onClick={() => setSwapTarget(null)}>
            <div style={{ background: T.s1, borderRadius: "20px 20px 0 0", padding: "24px 20px 48px", width: "100%", maxWidth: 480, margin: "0 auto", border: `1px solid ${T.bd}` }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ ...BB, fontSize: 24 }}>Alternativas</div>
                <button onClick={() => setSwapTarget(null)} style={{ background: "none", border: "none", color: T.t3, fontSize: 20, cursor: "pointer" }}>✕</button>
              </div>
              <div style={{ ...DS, color: T.t3, fontSize: 12, marginBottom: 16 }}>En lugar de: {tEx.nombre}</div>
              {curSwap && (
                <div onClick={() => { setSessionSwaps(p => { const n = { ...p }; delete n[swapTarget]; return n; }); setSwapTarget(null); }}
                  style={{ background: `${routine.clr}11`, border: `1px solid ${routine.clr}33`, borderRadius: 12, padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <span style={{ color: routine.clr, ...BB, fontSize: 18 }}>↩</span>
                  <span style={{ ...DS, color: routine.clr, fontSize: 14 }}>Restaurar original</span>
                </div>
              )}
              {tEx.swaps.map((s, idx) => (
                <div key={idx} onClick={() => { setSessionSwaps(p => ({ ...p, [swapTarget]: s })); setSwapTarget(null); }}
                  style={{ background: curSwap === s ? `${routine.clr}18` : T.s2, border: `1px solid ${curSwap === s ? routine.clr : T.bd}`, borderRadius: 12, padding: "14px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <span style={{ color: routine.clr, ...BB, fontSize: 20 }}>↪</span>
                  <span style={{ ...DS, color: T.t1, fontSize: 15 }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Start button — normal flow, end of scroll */}
      <div style={{ padding: "24px 14px 48px" }}>
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
