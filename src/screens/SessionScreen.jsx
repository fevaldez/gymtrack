import { useState, useEffect } from "react";
import { T, BB, DM, DS } from '../data/theme.js';
import { saveGD } from '../data/storage.js';
import { getSuggestedWeight } from '../logic/insights.js';
import { RestTimer } from '../components/RestTimer.jsx';
import { PlateCalculator } from '../components/PlateCalculator.jsx';
import { SwapDrawer, PlanView } from '../components/SwapDrawer.jsx';

export function SessionScreen({ routine, ctx, plan, idx, setIdx, logs, setLogs, prs, setPrs, elapsed, gd, setGd, onComplete, onAbandon }) {
  const [w, setW] = useState("");
  const [reps, setReps] = useState(null);
  const [rir, setRir] = useState(null);
  const [prFlash, setPrFlash] = useState(false);
  const [showPlates, setShowPlates] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [showRest, setShowRest] = useState(false);
  const [restSecs, setRestSecs] = useState(0);
  const [sessionSwaps, setSessionSwaps] = useState({});
  const [showPlanView, setShowPlanView] = useState(false);
  const [midSkip, setMidSkip] = useState(new Set());
  const [suggestedInfo, setSuggestedInfo] = useState(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  const step = plan[idx];
  const nextStep = plan[idx + 1] || null;

  const lastW = id => { const s = gd[id]; if (!s?.length) return null; return s[s.length-1]?.sets?.[0]?.w ?? null; };
  const maxW = id => { const s = gd[id] || []; const all = s.flatMap(x => x.sets?.map(y => y.w || 0) || []); return all.length ? Math.max(...all) : 0; };

  useEffect(() => {
    if (!step) return;
    if (step.ex.noLog) { setW(""); setSuggestedInfo(null); setReps(null); setRir(null); return; }
    const sug = getSuggestedWeight(step.ex.id, gd);
    setSuggestedInfo(sug);
    setW(sug ? String(sug.weight) : lastW(step.ex.id) ? String(lastW(step.ex.id)) : "");
    setReps(null); setRir(null);
  }, [idx, plan]);

  function advance() {
    setShowRest(false);
    let next = idx + 1;
    while (next < plan.length && midSkip.has(plan[next].ex.id)) next++;
    if (next >= plan.length) onComplete();
    else setIdx(next);
  }

  function logSet() {
    const wn = parseFloat(w); if (!wn || reps === null || rir === null) return;
    const ex = step.ex;
    const prevMax = maxW(ex.id);
    if (prevMax > 0 && wn > prevMax) {
      setPrs(p => [...p.filter(x => x.id !== ex.id), { id: ex.id, name: ex.nombre, w: wn }]);
      setPrFlash(true); setTimeout(() => setPrFlash(false), 3000);
    }
    const today = new Date().toDateString();
    setGd(prev => {
      const sessions = prev[ex.id] || [];
      const ti = sessions.findIndex(s => new Date(s.date).toDateString() === today);
      const ns = { w: wn, reps, rir };
      let newGd;
      if (ti >= 0) { const u = [...sessions]; u[ti] = { ...u[ti], sets: [...u[ti].sets, ns] }; newGd = { ...prev, [ex.id]: u }; }
      else { newGd = { ...prev, [ex.id]: [...sessions.slice(-19), { date: new Date().toISOString(), sets: [ns] }] }; }
      saveGD(newGd);
      return newGd;
    });
    setLogs(prev => ({ ...prev, [ex.id]: [...(prev[ex.id] || []), { w: wn, reps, rir }] }));
    if (step.rest > 0) { setRestSecs(step.rest); setShowRest(true); } else { advance(); }
  }

  if (!step) return null;

  const ex = step.ex;
  const displayName = sessionSwaps[ex.id] || ex.nombre;
  const hasSwap = !!sessionSwaps[ex.id];
  const lw = lastW(ex.id);
  const mx = maxW(ex.id);
  const todaySets = logs[ex.id] || [];
  const wn = parseFloat(w) || 0;
  const canLog = wn > 0 && reps !== null && rir !== null;
  const rOpts = []; for (let r = Math.max(1, ex.rMin - 1); r <= ex.rMax + 2; r++) rOpts.push(r);
  const elStr = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;
  const pct = plan.length > 0 ? (idx / plan.length) * 100 : 0;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.t1, ...DS, maxWidth: 480, margin: "0 auto", paddingBottom: 60 }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 300, background: `radial-gradient(ellipse at top,${routine.clr}12,transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />
      {prFlash && <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 300, background: T.acc, color: "#000", padding: "16px", ...BB, fontSize: 20, textAlign: "center", letterSpacing: 1 }}>🏆 NUEVO RÉCORD PERSONAL!</div>}
      <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${T.bd}`, background: `${T.bg}EE`, position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(12px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ ...BB, fontSize: 16, color: routine.clr, letterSpacing: 1 }}>{routine.label.toUpperCase()}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ ...DM, fontSize: 12, color: T.t3 }}>{elStr} · {idx + 1}/{plan.length}</div>
            <button onClick={() => setShowPlanView(true)} style={{ background: "none", border: `1px solid ${T.bd}`, borderRadius: 8, color: T.t3, fontSize: 14, padding: "4px 8px", cursor: "pointer", ...DS }}>☰</button>
            {!confirmAbandon && (
              <button onClick={() => setConfirmAbandon(true)} style={{ background: "none", border: `1px solid ${T.bd}`, borderRadius: 8, color: T.t3, fontSize: 12, padding: "4px 8px", cursor: "pointer", ...DS }}>✕</button>
            )}
          </div>
        </div>
        {confirmAbandon && (
          <div style={{ background: `${T.red}11`, border: `1px solid ${T.red}33`, borderRadius: 10, padding: "10px 14px", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span style={{ ...DS, fontSize: 12, color: T.red }}>¿Abandonar sesión?</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onAbandon} style={{ background: T.red, border: "none", borderRadius: 8, color: "#fff", fontSize: 12, padding: "6px 12px", cursor: "pointer", ...DS, fontWeight: 700 }}>Sí, salir</button>
              <button onClick={() => setConfirmAbandon(false)} style={{ background: T.s2, border: `1px solid ${T.bd}`, borderRadius: 8, color: T.t2, fontSize: 12, padding: "6px 12px", cursor: "pointer", ...DS }}>Continuar</button>
            </div>
          </div>
        )}
        <div style={{ height: 3, background: T.s2, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: routine.clr, borderRadius: 2, transition: "width 0.5s" }} />
        </div>
      </div>
      <div style={{ margin: "12px 12px 0", background: T.s1, border: `1px solid ${T.bd}`, borderRadius: 22, padding: "16px 18px 14px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          <span style={{ background: T.s2, borderRadius: 6, padding: "3px 10px", ...DM, fontSize: 10, color: T.t3 }}>{step.blk.label}</span>
          <span style={{ background: T.s2, borderRadius: 6, padding: "3px 10px", ...DM, fontSize: 10, color: T.t3 }}>S{step.setNum}/{step.total}</span>
          {step.biserie && <span style={{ background: `${routine.clr}22`, color: routine.clr, border: `1px solid ${routine.clr}44`, borderRadius: 6, padding: "3px 10px", ...DM, fontSize: 10 }}>BISERIE → {step.paired}</span>}
          {ex.shoulder && ctx.hombro === "cuidado" && <span style={{ background: `${T.red}22`, color: T.red, border: `1px solid ${T.red}44`, borderRadius: 6, padding: "3px 10px", ...DM, fontSize: 10 }}>⚠️ RANGO SEGURO</span>}
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 2 }}>
          <div style={{ ...BB, fontSize: 22, lineHeight: 1.1, color: T.t1 }}>{displayName}</div>
          {hasSwap && <span style={{ ...DM, fontSize: 9, color: T.acc, marginTop: 4 }}>alternativa</span>}
        </div>
        <div style={{ ...DS, color: T.t3, fontSize: 12, marginBottom: 12 }}>{ex.desc}</div>
        <div style={{ ...BB, fontSize: 32, color: T.t1, marginBottom: 6 }}>{ex.rMin}–{ex.rMax}{ex.perSide ? " / lado" : ""} reps</div>
        <div style={{ display: "flex", gap: 16, marginBottom: 12, alignItems: "center" }}>
          <span style={{ ...DM, fontSize: 20, color: T.acc }}>{ex.tempo}</span>
          {ex.rir !== null && <span style={{ ...DM, fontSize: 18, color: T.t2 }}>RIR {ex.rir}</span>}
        </div>
        <div style={{ background: T.bg, borderRadius: 10, padding: "10px 12px", borderLeft: `3px solid ${routine.clr}` }}>
          <div style={{ ...DM, color: routine.clr, fontSize: 8, letterSpacing: 2, marginBottom: 4 }}>CLAVE 0.1%</div>
          <div style={{ ...DS, color: T.t2, fontSize: 13, lineHeight: 1.6 }}>{ex.cue}</div>
        </div>
      </div>
      {ex.noLog
        ? (<div style={{ margin: "10px 12px 0", background: T.s1, border: `1px solid ${T.bd}`, borderRadius: 22, padding: "16px 18px", position: "relative", zIndex: 1 }}>
            <button onClick={() => { if (step.rest > 0) { setRestSecs(step.rest); setShowRest(true); } else { advance(); } }}
              style={{ width: "100%", background: T.s2, color: T.t1, border: `1px solid ${T.bd}`, borderRadius: 14, padding: "18px", ...BB, fontSize: 22, letterSpacing: 1, cursor: "pointer" }}>
              COMPLETADO ✓
            </button>
          </div>)
        : (<div style={{ margin: "10px 12px 0", background: T.s1, border: `1px solid ${T.bd}`, borderRadius: 22, padding: "16px 18px", position: "relative", zIndex: 1 }}>
            {(lw || todaySets.length > 0) && (
              <div style={{ display: "flex", justifyContent: "space-between", background: T.bg, borderRadius: 8, padding: "8px 12px", marginBottom: 10, ...DM, fontSize: 12, color: T.t3 }}>
                {lw && <span style={{ ...DM, fontSize: 16, color: T.t3 }}>ant: <span style={{ color: T.t1 }}>{lw}</span> lbs</span>}
                {mx > 0 && <span style={{ ...DM, fontSize: 16, color: T.t3 }}>PR: <span style={{ color: T.acc }}>{mx}</span> lbs</span>}
              </div>
            )}
            {todaySets.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {todaySets.map((s, i) => (
                  <div key={i} style={{ background: T.s2, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "5px 10px", ...DM, fontSize: 11, color: T.t2 }}>
                    {s.w}<span style={{ color: T.t3 }}>lb</span>×{s.reps}<span style={{ color: T.t3 }}> R{s.rir}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <div style={{ ...DM, color: T.t3, fontSize: 9, letterSpacing: 2, marginBottom: 6 }}>PESO (lbs)</div>
              <input type="number" value={w} onChange={e => setW(e.target.value)} placeholder={lw || "135"}
                style={{ background: T.bg, border: `1px solid ${w ? routine.clr : T.bd}`, borderRadius: 12, padding: "10px 14px", color: T.t1, fontSize: 44, ...BB, width: "100%", textAlign: "center", outline: "none", transition: "border-color 0.2s" }} />
              {suggestedInfo?.isSuggested && parseFloat(w) === suggestedInfo.weight && (
                <div style={{ ...DM, fontSize: 10, color: T.grn, textAlign: "center", marginTop: 4 }}>sugerido +{suggestedInfo.increment} lbs</div>
              )}
              <div style={{ display: "flex", gap: 5, marginTop: 7 }}>
                {[-10, -5, -2.5, 2.5, 5, 10].map(a => (
                  <button key={a} onClick={() => setW(v => String(Math.max(0, Math.round((parseFloat(v || 0) + a) * 10) / 10)))}
                    style={{ flex: 1, background: T.s2, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "8px 3px", color: a > 0 ? T.grn : T.red, ...DM, fontSize: 11, cursor: "pointer" }}>
                    {a > 0 ? `+${a}` : a}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ ...DM, color: T.t3, fontSize: 9, letterSpacing: 2, marginBottom: 6 }}>REPS{ex.perSide ? " / LADO" : ""}</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {rOpts.map(r => (
                  <button key={r} onClick={() => setReps(r)}
                    style={{ flex: "0 0 calc(16.5% - 4px)", padding: "12px 4px", background: reps === r ? routine.clr : T.s2, border: `1px solid ${reps === r ? routine.clr : T.bd}`, borderRadius: 10, color: reps === r ? "#000" : T.t2, ...BB, fontSize: 20, cursor: "pointer", textAlign: "center", transition: "all 0.12s" }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ ...DM, color: T.t3, fontSize: 9, letterSpacing: 2, marginBottom: 6 }}>RIR — REPS EN RESERVA</div>
              <div style={{ display: "flex", gap: 5 }}>
                {[0, 1, 2, 3, 4].map(r => {
                  const clr = r <= 1 ? T.red : r === 2 ? T.acc : T.grn;
                  return (
                    <button key={r} onClick={() => setRir(r)}
                      style={{ flex: 1, padding: "14px 4px", background: rir === r ? clr : T.s2, border: `1px solid ${rir === r ? clr : T.bd}`, borderRadius: 10, color: rir === r ? "#000" : T.t2, ...BB, fontSize: 24, cursor: "pointer", transition: "all 0.12s" }}>
                      {r}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, ...DM, color: T.t3, fontSize: 9 }}>
                <span>Al fallo</span><span>Fácil</span>
              </div>
            </div>
            <button onClick={logSet} disabled={!canLog}
              style={{ width: "100%", background: canLog ? routine.clr : T.s2, color: canLog ? "#000" : T.t3, border: "none", borderRadius: 14, padding: "17px", ...BB, fontSize: 22, letterSpacing: 1, cursor: canLog ? "pointer" : "default", transition: "all 0.2s" }}>
              REGISTRAR SET →
            </button>
          </div>)
      }
      <div style={{ display: "flex", gap: 8, margin: "10px 12px 0", position: "relative", zIndex: 1 }}>
        {[["🔢 Placas", () => setShowPlates(true)], ["🔄 Cambiar", () => setShowSwap(true)], ["⏭ Saltar", advance]].map(([l, f]) => (
          <button key={l} onClick={f} style={{ flex: 1, background: T.s1, border: `1px solid ${T.bd}`, borderRadius: 12, padding: "13px 6px", color: T.t2, ...DS, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{l}</button>
        ))}
      </div>
      {showPlates && <PlateCalculator onSelectWeight={v => { setW(String(v)); setSuggestedInfo(s => s ? { ...s, _override: true } : s); }} onClose={() => setShowPlates(false)} />}
      {showSwap && <SwapDrawer ex={ex} sessionSwaps={sessionSwaps} setSessionSwaps={setSessionSwaps} onClose={() => setShowSwap(false)} />}
      {showRest && <RestTimer secs={restSecs} next={nextStep} onDone={advance} onSkip={advance} />}
      {showPlanView && <PlanView plan={plan} idx={idx} midSkip={midSkip} setMidSkip={setMidSkip} sessionSwaps={sessionSwaps} setSessionSwaps={setSessionSwaps} routine={routine} onClose={() => setShowPlanView(false)} />}
    </div>
  );
}
