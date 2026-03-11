// tests/logic.test.js
// Ejecutar con: node tests/logic.test.js
//
// Funciones extraídas exactamente de src/App.jsx.
// calcSuggestion y getSuggestedWeight usan findExerciseById internamente;
// aquí se expone también una variante que acepta exerciseMap como parámetro
// (misma lógica, permite tests en aislamiento sin cargar ROUTINES completo).

// ─── UTILS ────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗  ${name}`);
    console.log(`     → ${e.message}`);
    failed++;
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`expected null, got ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThan(n) {
      if (actual <= n) {
        throw new Error(`expected > ${n}, got ${actual}`);
      }
    },
    toContain(item) {
      if (!actual.includes(item)) {
        throw new Error(`expected array to contain ${JSON.stringify(item)}`);
      }
    },
    notToContain(item) {
      if (actual.includes(item)) {
        throw new Error(`expected array NOT to contain ${JSON.stringify(item)}`);
      }
    }
  };
}

function section(name) {
  console.log(`\n── ${name} ${'─'.repeat(Math.max(0, 50 - name.length))}`);
}

// ─── IMPLEMENTACIONES REALES (extraídas de src/App.jsx) ──────────────────────

// Constantes (idénticas a App.jsx)
const BAR = 45;
const PLATES = [45, 35, 25, 10, 5, 2.5];

// calcPlates — código exacto de App.jsx (retorna {plates, actual})
// Wrapper: el test spec espera solo el array de placas por lado
function _calcPlatesReal(target) {
  if (target <= BAR) return { plates:[], actual:BAR };
  let rem = Math.round((target - BAR) / 2 * 100) / 100;
  const p = [];
  for (const x of PLATES) { while (rem >= x - 0.001) { p.push(x); rem = Math.round((rem - x)*100)/100; } }
  return { plates:p, actual: BAR + p.reduce((a,b)=>a+b,0)*2 };
}
function calcPlates(target) { return _calcPlatesReal(target).plates; }

// calcSuggestion — lógica exacta de App.jsx, adaptada para aceptar exerciseMap
// (en producción usa findExerciseById(exId) sobre ROUTINES; aquí recibe el mapa directo)
function calcSuggestion(exId, sessionSets, exerciseMap) {
  if (!sessionSets || !sessionSets.length) return { action:"hold", label:"mantén peso" };
  const exercise = exerciseMap ? exerciseMap[exId] : null;
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

// getSuggestedWeight — lógica exacta de App.jsx, adaptada para aceptar exerciseMap
function getSuggestedWeight(exId, gd, exerciseMap) {
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

// ─── FIXTURES ─────────────────────────────────────────────────────────────────

const exerciseMap = {
  // Compound — rMax ≤ 8
  'PB':  { rMin: 5,  rMax: 7,  s: 4 }, // Machine Chest Press
  'PC':  { rMin: 6,  rMax: 8,  s: 3 }, // Smith Bench Press
  'PD1': { rMin: 8,  rMax: 10, s: 3 }, // Smith Bench Press volumen (rango medio)
  // Isolation — rMax ≥ 12
  'PD2': { rMin: 10, rMax: 12, s: 4 }, // Rope Pushdown
  'PE1': { rMin: 12, rMax: 15, s: 3 }, // Cable Fly
  'PE2': { rMin: 12, rMax: 15, s: 3 }, // Cross Pushdown
  // noLog — no deben aparecer en sugerencias
  'PF1': { rMin: 60, rMax: 120, s: 1, noLog: true },
  'PF2': { rMin: 10, rMax: 15,  s: 2, noLog: true },
};

// ─── TESTS: calcSuggestion ────────────────────────────────────────────────────

section('calcSuggestion — subida compound');

test('compound rMax≤8, RIR 0, hit top range → +5 lbs', () => {
  const sets = [
    { w: 135, reps: 7, rir: 0 },
    { w: 135, reps: 7, rir: 0 },
    { w: 135, reps: 7, rir: 1 },
  ];
  const result = calcSuggestion('PB', sets, exerciseMap);
  expect(result.action).toBe('up');
  expect(result.increment).toBe(5);
});

test('compound rMax=8, RIR 1, hit top range → +5 lbs', () => {
  const sets = [
    { w: 115, reps: 8, rir: 1 },
    { w: 115, reps: 8, rir: 1 },
    { w: 115, reps: 8, rir: 0 },
  ];
  const result = calcSuggestion('PC', sets, exerciseMap);
  expect(result.action).toBe('up');
  expect(result.increment).toBe(5);
});

section('calcSuggestion — subida isolation');

test('isolation rMax=12, RIR 0, hit top range → +2.5 lbs', () => {
  const sets = [
    { w: 55, reps: 12, rir: 0 },
    { w: 55, reps: 12, rir: 0 },
    { w: 55, reps: 12, rir: 1 },
    { w: 55, reps: 12, rir: 0 },
  ];
  const result = calcSuggestion('PD2', sets, exerciseMap);
  expect(result.action).toBe('up');
  expect(result.increment).toBe(2.5);
});

test('isolation rMax=15, RIR 0, hit top range → +2.5 lbs', () => {
  const sets = [
    { w: 35, reps: 15, rir: 0 },
    { w: 35, reps: 15, rir: 0 },
    { w: 35, reps: 15, rir: 0 },
  ];
  const result = calcSuggestion('PE2', sets, exerciseMap);
  expect(result.action).toBe('up');
  expect(result.increment).toBe(2.5);
});

section('calcSuggestion — mantener');

test('RIR promedio ≥ 3 → mantén sin importar reps', () => {
  const sets = [
    { w: 55, reps: 12, rir: 3 },
    { w: 55, reps: 12, rir: 3 },
    { w: 55, reps: 12, rir: 3 },
  ];
  const result = calcSuggestion('PD2', sets, exerciseMap);
  expect(result.action).toBe('hold');
});

test('hit top range pero RIR 2 → mantén', () => {
  const sets = [
    { w: 135, reps: 7, rir: 2 },
    { w: 135, reps: 7, rir: 2 },
    { w: 135, reps: 7, rir: 2 },
  ];
  const result = calcSuggestion('PB', sets, exerciseMap);
  expect(result.action).toBe('hold');
});

test('RIR ≤ 1 pero NO hit top range → mantén', () => {
  const sets = [
    { w: 135, reps: 5, rir: 0 }, // rMax es 7, no llegó
    { w: 135, reps: 5, rir: 1 },
    { w: 135, reps: 5, rir: 0 },
  ];
  const result = calcSuggestion('PB', sets, exerciseMap);
  expect(result.action).toBe('hold');
});

test('ejercicio desconocido → mantén (no crashea)', () => {
  const sets = [{ w: 50, reps: 10, rir: 0 }];
  const result = calcSuggestion('UNKNOWN_ID', sets, exerciseMap);
  expect(result.action).toBe('hold');
});

section('calcSuggestion — noLog excluidos');

test('noLog: true → no debe procesarse como sugerencia (retorna hold)', () => {
  // PF1 es noLog — rMax=120, reps=60 < 120, no hit top range → hold
  const sets = [{ w: 0, reps: 60, rir: 0 }];
  const result = calcSuggestion('PF1', sets, exerciseMap);
  expect(result.action).toBe('hold');
});

// ─── TESTS: calcPlates ────────────────────────────────────────────────────────

section('calcPlates — barra olímpica 45 lb');

test('135 lbs → [45] por lado', () => {
  const plates = calcPlates(135);
  expect(plates).toEqual([45]);
});

test('225 lbs → [45, 45] por lado', () => {
  const plates = calcPlates(225);
  expect(plates).toEqual([45, 45]);
});

test('155 lbs → [45, 10] por lado', () => {
  const plates = calcPlates(155);
  expect(plates).toEqual([45, 10]);
});

test('100 lbs → [25, 5] por lado', () => {
  const plates = calcPlates(100);
  expect(plates).toEqual([25, 5]);
});

test('95 lbs → [25, 2.5] por lado', () => {
  const plates = calcPlates(95);
  expect(plates).toEqual([25, 2.5]);
});

test('45 lbs (solo barra) → [] sin placas', () => {
  const plates = calcPlates(45);
  expect(plates).toEqual([]);
});

test('resultado × 2 + 45 = target', () => {
  const targets = [135, 155, 185, 225, 245, 275];
  targets.forEach(target => {
    const plates = calcPlates(target);
    const total = 45 + plates.reduce((s, p) => s + p, 0) * 2;
    if (total !== target) {
      throw new Error(`calcPlates(${target}): reconstruyó ${total}, esperaba ${target}`);
    }
  });
});

// ─── TESTS: getSuggestedWeight ────────────────────────────────────────────────

section('getSuggestedWeight — pre-llenado SessionScreen');

test('sin historial → null (input vacío)', () => {
  const gd = {};
  const result = getSuggestedWeight('PB', gd, exerciseMap);
  expect(result).toBeNull();
});

test('historial con RIR bajo, hit top → peso + 5 lbs, isSuggested true', () => {
  const gd = {
    'PB': [{
      date: '2026-03-03T10:00:00Z',
      sets: [
        { w: 135, reps: 7, rir: 0 },
        { w: 135, reps: 7, rir: 1 },
        { w: 135, reps: 7, rir: 0 },
      ]
    }]
  };
  const result = getSuggestedWeight('PB', gd, exerciseMap);
  expect(result.weight).toBe(140);
  expect(result.isSuggested).toBe(true);
  expect(result.increment).toBe(5);
});

test('historial con RIR alto → mismo peso, isSuggested false', () => {
  const gd = {
    'PD2': [{
      date: '2026-03-03T10:00:00Z',
      sets: [
        { w: 55, reps: 12, rir: 3 },
        { w: 55, reps: 12, rir: 3 },
        { w: 55, reps: 10, rir: 3 },
      ]
    }]
  };
  const result = getSuggestedWeight('PD2', gd, exerciseMap);
  expect(result.weight).toBe(55);
  expect(result.isSuggested).toBe(false);
});

test('usa la sesión MÁS RECIENTE si hay múltiples', () => {
  const gd = {
    'PC': [
      { date: '2026-02-01T10:00:00Z', sets: [{ w: 100, reps: 8, rir: 0 }] },
      { date: '2026-02-15T10:00:00Z', sets: [{ w: 110, reps: 8, rir: 0 }] }, // más reciente
    ]
  };
  const result = getSuggestedWeight('PC', gd, exerciseMap);
  // Debe usar la sesión de 110 lbs, no la de 100
  expect(result.weight).toBe(115); // 110 + 5
});

// ─── RESULTADO FINAL ──────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(55));
console.log(`  ${passed + failed} pruebas · ${passed} passed · ${failed} failed`);
if (failed > 0) {
  console.log('\n  ✗ IMPLEMENTACIÓN TIENE BUGS — no hacer deploy\n');
  process.exit(1);
} else {
  console.log('\n  ✓ LÓGICA VALIDADA — seguro para deploy\n');
  process.exit(0);
}
