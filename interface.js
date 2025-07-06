import { getEcosystem, getCommunity, getCommunityMember, updateCommunity, getAverageNetWorth, getAverageIncome } from './world.js'
import { generateFace, updateFace, hashString, makeRNG } from './face.js'
import { addAdult } from './options.js'
import { getThought } from './memetics.js'

const $ = id => document.getElementById(id)
const Q = sel => document.querySelector(sel)
const DF = () => document.createDocumentFragment()

const els = {
  community: Q('#community'),
  details: Q('#details'),
  cloner: $('cloner'),
  currentDate: $('currentdate'),
  // stat fields and labels
  stats: [
    'population','deathAvg','netWorthAvg','incomeAvg',
    'totalTaxes','totalRealEstate','totalVehicles','totalBirths',
    'totalMedicalFees','totalVetFees','totalDiscretionary','totalCloning',
    'adjustedRealEstateRate','adjustedRentalRate','adjustedVehicleRate'
  ],
  friendly: {
    population: 'Adult Population: ',
    deathAvg: 'Average Age of Death: ',
    netWorthAvg: 'Net Worth Average: ',
    incomeAvg: 'Average Annual Income: ',
    totalTaxes: 'Taxes Collected: ',
    totalRealEstate: 'Real Estate Purchased: ',
    totalVehicles: 'Vehicles Purchased: ',
    totalBirths: 'Total Births: ',
    totalMedicalFees: 'Total Medical Fees: ',
    totalVetFees: 'Total Vet Fees: ',
    totalDiscretionary: 'Total Discretionary Spent: ',
    totalCloning: 'Total Cloned: ',
    adjustedRealEstateRate: 'Real Estate Markup: ',
    adjustedRentalRate: 'Rental Markup: ',
    adjustedVehicleRate: 'Vehicle Markup: '
  }
}

// bind cloning button
els.cloner.addEventListener('click', e => {
  e.preventDefault()
  const comm = getCommunity()
  if (Object.keys(comm).length > 99) return e.target.textContent = 'Max Population Reached'
  e.target.textContent = 'Clone BeanSims x 3'
  let cloned = 0
  for (let i = 0; i < 3; i++) {
    const sim = addAdult()
    if (sim) { cloned++; updateCommunity(sim); addAdultView(sim) }
  }
  getEcosystem().totalCloning += 3
})

export function dateRefresh(year, day) {
  els.currentDate.textContent = `${year} / Day ${day} of 360`
}

export function refreshEcosystem() {
  const e = getEcosystem(), comm = getCommunity(), fmt = v => v.toLocaleString('en-US')
  const vals = {
    population: Object.keys(comm).length,
    deathAvg: Math.floor(e.averageAgeDeath),
    netWorthAvg: getAverageNetWorth(),
    incomeAvg: getAverageIncome(),
    totalTaxes: Math.floor(e.totalTaxes),
    totalRealEstate: e.totalRealEstate,
    totalVehicles: e.totalVehicles,
    totalBirths: e.totalBirths,
    totalMedicalFees: Math.floor(e.totalMedicalFees),
    totalVetFees: Math.floor(e.totalVetFees),
    totalDiscretionary: Math.floor(e.totalDiscretionary),
    totalCloning: Math.floor(e.totalCloning),
    adjustedRealEstateRate: (e.adjustedRealEstateRate * 100).toFixed(2) + '%',
    adjustedRentalRate: (e.adjustedRentalRate * 100).toFixed(2) + '%',
    adjustedVehicleRate: (e.adjustedVehicleRate * 100).toFixed(2) + '%'
  }
  els.stats.forEach(id => {
    const el = $(id)
    el.textContent = els.friendly[id] + fmt(vals[id])
  })
}

function renderList(container, sel, items, emojiFn) {
  const view = container.querySelector(sel)
  view.innerHTML = ''
  const frag = DF()
  items.forEach(key => {
    const span = document.createElement('span')
    span.textContent = emojiFn(key)
    frag.appendChild(span)
  })
  view.appendChild(frag)
}

