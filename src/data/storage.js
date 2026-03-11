export const SK = "gymtrack_v2";

export async function loadGD() {
  try { return JSON.parse(localStorage.getItem(SK)||"{}"); } catch { return {}; }
}

export async function saveGD(d) {
  try { localStorage.setItem(SK, JSON.stringify(d)); } catch {}
}
