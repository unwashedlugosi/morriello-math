// Chapter 12: Patterns in the Coordinate Plane
// 12.1 Plot Points in a Coordinate Plane
// 12.2 Relate Points in a Coordinate Plane (distance)
// 12.3 Draw/Identify Polygons in a Coordinate Plane
// 12.4 Graph Data
// 12.5 Make and Interpret Line Graphs
// 12.6 Numerical Patterns

// ===== RANDOM HELPERS =====

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ===== TOPICS =====

export const TOPICS = {
  'plot-points': { name: 'Plot & Name Points', icon: '·' },
  'point-distance': { name: 'Distance Between Points', icon: '↔' },
  'identify-polygons': { name: 'Polygons in the Plane', icon: '◇' },
  'graph-data': { name: 'Graph Data', icon: '⋮' },
  'line-graphs': { name: 'Line Graphs', icon: '📈' },
  'number-patterns': { name: 'Numerical Patterns', icon: '#' },
}

export const TOPIC_LIST = Object.keys(TOPICS)

// ===== LEVELS & XP =====

export const LEVELS = [
  { level: 1, name: 'Learner', xp: 0 },
  { level: 2, name: 'Student', xp: 30 },
  { level: 3, name: 'Solver', xp: 75 },
  { level: 4, name: 'Expert', xp: 150 },
  { level: 5, name: 'Scholar', xp: 250 },
  { level: 6, name: 'Master', xp: 400 },
  { level: 7, name: 'Champion', xp: 600 },
  { level: 8, name: 'Legend', xp: 850 },
  { level: 9, name: 'Sage', xp: 1200 },
]

export function getLevelForXP(xp) {
  let level = LEVELS[0]
  for (const l of LEVELS) if (xp >= l.xp) level = l
  return level
}

export function getXPProgress(xp) {
  const current = getLevelForXP(xp)
  const nextIdx = LEVELS.findIndex((l) => l.level === current.level) + 1
  const next = nextIdx < LEVELS.length ? LEVELS[nextIdx] : null
  const xpInLevel = next ? xp - current.xp : 0
  const xpForLevel = next ? next.xp - current.xp : 1
  const progress = next ? xpInLevel / xpForLevel : 1
  return { current, next, progress, xpInLevel, xpForLevel }
}

export function calculateXP({ correct, difficulty, firstTry, timeMs, streak }) {
  if (!correct) return 1
  let xp = 5
  if (difficulty >= 2) xp += 3
  if (firstTry) xp += 2
  if (streak >= 5) xp += 1
  if (streak >= 10) xp += 2
  if (timeMs < 15000) xp += 1
  return xp
}

export function getStreakMessage(streak) {
  if (streak >= 10) return 'LEGENDARY!'
  if (streak >= 7) return 'UNSTOPPABLE!'
  if (streak >= 5) return 'On fire!'
  if (streak >= 3) return 'Hat trick!'
  return null
}

// ===== MASTERY & TOPIC SELECTION =====

export function updateTopicHistory(history, topic, correct, difficulty) {
  const h = { ...history }
  if (!h[topic]) h[topic] = { results: [], easy_correct: 0, hard_correct: 0, total: 0 }
  h[topic] = { ...h[topic] }
  h[topic].results = [...h[topic].results.slice(-9), correct]
  h[topic].total++
  if (correct) {
    if (difficulty >= 2) h[topic].hard_correct++
    else h[topic].easy_correct++
  }
  return h
}

export function checkSlidingMastery(history, topic) {
  const h = history[topic]
  if (!h || h.results.length < 3) return null
  const last5 = h.results.slice(-5)
  const correct5 = last5.filter(Boolean).length
  if (correct5 >= 4 && h.hard_correct >= 1) return 'mastered'
  if (correct5 >= 3) return 'learning'
  if (correct5 <= 1) return 'needs-work'
  return null
}

export function selectSessionTopic(mastery, history, recentTopics) {
  const weights = {}
  for (const topic of TOPIC_LIST) {
    const m = mastery[topic] || 'untested'
    if (m === 'needs-work') weights[topic] = 5
    else if (m === 'learning') weights[topic] = 3
    else if (m === 'untested') weights[topic] = 4
    else weights[topic] = 1
  }
  for (const t of recentTopics.slice(-2)) {
    if (weights[t]) weights[t] = Math.max(1, weights[t] - 2)
  }
  const entries = Object.entries(weights)
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let r = Math.random() * total
  for (const [topic, w] of entries) {
    r -= w
    if (r <= 0) return topic
  }
  return entries[0][0]
}

