import { useEffect, useRef } from 'react'
import { useMotionAllowed } from '../motion/motion'

interface Star {
  x: number
  y: number
  radius: number
  phase: number
}

/** A depth layer: how many stars, their size range, drift in px per second and how much they twinkle. */
interface Layer {
  count: number
  size: [number, number]
  drift: number
  alpha: number
  twinkle: number
}

// Far stars barely move, near stars a little more, dust the most: a few px per
// second at most, so the sky has depth and never pulls the eye.
const LAYERS: Layer[] = [
  { count: 110, size: [0.3, 0.7], drift: 1.2, alpha: 0.5, twinkle: 0.25 },
  { count: 45, size: [0.8, 1.4], drift: 3, alpha: 0.75, twinkle: 0.4 },
  { count: 24, size: [1.6, 2.4], drift: 7, alpha: 0.12, twinkle: 0 },
]

// A fixed set of stars from a small seeded generator, so the sky is the same on
// every visit and in every screenshot.
function makeLayers(): Star[][] {
  let seed = 7
  const next = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  return LAYERS.map((layer) =>
    Array.from({ length: layer.count }, () => ({
      x: next(),
      y: next(),
      radius: layer.size[0] + next() * (layer.size[1] - layer.size[0]),
      phase: next() * Math.PI * 2,
    })),
  )
}

const STARS = makeLayers()

/** Where the glow sits, as fractions of the viewport: around the protagonist object. */
export interface StarfieldFocus {
  x: number
  y: number
}

interface StarfieldProps {
  /** The top bar switch: true draws one still frame. */
  still: boolean
  /** Centre of the localised glow (fractions of the viewport). Default: right of centre. */
  focus?: StarfieldFocus
}

// The backdrop of every phase: three star layers with different slow drifts, a
// faint horizon arc at the bottom and a glow local to the protagonist object
// (--glow-accent, --glow-radius), not a uniform halo. It carries no information,
// so it is hidden from assistive technology. It stands still when motion is
// reduced (system setting or top bar switch), and it pauses while the page is
// hidden. One canvas, pixel ratio capped at 2.
export default function Starfield({ still: switchedOff, focus = { x: 0.72, y: 0.46 } }: StarfieldProps) {
  // The OS setting is followed live: the sky stops or resumes when it changes.
  const still = !useMotionAllowed(switchedOff)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    // The star colour is the text token, so the theme decides it.
    const starColor =
      getComputedStyle(canvas).getPropertyValue('--color-text').trim() || '#f2f1e9'
    let elapsed = 0
    let last = 0
    let animation = 0

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(window.innerWidth * ratio)
      canvas.height = Math.floor(window.innerHeight * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      if (still) draw()
    }

    const draw = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      context.clearRect(0, 0, width, height)
      context.fillStyle = starColor
      LAYERS.forEach((layer, index) => {
        const offset = still ? 0 : elapsed * layer.drift
        for (const star of STARS[index]) {
          const x = (((star.x * width + offset) % width) + width) % width
          const wave = still ? 0 : Math.sin(elapsed * 1.2 + star.phase)
          context.globalAlpha = layer.alpha * (1 - layer.twinkle * 0.5 + layer.twinkle * 0.5 * wave)
          context.beginPath()
          context.arc(x, star.y * height, star.radius, 0, Math.PI * 2)
          context.fill()
        }
      })
      // The horizon: a wide, faint arc below the lower edge of the stage.
      context.globalAlpha = 0.3
      context.strokeStyle = starColor
      context.lineWidth = 1
      context.beginPath()
      context.ellipse(width / 2, height * 1.9, width * 0.95, height * 1.0, 0, Math.PI * 1.1, Math.PI * 1.9)
      context.stroke()
      context.globalAlpha = 1
    }

    const loop = (now: number) => {
      elapsed += Math.min((now - last) / 1000, 0.1)
      last = now
      draw()
      animation = window.requestAnimationFrame(loop)
    }

    const start = () => {
      if (animation || still) return
      last = performance.now()
      animation = window.requestAnimationFrame(loop)
    }
    const stop = () => {
      window.cancelAnimationFrame(animation)
      animation = 0
    }
    const onVisibility = () => (document.hidden ? stop() : start())

    resize()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    if (still) draw()
    else if (!document.hidden) start()

    return () => {
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
    }
  }, [still])

  return (
    <div className="cinema" aria-hidden="true">
      <canvas ref={canvasRef} className="cinema__stars" />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle var(--glow-radius) at ${focus.x * 100}% ${focus.y * 100}%, var(--glow-accent), transparent)`,
        }}
      />
      <div className="cinema__vignette" />
    </div>
  )
}
