// Renders a line graph (x vs y) with connected line segments.
// Gridlines and data points are guaranteed to share intersections — every
// data point lands exactly on a horizontal gridline (matches textbook style).
const W = 340
const H = 240
const PAD_L = 42
const PAD_B = 42
const PAD_T = 28
const PAD_R = 12

// Pick a gridline step that divides yTop evenly and keeps line count reasonable.
function pickYStep(yTop) {
  const candidates = [1, 2, 5, 10, 20, 25, 50, 100]
  for (const step of candidates) {
    const lines = yTop / step
    if (yTop % step === 0 && lines >= 4 && lines <= 12) return step
  }
  // fallback: divide into 6 equal parts
  return Math.max(1, Math.round(yTop / 6))
}

export default function LineGraph({ title, xLabel, yLabel, points, yMax, yStep: yStepProp }) {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const xMin = 0
  const xMax = Math.max(...xs) + 1
  const dataMax = Math.max(...ys)
  // The engine knows the gridline step it generated data against (yStepProp).
  // Use that as the source of truth so every data point lands on a gridline.
  const yStep = yStepProp || pickYStep(yMax || Math.max(10, Math.ceil(dataMax / 10) * 10))
  // yTop must be a multiple of yStep AND ≥ dataMax.
  const baseTop = yMax || dataMax
  const yTop = Math.max(yStep, Math.ceil(baseTop / yStep) * yStep)
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B

  const sx = (x) => PAD_L + ((x - xMin) / (xMax - xMin)) * chartW
  const sy = (y) => PAD_T + chartH - (y / yTop) * chartH

  // Horizontal gridlines at every yStep — guarantees data points land on intersections.
  const hLines = []
  for (let y = 0; y <= yTop; y += yStep) {
    hLines.push({ y, sy: sy(y) })
  }

  // Grid lines (vertical)
  const vLines = []
  for (let i = xMin; i <= xMax; i++) {
    vLines.push({ x: i, sx: sx(i) })
  }

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x)} ${sy(p.y)}`).join(' ')

  return (
    <div className="line-graph-wrap">
      <div className="line-graph-title">{title}</div>
      <svg className="line-graph" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {/* Horizontal grid lines + labels */}
        {hLines.map((ln, i) => (
          <g key={`h${i}`}>
            <line x1={PAD_L} x2={W - PAD_R} y1={ln.sy} y2={ln.sy} stroke="#94a3b8" strokeWidth={1} />
            <text x={PAD_L - 6} y={ln.sy + 3} textAnchor="end" fontSize="10" fill="#6b7280">{Math.round(ln.y)}</text>
          </g>
        ))}
        {/* Vertical grid lines + labels */}
        {vLines.map((ln, i) => (
          <g key={`v${i}`}>
            <line x1={ln.sx} x2={ln.sx} y1={PAD_T} y2={H - PAD_B} stroke="#94a3b8" strokeWidth={1} />
            <text x={ln.sx} y={H - PAD_B + 14} textAnchor="middle" fontSize="10" fill="#6b7280">{ln.x}</text>
          </g>
        ))}
        {/* Axes */}
        <line x1={PAD_L} x2={PAD_L} y1={PAD_T} y2={H - PAD_B} stroke="#1a1f36" strokeWidth={2} />
        <line x1={PAD_L} x2={W - PAD_R} y1={H - PAD_B} y2={H - PAD_B} stroke="#1a1f36" strokeWidth={2} />
        {/* Axis labels */}
        <text x={(PAD_L + W - PAD_R) / 2} y={H - 6} textAnchor="middle" fontSize="12" fill="#1a1f36" fontWeight="600">{xLabel}</text>
        <text x={14} y={(PAD_T + H - PAD_B) / 2} textAnchor="middle" fontSize="12" fill="#1a1f36" fontWeight="600" transform={`rotate(-90, 14, ${(PAD_T + H - PAD_B) / 2})`}>{yLabel}</text>
        {/* Line path */}
        <path d={pathD} stroke="#3b5bdb" strokeWidth={2.5} fill="none" />
        {/* Points */}
        {points.map((p, i) => (
          <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={4} fill="#e11d48" stroke="#fff" strokeWidth={1.5} />
        ))}
      </svg>
    </div>
  )
}
