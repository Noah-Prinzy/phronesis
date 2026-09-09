/**
 * The living surface, behind everything.
 *
 * Three pools of lifted shadow drifting on 47, 61 and 73 seconds. The periods
 * are deliberately mismatched and near-prime, so they only realign after
 * roughly fifty-eight hours — long enough that the pattern never visibly
 * repeats, which is the entire difference between a surface that feels alive
 * and one that feels like a loop.
 *
 * **Why this is an element and not `body::before`.** A pseudo-element can hold
 * three gradients but only one transform, so they would all drift together as
 * a single sheet — which reads as the page sliding rather than as light
 * moving. Three children means three independent animations.
 *
 * **Why it is cheap.** Nothing here paints text or an edge. Every frame is a
 * transform on an already-composited layer, so it runs on the GPU and costs
 * effectively nothing per frame — which matters because every card above it
 * is running a backdrop-filter, and those two fight if the layer underneath
 * is repainting.
 *
 * The motes are dust catching light, not stars. They are warm for the same
 * reason the greys are: this is a lit surface, not a night sky.
 */

/** Fixed positions, so the drift is the only thing that moves. */
const MOTES = [
  { left: '11%', top: '76%', size: 3, dur: 22, delay: -4 },
  { left: '29%', top: '84%', size: 2, dur: 28, delay: -11 },
  { left: '56%', top: '80%', size: 3.5, dur: 25, delay: -18 },
  { left: '73%', top: '90%', size: 2.5, dur: 31, delay: -7 },
  { left: '87%', top: '72%', size: 2, dur: 26, delay: -21 },
  { left: '44%', top: '94%', size: 3, dur: 34, delay: -2 },
  { left: '64%', top: '68%', size: 2, dur: 29, delay: -15 },
]

export function Surface() {
  return (
    <div className="ph-surface" aria-hidden="true">
      <div className="ph-surface__blooms">
        <span className="ph-bloom ph-bloom--a" />
        <span className="ph-bloom ph-bloom--b" />
        <span className="ph-bloom ph-bloom--c" />
      </div>
      <div className="ph-surface__motes">
        {MOTES.map((m, i) => (
          <span
            key={i}
            className="ph-mote"
            style={{
              left: m.left,
              top: m.top,
              width: `${m.size}px`,
              height: `${m.size}px`,
              // Negative delays start each one mid-flight, so the first frame
              // is already a populated surface rather than an empty one
              // filling up.
              animationDuration: `${m.dur}s`,
              animationDelay: `${m.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