// ===== ANSWER CHECKING =====

export function checkProblemAnswer(problem, answer) {
  const expected = problem.answer

  if (problem.inputType === 'number') {
    const userNum = parseFloat(String(answer).replace(/,/g, ''))
    if (isNaN(userNum)) return false
    return Math.abs(userNum - expected) < 0.001
  }

  if (problem.inputType === 'choice') {
    return String(answer) === String(expected)
  }

  if (problem.inputType === 'coordinate' || problem.inputType === 'ordered-pair') {
    const ux = parseInt(answer?.x)
    const uy = parseInt(answer?.y)
    if (isNaN(ux) || isNaN(uy)) return false
    return ux === expected.x && uy === expected.y
  }

  return false
}

// ===== PROBLEM ID =====

let problemCounter = 0
function makeId() {
  return `p_${Date.now()}_${problemCounter++}`
}

// Letters for labeling points
const POINT_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'M', 'N', 'P', 'Q', 'R', 'S', 'T']

// ===== 12.1: PLOT POINTS =====

function gen_plot_points(hard = false) {
  const range = 8
  const variant = hard ? pick(['name-point', 'plot-point', 'plot-from-directions']) : pick(['name-point', 'plot-point'])

  if (variant === 'name-point') {
    // Show a grid with a labeled point, ask for coordinates
    const x = randInt(0, range)
    const y = randInt(0, range)
    const label = pick(POINT_LABELS)
    return {
      id: makeId(), topic: 'plot-points', type: 'computation', difficulty: hard ? 2 : 1,
      question: `What are the coordinates of point ${label}?`,
      inputType: 'ordered-pair',
      grid: { range, points: [{ x, y, label }] },
      answer: { x, y },
      explanation: [
        `Start at the origin (0, 0).`,
        `Count right along the x-axis until you reach point ${label}: ${x} units.`,
        `Count up along the y-axis until you reach point ${label}: ${y} units.`,
        `So point ${label} is at (${x}, ${y}).`,
      ],
      hint: `The first number is how far right. The second is how far up.`,
    }
  }

  if (variant === 'plot-point') {
    // Ask student to tap the grid to plot a given point
    const x = randInt(0, range)
    const y = randInt(0, range)
    const label = pick(POINT_LABELS)
    return {
      id: makeId(), topic: 'plot-points', type: 'computation', difficulty: hard ? 2 : 1,
      question: `Tap the grid to plot point ${label} at (${x}, ${y}).`,
      inputType: 'coordinate',
      grid: { range, points: [] },
      answer: { x, y },
      explanation: [
        `To plot (${x}, ${y}), start at the origin.`,
        `Move ${x} units to the right along the x-axis.`,
        `Then move ${y} units up along the y-axis.`,
        `Tap where those two meet.`,
      ],
      hint: `The x-coordinate (${x}) tells you how far right. The y-coordinate (${y}) tells you how far up.`,
    }
  }

  // plot-from-directions (hard)
  const x = randInt(2, range)
  const y = randInt(2, range)
  return {
    id: makeId(), topic: 'plot-points', type: 'word-problem', difficulty: 2,
    question: `From your base at the origin, walk ${x} blocks east and ${y} blocks north. Tap the grid to mark where you end up.`,
    inputType: 'coordinate',
    grid: { range, points: [{ x: 0, y: 0, label: 'Base' }] },
    answer: { x, y },
    explanation: [
      `East = right along the x-axis: ${x} blocks.`,
      `North = up along the y-axis: ${y} blocks.`,
      `You end up at (${x}, ${y}).`,
    ],
    hint: `East is right (x direction). North is up (y direction).`,
  }
}

// ===== 12.2: DISTANCE BETWEEN POINTS =====

