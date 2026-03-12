import { T, BB, DM, DS } from '../data/theme.js';
import { findExerciseById, calcSuggestion, generateInsights } from '../logic/insights.js';

export function SummaryScreen({ routine, logs, prs, elapsed, gd, onHome }) {
  const totalSets = Object.values(logs).reduce((a, b) => a + b.length, 0);
  const totalVol = Object.values(logs).reduce((a, sets) => a + sets.reduce((s, x) => s + (x.w || 0) * (x.reps || 0), 0), 0);
  const allRir = Object.values(logs).flatMap(sets => sets.map(s => s.rir)).filter(r => r !== null && r !== undefined);
  const avgRir = allRir.length ? allRir.reduce((a, b) => a + b, 0) / allRir.length : null;
  const allExIds = routine.bloques.flatMap(blk => blk.ejercicios.map(ex => ex.id));
  const prevSessions = allExIds.flatMap(id => (gd[id] || []).slice(0, -1));
  const prevVol = prevSessions.reduce((a, s) => (s.sets || []).reduce((b, x) => b + (x.w || 0) * (x.reps || 0), a), 0);
  const prevRirAll = prevSessions.flatMap(s => (s.sets || []).map(x => x.rir)).filter(r => r !== null && r !== undefined);
  const prevAvgRir = prevRirAll.length ? prevRirAll.reduce((a, b) => a + b, 0) / prevRirAll.length : null;
  const loggedExIds = Object.keys(logs).filter(id => !findExerciseById(id)?.noLog);
  const elStr = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  function getPrevPR(exId) {
    const hist = gd[exId] || [];
    const all = hist.slice(0, -1).flatMap(s => s.sets?.map(x => x.w || 0) || []);
    return all.length ? Math.max(...all) : 0;
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.t1, ...DS, maxWidth: 480, margin: "0 auto", padding: "52px 22px 48px" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 300, background: `radial-gradient(ellipse at top,${routine.clr}15,transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ ...DM, fontSize: 10, letterSpacing: 4, color: T.t3, marginBottom: 6, position: "relative" }}>SESIÓN COMPLETADA</div>
      <div style={{ ...BB, fontSize: 58, lineHeight: 0.95, marginBottom: 6, position: "relative" }}>{routine.label}</div>
      <div style={{ ...DS, color: T.t3, fontSize: 13, marginBottom: 24, position: "relative" }}>{elStr} · {totalSets} sets</div>
      {prs.length > 0 && (
        <div style={{ background: `${T.acc}0F`, border: `1px solid ${T.acc}33`, borderRadius: 18, padding: "18px 20px", marginBottom: 12, position: "relative" }}>
          <div style={{ ...BB, fontSize: 20, color: T.acc, marginBottom: 12 }}>🏆 Récords Personales</div>
          {prs.map((p, i) => {
            const prev = getPrevPR(p.id);
            const delta = prev > 0 ? p.w - prev : null;
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ ...DS, fontSize: 14, color: T.t2 }}>{p.name}</span>
                <div style={{ textAlign: "right" }}>
                  <span style={{ ...DM, fontSize: 14, color: T.acc }}>{p.w} lbs</span>
                  {delta !== null && <span style={{ ...DM, fontSize: 11, color: T.grn, marginLeft: 6 }}>+{delta} lbs</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {loggedExIds.length > 0 && (
        <div style={{ background: T.s1, border: `1px solid ${T.bd}`, borderRadius: 18, padding: "18px 20px", marginBottom: 12, position: "relative" }}>
          <div style={{ ...DM, color: T.t2, fontSize: 11, letterSpacing: 2, marginBottom: 12 }}>PRÓXIMA SESIÓN</div>
          {loggedExIds.map(id => {
            const ex = findExerciseById(id);
            const sug = calcSuggestion(id, logs[id]);
            if (!ex) return null;
            return (
              <div key={id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 6, paddingBottom: 6, borderBottom: `1px solid ${T.bd}` }}>
                <span style={{ ...DS, fontSize: 13, color: T.t1 }}>{ex.nombre}</span>
                <span style={{ ...DM, fontSize: 13, color: sug?.action === "up" ? T.grn : T.t2 }}>
                  {sug?.action === "up" ? `→ +${sug.increment} lbs` : "mantén"}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ background: T.s1, border: `1px solid ${T.bd}`, borderRadius: 18, padding: "18px 20px", marginBottom: 12, position: "relative" }}>
        <div style={{ ...DM, color: T.t2, fontSize: 11, letterSpacing: 2, marginBottom: 16 }}>ESTADÍSTICAS</div>
        <div style={{ display: "flex", gap: 28 }}>
          <div><div style={{ ...BB, fontSize: 32, color: T.acc }}>{totalSets}</div><div style={{ ...DM, color: T.t2, fontSize: 11 }}>sets</div></div>
          <div><div style={{ ...BB, fontSize: 32, color: T.t1 }}>{totalVol > 0 ? `${(totalVol / 1000).toFixed(1)}k` : "—"}</div><div style={{ ...DM, color: T.t2, fontSize: 11 }}>vol lbs</div></div>
          <div><div style={{ ...BB, fontSize: 32, color: T.t2 }}>{elStr}</div><div style={{ ...DM, color: T.t2, fontSize: 11 }}>tiempo</div></div>
        </div>
      </div>
      {(() => {
        const insights = generateInsights(logs, gd);
        const lines = [];
        if (avgRir !== null) {
          let txt = `RIR promedio ${avgRir.toFixed(1)}`;
          if (avgRir < 1.2) txt += ` — muy cerca del fallo`;
          else if (avgRir > 2.8) txt += ` — zona conservadora`;
          else txt += ` — zona óptima`;
          if (prevAvgRir !== null) {
            const d = avgRir - prevAvgRir;
            txt += ` · ${d > 0 ? "más suave" : "más intenso"} que sesión anterior`;
          }
          lines.push({ icon: avgRir > 2.8 ? "💡" : avgRir < 1.2 ? "⚠️" : "✓", text: txt });
        }
        if (totalVol > 0) {
          let vtxt = `${(totalVol / 1000).toFixed(1)}k lbs`;
          if (prevVol > 0) { const pct = Math.round(((totalVol - prevVol) / prevVol) * 100); vtxt += ` · ${pct >= 0 ? "+" : ""}${pct}% vs sesión anterior`; }
          else vtxt += ` · primera sesión registrada`;
          lines.push({ icon: "📈", text: vtxt });
        }
        const combined = [...lines, ...insights.filter((_, i) => i > 0)].slice(0, 4);
        if (!combined.length) return null;
        return (
          <div style={{ background: T.s1, border: `1px solid ${T.bd}`, borderRadius: 18, padding: "18px 20px", marginBottom: 24, position: "relative" }}>
            <div style={{ ...DM, color: T.t3, fontSize: 10, letterSpacing: 2, marginBottom: 14 }}>ANÁLISIS</div>
            {combined.map((ins, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: i < combined.length - 1 ? 12 : 0 }}>
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{ins.icon}</span>
                <span style={{ ...DS, color: T.t2, fontSize: 13, lineHeight: 1.5 }}>{ins.text}</span>
              </div>
            ))}
          </div>
        );
      })()}
      <button onClick={onHome}
        style={{ width: "100%", background: "none", border: `2px solid ${routine.clr}`, color: routine.clr, borderRadius: 14, padding: "16px 24px", ...BB, fontSize: 18, letterSpacing: "0.1em", cursor: "pointer", position: "relative" }}>
        VOLVER AL INICIO
      </button>
    </div>
  );
}
