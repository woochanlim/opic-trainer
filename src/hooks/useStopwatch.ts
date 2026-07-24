import { useState, useRef, useEffect } from 'react'

export function useStopwatch(running: boolean) {
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed((t) => t + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  const reset = () => setElapsed(0)
  const format = () => `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`

  return { elapsed, reset, format }
}