function gen_point_distance(hard = false) {
  const range = 9
  // Generate two points on same horizontal OR vertical line
  const horizontal = Math.random() < 0.5

  let x1, y1, x2, y2
  if (horizontal) {
    y1 = y2 = randInt(1, range - 1)
    x1 = randInt(0, range - 2)
    x2 = randInt(x1 + 2, range)
  } else {
    x1 = x2 = randInt(1, range - 1)
    y1 = randInt(0, range - 2)
    y2 = randInt(y1 + 2, range)
  }
  const distance = Math.abs(x2 - x1) + Math.abs(y2 - y1)
  const labelA = pick(POINT_LABELS)
  let labelB = pick(POINT_LABELS)
  while (labelB === labelA) labelB = pick(POINT_LABELS)

  if (hard && Math.random() < 0.5) {
    // Perimeter of rectangle problem
    const w = Math.max(2, randInt(3, 6))
    const h = Math.max(2, randInt(2, 5))
    const bx = randInt(0, range - w)
    const by = randInt(0, range - h)
    const perimeter = 2 * w + 2 * h
    return {
      id: makeId(), topic: 'point-distance', type: 'word-problem', difficulty: 2,
      question: `A rectangle has corners at (${bx}, ${by}), (${bx + w}, ${by}), (${bx + w}, ${by + h}), and (${bx}, ${by + h}). What is the perimeter?`,
      inputType: 'number',
      grid: {
        range,
        points: [
          { x: bx, y: by, label: 'A' },
          { x: bx + w, y: by, label: 'B' },
          { x: bx + w, y: by + h, label: 'C' },
          { x: bx, y: by + h, label: 'D' },
        ],
        connect: [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A']],
      },
      answer: perimeter,
      explanation: [
        `Width: distance from (${bx}, ${by}) to (${bx + w}, ${by}) = ${w} units.`,
        `Height: distance from (${bx}, ${by}) to (${bx}, ${by + h}) = ${h} units.`,
        `Perimeter = 2 × width + 2 × height = 2 × ${w} + 2 × ${h} = ${perimeter}.`,
      ],
      hint: `Add up all four sides. Opposite sides of a rectangle are equal.`,
    }
  }

  return {
    id: makeId(), topic: 'point-distance', type: 'computation', difficulty: hard ? 2 : 1,
    question: `What is the distance between point ${labelA} and point ${labelB}?`,
    inputType: 'number',
    grid: {
      range,
      points: [
        { x: x1, y: y1, label: labelA },
        { x: x2, y: y2, label: labelB },
      ],
      connect: [[labelA, labelB]],
    },
    answer: distance,
    explanation: [
      horizontal
        ? `Both points are on a horizontal line (same y-coordinate: ${y1}).`
        : `Both points are on a vertical line (same x-coordinate: ${x1}).`,
      horizontal
        ? `Subtract the x-coordinates: ${x2} − ${x1} = ${distance}.`
        : `Subtract the y-coordinates: ${y2} − ${y1} = ${distance}.`,
      `So the distance is ${distance} units.`,
    ],
    hint: horizontal
      ? `The points share a y-coordinate. Subtract the x-coordinates.`
      : `The points share an x-coordinate. Subtract the y-coordinates.`,
  }
}

// ===== 12.3: IDENTIFY POLYGONS =====

const POLYGON_CHOICES = ['triangle', 'rectangle', 'square', 'trapezoid', 'parallelogram', 'pentagon', 'hexagon']

function gen_identify_polygons(hard = false) {
  const range = 8
  // Build a polygon of chosen type from vertices
  const shape = pick(
    hard ? ['triangle', 'rectangle', 'square', 'trapezoid', 'pentagon', 'hexagon'] : ['triangle', 'rectangle', 'square']
  )

  const vertices = buildPolygon(shape, range)
  const labels = ['A', 'B', 'C', 'D', 'E', 'F']
  const points = vertices.map((v, i) => ({ ...v, label: labels[i] }))
  const connect = []
  for (let i = 0; i < points.length; i++) {
    connect.push([points[i].label, points[(i + 1) % points.length].label])
  }

  return {
    id: makeId(), topic: 'identify-polygons', type: 'computation', difficulty: hard ? 2 : 1,
    question: `What kind of polygon has these vertices?`,
    inputType: 'choice',
    grid: { range, points, connect },
    choices: shuffle(
      pickChoices(shape, hard)
    ),
    answer: shape,
    explanation: [
      `Count the vertices and look at the sides:`,
      shape === 'triangle' ? `3 vertices = triangle.` :
      shape === 'rectangle' ? `4 right angles, opposite sides equal, but not all sides equal = rectangle.` :
      shape === 'square' ? `4 equal sides, 4 right angles = square.` :
      shape === 'trapezoid' ? `4 sides with exactly one pair of parallel sides = trapezoid.` :
      shape === 'parallelogram' ? `4 sides, both pairs of opposite sides parallel = parallelogram.` :
      shape === 'pentagon' ? `5 vertices = pentagon.` :
      `6 vertices = hexagon.`,
    ],
    hint: `Count the sides (or vertices) first, then look at which sides are equal or parallel.`,
  }
}

function pickChoices(correct, hard) {
  const base = ['triangle', 'rectangle', 'square', 'trapezoid', 'pentagon', 'hexagon']
  const pool = base.filter((s) => s !== correct)
  const distractors = shuffle(pool).slice(0, hard ? 3 : 2)
  return [correct, ...distractors]
}

function buildPolygon(shape, range) {
  if (shape === 'triangle') {
    const x1 = randInt(1, range - 4), y1 = randInt(1, range - 4)
    const x2 = x1 + randInt(2, 4), y2 = y1
    const x3 = randInt(x1, x2), y3 = y1 + randInt(2, 4)
    return [{ x: x1, y: y1 }, { x: x2, y: y2 }, { x: x3, y: y3 }]
  }
  if (shape === 'rectangle') {
    const x = randInt(1, range - 5), y = randInt(1, range - 4)
    const w = randInt(3, 5), h = randInt(2, 3)
    return [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }]
  }
  if (shape === 'square') {
    const x = randInt(1, range - 4), y = randInt(1, range - 4)
    const s = randInt(2, 3)
    return [{ x, y }, { x: x + s, y }, { x: x + s, y: y + s }, { x, y: y + s }]
  }
  if (shape === 'trapezoid') {
    const x = randInt(0, range - 5), y = randInt(1, range - 4)
    return [{ x, y }, { x: x + 5, y }, { x: x + 4, y: y + 2 }, { x: x + 1, y: y + 2 }]
  }
  if (shape === 'parallelogram') {
    const x = randInt(0, range - 5), y = randInt(1, range - 4)
    return [{ x, y }, { x: x + 3, y }, { x: x + 4, y: y + 2 }, { x: x + 1, y: y + 2 }]
  }
  if (shape === 'pentagon') {
    const cx = Math.floor(range / 2), cy = Math.floor(range / 2)
    return [
      { x: cx, y: cy + 3 },
      { x: cx + 3, y: cy + 1 },
      { x: cx + 2, y: cy - 2 },
      { x: cx - 2, y: cy - 2 },
      { x: cx - 3, y: cy + 1 },
    ]
  }
  // hexagon
  const cx = Math.floor(range / 2), cy = Math.floor(range / 2)
  return [
    { x: cx, y: cy + 3 },
    { x: cx + 3, y: cy + 1 },
    { x: cx + 3, y: cy - 1 },
    { x: cx, y: cy - 3 },
    { x: cx - 3, y: cy - 1 },
    { x: cx - 3, y: cy + 1 },
  ]
}

