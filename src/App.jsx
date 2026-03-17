import { useState, useEffect, useRef } from "react";
import { ROUTINES } from './data/routines.js';
import { loadGD } from './data/storage.js';
import { buildPlan } from './logic/buildPlan.js';
import { HomeScreen } from './screens/HomeScreen.jsx';
import { ContextScreen } from './screens/ContextScreen.jsx';
import { BriefScreen } from './screens/BriefScreen.jsx';
import { SessionScreen } from './screens/SessionScreen.jsx';
import { SummaryScreen } from './screens/SummaryScreen.jsx';
import { HistoryScreen } from './screens/HistoryScreen.jsx';

if (typeof document !== "undefined") {
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&display=swap";
  document.head.appendChild(l);
}

function reorderPlan(plan, sessionOrder) {
  if (!sessionOrder.length) return plan;
  const runs = [];
  let i = 0;
  while (i < plan.length) {
    const exIds = new Set([plan[i].ex.id]);
    if (plan[i].biserie && i + 1 < plan.length && plan[i + 1].biserie) {
      exIds.add(plan[i + 1].ex.id);
    }
    const run = [];
    while (i < plan.length && exIds.has(plan[i].ex.id)) { run.push(plan[i]); i++; }
    runs.push({ exIds: [...exIds], steps: run });
  }
  const visited = new Set();
  const ordered = [];
  for (const id of sessionOrder) {
    const run = runs.find(r => r.exIds.includes(id) && !visited.has(r));
    if (run) { ordered.push(run); visited.add(run); }
  }
  for (const run of runs) { if (!visited.has(run)) ordered.push(run); }
  return ordered.flatMap(r => r.steps);
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [rid, setRid] = useState(null);
  const [ctx, setCtx] = useState({ tiempo: "completo", bjj: false, hombro: "normal" });
  const [plan, setPlan] = useState([]);
  const [idx, setIdx] = useState(0);
  const [logs, setLogs] = useState({});
  const [prs, setPrs] = useState([]);
  const [gd, setGd] = useState({});
  const [gdReady, setGdReady] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sessionSkip, setSessionSkip] = useState(new Set());
  const [sessionOverride, setSessionOverride] = useState({});
  const [sessionLinks, setSessionLinks] = useState([]);
  const [linkingFrom, setLinkingFrom] = useState(null);
  const [brokenLinks, setBrokenLinks] = useState(new Set());
  const [sessionSwaps, setSessionSwaps] = useState({});
  const [sessionOrder, setSessionOrder] = useState([]);
  const [sessionOverrideReps, setSessionOverrideReps] = useState({});
  const startRef = useRef(null);

  useEffect(() => { loadGD().then(d => { setGd(d); setGdReady(true); }); }, []);
  useEffect(() => {
    if (screen !== "session") return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [screen]);

  const routine = rid ? ROUTINES[rid] : null;

  function selectRoutine(id) {
    setRid(id);
    setCtx({ tiempo: "completo", bjj: false, hombro: "normal" });
    setSessionSkip(new Set());
    setSessionOverride({});
    setSessionLinks([]);
    setLinkingFrom(null);
    setBrokenLinks(new Set());
    setSessionSwaps({});
    setSessionOrder([]);
    setSessionOverrideReps({});
    setScreen("context");
  }

  function goToBrief() {
    const ds = new Set();
    routine.bloques.forEach(blk => blk.ejercicios.forEach(ex => { if (ex.defaultSkip) ds.add(ex.id); }));
    setSessionSkip(ds);
    setScreen("brief");
  }

  function startSession() {
    window.scrollTo({ top: 0, behavior: "instant" });
    let p = buildPlan(routine, ctx, sessionSkip, sessionOverride, sessionLinks);

    // Patch broken schema biseries out of the plan before session starts
    if (brokenLinks.size > 0) {
      p = p.map((step, i, arr) => {
        if (!step.biserie) return step;
        const partner =
          (arr[i + 1]?.biserie && arr[i + 1].blk.id === step.blk.id) ? arr[i + 1]
          : (arr[i - 1]?.biserie && arr[i - 1].blk.id === step.blk.id) ? arr[i - 1]
          : null;
        if (!partner) return step;
        const key = [step.ex.id, partner.ex.id].sort().join('|');
        if (brokenLinks.has(key)) {
          return { ...step, biserie: false, paired: null, rest: step.blk.rest };
        }
        return step;
      });
    }

    if (sessionOrder.length) p = reorderPlan(p, sessionOrder);
    setPlan(p); setIdx(0); setLogs({}); setPrs([]);
    startRef.current = Date.now(); setElapsed(0);
    setScreen("session");
  }

  function handleComplete() {
    setScreen("summary");
  }

  function handleAbandon() {
    setScreen("home"); setRid(null); setPlan([]); setIdx(0);
    setLogs({}); setPrs([]); setElapsed(0);
    setSessionSkip(new Set()); setSessionOverride({});
    setSessionLinks([]); setLinkingFrom(null);
    setBrokenLinks(new Set());
    setSessionSwaps({}); setSessionOrder([]); setSessionOverrideReps({});
  }

  function goHome() {
    setScreen("home"); setRid(null); setPlan([]); setIdx(0);
    setLogs({}); setPrs([]); setElapsed(0);
    setSessionSkip(new Set()); setSessionOverride({});
    setSessionLinks([]); setLinkingFrom(null);
    setBrokenLinks(new Set());
    setSessionSwaps({}); setSessionOrder([]); setSessionOverrideReps({});
  }

  if (screen === "home") return <HomeScreen gd={gd} onSelect={selectRoutine} onHistory={() => setScreen("history")} />;
  if (screen === "history") return <HistoryScreen gd={gd} setGd={setGd} onBack={() => setScreen("home")} />;
  if (screen === "context" && routine) return <ContextScreen routine={routine} ctx={ctx} setCtx={setCtx} onBack={() => setScreen("home")} onBrief={goToBrief} />;
  if (screen === "brief" && routine) return (
    <BriefScreen
      routine={routine} ctx={ctx}
      sessionSkip={sessionSkip} setSessionSkip={setSessionSkip}
      sessionOverride={sessionOverride} setSessionOverride={setSessionOverride}
      sessionLinks={sessionLinks} setSessionLinks={setSessionLinks}
      linkingFrom={linkingFrom} setLinkingFrom={setLinkingFrom}
      brokenLinks={brokenLinks} setBrokenLinks={setBrokenLinks}
      sessionSwaps={sessionSwaps} setSessionSwaps={setSessionSwaps}
      sessionOrder={sessionOrder} setSessionOrder={setSessionOrder}
      sessionOverrideReps={sessionOverrideReps} setSessionOverrideReps={setSessionOverrideReps}
      gd={gd} onStart={startSession} onBack={() => setScreen("context")}
    />
  );
  if (screen === "session" && plan[idx]) return (
    <SessionScreen
      routine={routine} ctx={ctx} plan={plan} idx={idx} setIdx={setIdx}
      setPlan={setPlan}
      logs={logs} setLogs={setLogs} prs={prs} setPrs={setPrs}
      elapsed={elapsed} gd={gd} setGd={setGd}
      sessionSwaps={sessionSwaps} setSessionSwaps={setSessionSwaps}
      sessionOverrideReps={sessionOverrideReps}
      onComplete={handleComplete} onAbandon={handleAbandon}
    />
  );
  if (screen === "summary" && routine) return (
    <SummaryScreen
      routine={routine} logs={logs} prs={prs} elapsed={elapsed}
      gd={gd} onHome={goHome}
    />
  );
  return null;
}
