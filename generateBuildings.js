import { getCommunity } from './world.js'

const CELL_SIZE = 250
const HOMOGENEITY_THRESHOLD = 0.2
const MIN_SIM_THRESHOLD = 5
const SVG = 'http://www.w3.org/2000/svg'

export function updateBuildings() {
  buildingsLayer.innerHTML = ''

  const cellMap = new Map()
  const community = getCommunity()

  for (let id in community) {
    const sim = community[id]
    const col = Math.floor(sim.x / CELL_SIZE)
    const row = Math.floor(sim.y / CELL_SIZE)
    const key = `${col},${row}`
    if (!cellMap.has(key)) cellMap.set(key, [])
    cellMap.get(key).push(sim)
  }

  for (let [key, sims] of cellMap.entries()) {
    if (sims.length < MIN_SIM_THRESHOLD) continue

    const netWorths = sims.map(s => s.netWorth)
    const avg = netWorths.reduce((a,b)=>a+b,0) / netWorths.length
    const stdev = Math.sqrt(netWorths.map(v => (v - avg) ** 2).reduce((a,b)=>a+b,0) / netWorths.length)
    const x = parseInt(key.split(',')[0]) * CELL_SIZE
    const y = parseInt(key.split(',')[1]) * CELL_SIZE

    let type = 'apartment'
    if (stdev < HOMOGENEITY_THRESHOLD * avg) {
      if (avg < 300000) type = 'tent'
      else if (avg < 1500000) type = 'village'
      else type = 'modern'
    }
 
    let buildingNode
    switch (type) {
      case 'village': buildingNode = drawVillage(x, y); break
      case 'apartment': buildingNode = drawApartment(x, y); break
      case 'modern': buildingNode = drawModernBlock(x, y); break
      case 'tent': buildingNode = drawTent(x, y); break
    }
    buildingsLayer.appendChild(buildingNode)
  }
}

function drawVillage(x, y) {
  const g = svgGroup()
  const house = svgRect(x + 30, y + 50, 50, 50, '#c49d77')
  const roof = svgPolygon([[x+25,y+50],[x+55,y+20],[x+85,y+50]], '#874e1b')
  g.append(house, roof)
  return g
}

function drawApartment(x, y) {
  const g = svgGroup()
  const body = svgRect(x + 40, y + 20, 40, 80, '#333')
  g.appendChild(body)
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const win = svgRect(x + 45 + j * 5, y + 25 + i * 10, 4, 4, '#eee')
      g.appendChild(win)
    }
  }
  const door = svgRect(x + 55, y + 89, 10, 10, '#000')
  g.appendChild(door)
  return g
}

function drawModernBlock(x, y) {
  const g = svgGroup()
  const front = svgPolygon([[x,y+40],[x+40,y+20],[x+40,y+70],[x,y+90]], '#999')
  const side = svgPolygon([[x+40,y+20],[x+80,y+40],[x+80,y+90],[x+40,y+70]], '#666')
  const top = svgPolygon([[x,y+40],[x+40,y+20],[x+80,y+40],[x+40,y+60]], '#aaa')
  g.append(front, side, top)
  return g
}

function drawTent(x, y) {
  const g = svgGroup()
  const back = svgPolygon([[x+50, y+30], [x+90, y+80], [x+60, y+80]], '#d6c03c')
  const base = svgPolygon([[x+20, y+80], [x+80, y+80], [x+50, y+30]], '#f7e463')
  const shadow = svgPolygon([[x+20, y+80], [x+50, y+30], [x+40, y+80]], '#e0c645')
  const flap = svgPolygon([[x+48, y+80], [x+50, y+50], [x+52, y+80]], '#d2b83d')
  g.append(back, base, shadow, flap)
  return g
}

function svgGroup() {
  return document.createElementNS(SVG, 'g')
}

function svgRect(x, y, w, h, fill) {
  const el = document.createElementNS(SVG, 'rect')
  el.setAttribute('x', x)
  el.setAttribute('y', y)
  el.setAttribute('width', w)
  el.setAttribute('height', h)
  el.setAttribute('fill', fill)
  return el
}

function svgPolygon(points, fill) {
  const el = document.createElementNS(SVG, 'polygon')
  el.setAttribute('points', points.map(p => p.join(',')).join(' '))
  el.setAttribute('fill', fill)
  return el
}
