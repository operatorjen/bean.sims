import{sellRealEstate as SRE,sellVehicle as SV}from"./options.js";
import{getNetWorth as NW,idPetManager as PM,idRentalManager as RM}from"./player.js";

let R=Math.random,
    d=1,
    y=new Date().getFullYear(),
    t=Math.floor(R()*50+10),
    community={},
    deceased=0,
    eco={
      simulationSpeed:1,
      inflationRate:parseFloat(inflationRate.value)||3,
      reproductionChance:0.75,
      averageAgeDeath:0,
      totalTaxes:0,
      realEstateCap:100,
      rentalCap:300,
      vehicleCap:500,
      petsCap:300,
      totalRealEstate:0,
      totalVehicles:0,
      totalBirths:0,
      totalMedicalFees:0,
      totalVetFees:0,
      totalDiscretionary:0,
      totalCloning:0,
      pathogenChance:0,
      pathogenThreshold:0,
      adjustedRealEstateRate:0,
      adjustedVehicleRate:0,
      adjustedRentalRate:0,
      zoomLevel:1,
      rules: {
        vehicleRules: {
          nonLuxury: {
            priceMax: 45000,
            depreciationOffLot: R() * (0.2 - 0.15) + 0.15,
            depreciationFirstYear: R() * (0.2 - 0.15) + 0.15,
            depreciation: R() * (0.15 - 0.1) + 0.1,
            maintenanceRisk: R() * (0.2 - 0.05) + 0.05
          },
          luxury: {
            priceMax: 120000,
            depreciationOffLot: R() * (0.15 - 0.1) + 0.1,
            depreciationFirstYear: R() * (0.15 - 0.1) + 0.1,
            depreciation: R() * (0.1 - 0.05) + 0.05,
            maintenanceRisk: R() * (0.15 - 0.03) + 0.03
          },
          superLuxury: {
            priceMax: 10000000,
            depreciationOffLot: R() * (0.1 - 0.1) + 0.05,
            depreciationFirstYear: R() * (0.1 - 0.05) + 0.05,
            depreciation: R() * (0.07 - 0.02) + 0.02,
            maintenanceRisk: R() * (0.2 - 0.05) + 0.05
          }
        },
        propertyRules: {
          lower: {
            priceMax: 350000,
            maintenanceRisk: R() * (0.2 - 0.05) + 0.05
          },
          middle: {
            priceMax: 1500000,
            maintenanceRisk: R() * (0.15 - 0.03) + 0.03
          },
          upper: {
            priceMax: 3500000,
            maintenanceRisk: R() * (0.1 - 0.02) + 0.02
          },
          high: {
            priceMax: 100000000,
            maintenanceRisk: R() * (0.2 - 0.05) + 0.05
          }
        },
        incomeTaxRules: {
          lower: {
            maxIncome: 20000,
            taxRate: 0.00
          },
          middle: {
            maxIncome: 80000,
            taxRate: R() * (0.28 - 0.17) + 0.17
          },
          upper: {
            maxIncome: 200000,
            taxRate: R() * (0.45 - 0.31) + 0.31
          },
          high: {
            maxIncome: 100000000,
            taxRate: R() * (0.5 - 0.37) + 0.37
          }
        }
      }
    }

// batch hookup of all sliders/text outputs
;[
  ['simulationSpeed',     v=>eco.simulationSpeed=+v,   x=>`${eco.simulationSpeed}x`],
  ['inflationRate',       v=>eco.inflationRate=+v,     x=>`${(eco.inflationRate*100).toFixed(2)}%`],
  ['reproductionChance',  v=>eco.reproductionChance=+v, x=>`${(eco.reproductionChance*100).toFixed(0)}%`],
  ['pathogenThreshold',   v=>eco.pathogenThreshold=+v,  x=>eco.pathogenThreshold],
  ['pathogenChance',      v=>eco.pathogenChance=+v,     x=>`${(eco.pathogenChance*100).toFixed(2)}%`],
  ['realEstateCap',       v=>eco.realEstateCap=+v,      x=>eco.realEstateCap],
  ['rentalCap',           v=>eco.rentalCap=+v,          x=>eco.rentalCap],
  ['vehicleCap',          v=>eco.vehicleCap=+v,         x=>eco.vehicleCap],
  ['petsCap',             v=>eco.petsCap=+v,            x=>eco.petsCap]
].forEach(([id,upd,fmt])=>{
  
  let el=document.querySelector(`#${id}`),
      txt=document.querySelector(`#${id}Friendly`);

  txt.textContent=fmt();
  el.addEventListener('change',e=>{upd(e.target.value);txt.textContent=fmt();});
});

// getters/setters
export const getInflationRate   =()=>eco.inflationRate,
             getEcosystem       =()=>eco,
             updateEcosystem    =c=>(eco=c,eco),
             getCurrentDay      =()=>d+1,
             getCurrentYear     =()=>y,
             getTimestamp       =()=>`${y}-${d}`,
             getTransportationRate=()=>t;

// advance the clock
export function updateCurrentDay(){
  d++;
  if(d===361){
    y++;
    t+=1+eco.inflationRate;
    d=1;
  }
  return d;
}

export const updateCommunity  =s=>community[s.id]=s,
             getCommunity      =()=>community,
             getDeceased       =()=>deceased,
             getCommunityMember= id=>community[id]||false;

// death & asset cleanup
export function removeSim(id){
  deceased++;
  let s=community[id];
  for(let k in s.assets.realEstate) SRE(s,k);
  for(let k in s.assets.vehicles   ) SV(s,k);
  for(let k in s.pets              ) PM.releaseId(k);
  for(let k in s.liabilities.rentals) RM.releaseId(k);

  eco.averageAgeDeath=(eco.averageAgeDeath+s.age)/2;
  delete community[id];
  return community;
}

// averages
export function getAverageNetWorth(){
  let t=0, n=0;
  for(let k in community){
    let v=NW(community[k]);
    community[k].netWorth=v;
    !isNaN(v)&&(t+=v,n++);
  }
  return n? t/n|0:0;
}

export function getAverageIncome(){
  let t=0,n=0;
  for(let k in community){
    let v=community[k].income*24;
    !isNaN(v)&&(t+=v,n++);
  }
  return n? t/n|0:0;
}
