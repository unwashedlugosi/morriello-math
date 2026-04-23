import { useEffect } from 'react'
import { LEVELS } from '../engine.js'

export default function LevelUpCelebration({ newLevel, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [onDone])

  const levelInfo = LEVELS.find((l) => l.level === newLevel) || LEVELS[0]

  return (
    <div className="levelup-overlay" onClick={onDone}>
      <div className="levelup-card">
        <div className="levelup-burst">⭐</div>
        <div className="levelup-eyebrow">LEVEL UP</div>
        <div className="levelup-name">{levelInfo.name}</div>
        <div className="levelup-meta">Level {newLevel}</div>
        <div className="levelup-hint">tap to continue</div>
      </div>
    </div>
  )
}
