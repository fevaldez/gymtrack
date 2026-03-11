import { useState } from "react";
import { T, BB, DM, DS } from '../data/theme.js';

export function SwapDrawer({ex,sessionSwaps,setSessionSwaps,onClose}) {
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

export function PlanView({plan,idx,midSkip,setMidSkip,sessionSwaps,setSessionSwaps,routine,onClose}) {
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
        <SwapDrawer ex={swapTarget} sessionSwaps={sessionSwaps} setSessionSwaps={setSessionSwaps} onClose={()=>setSwapTarget(null)}/>
      )}
    </div>
  );
}
