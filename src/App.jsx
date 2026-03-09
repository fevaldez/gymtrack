import { useState, useEffect, useRef } from "react";

if (typeof document !== "undefined") {
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&display=swap";
  document.head.appendChild(l);
}

const BAR = 45;
const PLATES = [45, 35, 25, 10, 5, 2.5];
const PLC = { 45:"#7C3AED",35:"#2563EB",25:"#16A34A",10:"#D97706",5:"#DC2626",2.5:"#71717A" };
const T = { bg:"#0A0A0B",s1:"#131316",s2:"#1C1C22",bd:"#26262E",acc:"#F59E0B",grn:"#22C55E",red:"#EF4444",t1:"#F4F4F5",t2:"#A1A1AA",t3:"#52525B" };
const BB = { fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"0.02em" };
const DM = { fontFamily:"'DM Mono',monospace" };
const DS = { fontFamily:"'DM Sans',sans-serif" };

function calcPlates(target) {
  if (target <= BAR) return { plates:[], actual:BAR };
  let rem = Math.round((target - BAR) / 2 * 100) / 100;
  const p = [];
  for (const x of PLATES) { while (rem >= x - 0.001) { p.push(x); rem = Math.round((rem - x)*100)/100; } }
  return { plates:p, actual: BAR + p.reduce((a,b)=>a+b,0)*2 };
}

const SK = "gymtrack_v2";
async function loadGD() {
  try { return JSON.parse(localStorage.getItem(SK)||"{}"); } catch { return {}; }
}
async function saveGD(d) {
  try { localStorage.setItem(SK, JSON.stringify(d)); } catch {}
}

