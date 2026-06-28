import type { TrialEvent, CptFeatureVector } from '../types'

function normalInverse(p: number): number {
  p = Math.max(0.001, Math.min(0.999, p))
  const a=[0,-39.697,220.946,-275.929,138.358,-30.665,2.5066]
  const b=[0,-54.476,161.586,-155.699,66.801,-13.281]
  const c=[0,-0.007785,-0.32240,-2.40076,-2.54973,4.37466,2.93816]
  const d=[0,0.007785,0.32247,2.44513,3.75441]
  const pLow=0.02425,pHigh=1-pLow; let q:number
  if(p<pLow){q=Math.sqrt(-2*Math.log(p));return(((((c[1]*q+c[2])*q+c[3])*q+c[4])*q+c[5])*q+c[6])/((((d[1]*q+d[2])*q+d[3])*q+d[4])*q+1)}
  else if(p<=pHigh){q=p-0.5;const r=q*q;return(((((a[1]*r+a[2])*r+a[3])*r+a[4])*r+a[5])*r+a[6])*q/(((((b[1]*r+b[2])*r+b[3])*r+b[4])*r+b[5])*r+1)}
  else{q=Math.sqrt(-2*Math.log(1-p));return-(((((c[1]*q+c[2])*q+c[3])*q+c[4])*q+c[5])*q+c[6])/((((d[1]*q+d[2])*q+d[3])*q+d[4])*q+1)}
}

function slope(v:number[]):number{
  const n=v.length,xm=(n-1)/2,ym=v.reduce((a,b)=>a+b,0)/n
  let num=0,den=0;for(let i=0;i<n;i++){num+=(i-xm)*(v[i]-ym);den+=(i-xm)**2}
  return den?num/den:0
}

function tScore(raw:number,mean:number,sd:number){return Math.round(50+10*(raw-mean)/sd)}

export function extractCptFeatures(trials: TrialEvent[]): CptFeatureVector {
  const go=trials.filter(t=>t.stimulus_type==='go')
  const nogo=trials.filter(t=>t.stimulus_type==='nogo')
  const hits=go.filter(t=>t.response_given&&!t.is_perseveration)
  const omit=go.filter(t=>!t.response_given)
  const comm=nogo.filter(t=>t.response_given&&!t.is_perseveration)
  const persevs=trials.filter(t=>t.is_perseveration)
  const rts=hits.map(t=>t.response_time_ms!).filter(Boolean)
  const rtMean=rts.length?rts.reduce((a,b)=>a+b,0)/rts.length:500
  const rtSd=rts.length>1?Math.sqrt(rts.reduce((a,b)=>a+(b-rtMean)**2,0)/rts.length):80
  const hr=go.length?hits.length/go.length:0.5
  const far=nogo.length?comm.length/nogo.length:0.1
  const dprime=normalInverse(hr)-normalInverse(far)
  const bErrs=[0,1,2,3,4,5].map(b=>{const bt=trials.filter(t=>t.block_index===b);if(!bt.length)return 0;const e=bt.filter(t=>t.stimulus_type==='go'?!t.response_given:(t.response_given&&!t.is_perseveration)).length;return e/bt.length})
  const blockChange=slope(bErrs)
  const sFAs=comm.filter(t=>t.block_index===2||t.block_index===3).length
  const sN=nogo.filter(t=>t.block_index===2||t.block_index===3).length
  const lFAs=comm.filter(t=>t.block_index===4||t.block_index===5).length
  const lN=nogo.filter(t=>t.block_index===4||t.block_index===5).length
  const isiChange=(sN?sFAs/sN:0)-(lN?lFAs/lN:0)
  const oT=tScore((omit.length/Math.max(go.length,1))*100,5,4)
  const cT=tScore((comm.length/Math.max(nogo.length,1))*100,12,9)
  const rmT=tScore(rtMean,360,70)
  const rsT=tScore(rtSd,85,35)
  const pT=tScore(persevs.length,4,3)
  return{
    omissions_t:oT,commissions_t:cT,hit_rt_mean_t:rmT,hit_rt_sd_t:rsT,
    detectability_d_prime:Math.round(dprime*100)/100,
    perseverations_t:pT,block_change:Math.round(blockChange*1e4)/1e4,
    isi_change:Math.round(isiChange*1e4)/1e4,
    confidence_index_t:Math.round(oT*0.25+cT*0.35+rsT*0.25+pT*0.15),
    raw:{omissions:omit.length,commissions:comm.length,hit_rt_mean:Math.round(rtMean),hit_rt_sd:Math.round(rtSd),hit_rate:Math.round(hr*100)/100,false_alarm_rate:Math.round(far*100)/100,perseverations:persevs.length}
  }
}

export function generateTrialSeq(count: number): ('go'|'nogo')[] {
  const numGo=Math.round(count*0.8)
  const seq:('go'|'nogo')[]=[...Array(numGo).fill('go'),...Array(count-numGo).fill('nogo')]
  for(let i=seq.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[seq[i],seq[j]]=[seq[j],seq[i]]}
  return seq
}