// ===== 12.4: GRAPH DATA =====

function gen_graph_data(hard = false) {
  const scenarios = [
    { xLabel: 'Day', yLabel: 'Amount (inches)', title: 'Snowfall', yMax: 16, xMax: 7 },
    { xLabel: 'Level', yLabel: 'Gold bars', title: 'Video Game', yMax: 50, xMax: 6 },
    { xLabel: 'Month', yLabel: 'Cars sold', title: 'Car Sales', yMax: 14, xMax: 6 },
    { xLabel: 'Day', yLabel: 'Jumping jacks', title: 'Daily Jumping Jacks', yMax: 55, xMax: 6 },
    { xLabel: 'Year', yLabel: 'Students', title: 'Choir Club', yMax: 40, xMax: 6 },
  ]
  const sc = pick(scenarios)
  const data = []
  for (let x = 1; x <= sc.xMax; x++) {
    data.push({ x, y: randInt(Math.floor(sc.yMax * 0.2), sc.yMax) })
  }

  const variants = hard
    ? ['diff-max-min', 'how-many-above', 'specific-x']
    : ['specific-x', 'how-many-above']
  const variant = pick(variants)

  if (variant === 'specific-x') {
    const q = pick(data)
    return {
      id: makeId(), topic: 'graph-data', type: 'word-problem', difficulty: hard ? 2 : 1,
      question: `Use the table. How many ${sc.yLabel.toLowerCase()} were there in ${sc.xLabel.toLowerCase()} ${q.x}?`,
      inputType: 'number',
      table: { xLabel: sc.xLabel, yLabel: sc.yLabel, rows: data.map((d) => ({ x: d.x, y: d.y })) },
      answer: q.y,
      explanation: [
        `Find ${sc.xLabel.toLowerCase()} ${q.x} in the table.`,
        `The value next to it is ${q.y}.`,
      ],
      hint: `Read across the row for ${sc.xLabel.toLowerCase()} ${q.x}.`,
    }
  }

  if (variant === 'diff-max-min') {
    const max = Math.max(...data.map((d) => d.y))
    const min = Math.min(...data.map((d) => d.y))
    return {
      id: makeId(), topic: 'graph-data', type: 'word-problem', difficulty: 2,
      question: `What is the difference between the greatest and least ${sc.yLabel.toLowerCase()}?`,
      inputType: 'number',
      table: { xLabel: sc.xLabel, yLabel: sc.yLabel, rows: data.map((d) => ({ x: d.x, y: d.y })) },
      answer: max - min,
      explanation: [
        `Greatest value: ${max}.`,
        `Least value: ${min}.`,
        `Difference: ${max} − ${min} = ${max - min}.`,
      ],
      hint: `Find the biggest and smallest numbers, then subtract.`,
    }
  }

  // how-many-above
  const threshold = Math.floor(sc.yMax * 0.5)
  const count = data.filter((d) => d.y > threshold).length
  return {
    id: makeId(), topic: 'graph-data', type: 'word-problem', difficulty: hard ? 2 : 1,
    question: `How many ${sc.xLabel.toLowerCase()}s had more than ${threshold} ${sc.yLabel.toLowerCase()}?`,
    inputType: 'number',
    table: { xLabel: sc.xLabel, yLabel: sc.yLabel, rows: data.map((d) => ({ x: d.x, y: d.y })) },
    answer: count,
    explanation: [
      `Look for values greater than ${threshold}.`,
      `${data.filter((d) => d.y > threshold).map((d) => `${sc.xLabel} ${d.x}: ${d.y}`).join(', ') || 'None'}.`,
      `That's ${count} total.`,
    ],
    hint: `Go through each row and count the ones where the value is above ${threshold}.`,
  }
}

