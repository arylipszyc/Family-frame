import { useState, useCallback, useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { useInterval } from '../hooks/useInterval'
import type { Photo } from '../types/Photo'

const FADE_MS = 1250
const HOLD_MS = 300
const DEFAULT_INTERVAL_MS = 30_000
const SWIPE_THRESHOLD_PX = 50

type Phase = 'idle' | 'fade-out' | 'hold' | 'fade-in'

interface PhotoSlideProps {
  photos: Photo[]
  intervalMs?: number
}

function toDisplayUrl(localPath: string): string {
  const cap = (window as Window & { Capacitor?: { convertFileSrc: (p: string) => string } }).Capacitor
  if (cap?.convertFileSrc) {
    return cap.convertFileSrc(localPath)
  }
  return localPath
}

export function PhotoSlide({ photos, intervalMs = DEFAULT_INTERVAL_MS }: PhotoSlideProps) {
  const [curIdx, setCurIdx] = useState(0)
  const [nextIdx, setNextIdx] = useState(photos.length > 1 ? 1 : 0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [errored, setErrored] = useState<Set<number>>(new Set())
  // Cambia en cada swipe manual → reinicia el timer de auto-rotación (useInterval).
  const [cycleKey, setCycleKey] = useState(0)
  const pointerStartXRef = useRef<number | null>(null)

  // Sync refs — phaseRef is the same-tick guard against reentrancy
  const phaseRef = useRef<Phase>('idle')
  const curIdxRef = useRef(curIdx)
  const nextIdxRef = useRef(nextIdx)
  const erroredRef = useRef(errored)
  const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const mountedRef = useRef(true)

  curIdxRef.current = curIdx
  nextIdxRef.current = nextIdx
  erroredRef.current = errored

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      timeoutsRef.current.forEach(clearTimeout)
      timeoutsRef.current = []
    }
  }, [])

  // Reset transition state when photos array identity or length changes.
  // Also clear errored set — paths cacheados pueden volverse válidos tras un sync
  // (cache reescrita, convertFileSrc reinicializado). Sin reset, índices muertos
  // quedan permanentes y eventualmente todas las fotos pueden marcarse errored.
  useEffect(() => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
    phaseRef.current = 'idle'
    setPhase('idle')
    setErrored(new Set())
  }, [photos])

  const getNextIdx = useCallback((from: number, errSet: Set<number>): number => {
    if (photos.length <= 1) return 0
    let idx = (from + 1) % photos.length
    let attempts = 0
    while (errSet.has(idx) && attempts < photos.length) {
      idx = (idx + 1) % photos.length
      attempts++
    }
    return attempts >= photos.length ? from : idx
  }, [photos.length])

  const getPrevIdx = useCallback((from: number, errSet: Set<number>): number => {
    if (photos.length <= 1) return 0
    let idx = (from - 1 + photos.length) % photos.length
    let attempts = 0
    while (errSet.has(idx) && attempts < photos.length) {
      idx = (idx - 1 + photos.length) % photos.length
      attempts++
    }
    return attempts >= photos.length ? from : idx
  }, [photos.length])

  const schedule = useCallback((fn: () => void, ms: number): void => {
    const id = setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter(t => t !== id)
      if (!mountedRef.current) return
      fn()
    }, ms)
    timeoutsRef.current.push(id)
  }, [])

  // Corre la máquina fade-out → hold → fade-in hacia `incoming`. El bottom layer
  // (target del fade-in) se fija a `incoming` al inicio para soportar ambas direcciones.
  const runTransition = useCallback((incoming: number) => {
    setNextIdx(incoming)
    nextIdxRef.current = incoming

    phaseRef.current = 'fade-out'
    setPhase('fade-out')

    schedule(() => {
      phaseRef.current = 'hold'
      setPhase('hold')
    }, FADE_MS)

    schedule(() => {
      phaseRef.current = 'fade-in'
      setPhase('fade-in')
    }, FADE_MS + HOLD_MS)

    schedule(() => {
      setCurIdx(incoming)
      setNextIdx(getNextIdx(incoming, erroredRef.current))
      phaseRef.current = 'idle'
      setPhase('idle')
    }, FADE_MS + HOLD_MS + FADE_MS)
  }, [getNextIdx, schedule])

  const advance = useCallback(() => {
    if (phaseRef.current !== 'idle') return
    if (photos.length < 2) return

    const incoming = getNextIdx(curIdxRef.current, erroredRef.current)
    if (incoming === curIdxRef.current) return
    runTransition(incoming)
  }, [photos.length, getNextIdx, runTransition])

  // Navegación manual por swipe. Reinicia el timer (cycleKey) para que no salte enseguida.
  const manualNav = useCallback((dir: 'next' | 'prev') => {
    if (phaseRef.current !== 'idle') return
    if (photos.length < 2) return

    const current = curIdxRef.current
    const incoming = dir === 'next'
      ? getNextIdx(current, erroredRef.current)
      : getPrevIdx(current, erroredRef.current)
    if (incoming === current) return

    setCycleKey(k => k + 1)
    runTransition(incoming)
  }, [photos.length, getNextIdx, getPrevIdx, runTransition])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointerStartXRef.current = e.clientX
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* jsdom / no-op */ }
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const startX = pointerStartXRef.current
    pointerStartXRef.current = null
    if (startX === null) return
    const dx = e.clientX - startX
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return
    manualNav(dx < 0 ? 'next' : 'prev')  // swipe izquierda (dx<0) → siguiente
  }, [manualNav])

  useInterval(advance, photos.length > 1 ? intervalMs : null, cycleKey)

  // Empty state — escapes PhotoZone via position: fixed so the message is
  // centered on the viewport (split visually collapses while photos load).
  if (photos.length === 0) {
    return (
      <div style={emptyContainerStyle}>
        <p style={emptyTextStyle}>Preparando tus fotos...</p>
      </div>
    )
  }

  const safeCurrentIdx = Math.min(curIdx, photos.length - 1)
  const safeNextIdx = Math.min(nextIdx, photos.length - 1)
  const currentErrored = errored.has(safeCurrentIdx)
  const nextErrored = errored.has(safeNextIdx)

  // Fallback: si la foto current errea, buscamos cualquier índice no-errored
  // para no dejar la zona en negro. La actual implementación de getNextIdx solo
  // corre en advance; este lookup es para el render inmediato.
  let displayIdx = safeCurrentIdx
  if (currentErrored && photos.length > 0) {
    for (let i = 0; i < photos.length; i++) {
      if (!errored.has(i)) { displayIdx = i; break }
    }
  }
  const showFallback = currentErrored && errored.size >= photos.length

  const topOpacity = phase === 'idle' ? 1 : 0
  const bottomOpacity = phase === 'fade-in' ? 1 : 0

  if (showFallback) {
    return (
      <div style={emptyContainerStyle}>
        <p style={emptyTextStyle}>Preparando tus fotos...</p>
      </div>
    )
  }

  return (
    <div style={containerStyle} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
      {!nextErrored && (
        <img
          key={`bottom-${safeNextIdx}`}
          src={toDisplayUrl(photos[safeNextIdx].localPath)}
          style={{
            ...imgBaseStyle,
            zIndex: 1,
            opacity: bottomOpacity,
            transition: `opacity ${FADE_MS}ms ease-in-out`,
          }}
          alt=""
          onError={() => setErrored(prev => new Set([...prev, nextIdxRef.current]))}
        />
      )}
      <img
        key={`top-${displayIdx}`}
        src={toDisplayUrl(photos[displayIdx].localPath)}
        style={{
          ...imgBaseStyle,
          zIndex: 2,
          opacity: topOpacity,
          transition: `opacity ${FADE_MS}ms ease-in-out`,
        }}
        alt=""
        onError={() => setErrored(prev => new Set([...prev, displayIdx]))}
      />
    </div>
  )
}

const containerStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
  // El WebView no debe interpretar el arrastre horizontal como scroll/gesto:
  // sin esto dispara pointercancel en vez de pointerup y el swipe nunca se detecta.
  touchAction: 'none',
}

const emptyContainerStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const emptyTextStyle: CSSProperties = {
  color: '#F5F0E8',
  opacity: 0.6,
  fontSize: '24px',
  fontFamily: 'Inter, sans-serif',
  fontWeight: 300,
}

const imgBaseStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  objectPosition: 'left center',
  filter: 'saturate(0.85) sepia(0.08)',
}

