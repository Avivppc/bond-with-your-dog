/* Deterministic timeline engine: every visual property is a pure function of
 * t (ms). The driver calls window.setT(t) and screenshots each frame. */

;(() => {
const EASE = {
  linear: (u) => u,
  in: (u) => u * u * u,
  out: (u) => 1 - Math.pow(1 - u, 3),
  inOut: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  outBack: (u) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2)
  },
}

/* keys: [[t, value, easeName?], ...] — value is a number or [x, y].
 * The ease on a key applies to the segment ENDING at that key. */
function track(keys) {
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1]
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, v0] = keys[i]
      const [t1, v1, easeName] = keys[i + 1]
      if (t <= t1) {
        const u = EASE[easeName || 'inOut']((t - t0) / (t1 - t0))
        if (Array.isArray(v0)) {
          return [v0[0] + (v1[0] - v0[0]) * u, v0[1] + (v1[1] - v0[1]) * u]
        }
        return v0 + (v1 - v0) * u
      }
    }
    return keys[keys.length - 1][1]
  }
}

/* A tap ripple: returns {r, o} for a ripple spawned at t0. */
function ripple(t, t0, dur = 480) {
  const u = (t - t0) / dur
  if (u < 0 || u > 1) return { r: 0, o: 0 }
  return { r: 16 + 60 * EASE.out(u), o: 0.85 * (1 - EASE.in(u)) }
}

/* Finger press: 1 while pressed (dips + shadow tightens). */
function press(t, downT, upT) {
  const IN = 120, OUT = 160
  if (t < downT || t > upT + OUT) return 0
  if (t < downT + IN) return EASE.out((t - downT) / IN)
  if (t < upT) return 1
  return 1 - EASE.out((t - upT) / OUT)
}

window.__engine = { EASE, track, ripple, press }
})()
