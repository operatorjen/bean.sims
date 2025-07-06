import { getThreshold, getTotalCredit, getAvailableCredit, idPetManager, getNetWorth, idVehicleManager as VM } from './player.js'
import { getInflationRate, updateCurrentDay, getTransportationRate as TR, updateCommunity, getCommunityMember, getCurrentDay, getCommunity, getCurrentYear, removeSim, getEcosystem } from './world.js'
import { addHealthInsurance, removeHealthInsurance, buyRealEstate, buyVehicle, addPet, addEmployment, addChild, addAdult, spendingRiskScore as SRS, healthRiskScore as HRS, relationshipRiskScore as RS, findSpouse, leaveEmployment, reproductionAttempt, rentUnit, applyForCredit, sellRealEstate, leaveRental } from './options.js'
import { addAdultView, updateStats, dateRefresh, removeView, updateSky, refreshEcosystem } from './interface.js'
import { stepPhysics } from './physics.js'

let R = Math.random
let FS = findSpouse
let APC = applyForCredit
let GM = getCommunityMember

const MAX_INCOME = 500000
let e = getEcosystem()
const ADULT_AGE = 18

let inflationRate = getInflationRate()
let counter = 0

for (let i = 0; i < 10; i++) {
  const s = addAdult()
  if (s) {
    updateCommunity(s)
    addAdultView(s)
  } 
}

function taxDeduction(amount) {
  const A = amount * 24,
        { incomeTaxRules: { lower:l, middle:m, upper:u, high:h }, progressiveTaxation:p } = getEcosystem().rules;
  if (p) {
    let r = A, t = 0, b;
    b = Math.min(r, l.maxIncome);    t += b * l.taxRate; r -= b; if (r <= 0) return t/24;
    b = Math.min(r, m.maxIncome - l.maxIncome); t += b * m.taxRate; r -= b; if (r <= 0) return t/24;
    b = Math.min(r, u.maxIncome - m.maxIncome); t += b * u.taxRate; r -= b; if (r <= 0) return t/24;
    t += r * h.taxRate;
    return t/24;
  }
  const o = A <= l.maxIncome ? l
          : A <= m.maxIncome ? m
          : A <= u.maxIncome ? u
          : h;
  return A * o.taxRate / 24;
}

export function updateIncome(s, inflationRate) {
  let n = (s.income + 1 + R() * RS(s)) * (1 + inflationRate);
  s.income = ((n > MAX_INCOME ? MAX_INCOME : n) / 24) | 0;
  return s;
}

function getInvestmentReturn() {
  if (getThreshold() === 1) {
    return R() * 0.21 - 0.03
  } else if (getThreshold() === 2) {
    return R() * 0.23 - 0.07
  } else {
    return R() * 0.25 - 0.15
  }
}

function generateMedicalFees(s) {
  let f = 0, c = s.conditions;
  c.anxiety > .7 && (f += R() * 50);
  c.immunity < .3 && (f += R() * 100);
  c.health   < .3 && (f += R() * 200);
  let a = HRS(s),
      h = R() < a ? 0 : Math.floor(R() * (1 - a) * 500);
  for (let k in s.dependents) 
    R() < 1 - s.dependents[k].conditions.health && (f += R() * 200);
  s.liabilities.healthInsurance < 1 && (f = (f + h) * (R() * 2 + 1.5));
  return getEcosystem().totalMedicalFees += f, f;
}

function spendingResponse(s) {
  let c = s.assets.cash,
      sp = SRS(s),
      inv = c > 500 
        ? (R() > (sp > .75 ? .9 : sp > .5 ? .5 : .2) 
            ? 0 
            : c * R() * sp)
        : 0;
  s.assets.cash     -= inv;
  s.assets.investments += inv;

  let cd = 0,
      tc = getTotalCredit(s.liabilities);
  if (tc > 0) {
    let amt = tc * R() * (1 - sp),
        th = R() > (sp > .75 ? .15 : sp > .5 ? .35 : sp > .3 ? .75 : .95)
             ? 0
             : amt;
    cd = th;
  }

  if (cd > 0) {
    const o = getAvailableCredit(s, cd);
    if (o) {
      s = o;
      e.totalDiscretionary += cd;
    }
  }

  return s;
}