// ===== 12.5: LINE GRAPHS =====

function gen_line_graphs(hard = false) {
  const scenarios = [
    { xLabel: 'Age (months)', yLabel: 'Weight (pounds)', title: "Dog's Weight", yMax: 60 },
    { xLabel: 'Day', yLabel: 'Height (cm)', title: 'Seedling Height', yMax: 30 },
    { xLabel: 'Time (hours)', yLabel: 'Temperature (°F)', title: 'Storm Temperature', yMax: 35 },
    { xLabel: 'Day', yLabel: 'Money raised ($)', title: 'Class Fundraiser', yMax: 120 },
  ]
  const sc = pick(scenarios)

  // Build an increasing (or bumpy) sequence
  const points = []
  let y = randInt(5, 20)
  for (let x = 1; x <= 6; x++) {
    points.push({ x, y })
    y = Math.min(sc.yMax, Math.max(1, y + randInt(-3, 15)))
  }

  const variants = hard
    ? ['biggest-jump', 'estimate-between', 'value-at-x']
    : ['value-at-x', 'biggest-jump']
  const variant = pick(variants)

  if (variant === 'value-at-x') {
    const q = pick(points)
    return {
      id: makeId(), topic: 'line-graphs', type: 'word-problem', difficulty: hard ? 2 : 1,
      question: `Read the line graph. What was the ${sc.yLabel.toLowerCase()} at ${sc.xLabel.toLowerCase().split(' ')[0]} ${q.x}?`,
      inputType: 'number',
      lineGraph: { xLabel: sc.xLabel, yLabel: sc.yLabel, title: sc.title, points, yMax: sc.yMax },
      answer: q.y,
      explanation: [
        `Find x = ${q.x} on the horizontal axis.`,
        `Trace up to the line, then read across to the y-axis: ${q.y}.`,
      ],
      hint: `Go up from x = ${q.x} until you hit the line, then look left to the y-axis.`,
    }
  }

  if (variant === 'biggest-jump') {
    // Find which consecutive pair has the biggest change
    let maxJump = 0, jumpIdx = 0
    for (let i = 1; i < points.length; i++) {
      const d = Math.abs(points[i].y - points[i - 1].y)
      if (d > maxJump) { maxJump = d; jumpIdx = i }
    }
    const correctAnswer = `${sc.xLabel.split(' ')[0]} ${points[jumpIdx - 1].x} and ${points[jumpIdx].x}`
    const otherPairs = []
    for (let i = 1; i < points.length; i++) {
      if (i !== jumpIdx) otherPairs.push(`${sc.xLabel.split(' ')[0]} ${points[i - 1].x} and ${points[i].x}`)
    }
    const choices = shuffle([correctAnswer, ...shuffle(otherPairs).slice(0, 2)])
    return {
      id: makeId(), topic: 'line-graphs', type: 'word-problem', difficulty: hard ? 2 : 1,
      question: `Between which two points does the line graph change the MOST?`,
      inputType: 'choice',
      choices,
      lineGraph: { xLabel: sc.xLabel, yLabel: sc.yLabel, title: sc.title, points, yMax: sc.yMax },
      answer: correctAnswer,
      explanation: [
        `Look at each segment of the line graph.`,
        `The biggest jump is between ${correctAnswer}: ${points[jumpIdx - 1].y} to ${points[jumpIdx].y}, a change of ${maxJump}.`,
      ],
      hint: `Look at how steep each line segment is. Steepest = biggest change.`,
    }
  }

  // estimate-between (hard)
  // Pick a whole-number x that's between two data points on a straight-line segment
  const i = randInt(0, points.length - 2)
  const p1 = points[i], p2 = points[i + 1]
  if (p2.x - p1.x !== 1) return gen_line_graphs(hard) // fallback
  // We'll ask about halfway between: not a nice integer x unless we extrapolate
  // Instead: ask student to estimate the y at the midpoint
  const midY = Math.round((p1.y + p2.y) / 2)
  return {
    id: makeId(), topic: 'line-graphs', type: 'word-problem', difficulty: 2,
    question: `Using the line graph, estimate the ${sc.yLabel.toLowerCase()} halfway between ${sc.xLabel.split(' ')[0]} ${p1.x} and ${sc.xLabel.split(' ')[0]} ${p2.x}.`,
    inputType: 'number',
    lineGraph: { xLabel: sc.xLabel, yLabel: sc.yLabel, title: sc.title, points, yMax: sc.yMax },
    answer: midY,
    explanation: [
      `At ${sc.xLabel.split(' ')[0]} ${p1.x}, the value is ${p1.y}.`,
      `At ${sc.xLabel.split(' ')[0]} ${p2.x}, the value is ${p2.y}.`,
      `Halfway between them on the line is about (${p1.y} + ${p2.y}) ÷ 2 = ${midY}.`,
    ],
    hint: `The line connects the two points. Halfway along that segment is halfway between the y values.`,
  }
}

