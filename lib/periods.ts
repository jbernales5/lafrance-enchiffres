export type Frequency = "annual" | "quarterly" | "monthly"

/** Detects the frequency from a period string: "2024", "2024-Q1", "2024-03". */
export function frequencyOf(period: string): Frequency {
  if (/^\d{4}-Q[1-4]$/.test(period)) return "quarterly"
  if (/^\d{4}-\d{2}$/.test(period)) return "monthly"
  return "annual"
}

export function yearOf(period: string): number {
  return Number(period.slice(0, 4))
}

/** True when the period opens a year (Q1, January, or any annual period). */
export function isYearStart(period: string): boolean {
  return period.length === 4 || period.endsWith("-Q1") || period.endsWith("-01")
}

const MONTHS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
]

/** Human label: "2024", "T1 2024", "mars 2024". */
export function formatPeriod(period: string): string {
  const f = frequencyOf(period)
  if (f === "quarterly") return `T${period.slice(6)} ${period.slice(0, 4)}`
  if (f === "monthly")
    return `${MONTHS[Number(period.slice(5, 7)) - 1]} ${period.slice(0, 4)}`
  return period
}

/** Period string for a given year at the given frequency (the start of that year). */
export function periodForYear(year: number, frequency: Frequency): string {
  if (frequency === "quarterly") return `${year}-Q1`
  if (frequency === "monthly") return `${year}-01`
  return String(year)
}