function processIncome(s) {
  if (s.income > 0) {
    const deducted = taxDeduction(s.income)
    let e = getEcosystem()
    e.totalTaxes += deducted
    
    const netIncome = s.income - deducted
    s.assets.cash += netIncome
  }

  return s
}

function updateInvestments(s) {
  s.assets.investments += s.assets.investments * getInvestmentReturn()

  if (s.assets.investments < 0) {
    s.assets.investments = 0
  }
  return s
}

function checkCarRepairPurchases(s) {
  for (let k in s.assets.vehicles) {
    let v = s.assets.vehicles[k];
    if (R() < v.maintenanceRisk) {
      let cost = (R() * 500 + 25) | 0,
          o    = getAvailableCredit(s, cost);
      if (o) {
        s = o;
        v.health = Math.min(1, v.health + 0.9 * R());
      } else {
        v.health -= 0.3 * R();
        if (v.health <= 0) {
          v.health = 0;
          let p = (v.currentValue * 0.05) | 0;
          VM.releaseId(k);
          s.assets.cash += p;
          delete s.assets.vehicles[k];
        }
      }
    }
  }
  return s;
}

function checkBirthdays(s) {
  if (s.birthDay === getCurrentDay()) {
    s.age++
  }

  for (let key in s.dependents) {
    if (s.dependents[key].birthDay === getCurrentDay()) {
      s.dependents[key].age++
      if (s.dependents[key].age <= ADULT_AGE) {
      } else {
        let newS = addAdult(s.dependents[key])
        if (newS) {
          addAdultView(newS)
        }
        delete s.dependents[key]
      }
    }
  }
  return s
}

function setWearAndTear(s, id) {
  e = getEcosystem()
  const rules = e.rules
  for (let vehicleType in rules.vehicleRules) {
    if (rules.vehicleRules[vehicleType].priceMax >= s.assets.vehicles[id].currentValue) {
      s.assets.vehicles[id].health -= R() * s.assets.vehicles[id].maintenanceRisk
      if (s.assets.vehicles[id].health < 0) {
        s.assets.vehicles[id].health = 0
      }
    }
  }
  return s
}

function depreciationFirstYear(s, id) {
  e = getEcosystem()
  const rules = e.rules
  for (let veType in rules.vehicleRules) {
    if (rules.vehicleRules[veType].priceMax > s.assets.vehicles[id].currentValue) {
      s.assets.vehicles[id].currentValue -= s.assets.vehicles[id].currentValue * rules.vehicleRules[veType].depreciationFirstYear

      if (s.assets.vehicles[id].currentValue < 0) {
        s.assets.vehicles[id].currentValue = 0
      }
    }
  }

  return s
}

function depreciationYear(s, id) {
  e = getEcosystem()
  const rules = e.rules
  for (let veType in rules.vehicleRules) {
    if (rules.vehicleRules[veType].priceMax > s.assets.vehicles[id].currentValue) {
      s.assets.vehicles[id].currentValue -= s.assets.vehicles[id].currentValue * rules.vehicleRules[veType].depreciation

      if (s.assets.vehicles[id].currentValue < 0) {
        s.assets.vehicles[id].currentValue = 0
      }
    }
  }

  return s
}

function runDaily(s){
  const c=s.conditions;
  R()< (s.age/100)**10.5 && (c.health=0);
  R()< e.pathogenChance && R()> .75 && (s.infected=1);
  if(s.infected){
    c.immunity = Math.max(0,c.immunity - R()*.05);
    c.health   = Math.max(0,c.health   - R()*.05);
    s.traits.anxiety = Math.min(1,s.traits.anxiety + R()*.08);
  }
  if(c.health<.01) return removeSim(s.id),removeView(s.id),false;
  counter>0 && (c.anxiety = Math.min(1,c.anxiety*(1+R()*.05)));
  s.income>0 && (c.health<.1||c.immunity<.1) && (s=leaveEmployment(s));
  if(R()>HRS(s)){
    c.health = Math.max(0,c.health - R()*.0004);
  } else {
    c.health = Math.min(1,c.health + R()*.0004);
  }
  s=checkBirthdays(s);
  if(s.age>120) s.conditions={health:0,immunity:0,anxiety:0};
  s=rentUnit(s);
  s.netWorth=getNetWorth(s);
  if(s.liabilities.healthInsurance<1){
    let h=HRS(s);
    (h>.7 || h>.4 && R()>.6) && (s=addHealthInsurance(s));
  }
  return s;
}

