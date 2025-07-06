import { initializeSim, idManager, idVehicleManager, idPropertyManager, idRentalManager, idPetManager, getTotalCredit, getNetWorth } from './player.js'
import { getCurrentDay, getCurrentYear, getCommunity, getInflationRate as IR, updateCommunity, getCommunityMember, getEcosystem } from './world.js'

const R=Math.random,
      C=['b','d','f','g','h','j','k','l','m','n','p','r','s','t','v','w','z','ch','sh','th','qu'],
      V=['a','e','i','o','u','ai','ou','ei','ua'],
      E=['an','el','is','on','ar','en','as','in','or','us','ia','eo','y','u'],
      rand=a=>a[(R()*a.length)|0],
      cap=s=>s.replace(/\b\w/g,c=>c.toUpperCase()),
      genName=()=>{let n='',s=(R()<.5?2:3);while(s-->1)n+=rand(C)+rand(V);return cap(n+rand(E))},
      tiers=[{m:500,M:600,ch:.5,add:.15},{m:600,M:700,ch:.75,add:.13},{m:700,M:800,ch:.85,add:.11},{m:800,M:900,ch:.95,add:.08}]

export function applyForCredit(s){
  let ie=s.income/10,t=getTotalCredit(s);if(t>0)ie+=t/5
  let cc={type:'Credit Card',amount:0,limit:ie,interestAccrued:0}
  let base=IR()+R()*.05,ti=tiers.find(ti=>s.creditScore>=ti.m&&s.creditScore<ti.M)
  cc.interestRate=base + (ti&&R()<ti.ch?ti.add:0.08)
  s.liabilities.credit[Date.now()]=cc
  return s
}

export function rentUnit(s){
  let e=getEcosystem(),r=e.adjustedRentalRate
  if(s.creditScore>500&&!Object.keys(s.liabilities.rentals).length){
    let amt=Math.floor(R()*2000+1000)*(1+r)
    if(s.assets.cash>=amt){
      let id=idRentalManager.generateId()
      if(id) s.assets.cash-=amt, s.liabilities.rentals[`ren_${id}`]={type:'Rental',amount:amt,rentalInsurance:Math.floor(R()*15+15)*(1+e.inflationRate)}
    }
  }
  return s
}

export function leaveRental(s,id){
  idRentalManager.releaseId(id)
  delete s.liabilities.rentals[id]
  return s
}

export function buyVehicle(s){
  let e=getEcosystem(),r=e.rules.vehicleRules,base=IR()+R()*.05,
      pv=Math.floor((R()*150000+5000)*(1+e.adjustedVehicleRate)*(1+base)),cv=pv
  if(s.creditScore>750){
    let id=idVehicleManager.generateId()
    if(id){
      let cat=Object.values(r).find(o=>pv<=o.priceMax)||r.superLuxury
      cv-=cat.depreciationOffLot*cv
      let v=`veh_${id}`
      s.assets.vehicles[v]={purchaseValue:pv,age:0,currentValue:cv,maintenanceRisk:cat.maintenanceRisk,accidentMultiplier:0,health:1}
      s.liabilities.loans[v]={name:`Vehicle loan ${v}`,amount:(pv+pv*base)/12,amountOwing:pv,interestRate:base,interestAccrued:0,principalPaid:0}
      if(Object.keys(s.assets.vehicles).length>1&&R()>.5) sellVehicle(s,Object.keys(s.assets.vehicles)[(R()*Object.keys(s.assets.vehicles).length)|0])
      e.totalVehicles++
    }
  }
  return s
}

export function buyRealEstate(s){
  let e=getEcosystem(),base=IR()-R()*.05,size=(R()*3000+400)|0,
      pv=Math.floor(size*(R()*1000+200))*(1+e.adjustedVehicleRate)*(1+base),dp=pv*.25
  if(s.assets.cash>=dp&&getNetWorth(s)>pv){
    let id=idPropertyManager.generateId(),rent=0
    if(id){
      let p=`prop_${id}`
      s.assets.realEstate[p]={purchaseValue:pv,size: size,currentValue:pv,rentalIncome:0,propertyTaxes:(R()*3+3)*size,health:1}
      e.totalRealEstate++
      s.liabilities.unitFees[p]={amount:(.3*size)|0}
      if(Object.keys(s.assets.realEstate).length>1) s.assets.realEstate[p].rentalIncome=size*(R()*IR())+.8
      s.liabilities.mortgages[p]={amount:pv-dp,interestRate:base,interestAccrued:0,principalPaid:0,downPayment:dp}
      s.assets.cash-=dp
    }
  }
  return s
}

export function sellVehicle(s,id){
  let e=getEcosystem(),tax=s.assets.vehicles[id].currentValue*e.adjustedVehicleRate*.05
  e.totalTaxes+=tax
  s.assets.cash+=s.assets.vehicles[id].currentValue*(1+e.adjustedVehicleRate)-tax
  idVehicleManager.releaseId(id)
  delete s.assets.vehicles[id]
  return s
}

