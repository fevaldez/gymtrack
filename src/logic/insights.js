import { ROUTINES } from '../data/routines.js';

export function findExerciseById(exId) {
  for (const r of Object.values(ROUTINES)) {
    for (const blk of r.bloques) {
      for (const ex of blk.ejercicios) { if (ex.id === exId) return ex; }
    }
  }
  return null;
}

// exerciseMap param is optional — used for tests to pass a map directly
// without depending on ROUTINES
export function calcSuggestion(exId, sessionSets, exerciseMap) {
  if (!sessionSets || !sessionSets.length) return { action:"hold", label:"mantén peso" };
  const exercise = exerciseMap ? exerciseMap[exId] : findExerciseById(exId);
  if (!exercise) return { action:"hold", label:"mantén peso" };
  const avgRir = sessionSets.reduce((s, x) => s + (x.rir ?? 2), 0) / sessionSets.length;
  const maxReps = Math.max(...sessionSets.map(s => s.reps || 0));
  const hitTopRange = maxReps >= exercise.rMax;
  if (avgRir <= 1 && hitTopRange) {
    const increment = exercise.rMax <= 8 ? 5 : 2.5;
    return { action:"up", increment, label:`+${increment} lbs` };
  }
  return { action:"hold", label:"mantén peso" };
}

export function getSuggestedWeight(exId, gd, exerciseMap) {
  const history = gd[exId];
  if (!history || !history.length) return null;
  const lastSession = history[history.length - 1];
  if (!lastSession.sets || !lastSession.sets.length) return null;
  const weights = lastSession.sets.map(s => s.w || 0).filter(Boolean);
  if (!weights.length) return null;
  const lastMaxW = Math.max(...weights);
  const sug = calcSuggestion(exId, lastSession.sets, exerciseMap);
  if (sug?.action === "up") return { weight: lastMaxW + sug.increment, isSuggested: true, increment: sug.increment };
  return { weight: lastMaxW, isSuggested: false, increment: 0 };
}

export function generateInsights(logs, gd) {
  const insights = [];

  const prCount = Object.keys(logs).filter(id => {
    const todaySets = logs[id] || [];
    const best = Math.max(...todaySets.map(s => s.w || 0));
    const allHistory = (gd[id] || []).flatMap(s => s.sets?.map(y => y.w || 0) || []);
    const prevBest = allHistory.length > todaySets.length
      ? Math.max(...allHistory.slice(0, allHistory.length - todaySets.length))
      : 0;
    return best > prevBest && prevBest > 0;
  }).length;
  if (prCount > 0) insights.push({ icon: "🏆", text: `${prCount} récord${prCount > 1 ? "s" : ""} hoy — estás progresando` });

  const allRir = Object.values(logs).flatMap(sets => sets.map(s => s.rir)).filter(r => r !== null && r !== undefined);
  if (allRir.length > 0) {
    const avgRir = allRir.reduce((a, b) => a + b, 0) / allRir.length;
    if (avgRir < 1.2) insights.push({ icon: "⚠️", text: `RIR promedio ${avgRir.toFixed(1)} — muy cerca del fallo. Considera deload en 1–2 semanas` });
    else if (avgRir > 2.8) insights.push({ icon: "💡", text: `RIR promedio ${avgRir.toFixed(1)} — tienes margen. Sube 2.5–5% la próxima sesión` });
    else insights.push({ icon: "✓", text: `RIR promedio ${avgRir.toFixed(1)} — zona óptima de entrenamiento` });
  }

  const totalVol = Object.values(logs).reduce((a, sets) => a + sets.reduce((s, x) => s + (x.w || 0) * (x.reps || 0), 0), 0);
  if (totalVol > 5000) insights.push({ icon: "📈", text: `${Math.round(totalVol / 1000 * 10) / 10}k lbs · sesión de alto volumen` });

  const exercisesAtTopOfRange = Object.keys(logs).filter(id => {
    const sets = logs[id] || [];
    return sets.some(s => s.reps !== null && s.rir !== null && s.rir <= 1);
  });
  if (exercisesAtTopOfRange.length > 0) {
    insights.push({ icon: "→", text: `Progresión disponible en ${exercisesAtTopOfRange.length} ejercicio${exercisesAtTopOfRange.length > 1 ? "s" : ""} — sube 2.5–5% próxima sesión` });
  }

  return insights.slice(0, 4);
}
