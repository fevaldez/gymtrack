const BAR = 45;
const PLATES = [45, 35, 25, 10, 5, 2.5];

// Returns array of plates per side (for tests and display)
export function calcPlates(target) {
  if (target <= BAR) return [];
  let rem = Math.round((target - BAR) / 2 * 100) / 100;
  const p = [];
  for (const x of PLATES) { while (rem >= x - 0.001) { p.push(x); rem = Math.round((rem - x)*100)/100; } }
  return p;
}

// Returns { plates, actual } for PlateCalculator weight display
export function calcPlatesDetailed(target) {
  const plates = calcPlates(target);
  return { plates, actual: BAR + plates.reduce((a,b)=>a+b,0)*2 };
}