export function sellRealEstate(s,id){
  let e=getEcosystem(),cur=s.assets.realEstate[id].currentValue,m=s.liabilities.mortgages[id]?.amount||0,
      tax=cur*e.adjustedRealEstateRate*.1
  e.totalTaxes+=tax
  s.assets.cash+=cur*(1+e.adjustedRealEstateRate)-m-tax
  idPropertyManager.releaseId(id)
  delete s.liabilities.mortgages[id]
  delete s.liabilities.unitFees[id]
  return s
}

export function addEmployment(s){
  let inc=150000+1+IR()
  if(R()<relationshipRiskScore(s)) inc+=R()*20000
  if(R()<healthRiskScore(s)) inc+=R()*5000
  s.income=(inc/24)|0
  return s
}

export function leaveEmployment(s){ s.income=0; return s }
export function addPet(p){ let i=idPetManager.generateId(); if(i) p[`pet_${i}`]={age:0,health:1}; return p }
export function reproductionAttempt(s){ let e=getEcosystem(); if(R()<e.reproductionChance&&R()<s.reproducibility&&s.pregnant<1) s.pregnant=1,s.relationships.spouseWithChild=s.relationships.spouse; return s }
export function addHealthInsurance(s){ s.liabilities.healthInsurance=(R()*500+50)|0; for(let k in s.dependents||{}) s.liabilities.healthInsurance+=100; return s }
export function updateHealthInsurance(s,ir){ s.liabilities.healthInsurance+=s.liabilities.healthInsurance*ir; return s }
export function removeHealthInsurance(s){ s.liabilities.healthInsurance=0; return s }

export function addAdult(metadata=null){
  let s=initializeSim()
  if(!s.id) return false
  if(metadata) Object.assign(s,metadata,{reproducibility:0.95,x:metadata.x||R()*500+30,y:metadata.y||R()*500+30,vx:0,vy:0})
  else{ let a=s.age; s.reproducibility=a<25?.8:a<30?.6:a<35?.5:a<40?.25:a<45?.05:0; s.x=s.y=s.vx=s.vy=0; s.name=genName(); s.relationships.parents=[]; s.health=healthRiskScore(s)*R()+.1 }
  updateCommunity(s); return s
}

export function addChild(s,sp){
  let id=idManager.generateId(); if(id){ let p2=getCommunityMember(sp),an=p2?(s.conditions.anxiety+p2.conditions.anxiety)/2:R(),im=p2?(s.conditions.immunity+p2.conditions.immunity)/2:R(),pch={physical:((s.traits.physical+(p2?.traits?.physical||0))/2),mental:((s.traits.mental+(p2?.traits?.mental||0))/2),spiritual:((s.traits.spiritual+(p2?.traits?.spiritual||0))/2)},d={id:`sim_${id}`,name:genName(),age:0,conditions:{anxiety:an,immunity:im,health:1},traits:pch,birthYear:getCurrentYear(),birthDay:getCurrentDay(),relationships:{parents:[],spouse:'',children:[],siblings:[]}}; d.relationships.parents.push(sp); s.relationships.children.push(d.id); s.dependents||(s.dependents={}); s.dependents[d.id]=d; s.pregnant=0 }
  return s
}

export function spendingRiskScore(s){
  let a=[s.traits.physical,s.traits.mental,s.traits.spiritual],
      c75=a.filter(v=>v>.75).length,
      c45=a.filter(v=>v>.45).length,
      c25=a.filter(v=>v>.25).length,
      c0 = a.filter(v=>v>0).length;
  return c75===3?.9
    :c75===2?.8
    :c75===1&&c45===3?.7
    :c45===3?.6
    :c45===2?.5
    :c25>=2?.4
    :c25>=1?.3
    :c0===3?.2
    :.1;
}

export function healthRiskScore(s){
  let [p,m]=[s.traits.physical,s.traits.mental],t=[.85,.75,.9,.75,.65,.8,.7,.55,.7,.6,.45,.6,.5,.35,.5,.4,.25,.4,.3,.15,.3,.2,0,.1],i=0;
  while(i<t.length&&!(p>t[i]&&m>t[i+1]))i+=3;
  return t[i+2]||.1;
}

export function relationshipRiskScore(s){
  let a=[s.traits.physical,s.traits.mental,s.traits.spiritual],t=[.8,.75,.8,.9,.7,.65,.7,.8,.6,.55,.6,.7,.5,.45,.5,.6,.4,.35,.4,.5,.35,.25,.35,.4,.25,.15,.25,.3,.15,.05,.15,.2],i=0;
  while(i<t.length&&!(a[0]>t[i]&&a[1]>t[i+1]&&a[2]>t[i+2]))i+=4;
  return t[i+3]||.1;
}

export function findSpouse(s){
  let com=getCommunity();
  for(let k in com) if(![...s.relationships.parents,...s.relationships.siblings,...s.relationships.children].includes(k)&&!s.relationships.spouse&&k!==s.id){
    let o=getCommunityMember(k),c=0;
    for(let t of['physical','mental','spiritual']) Math.abs(o.traits[t]-s.traits[t])<.08&&c++;
    if(c>1){s.relationships.spouse=k;break}
  }
  return s
}
