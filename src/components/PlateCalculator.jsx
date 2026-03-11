import { useState } from "react";
import { T, BB, DM } from '../data/theme.js';
import { BAR_OPTIONS, PLATE_DENOMINATIONS, PLC } from '../data/routines.js';

export function PlateCalculator({onSelectWeight,onClose}) {
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
        <div style={{...DM,color:T.t3,fontSize:9,letterSpacing:2,marginBottom:8}}>BARRA</div>
        <div style={{display:"flex",gap:6,marginBottom:16}}>
          {BAR_OPTIONS.map(b=>(
            <button key={b.label} onClick={()=>selectBar(b)} style={{flex:1,padding:"10px 4px",background:bar.label===b.label?T.acc:T.s2,border:`1px solid ${bar.label===b.label?T.acc:T.bd}`,borderRadius:10,color:bar.label===b.label?"#000":T.t3,...DM,fontSize:10,cursor:"pointer",transition:"all 0.15s"}}>
              {b.label}
            </button>
          ))}
        </div>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{...BB,fontSize:48,color:T.t1,lineHeight:1}}>{totalWeight}</div>
          <div style={{...DM,fontSize:11,color:T.t3,marginTop:2}}>lb</div>
          {(plates.length>0||bar.weight>0)&&<div style={{...DM,fontSize:10,color:T.t3,marginTop:4}}>{detailStr}</div>}
        </div>
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