function runEveryThreeDays(s){
  let c=s.conditions, sp=SRS(s), hc=HRS(s), ac, amt=(R()*1000|0)*sp;
  s.assets.cash<amt&&s.assets.investments>=amt&&(s.assets.investments-=amt,s.assets.cash+=amt);
  hc<.4&&(ac=getAvailableCredit(s,generateMedicalFees(s)))&&(s=ac,c.health=Math.min(1,c.health+.5),s.infected=0,c.immunity=Math.min(1,c.immunity+.5));
  !Object.keys(s.assets.vehicles).length&&R()>hc&&s.assets.cash>=TR()&&(s.assets.cash-=TR());
  let fc=(hc>.85? (sp<.25?100:sp<.65?70:50)
        :hc>.65? (sp<.25?90:sp<.65?70:40)
        : (sp<.25?110:sp<.65?80:40))|0;
  ac=getAvailableCredit(s,fc);
  if(ac||s.assets.cash>=fc){
    s.assets.cash>=fc? s.assets.cash-=fc : s=ac;
    c.health=Math.min(1,c.health+.05);
    c.anxiety=Math.max(0,c.anxiety-.05);
    c.immunity=Math.min(1,c.immunity+.05);
    for(let k in s.dependents){
      let d=s.dependents[k].conditions;
      d.health=Math.min(1,d.health+.05);
      d.anxiety=Math.max(0,d.anxiety-.05);
      d.immunity=Math.min(1,d.immunity+.05);
    }
  } else {
    c.health=Math.max(0,c.health-R()*.05);
    c.anxiety=Math.min(1,c.anxiety+R()*.05);
    c.immunity=Math.max(0,c.immunity-R()*.05);
    for(let k in s.dependents){
      let d=s.dependents[k].conditions;
      d.health=Math.max(0,d.health-R()*.05);
      d.anxiety=Math.max(0,d.anxiety-R()*.05);
      d.immunity=Math.max(0,d.immunity-R()*.05);
    }
  }
  if(s.relationships.spouse){
    s=reproductionAttempt(s);
    if(R()>RS(s)&&R()>.5){let p=GM(s.relationships.spouse);p&&(p.relationships.spouse='');s.relationships.spouse='';}
  } else if(R()>.5){
    s=FS(s);
    if(s.relationships.spouse){let p=GM(s.relationships.spouse);p&&(p.relationships.spouse=s.id);}
  }
  if((s.creditScore>=800&&R()>sp&&Object.keys(s.liabilities.credit).length<8)
   ||(s.creditScore>=500&&Object.keys(s.liabilities.credit).length<4)) s=APC(s);
  return s;
}

function runEveryTwoWeeks(s){
  updateStats(s);
  if(HRS(s)>.45){
    let c=s.traits, d=s.conditions;
    d.health+=R()*.0001; d.immunity+=R()*.0001;
    c.physical+=R()*.0001; c.mental+=R()*.0002;
    d.anxiety-=R()*.0005;
    d.health   = Math.min(1,d.health);
    d.immunity = Math.min(1,d.immunity);
    c.physical = Math.min(1,c.physical);
    c.mental   = Math.min(1,c.mental);
    d.anxiety  = Math.max(0,d.anxiety);
  }
  s.income>1
    ? s=processIncome(s,'salary')
    : R()<=RS(s)&&(s=addEmployment(s));
  for(let k in s.assets.vehicles){
    let v=s.assets.vehicles[k], cost=0, o;
    s=setWearAndTear(s,k);
    if(R()<1-v.health && R()>.7){
      cost = v.accidentMultiplier * (Math.floor(R()*300));
      v.health = Math.max(0, v.health - R());
    }
    cost && (o = getAvailableCredit(s, cost)) && (s = o);
    if(v.health>.1){
      let fc = Math.floor(R()*(1-v.health));
      (o = getAvailableCredit(s, fc)) && (s = o, v.health = Math.min(1, v.health + .2));
    } else v.health = 0;
  }
  return s;
}

