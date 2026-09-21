export type SearchKind = "chart" | "theme" | "page"

export interface SearchEntry {
  id: string
  kind: SearchKind
  title: string
  /** One line under the title in the result list. */
  hint?: string
  /** Theme the entry belongs to, shown as a chip. */
  theme?: string
  themeSlug?: string
  href: string
  /** Extra words the entry should match on, beyond its title and hint. */
  terms: string
}

/** Lowercase, drop accents and punctuation: "Émissions de CO₂" -> "emissions de co2". */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[₀-₉]/g, (c) => String("₀₁₂₃₄₅₆₇₈₉".indexOf(c)))
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/** How much a field is worth: a hit in the title says more than a hit in the keywords. */
const WEIGHT = { title: 10, hint: 5, theme: 4, terms: 2 } as const

function scoreField(
  words: string[],
  haystack: string,
  token: string,
  weight: number
): number {
  if (!haystack) return 0
  for (const word of words) {
    if (word === token) return weight * 1.5
    if (word.startsWith(token)) return weight
  }
  return haystack.includes(token) ? weight * 0.4 : 0
}

export interface SearchHit {
  entry: SearchEntry
  score: number
}

/**
 * Every word of the query must appear somewhere in the entry — typing two words narrows the list
 * instead of widening it. Within that, hits are ranked by where they landed.
 */
export function searchEntries(
  index: SearchEntry[],
  query: string,
  limit = 24
): SearchHit[] {
  const q = normalize(query)
  if (!q) return []
  const tokens = q.split(" ").filter(Boolean)
  const hits: SearchHit[] = []

  for (const entry of index) {
    const title = normalize(entry.title)
    const hint = normalize(entry.hint ?? "")
    const theme = normalize(entry.theme ?? "")
    const fields = [
      [title.split(" "), title, WEIGHT.title],
      [hint.split(" "), hint, WEIGHT.hint],
      [theme.split(" "), theme, WEIGHT.theme],
      [entry.terms.split(" "), entry.terms, WEIGHT.terms],
    ] as const

    let score = 0
    let matchedAll = true
    for (const token of tokens) {
      let best = 0
      for (const [words, haystack, weight] of fields)
        best = Math.max(best, scoreField(words, haystack, token, weight))
      if (!best) {
        matchedAll = false
        break
      }
      score += best
    }
    if (!matchedAll) continue
    // A title that opens with the whole query is almost always the one being looked for.
    if (title.startsWith(q)) score += 8
    hits.push({ entry, score })
  }

  return hits
    .sort(
      (a, b) =>
        b.score - a.score || a.entry.title.localeCompare(b.entry.title, "fr")
    )
    .slice(0, limit)
}
