import { useState } from 'react'

const CELL = 32 // pixels per grid unit
const PAD_LEFT = 32
const PAD_BOTTOM = 28
const PAD_TOP = 12
const PAD_RIGHT = 12

// Renders a coordinate plane with optional labeled points, line segments
// connecting points, and an optional click-to-plot mode.
export default function CoordinateGrid({ range = 8, points = [], connect = [], interactive = false, plottedPoint, onPlot }) {
  const [hover, setHover] = useState(null)
  const width = PAD_LEFT + range * CELL + PAD_RIGHT
  const height = PAD_TOP + range * CELL + PAD_BOTTOM

  function toSvgX(x) { return PAD_LEFT + x * CELL }
  function toSvgY(y) { return PAD_TOP + (range - y) * CELL }

  function handleClick(e) {
    if (!interactive) return
    const rect = e.currentTarget.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const gx = Math.round((sx - PAD_LEFT) / CELL)
    const gy = Math.round((range - (sy - PAD_TOP) / CELL))
    if (gx < 0 || gx > range || gy < 0 || gy > range) return
    onPlot?.({ x: gx, y: gy })
  }

  function handleMouseMove(e) {
    if (!interactive) return
    const rect = e.currentTarget.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const gx = Math.round((sx - PAD_LEFT) / CELL)
    const gy = Math.round((range - (sy - PAD_TOP) / CELL))
    if (gx < 0 || gx > range || gy < 0 || gy > range) { setHover(null); return }
    setHover({ x: gx, y: gy })
  }

  // Resolve connect[] from labels to points
  const labelMap = {}
  points.forEach((p) => { if (p.label) labelMap[p.label] = p })

  return (
    <div className="coord-grid-wrap">
      <svg
        className="coord-grid"
        width={width}
        height={height}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
        style={{ cursor: interactive ? 'crosshair' : 'default' }}
      >
        {/* Grid lines */}
        {Array.from({ length: range + 1 }).map((_, i) => (
          <g key={`v${i}`}>
            <line
              x1={toSvgX(i)} y1={toSvgY(0)} x2={toSvgX(i)} y2={toSvgY(range)}
              stroke="#d8dee9" strokeWidth={i === 0 ? 2 : 1}
            />
          </g>
        ))}
        {Array.from({ length: range + 1 }).map((_, i) => (
          <g key={`h${i}`}>
            <line
              x1={toSvgX(0)} y1={toSvgY(i)} x2={toSvgX(range)} y2={toSvgY(i)}
              stroke="#d8dee9" strokeWidth={i === 0 ? 2 : 1}
            />
          </g>
        ))}

        {/* Axis labels */}
        {Array.from({ length: range + 1 }).map((_, i) => (
          <text
            key={`xl${i}`} x={toSvgX(i)} y={toSvgY(0) + 16}
            textAnchor="middle" fontSize="11" fill="#6b7280"
          >{i}</text>
        ))}
        {Array.from({ length: range + 1 }).map((_, i) => (
          <text
            key={`yl${i}`} x={toSvgX(0) - 8} y={toSvgY(i) + 4}
            textAnchor="end" fontSize="11" fill="#6b7280"
          >{i}</text>
        ))}

        {/* Axis titles */}
        <text x={toSvgX(range) + 8} y={toSvgY(0) + 4} fontSize="12" fill="#6b7280" fontStyle="italic">x</text>
        <text x={toSvgX(0) - 14} y={toSvgY(range) - 4} fontSize="12" fill="#6b7280" fontStyle="italic">y</text>

        {/* Connection line segments */}
        {connect.map(([la, lb], i) => {
          const pa = labelMap[la]
          const pb = labelMap[lb]
          if (!pa || !pb) return null
          return (
            <line
              key={`c${i}`}
              x1={toSvgX(pa.x)} y1={toSvgY(pa.y)}
              x2={toSvgX(pb.x)} y2={toSvgY(pb.y)}
              stroke="#3b5bdb" strokeWidth={2}
            />
          )
        })}

        {/* Labeled points */}
        {points.map((p, i) => (
          <g key={`p${i}`}>
            <circle cx={toSvgX(p.x)} cy={toSvgY(p.y)} r={5} fill="#3b5bdb" />
            {p.label && (
              <text
                x={toSvgX(p.x) + 8} y={toSvgY(p.y) - 6}
                fontSize="13" fontWeight="700" fill="#1a1f36"
              >{p.label}</text>
            )}
          </g>
        ))}

        {/* Hover preview (interactive only) */}
        {interactive && hover && !plottedPoint && (
          <circle cx={toSvgX(hover.x)} cy={toSvgY(hover.y)} r={7} fill="rgba(59, 91, 219, 0.25)" stroke="#3b5bdb" strokeWidth={1} strokeDasharray="3,3" />
        )}

        {/* Plotted point (interactive) */}
        {plottedPoint && (
          <g>
            <circle cx={toSvgX(plottedPoint.x)} cy={toSvgY(plottedPoint.y)} r={6} fill="#e11d48" />
            <text
              x={toSvgX(plottedPoint.x) + 9} y={toSvgY(plottedPoint.y) - 7}
              fontSize="13" fontWeight="700" fill="#9f1239"
            >({plottedPoint.x}, {plottedPoint.y})</text>
          </g>
        )}
      </svg>
    </div>
  )
}