// ===== 12.6: NUMERICAL PATTERNS =====

function gen_number_patterns(hard = false) {
  const variant = hard ? pick(['find-rule', 'extend-related', 'two-patterns']) : pick(['extend-single', 'find-rule'])

  if (variant === 'extend-single') {
    const start = randInt(0, 5)
    const step = randInt(2, 10)
    const n = randInt(4, 6)
    const seq = []
    for (let i = 0; i <= n; i++) seq.push(start + step * i)
    const missingIdx = n
    const question = `A pattern starts at ${seq[0]} and adds ${step} each step: ${seq.slice(0, missingIdx).join(', ')}, ___. What is the next number?`
    return {
      id: makeId(), topic: 'number-patterns', type: 'computation', difficulty: 1,
      question,
      inputType: 'number',
      answer: seq[missingIdx],
      explanation: [
        `The pattern adds ${step} each step.`,
        `${seq[missingIdx - 1]} + ${step} = ${seq[missingIdx]}.`,
      ],
      hint: `What do you add to get from one number to the next?`,
    }
  }

  if (variant === 'find-rule') {
    const step = randInt(2, 8)
    const len = 5
    const pattern1 = []
    for (let i = 0; i < len; i++) pattern1.push(i * step)
    return {
      id: makeId(), topic: 'number-patterns', type: 'word-problem', difficulty: hard ? 2 : 1,
      question: `Look at the pattern: ${pattern1.join(', ')}. What rule describes it?`,
      inputType: 'choice',
      choices: shuffle([`Add ${step}`, `Add ${step + 1}`, `Multiply by ${step}`, `Add ${Math.max(1, step - 1)}`]),
      answer: `Add ${step}`,
      explanation: [
        `Look at the difference between consecutive numbers.`,
        `${pattern1[1]} − ${pattern1[0]} = ${step}.`,
        `${pattern1[2]} − ${pattern1[1]} = ${step}.`,
        `The rule is "Add ${step}".`,
      ],
      hint: `Subtract the first number from the second. That's the rule.`,
    }
  }

  if (variant === 'extend-related') {
    // Newton adds A each step, Descartes adds B each step. If Newton is at X, what is Descartes at?
    const stepA = randInt(2, 8)
    const stepB = stepA * randInt(2, 4)
    const step = randInt(3, 6)
    const newtonValue = stepA * step
    const descartesValue = stepB * step
    return {
      id: makeId(), topic: 'number-patterns', type: 'word-problem', difficulty: 2,
      question: `Newton saves $${stepA} each month. Descartes saves $${stepB} each month. When Newton has saved $${newtonValue}, how much has Descartes saved?`,
      inputType: 'number',
      answer: descartesValue,
      explanation: [
        `Newton saves $${stepA}/month. $${newtonValue} ÷ $${stepA} = ${step} months.`,
        `Descartes saves $${stepB}/month. In ${step} months: ${step} × $${stepB} = $${descartesValue}.`,
        `OR: Descartes saves ${stepB / stepA}× as much as Newton. $${newtonValue} × ${stepB / stepA} = $${descartesValue}.`,
      ],
      hint: `First figure out how many months. Then multiply by Descartes' monthly savings.`,
    }
  }

  // two-patterns: given two related ordered pairs, find the rule
  const ratio = pick([2, 3, 4, 5])
  const x = randInt(2, 6)
  const y = x * ratio
  return {
    id: makeId(), topic: 'number-patterns', type: 'word-problem', difficulty: 2,
    question: `In a pattern, when x = ${x}, y = ${y}. When x = ${x * 2}, y = ?`,
    inputType: 'number',
    answer: y * 2,
    explanation: [
      `Find the relationship: ${y} ÷ ${x} = ${ratio}. So y is ${ratio} times x.`,
      `When x = ${x * 2}: y = ${x * 2} × ${ratio} = ${y * 2}.`,
    ],
    hint: `Divide y by x to find the multiplier. Then apply it.`,
  }
}