function runEveryQuarter(s){
  const re=Object.keys(s.assets.realEstate),
        rr=Object.keys(s.liabilities.rentals),
        c=s.conditions,
        t=s.traits;
  re.length&&R()>.5&&rr.length&&(s=leaveRental(s,rr[0]));
  !re.length&&!rr.length&&getNetWorth(s)<1e4&&(
    c.anxiety=Math.min(1,c.anxiety+R()*.08),
    c.immunity=Math.min(1,c.immunity+R()*.08),
    t.physical=Math.max(0,t.physical-R()*.04),
    t.mental=Math.max(0,t.mental-R()*.04)
  );
  s=updateInvestments(s);
  ((R()>RS(s)&&R()>HRS(s))||s.assets.investments>1e6)&&R()>.7&&(s=leaveEmployment(s));
  s.assets.investments>0&&(s=processIncome(s,'dividends'));
  return checkCarRepairPurchases(s);
}

function runEveryMonth(s){
  let re=Object.keys(s.assets.realEstate),
      rr=Object.keys(s.liabilities.rentals),
      c=s.conditions,
      t=s.traits;

  re.length<R()*10 && (s=buyRealEstate(s));

  if(s.pregnant>0){
    s.pregnant++;
    t.physical=Math.max(.01,t.physical-R()*.001);
    t.mental  =Math.max(.01,t.mental  -R()*.002);
    if((t.physical<.2&&R()>.5)||s.pregnant===9){
      s=addChild(s,s.relationships.spouseWithChild);
      s.pregnant=0;
      e.totalBirths++;
    }
  }

  // Pet supplies
  for(let k in s.pets){
    let sup=(R()*100+75)|0, o=getAvailableCredit(s,sup);
    o? s.pets[k].health=Math.min(1,s.pets[k].health+.25):0;
  }

  // Vet visits
  for(let k in s.pets){
    let vc=R()>.75?(R()*900|0):0,
        o = getAvailableCredit(s,vc);
    if(o){
      s=o;
      s.pets[k].health=1;
      e.totalVetFees+=vc;
    } else {
      s.creditScore=Math.max(0,s.creditScore-5);
      let hr=R()>.8?R()*.02:0;
      if((s.pets[k].health-=hr)<.01||s.pets[k].age>25) idPetManager.releaseId(k),delete s.pets[k];
    }
  }

  // Medical fees
  let mf=generateMedicalFees(s),
      o2=getAvailableCredit(s,mf);
  if(o2){
    s=o2;
    s.infected=0;
  } else {
    c.health   = Math.max(0,c.health   -R()*.003);
    c.immunity = Math.max(0,c.immunity -R()*.03);
    c.anxiety  = Math.min(1,c.anxiety  +R()*.08);
    for(let k in s.dependents){
      let d=s.dependents[k].conditions;
      d.anxiety = Math.min(1,d.anxiety+.001);
      R()>.5 && (d.health = Math.max(0,d.health-.002));
      R()>.7 && (d.immunity = Math.max(0,d.immunity-.001));
    }
    R()>.6 && (s=removeHealthInsurance(s));
  }

  // Mortgages
  for(let k in s.liabilities.mortgages){
    let m=s.liabilities.mortgages[k].amount;
    if(s.assets.cash>m){
      s.assets.cash-=m;
      s.creditScore=Math.min(1e3,s.creditScore+5);
      re.length>1&&R()>.6&&(s=sellRealEstate(s,k));
    } else {
      s.creditScore=Math.max(0,s.creditScore-20);
      s=sellRealEstate(s,k);
    }
  }

  // Unit fees
  for(let k in s.liabilities.unitFees){
    let uf=s.liabilities.unitFees[k].amount;
    if(s.assets.cash>uf) s.assets.cash-=uf;
    else {
      s.creditScore=Math.max(0,s.creditScore-10);
      let rem=s.assets.realEstate[k].currentValue
             - (s.assets.realEstate[k].currentValue - (s.liabilities.mortgages[k]?.principalPaid||0))
             - uf;
      rem>0&&(s.assets.cash+=rem);
      delete s.liabilities.unitFees[k];
      delete s.liabilities.mortgages[k];
      delete s.assets.realEstate[k];
    }
  }

  // Rentals
  for(let k in s.liabilities.rentals){
    let tf=s.liabilities.rentals[k].amount + s.liabilities.rentals[k].rentalInsurance;
    s.assets.cash>tf
      ? s.assets.cash-=tf
      : (s.creditScore=Math.max(0,s.creditScore-10), s=leaveRental(s,k));
  }

  // Loans
  for(let k in s.liabilities.loans){
    let ln=s.liabilities.loans[k];
    if(s.assets.cash>ln.amount){
      s.assets.cash-=ln.amount;
      ln.principalPaid+=ln.amount;
      ln.amountOwing-=ln.amount;
      let dlt=ln.amountOwing*ln.interestRate/12;
      ln.interestAccrued+=dlt;
      ln.amountOwing+=dlt;
    } else {
      s.creditScore=Math.max(0,s.creditScore-15);
      delete s.liabilities.loans[k];
    }
  }

  // Credit cards
  for(let k in s.liabilities.credit){
    let cr=s.liabilities.credit[k];
    if(s.assets.cash>=cr.amount){
      s.assets.cash-=cr.amount;
      cr.amount=0;
      s.creditScore=Math.min(1e3,s.creditScore+3);
      let dlt=cr.amount*parseFloat(cr.interestRate)/12;
      cr.amount+=dlt; cr.interestAccrued+=dlt;
    } else {
      s.creditScore<500
        ? delete s.liabilities.credit[k]
        : s.creditScore=Math.max(0,s.creditScore-5);
    }
  }

  return spendingResponse(s);
}