export function updateStats(s, showDetails) {
  const rec = $(s.id)
  if (!rec) return
  // infection
  rec.classList.toggle('infected', s.infected)
  rec.style.zIndex = Math.floor(Math.random() * 3)
  // face & thought
  updateFace(rec.querySelector('.avatar'), s)
  const status = rec.querySelector('.status'),
        thought = getThought(s) || (s.relationships.spouse && '😍') || ''
  status.classList.toggle('active', !!thought)
  status.innerHTML = thought ? `<div>${thought}</div>` : ''
  // pregnancy badge
  const pregEl = rec.querySelector('.pregnancy')
  if (s.pregnant > 0 && !pregEl) {
    const d = document.createElement('div')
    d.className = 'pregnancy'
    d.style.background = rec.style.background
    rec.appendChild(d)
  } else if (s.pregnant === 0 && pregEl) pregEl.remove()
  // stats icons
  const stats = rec.querySelector('.stats'), icons = []
  if (s.netWorth > 1e7) icons.push('💰💰💰')
  else if (s.netWorth > 1e6) icons.push('💰💰')
  else if (s.netWorth > 5e5) icons.push('💰')
  if (s.traits.mental > 0.75) icons.push('🧠🧠🧠')
  else if (s.traits.mental > 0.6) icons.push('🧠')
  const p = ['💪','💪🏻','💪🏼','💪🏽','💪🏾','💪🏾'][Math.random()*6|0]
  if (s.traits.physical > 0.75) icons.push(p+p+p)
  else if (s.traits.physical > 0.55) icons.push(p)
  stats.innerHTML = icons.map(ic => `<div>${ic}</div>`).join('')
  // details pane
  if (showDetails) {
    const d = els.details, e = getEcosystem()
    d.querySelector('.name').textContent = `${s.name}, ${s.age}`
    d.querySelector('.networth').textContent = `Net Worth: ${Math.floor(s.netWorth).toLocaleString()}`
    d.querySelector('.creditscore').textContent = `Credit Score: ${s.creditScore}`
    renderList(d, '.rentalsview', Object.keys(s.liabilities.rentals), _ => '🏘️')
    renderList(d, '.realestateview', Object.keys(s.assets.realEstate), _ => '🏡')
    renderList(d, '.vehiclesview', Object.keys(s.assets.vehicles), key => {
      const v = s.assets.vehicles[key].purchaseValue,
            r = e.rules.vehicleRules
      return v >= r.luxury.priceMax ? '🏎️' : v >= r.nonLuxury.priceMax ? '🚙' : '🛻'
    })
    renderList(d, '.petsview', Object.keys(s.pets), _ => Math.random()>0.5?'😸':'🐶')
    // children
    const rel = s.relationships.children
    const cv = d.querySelector('.relationshipview')
    cv.innerHTML = ''
    rel.forEach(cid => {
      let child = getCommunityMember(cid) || s.dependents[cid]
      if (!child) return
      const dep = document.createElement('div')
      dep.className = 'dependent'
      const faceEl = generateFace(child, 30)
      const info = document.createElement('div')
      info.className = 'info'
      info.textContent = `${child.name}, ${child.age}`
      dep.append(faceEl, info)
      cv.appendChild(dep)
      faceEl.addEventListener('mouseover',()=>dep.classList.add('active'))
      faceEl.addEventListener('mouseout',()=>dep.classList.remove('active'))
    })
  }
}

export function removeView(id) {
  const el = $(id)
  if (el) el.remove()
}

export function updateSky(time, max) {
  const sky = document.body
  const tB = time / max, segs = [
    {top:[9,9,136],bot:[20,30,50]},
    {top:[25,63,167],bot:[43,129,204]},
    {top:[245,200,73],bot:[243,100,33]},
    {top:[217,61,144],bot:[18,84,216]}
  ], n = segs.length, sz = 1/n, s = Math.floor(tB/sz), u = (tB - s*sz)/sz
  const lerp=(a,b,t)=>a+(b-a)*t,
        lerpC=r=>r.map((v,i)=>Math.round(lerp(segs[s%n].top[i],segs[(s+1)%n].top[i],u))),
        top=`rgb(${lerpC([0,1,2]).join(',')})`,
        bot=`rgb(${lerpC([0,1,2]).join(',')})`
  sky.style.background = `linear-gradient(0deg, ${top}, ${bot})`
}

export function addAdultView(s) {
  if ($(s.id)) return
  const view = document.createElement('div')
  view.id = s.id; view.className = 'view adult'
  const sum = s.traits.physical + s.traits.mental + s.traits.spiritual + s.conditions.anxiety + s.conditions.health
  const rand = makeRNG(hashString(sum) ^ Math.floor(sum*1e6))
  const hue = Math.floor((sum*110/5)*360)
  const c1 = `hsl(${hue},${90+rand()*30}%,${20+rand()*20}%)`
  const c2 = `hsl(${hue},${90+rand()*30}%,${20+rand()*20}%)`
  view.style.background = `linear-gradient(45deg, ${c1}, ${c2})`
  const faceEl = generateFace(s)
  const stats = document.createElement('div'); stats.className='stats'
  const status = document.createElement('div'); status.className='status'
  const hover = document.createElement('div'); hover.className='hover'; hover.dataset.id = s.id
  const deps = document.createElement('div'); deps.className='dependents'
  view.append(faceEl,stats,status,hover,deps)
  hover.addEventListener('mouseover',()=>updateStats(getCommunityMember(s.id),true))
  hover.addEventListener('mouseout',()=>els.details.classList.remove('active'))
  s.x = s.x||Math.random()*els.community.clientWidth
  s.y = s.y||Math.random()*els.community.clientHeight
  view.style.transform = `translate(${s.x}px,${s.y}px) scale(${getEcosystem().zoomLevel})`
  els.community.appendChild(view)
}
