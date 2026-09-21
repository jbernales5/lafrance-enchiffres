"use client"

import * as React from "react"

import type { MarkerSet } from "@/lib/mandates"

const STORAGE_KEY = "lfec.markers"

const MarkersContext = React.createContext<{
  set: MarkerSet
  setSet: (s: MarkerSet) => void
}>({
  set: "mandats",
  setSet: () => {},
})

/** One choice for the whole site: switching a chart to world events switches them all, and it is remembered. */
export function MarkersProvider({ children }: { children: React.ReactNode }) {
  const [set, setSetState] = React.useState<MarkerSet>("mandats")
  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved === "evenements" || saved === "mandats") setSetState(saved)
    } catch {
      // storage unavailable: default stays
    }
  }, [])
  const setSet = React.useCallback((s: MarkerSet) => {
    setSetState(s)
    try {
      window.localStorage.setItem(STORAGE_KEY, s)
    } catch {
      // ignore
    }
  }, [])
  return (
    <MarkersContext.Provider value={{ set, setSet }}>
      {children}
    </MarkersContext.Provider>
  )
}

export function useMarkerSet() {
  return React.useContext(MarkersContext)
}
