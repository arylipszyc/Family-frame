import { useState, useCallback, useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { useInterval } from '../hooks/useInterval'
import type { Photo } from '../types/Photo'

const CROSSFADE_MS = 2500
const DEFAULT_INTERVAL_MS = 30_000

interface PhotoSlideProps {
  photos: Photo[]
  intervalMs?: number
}

// Convert raw filesystem path to a URL loadable by Capacitor WebView.
// In browser/dev, falls back to the raw path (supports http URLs for testing).
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
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [errored, setErrored] = useState<Set<number>>(new Set())

  // Refs for use inside callbacks to avoid stale closures
  const isTransitioningRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const curIdxRef = useRef(curIdx)
  const nextIdxRef = useRef(nextIdx)
  const erroredRef = useRef(errored)

  curIdxRef.current = curIdx
  nextIdxRef.current = nextIdx
  erroredRef.current = errored

  // Cleanup pending timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const getNextIdx = useCallback((from: number, errSet: Set<number>): number => {
    if (photos.length <= 1) return 0
    let idx = (from + 1) % photos.length
    let attempts = 0
    while (errSet.has(idx) && attempts < photos.length) {
      idx = (idx + 1) % photos.length
      attempts++
    }
    // All photos errored — stay on current
    return attempts >= photos.length ? from : idx
  }, [photos.length])

  const advance = useCallback(() => {
    if (photos.length < 2) return
    if (isTransitioningRef.current) return  // guard: prevent double-advance

    const current = curIdxRef.current
    const incoming = getNextIdx(current, erroredRef.current)
    if (incoming === current) return  // all photos errored

    isTransitioningRef.current = true
    setIsTransitioning(true)

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      const newNext = getNextIdx(incoming, erroredRef.current)
      setCurIdx(incoming)
      setNextIdx(newNext)
      setIsTransitioning(false)
      isTransitioningRef.current = false
      timeoutRef.current = null
    }, CROSSFADE_MS)
  }, [photos.length, getNextIdx])

  useInterval(advance, photos.length > 1 ? intervalMs : null)

  // Empty state — AC5
  if (photos.length === 0) {
    return (
      <div style={emptyContainerStyle}>
        <p style={emptyTextStyle}>Preparando tus fotos...</p>
      </div>
    )
  }

  // Clamp indices to current array bounds (handles photos array shrinking)
  const safeCurrentIdx = Math.min(curIdx, photos.length - 1)
  const safeNextIdx = Math.min(nextIdx, photos.length - 1)

  const currentErrored = errored.has(safeCurrentIdx)
  const nextErrored = errored.has(safeNextIdx)

  return (
    <div style={containerStyle}>
      {/* Bottom layer — incoming photo (preloaded behind top layer) */}
      {!nextErrored && (
        <img
          src={toDisplayUrl(photos[safeNextIdx].localPath)}
          style={{ ...imgBaseStyle, zIndex: 1, opacity: 1 }}
          alt=""
          onError={() => setErrored(prev => new Set([...prev, nextIdxRef.current]))}
        />
      )}
      {/* Top layer — current photo, fades out to reveal bottom */}
      {!currentErrored && (
        <img
          src={toDisplayUrl(photos[safeCurrentIdx].localPath)}
          style={{
            ...imgBaseStyle,
            zIndex: 2,
            opacity: isTransitioning ? 0 : 1,
            transition: isTransitioning ? `opacity ${CROSSFADE_MS}ms ease-in-out` : 'none',
          }}
          alt=""
          onError={() => setErrored(prev => new Set([...prev, curIdxRef.current]))}
        />
      )}
      {/* Linen paper overlay — frame-paper token: rgba(245,235,210,0.06) */}
      <div style={overlayStyle} />
    </div>
  )
}

const containerStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  overflow: 'hidden',
  backgroundColor: '#1A1210',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
}

const emptyContainerStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  backgroundColor: '#1A1210',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
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
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  filter: 'saturate(0.85) brightness(0.95) sepia(0.08)',
}

const overlayStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  backgroundColor: 'rgba(245, 235, 210, 0.06)',
  zIndex: 3,
  pointerEvents: 'none',
}