const ROUTINES = {
  pecho: {
    id:"pecho",label:"Pecho",sub:"+ Tríceps",icon:"⬡",clr:"#F59E0B",grd:"rgba(245,158,11,0.07)",
    cutTime:{"45":["E"],"30":["D","E"]},bjjCut:[],
    bloques:[
      { id:"A",label:"Activación",tipo:"biserie",rest:30,ejercicios:[
        { id:"PA1",nombre:"Face Pull",desc:"Cable cuerda · polea alta",s:2,rMin:15,rMax:15,tempo:"2-1-2-1",rir:3,bar:false,
          cue:"Codos ARRIBA al nivel del hombro · termina con rotación externa · pulgares hacia atrás",
          swaps:["Band Face Pull","Rear Delt Cable Fly","Prone Y-Raise"] },
        { id:"PA2",nombre:"Cable Chest Press",desc:"Muy ligero · activación pecho",s:2,rMin:12,rMax:12,tempo:"2-0-2-0",rir:4,bar:false,
          cue:"Peso simbólico · activa pecho · NO involucres hombro anterior",
          swaps:["Pec Deck muy ligero","DB Fly muy ligero","Push-up lento"] },
      ]},
      { id:"B",label:"Fuerza Principal",tipo:"normal",rest:90,ejercicios:[
        { id:"PB1",nombre:"Machine Chest Press",desc:"Plano · pesado · 4 series",s:4,rMin:5,rMax:7,tempo:"3-1-1-0",rir:2,bar:false,
          cue:"Escápulas retractadas en el pad · empuja con PECHO · NO delta anterior",
          swaps:["Smith Bench Press pesado","DB Bench Press pesado","Barbell Bench Press"] },
      ]},
      { id:"C",label:"Fuerza Secundaria",tipo:"normal",rest:90,ejercicios:[
        { id:"PC1",nombre:"Smith Bench Press",desc:"Plano · estable",s:3,rMin:6,rMax:8,tempo:"3-1-1-0",rir:2,bar:true,
          cue:"Excéntrica 3s · pausa 1s abajo · explosivo arriba · barra a pecho bajo",
          swaps:["Barbell Bench Press","Machine Chest Press","DB Bench Press"] },
      ]},
      { id:"D",label:"Volumen + Tríceps",tipo:"biserie",rest:68,ejercicios:[
        { id:"PD1",nombre:"Smith Bench Volumen",desc:"~80% del peso de C",s:3,rMin:8,rMax:10,tempo:"2-0-2-0",rir:2,bar:true,
          cue:"Conecta pecho en cada rep · NO rebote abajo · fácil vs bloque C",
          swaps:["Cable Chest Press","Machine Press ligero","DB Bench ligero"] },
        { id:"PD2",nombre:"Rope Triceps Pushdown",desc:"Cable · cuerda",s:3,rMin:10,rMax:12,tempo:"2-0-2-1",rir:2,bar:false,
          cue:"Codos PEGADOS al torso · abre cuerda al final · pausa 1s abajo",
          swaps:["Bar Triceps Pushdown","Single-Arm Pushdown","Overhead Triceps Ext"] },
      ]},
      { id:"E",label:"Congestión",tipo:"biserie",rest:53,ejercicios:[
        { id:"PE1",nombre:"Cable Fly",desc:"Rango corto · hombro seguro",s:2,rMin:12,rMax:15,tempo:"2-1-2-0",rir:2,bar:false,shoulder:true,
          cue:"⚠️ Rango CORTO · NO crucen manos · squeeze 1s · hombro estable siempre",
          swaps:["Pec Deck Machine","DB Fly rango corto","Chest Press Machine ligero"] },
        { id:"PE2",nombre:"Single-Arm Cross Pushdown",desc:"Cable cruzado · un brazo",s:2,rMin:12,rMax:15,tempo:"2-1-2-0",rir:2,bar:false,
          cue:"Cruza al lado opuesto · codo pegado · contracción frente al cuerpo",
          swaps:["Two-Arm Pushdown","Dip Machine","Tricep Kickback cable"] },
      ]},
    ]
  },
  espalda: {
    id:"espalda",label:"Espalda",sub:"+ Bíceps",icon:"⬡",clr:"#3B82F6",grd:"rgba(59,130,246,0.07)",
    cutTime:{"45":["FIN","BIC"],"30":["FIN","BIC","EST"]},bjjCut:["EBIC2"],
    bloques:[
      { id:"WE",label:"Calentamiento",tipo:"calentamiento",rest:0,ejercicios:[
        { id:"EW1",nombre:"T-Spine Rotations",desc:"En banco",s:1,rMin:8,rMax:8,tempo:"2-0-2-0",rir:null,bar:false,
          cue:"Cadera QUIETA · rota solo desde torácica · asistencia con mano libre",
          swaps:["Cat-Cow en suelo","Thread the Needle","Foam Roller Thoracic"] },
        { id:"EW2",nombre:"Band External Rotation",desc:"Codo pegado · activación",s:2,rMin:15,rMax:20,tempo:"2-1-2-1",rir:4,bar:false,
          cue:"Sin dolor articular · quema en manguito rotador · NO hombro anterior",
          swaps:["Cable External Rotation","DB External Rotation","Side-lying ER"] },
      ]},
      { id:"EACT",label:"Activación Escápula",tipo:"normal",rest:45,ejercicios:[
        { id:"EACT1",nombre:"Scap Pull-ups / Scap Hang",desc:"Solo movimiento de escápula",s:2,rMin:8,rMax:10,tempo:"2-1-2-1",rir:3,bar:false,
          cue:"Codos RECTOS · deprime hombros · NO encoja trapecios · movimiento puro",
          swaps:["Scap Push-ups","Band Pull-Apart","Prone Y-T-W"] },
      ]},
      { id:"EF1",label:"Fuerza 1",tipo:"normal",rest:90,ejercicios:[
        { id:"EF1a",nombre:"Chest-Supported Neutral Row",desc:"Máquina o banco inclinado",s:4,rMin:6,rMax:8,tempo:"2-1-1-1",rir:2,bar:false,
          cue:"Manos = GANCHO · codo hacia bolsillo trasero · 1s iso en contracción",
          swaps:["Seated Cable Row","Barbell Row Pendlay","DB Row pecho en banco"] },
      ]},
      { id:"EF2",label:"Fuerza 2",tipo:"normal",rest:68,ejercicios:[
        { id:"EF2a",nombre:"Half-Kneeling 1-Arm Lat Pulldown",desc:"Polea alta · D-handle",s:3,rMin:8,rMax:10,tempo:"2-1-2-1",rir:2,bar:false,perSide:true,
          cue:"PRIMERO deprime escápula → LUEGO jalas · codo hacia hip al final",
          swaps:["Lat Pulldown neutral","Assisted Pull-up","Straight-Arm Cable Pulldown"] },
      ]},
      { id:"EUNI",label:"Unilateral",tipo:"normal",rest:75,ejercicios:[
        { id:"EUNI1",nombre:"Meadows Row Landmine",desc:"1 brazo · agarre pronado",s:3,rMin:8,rMax:10,tempo:"2-1-1-1",rir:2,bar:false,perSide:true,
          cue:"Agarre PRONADO detrás de los discos · jalón diagonal hacia cadera",
          swaps:["Single-Arm Cable Row alto","Single-Arm DB Row","Half-Kneeling Cable Row"] },
      ]},
      { id:"EVOL",label:"Volumen",tipo:"normal",rest:60,ejercicios:[
        { id:"EVOL1",nombre:"Seated Cable Row",desc:"Iso-hold 2s en contracción",s:3,rMin:10,rMax:12,tempo:"2-2-1-1",rir:2,bar:false,
          cue:"2s apretando escápulas · CERO columpio · controla la excéntrica",
          swaps:["Machine Row","Resistance Band Row","DB Row bilateral"] },
      ]},
      { id:"EST",label:"Estabilidad",tipo:"normal",rest:45,ejercicios:[
        { id:"EEST1",nombre:"Reverse Pec Deck",desc:"Reverse Fly machine",s:3,rMin:12,rMax:15,tempo:"2-1-2-1",rir:3,bar:false,
          cue:"Pecho FIJO al pad · cuello largo · NO trapecios · retrae escápulas",
          swaps:["Rear Delt Cable Fly","Band Pull-Apart","Face Pull bajo"] },
        { id:"EEST2",nombre:"Face Pull Polea Alta",desc:"Cable · polea alta",s:3,rMin:15,rMax:20,tempo:"2-1-2-1",rir:3,bar:false,
          cue:"Termina con rotación externa · pulgares ATRÁS · codos arriba al final",
          swaps:["Band Face Pull","Rear Delt DB Raise","Cable External Rotation"] },
      ]},
      { id:"BIC",label:"Bíceps",tipo:"normal",rest:53,ejercicios:[
        { id:"EBIC1",nombre:"Cable Rope Hammer Curl",desc:"Agarre neutro",s:3,rMin:10,rMax:12,tempo:"2-0-2-1",rir:2,bar:false,
          cue:"Muñeca NEUTRA (no gira) · codos pegados · pausa 1s arriba",
          swaps:["DB Hammer Curl","Cable Bar Curl neutro","Cross-Body Hammer Curl"] },
        { id:"EBIC2",nombre:"Preacher Curl Machine",desc:"O cable curl polea baja",s:2,rMin:12,rMax:15,tempo:"3-0-2-1",rir:2,bar:false,
          cue:"NO rebotes al fondo · excéntrica 3s · pausa 1s arriba",
          swaps:["EZ Bar Preacher Curl","DB Concentration Curl","Cable Curl polea baja"] },
      ]},
      { id:"FIN",label:"Finisher",tipo:"finisher",rest:38,ejercicios:[
        { id:"EFIN1",nombre:"Straight-Arm Cable Pulldown",desc:"Finisher opcional",s:2,rMin:12,rMax:15,tempo:"2-1-2-1",rir:2,bar:false,
          cue:"Brazos CASI rectos · dorsal puro · NO tríceps · arco hacia cadera",
          swaps:["Lat Prayer cable","Straight-Arm DB Pullover","Cable Pullover machine"] },
      ]},
    ]
  },
  hombro: {
    id:"hombro",label:"Hombros",sub:"Estabilidad + Fuerza",icon:"⬡",clr:"#10B981",grd:"rgba(16,185,129,0.07)",
    cutTime:{"45":["HC","HFIN"],"30":["HB2","HC","HFIN"]},bjjCut:[],
    bloques:[
      { id:"HW1",label:"Activación · Biserie",tipo:"biserie",rest:35,ejercicios:[
        { id:"HW1a",nombre:"Face Pull",desc:"Cable · activación manguito",s:2,rMin:15,rMax:15,tempo:"2-1-1-1",rir:4,bar:false,
          cue:"Codos ARRIBA · rotación externa al final · pulgares atrás · sin dolor",
          swaps:["Band Face Pull","Cable Rear Delt Fly ligero","Prone Y-Raise"] },
        { id:"HW1b",nombre:"Rotación Externa + Toalla",desc:"Banda/cable · por lado",s:2,rMin:12,rMax:12,tempo:"3-0-1-1",rir:4,bar:false,perSide:true,
          cue:"Codo pegado · rota hacia afuera · pausa 1s en rotación máxima · SIN dolor",
          swaps:["DB External Rotation tumbado","Cable ER bajo","Band ER sentado"] },
      ]},
      { id:"HW2",label:"Activación · Serratus",tipo:"normal",rest:30,ejercicios:[
        { id:"HW2a",nombre:"Serratus Wall Slides",desc:"Contra pared · 2 series",s:2,rMin:8,rMax:12,tempo:"2-1-1-1",rir:3,bar:false,
          cue:"Empuja la pared activamente con codos · desliza LENTO · activa serrato",
          swaps:["Floor Serratus Slides","Dead Bug brazos","Cable Serratus Press"] },
      ]},
      { id:"HW3",label:"Activación · Lateral",tipo:"normal",rest:30,ejercicios:[
        { id:"HW3a",nombre:"Elevación Lateral Ligera",desc:"1 serie · activación deltoides",s:1,rMin:15,rMax:15,tempo:"2-0-1-1",rir:4,bar:false,
          cue:"Muy ligero · codos ligeramente doblados · NO trapecios · solo deltoides medio",
          swaps:["Cable Lateral Raise","Band Lateral Raise","DB Lateral muy ligero"] },
      ]},
      { id:"HA",label:"Fuerza Principal",tipo:"normal",rest:90,ejercicios:[
        { id:"HA1",nombre:"DB Shoulder Press Neutro",desc:"Sentado · agarre neutro",s:4,rMin:6,rMax:8,tempo:"3-1-X-1",rir:2,bar:false,
          cue:"Agarre NEUTRO (palmas frente a frente) · rango seguro · escápulas estables",
          swaps:["Machine Shoulder Press","Cable Press neutro","Landmine Press bilateral"] },
        { id:"HA2",nombre:"Landmine Press Unilateral",desc:"Por lado · explosivo arriba",s:4,rMin:8,rMax:8,tempo:"2-1-X-1",rir:2,bar:true,perSide:true,
          cue:"Explosivo en concéntrica (X) · codo a 45° del torso · NO bloquees hombro arriba",
          swaps:["Half-Kneeling Cable Press","DB Press 1 brazo","Single-Arm Machine Press"] },
      ]},
      { id:"HB1",label:"Hipertrofia B1",tipo:"biserie",rest:68,ejercicios:[
        { id:"HB1a",nombre:"Lateral Raise Máquina/Cable",desc:"Deltoides medio · 10–12 reps",s:3,rMin:10,rMax:12,tempo:"2-0-1-1",rir:2,bar:false,
          cue:"Codos ligeramente doblados · NO encoja trapecios · pausa 1s arriba",
          swaps:["DB Lateral Raise","Band Lateral Raise","Cable Lateral Raise bajo"] },
        { id:"HB1b",nombre:"Reverse Fly / Rear Delt Rush",desc:"Rear delt · 12–15 reps",s:3,rMin:12,rMax:15,tempo:"3-0-1-0",rir:2,bar:false,
          cue:"Excéntrica controlada 3s · NO uses inercia · pecho fijo al pad",
          swaps:["Cable Rear Delt Fly","Band Pull-Apart","Face Pull medio"] },
      ]},
      { id:"HB2",label:"Hipertrofia B2",tipo:"biserie",rest:53,ejercicios:[
        { id:"HB2a",nombre:"Lateral Raise Parcial-Alargado",desc:"Rango bajo · estiramiento",s:2,rMin:12,rMax:15,tempo:"2-1-1-1",rir:2,bar:false,
          cue:"Solo rango inferior 0–60° · énfasis en estiramiento · pausa 1s abajo",
          swaps:["Cable Lateral Raise bajo","DB Lateral parcial","Band Lateral parcial"] },
        { id:"HB2b",nombre:"Rear Delt Row Ligero",desc:"Cable · face pull alto",s:2,rMin:12,rMax:15,tempo:"2-1-1-1",rir:2,bar:false,
          cue:"Agarre ancho · codo al nivel del hombro · SIN encogimiento de trapecios",
          swaps:["Face Pull alto","Band Face Pull ancho","DB Rear Delt Row"] },
      ]},
      { id:"HC",label:"Estabilidad Final",tipo:"biserie",rest:53,ejercicios:[
        { id:"HC1a",nombre:"Face Pull Ligero",desc:"Cable · polea alta · ligero",s:3,rMin:12,rMax:15,tempo:"2-1-1-1",rir:3,bar:false,
          cue:"Muy ligero · rotación externa al final · pulgares ATRÁS · codos arriba",
          swaps:["Band Face Pull","Cable Rear Delt ligero","Prone Y-T-W"] },
        { id:"HC1b",nombre:"Rotación Externa Ligera",desc:"Por lado · cable/banda",s:3,rMin:10,rMax:12,tempo:"3-0-1-1",rir:3,bar:false,perSide:true,
          cue:"LIGERO · codo pegado · rota hacia afuera · pausa 1s · SIN dolor",
          swaps:["DB External Rotation","Band ER","Side-lying ER sin peso"] },
      ]},
      { id:"HFIN",label:"Finisher · Pump",tipo:"finisher",rest:30,ejercicios:[
        { id:"HFIN1",nombre:"Lateral Raise Máquina Ligero",desc:"Set 1: 18–20 · Set 2: 12–15",s:2,rMin:12,rMax:20,tempo:"2-0-1-1",rir:2,bar:false,
          cue:"Solo si el hombro se siente MUY bien · pump final · NO aumentes carga",
          swaps:["Cable Lateral Raise ligero","Band Lateral Raise pump","DB Lateral pump"] },
      ]},
    ]
  }
};

