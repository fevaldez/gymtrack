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
const BAR_OPTIONS = [
  { label:"Olímpica", weight:45 },
  { label:"Smith",    weight:15 },
  { label:"Damas",   weight:35 },
  { label:"Sin barra", weight:0 },
];
const PLATE_DENOMINATIONS = [45, 35, 25, 10, 5, 2.5];
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

// ─── HOW TO ADD A NEW ROUTINE ────────────────────────────────────────────────
// 1. Add a new key to ROUTINES (e.g. piernas: { id:"piernas", ... })
// 2. Required top-level fields:
//    id        — unique string key matching the object key
//    label     — display name (Bebas Neue heading)
//    sub       — subtitle shown on home card
//    icon      — SVG/emoji (reserved for future use)
//    clr       — accent color hex string for this routine
//    grd       — radial gradient string (rgba of clr at ~0.07 opacity)
//    cutTime   — { "45": [blkId,...], "30": [blkId,...] } blocks to skip when time is short
//    bjjCut    — [exId,...] individual exercise IDs to skip after BJJ
//    bloques   — array of bloque objects (see below)
//
// BLOQUE fields:
//    id        — unique string (used in cutTime / bjjCut references)
//    label     — display name for the block header
//    tipo      — "normal" | "biserie" | "calentamiento" | "finisher"
//    rest      — rest seconds after each set (0 for calentamiento)
//    ejercicios — array of exercise objects (see below)
//
// EXERCISE fields:
//    id        — unique string (also used as localStorage key — keep stable!)
//    nombre    — display name
//    desc      — short descriptor line
//    s         — default number of sets
//    rMin/rMax — rep range
//    tempo     — tempo string e.g. "3-1-1-0"
//    rir       — target reps-in-reserve (null for calentamiento/warmup)
//    bar       — true if uses barbell (shows plates calculator by default)
//    perSide   — true if reps counted per side
//    shoulder  — true if shoulder-sensitive (flagged when ctx.hombro==="cuidado")
//    cue       — coaching cue text shown in session card
//    swaps     — array of 3 alternative exercise name strings
// ─────────────────────────────────────────────────────────────────────────────
const ROUTINES = {
  pecho: {
    id:"pecho",label:"Pecho + Tríceps",sub:"Fuerza + Volumen",icon:"◈",clr:"#F59E0B",grd:"rgba(245,158,11,0.07)",
    cutTime:{"45":["blk_F"],"30":["blk_E","blk_E3","blk_F"]},bjjCut:["PE3"],
    bloques:[
      { id:"blk_A",label:"Activación (Biserie)",tipo:"biserie",rest:30,ejercicios:[
        { id:"PA1",nombre:"Face Pull",desc:"polea, ligero",s:2,rMin:15,rMax:15,tempo:"2-1-2-1",rir:3,bar:false,
          cue:"Lleva cuerda a cejas/nariz, hombros lejos de orejas, abre clavículas.",swaps:[] },
        { id:"PA2",nombre:"Cable Chest Press ligero",desc:"activación pecho",s:2,rMin:12,rMax:12,tempo:"2-0-2-0",rir:3,bar:false,
          cue:"No busques fatiga; solo activar pecho con hombro estable.",swaps:[] },
      ]},
      { id:"blk_B",label:"Fuerza Principal",tipo:"normal",rest:90,ejercicios:[
        { id:"PB",nombre:"Machine / Lever Chest Press plano",desc:"fuerza base",s:4,rMin:5,rMax:7,tempo:"3-1-1-0",rir:1,bar:false,
          cue:"Asiento a línea media del pecho; pausa real abajo; no bloquees codos.",swaps:[] },
      ]},
      { id:"blk_C",label:"Fuerza Secundaria",tipo:"normal",rest:90,ejercicios:[
        { id:"PC",nombre:"Smith Bench Press plano",desc:"fuerza secundaria",s:3,rMin:6,rMax:8,tempo:"3-1-1-0",rir:1,bar:false,
          cue:"Baja a pecho bajo, codos 30–45°, muñecas neutras, cero rebote.",
          swaps:["Machine Chest Press pesada — mejor reemplazo si Smith ocupada","Cable Bench Press — mantén tensión continua, controla más la bajada","Standing Single-Arm Cable Press — split stance, abdomen firme, no gires torso"] },
      ]},
      { id:"blk_D",label:"Biserie Pecho + Tríceps",tipo:"biserie",rest:60,ejercicios:[
        { id:"PD1",nombre:"Smith Bench Press volumen",desc:"hipertrofia pecho",s:3,rMin:8,rMax:10,tempo:"2-0-2-0",rir:2,bar:false,
          cue:"Usa menos carga que en C; aquí manda control, tensión y densidad.",
          swaps:["Cable Bench Press — mejor reemplazo de D1 si Smith ocupada","Standing Cable Press — muy práctico cuando Rush está lleno","Machine Chest Press moderada — máxima estabilidad, cero complicación","Cable Single-Arm Bench Press — control unilateral y balance entre lados"] },
        { id:"PD2",nombre:"Rope Triceps Pushdown",desc:"tríceps biserie",s:4,rMin:10,rMax:12,tempo:"2-0-2-1",rir:2,bar:false,
          cue:"Codos pegados; separa la cuerda abajo y aprieta 1s.",swaps:[] },
      ]},
      { id:"blk_E",label:"Biserie Congestión Final",tipo:"biserie",rest:45,ejercicios:[
        { id:"PE1",nombre:"Cable Fly rango corto seguro",desc:"congestión pecho",s:3,rMin:12,rMax:15,tempo:"2-1-2-0",rir:2,bar:false,
          cue:"No abras de más; piensa en abrazar, no en estirar profundo.",swaps:[] },
        { id:"PE2",nombre:"Single-Arm Cross Pushdown",desc:"congestión tríceps",s:3,rMin:12,rMax:15,tempo:"2-1-2-0",rir:2,bar:false,perSide:true,
          cue:"Hombro quieto, cero balanceo, recorrido corto y limpio.",swaps:[] },
      ]},
      { id:"blk_E3",label:"Tríceps Opcional",tipo:"normal",rest:45,ejercicios:[
        { id:"PE3",nombre:"Reverse-Grip Pushdown",desc:"solo si terminaste bien y hombro OK",s:2,rMin:12,rMax:15,tempo:"2-1-2-0",rir:2,bar:false,
          defaultSkip:true,cue:"Hazlo estricto, ligero-moderado; busca bombeo, no ego.",
          swaps:["Cable Kickback — mismas reglas, busca bombeo"] },
      ]},
      { id:"blk_F",label:"Enfriamiento",tipo:"normal",rest:20,ejercicios:[
        { id:"PF1",nombre:"Respiración nasal / downregulation",desc:"1–2 min",s:1,rMin:60,rMax:120,tempo:"—",rir:4,bar:false,noLog:true,
          cue:"Exhala largo para bajar pulsaciones y acelerar recuperación.",swaps:[] },
        { id:"PF2",nombre:"Retracción / depresión escapular suave",desc:"movilidad",s:2,rMin:10,rMax:15,tempo:"controlado",rir:4,bar:false,noLog:true,
          cue:"Movimiento corto, limpio, sin agresividad.",swaps:[] },
        { id:"PF3",nombre:"Estiramiento de pecho en pared",desc:"20–30s/lado",s:2,rMin:20,rMax:30,tempo:"—",rir:4,bar:false,perSide:true,noLog:true,
          cue:"Brazo a 45°, debe estirar pecho, no jalar hombro anterior.",swaps:[] },
        { id:"PF4",nombre:"Estiramiento dorsal suave / child's pose en banco",desc:"20–30s",s:2,rMin:20,rMax:30,tempo:"—",rir:4,bar:false,noLog:true,
          cue:"Costillas controladas, sin colapsar lumbar.",swaps:[] },
      ]},
    ]
  },
  espalda: {
    id:"espalda",label:"Espalda",sub:"+ Bíceps",icon:"⬡",clr:"#3B82F6",grd:"rgba(59,130,246,0.07)",
    cutTime:{"45":["FIN","BIC"],"30":["FIN","BIC","EST"]},bjjCut:["EBIC2"],
    bloques:[
      { id:"WE",label:"Calentamiento",tipo:"calentamiento",rest:0,ejercicios:[
        { id:"EW1",nombre:"T-Spine Rotations",desc:"En banco",s:1,rMin:8,rMax:8,tempo:"2-0-2-0",rir:null,bar:false,noLog:true,
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
      { id:"HW1",label:"Activación Inicial · Biserie",tipo:"biserie",rest:35,ejercicios:[
        { id:"HW1a",nombre:"Face Pull",desc:"Cable · INICIO · activación manguito",s:2,rMin:15,rMax:15,tempo:"2-1-1-1",rir:4,bar:false,
          cue:"Codos ARRIBA · rotación externa al final · pulgares atrás · sin dolor",
          swaps:["Band Face Pull","Cable Rear Delt Fly ligero","Prone Y-Raise"] },
        { id:"HW1b",nombre:"Rotación Externa + Toalla",desc:"Banda/cable · INICIO · por lado",s:2,rMin:12,rMax:12,tempo:"3-0-1-1",rir:4,bar:false,perSide:true,
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
      { id:"HC",label:"Estabilidad Final · Biserie · CIERRE",tipo:"biserie",rest:53,ejercicios:[
        { id:"HC1a",nombre:"Face Pull Ligero",desc:"Cable · polea alta · CIERRE de sesión",s:2,rMin:12,rMax:15,tempo:"2-1-1-1",rir:3,bar:false,
          cue:"Muy ligero · rotación externa al final · pulgares ATRÁS · codos arriba",
          swaps:["Band Face Pull","Cable Rear Delt ligero","Prone Y-T-W"] },
        { id:"HC1b",nombre:"Rotación Externa Ligera",desc:"Cable/banda · CIERRE · por lado",s:2,rMin:10,rMax:12,tempo:"3-0-1-1",rir:3,bar:false,perSide:true,
          cue:"LIGERO · codo pegado · rota hacia afuera · pausa 1s · SIN dolor",
          swaps:["DB External Rotation","Band ER","Side-lying ER sin peso"] },
      ]},
      { id:"HFIN",label:"Finisher · Pump",tipo:"finisher",rest:30,ejercicios:[
        { id:"HFIN1",nombre:"Lateral Raise Máquina Ligero",desc:"Set 1: 18–20 · Set 2: 12–15",s:2,rMin:12,rMax:20,tempo:"2-0-1-1",rir:2,bar:false,
          cue:"Solo si el hombro se siente MUY bien · pump final · NO aumentes carga",
          swaps:["Cable Lateral Raise ligero","Band Lateral Raise pump","DB Lateral pump"] },
      ]},
    ]
  },
  brazos: {
    id:"brazos",label:"Brazos",sub:"Bíceps + Tríceps + Antebrazo",icon:"⬡",
    clr:"#EC4899",grd:"rgba(236,72,153,0.07)",
    cutTime:{"45":["BD","FIN_B"],"30":["BD","FIN_B","CB"]},
    bjjCut:["BD2"],
    bloques:[
      { id:"BW",label:"Warm Up",tipo:"calentamiento",rest:30,ejercicios:[
        { id:"BW1",nombre:"Straight-Arm Cable Pulldown",desc:"Ligero · activación escapular",
          s:2,rMin:15,rMax:15,tempo:"2-1-2-1",rir:4,bar:false,
          cue:"Hombros ABAJO · pecho quieto · sin arquear lumbar · depresión escapular pura",
          swaps:["Lat Prayer cable","Band Pulldown","DB Straight-Arm Pullover ligero"] },
        { id:"BW2",nombre:"Isométrico Rotación Externa",desc:"Con toalla · codo pegado · 20s hold",
          s:2,rMin:20,rMax:20,tempo:"sostenido",rir:null,bar:false,noLog:true,
          cue:"Solo si NO molesta · codo pegado al torso · rotación suave hacia afuera",
          swaps:["Band External Rotation muy ligero","Side-lying ER sin peso","Omitir si duele"] },
      ]},
      { id:"BA",label:"Fuerza A · Straight Sets",tipo:"normal",rest:90,ejercicios:[
        { id:"BA1",nombre:"Cable Curl Barra EZ",desc:"4 series · fuerza bíceps",
          s:4,rMin:6,rMax:8,tempo:"3-0-1-1",rir:2,bar:false,
          cue:"Un paso ATRÁS · codos clavados · SIN balanceo · contracción completa al final",
          swaps:["DB Curl estricto","Barbell Curl EZ","Cable Curl barra recta"] },
        { id:"BA2",nombre:"Triceps Pressdown Barra/V",desc:"4 series · fuerza tríceps",
          s:4,rMin:6,rMax:8,tempo:"2-0-1-1",rir:2,bar:false,
          cue:"Codos al bolsillo · hombro NO se adelanta · lockout completo abajo",
          swaps:["Triceps Pushdown cable","Overhead Triceps Extension","Close-Grip Bench"] },
      ]},
      { id:"BB",label:"Volumen B · Biserie",tipo:"biserie",rest:68,ejercicios:[
        { id:"BB1",nombre:"Cable Seated Curl",desc:"Frente a polea baja · tensión constante",
          s:3,rMin:10,rMax:12,tempo:"3-1-1-1",rir:1,bar:false,
          cue:"Espalda FIRME · pecho alto · tensión constante en todo el rango",
          swaps:["Incline DB Curl","Cable Curl polea baja","Bayesian Curl"] },
        { id:"BB2",nombre:"Rope Pushdown",desc:"Cable · cuerda · volumen tríceps",
          s:3,rMin:10,rMax:12,tempo:"2-0-2-0",rir:1,bar:false,
          cue:"Abre la cuerda al final · SIN subir hombros · codos fijos al torso",
          swaps:["Bar Pushdown","V-Bar Pushdown","Single-Arm Pushdown"] },
      ]},
      { id:"CB",label:"Aislamiento C · Biserie",tipo:"biserie",rest:53,ejercicios:[
        { id:"CB1",nombre:"Cable Preacher Curl",desc:"Long-length · pausa abajo",
          s:3,rMin:12,rMax:15,tempo:"2-2-1-1",rir:1,bar:false,
          cue:"Pausa ABAJO real (2s) · sin rebotes · contracción fuerte arriba",
          swaps:["Machine Preacher Curl","DB Concentration Curl","EZ Preacher Curl"] },
        { id:"CB2",nombre:"Cable Triceps Kickback Neutro",desc:"Aislamiento tríceps · un brazo",
          s:3,rMin:12,rMax:15,tempo:"2-1-2-0",rir:1,bar:false,perSide:true,
          cue:"Brazo PEGADO al torso · tronco estable · extensión completa · SIN overhead",
          swaps:["Overhead Triceps Cable Ext","DB Kickback","Rope Kickback"] },
      ]},
      { id:"BD",label:"Antebrazo D · Straight Sets",tipo:"normal",rest:38,ejercicios:[
        { id:"BD1",nombre:"Behind-the-Back Cable Wrist Curl",desc:"Antebrazo flexores",
          s:2,rMin:15,rMax:20,tempo:"2-1-2-1",rir:2,bar:false,
          cue:"Muñeca FUERTE · busca bombeo · SIN ego en el peso · rango completo",
          swaps:["DB Wrist Curl","Barbell Wrist Curl","Plate Pinch"] },
        { id:"BD2",nombre:"Cable Reverse Wrist Curl",desc:"Antebrazo extensores",
          s:2,rMin:15,rMax:20,tempo:"2-1-2-1",rir:2,bar:false,
          cue:"Movimiento corto y limpio · NO balancear el antebrazo · control puro",
          swaps:["DB Reverse Wrist Curl","Barbell Reverse Wrist Curl","Band Reverse Wrist Curl"] },
      ]},
      { id:"FIN_B",label:"Finisher · Rest-Pause",tipo:"finisher",rest:20,ejercicios:[
        { id:"BFIN1",nombre:"Rope Hammer Curl Rest-Pause",
          desc:"1 activador 12–15 + mini series 4–5 reps · 25–35 reps total",
          s:2,rMin:12,rMax:35,tempo:"controlado",rir:1,bar:false,
          cue:"Solo si técnica LIMPIA · hombro estable · 15–20s entre mini series",
          swaps:["DB Hammer Curl rest-pause","Cable Curl rest-pause","Omitir si hombro molesta"] },
      ]},
    ]
  },
};

function buildPlan(routine, ctx, sessionSkip = new Set(), sessionOverride = {}, sessionLinks = []) {
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

  // Apply session-level biserie links
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

function generateInsights(logs, gd) {
  const insights = [];

  // 1. PRs today
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

  // 2. RIR analysis
  const allRir = Object.values(logs).flatMap(sets => sets.map(s => s.rir)).filter(r => r !== null && r !== undefined);
  if (allRir.length > 0) {
    const avgRir = allRir.reduce((a, b) => a + b, 0) / allRir.length;
    if (avgRir < 1.2) insights.push({ icon: "⚠️", text: `RIR promedio ${avgRir.toFixed(1)} — muy cerca del fallo. Considera deload en 1–2 semanas` });
    else if (avgRir > 2.8) insights.push({ icon: "💡", text: `RIR promedio ${avgRir.toFixed(1)} — tienes margen. Sube 2.5–5% la próxima sesión` });
    else insights.push({ icon: "✓", text: `RIR promedio ${avgRir.toFixed(1)} — zona óptima de entrenamiento` });
  }

  // 3. Volume logged
  const totalVol = Object.values(logs).reduce((a, sets) => a + sets.reduce((s, x) => s + (x.w || 0) * (x.reps || 0), 0), 0);
  if (totalVol > 5000) insights.push({ icon: "📈", text: `${Math.round(totalVol / 1000 * 10) / 10}k lbs · sesión de alto volumen` });

  // 4. Progression reminder
  const exercisesAtTopOfRange = Object.keys(logs).filter(id => {
    const sets = logs[id] || [];
    return sets.some(s => s.reps !== null && s.rir !== null && s.rir <= 1);
  });
  if (exercisesAtTopOfRange.length > 0) {
    insights.push({ icon: "→", text: `Progresión disponible en ${exercisesAtTopOfRange.length} ejercicio${exercisesAtTopOfRange.length > 1 ? "s" : ""} — sube 2.5–5% próxima sesión` });
  }

  return insights.slice(0, 4);
}

function findExerciseById(exId) {
  for (const r of Object.values(ROUTINES)) {
    for (const blk of r.bloques) {
      for (const ex of blk.ejercicios) { if (ex.id === exId) return ex; }
    }
  }
  return null;
}

function calcSuggestion(exId, sessionSets) {
  if (!sessionSets || !sessionSets.length) return null;
  const exercise = findExerciseById(exId);
  if (!exercise) return null;
  const avgRir = sessionSets.reduce((s, x) => s + (x.rir ?? 2), 0) / sessionSets.length;
  const maxReps = Math.max(...sessionSets.map(s => s.reps || 0));
  const hitTopRange = maxReps >= exercise.rMax;
  if (avgRir <= 1 && hitTopRange) {
    const increment = exercise.rMax <= 8 ? 5 : 2.5;
    return { action:"up", increment, label:`+${increment} lbs` };
  }
  return { action:"hold", label:"mantén peso" };
}

function getSuggestedWeight(exId, gd) {
  const history = gd[exId];
  if (!history || !history.length) return null;
  const lastSession = history[history.length - 1];
  if (!lastSession.sets || !lastSession.sets.length) return null;
  const weights = lastSession.sets.map(s => s.w || 0).filter(Boolean);
  if (!weights.length) return null;
  const lastMaxW = Math.max(...weights);
  const sug = calcSuggestion(exId, lastSession.sets);
  if (sug?.action === "up") return { weight: lastMaxW + sug.increment, isSuggested: true, increment: sug.increment };
  return { weight: lastMaxW, isSuggested: false, increment: 0 };
}

function RestTimer({secs,next,onDone,onSkip}) {
  const endRef=useRef(Date.now()+secs*1000);
  const [rem,setRem]=useState(secs);
  useEffect(()=>{
    endRef.current=Date.now()+secs*1000;
    const id=setInterval(()=>{
      const r=Math.max(0,Math.round((endRef.current-Date.now())/1000));
      setRem(r);
      if(r<=0){clearInterval(id);onDone();}
    },250);
    return()=>clearInterval(id);
  },[secs]);
  function adjust(delta){
    endRef.current+=delta*1000;
    setRem(r=>Math.max(1,r+delta));
  }
  const total=secs,pct=(1-(rem/total))*100,R=76,cx=90,cy=90,circ=2*Math.PI*R;
  const nextExs=next?(next.biserie?[{...next.ex,pairName:next.paired}]:[next.ex]):[];
  return(
    <div style={{position:"fixed",inset:0,background:T.bg,zIndex:200,display:"flex",flexDirection:"column",alignItems:"center",overflowY:"auto",paddingBottom:40}}>
      <div style={{...DM,fontSize:11,color:T.t3,letterSpacing:"0.15em",textAlign:"center",paddingTop:24,marginBottom:8}}>DESCANSANDO</div>
      <svg width={180} height={180} viewBox="0 0 180 180">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={T.s2} strokeWidth={8}/>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={T.acc} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={circ-(pct/100)*circ}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
          style={{transition:"stroke-dashoffset 0.2s linear"}}/>
        <text x={cx} y={cy-4} textAnchor="middle" fill={T.t1} fontSize={68} fontFamily="'Bebas Neue',sans-serif">{rem}</text>
        <text x={cx} y={cy+22} textAnchor="middle" fill={T.t3} fontSize={11} fontFamily="'DM Mono',monospace">SEG</text>
      </svg>
      <div style={{display:"flex",gap:8,marginTop:16,padding:"0 24px"}}>
        {[-15,-10,10,15].map(a=>(
          <button key={a} onClick={()=>adjust(a)} style={{flex:1,background:T.s2,border:`1px solid ${T.bd}`,borderRadius:10,padding:"9px 10px",color:a>0?T.grn:T.red,...DM,fontSize:12,cursor:"pointer"}}>
            {a>0?`+${a}`:a}s
          </button>
        ))}
      </div>
      {nextExs.length>0&&(
        <div style={{padding:"0 24px",marginTop:20,width:"100%",maxWidth:480}}>
          <div style={{...DM,fontSize:10,color:T.t3,letterSpacing:"0.12em",marginBottom:8}}>A CONTINUACIÓN</div>
          {nextExs.map((ex,i)=>(
            <div key={i} style={{background:T.s1,border:`1px solid ${T.bd}`,borderRadius:10,padding:"10px 14px",marginBottom:6}}>
              <div style={{...BB,fontSize:16,color:T.t1}}>{ex.nombre}</div>
              <div style={{...DM,fontSize:12,color:T.t2,marginTop:2}}>
                {next.total} × {ex.rMin}–{ex.rMax} · {ex.tempo}{ex.rir!==null?` · RIR ${ex.rir}`:""}
              </div>
              {next.biserie&&<div style={{...DM,fontSize:10,color:T.acc,marginTop:3}}>BISERIE → {next.paired}</div>}
            </div>
          ))}
        </div>
      )}
      <button onClick={onSkip} style={{marginTop:20,background:"none",border:`1px solid ${T.bd}`,borderRadius:12,padding:"11px 28px",color:T.t2,...DS,fontSize:13,cursor:"pointer"}}>
        Saltar descanso →
      </button>
    </div>
  );
}

function PlateCalculator({onSelectWeight,onClose}) {
  const initBarLabel=sessionStorage.getItem("gt_bar")||"Olímpica";
  const initBar=BAR_OPTIONS.find(b=>b.label===initBarLabel)||BAR_OPTIONS[0];
  const [bar,setBar]=useState(initBar);
  const [plates,setPlates]=useState([]);
  const totalPlateW=plates.reduce((s,p)=>s+p,0);
  const totalWeight=bar.weight+totalPlateW*2;
  function selectBar(b){setBar(b);sessionStorage.setItem("gt_bar",b.label);}
  function addPlate(d){setPlates(prev=>[...prev,d].sort((a,b)=>b-a));}
  function removePlate(d){setPlates(prev=>{const i=prev.indexOf(d);if(i===-1)return prev;const n=[...prev];n.splice(i,1);return n;});}
  function count(d){return plates.filter(p=>p===d).length;}
  const detailStr=bar.weight>0
    ?`barra ${bar.weight} + placas ${plates.slice(0,3).join("+")}${plates.length>3?"…":""}×2`
    :`solo placas ${plates.slice(0,3).join("+")}${plates.length>3?"…":""}×2`;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:100,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div style={{background:T.s1,borderRadius:"20px 20px 0 0",padding:"20px 18px 48px",width:"100%",maxWidth:480,margin:"0 auto",border:`1px solid ${T.bd}`,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{...BB,fontSize:26}}>Calculadora de Placas</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.t3,fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        {/* Bar selector */}
        <div style={{...DM,color:T.t3,fontSize:9,letterSpacing:2,marginBottom:8}}>BARRA</div>
        <div style={{display:"flex",gap:6,marginBottom:16}}>
          {BAR_OPTIONS.map(b=>(
            <button key={b.label} onClick={()=>selectBar(b)} style={{flex:1,padding:"10px 4px",background:bar.label===b.label?T.acc:T.s2,border:`1px solid ${bar.label===b.label?T.acc:T.bd}`,borderRadius:10,color:bar.label===b.label?"#000":T.t3,...DM,fontSize:10,cursor:"pointer",transition:"all 0.15s"}}>
              {b.label}
            </button>
          ))}
        </div>
        {/* Total weight display */}
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{...BB,fontSize:48,color:T.t1,lineHeight:1}}>{totalWeight}</div>
          <div style={{...DM,fontSize:11,color:T.t3,marginTop:2}}>lb</div>
          {(plates.length>0||bar.weight>0)&&<div style={{...DM,fontSize:10,color:T.t3,marginTop:4}}>{detailStr}</div>}
        </div>
        {/* Per-denomination grid */}
        <div style={{background:T.bg,borderRadius:12,padding:"12px 14px",marginBottom:14}}>
          <div style={{...DM,color:T.t3,fontSize:9,letterSpacing:2,marginBottom:10}}>PLACAS — CADA LADO</div>
          {PLATE_DENOMINATIONS.map(d=>{
            const n=count(d);
            return(
              <div key={d} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                <button onClick={()=>removePlate(d)} disabled={n===0}
                  style={{width:36,height:36,borderRadius:8,background:T.s2,border:`1px solid ${T.bd}`,color:n===0?T.t3:T.red,fontSize:20,cursor:n===0?"default":"pointer",opacity:n===0?0.3:1,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                <div style={{flex:1,display:"flex",alignItems:"center",gap:8}}>
                  <div style={{background:`${PLC[d]}22`,border:`2px solid ${PLC[d]}`,borderRadius:8,padding:"4px 10px",...BB,fontSize:20,color:PLC[d],minWidth:52,textAlign:"center"}}>{d}</div>
                  <div style={{...DM,fontSize:11,color:T.t3}}>lb</div>
                  {n>0&&<div style={{...BB,fontSize:18,color:T.t1,marginLeft:4}}>×{n}</div>}
                </div>
                <button onClick={()=>addPlate(d)}
                  style={{width:36,height:36,borderRadius:8,background:T.s2,border:`1px solid ${T.bd}`,color:T.grn,fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
              </div>
            );
          })}
        </div>
        <button onClick={()=>{onSelectWeight(totalWeight);onClose();}}
          style={{width:"100%",background:T.acc,color:"#000",border:"none",borderRadius:14,padding:"16px",...BB,fontSize:20,letterSpacing:1,cursor:"pointer"}}>
          USAR ESTE PESO — {totalWeight} lbs
        </button>
      </div>
    </div>
  );
}

function SwapModal({ex,sessionSwaps,setSessionSwaps,onClose}) {
  const active=sessionSwaps[ex.id];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:100,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div style={{background:T.s1,borderRadius:"20px 20px 0 0",padding:"24px 20px 48px",width:"100%",border:`1px solid ${T.bd}`}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <div style={{...BB,fontSize:28}}>Alternativas</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.t3,fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{...DS,color:T.t3,fontSize:12,marginBottom:20}}>En lugar de: {ex.nombre}</div>
        {active&&(
          <div onClick={()=>{setSessionSwaps(p=>{const n={...p};delete n[ex.id];return n;});onClose();}}
            style={{background:`${T.acc}11`,border:`1px solid ${T.acc}33`,borderRadius:12,padding:"12px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}>
            <span style={{color:T.acc,...BB,fontSize:18}}>↩</span>
            <span style={{...DS,color:T.acc,fontSize:14}}>Restaurar original</span>
          </div>
        )}
        {!ex.swaps||ex.swaps.length===0
          ?<div style={{...DS,color:T.t3,textAlign:"center",marginTop:12}}>Sin alternativas</div>
          :ex.swaps.map((s,i)=>(
            <div key={i} onClick={()=>{setSessionSwaps(p=>({...p,[ex.id]:s}));onClose();}}
              style={{background:active===s?`${T.acc}18`:T.s2,border:`1px solid ${active===s?T.acc:T.bd}`,borderRadius:12,padding:"14px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}>
              <span style={{color:T.acc,...BB,fontSize:20}}>↪</span>
              <span style={{...DS,color:T.t1,fontSize:15}}>{s}</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}

function PlanView({plan,idx,midSkip,setMidSkip,sessionSwaps,setSessionSwaps,routine,onClose}) {
  const [swapTarget,setSwapTarget]=useState(null);
  function toggleSkip(exId){
    if(midSkip.has(exId)){setMidSkip(prev=>{const n=new Set(prev);n.delete(exId);return n;});}
    else{setMidSkip(prev=>new Set([...prev,exId]));}
  }
  const sections=[
    {label:"Completados",steps:plan.slice(0,idx),type:"done"},
    {label:"Actual",steps:plan.slice(idx,idx+1),type:"current"},
    {label:"Próximos",steps:plan.slice(idx+1),type:"next"},
  ];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:150,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div style={{background:T.s1,borderRadius:"20px 20px 0 0",padding:"20px 16px 48px",width:"100%",maxWidth:480,margin:"0 auto",border:`1px solid ${T.bd}`,maxHeight:"85vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{...BB,fontSize:24}}>PLAN DE SESIÓN</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.t3,fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{overflowY:"auto",flex:1}}>
          {sections.map(sec=>{
            const uniqueExs=[...new Map(sec.steps.map(s=>[s.ex.id,s])).values()];
            if(!uniqueExs.length)return null;
            return(
              <div key={sec.type} style={{marginBottom:14}}>
                <div style={{...DM,fontSize:9,letterSpacing:2,color:T.t3,marginBottom:6}}>{sec.label.toUpperCase()}</div>
                {uniqueExs.map(step=>{
                  const ex=step.ex;
                  const isSkipped=midSkip.has(ex.id);
                  const displayName=sessionSwaps[ex.id]||ex.nombre;
                  const hasSwap=!!sessionSwaps[ex.id];
                  return(
                    <div key={ex.id} style={{background:T.s2,border:`1px solid ${sec.type==="current"?routine.clr:T.bd}`,borderRadius:12,padding:"10px 12px",marginBottom:6,opacity:sec.type==="done"?0.4:isSkipped?0.35:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{flex:1}}>
                          <div style={{...BB,fontSize:16,color:sec.type==="current"?routine.clr:T.t1}}>{displayName}</div>
                          {hasSwap&&<div style={{...DM,fontSize:9,color:T.acc}}>alternativa</div>}
                          <div style={{...DM,fontSize:10,color:T.t3,marginTop:2}}>{ex.s}s · {ex.rMin}–{ex.rMax} · {ex.tempo}{ex.rir!==null?` · RIR ${ex.rir}`:""}</div>
                        </div>
                        {sec.type==="next"&&(
                          <div style={{display:"flex",gap:6}}>
                            {ex.swaps&&ex.swaps.length>0&&(
                              <button onClick={()=>setSwapTarget(ex)} style={{background:"none",border:`1px solid ${T.bd}`,borderRadius:8,color:T.t3,fontSize:11,padding:"4px 8px",cursor:"pointer",...DM}}>Alt →</button>
                            )}
                            <button onClick={()=>toggleSkip(ex.id)} style={{background:isSkipped?T.s1:"none",border:`1px solid ${isSkipped?T.acc:T.bd}`,borderRadius:8,color:isSkipped?T.acc:T.t3,fontSize:11,padding:"4px 8px",cursor:"pointer",...DM}}>
                              {isSkipped?"✓ skip":"skip"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {swapTarget&&(
        <SwapModal ex={swapTarget} sessionSwaps={sessionSwaps} setSessionSwaps={setSessionSwaps} onClose={()=>setSwapTarget(null)}/>
      )}
    </div>
  );
}

function getExerciseNames() {
  const names = {};
  for (const r of Object.values(ROUTINES)) {
    for (const blk of r.bloques) {
      for (const ex of blk.ejercicios) names[ex.id] = ex.nombre;
    }
  }
  return names;
}

function buildDayMap(gd) {
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

function buildExerciseMap(gd) {
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
      <polyline points={pts} fill="none" stroke={clr} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.7}/>
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={clr}/>
    </svg>
  );
}

function HistoryScreen({ gd, setGd, onBack }) {
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

function HomeScreen({gd,onSelect,onHistory}) {
  return(
    <div style={{minHeight:"100vh",background:T.bg,color:T.t1,...DS,maxWidth:480,margin:"0 auto"}}>
      <div style={{padding:"56px 24px 24px"}}>
        <div style={{...DM,fontSize:10,letterSpacing:4,color:T.t3,marginBottom:4}}>V2 · GYMTRACK</div>
        <div style={{...BB,fontSize:64,lineHeight:0.9,marginBottom:8}}>
          <span style={{color:T.t1}}>TUS </span><span style={{color:T.acc}}>RU</span><span style={{color:T.t1}}>TINAS</span>
        </div>
        <div style={{...DS,color:T.t3,fontSize:13,marginTop:12}}>Selecciona · configura · entrena</div>
      </div>
      <div style={{padding:"8px 16px 40px"}}>
        {Object.values(ROUTINES).map(r=>{
          const allExIds=r.bloques.flatMap(blk=>blk.ejercicios.map(ex=>ex.id));
          const allSessions=allExIds.flatMap(id=>gd[id]||[]);
          allSessions.sort((a,b)=>new Date(b.date)-new Date(a.date));
          const lastSession=allSessions[0]??null;
          const days=lastSession?(()=>{
            const lastDate=new Date(lastSession.date);
            const today=new Date();
            const lastDateOnly=new Date(lastDate.getFullYear(),lastDate.getMonth(),lastDate.getDate());
            const todayOnly=new Date(today.getFullYear(),today.getMonth(),today.getDate());
            return Math.round((todayOnly-lastDateOnly)/(1000*60*60*24));
          })():null;
          return(
            <div key={r.id} onClick={()=>onSelect(r.id)}
              style={{background:`linear-gradient(135deg,${r.clr}26 0%,${T.s1} 55%)`,border:`1px solid ${T.bd}`,borderLeft:`3px solid ${r.clr}`,borderRadius:16,padding:"22px 22px 18px",marginBottom:10,cursor:"pointer"}}>
              <div style={{...BB,fontSize:46,lineHeight:1}}>{r.label}</div>
              <div style={{...DS,color:T.t3,fontSize:13,marginTop:2}}>{r.sub}</div>
              <div style={{height:3,width:32,background:r.clr,borderRadius:2,marginTop:14,marginBottom:14}}/>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{height:3,flex:1,background:T.s2,borderRadius:2,overflow:"hidden",marginRight:16}}>
                  <div style={{height:"100%",background:r.clr,borderRadius:2,width:days===null?"0%":days===0?"100%":`${Math.max(5,100-days*20)}%`}}/>
                </div>
                <div style={{...DM,fontSize:11,color:days===0?r.clr:T.t3}}>
                  {days===null?"Primera sesión pendiente":days===0?"✓ Hoy":days===1?"Ayer":`Hace ${days}d`}
                </div>
              </div>
            </div>
          );
        })}
        <div onClick={onHistory} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",marginTop:4,background:T.s1,border:`1px solid ${T.bd}`,borderRadius:12,cursor:"pointer"}}>
          <div>
            <div style={{...DS,fontSize:13,color:T.t2,fontWeight:500,letterSpacing:"0.06em",textTransform:"uppercase"}}>Historia</div>
            <div style={{...DM,fontSize:11,color:T.t3,marginTop:2}}>Sesiones · PRs · progreso</div>
          </div>
          <span style={{color:T.t3,fontSize:16}}>→</span>
        </div>
      </div>
    </div>
  );
}

function ContextScreen({routine,ctx,setCtx,onBack,onBrief}) {
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
        <button onClick={onBrief} style={{width:"100%",background:routine.clr,color:"#000",border:"none",borderRadius:16,padding:"18px",...BB,fontSize:24,letterSpacing:1,cursor:"pointer"}}>
          VER SESIÓN →
        </button>
      </div>
    </div>
  );
}

function BriefScreen({ routine, ctx, sessionSkip, setSessionSkip, sessionOverride, setSessionOverride, sessionLinks, setSessionLinks, linkingFrom, setLinkingFrom, gd, onStart, onBack }) {
  const plan = buildPlan(routine, ctx, sessionSkip, sessionOverride, sessionLinks);
  const exCount = [...new Set(plan.map(s => s.ex.id))].length;
  const estMin = Math.round(plan.reduce((a, s) => a + s.rest, 0) / 60) + Math.round(plan.length * 0.75);

  const bloques = [];
  for (const blk of routine.bloques) {
    if (ctx.tiempo !== "completo" && routine.cutTime?.[ctx.tiempo]?.includes(blk.id)) continue;
    if (ctx.bjj && routine.bjjCut?.includes(blk.id)) continue;
    bloques.push({ blk, exs: blk.ejercicios });
  }

  function toggleSkip(id) {
    setSessionSkip(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function adjustSeries(exId, delta, currentS) {
    const newVal = Math.max(1, Math.min(6, (sessionOverride[exId] ?? currentS) + delta));
    setSessionOverride(prev => ({ ...prev, [exId]: newVal }));
  }

  function toggleLink(exId) {
    if (linkingFrom === null) { setLinkingFrom(exId); return; }
    if (linkingFrom === exId) { setLinkingFrom(null); return; }
    // Pair them, removing any prior pairs involving either ID
    setSessionLinks(prev => {
      const filtered = prev.filter(([a, b]) => a !== exId && b !== exId && a !== linkingFrom && b !== linkingFrom);
      return [...filtered, [linkingFrom, exId]];
    });
    setLinkingFrom(null);
  }

  function unlinkExercise(exId) {
    setSessionLinks(prev => prev.filter(([a, b]) => a !== exId && b !== exId));
  }

  function isLinked(exId) { return sessionLinks.some(([a, b]) => a === exId || b === exId); }

  function getLinkedPartner(exId) {
    const names = getExerciseNames();
    const pair = sessionLinks.find(([a, b]) => a === exId || b === exId);
    if (!pair) return null;
    const partnerId = pair[0] === exId ? pair[1] : pair[0];
    return names[partnerId] || partnerId;
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.t1, ...DS, maxWidth: 480, margin: "0 auto", paddingBottom: 100 }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 200, background: `radial-gradient(ellipse at top, ${routine.clr}14, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />

      <div style={{ padding: "20px 18px 14px", borderBottom: `1px solid ${T.bd}`, background: `${T.bg}F0`, position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(12px)" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.t3, fontSize: 13, cursor: "pointer", marginBottom: 10, ...DS }}>← Contexto</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ ...BB, fontSize: 36, color: routine.clr, lineHeight: 1 }}>{routine.label}</div>
            <div style={{ ...DS, color: T.t3, fontSize: 12, marginTop: 2 }}>SESIÓN DE HOY</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ ...BB, fontSize: 28, color: T.t1 }}>~{estMin} min</div>
            <div style={{ ...DM, color: T.t3, fontSize: 10 }}>{plan.length} sets · {exCount} ejercicios</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 14px 0", position: "relative", zIndex: 1 }}>
        {sessionSkip.size > 0 && (
          <div style={{ background: `${T.acc}11`, border: `1px solid ${T.acc}33`, borderRadius: 10, padding: "8px 14px", marginBottom: 10, ...DS, fontSize: 12, color: T.acc }}>
            {sessionSkip.size} ejercicio{sessionSkip.size > 1 ? "s" : ""} excluido{sessionSkip.size > 1 ? "s" : ""} · toca para restaurar
          </div>
        )}
        {linkingFrom !== null && (
          <div style={{ background: `${T.acc}14`, border: `1px solid ${T.acc}44`, borderRadius: 10, padding: "8px 14px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ ...DS, fontSize: 12, color: T.acc }}>Toca ⇄ en otro ejercicio para combinar como biserie</span>
            <button onClick={() => setLinkingFrom(null)} style={{ background: "none", border: "none", color: T.t3, fontSize: 16, cursor: "pointer", padding: "0 4px" }}>✕</button>
          </div>
        )}

        {bloques.map(({ blk, exs }) => (
          <div key={blk.id} style={{ marginBottom: 10 }}>
            <div style={{ ...DM, fontSize: 9, letterSpacing: 2, color: T.t3, marginBottom: 6, paddingLeft: 4 }}>
              {blk.label.toUpperCase()}
              {blk.tipo === "biserie" && (
                <span style={{ marginLeft: 8, background: `${routine.clr}22`, color: routine.clr, border: `1px solid ${routine.clr}44`, borderRadius: 4, padding: "1px 7px", fontSize: 8 }}>BISERIE</span>
              )}
            </div>

            <div style={{ background: T.s1, border: `1px solid ${T.bd}`, borderRadius: 16, overflow: "hidden" }}>
              {exs.map((ex, i) => {
                const isSkipped = sessionSkip.has(ex.id);
                const currentS = sessionOverride[ex.id] ?? ex.s;
                const isBiserie = blk.tipo === "biserie";
                const isLastInBlk = i === exs.length - 1;

                const linked = isLinked(ex.id);
                const partner = getLinkedPartner(ex.id);
                const isLinking = linkingFrom === ex.id;
                const linkBtnClr = isLinking ? T.acc : linked ? routine.clr : T.t3;

                return (
                  <div key={ex.id} style={{
                    padding: "12px 14px",
                    borderBottom: isLastInBlk ? "none" : `1px solid ${T.bd}`,
                    borderLeft: (isBiserie || linked) ? `3px solid ${isSkipped ? T.bd : routine.clr}` : "none",
                    opacity: isSkipped ? 0.4 : 1,
                    transition: "opacity 0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}>
                    <button onClick={() => toggleSkip(ex.id)} style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: isSkipped ? T.s2 : `${routine.clr}22`,
                      border: `1px solid ${isSkipped ? T.bd : routine.clr}`,
                      color: isSkipped ? T.t3 : routine.clr,
                      fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isSkipped ? "+" : "✓"}
                    </button>

                    <button onClick={() => linked ? unlinkExercise(ex.id) : toggleLink(ex.id)} style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: isLinking ? `${T.acc}22` : linked ? `${routine.clr}22` : T.s2,
                      border: `1px solid ${isLinking ? T.acc : linked ? routine.clr : T.bd}`,
                      color: linkBtnClr,
                      fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>⇄</button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                        <div style={{ ...BB, fontSize: 18, lineHeight: 1.1, color: isSkipped ? T.t3 : T.t1 }}>{ex.nombre}</div>
                        {!ex.noLog && (()=>{const sug=getSuggestedWeight(ex.id,gd);return sug?.isSuggested&&<span style={{...DM,fontSize:9,color:"#000",background:T.grn,borderRadius:4,padding:"2px 6px"}}>+{sug.increment} lbs</span>;})()}
                      </div>
                      {linked && partner && (
                        <div style={{ ...DM, fontSize: 9, color: routine.clr, marginTop: 2 }}>⇄ BISERIE con {partner}</div>
                      )}
                      <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                        {[
                          `${ex.rMin}–${ex.rMax}${ex.perSide ? "/l" : ""} reps`,
                          ex.tempo,
                          ex.rir !== null ? `RIR ${ex.rir}` : null,
                        ].filter(Boolean).map((tag, j) => (
                          <span key={j} style={{ ...DM, fontSize: 10, color: T.t3 }}>{tag}</span>
                        ))}
                      </div>
                    </div>

                    {!isSkipped && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => adjustSeries(ex.id, -1, ex.s)} style={{
                          width: 28, height: 28, borderRadius: 7, background: T.s2, border: `1px solid ${T.bd}`,
                          color: T.red, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        }}>−</button>
                        <div style={{ ...BB, fontSize: 22, color: T.t1, minWidth: 24, textAlign: "center" }}>{currentS}</div>
                        <button onClick={() => adjustSeries(ex.id, 1, ex.s)} style={{
                          width: 28, height: 28, borderRadius: 7, background: T.s2, border: `1px solid ${T.bd}`,
                          color: T.grn, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        }}>+</button>
                        <div style={{ ...DM, fontSize: 9, color: T.t3, marginLeft: 2 }}>series</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {blk.rest > 0 && (
              <div style={{ ...DM, fontSize: 9, color: T.t3, textAlign: "right", marginTop: 4, paddingRight: 4 }}>
                descanso {blk.rest}s{blk.tipo === "biserie" ? " · tras el par" : ""}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, padding: "16px 14px 32px", background: `linear-gradient(transparent, ${T.bg} 40%)`, zIndex: 20 }}>
        <button onClick={onStart} style={{
          width: "100%", background: routine.clr, color: "#000", border: "none",
          borderRadius: 16, padding: "18px", ...BB, fontSize: 24, letterSpacing: 1, cursor: "pointer",
        }}>
          EMPEZAR SESIÓN ({plan.length} sets) →
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
  const [sessionSkip,setSessionSkip]=useState(new Set());
  const [sessionOverride,setSessionOverride]=useState({});
  const [sessionLinks,setSessionLinks]=useState([]);
  const [linkingFrom,setLinkingFrom]=useState(null);
  const [confirmAbandon,setConfirmAbandon]=useState(false);
  const [sessionSwaps,setSessionSwaps]=useState({});
  const [showPlanView,setShowPlanView]=useState(false);
  const [midSkip,setMidSkip]=useState(new Set());
  const [suggestedInfo,setSuggestedInfo]=useState(null);
  const startRef=useRef(null);

  useEffect(()=>{loadGD().then(d=>{setGd(d);setGdReady(true);});},[]);
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
    if(step.ex.noLog){setW("");setSuggestedInfo(null);setReps(null);setRir(null);return;}
    const sug=getSuggestedWeight(step.ex.id,gd);
    setSuggestedInfo(sug);
    setW(sug?String(sug.weight):lastW(step.ex.id)?String(lastW(step.ex.id)):"");
    setReps(null);setRir(null);
  },[idx,plan]);

  function startSession(){
    const p=buildPlan(routine,ctx,sessionSkip,sessionOverride,sessionLinks);
    setPlan(p);setIdx(0);setLogs({});setPrs([]);
    startRef.current=Date.now();setElapsed(0);
    setMidSkip(new Set());setSessionSwaps({});setSuggestedInfo(null);
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
      let newGd;
      if(ti>=0){const u=[...sessions];u[ti]={...u[ti],sets:[...u[ti].sets,ns]};newGd={...prev,[ex.id]:u};}
      else{newGd={...prev,[ex.id]:[...sessions.slice(-19),{date:new Date().toISOString(),sets:[ns]}]};}
      saveGD(newGd);
      return newGd;
    });
    setLogs(prev=>({...prev,[ex.id]:[...(prev[ex.id]||[]),{w:wn,reps,rir}]}));
    if(step.rest>0){setRestSecs(step.rest);setShowRest(true);}else{advance();}
  }

  function advance(){
    setShowRest(false);
    let next=idx+1;
    while(next<plan.length&&midSkip.has(plan[next].ex.id))next++;
    if(next>=plan.length)setScreen("summary");else setIdx(next);
  }

  const elStr=`${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,"0")}`;
  const pct=plan.length>0?(idx/plan.length)*100:0;

  if(screen==="home")return<HomeScreen gd={gd} onSelect={id=>{setRid(id);setCtx({tiempo:"completo",bjj:false,hombro:"normal"});setSessionSkip(new Set());setSessionOverride({});setSessionLinks([]);setLinkingFrom(null);setScreen("context");}} onHistory={()=>setScreen("history")}/>;
  if(screen==="history")return<HistoryScreen gd={gd} setGd={setGd} onBack={()=>setScreen("home")}/>;
  if(screen==="context"&&routine)return<ContextScreen routine={routine} ctx={ctx} setCtx={setCtx} onBack={()=>setScreen("home")} onBrief={()=>{
    const ds=new Set();
    routine.bloques.forEach(blk=>blk.ejercicios.forEach(ex=>{if(ex.defaultSkip)ds.add(ex.id);}));
    setSessionSkip(ds);
    setScreen("brief");
  }}/>;
  if(screen==="brief"&&routine)return(
    <BriefScreen
      routine={routine}
      ctx={ctx}
      sessionSkip={sessionSkip}
      setSessionSkip={setSessionSkip}
      sessionOverride={sessionOverride}
      setSessionOverride={setSessionOverride}
      sessionLinks={sessionLinks}
      setSessionLinks={setSessionLinks}
      linkingFrom={linkingFrom}
      setLinkingFrom={setLinkingFrom}
      gd={gd}
      onStart={startSession}
      onBack={()=>setScreen("context")}
    />
  );

  if(screen==="session"&&step){
    const ex=step.ex;
    const displayName=sessionSwaps[ex.id]||ex.nombre;
    const hasSwap=!!sessionSwaps[ex.id];
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
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{...DM,fontSize:12,color:T.t3}}>{elStr} · {idx+1}/{plan.length}</div>
              <button onClick={()=>setShowPlanView(true)} style={{background:"none",border:`1px solid ${T.bd}`,borderRadius:8,color:T.t3,fontSize:14,padding:"4px 8px",cursor:"pointer",...DS}}>☰</button>
              {!confirmAbandon&&(
                <button onClick={()=>setConfirmAbandon(true)} style={{background:"none",border:`1px solid ${T.bd}`,borderRadius:8,color:T.t3,fontSize:12,padding:"4px 8px",cursor:"pointer",...DS}}>✕</button>
              )}
            </div>
          </div>
          {confirmAbandon&&(
            <div style={{background:`${T.red}11`,border:`1px solid ${T.red}33`,borderRadius:10,padding:"10px 14px",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
              <span style={{...DS,fontSize:12,color:T.red}}>¿Abandonar sesión?</span>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{
                  setScreen("home");setRid(null);setPlan([]);setIdx(0);
                  setLogs({});setPrs([]);setElapsed(0);setConfirmAbandon(false);
                  setShowRest(false);setShowPlates(false);setShowSwap(false);
                  setSessionSkip(new Set());setSessionOverride({});
                  setSessionLinks([]);setLinkingFrom(null);
                }} style={{background:T.red,border:"none",borderRadius:8,color:"#fff",fontSize:12,padding:"6px 12px",cursor:"pointer",...DS,fontWeight:700}}>
                  Sí, salir
                </button>
                <button onClick={()=>setConfirmAbandon(false)} style={{background:T.s2,border:`1px solid ${T.bd}`,borderRadius:8,color:T.t2,fontSize:12,padding:"6px 12px",cursor:"pointer",...DS}}>
                  Continuar
                </button>
              </div>
            </div>
          )}
          <div style={{height:3,background:T.s2,borderRadius:2,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${pct}%`,background:routine.clr,borderRadius:2,transition:"width 0.5s"}}/>
          </div>
        </div>
        <div style={{margin:"12px 12px 0",background:T.s1,border:`1px solid ${T.bd}`,borderRadius:22,padding:"16px 18px 14px",position:"relative",zIndex:1}}>
          <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
            <span style={{background:T.s2,borderRadius:6,padding:"3px 10px",...DM,fontSize:10,color:T.t3}}>{step.blk.label}</span>
            <span style={{background:T.s2,borderRadius:6,padding:"3px 10px",...DM,fontSize:10,color:T.t3}}>S{step.setNum}/{step.total}</span>
            {step.biserie&&<span style={{background:`${routine.clr}22`,color:routine.clr,border:`1px solid ${routine.clr}44`,borderRadius:6,padding:"3px 10px",...DM,fontSize:10}}>BISERIE → {step.paired}</span>}
            {ex.shoulder&&ctx.hombro==="cuidado"&&<span style={{background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,borderRadius:6,padding:"3px 10px",...DM,fontSize:10}}>⚠️ RANGO SEGURO</span>}
          </div>
          <div style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:2}}>
            <div style={{...BB,fontSize:22,lineHeight:1.1,color:T.t1}}>{displayName}</div>
            {hasSwap&&<span style={{...DM,fontSize:9,color:T.acc,marginTop:4}}>alternativa</span>}
          </div>
          <div style={{...DS,color:T.t3,fontSize:12,marginBottom:12}}>{ex.desc}</div>
          <div style={{...BB,fontSize:32,color:T.t1,marginBottom:6}}>{ex.rMin}–{ex.rMax}{ex.perSide?" / lado":""} reps</div>
          <div style={{display:"flex",gap:16,marginBottom:12,alignItems:"center"}}>
            <span style={{...DM,fontSize:20,color:T.acc}}>{ex.tempo}</span>
            {ex.rir!==null&&<span style={{...DM,fontSize:18,color:T.t2}}>RIR {ex.rir}</span>}
          </div>
          <div style={{background:T.bg,borderRadius:10,padding:"10px 12px",borderLeft:`3px solid ${routine.clr}`}}>
            <div style={{...DM,color:routine.clr,fontSize:8,letterSpacing:2,marginBottom:4}}>CLAVE 0.1%</div>
            <div style={{...DS,color:T.t2,fontSize:13,lineHeight:1.6}}>{ex.cue}</div>
          </div>
        </div>
        {ex.noLog
          ?(<div style={{margin:"10px 12px 0",background:T.s1,border:`1px solid ${T.bd}`,borderRadius:22,padding:"16px 18px",position:"relative",zIndex:1}}>
              <button onClick={()=>{if(step.rest>0){setRestSecs(step.rest);setShowRest(true);}else{advance();}}}
                style={{width:"100%",background:T.s2,color:T.t1,border:`1px solid ${T.bd}`,borderRadius:14,padding:"18px",...BB,fontSize:22,letterSpacing:1,cursor:"pointer"}}>
                COMPLETADO ✓
              </button>
            </div>)
          :(<div style={{margin:"10px 12px 0",background:T.s1,border:`1px solid ${T.bd}`,borderRadius:22,padding:"16px 18px",position:"relative",zIndex:1}}>
              {(lw||todaySets.length>0)&&(
                <div style={{display:"flex",justifyContent:"space-between",background:T.bg,borderRadius:8,padding:"8px 12px",marginBottom:10,...DM,fontSize:12,color:T.t3}}>
                  {lw&&<span style={{...DM,fontSize:16,color:T.t3}}>ant: <span style={{color:T.t1}}>{lw}</span> lbs</span>}
                  {mx>0&&<span style={{...DM,fontSize:16,color:T.t3}}>PR: <span style={{color:T.acc}}>{mx}</span> lbs</span>}
                </div>
              )}
              {todaySets.length>0&&(
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                  {todaySets.map((s,i)=>(
                    <div key={i} style={{background:T.s2,border:`1px solid ${T.bd}`,borderRadius:8,padding:"5px 10px",...DM,fontSize:11,color:T.t2}}>
                      {s.w}<span style={{color:T.t3}}>lb</span>×{s.reps}<span style={{color:T.t3}}> R{s.rir}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{marginBottom:12}}>
                <div style={{...DM,color:T.t3,fontSize:9,letterSpacing:2,marginBottom:6}}>PESO (lbs)</div>
                <input type="number" value={w} onChange={e=>{setW(e.target.value);}} placeholder={lw||"135"}
                  style={{background:T.bg,border:`1px solid ${w?routine.clr:T.bd}`,borderRadius:12,padding:"10px 14px",color:T.t1,fontSize:44,...BB,width:"100%",textAlign:"center",outline:"none",transition:"border-color 0.2s"}}/>
                {suggestedInfo?.isSuggested&&parseFloat(w)===suggestedInfo.weight&&(
                  <div style={{...DM,fontSize:10,color:T.grn,textAlign:"center",marginTop:4}}>sugerido +{suggestedInfo.increment} lbs</div>
                )}
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
            </div>)
        }
        <div style={{display:"flex",gap:8,margin:"10px 12px 0",position:"relative",zIndex:1}}>
          {[["🔢 Placas",()=>setShowPlates(true)],["🔄 Cambiar",()=>setShowSwap(true)],["⏭ Saltar",advance]].map(([l,f])=>(
            <button key={l} onClick={f} style={{flex:1,background:T.s1,border:`1px solid ${T.bd}`,borderRadius:12,padding:"13px 6px",color:T.t2,...DS,fontSize:12,fontWeight:600,cursor:"pointer"}}>{l}</button>
          ))}
        </div>
        {showPlates&&<PlateCalculator onSelectWeight={v=>{setW(String(v));setSuggestedInfo(s=>s?{...s,_override:true}:s);}} onClose={()=>setShowPlates(false)}/>}
        {showSwap&&<SwapModal ex={ex} sessionSwaps={sessionSwaps} setSessionSwaps={setSessionSwaps} onClose={()=>setShowSwap(false)}/>}
        {showRest&&<RestTimer secs={restSecs} next={nextStep} onDone={advance} onSkip={advance}/>}
        {showPlanView&&<PlanView plan={plan} idx={idx} midSkip={midSkip} setMidSkip={setMidSkip} sessionSwaps={sessionSwaps} setSessionSwaps={setSessionSwaps} routine={routine} onClose={()=>setShowPlanView(false)}/>}
      </div>
    );
  }

  if(screen==="summary"){
    const totalSets=Object.values(logs).reduce((a,b)=>a+b.length,0);
    const totalVol=Object.values(logs).reduce((a,sets)=>a+sets.reduce((s,x)=>s+(x.w||0)*(x.reps||0),0),0);
    const allRir=Object.values(logs).flatMap(sets=>sets.map(s=>s.rir)).filter(r=>r!==null&&r!==undefined);
    const avgRir=allRir.length?allRir.reduce((a,b)=>a+b,0)/allRir.length:null;
    // Previous session data for comparison
    const allExIds=routine.bloques.flatMap(blk=>blk.ejercicios.map(ex=>ex.id));
    const prevSessions=allExIds.flatMap(id=>(gd[id]||[]).slice(0,-1));// exclude today
    const prevVol=prevSessions.reduce((a,s)=>(s.sets||[]).reduce((b,x)=>b+(x.w||0)*(x.reps||0),a),0);
    const prevRirAll=prevSessions.flatMap(s=>(s.sets||[]).map(x=>x.rir)).filter(r=>r!==null&&r!==undefined);
    const prevAvgRir=prevRirAll.length?prevRirAll.reduce((a,b)=>a+b,0)/prevRirAll.length:null;
    // Per-exercise next session suggestions
    const loggedExIds=Object.keys(logs).filter(id=>!findExerciseById(id)?.noLog);
    // PR deltas
    function getPrevPR(exId){
      const hist=gd[exId]||[];
      const all=hist.slice(0,-1).flatMap(s=>s.sets?.map(x=>x.w||0)||[]);
      return all.length?Math.max(...all):0;
    }
    return(
      <div style={{minHeight:"100vh",background:T.bg,color:T.t1,...DS,maxWidth:480,margin:"0 auto",padding:"52px 22px 48px"}}>
        <div style={{position:"fixed",top:0,left:0,right:0,height:300,background:`radial-gradient(ellipse at top,${routine.clr}15,transparent 70%)`,pointerEvents:"none"}}/>
        <div style={{...DM,fontSize:10,letterSpacing:4,color:T.t3,marginBottom:6,position:"relative"}}>SESIÓN COMPLETADA</div>
        <div style={{...BB,fontSize:58,lineHeight:0.95,marginBottom:6,position:"relative"}}>{routine.label}</div>
        <div style={{...DS,color:T.t3,fontSize:13,marginBottom:24,position:"relative"}}>{elStr} · {totalSets} sets</div>
        {/* PRs with delta */}
        {prs.length>0&&(
          <div style={{background:`${T.acc}0F`,border:`1px solid ${T.acc}33`,borderRadius:18,padding:"18px 20px",marginBottom:12,position:"relative"}}>
            <div style={{...BB,fontSize:20,color:T.acc,marginBottom:12}}>🏆 Récords Personales</div>
            {prs.map((p,i)=>{
              const prev=getPrevPR(p.id);
              const delta=prev>0?p.w-prev:null;
              return(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
                  <span style={{...DS,fontSize:14,color:T.t2}}>{p.name}</span>
                  <div style={{textAlign:"right"}}>
                    <span style={{...DM,fontSize:14,color:T.acc}}>{p.w} lbs</span>
                    {delta!==null&&<span style={{...DM,fontSize:11,color:T.grn,marginLeft:6}}>+{delta} lbs</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* Next session — per exercise */}
        {loggedExIds.length>0&&(
          <div style={{background:T.s1,border:`1px solid ${T.bd}`,borderRadius:18,padding:"18px 20px",marginBottom:12,position:"relative"}}>
            <div style={{...DM,color:T.t3,fontSize:10,letterSpacing:2,marginBottom:12}}>PRÓXIMA SESIÓN</div>
            {loggedExIds.map(id=>{
              const ex=findExerciseById(id);
              const sug=calcSuggestion(id,logs[id]);
              if(!ex)return null;
              return(
                <div key={id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:6,paddingBottom:6,borderBottom:`1px solid ${T.bd}`}}>
                  <span style={{...DS,fontSize:13,color:T.t1}}>{ex.nombre}</span>
                  <span style={{...DM,fontSize:13,color:sug?.action==="up"?T.grn:T.t3}}>
                    {sug?.action==="up"?`→ +${sug.increment} lbs`:"mantén"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {/* Stats */}
        <div style={{background:T.s1,border:`1px solid ${T.bd}`,borderRadius:18,padding:"18px 20px",marginBottom:12,position:"relative"}}>
          <div style={{...DM,color:T.t3,fontSize:10,letterSpacing:2,marginBottom:16}}>ESTADÍSTICAS</div>
          <div style={{display:"flex",gap:28}}>
            <div><div style={{...BB,fontSize:32,color:T.acc}}>{totalSets}</div><div style={{...DM,color:T.t3,fontSize:10}}>sets</div></div>
            <div><div style={{...BB,fontSize:32,color:T.t1}}>{totalVol>0?`${(totalVol/1000).toFixed(1)}k`:"—"}</div><div style={{...DM,color:T.t3,fontSize:10}}>vol lbs</div></div>
            <div><div style={{...BB,fontSize:32,color:T.t2}}>{elStr}</div><div style={{...DM,color:T.t3,fontSize:10}}>tiempo</div></div>
          </div>
        </div>
        {/* Analysis */}
        {(()=>{
          const insights=generateInsights(logs,gd);
          const lines=[];
          if(avgRir!==null){
            let txt=`RIR promedio ${avgRir.toFixed(1)}`;
            if(avgRir<1.2)txt+=` — muy cerca del fallo`;
            else if(avgRir>2.8)txt+=` — zona conservadora`;
            else txt+=` — zona óptima`;
            if(prevAvgRir!==null){
              const d=avgRir-prevAvgRir;
              txt+=` · ${d>0?"más suave":"más intenso"} que sesión anterior`;
            }
            lines.push({icon:avgRir>2.8?"💡":avgRir<1.2?"⚠️":"✓",text:txt});
          }
          if(totalVol>0){
            let vtxt=`${(totalVol/1000).toFixed(1)}k lbs`;
            if(prevVol>0){const pct=Math.round(((totalVol-prevVol)/prevVol)*100);vtxt+=` · ${pct>=0?"+":""}${pct}% vs sesión anterior`;}
            else vtxt+=` · primera sesión registrada`;
            lines.push({icon:"📈",text:vtxt});
          }
          const combined=[...lines,...insights.filter((_,i)=>i>0)].slice(0,4);
          if(!combined.length)return null;
          return(
            <div style={{background:T.s1,border:`1px solid ${T.bd}`,borderRadius:18,padding:"18px 20px",marginBottom:24,position:"relative"}}>
              <div style={{...DM,color:T.t3,fontSize:10,letterSpacing:2,marginBottom:14}}>ANÁLISIS</div>
              {combined.map((ins,i)=>(
                <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:i<combined.length-1?12:0}}>
                  <span style={{fontSize:16,flexShrink:0,marginTop:1}}>{ins.icon}</span>
                  <span style={{...DS,color:T.t2,fontSize:13,lineHeight:1.5}}>{ins.text}</span>
                </div>
              ))}
            </div>
          );
        })()}
        <button onClick={()=>{setScreen("home");setRid(null);setPlan([]);setIdx(0);setLogs({});setPrs([]);setElapsed(0);setSessionSkip(new Set());setSessionOverride({});setSessionLinks([]);setLinkingFrom(null);setSessionSwaps({});setMidSkip(new Set());setSuggestedInfo(null);}}
          style={{width:"100%",background:"none",border:`2px solid ${routine.clr}`,color:routine.clr,borderRadius:14,padding:"16px 24px",...BB,fontSize:18,letterSpacing:"0.1em",cursor:"pointer",position:"relative"}}>
          VOLVER AL INICIO
        </button>
      </div>
    );
  }
  return null;
}
