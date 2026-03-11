import { useState } from "react";
import { T, BB, DM, DS } from '../data/theme.js';
import { saveGD } from '../data/storage.js';
import { buildDayMap, buildExerciseMap, getExerciseNames } from '../logic/history.js';

function Sparkline({ weights, clr }) {
  if (!weights || weights.length < 2) return null;
  const W = 100, H = 28, pad = 3;
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const pts = weights.map((v, i) => {
    const x = pad + (i / (weights.length - 1)) * (W - 2 * pad);
    const y = (H - pad) - ((v - min) / range) * (H - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const last = pts.split(" ").pop().split(",");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline points={pts} fill="none" stroke={clr} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={clr} />
    </svg>
  );
}

export function HistoryScreen({ gd, setGd, onBack }) {
  const [view, setView] = useState("day");
  const [expanded, setExpanded] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const names = getExerciseNames();
  const dayEntries = buildDayMap(gd);
  const exEntries = buildExerciseMap(gd);
  const totalSessions = dayEntries.length;
  const totalSets = Object.values(gd).reduce((a, sessions) => a + sessions.reduce((b, s) => b + (s.sets?.length || 0), 0), 0);
  const totalExercises = Object.keys(gd).length;

  function deleteDay(dayStr) {
    const newGd = {};
    for (const [exId, sessions] of Object.entries(gd)) {
      const filtered = sessions.filter(s => new Date(s.date).toDateString() !== dayStr);
      if (filtered.length) newGd[exId] = filtered;
    }
    saveGD(newGd); setGd(newGd); setDeleteConfirm(null); setExpanded(null);
  }

  function deleteExercise(exId) {
    const newGd = { ...gd };
    delete newGd[exId];
    saveGD(newGd); setGd(newGd); setDeleteConfirm(null); setExpanded(null);
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.t1, ...DS, maxWidth: 480, margin: "0 auto", paddingBottom: 60 }}>
      <div style={{ padding: "20px 20px 14px", borderBottom: `1px solid ${T.bd}`, background: T.bg, position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.t3, fontSize: 13, cursor: "pointer", marginBottom: 10 }}>← Volver</button>
        <div style={{ ...BB, fontSize: 40 }}>HISTORIA</div>
        <div style={{ display: "flex", gap: 24, marginTop: 8 }}>
          {[["sesiones", totalSessions], ["sets", totalSets], ["ejercicios", totalExercises]].map(([l, v]) => (
            <div key={l}><span style={{ ...BB, fontSize: 22, color: T.acc }}>{v}</span> <span style={{ ...DM, fontSize: 9, color: T.t3 }}>{l}</span></div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {[["Por Día", "day"], ["Por Ejercicio", "exercise"]].map(([l, v]) => (
            <button key={v} onClick={() => setView(v)} style={{
              flex: 1, padding: "9px 12px", background: view === v ? `${T.acc}18` : T.s2,
              border: `1px solid ${view === v ? T.acc : T.bd}`, borderRadius: 10, color: view === v ? T.acc : T.t3,
              ...DS, fontSize: 13, fontWeight: view === v ? 700 : 400, cursor: "pointer",
            }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: "12px 14px" }}>
        {view === "day" && (
          dayEntries.length === 0
            ? <div style={{ ...DS, color: T.t3, textAlign: "center", marginTop: 40 }}>Sin sesiones registradas</div>
            : dayEntries.map(([dayStr, entries]) => {
                const isExp = expanded === `day-${dayStr}`;
                const dateObj = new Date(dayStr);
                const label = dateObj.toLocaleDateString("es", { weekday: "short", month: "short", day: "numeric" });
                const totalDaySets = entries.reduce((a, { session }) => a + (session.sets?.length || 0), 0);
                return (
                  <div key={dayStr} style={{ background: T.s1, border: `1px solid ${T.bd}`, borderRadius: 16, marginBottom: 10, overflow: "hidden" }}>
                    <div onClick={() => setExpanded(isExp ? null : `day-${dayStr}`)}
                      style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                      <div>
                        <div style={{ ...BB, fontSize: 20 }}>{label}</div>
                        <div style={{ ...DM, color: T.t3, fontSize: 10, marginTop: 2 }}>{entries.length} ejercicios · {totalDaySets} sets</div>
                      </div>
                      <div style={{ ...DM, fontSize: 14, color: T.t3 }}>{isExp ? "▲" : "▼"}</div>
                    </div>
                    {isExp && (
                      <div style={{ borderTop: `1px solid ${T.bd}`, padding: "10px 16px 14px" }}>
                        {entries.map(({ exId, session }) => (
                          <div key={exId} style={{ marginBottom: 10 }}>
                            <div style={{ ...BB, fontSize: 15, color: T.t1, marginBottom: 4 }}>{names[exId] || exId}</div>
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                              {(session.sets || []).map((s, i) => (
                                <div key={i} style={{ background: T.s2, border: `1px solid ${T.bd}`, borderRadius: 7, padding: "4px 8px", ...DM, fontSize: 10, color: T.t2 }}>
                                  {s.w}<span style={{ color: T.t3 }}>lb</span>×{s.reps}<span style={{ color: T.t3 }}> R{s.rir}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        <div style={{ marginTop: 12, borderTop: `1px solid ${T.bd}`, paddingTop: 12 }}>
                          {deleteConfirm === `day-${dayStr}` ? (
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={{ ...DS, fontSize: 12, color: T.red, flex: 1 }}>¿Eliminar este día?</span>
                              <button onClick={() => deleteDay(dayStr)} style={{ background: T.red, border: "none", borderRadius: 8, color: "#fff", fontSize: 12, padding: "6px 12px", cursor: "pointer", ...DS, fontWeight: 700 }}>Eliminar</button>
                              <button onClick={() => setDeleteConfirm(null)} style={{ background: T.s2, border: `1px solid ${T.bd}`, borderRadius: 8, color: T.t2, fontSize: 12, padding: "6px 12px", cursor: "pointer", ...DS }}>Cancelar</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(`day-${dayStr}`)} style={{ background: "none", border: `1px solid ${T.red}44`, borderRadius: 8, color: T.red, fontSize: 12, padding: "6px 14px", cursor: "pointer", ...DS }}>Borrar día</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
        )}
        {view === "exercise" && (
          exEntries.length === 0
            ? <div style={{ ...DS, color: T.t3, textAlign: "center", marginTop: 40 }}>Sin datos de ejercicios</div>
            : exEntries.map(({ exId, name, sessions, maxWeight, totalSets: exTotalSets, lastDate, weightsBySession }) => {
                const isExp = expanded === `ex-${exId}`;
                const days = lastDate ? Math.floor((Date.now() - new Date(lastDate)) / 86400000) : null;
                return (
                  <div key={exId} style={{ background: T.s1, border: `1px solid ${T.bd}`, borderRadius: 16, marginBottom: 10, overflow: "hidden" }}>
                    <div onClick={() => setExpanded(isExp ? null : `ex-${exId}`)}
                      style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...BB, fontSize: 18, lineHeight: 1.1 }}>{name}</div>
                        <div style={{ ...DM, color: T.t3, fontSize: 10, marginTop: 2 }}>
                          {sessions.length} sesiones · {exTotalSets} sets · PR {maxWeight} lbs
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0, marginLeft: 10 }}>
                        <Sparkline weights={weightsBySession} clr={T.acc} />
                        <div style={{ ...DM, fontSize: 9, color: T.t3 }}>{days === 0 ? "Hoy" : days === 1 ? "Ayer" : days ? `Hace ${days}d` : ""}</div>
                      </div>
                    </div>
                    {isExp && (
                      <div style={{ borderTop: `1px solid ${T.bd}`, padding: "10px 16px 14px" }}>
                        {sessions.slice().reverse().map((session, i) => {
                          const d = new Date(session.date).toLocaleDateString("es", { month: "short", day: "numeric" });
                          return (
                            <div key={i} style={{ marginBottom: 10 }}>
                              <div style={{ ...DM, color: T.t3, fontSize: 10, marginBottom: 4 }}>{d}</div>
                              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                {(session.sets || []).map((s, j) => (
                                  <div key={j} style={{ background: T.s2, border: `1px solid ${T.bd}`, borderRadius: 7, padding: "4px 8px", ...DM, fontSize: 10, color: T.t2 }}>
                                    {s.w}<span style={{ color: T.t3 }}>lb</span>×{s.reps}<span style={{ color: T.t3 }}> R{s.rir}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        <div style={{ marginTop: 12, borderTop: `1px solid ${T.bd}`, paddingTop: 12 }}>
                          {deleteConfirm === `ex-${exId}` ? (
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={{ ...DS, fontSize: 12, color: T.red, flex: 1 }}>¿Eliminar todo el historial?</span>
                              <button onClick={() => deleteExercise(exId)} style={{ background: T.red, border: "none", borderRadius: 8, color: "#fff", fontSize: 12, padding: "6px 12px", cursor: "pointer", ...DS, fontWeight: 700 }}>Eliminar</button>
                              <button onClick={() => setDeleteConfirm(null)} style={{ background: T.s2, border: `1px solid ${T.bd}`, borderRadius: 8, color: T.t2, fontSize: 12, padding: "6px 12px", cursor: "pointer", ...DS }}>Cancelar</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(`ex-${exId}`)} style={{ background: "none", border: `1px solid ${T.red}44`, borderRadius: 8, color: T.red, fontSize: 12, padding: "6px 14px", cursor: "pointer", ...DS }}>Borrar ejercicio</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
        )}
      </div>
    </div>
  );
}
