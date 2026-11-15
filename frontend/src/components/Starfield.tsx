import { useEffect, useRef } from 'react'
import { useMotionAllowed } from '../motion/motion'

interface Star {
  x: number
  y: number
  radius: number
  speed: number
  phase: number
}

// A fixed set of stars from a small seeded generator, so the sky is the same on
// every visit and in every screenshot.
function makeStars(count: number): Star[] {
  let seed = 7
  const next = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  return Array.from({ length: count }, () => ({
    x: next(),
    y: next(),
    radius: 0.3 + next() * 1.1,
    speed: 0.002 + next() * 0.006,
    phase: next() * Math.PI * 2,
  }))
}

const STARS = makeStars(180)

// The backdrop of every phase: a slow drifting starfield, a cold glow and a
// vignette. It carries no information, so it is hidden from assistive technology,
// and it stands still when motion is reduced (the system setting or the toggle
// in the top bar).
export default function Starfield({ still: switchedOff }: { still: boolean }) {
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
    let frame = 0
    let animation = 0

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(window.innerWidth * ratio)
      canvas.height = Math.floor(window.innerHeight * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    const draw = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      context.clearRect(0, 0, width, height)
      for (const star of STARS) {
        const drift = still ? 0 : frame * star.speed
        const x = ((star.x + drift * 0.01) % 1) * width
        const twinkle = still ? 0.7 : 0.55 + 0.45 * Math.sin(frame * 0.02 + star.phase)
        context.globalAlpha = twinkle
        context.beginPath()
        context.arc(x, star.y * height, star.radius, 0, Math.PI * 2)
        context.fillStyle = starColor
        context.fill()
      }
      context.globalAlpha = 1
    }

    const loop = () => {
      frame += 1
      draw()
      animation = window.requestAnimationFrame(loop)
    }

    resize()
    window.addEventListener('resize', resize)
    if (still) draw()
    else animation = window.requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', resize)
      window.cancelAnimationFrame(animation)
    }
  }, [still])

  return (
    <div className="cinema" aria-hidden="true">
      <canvas ref={canvasRef} className="cinema__stars" />
      <div className="cinema__glow" />
      <div className="cinema__vignette" />
    </div>
  )
}