function buildPlan(routine, ctx) {
  const skip = new Set([...(routine.cutTime?.[ctx.tiempo]||[]),...(ctx.bjj?routine.bjjCut||[]:[])]);
  const steps = [];
  for (const blk of routine.bloques) {
    if (skip.has(blk.id)) continue;
    const exs = blk.ejercicios.filter(ex=>!skip.has(ex.id));
    if (!exs.length) continue;
    if (blk.tipo==="biserie"&&exs.length===2) {
      const [e1,e2]=exs;
      for (let n=1;n<=e1.s;n++) {
        steps.push({ex:e1,blk,setNum:n,total:e1.s,biserie:true,paired:e2.nombre,last:false,rest:0});
        steps.push({ex:e2,blk,setNum:n,total:e1.s,biserie:true,paired:e1.nombre,last:true,rest:blk.rest});
      }
    } else {
      for (const ex of exs) {
        for (let n=1;n<=ex.s;n++) {
          steps.push({ex,blk,setNum:n,total:ex.s,biserie:false,paired:null,last:n===ex.s,rest:blk.tipo==="calentamiento"?0:blk.rest});
        }
      }
    }
  }
  return steps;
}

function RestTimer({secs,next,onDone,onSkip}) {
  const [rem,setRem]=useState(secs);
  useEffect(()=>{
    setRem(secs);
    const id=setInterval(()=>setRem(r=>{if(r<=1){clearInterval(id);onDone();return 0;}return r-1;}),1000);
    return()=>clearInterval(id);
  },[secs]);
  const pct=(1-rem/secs)*100,R=76,cx=90,cy=90,circ=2*Math.PI*R;
  return(
    <div style={{position:"fixed",inset:0,background:T.bg,zIndex:200,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <div style={{...DS,color:T.t3,fontSize:10,letterSpacing:4,marginBottom:32}}>DESCANSANDO</div>
      <svg width={180} height={180} viewBox="0 0 180 180">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={T.s2} strokeWidth={8}/>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={T.acc} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={circ-(pct/100)*circ}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
          style={{transition:"stroke-dashoffset 0.9s linear"}}/>
        <text x={cx} y={cy-4} textAnchor="middle" fill={T.t1} fontSize={68} fontFamily="'Bebas Neue',sans-serif">{rem}</text>
        <text x={cx} y={cy+22} textAnchor="middle" fill={T.t3} fontSize={11} fontFamily="'DM Mono',monospace">SEG</text>
      </svg>
      <div style={{display:"flex",gap:10,marginTop:24}}>
        {[-15,-10,10,15].map(a=>(
          <button key={a} onClick={()=>setRem(r=>Math.max(1,r+a))} style={{background:T.s2,border:`1px solid ${T.bd}`,borderRadius:10,padding:"9px 14px",color:a>0?T.grn:T.red,...DM,fontSize:12,cursor:"pointer"}}>
            {a>0?`+${a}`:a}s
          </button>
        ))}
      </div>
      {next&&(
        <div style={{marginTop:32,textAlign:"center",padding:"0 40px"}}>
          <div style={{...DS,color:T.t3,fontSize:10,letterSpacing:2,marginBottom:6}}>SIGUIENTE</div>
          <div style={{...BB,fontSize:28,color:T.t1}}>{next.ex.nombre}</div>
          <div style={{...DM,color:T.t2,fontSize:12,marginTop:4}}>S{next.setNum}/{next.total} · {next.ex.rMin}–{next.ex.rMax} reps</div>
          {next.biserie&&<div style={{display:"inline-block",background:`${T.acc}22`,color:T.acc,border:`1px solid ${T.acc}44`,borderRadius:6,padding:"3px 10px",...DM,fontSize:10,marginTop:8}}>BISERIE</div>}
        </div>
      )}
      <button onClick={onSkip} style={{marginTop:36,background:"none",border:`1px solid ${T.bd}`,borderRadius:12,padding:"11px 28px",color:T.t2,...DS,fontSize:13,cursor:"pointer"}}>
        Saltar descanso →
      </button>
    </div>
  );
}

function PlateModal({initW,onClose}) {
  const [w,setW]=useState(initW||135);
  const {plates,actual}=calcPlates(w);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:100,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div style={{background:T.s1,borderRadius:"20px 20px 0 0",padding:"24px 20px 48px",width:"100%",border:`1px solid ${T.bd}`}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{...BB,fontSize:28}}>Calculadora de Placas</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.t3,fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <input type="number" value={w} onChange={e=>setW(Math.max(BAR,Number(e.target.value)))}
          style={{background:T.bg,border:`1px solid ${T.bd}`,borderRadius:14,padding:10,color:T.t1,fontSize:56,...BB,width:"100%",textAlign:"center",outline:"none",marginBottom:6}}/>
        <div style={{...DS,color:T.t3,fontSize:11,textAlign:"center",marginBottom:14}}>lbs objetivo</div>
        <div style={{display:"flex",gap:6,marginBottom:20}}>
          {[-10,-5,-2.5,2.5,5,10].map(a=>(
            <button key={a} onClick={()=>setW(v=>Math.max(BAR,Math.round((v+a)*10)/10))}
              style={{flex:1,background:T.s2,border:`1px solid ${T.bd}`,borderRadius:8,padding:"9px 4px",color:a>0?T.grn:T.red,...DM,fontSize:11,cursor:"pointer"}}>
              {a>0?`+${a}`:a}
            </button>
          ))}
        </div>
        <div style={{background:T.bg,borderRadius:14,padding:16,marginBottom:12}}>
          <div style={{...DS,color:T.t3,fontSize:10,letterSpacing:2,marginBottom:14}}>BARRA 45 lbs + CADA LADO:</div>
          {plates.length===0
            ?<div style={{...DS,color:T.t2,textAlign:"center"}}>Solo barra — 45 lbs</div>
            :<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {plates.map((p,i)=>(
                <div key={i} style={{background:`${PLC[p]}22`,border:`2px solid ${PLC[p]}`,borderRadius:10,padding:"8px 14px",...BB,fontSize:24,color:PLC[p]}}>{p}</div>
              ))}
            </div>
          }
          <div style={{marginTop:14,...DS,color:T.t3,fontSize:12}}>
            Total real: <span style={{color:T.t1,fontWeight:700}}>{actual} lbs</span>
            {actual!==w&&<span style={{color:actual>w?T.red:T.grn,marginLeft:8}}>({actual>w?"+":""}{(actual-w).toFixed(1)})</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function SwapModal({ex,onClose}) {
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:100,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div style={{background:T.s1,borderRadius:"20px 20px 0 0",padding:"24px 20px 48px",width:"100%",border:`1px solid ${T.bd}`}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <div style={{...BB,fontSize:28}}>Alternativas</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.t3,fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{...DS,color:T.t3,fontSize:12,marginBottom:20}}>En lugar de: {ex.nombre}</div>
        {ex.swaps.map((s,i)=>(
          <div key={i} style={{background:T.s2,border:`1px solid ${T.bd}`,borderRadius:12,padding:"14px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
            <span style={{color:T.acc,...BB,fontSize:20}}>↪</span>
            <span style={{...DS,color:T.t1,fontSize:15}}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HomeScreen({gd,onSelect}) {
  return(
    <div style={{minHeight:"100vh",background:T.bg,color:T.t1,...DS,maxWidth:480,margin:"0 auto"}}>
      <div style={{padding:"56px 24px 24px"}}>
        <div style={{...DM,fontSize:10,letterSpacing:4,color:T.t3,marginBottom:4}}>V1 · GYMTRACK</div>
        <div style={{...BB,fontSize:64,lineHeight:0.9,marginBottom:8}}>
          <span style={{color:T.t1}}>TUS </span><span style={{color:T.acc}}>RU</span><span style={{color:T.t1}}>TINAS</span>
        </div>
        <div style={{...DS,color:T.t3,fontSize:13,marginTop:12}}>Selecciona · configura · entrena</div>
      </div>
      <div style={{padding:"8px 16px 40px"}}>
        {Object.values(ROUTINES).map(r=>{
          const lastDate=gd[r.bloques[Math.floor(r.bloques.length/2)]?.ejercicios[0]?.id]?.slice(-1)?.[0]?.date;
          const days=lastDate?Math.floor((Date.now()-new Date(lastDate))/86400000):null;
          return(
            <div key={r.id} onClick={()=>onSelect(r.id)}
              style={{background:T.s1,border:`1px solid ${T.bd}`,borderRadius:22,padding:"22px 22px 18px",marginBottom:10,cursor:"pointer",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,right:0,width:120,height:120,background:`radial-gradient(circle at top right,${r.clr}18,transparent 70%)`,pointerEvents:"none"}}/>
              <div style={{...BB,fontSize:46,lineHeight:1}}>{r.label}</div>
              <div style={{...DS,color:T.t3,fontSize:13,marginTop:2}}>{r.sub}</div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:16}}>
                <div style={{height:3,flex:1,background:T.s2,borderRadius:2,overflow:"hidden",marginRight:16}}>
                  <div style={{height:"100%",background:r.clr,borderRadius:2,width:days===null?"0%":days===0?"100%":`${Math.max(5,100-days*20)}%`}}/>
                </div>
                <div style={{...DM,fontSize:11,color:days===0?r.clr:T.t3}}>
                  {days===null?"Sin historial":days===0?"✓ Hoy":days===1?"Ayer":`Hace ${days}d`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{...DS,textAlign:"center",color:T.t3,fontSize:11,paddingBottom:32}}>
        {Object.keys(gd).length>0?`${Object.keys(gd).length} ejercicios con historial`:"Primera sesión — empieza aquí"}
      </div>
    </div>
  );
}

function ContextScreen({routine,ctx,setCtx,onBack,onStart}) {
  const prev=buildPlan(routine,ctx);
  const exCount=[...new Set(prev.map(s=>s.ex.id))].length;
  const Chip=({label,val,cur,onChange,clr=T.acc})=>(
    <button onClick={()=>onChange(val)} style={{flex:1,padding:"12px 6px",background:cur===val?`${clr}18`:T.s2,border:`1px solid ${cur===val?clr:T.bd}`,borderRadius:12,color:cur===val?clr:T.t3,...DS,fontSize:12,fontWeight:cur===val?700:400,cursor:"pointer",transition:"all 0.15s"}}>
      {label}
    </button>
  );
  return(
    <div style={{minHeight:"100vh",background:T.bg,color:T.t1,...DS,maxWidth:480,margin:"0 auto"}}>
      <div style={{padding:"20px 20px 16px",borderBottom:`1px solid ${T.bd}`,background:T.bg,position:"sticky",top:0,zIndex:10}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:T.t3,fontSize:13,cursor:"pointer",marginBottom:10}}>← Volver</button>
        <div style={{...BB,fontSize:40,color:routine.clr}}>{routine.label}</div>
        <div style={{...DS,color:T.t3,fontSize:13,marginTop:2}}>Configura la sesión de hoy</div>
      </div>
      <div style={{padding:"20px"}}>
        {[
          {label:"TIEMPO DISPONIBLE",opts:[["Completo ~70 min","completo"],["45 min","45"],["30 min","30"]],key:"tiempo"},
          {label:"BJJ EN LAS ÚLTIMAS 24H",opts:[["No",false],["Sí — reducir agarre",true]],key:"bjj",clr:T.red},
          {label:"ESTADO DEL HOMBRO",opts:[["Normal","normal"],["⚠️ Con cuidado","cuidado"]],key:"hombro",clr:"#FB923C"},
        ].map(cfg=>(
          <div key={cfg.key} style={{marginBottom:20}}>
            <div style={{...DM,color:T.t3,fontSize:10,letterSpacing:2,marginBottom:8}}>{cfg.label}</div>
            <div style={{display:"flex",gap:8}}>
              {cfg.opts.map(([l,v])=>(
                <Chip key={String(v)} label={l} val={v} cur={ctx[cfg.key]} onChange={val=>setCtx(c=>({...c,[cfg.key]:val}))} clr={cfg.clr||T.acc}/>
              ))}
            </div>
          </div>
        ))}
        <div style={{background:T.s1,border:`1px solid ${T.bd}`,borderRadius:16,padding:"18px 20px",marginBottom:24}}>
          <div style={{...DM,color:T.t3,fontSize:10,letterSpacing:2,marginBottom:16}}>SESIÓN CONFIGURADA</div>
          <div style={{display:"flex",gap:32,marginBottom:12}}>
            {[["sets",prev.length],["ejercicios",exCount],["bloques",new Set(prev.map(s=>s.blk.id)).size]].map(([l,v])=>(
              <div key={l}><div style={{...BB,fontSize:42,color:routine.clr}}>{v}</div><div style={{...DM,color:T.t3,fontSize:10}}>{l}</div></div>
            ))}
          </div>
          {ctx.bjj&&<div style={{background:`${T.red}11`,border:`1px solid ${T.red}33`,borderRadius:8,padding:"8px 12px",...DS,color:T.red,fontSize:12,marginTop:6}}>⚡ BJJ: volumen de agarre reducido</div>}
          {ctx.hombro==="cuidado"&&<div style={{background:"#FB923C11",border:"1px solid #FB923C33",borderRadius:8,padding:"8px 12px",...DS,color:"#FB923C",fontSize:12,marginTop:6}}>⚠️ Hombro: mantén rango seguro siempre</div>}
        </div>
        <button onClick={onStart} style={{width:"100%",background:routine.clr,color:"#000",border:"none",borderRadius:16,padding:"18px",...BB,fontSize:24,letterSpacing:1,cursor:"pointer"}}>
          INICIAR SESIÓN →
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [screen,setScreen]=useState("home");
  const [rid,setRid]=useState(null);
  const [ctx,setCtx]=useState({tiempo:"completo",bjj:false,hombro:"normal"});
  const [plan,setPlan]=useState([]);
  const [idx,setIdx]=useState(0);
  const [logs,setLogs]=useState({});
  const [prs,setPrs]=useState([]);
  const [gd,setGd]=useState({});
  const [gdReady,setGdReady]=useState(false);
  const [w,setW]=useState("");
  const [reps,setReps]=useState(null);
  const [rir,setRir]=useState(null);
  const [prFlash,setPrFlash]=useState(false);
  const [showPlates,setShowPlates]=useState(false);
  const [showSwap,setShowSwap]=useState(false);
  const [showRest,setShowRest]=useState(false);
  const [restSecs,setRestSecs]=useState(0);
  const [elapsed,setElapsed]=useState(0);
  const startRef=useRef(null);

  useEffect(()=>{loadGD().then(d=>{setGd(d);setGdReady(true);});},[]);
  useEffect(()=>{if(gdReady)saveGD(gd);},[gd,gdReady]);
  useEffect(()=>{
    if(screen!=="session")return;
    const id=setInterval(()=>setElapsed(Math.floor((Date.now()-startRef.current)/1000)),1000);
    return()=>clearInterval(id);
  },[screen]);

  const routine=rid?ROUTINES[rid]:null;
  const step=plan[idx];
  const nextStep=plan[idx+1]||null;
  const lastW=id=>{const s=gd[id];if(!s?.length)return null;return s[s.length-1]?.sets?.[0]?.w??null;};
  const maxW=id=>{const s=gd[id]||[];const all=s.flatMap(x=>x.sets?.map(y=>y.w||0)||[]);return all.length?Math.max(...all):0;};

  useEffect(()=>{
    if(!step)return;
    setW(lastW(step.ex.id)?String(lastW(step.ex.id)):"");
    setReps(null);setRir(null);
  },[idx,plan]);

  function startSession(){
    const p=buildPlan(routine,ctx);
    setPlan(p);setIdx(0);setLogs({});setPrs([]);
    startRef.current=Date.now();setElapsed(0);
    setScreen("session");
  }

  function logSet(){
    const wn=parseFloat(w);if(!wn||reps===null||rir===null)return;
    const ex=step.ex;
    const prevMax=maxW(ex.id);
    if(prevMax>0&&wn>prevMax){setPrs(p=>[...p.filter(x=>x.id!==ex.id),{id:ex.id,name:ex.nombre,w:wn}]);setPrFlash(true);setTimeout(()=>setPrFlash(false),3000);}
    const today=new Date().toDateString();
    setGd(prev=>{
      const sessions=prev[ex.id]||[];
      const ti=sessions.findIndex(s=>new Date(s.date).toDateString()===today);
      const ns={w:wn,reps,rir};
      if(ti>=0){const u=[...sessions];u[ti]={...u[ti],sets:[...u[ti].sets,ns]};return{...prev,[ex.id]:u};}
      return{...prev,[ex.id]:[...sessions.slice(-19),{date:new Date().toISOString(),sets:[ns]}]};
    });
    setLogs(prev=>({...prev,[ex.id]:[...(prev[ex.id]||[]),{w:wn,reps,rir}]}));
    if(step.rest>0){setRestSecs(step.rest);setShowRest(true);}else{advance();}
  }

  function advance(){setShowRest(false);if(idx>=plan.length-1)setScreen("summary");else setIdx(i=>i+1);}

  const elStr=`${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,"0")}`;
  const pct=plan.length>0?(idx/plan.length)*100:0;

  if(screen==="home")return<HomeScreen gd={gd} onSelect={id=>{setRid(id);setCtx({tiempo:"completo",bjj:false,hombro:"normal"});setScreen("context");}}/>;
  if(screen==="context"&&routine)return<ContextScreen routine={routine} ctx={ctx} setCtx={setCtx} onBack={()=>setScreen("home")} onStart={startSession}/>;

  if(screen==="session"&&step){
    const ex=step.ex;
    const lw=lastW(ex.id);
    const mx=maxW(ex.id);
    const todaySets=logs[ex.id]||[];
    const wn=parseFloat(w)||0;
    const canLog=wn>0&&reps!==null&&rir!==null;
    const rOpts=[];for(let r=Math.max(1,ex.rMin-1);r<=ex.rMax+2;r++)rOpts.push(r);

    return(
      <div style={{minHeight:"100vh",background:T.bg,color:T.t1,...DS,maxWidth:480,margin:"0 auto",paddingBottom:60}}>
        <div style={{position:"fixed",top:0,left:0,right:0,height:300,background:`radial-gradient(ellipse at top,${routine.clr}12,transparent 70%)`,pointerEvents:"none",zIndex:0}}/>
        {prFlash&&<div style={{position:"fixed",top:0,left:0,right:0,zIndex:300,background:T.acc,color:"#000",padding:"16px",...BB,fontSize:20,textAlign:"center",letterSpacing:1}}>🏆 NUEVO RÉCORD PERSONAL!</div>}
        <div style={{padding:"16px 18px 12px",borderBottom:`1px solid ${T.bd}`,background:`${T.bg}EE`,position:"sticky",top:0,zIndex:10,backdropFilter:"blur(12px)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{...BB,fontSize:16,color:routine.clr,letterSpacing:1}}>{routine.label.toUpperCase()}</div>
            <div style={{...DM,fontSize:12,color:T.t3}}>{elStr} · {idx+1}/{plan.length}</div>
          </div>
          <div style={{height:3,background:T.s2,borderRadius:2,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${pct}%`,background:routine.clr,borderRadius:2,transition:"width 0.5s"}}/>
          </div>
        </div>
        <div style={{margin:"12px 12px 0",background:T.s1,border:`1px solid ${T.bd}`,borderRadius:22,padding:"18px 18px 16px",position:"relative",zIndex:1}}>
          <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
            <span style={{background:T.s2,borderRadius:6,padding:"3px 10px",...DM,fontSize:10,color:T.t3}}>{step.blk.label}</span>
            {step.biserie&&<span style={{background:`${routine.clr}22`,color:routine.clr,border:`1px solid ${routine.clr}44`,borderRadius:6,padding:"3px 10px",...DM,fontSize:10}}>BISERIE → {step.paired}</span>}
            {ex.shoulder&&ctx.hombro==="cuidado"&&<span style={{background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,borderRadius:6,padding:"3px 10px",...DM,fontSize:10}}>⚠️ RANGO SEGURO</span>}
          </div>
          <div style={{...BB,fontSize:38,lineHeight:1.05,marginBottom:4}}>{ex.nombre}</div>
          <div style={{...DS,color:T.t3,fontSize:13,marginBottom:14}}>{ex.desc}</div>
          <div style={{display:"flex",background:T.bg,borderRadius:12,overflow:"hidden",border:`1px solid ${T.bd}`}}>
            {[{l:"SERIE",v:`${step.setNum}/${step.total}`},{l:"REPS",v:`${ex.rMin}–${ex.rMax}${ex.perSide?"/l":""}`},{l:"TEMPO",v:ex.tempo},...(ex.rir!==null?[{l:"RIR",v:String(ex.rir)}]:[])].map((m,i,arr)=>(
              <div key={i} style={{flex:1,padding:"10px 4px",textAlign:"center",borderRight:i<arr.length-1?`1px solid ${T.bd}`:"none"}}>
                <div style={{...DM,color:T.t3,fontSize:8,letterSpacing:1,marginBottom:3}}>{m.l}</div>
                <div style={{...DM,fontSize:15,fontWeight:500,color:T.t1}}>{m.v}</div>
              </div>
            ))}
          </div>
          <div style={{background:T.bg,borderRadius:10,padding:"10px 12px",marginTop:12,borderLeft:`3px solid ${routine.clr}`}}>
            <div style={{...DM,color:routine.clr,fontSize:8,letterSpacing:2,marginBottom:4}}>CLAVE 0.1%</div>
            <div style={{...DS,color:T.t2,fontSize:13,lineHeight:1.6}}>{ex.cue}</div>
          </div>
        </div>
        <div style={{margin:"10px 12px 0",background:T.s1,border:`1px solid ${T.bd}`,borderRadius:22,padding:"16px 18px",position:"relative",zIndex:1}}>
          {(lw||todaySets.length>0)&&(
            <div style={{display:"flex",justifyContent:"space-between",background:T.bg,borderRadius:8,padding:"8px 12px",marginBottom:14,...DM,fontSize:12,color:T.t3}}>
              {lw&&<span>Anterior: <span style={{color:T.t1,fontWeight:500}}>{lw} lbs</span></span>}
              {mx>0&&<span>PR: <span style={{color:T.acc,fontWeight:500}}>{mx} lbs</span></span>}
            </div>
          )}
          {todaySets.length>0&&(
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
              {todaySets.map((s,i)=>(
                <div key={i} style={{background:T.s2,border:`1px solid ${T.bd}`,borderRadius:8,padding:"5px 10px",...DM,fontSize:11,color:T.t2}}>
                  {s.w}<span style={{color:T.t3}}>lb</span>×{s.reps}<span style={{color:T.t3}}> R{s.rir}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{marginBottom:12}}>
            <div style={{...DM,color:T.t3,fontSize:9,letterSpacing:2,marginBottom:6}}>PESO (lbs)</div>
            <input type="number" value={w} onChange={e=>setW(e.target.value)} placeholder={lw||"135"}
              style={{background:T.bg,border:`1px solid ${w?routine.clr:T.bd}`,borderRadius:12,padding:"10px 14px",color:T.t1,fontSize:44,...BB,width:"100%",textAlign:"center",outline:"none",transition:"border-color 0.2s"}}/>
            <div style={{display:"flex",gap:5,marginTop:7}}>
              {[-10,-5,-2.5,2.5,5,10].map(a=>(
                <button key={a} onClick={()=>setW(v=>String(Math.max(0,Math.round((parseFloat(v||0)+a)*10)/10)))}
                  style={{flex:1,background:T.s2,border:`1px solid ${T.bd}`,borderRadius:8,padding:"8px 3px",color:a>0?T.grn:T.red,...DM,fontSize:11,cursor:"pointer"}}>
                  {a>0?`+${a}`:a}
                </button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{...DM,color:T.t3,fontSize:9,letterSpacing:2,marginBottom:6}}>REPS{ex.perSide?" / LADO":""}</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {rOpts.map(r=>(
                <button key={r} onClick={()=>setReps(r)}
                  style={{flex:"0 0 calc(16.5% - 4px)",padding:"12px 4px",background:reps===r?routine.clr:T.s2,border:`1px solid ${reps===r?routine.clr:T.bd}`,borderRadius:10,color:reps===r?"#000":T.t2,...BB,fontSize:20,cursor:"pointer",textAlign:"center",transition:"all 0.12s"}}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{...DM,color:T.t3,fontSize:9,letterSpacing:2,marginBottom:6}}>RIR — REPS EN RESERVA</div>
            <div style={{display:"flex",gap:5}}>
              {[0,1,2,3,4].map(r=>{
                const clr=r<=1?T.red:r===2?T.acc:T.grn;
                return(
                  <button key={r} onClick={()=>setRir(r)}
                    style={{flex:1,padding:"14px 4px",background:rir===r?clr:T.s2,border:`1px solid ${rir===r?clr:T.bd}`,borderRadius:10,color:rir===r?"#000":T.t2,...BB,fontSize:24,cursor:"pointer",transition:"all 0.12s"}}>
                    {r}
                  </button>
                );
              })}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:4,...DM,color:T.t3,fontSize:9}}>
              <span>Al fallo</span><span>Fácil</span>
            </div>
          </div>
          <button onClick={logSet} disabled={!canLog}
            style={{width:"100%",background:canLog?routine.clr:T.s2,color:canLog?"#000":T.t3,border:"none",borderRadius:14,padding:"17px",...BB,fontSize:22,letterSpacing:1,cursor:canLog?"pointer":"default",transition:"all 0.2s"}}>
            REGISTRAR SET →
          </button>
        </div>
        <div style={{display:"flex",gap:8,margin:"10px 12px 0",position:"relative",zIndex:1}}>
          {[["🔢 Placas",()=>setShowPlates(true)],["🔄 Cambiar",()=>setShowSwap(true)],["⏭ Saltar",advance]].map(([l,f])=>(
            <button key={l} onClick={f} style={{flex:1,background:T.s1,border:`1px solid ${T.bd}`,borderRadius:12,padding:"13px 6px",color:T.t2,...DS,fontSize:12,fontWeight:600,cursor:"pointer"}}>{l}</button>
          ))}
        </div>
        {showPlates&&<PlateModal initW={wn||lw||135} onClose={()=>setShowPlates(false)}/>}
        {showSwap&&<SwapModal ex={ex} onClose={()=>setShowSwap(false)}/>}
        {showRest&&<RestTimer secs={restSecs} next={nextStep} onDone={advance} onSkip={advance}/>}
      </div>
    );
  }

  if(screen==="summary"){
    const totalSets=Object.values(logs).reduce((a,b)=>a+b.length,0);
    const totalVol=Object.values(logs).reduce((a,sets)=>a+sets.reduce((s,x)=>s+(x.w||0)*(x.reps||0),0),0);
    return(
      <div style={{minHeight:"100vh",background:T.bg,color:T.t1,...DS,maxWidth:480,margin:"0 auto",padding:"52px 22px 48px"}}>
        <div style={{position:"fixed",top:0,left:0,right:0,height:300,background:`radial-gradient(ellipse at top,${routine.clr}15,transparent 70%)`,pointerEvents:"none"}}/>
        <div style={{...DM,fontSize:10,letterSpacing:4,color:T.t3,marginBottom:6,position:"relative"}}>SESIÓN COMPLETADA</div>
        <div style={{...BB,fontSize:58,lineHeight:0.95,marginBottom:6,position:"relative"}}>{routine.label}</div>
        <div style={{...DS,color:T.t3,fontSize:13,marginBottom:36,position:"relative"}}>{elStr} · {totalSets} sets</div>
        {prs.length>0&&(
          <div style={{background:`${T.acc}0F`,border:`1px solid ${T.acc}33`,borderRadius:18,padding:"18px 20px",marginBottom:14,position:"relative"}}>
            <div style={{...BB,fontSize:22,color:T.acc,marginBottom:12}}>🏆 Récords Personales</div>
            {prs.map((p,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:6,...DS,fontSize:14}}>
                <span style={{color:T.t2}}>{p.name}</span>
                <span style={{...DM,color:T.acc}}>{p.w} lbs</span>
              </div>
            ))}
          </div>
        )}
        <div style={{background:T.s1,border:`1px solid ${T.bd}`,borderRadius:18,padding:"18px 20px",marginBottom:14,position:"relative"}}>
          <div style={{...DM,color:T.t3,fontSize:10,letterSpacing:2,marginBottom:16}}>ESTADÍSTICAS</div>
          <div style={{display:"flex",gap:32}}>
            {[["sets",totalSets],["vol",`${Math.round(totalVol/1000)}k`],["tiempo",elStr]].map(([l,v])=>(
              <div key={l}><div style={{...BB,fontSize:38,color:routine.clr}}>{v}</div><div style={{...DM,color:T.t3,fontSize:10}}>{l}</div></div>
            ))}
          </div>
        </div>
        <div style={{background:T.s1,border:`1px solid ${T.bd}`,borderRadius:18,padding:"18px 20px",marginBottom:32,position:"relative"}}>
          <div style={{...DM,color:T.t3,fontSize:10,letterSpacing:2,marginBottom:10}}>PRÓXIMA SESIÓN</div>
          <div style={{...DS,color:T.t2,fontSize:13,lineHeight:1.7}}>
            Completaste el tope del rango con RIR objetivo → sube <strong style={{color:T.t1}}>2.5–5%</strong> la próxima vez. No llegaste al tope → mantén el peso.
          </div>
        </div>
        <button onClick={()=>{setScreen("home");setRid(null);setPlan([]);setIdx(0);setLogs({});setPrs([]);setElapsed(0);}}
          style={{width:"100%",background:routine.clr,color:"#000",border:"none",borderRadius:16,padding:"18px",...BB,fontSize:24,letterSpacing:1,cursor:"pointer",position:"relative"}}>
          VOLVER AL INICIO
        </button>
      </div>
    );
  }
  return null;
}
