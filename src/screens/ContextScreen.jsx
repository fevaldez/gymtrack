import { T, BB, DM, DS } from '../data/theme.js';
import { buildPlan } from '../logic/buildPlan.js';

export function ContextScreen({routine,ctx,setCtx,onBack,onBrief}) {
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
