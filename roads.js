
const CELL_SIZE = 150
const CELL_HALF = CELL_SIZE / 2
const ROAD_BASE_WIDTH = CELL_SIZE * 0.3
const ROAD_CENTER_WIDTH = CELL_SIZE * 0.08
const DASH_LENGTH = CELL_SIZE * 0.2
const SPAWN_THRESHOLD = 20
const DECAY_RATE = 0.95
const MIN_SIMS_FOR_TRACKING = 2
const UPDATE_INTERVAL = 200
const NEIGHBORS = [[1,0],[-1,0],[0,1],[0,-1]]

const trafficMap = new Map()
const roadElements = new Map()
let lastUpdate = 0

export function recordTraffic(community) {
  const frameCounts = new Map()
  for (const sim of Object.values(community)) {
    const col = Math.floor(sim.x / CELL_SIZE)
    const row = Math.floor(sim.y / CELL_SIZE)
    const key = `${col},${row}`
    frameCounts.set(key, (frameCounts.get(key) || 0) + 1)
  }

  for (const [key, simCount] of frameCounts.entries()) {
    if (simCount >= MIN_SIMS_FOR_TRACKING) {
      trafficMap.set(key, (trafficMap.get(key) || 0) + simCount)
    }
  }

  for (const [key, count] of trafficMap.entries()) {
    const decayed = count * DECAY_RATE
    if (decayed < 1) trafficMap.delete(key)
    else trafficMap.set(key, decayed)
  }
}

export function updateRoadsThrottled(now) {
  if (now - lastUpdate < UPDATE_INTERVAL) return
  lastUpdate = now
  updateRoads()
}

function updateRoads() {
  const activeCells = [...trafficMap.entries()]
    .filter(([,count]) => count >= SPAWN_THRESHOLD)
    .map(([key]) => key)

  const newSet = new Set(activeCells)

  for (const key of roadElements.keys()) {
    if (!newSet.has(key)) {
      const { base, center } = roadElements.get(key)
      roads.removeChild(base)
      roads.removeChild(center)
      roadElements.delete(key)
    }
  }

  if (activeCells.length === 0) return

  const clusters = getClusters(activeCells)
  const frag     = document.createDocumentFragment()

  clusters.forEach(cluster => {
    const pts = cluster.map(key => {
      const [c,r] = key.split(',').map(Number)
      return { x: c * CELL_SIZE + CELL_HALF, y: r * CELL_SIZE + CELL_HALF }
    })

    const ordered = orderPoints(pts)
    if (ordered.length < 2) return

    const d = catmullRom2bezier(ordered)
    const id = cluster[0]

    if (!roadElements.has(id)) {
      const base = createPath(d, ROAD_BASE_WIDTH, 'rgba(127, 127, 127, 0.99)')
      const center = createPath(d, ROAD_CENTER_WIDTH, 'white', `${DASH_LENGTH},${DASH_LENGTH}`)
      frag.append(base, center)
      roadElements.set(id, { base, center })
    }
  })

  roads.appendChild(frag)
}

function createPath(d, width, color, dash) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', d)
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', color)
  path.setAttribute('stroke-width', width)
  path.setAttribute('stroke-linecap', 'round')
  if (dash) path.setAttribute('stroke-dasharray', dash)
  return path
}

function getClusters(keys = []) {
  if (!Array.isArray(keys) || keys.length === 0) return []
  const set     = new Set(keys)
  const visited = new Set()
  const clusters= []

  for (const key of keys) {
    if (visited.has(key)) continue
    const cluster = []
    const queue   = [key]
    visited.add(key)
    let qi = 0

    while (qi < queue.length) {
      const curr = queue[qi++]
      cluster.push(curr)
      const [col,row] = curr.split(',').map(Number)
      NEIGHBORS.forEach(([dx,dy]) => {
        const nb = `${col+dx},${row+dy}`
        if (set.has(nb) && !visited.has(nb)) {
          visited.add(nb)
          queue.push(nb)
        }
      })
    }
    clusters.push(cluster)
  }

  return clusters
}

function orderPoints(points) {
  const ordered = []
  const ptsCopy = points.slice()
  let curr = ptsCopy.shift()
  ordered.push(curr)

  while (ptsCopy.length) {
    let bestIdx = 0, bestDist = Infinity
    ptsCopy.forEach((p, i) => {
      const dx = p.x - curr.x
      const dy = p.y - curr.y
      const dist = dx*dx + dy*dy
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = i
      }
    })
    curr = ptsCopy.splice(bestIdx, 1)[0]
    ordered.push(curr)
  }

  return ordered
}

function catmullRom2bezier(pts) {
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i-1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i+1]
    const p3 = pts[i+2] || p2

    const cp1x = p1.x + (p2.x - p0.x)/6
    const cp1y = p1.y + (p2.y - p0.y)/6
    const cp2x = p2.x - (p3.x - p1.x)/6
    const cp2y = p2.y - (p3.y - p1.y)/6

    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }
  return d
}