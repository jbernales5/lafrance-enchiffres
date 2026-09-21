"use client"

import * as React from "react"

/** Tracks the rendered width of an element (0 until mounted). */
export function useElementWidth<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null)
  const [width, setWidth] = React.useState(0)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(el.getBoundingClientRect().width)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, width }
}
