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
    setScreen("context");
  }

  function goToBrief() {
    const ds = new Set();
    routine.bloques.forEach(blk => blk.ejercicios.forEach(ex => { if (ex.defaultSkip) ds.add(ex.id); }));
    setSessionSkip(ds);
    setScreen("brief");
  }

  function startSession() {
    const p = buildPlan(routine, ctx, sessionSkip, sessionOverride, sessionLinks);
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
  }

  function goHome() {
    setScreen("home"); setRid(null); setPlan([]); setIdx(0);
    setLogs({}); setPrs([]); setElapsed(0);
    setSessionSkip(new Set()); setSessionOverride({});
    setSessionLinks([]); setLinkingFrom(null);
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
      gd={gd} onStart={startSession} onBack={() => setScreen("context")}
    />
  );
  if (screen === "session" && plan[idx]) return (
    <SessionScreen
      routine={routine} ctx={ctx} plan={plan} idx={idx} setIdx={setIdx}
      logs={logs} setLogs={setLogs} prs={prs} setPrs={setPrs}
      elapsed={elapsed} gd={gd} setGd={setGd}
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
