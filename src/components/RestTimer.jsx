import { useState, useEffect, useRef } from "react";
import { T, BB, DM, DS } from '../data/theme.js';

export function RestTimer({secs,next,onDone,onSkip}) {
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
