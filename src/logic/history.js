import { ROUTINES } from '../data/routines.js';

export function getExerciseNames() {
  const names = {};
  for (const r of Object.values(ROUTINES)) {
    for (const blk of r.bloques) {
      for (const ex of blk.ejercicios) names[ex.id] = ex.nombre;
    }
  }
  return names;
}

export function buildDayMap(gd) {
  const dayMap = {};
  for (const [exId, sessions] of Object.entries(gd)) {
    for (const session of sessions) {
      const dayStr = new Date(session.date).toDateString();
      if (!dayMap[dayStr]) dayMap[dayStr] = [];
      dayMap[dayStr].push({ exId, session });
    }
  }
  return Object.entries(dayMap).sort((a, b) => new Date(b[0]) - new Date(a[0]));
}

export function buildExerciseMap(gd) {
  const names = getExerciseNames();
  return Object.entries(gd)
    .filter(([, sessions]) => sessions.length > 0)
    .map(([exId, sessions]) => {
      const allSets = sessions.flatMap(s => s.sets || []);
      const maxWeight = allSets.length ? Math.max(...allSets.map(s => s.w || 0)) : 0;
      const totalSets = allSets.length;
      const lastDate = sessions[sessions.length - 1]?.date;
      const weightsBySession = sessions.map(s => Math.max(...(s.sets || []).map(x => x.w || 0)));
      return { exId, name: names[exId] || exId, sessions, maxWeight, totalSets, lastDate, weightsBySession };
    })
    .sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));
}
