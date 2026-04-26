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

function ordinal(n) {
  const last2 = n % 100
  if (last2 >= 11 && last2 <= 13) return 'th'
  switch (n % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
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
    // Some problems accept any of multiple valid points (e.g. "any point on this line")
    if (Array.isArray(expected)) {
      return expected.some((p) => p.x === ux && p.y === uy)
    }
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
  const easyVariants = ['name-point', 'plot-point', 'identify-from-options', 'single-coord', 'origin']
  const hardVariants = ['name-point', 'plot-point', 'plot-from-directions', 'identify-from-options', 'same-line-as', 'real-life-map', 'single-coord', 'on-axis']
  const variant = pick(hard ? hardVariants : easyVariants)

  if (variant === 'origin') {
    return {
      id: makeId(), topic: 'plot-points', type: 'computation', difficulty: 1,
      question: `What ordered pair is the origin of the coordinate plane?`,
      inputType: 'ordered-pair',
      grid: { range: 5, points: [{ x: 0, y: 0, label: 'origin' }] },
      answer: { x: 0, y: 0 },
      explanation: [
        `The origin is where the x-axis and y-axis meet.`,
        `Both coordinates are 0, so the origin is (0, 0).`,
      ],
      hint: `It's the corner where both axes start.`,
    }
  }

  if (variant === 'single-coord') {
    const x = randInt(1, range)
    const y = randInt(1, range)
    const askingFor = pick(['x', 'y'])
    const label = pick(POINT_LABELS)
    return {
      id: makeId(), topic: 'plot-points', type: 'computation', difficulty: hard ? 2 : 1,
      question: `What is the ${askingFor}-coordinate of point ${label}?`,
      inputType: 'number',
      grid: { range, points: [{ x, y, label }] },
      answer: askingFor === 'x' ? x : y,
      explanation: [
        `Point ${label} is at (${x}, ${y}).`,
        askingFor === 'x'
          ? `The x-coordinate is the FIRST number, which tells how far right: ${x}.`
          : `The y-coordinate is the SECOND number, which tells how far up: ${y}.`,
      ],
      hint: askingFor === 'x'
        ? `Count from the origin to point ${label} along the x-axis (right).`
        : `Count from the origin to point ${label} along the y-axis (up).`,
    }
  }

  if (variant === 'on-axis') {
    const axis = pick(['x', 'y'])
    const valid = []
    for (let i = 0; i <= range; i++) {
      if (axis === 'x') valid.push({ x: i, y: 0 })
      else valid.push({ x: 0, y: i })
    }
    return {
      id: makeId(), topic: 'plot-points', type: 'word-problem', difficulty: 2,
      question: `Tap the grid to plot any point that lies on the ${axis}-axis.`,
      inputType: 'coordinate',
      grid: { range, points: [] },
      answer: valid,
      explanation: [
        axis === 'x'
          ? `Points on the x-axis have y = 0. Their ordered pairs look like (?, 0).`
          : `Points on the y-axis have x = 0. Their ordered pairs look like (0, ?).`,
      ],
      hint: axis === 'x'
        ? `The x-axis is the horizontal line at the bottom of the grid.`
        : `The y-axis is the vertical line on the left of the grid.`,
    }
  }


  if (variant === 'identify-from-options') {
    const points = []
    for (let i = 0; i < 4; i++) {
      let x, y, ok = false
      for (let attempt = 0; attempt < 30 && !ok; attempt++) {
        x = randInt(0, range)
        y = randInt(0, range)
        ok = !points.some((p) => p.x === x && p.y === y)
      }
      points.push({ x, y, label: POINT_LABELS[i] })
    }
    const target = pick(points)
    const choices = shuffle(points.map((p) => p.label))
    return {
      id: makeId(), topic: 'plot-points', type: 'computation', difficulty: hard ? 2 : 1,
      question: `Which point is at (${target.x}, ${target.y})?`,
      inputType: 'choice',
      grid: { range, points },
      choices,
      answer: target.label,
      explanation: [
        `Move ${target.x} units right and ${target.y} units up from the origin.`,
        `That's where point ${target.label} is plotted.`,
      ],
      hint: `Find (${target.x}, ${target.y}) on the grid, then look at which letter is labeled there.`,
    }
  }

  if (variant === 'same-line-as') {
    const horizontal = Math.random() < 0.5
    const ax = randInt(1, range - 1)
    const ay = randInt(1, range - 1)
    const valid = []
    for (let i = 0; i <= range; i++) {
      if (horizontal && i !== ax) valid.push({ x: i, y: ay })
      else if (!horizontal && i !== ay) valid.push({ x: ax, y: i })
    }
    return {
      id: makeId(), topic: 'plot-points', type: 'word-problem', difficulty: 2,
      question: `Point A is at (${ax}, ${ay}). Plot a point B that lies on the same ${horizontal ? 'horizontal' : 'vertical'} line as A.`,
      inputType: 'coordinate',
      grid: { range, points: [{ x: ax, y: ay, label: 'A' }] },
      answer: valid,
      explanation: [
        horizontal
          ? `Points on a horizontal line share the same y-coordinate.`
          : `Points on a vertical line share the same x-coordinate.`,
        horizontal
          ? `B needs y = ${ay}. Any x other than ${ax} works.`
          : `B needs x = ${ax}. Any y other than ${ay} works.`,
      ],
      hint: horizontal
        ? `Pick any point straight to the left or right of A.`
        : `Pick any point straight up or down from A.`,
    }
  }

  if (variant === 'real-life-map') {
    const places = [
      { name: 'school', label: 'School' },
      { name: 'library', label: 'Library' },
      { name: 'park', label: 'Park' },
      { name: 'store', label: 'Store' },
    ]
    const home = { x: 0, y: 0, label: 'Home' }
    const place = pick(places)
    const east = randInt(2, range - 1)
    const north = randInt(2, range - 1)
    return {
      id: makeId(), topic: 'plot-points', type: 'word-problem', difficulty: 2,
      question: `From your home at the origin, the ${place.name} is ${east} blocks east and ${north} blocks north. Tap the ${place.name}'s location.`,
      inputType: 'coordinate',
      grid: { range, points: [home] },
      answer: { x: east, y: north },
      explanation: [
        `East = right (x direction): ${east} blocks.`,
        `North = up (y direction): ${north} blocks.`,
        `So the ${place.name} is at (${east}, ${north}).`,
      ],
      hint: `East is right, north is up. Move the right amount in each direction from home.`,
    }
  }

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
  const easyVariants = ['direct', 'name-other-point', 'distance-from-origin']
  // laps-perimeter (multi-step: perimeter × laps × unit conversion) was dropped —
  // the textbook has it only once and the question text reads identical across
  // scenarios, so kids perceive it as the "same" question repeating.
  const hardVariants = ['direct', 'rectangle-perimeter', 'which-is-longer', 'rectangle-area', 'name-other-point', 'equidistant']
  const variant = pick(hard ? hardVariants : easyVariants)


  if (variant === 'distance-from-origin') {
    const onX = Math.random() < 0.5
    const d = randInt(2, range - 1)
    const p = onX ? { x: d, y: 0 } : { x: 0, y: d }
    return {
      id: makeId(), topic: 'point-distance', type: 'computation', difficulty: 1,
      question: `How far is point P from the origin?`,
      inputType: 'number',
      grid: { range, points: [{ x: 0, y: 0, label: 'O' }, { ...p, label: 'P' }], connect: [['O', 'P']] },
      answer: d,
      explanation: [
        `The origin is at (0, 0). P is at (${p.x}, ${p.y}).`,
        onX
          ? `Both have y = 0, so P is on the x-axis. Distance = ${p.x} − 0 = ${d}.`
          : `Both have x = 0, so P is on the y-axis. Distance = ${p.y} − 0 = ${d}.`,
      ],
      hint: `When one point is the origin, the distance is just the non-zero coordinate.`,
    }
  }

  if (variant === 'equidistant') {
    // Plot a point that's exactly d units from the given point on a horizontal line
    const ax = randInt(2, range - 2)
    const ay = randInt(2, range - 2)
    const d = randInt(2, Math.min(ax, range - ax))
    const valid = [
      { x: ax - d, y: ay },
      { x: ax + d, y: ay },
    ].filter((p) => p.x >= 0 && p.x <= range)
    return {
      id: makeId(), topic: 'point-distance', type: 'word-problem', difficulty: 2,
      question: `Tap the grid to plot a point that is exactly ${d} units from point A on the same horizontal line.`,
      inputType: 'coordinate',
      grid: { range, points: [{ x: ax, y: ay, label: 'A' }] },
      answer: valid,
      explanation: [
        `On the same horizontal line means same y-coordinate (${ay}).`,
        `${d} units away means the x-coordinate differs by ${d}.`,
        `Either (${ax - d}, ${ay}) or (${ax + d}, ${ay}) works.`,
      ],
      hint: `Same y, x changes by ${d}. Could be left OR right of A.`,
    }
  }


  if (variant === 'which-is-longer') {
    // Two labeled segments AB and CD; ask which is longer
    const horiz1 = Math.random() < 0.5
    const horiz2 = Math.random() < 0.5
    function makeSeg(horiz, ymin, ymax) {
      let p1, p2
      if (horiz) {
        const y = randInt(ymin, ymax)
        const xa = randInt(0, range - 3)
        const xb = randInt(xa + 2, range)
        p1 = { x: xa, y }; p2 = { x: xb, y }
      } else {
        const x = randInt(0, range)
        const ya = randInt(ymin, ymax - 2)
        const yb = randInt(ya + 2, ymax)
        p1 = { x, y: ya }; p2 = { x, y: yb }
      }
      return { p1, p2, len: Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y) }
    }
    let s1, s2
    do { s1 = makeSeg(horiz1, 5, range); s2 = makeSeg(horiz2, 0, 4) } while (s1.len === s2.len)
    const ab = s1.len > s2.len ? 'AB' : 'CD'
    return {
      id: makeId(), topic: 'point-distance', type: 'computation', difficulty: 2,
      question: `Which segment is longer, AB or CD?`,
      inputType: 'choice',
      grid: {
        range,
        points: [
          { ...s1.p1, label: 'A' }, { ...s1.p2, label: 'B' },
          { ...s2.p1, label: 'C' }, { ...s2.p2, label: 'D' },
        ],
        connect: [['A', 'B'], ['C', 'D']],
      },
      choices: ['AB', 'CD', 'They are the same length'],
      answer: ab,
      explanation: [
        `AB length: ${s1.len} units.`,
        `CD length: ${s2.len} units.`,
        `So ${ab} is longer.`,
      ],
      hint: `Count the grid units along each segment.`,
    }
  }

  if (variant === 'name-other-point') {
    // Line through two points; name another point on that line
    const horizontal = Math.random() < 0.5
    let p1, p2, valid
    if (horizontal) {
      const y = randInt(1, range - 1)
      const xa = randInt(0, range - 4)
      const xb = randInt(xa + 3, range)
      p1 = { x: xa, y }; p2 = { x: xb, y }
      valid = []
      for (let i = 0; i <= range; i++) if (i !== xa && i !== xb) valid.push({ x: i, y })
    } else {
      const x = randInt(1, range - 1)
      const ya = randInt(0, range - 4)
      const yb = randInt(ya + 3, range)
      p1 = { x, y: ya }; p2 = { x, y: yb }
      valid = []
      for (let i = 0; i <= range; i++) if (i !== ya && i !== yb) valid.push({ x, y: i })
    }
    return {
      id: makeId(), topic: 'point-distance', type: 'word-problem', difficulty: hard ? 2 : 1,
      question: `A line passes through (${p1.x}, ${p1.y}) and (${p2.x}, ${p2.y}). Tap to plot another point that lies on this line.`,
      inputType: 'coordinate',
      grid: { range, points: [{ ...p1, label: 'A' }, { ...p2, label: 'B' }], connect: [['A', 'B']] },
      answer: valid,
      explanation: [
        horizontal
          ? `The line is horizontal — every point on it has y = ${p1.y}.`
          : `The line is vertical — every point on it has x = ${p1.x}.`,
        `Pick any other point with that ${horizontal ? 'y' : 'x'}-coordinate.`,
      ],
      hint: `What do A and B have in common? Find another point with the same.`,
    }
  }

  if (variant === 'rectangle-area' && hard) {
    const w = randInt(3, 6)
    const h = randInt(2, 5)
    const bx = randInt(0, range - w)
    const by = randInt(0, range - h)
    const area = w * h
    return {
      id: makeId(), topic: 'point-distance', type: 'word-problem', difficulty: 2,
      question: `A rectangle has corners at (${bx}, ${by}), (${bx + w}, ${by}), (${bx + w}, ${by + h}), and (${bx}, ${by + h}). What is the area?`,
      inputType: 'number',
      grid: {
        range,
        points: [
          { x: bx, y: by, label: 'A' }, { x: bx + w, y: by, label: 'B' },
          { x: bx + w, y: by + h, label: 'C' }, { x: bx, y: by + h, label: 'D' },
        ],
        connect: [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A']],
      },
      answer: area,
      explanation: [
        `Width: ${w} units. Height: ${h} units.`,
        `Area = width × height = ${w} × ${h} = ${area}.`,
      ],
      hint: `Area of a rectangle = length × width.`,
    }
  }

  // Default: 'direct' (two points on same line) or 'rectangle-perimeter' (hard fallback)
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

  if (variant === 'rectangle-perimeter') {
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
  const easyVariants = ['identify', 'count-vertices-name', 'vertex-count']
  const hardVariants = ['identify', 'count-vertices-name', 'complete-rectangle', 'vertex-count', 'reflect-point']
  const variant = pick(hard ? hardVariants : easyVariants)

  if (variant === 'reflect-point') {
    // Reflect a point across the y-axis (or vertical line x=N)
    const horizontal = Math.random() < 0.5 // reflect over horizontal vs vertical line
    if (horizontal) {
      // Reflect over horizontal line y=N
      const lineY = randInt(2, range - 2)
      let py = randInt(0, range)
      while (py === lineY) py = randInt(0, range)
      const px = randInt(0, range)
      const reflectedY = 2 * lineY - py
      if (reflectedY < 0 || reflectedY > range) return gen_identify_polygons(hard) // fallback
      return {
        id: makeId(), topic: 'identify-polygons', type: 'word-problem', difficulty: 2,
        question: `Point P is at (${px}, ${py}). Reflect P across the horizontal line y = ${lineY}. Tap the grid to plot the reflected point.`,
        inputType: 'coordinate',
        grid: { range, points: [{ x: px, y: py, label: 'P' }] },
        answer: { x: px, y: reflectedY },
        explanation: [
          `Reflecting across a horizontal line keeps the same x-coordinate.`,
          `P is ${Math.abs(py - lineY)} units away from y = ${lineY} (${py < lineY ? 'below' : 'above'}).`,
          `The reflection is the same distance on the other side: y = ${reflectedY}.`,
          `So the reflected point is (${px}, ${reflectedY}).`,
        ],
        hint: `Same x. New y is the same distance from the line, but on the other side.`,
      }
    } else {
      const lineX = randInt(2, range - 2)
      let px = randInt(0, range)
      while (px === lineX) px = randInt(0, range)
      const py = randInt(0, range)
      const reflectedX = 2 * lineX - px
      if (reflectedX < 0 || reflectedX > range) return gen_identify_polygons(hard)
      return {
        id: makeId(), topic: 'identify-polygons', type: 'word-problem', difficulty: 2,
        question: `Point P is at (${px}, ${py}). Reflect P across the vertical line x = ${lineX}. Tap the grid to plot the reflected point.`,
        inputType: 'coordinate',
        grid: { range, points: [{ x: px, y: py, label: 'P' }] },
        answer: { x: reflectedX, y: py },
        explanation: [
          `Reflecting across a vertical line keeps the same y-coordinate.`,
          `P is ${Math.abs(px - lineX)} units away from x = ${lineX} (${px < lineX ? 'left' : 'right'}).`,
          `The reflection is the same distance on the other side: x = ${reflectedX}.`,
          `So the reflected point is (${reflectedX}, ${py}).`,
        ],
        hint: `Same y. New x is the same distance from the line, but on the other side.`,
      }
    }
  }


  if (variant === 'vertex-count') {
    const map = { triangle: 3, quadrilateral: 4, rectangle: 4, square: 4, pentagon: 5, hexagon: 6 }
    const shape = pick(Object.keys(map))
    return {
      id: makeId(), topic: 'identify-polygons', type: 'computation', difficulty: 1,
      question: `How many vertices does a ${shape} have?`,
      inputType: 'number',
      answer: map[shape],
      explanation: [
        `A ${shape} has ${map[shape]} vertex/vertices.`,
        shape === 'rectangle' || shape === 'square' ? `Rectangles and squares are quadrilaterals — 4 corners.` :
        shape === 'triangle' ? `"Tri" means 3.` :
        shape === 'pentagon' ? `"Penta" means 5.` :
        shape === 'hexagon' ? `"Hexa" means 6.` :
        `"Quad" means 4.`,
      ],
      hint: `A vertex is a corner. Picture the shape and count the corners.`,
    }
  }


  if (variant === 'count-vertices-name') {
    const shapes = [
      { count: 3, name: 'triangle' },
      { count: 4, name: 'quadrilateral' },
      { count: 5, name: 'pentagon' },
      { count: 6, name: 'hexagon' },
    ]
    const target = pick(shapes)
    const distractors = shuffle(shapes.filter((s) => s.name !== target.name)).slice(0, 2)
    return {
      id: makeId(), topic: 'identify-polygons', type: 'computation', difficulty: hard ? 2 : 1,
      question: `What is the name of a polygon with ${target.count} vertices (sides)?`,
      inputType: 'choice',
      choices: shuffle([target.name, ...distractors.map((d) => d.name)]),
      answer: target.name,
      explanation: [
        `Count the vertices: ${target.count}.`,
        `${target.count}-sided polygon = ${target.name}.`,
      ],
      hint: `Think about the prefix: tri- (3), quad- (4), penta- (5), hexa- (6).`,
    }
  }

  if (variant === 'complete-rectangle') {
    const x = randInt(1, range - 5)
    const y = randInt(1, range - 4)
    const w = randInt(3, 5)
    let h = randInt(2, 4)
    if (h === w) h = w === 3 ? 2 : 3
    // Three corners shown; ask for fourth
    const allCorners = [
      { x, y, label: 'A' },
      { x: x + w, y, label: 'B' },
      { x: x + w, y: y + h, label: 'C' },
      { x, y: y + h, label: 'D' },
    ]
    // Hide corner D — student must plot it
    const shown = allCorners.slice(0, 3)
    const missing = allCorners[3]
    return {
      id: makeId(), topic: 'identify-polygons', type: 'word-problem', difficulty: 2,
      question: `Three corners of a rectangle are at A(${x}, ${y}), B(${x + w}, ${y}), and C(${x + w}, ${y + h}). Tap the grid to plot the fourth corner.`,
      inputType: 'coordinate',
      grid: { range, points: shown, connect: [['A', 'B'], ['B', 'C']] },
      answer: { x: missing.x, y: missing.y },
      explanation: [
        `A rectangle has 4 right angles and opposite sides equal.`,
        `D must be directly above A and directly left of C.`,
        `So D = (${missing.x}, ${missing.y}).`,
      ],
      hint: `D should be straight up from A and straight left from C.`,
    }
  }

  // 'identify' variant — original behavior
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
    const w = randInt(3, 5)
    let h = randInt(2, 4)
    if (h === w) h = w === 3 ? 2 : 3 // rectangle must have w != h (otherwise it's a square)
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
    ? ['diff-max-min', 'how-many-above', 'specific-x', 'max-x', 'total-sum', 'ratio-compare', 'min-x', 'change-direction', 'complement-count']
    : ['specific-x', 'how-many-above', 'max-x', 'total-sum', 'min-x']
  const variant = pick(variants)

  if (variant === 'complement-count') {
    // "X students take the test. The graph shows how many earn an A. How many do NOT?"
    const total = randInt(15, 35)
    // Pick a value in the data, ensure it's < total
    const valid = data.filter((d) => d.y < total && d.y > 0)
    if (valid.length === 0) {
      // fall back to specific-x
      const q = pick(data)
      return {
        id: makeId(), topic: 'graph-data', type: 'word-problem', difficulty: 2,
        question: `Use the table. How many ${sc.yLabel.toLowerCase()} were there in ${sc.xLabel.toLowerCase()} ${q.x}?`,
        inputType: 'number',
        table: { xLabel: sc.xLabel, yLabel: sc.yLabel, rows: data.map((d) => ({ x: d.x, y: d.y })) },
        answer: q.y,
        explanation: [`Read the value: ${q.y}.`],
        hint: `Look it up in the table.`,
      }
    }
    const q = pick(valid)
    return {
      id: makeId(), topic: 'graph-data', type: 'word-problem', difficulty: 2,
      question: `${total} students take part on ${sc.xLabel.toLowerCase()} ${q.x}. The table shows how many ${sc.yLabel.toLowerCase()}. How many did NOT have ${sc.yLabel.toLowerCase().replace(/s$/, '')}?`,
      inputType: 'number',
      table: { xLabel: sc.xLabel, yLabel: sc.yLabel, rows: data.map((d) => ({ x: d.x, y: d.y })) },
      answer: total - q.y,
      explanation: [
        `Total: ${total}. Did have: ${q.y}.`,
        `Did NOT have: ${total} − ${q.y} = ${total - q.y}.`,
      ],
      hint: `Total minus the value in the table = the rest.`,
    }
  }

  if (variant === 'min-x') {
    let minIdx = 0
    for (let i = 1; i < data.length; i++) if (data[i].y < data[minIdx].y) minIdx = i
    return {
      id: makeId(), topic: 'graph-data', type: 'word-problem', difficulty: hard ? 2 : 1,
      question: `Which ${sc.xLabel.toLowerCase()} had the FEWEST ${sc.yLabel.toLowerCase()}?`,
      inputType: 'choice',
      table: { xLabel: sc.xLabel, yLabel: sc.yLabel, rows: data.map((d) => ({ x: d.x, y: d.y })) },
      choices: data.map((d) => `${sc.xLabel} ${d.x}`),
      answer: `${sc.xLabel} ${data[minIdx].x}`,
      explanation: [
        `Find the smallest value in the table: ${data[minIdx].y}.`,
        `That's at ${sc.xLabel.toLowerCase()} ${data[minIdx].x}.`,
      ],
      hint: `Find the smallest number in the table.`,
    }
  }

  if (variant === 'change-direction') {
    // Pick two consecutive x values
    const i = randInt(0, data.length - 2)
    const a = data[i], b = data[i + 1]
    let answer
    if (b.y > a.y) answer = 'increased'
    else if (b.y < a.y) answer = 'decreased'
    else answer = 'stayed the same'
    return {
      id: makeId(), topic: 'graph-data', type: 'word-problem', difficulty: hard ? 2 : 1,
      question: `From ${sc.xLabel.toLowerCase()} ${a.x} to ${sc.xLabel.toLowerCase()} ${b.x}, did the ${sc.yLabel.toLowerCase()} increase, decrease, or stay the same?`,
      inputType: 'choice',
      table: { xLabel: sc.xLabel, yLabel: sc.yLabel, rows: data.map((d) => ({ x: d.x, y: d.y })) },
      choices: ['increased', 'decreased', 'stayed the same'],
      answer,
      explanation: [
        `${sc.xLabel} ${a.x}: ${a.y}.`,
        `${sc.xLabel} ${b.x}: ${b.y}.`,
        `So the value ${answer} (${a.y} → ${b.y}).`,
      ],
      hint: `Compare the two y-values. Bigger means it increased.`,
    }
  }

  if (variant === 'max-x') {
    let maxIdx = 0
    for (let i = 1; i < data.length; i++) if (data[i].y > data[maxIdx].y) maxIdx = i
    return {
      id: makeId(), topic: 'graph-data', type: 'word-problem', difficulty: hard ? 2 : 1,
      question: `Which ${sc.xLabel.toLowerCase()} had the most ${sc.yLabel.toLowerCase()}?`,
      inputType: 'choice',
      table: { xLabel: sc.xLabel, yLabel: sc.yLabel, rows: data.map((d) => ({ x: d.x, y: d.y })) },
      choices: data.map((d) => `${sc.xLabel} ${d.x}`),
      answer: `${sc.xLabel} ${data[maxIdx].x}`,
      explanation: [
        `Find the largest ${sc.yLabel.toLowerCase()} in the table: ${data[maxIdx].y}.`,
        `That's at ${sc.xLabel.toLowerCase()} ${data[maxIdx].x}.`,
      ],
      hint: `Find the biggest number in the table, then look at which ${sc.xLabel.toLowerCase()} it goes with.`,
    }
  }

  if (variant === 'total-sum') {
    const total = data.reduce((s, d) => s + d.y, 0)
    return {
      id: makeId(), topic: 'graph-data', type: 'word-problem', difficulty: hard ? 2 : 1,
      question: `What is the total ${sc.yLabel.toLowerCase()} across all ${sc.xLabel.toLowerCase()}s?`,
      inputType: 'number',
      table: { xLabel: sc.xLabel, yLabel: sc.yLabel, rows: data.map((d) => ({ x: d.x, y: d.y })) },
      answer: total,
      explanation: [
        `Add up all the values: ${data.map((d) => d.y).join(' + ')} = ${total}.`,
      ],
      hint: `Add every number in the bottom row of the table.`,
    }
  }

  if (variant === 'ratio-compare') {
    // Pick two values where one is a clean multiple of the other
    let i1 = 0, i2 = 1, ratio = 0
    for (let attempt = 0; attempt < 30; attempt++) {
      const a = randInt(0, data.length - 1)
      const b = randInt(0, data.length - 1)
      if (a === b) continue
      const big = Math.max(data[a].y, data[b].y)
      const small = Math.min(data[a].y, data[b].y)
      if (small > 0 && big % small === 0 && big / small >= 2 && big / small <= 5) {
        i1 = data[a].y > data[b].y ? a : b
        i2 = data[a].y > data[b].y ? b : a
        ratio = big / small
        break
      }
    }
    if (ratio < 2) {
      // Fallback to specific-x style if no clean ratio
      const q = pick(data)
      return {
        id: makeId(), topic: 'graph-data', type: 'word-problem', difficulty: hard ? 2 : 1,
        question: `Use the table. How many ${sc.yLabel.toLowerCase()} were there in ${sc.xLabel.toLowerCase()} ${q.x}?`,
        inputType: 'number',
        table: { xLabel: sc.xLabel, yLabel: sc.yLabel, rows: data.map((d) => ({ x: d.x, y: d.y })) },
        answer: q.y,
        explanation: [`Read the value: ${q.y}.`],
        hint: `Look it up in the table.`,
      }
    }
    return {
      id: makeId(), topic: 'graph-data', type: 'word-problem', difficulty: 2,
      question: `How many times as many ${sc.yLabel.toLowerCase()} were there in ${sc.xLabel.toLowerCase()} ${data[i1].x} as in ${sc.xLabel.toLowerCase()} ${data[i2].x}?`,
      inputType: 'number',
      table: { xLabel: sc.xLabel, yLabel: sc.yLabel, rows: data.map((d) => ({ x: d.x, y: d.y })) },
      answer: ratio,
      explanation: [
        `${sc.xLabel} ${data[i1].x}: ${data[i1].y}.`,
        `${sc.xLabel} ${data[i2].x}: ${data[i2].y}.`,
        `${data[i1].y} ÷ ${data[i2].y} = ${ratio}.`,
      ],
      hint: `Divide the bigger number by the smaller one.`,
    }
  }

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
  // step = gridline spacing on the y-axis. Data values are constrained to
  // multiples of `step` so every plotted point lands exactly on a grid
  // intersection — matches the textbook style.
  const scenarios = [
    { xLabel: 'Age (months)', yLabel: 'Weight (pounds)', title: "Dog's Weight", yMax: 60, step: 5 },
    { xLabel: 'Day', yLabel: 'Height (cm)', title: 'Seedling Height', yMax: 30, step: 2 },
    { xLabel: 'Time (hours)', yLabel: 'Temperature (°F)', title: 'Storm Temperature', yMax: 40, step: 5 },
    { xLabel: 'Day', yLabel: 'Money raised ($)', title: 'Class Fundraiser', yMax: 120, step: 10 },
  ]
  const sc = pick(scenarios)

  // Build a bumpy sequence — every y is a multiple of sc.step
  const points = []
  let y = sc.step * randInt(2, Math.max(3, Math.floor(sc.yMax / sc.step / 4)))
  for (let x = 1; x <= 6; x++) {
    points.push({ x, y })
    const deltaSteps = randInt(-1, 3) // change by -1..3 grid units
    y = Math.min(sc.yMax, Math.max(sc.step, y + deltaSteps * sc.step))
  }

  const variants = hard
    ? ['biggest-jump', 'value-at-x', 'range', 'biggest-drop', 'change-amount', 'start-value', 'reverse-lookup']
    : ['value-at-x', 'biggest-jump', 'range', 'change-amount', 'start-value']
  const variant = pick(variants)

  if (variant === 'reverse-lookup') {
    // "When did the value first reach Y?" — pick a y on the line, return the x
    // Find a target between two known points where we can interpolate cleanly
    const i = randInt(0, points.length - 2)
    const a = points[i], b = points[i + 1]
    if (b.y === a.y) return gen_line_graphs(hard) // flat segment, fallback
    // Pick an integer y between them
    const yLow = Math.min(a.y, b.y), yHigh = Math.max(a.y, b.y)
    if (yHigh - yLow < 2) return gen_line_graphs(hard)
    // Use exact endpoint to avoid interpolation ambiguity
    const targetY = b.y
    return {
      id: makeId(), topic: 'line-graphs', type: 'word-problem', difficulty: 2,
      question: `On what ${sc.xLabel.toLowerCase().split(' ')[0]} did the ${sc.yLabel.toLowerCase()} reach ${targetY}?`,
      inputType: 'number',
      lineGraph: { xLabel: sc.xLabel, yLabel: sc.yLabel, title: sc.title, points, yMax: sc.yMax },
      answer: b.x,
      explanation: [
        `Find ${targetY} on the y-axis.`,
        `Trace right until you hit the line. That's at ${sc.xLabel.toLowerCase().split(' ')[0]} ${b.x}.`,
      ],
      hint: `Start at the y-axis (left side). Go right until you touch the line, then look down to the x-axis.`,
    }
  }

  if (variant === 'start-value') {
    return {
      id: makeId(), topic: 'line-graphs', type: 'word-problem', difficulty: hard ? 2 : 1,
      question: `What was the ${sc.yLabel.toLowerCase()} on ${sc.xLabel.toLowerCase().split(' ')[0]} ${points[0].x}?`,
      inputType: 'number',
      lineGraph: { xLabel: sc.xLabel, yLabel: sc.yLabel, title: sc.title, points, yMax: sc.yMax },
      answer: points[0].y,
      explanation: [
        `Look at the leftmost point on the graph.`,
        `It's at (${points[0].x}, ${points[0].y}). The starting value is ${points[0].y}.`,
      ],
      hint: `The starting value is the leftmost data point.`,
    }
  }

  if (variant === 'change-amount') {
    // Pick two non-adjacent points; ask for the absolute change
    const i = randInt(0, points.length - 3)
    const j = i + 2
    const a = points[i], b = points[j]
    const change = Math.abs(b.y - a.y)
    return {
      id: makeId(), topic: 'line-graphs', type: 'word-problem', difficulty: hard ? 2 : 1,
      question: `By how much did the ${sc.yLabel.toLowerCase()} change from ${sc.xLabel.toLowerCase().split(' ')[0]} ${a.x} to ${sc.xLabel.toLowerCase().split(' ')[0]} ${b.x}?`,
      inputType: 'number',
      lineGraph: { xLabel: sc.xLabel, yLabel: sc.yLabel, title: sc.title, points, yMax: sc.yMax },
      answer: change,
      explanation: [
        `${sc.xLabel.split(' ')[0]} ${a.x}: ${a.y}.`,
        `${sc.xLabel.split(' ')[0]} ${b.x}: ${b.y}.`,
        `Change: |${b.y} − ${a.y}| = ${change}.`,
      ],
      hint: `Subtract the smaller value from the bigger one.`,
    }
  }

  if (variant === 'range') {
    const yvals = points.map((p) => p.y)
    const maxY = Math.max(...yvals)
    const minY = Math.min(...yvals)
    return {
      id: makeId(), topic: 'line-graphs', type: 'word-problem', difficulty: hard ? 2 : 1,
      question: `What is the difference between the greatest and least ${sc.yLabel.toLowerCase()} on the graph?`,
      inputType: 'number',
      lineGraph: { xLabel: sc.xLabel, yLabel: sc.yLabel, title: sc.title, points, yMax: sc.yMax },
      answer: maxY - minY,
      explanation: [
        `Greatest ${sc.yLabel.toLowerCase()}: ${maxY}.`,
        `Least: ${minY}.`,
        `Difference: ${maxY} − ${minY} = ${maxY - minY}.`,
      ],
      hint: `Find the highest point and the lowest point on the graph, then subtract.`,
    }
  }

  if (variant === 'biggest-drop') {
    // Find the segment with the biggest decrease
    let maxDrop = 0, dropIdx = -1
    for (let i = 1; i < points.length; i++) {
      const d = points[i - 1].y - points[i].y
      if (d > maxDrop) { maxDrop = d; dropIdx = i }
    }
    if (dropIdx === -1) {
      // No drop in this graph — fall back to biggest-jump
      let maxJump = 0, jumpIdx = 0
      for (let i = 1; i < points.length; i++) {
        const d = Math.abs(points[i].y - points[i - 1].y)
        if (d > maxJump) { maxJump = d; jumpIdx = i }
      }
      const correctAnswer = `${sc.xLabel.split(' ')[0]} ${points[jumpIdx - 1].x} and ${points[jumpIdx].x}`
      return {
        id: makeId(), topic: 'line-graphs', type: 'word-problem', difficulty: 2,
        question: `Between which two points does the graph change the most?`,
        inputType: 'choice',
        choices: shuffle([correctAnswer, `${sc.xLabel.split(' ')[0]} 1 and 2`, `${sc.xLabel.split(' ')[0]} 5 and 6`]),
        lineGraph: { xLabel: sc.xLabel, yLabel: sc.yLabel, title: sc.title, points, yMax: sc.yMax },
        answer: correctAnswer,
        explanation: [`Look for the steepest segment.`],
        hint: `Steepest line = biggest change.`,
      }
    }
    const correctAnswer = `${sc.xLabel.split(' ')[0]} ${points[dropIdx - 1].x} and ${points[dropIdx].x}`
    const otherPairs = []
    for (let i = 1; i < points.length; i++) {
      if (i !== dropIdx) otherPairs.push(`${sc.xLabel.split(' ')[0]} ${points[i - 1].x} and ${points[i].x}`)
    }
    const choices = shuffle([correctAnswer, ...shuffle(otherPairs).slice(0, 2)])
    return {
      id: makeId(), topic: 'line-graphs', type: 'word-problem', difficulty: 2,
      question: `Between which two points does the value DECREASE the most?`,
      inputType: 'choice',
      choices,
      lineGraph: { xLabel: sc.xLabel, yLabel: sc.yLabel, title: sc.title, points, yMax: sc.yMax },
      answer: correctAnswer,
      explanation: [
        `Look for the segment that goes down the most.`,
        `${correctAnswer}: from ${points[dropIdx - 1].y} to ${points[dropIdx].y}, a decrease of ${maxDrop}.`,
      ],
      hint: `Find the part of the graph that goes DOWN the steepest.`,
    }
  }

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

  // Fallback (should never hit — all listed variants have explicit handlers above)
  const q = pick(points)
  return {
    id: makeId(), topic: 'line-graphs', type: 'word-problem', difficulty: hard ? 2 : 1,
    question: `Read the line graph. What was the ${sc.yLabel.toLowerCase()} at ${sc.xLabel.toLowerCase().split(' ')[0]} ${q.x}?`,
    inputType: 'number',
    lineGraph: { xLabel: sc.xLabel, yLabel: sc.yLabel, title: sc.title, points, yMax: sc.yMax },
    answer: q.y,
    explanation: [`Find x = ${q.x} on the horizontal axis.`, `Trace up to the line, then read across to the y-axis: ${q.y}.`],
    hint: `Go up from x = ${q.x} until you hit the line, then look left to the y-axis.`,
  }
}

// ===== 12.6: NUMERICAL PATTERNS =====

function gen_number_patterns(hard = false) {
  const variant = hard
    ? pick(['find-rule', 'extend-related', 'two-patterns', 'fill-missing', 'apply-rule', 'which-rule', 'geometric', 'relate-tables', 'tokens-rate'])
    : pick(['extend-single', 'find-rule', 'fill-missing', 'apply-rule', 'geometric', 'tokens-rate'])

  if (variant === 'tokens-rate') {
    // "$1 = 4 tokens = 2 games. You have 60 tokens. How many games can you play?"
    const tokensPerDollar = pick([3, 4, 5, 6])
    const gamesPerDollar = pick([1, 2, 3])
    const tokensPerGame = (tokensPerDollar * 1) / gamesPerDollar
    if (!Number.isInteger(tokensPerGame)) return gen_number_patterns(hard)
    const dollarsHeld = randInt(4, 12)
    const tokensHeld = dollarsHeld * tokensPerDollar
    const gamesPlayable = tokensHeld / tokensPerGame
    const scenario = pick([
      { resource: 'tokens', activity: 'arcade games', verb: 'play' },
      { resource: 'tickets', activity: 'rides', verb: 'go on' },
      { resource: 'coins', activity: 'pinball games', verb: 'play' },
    ])
    return {
      id: makeId(), topic: 'number-patterns', type: 'word-problem', difficulty: 2,
      question: `For each $1 you spend, you get ${tokensPerDollar} ${scenario.resource} and can ${scenario.verb} ${gamesPerDollar} ${scenario.activity}. You have ${tokensHeld} ${scenario.resource}. How many ${scenario.activity} can you ${scenario.verb}?`,
      inputType: 'number',
      answer: gamesPlayable,
      explanation: [
        `Find the rule between ${scenario.resource} and ${scenario.activity}.`,
        `${tokensPerDollar} ${scenario.resource} = ${gamesPerDollar} ${scenario.activity}, so each ${scenario.activity.replace(/s$/, '')} costs ${tokensPerGame} ${scenario.resource}.`,
        `${tokensHeld} ÷ ${tokensPerGame} = ${gamesPlayable} ${scenario.activity}.`,
      ],
      hint: `First find how many ${scenario.resource} you need for one ${scenario.activity.replace(/s$/, '')}. Then divide.`,
    }
  }

  if (variant === 'geometric') {
    // Multiplicative pattern: 2, 6, 18, 54 (×3)
    const ratio = pick([2, 3, 4])
    const start = pick([1, 2, 3])
    const seq = [start, start * ratio, start * ratio * ratio, start * ratio * ratio * ratio]
    return {
      id: makeId(), topic: 'number-patterns', type: 'word-problem', difficulty: hard ? 2 : 1,
      question: `Look at this pattern: ${seq.join(', ')}. What rule describes it?`,
      inputType: 'choice',
      choices: shuffle([
        `Multiply by ${ratio}`,
        `Add ${ratio}`,
        `Multiply by ${ratio + 1}`,
        `Add ${seq[1] - seq[0]}`,
      ]),
      answer: `Multiply by ${ratio}`,
      explanation: [
        `Look at the ratio between consecutive terms.`,
        `${seq[1]} ÷ ${seq[0]} = ${ratio}.`,
        `${seq[2]} ÷ ${seq[1]} = ${ratio}.`,
        `Each term is ${ratio} times the one before it.`,
      ],
      hint: `Try dividing each number by the one before it. If you get the same number every time, it's a multiply rule.`,
    }
  }

  if (variant === 'relate-tables') {
    // Newton X, Descartes Y; find Newton's value when Descartes is given
    const ratioND = pick([2, 3, 4])
    const newtonStep = pick([3, 5, 6, 8])
    const descartesStep = newtonStep * ratioND
    const askMonth = randInt(2, 7)
    const newtonAtAsk = newtonStep * askMonth
    const descartesAtAsk = descartesStep * askMonth
    return {
      id: makeId(), topic: 'number-patterns', type: 'word-problem', difficulty: 2,
      question: `Newton saves $${newtonStep} a week. Descartes saves $${descartesStep} a week. When Descartes has saved $${descartesAtAsk}, how much has Newton saved?`,
      inputType: 'number',
      answer: newtonAtAsk,
      explanation: [
        `Descartes saves ${ratioND}× as much as Newton each week.`,
        `So Newton has 1/${ratioND} of Descartes' total: $${descartesAtAsk} ÷ ${ratioND} = $${newtonAtAsk}.`,
        `(Or: ${descartesAtAsk} ÷ ${descartesStep} = ${askMonth} weeks. ${askMonth} × $${newtonStep} = $${newtonAtAsk}.)`,
      ],
      hint: `Newton saves a smaller fraction of Descartes' total. Find the ratio first.`,
    }
  }

  if (variant === 'fill-missing') {
    const start = randInt(0, 5)
    const step = randInt(2, 8)
    const len = 6
    const seq = []
    for (let i = 0; i < len; i++) seq.push(start + step * i)
    const missingIdx = randInt(2, len - 2) // not first, not last
    const display = seq.map((v, i) => (i === missingIdx ? '___' : String(v))).join(', ')
    return {
      id: makeId(), topic: 'number-patterns', type: 'computation', difficulty: hard ? 2 : 1,
      question: `Fill in the missing number in this pattern: ${display}`,
      inputType: 'number',
      answer: seq[missingIdx],
      explanation: [
        `The pattern adds ${step} each step.`,
        `${seq[missingIdx - 1]} + ${step} = ${seq[missingIdx]}.`,
        `(You can also check by going backward: ${seq[missingIdx + 1]} − ${step} = ${seq[missingIdx]}.)`,
      ],
      hint: `Find the difference between two consecutive known numbers — that's the rule. Then apply it.`,
    }
  }

  if (variant === 'apply-rule') {
    // Mirror the textbook's Lesson 12.6 format: labeled table of positions →
    // values. Kids fill in a missing later position. No ambiguity about
    // whether "term 1" is the start or the next number.
    const start = randInt(0, 4)
    const step = randInt(2, 12)
    const askPos = randInt(5, 7)
    const knownRows = []
    for (let pos = 1; pos <= 4; pos++) knownRows.push({ x: pos, y: start + step * (pos - 1) })
    const answer = start + step * (askPos - 1)
    return {
      id: makeId(), topic: 'number-patterns', type: 'computation', difficulty: hard ? 2 : 1,
      question: `The table follows the rule "Add ${step}". What is the value at position ${askPos}?`,
      table: { xLabel: 'Position', yLabel: 'Value', rows: knownRows },
      inputType: 'number',
      answer,
      explanation: [
        `Position 1 is ${start}. Each step adds ${step}.`,
        `Position 4 is ${start + step * 3}.`,
        `Continue the pattern: ${[5,6,7].filter(p => p <= askPos).map(p => `position ${p} = ${start + step * (p-1)}`).join(', ')}.`,
        `So position ${askPos} = ${answer}.`,
      ],
      hint: `Keep adding ${step} from the last value in the table until you reach position ${askPos}.`,
    }
  }

  if (variant === 'which-rule') {
    // Two related patterns; ask the rule that connects them
    const ratio = pick([2, 3, 4, 5])
    const xs = [1, 2, 3, 4, 5]
    const ys = xs.map((x) => x * ratio)
    const tableRows = xs.map((x, i) => ({ x, y: ys[i] }))
    return {
      id: makeId(), topic: 'number-patterns', type: 'word-problem', difficulty: 2,
      question: `Look at the table below. What rule connects x and y?`,
      inputType: 'choice',
      table: { xLabel: 'x', yLabel: 'y', rows: tableRows },
      choices: shuffle([
        `Multiply x by ${ratio}`,
        `Add ${ratio} to x`,
        `Multiply x by ${ratio + 1}`,
        `Subtract x from ${ratio}`,
      ]),
      answer: `Multiply x by ${ratio}`,
      explanation: [
        `Look at each pair: ${xs.map((x, i) => `${x} → ${ys[i]}`).join(', ')}.`,
        `Each y is ${ratio} times its x.`,
        `Rule: Multiply x by ${ratio}.`,
      ],
      hint: `Pick a row. Divide y by x to find the relationship.`,
    }
  }

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
