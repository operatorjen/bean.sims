import{getEcosystem as E}from"./world.js";
let t=1,R=Math.random;
export const idManager={generateId:()=>crypto.randomUUID()};
const vM=E(),mV=vM.vehicleCap,pV=new Set();
export const idVehicleManager={
 generateId:()=>{
  if(vM.adjustedVehicleRate>0)vM.adjustedVehicleRate=Math.max(0,vM.adjustedVehicleRate-R()*.0005);
  if(pV.size>=mV){if(vM.adjustedVehicleRate<.01)vM.adjustedVehicleRate+=R()*.001;return!1}
  let i=0;while(pV.has(i))i=(i+1)%mV;
  return pV.add(i)&&i
 },
 releaseId:i=>pV.delete(i)
};
const pM=E(),mP=pM.realEstateCap,pP=new Set();
export const idPropertyManager={
 generateId:()=>{
  if(pM.adjustedRealEstateRate>0)pM.adjustedRealEstateRate=Math.max(0,pM.adjustedRealEstateRate-R()*.05);
  if(pP.size>=mP){if(pM.adjustedRealEstateRate<.02)pM.adjustedRealEstateRate+=R()*.003;return!1}
  let i=0;while(pP.has(i))i=(i+1)%mP;
  return pP.add(i)&&i
 },
 releaseId:i=>pP.delete(i)
};
const rM=E(),mR=rM.rentalCap,pR=new Set();
export const idRentalManager={
 generateId:()=>{
  if(rM.adjustedRentalRate>0)rM.adjustedRentalRate=Math.min(0,rM.adjustedRentalRate-R()*.05);
  if(pR.size>=mR){if(rM.adjustedRentalRate<.06)rM.adjustedRentalRate+=R()*.006;return!1}
  let i=0;while(pR.has(i))i=(i+1)%mR;
  return pR.add(i)&&i
 },
 releaseId:i=>pR.delete(i)
};
const eM=E(),mT=eM.petsCap,pT=new Set();
export const idPetManager={
 generateId:()=>{
  if(pT.size>=mT)return!1;
  let i=0;while(pT.has(i))i=(i+1)%mT;
  return pT.add(i)&&i
 },
 releaseId:i=>pT.delete(i)
};
function generateNormalRandom(){let u,v;do u=R();while(!u);do v=R();while(!v);let n=Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);n=n/10+0.5;return n>1||n<0?generateNormalRandom():n}
export function initializeSim(){
 const th=(R()*4+1)|0,a=R(),im=R(),h=R(),p=generateNormalRandom(),m=generateNormalRandom(),s=generateNormalRandom(),age=(R()*50|0)+20,id=idManager.generateId();
 if(!id)return!1;
 return {vx:0,vy:0,id:`sim_${id}`,name:'',income:10000/th/24|0,conditions:{anxiety:a,immunity:im,health:h},infected:!1,age,creditScore:(R()*500+300)|0,birthYear:new Date().getFullYear()-age,birthDay:(R()*360|0)+1,reproducibility:0,pregnant:0,pets:{},relationships:{spouse:'',parents:[],children:[],siblings:[]},dependents:{},traits:{physical:p,mental:m,spiritual:s},netWorth:0,assets:{cash:generateNormalRandom()*10000|0,investments:generateNormalRandom()*10000|0,realEstate:{},vehicles:{}},liabilities:{rentals:{},unitFees:{},mortgages:{},credit:{},loans:{},healthInsurance:0}};
}
export const setThreshold=l=>(t=l,t),getThreshold=()=>t;
export function getTotalCredit(l){let c=0;for(let k in l.credit){let r=l.credit[k].limit-l.credit[k].amount; r>0&&(c+=r)}return c}
export function getNetWorth(s){let a=s.assets.cash+s.assets.investments;for(let k in s.assets.realEstate){let v=s.assets.realEstate[k].amount;!isNaN(v)&&(a+=v)}for(let k in s.assets.vehicles){let v=s.assets.vehicles[k].currentValue;!isNaN(v)&&(a+=v)}for(let k in s.liabilities.mortgages){let v=s.liabilities.mortgages[k].amount;!isNaN(v)&&(a-=v)}for(let k in s.liabilities.credit){let v=s.liabilities.credit[k].amount;!isNaN(v)&&(a-=v)}for(let k in s.liabilities.loans){let v=s.liabilities.loans[k].amountOwing;!isNaN(v)&&(a-=v)}return a}
export function getAvailableCredit(s,amt){for(let k in s.liabilities.credit){let c=s.liabilities.credit[k];if(c.limit-c.amount>=amt){c.amount+=amt;return s}}return null}
