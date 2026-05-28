import { useEffect, useRef } from 'react'

// resetKey: cuando cambia, reinicia el intervalo (re-suscribe el setInterval).
// Opcional — sin pasarlo, el comportamiento es idéntico al original.
export function useInterval(callback: () => void, delay: number | null, resetKey?: unknown): void {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delay === null) return
    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay, resetKey])
}