// ===== GENERATORS MAP =====

const GENERATORS = {
  'plot-points': gen_plot_points,
  'point-distance': gen_point_distance,
  'identify-polygons': gen_identify_polygons,
  'graph-data': gen_graph_data,
  'line-graphs': gen_line_graphs,
  'number-patterns': gen_number_patterns,
}

// ===== DIAGNOSTIC =====

export function generateDiagnostic() {
  const problems = []
  // 2 per topic × 6 topics = 12 total. Mix easy and hard.
  for (const topic of TOPIC_LIST) {
    const gen = GENERATORS[topic]
    problems.push(gen(false))
    problems.push(gen(true))
  }
  return shuffle(problems)
}

// ===== SESSION =====

export function generateSessionProblem(topic, history) {
  const gen = GENERATORS[topic]
  const h = history[topic]
  const hard =
    (h && h.easy_correct >= 3 && h.results.slice(-3).filter(Boolean).length >= 2) ||
    (h && h.hard_correct >= 2)
  return gen(hard)
}

// ===== MASTERY HELPERS (used after diagnostic) =====

export function calculateMastery(results) {
  const mastery = {}
  for (const topic of TOPIC_LIST) {
    const r = results[topic]
    if (!r || r.total === 0) { mastery[topic] = 'untested'; continue }
    const pct = r.correct / r.total
    if (pct >= 0.8) mastery[topic] = 'mastered'
    else if (pct >= 0.5) mastery[topic] = 'learning'
    else mastery[topic] = 'needs-work'
  }
  return mastery
}

// ===== FRACTION HELPERS (no longer used but kept for ProblemCard compatibility) =====

export function formatFracObj(f) {
  if (!f) return ''
  if (f.whole && f.num) return `${f.whole} ${f.num}/${f.den}`
  if (f.whole) return `${f.whole}`
  if (f.num) return `${f.num}/${f.den}`
  return '0'
}
