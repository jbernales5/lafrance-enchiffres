"use client"

import * as React from "react"

/**
 * Renders `children` only once the wrapper comes within `rootMargin` of the viewport.
 * Until then a same-height placeholder keeps the layout stable. `eager` skips the wait
 * (for above-the-fold content that should be server-rendered).
 */
export function LazyMount({
  children,
  eager = false,
  rootMargin = "400px 0px",
  className,
}: {
  children: React.ReactNode
  eager?: boolean
  rootMargin?: string
  className?: string
}) {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = React.useState(eager)

  React.useEffect(() => {
    if (visible) return
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible, rootMargin])

  return (
    <div ref={ref} className={className}>
      {visible ? (
        children
      ) : (
        <div
          aria-hidden
          className="h-full w-full animate-pulse rounded-2xl bg-muted/60"
        />
      )}
    </div>
  )
}
