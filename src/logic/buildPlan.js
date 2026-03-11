export function buildPlan(routine, ctx, sessionSkip = new Set(), sessionOverride = {}, sessionLinks = []) {
  const skip = new Set([
    ...(routine.cutTime?.[ctx.tiempo] || []),
    ...(ctx.bjj ? routine.bjjCut || [] : []),
    ...sessionSkip,
  ]);
  const steps = [];
  for (const blk of routine.bloques) {
    if (skip.has(blk.id)) continue;
    const exs = blk.ejercicios.filter(ex => !skip.has(ex.id));
    if (!exs.length) continue;
    if (blk.tipo === "biserie" && exs.length === 2) {
      const [e1, e2] = exs;
      const s1 = sessionOverride[e1.id] ?? e1.s;
      const s2 = sessionOverride[e2.id] ?? e2.s;
      const maxS = Math.max(s1, s2);
      for (let n = 1; n <= maxS; n++) {
        if (n <= s1) steps.push({ ex: e1, blk, setNum: n, total: s1, biserie: true, paired: e2.nombre, last: false, rest: 0 });
        if (n <= s2) steps.push({ ex: e2, blk, setNum: n, total: s2, biserie: true, paired: e1.nombre, last: true, rest: blk.rest });
      }
    } else {
      for (const ex of exs) {
        const seriesCount = sessionOverride[ex.id] ?? ex.s;
        for (let n = 1; n <= seriesCount; n++) {
          steps.push({ ex, blk, setNum: n, total: seriesCount, biserie: false, paired: null, last: n === seriesCount, rest: blk.tipo === "calentamiento" ? 0 : blk.rest });
        }
      }
    }
  }
  if (!sessionLinks.length) return steps;

  const stepsWithIdx = steps.map((s, i) => ({ ...s, originalIdx: i }));
  const stepsByEx = {};
  for (const s of stepsWithIdx) {
    if (!stepsByEx[s.ex.id]) stepsByEx[s.ex.id] = [];
    stepsByEx[s.ex.id].push(s);
  }
  const linkedIds = new Set(sessionLinks.flat());
  const linkedSections = [];
  for (const [exId1, exId2] of sessionLinks) {
    const ex1Steps = stepsByEx[exId1] || [];
    const ex2Steps = stepsByEx[exId2] || [];
    if (!ex1Steps.length || !ex2Steps.length) continue;
    const maxS = Math.max(ex1Steps.length, ex2Steps.length);
    const pairRest = Math.max(ex1Steps[0]?.rest || 0, ex2Steps[0]?.rest || 0);
    const insertAt = Math.min(ex1Steps[0].originalIdx, ex2Steps[0].originalIdx);
    const e2Name = ex2Steps[0]?.ex.nombre;
    const e1Name = ex1Steps[0]?.ex.nombre;
    const section = [];
    for (let n = 0; n < maxS; n++) {
      if (n < ex1Steps.length) section.push({ ...ex1Steps[n], biserie: true, paired: e2Name, rest: 0 });
      if (n < ex2Steps.length) section.push({ ...ex2Steps[n], biserie: true, paired: e1Name, rest: pairRest });
    }
    linkedSections.push({ insertAt, section });
  }
  const unlinkedSteps = stepsWithIdx.filter(s => !linkedIds.has(s.ex.id));
  const result = [];
  const sectionsCopy = [...linkedSections].sort((a, b) => a.insertAt - b.insertAt);
  for (const us of unlinkedSteps) {
    while (sectionsCopy.length > 0 && sectionsCopy[0].insertAt <= us.originalIdx) {
      result.push(...sectionsCopy.shift().section);
    }
    result.push(us);
  }
  for (const sec of sectionsCopy) result.push(...sec.section);
  return result;
}
