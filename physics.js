import{getNetWorth as w}from'./player.js'
import{getCommunity as C,getEcosystem as E}from'./world.js'
import{healthRiskScore as h}from'./options.js'
import{updateRoadsThrottled as R,recordTraffic as T}from'./roads.js'
import{updateBuildings as B}from'./generateBuildings.js'
const M=.5,N=50,P=20,X=1.5,d0=1.5,W=1e7,r=Math.random

export function computeForces(s){
  let c=C(),ax={},ay={}
  Object.keys(c).forEach(i=>{ax[i]=0;ay[i]=0;let o=c[i];if(o){let p=o.traits.physical;ax[i]+=M*p*s+(r()-.5)*N*s;ay[i]+=M*p*s+(r()-.5)*N*s;o.netWorth=w(o)}})
  for(let i in c){let A=c[i];if(!A)continue;let{x,y,traits:t}=A,p=t.physical,m=t.mental,sp=t.spiritual,net=A.netWorth||0
    for(let j in c)if(j>i){
      let B=c[j];
      if(!B)continue;
      B.netWorth=w(B);
      let dx=B.x-x,dy=B.y-y,ds=dx*dx+dy*dy;
      if(!ds||!isFinite(ds))continue;let d=Math.sqrt(ds),ux=dx/d,uy=dy/d
      if(d<E().pathogenThreshold&&r()<E().pathogenChance){if(A.infected&&!B.infected&&r()>h(B))B.infected=1,B.conditions.anxiety+=r()*.1,B.conditions.immunity-=r()*.05,B.conditions.health-=r()*.05;else if(B.infected&&!A.infected&&r()>h(A))A.infected=1,A.conditions.anxiety+=r()*.1,A.conditions.immunity-=r()*.05,A.conditions.health-=r()*.05}
      if(d<5){B.conditions.anxiety=(B.conditions.anxiety*7+A.conditions.anxiety*3)/10;B.traits.mental=(B.traits.mental*7+A.traits.mental*3)/10;B.traits.spiritual=(B.traits.spiritual*7+A.traits.spiritual*3)/10;A.conditions.anxiety=(B.conditions.anxiety*3+A.conditions.anxiety*7)/10;A.traits.mental=(B.traits.mental*3+A.traits.mental*7)/10;A.traits.spiritual=(A.traits.spiritual*7+B.traits.spiritual*3)/10}
      let netB=B.netWorth,wS=1-Math.min(1,Math.abs(net-netB)/W),mS=1-Math.min(1,Math.abs(m-B.traits.mental)/2),aS=1-Math.min(1,Math.abs(A.conditions.anxiety-B.conditions.anxiety)/2),sS=1-Math.min(1,Math.abs(sp-B.traits.spiritual)/2)
      let f=(p*B.traits.physical+m*B.traits.mental+sp*B.traits.spiritual)/ds*(.1+.5*wS*mS*aS*sS)-(ds<d0?P/Math.pow(ds,X):0),fx=f*ux,fy=f*uy
      ax[i]+=fx;ay[i]+=fy;ax[j]-=fx;ay[j]-=fy
    }
  }
  return{ax,ay}
}

export function stepPhysics(){
  let e=E(),c=C(),{ax,ay}=computeForces(e.simulationSpeed),dp=.95**(140/e.simulationSpeed),
      ctr=document.querySelector('#community'),cw=ctr.clientWidth,ch=ctr.clientHeight
  Object.values(c).forEach(o=>{o.vx=(o.vx+ax[o.id])*dp;o.vy=(o.vy+ay[o.id])*dp;o.x+=o.vx;o.y+=o.vy
    let v=document.getElementById(o.id);if(!v)return;let ew=v.offsetWidth,eh=v.offsetHeight,mx=cw-ew,my=ch-eh
    o.x<0?(o.x=0,o.vx=-o.vx*1.8):o.x>mx&&(o.x=mx,o.vx=-o.vx*1.8)
    o.y<0?(o.y=0,o.vy=-o.vy*1.8):o.y>my&&(o.y=my,o.vy=-o.vy*1.8)
    v.style.transform=`translate(${o.x}px,${o.y}px) scale(${e.zoomLevel})`
    T(c);R(performance.now());B()
  })
}
