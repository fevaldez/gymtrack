import { T, BB, DM, DS } from '../data/theme.js';
import { ROUTINES } from '../data/routines.js';


export function HomeScreen({gd,onSelect,onHistory}) {
  return(
    <div style={{minHeight:"100vh",background:T.bg,color:T.t1,...DS,maxWidth:480,margin:"0 auto"}}>
      <div style={{padding:"56px 24px 24px"}}>
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
      <div style={{position:"fixed",bottom:8,left:12,fontSize:10,...DM,color:"#3F3F46",letterSpacing:"0.08em",pointerEvents:"none",zIndex:1}}>
        v{__APP_VERSION__}
      </div>
    </div>
  );
}