function runEveryYear(s){
  let p=s.pets;
  for(let k in p) if(++p[k].age>25||p[k].health<.01) delete p[k];

  let sp=SRS(s), rr=RS(s);
  if(R()<1-sp&&R()<1-rr){
    s.pets=addPet(s.pets);
    s.creditScore>600&&(s=buyVehicle(s));
  }

  for(let k in s.liabilities.rentals){
    let r=s.liabilities.rentals[k];
    r.amount*=1+inflationRate;
    r.rentalInsurance*=1+inflationRate;
  }

  let re=Object.keys(s.assets.realEstate);
  if(re.length) for(let k of re){
    let t=s.assets.realEstate[k].propertyTaxes;
    if(s.assets.cash>=t){
      s.assets.cash-=t;
      e.totalTaxes+=t;
    }else{
      s.creditScore=Math.max(0,s.creditScore-15);
      if(s.liabilities.mortgages[k]){
        let m=s.liabilities.mortgages[k],
            rem=s.assets.realEstate[k].currentValue-(s.assets.realEstate[k].currentValue-m.principalPaid)-s.liabilities.unitFees[k].amount;
        rem>0&&(s.assets.cash+=rem);
      }
      delete s.liabilities.unitFees[k];
      delete s.liabilities.mortgages[k];
      delete s.assets.realEstate[k];
    }
  }

  let vs=Object.keys(s.assets.vehicles);
  if(vs.length) for(let k of vs){
    let v=s.assets.vehicles[k];
    v.age++;
    s=v.age===1
      ? depreciationFirstYear(s,k)
      : depreciationYear(s,k);
    let cost=v.maintenanceRisk*R()*150,
        o=getAvailableCredit(s,cost);
    if(o){
      s=o;
      v.accidentMultiplier=0;
    } else {
      s.creditScore=Math.max(0,s.creditScore-5);
      v.accidentMultiplier=100;
    }
  }

  return s;
}

function renderCommunity(community, e) {
  for (let id in community) {
    let s = community[id]

    if (!s) return
    s = runDaily(s)
    if (!s) return

    if (getCurrentDay() % 3 === 0) {      
      s = runEveryThreeDays(s)
    }
    
    if (getCurrentDay() % 15 === 0 && s) {
      s = runEveryTwoWeeks(s)
    }
    
    if (getCurrentDay() % 90 === 0) {
      s = runEveryQuarter(s)
    }
    
    if (getCurrentDay() % 30 === 0) {
      s = runEveryMonth(s)
    }
    
    if (getCurrentDay() % 360 === 0) {      
      s = runEveryYear(s)
    }
  }
}

function startTimer(counter) {
  if (counter % (2 * (10 - e.simulationSpeed)) === 0) {
    dateRefresh(getCurrentYear(), getCurrentDay())
    updateCurrentDay(e.simulationSpeed)

    const community = getCommunity()

    if (Object.keys(community).length === 0) {
      population.textContent = `Adult Population: 0`
      return
    }

    renderCommunity(community, e)
    e = getEcosystem()
    updateSky(counter, 1000 / e.simulationSpeed)
    refreshEcosystem()
  } 

  if (counter % 2 === 0) {
    stepPhysics() 
  }
  counter++
  return counter
}

function animate() {
  counter = startTimer(counter)
  requestAnimationFrame(animate)
}
animate()