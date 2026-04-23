// Tiny Web Audio sound effects.
// All effects are synthesized live (no asset files) so we ship nothing extra.

let audioCtx = null

function ctx() {
  if (audioCtx) return audioCtx
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    if (audioCtx.state === 'suspended') audioCtx.resume()
  } catch {}
  return audioCtx
}

let muted = false
export function setMuted(v) { muted = !!v }
export function isMuted() { return muted }

function tone({ freqStart, freqEnd, type = 'sine', duration = 0.15, gain = 0.08, when = 0 }) {
  if (muted) return
  const ac = ctx()
  if (!ac) return
  const o = ac.createOscillator()
  const g = ac.createGain()
  o.connect(g); g.connect(ac.destination)
  o.type = type
  const t = ac.currentTime + when
  o.frequency.setValueAtTime(freqStart, t)
  if (freqEnd && freqEnd !== freqStart) {
    o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + duration)
  }
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + duration)
  o.start(t)
  o.stop(t + duration + 0.02)
}

export function sfxCorrect() {
  // Short rising two-note chirp
  tone({ freqStart: 660, freqEnd: 660, type: 'sine', duration: 0.08, gain: 0.07 })
  tone({ freqStart: 990, freqEnd: 990, type: 'sine', duration: 0.12, gain: 0.07, when: 0.07 })
}

export function sfxWrong() {
  // Soft descending tone — not punishing
  tone({ freqStart: 320, freqEnd: 220, type: 'triangle', duration: 0.16, gain: 0.06 })
}

export function sfxLevelUp() {
  // Triumphant arpeggio
  const notes = [523, 659, 784, 1047]
  notes.forEach((f, i) => tone({
    freqStart: f, freqEnd: f, type: 'square',
    duration: 0.18, gain: 0.06, when: i * 0.10,
  }))
}

export function sfxStreakMilestone() {
  // Quick double-beep
  tone({ freqStart: 880, freqEnd: 880, type: 'sine', duration: 0.07, gain: 0.06 })
  tone({ freqStart: 1320, freqEnd: 1320, type: 'sine', duration: 0.10, gain: 0.06, when: 0.07 })
}
