// Minimal .xlsx reader (no dependencies): ZIP (stored/deflate) + SpreadsheetML.
// Several official French sources (DREES, ministère de l'Intérieur, Insee « Données » des figures)
// only publish their long series as .xlsx, so the fetch scripts read them here rather than by hand.
// Not a general-purpose implementation: no zip64, no styles, no date conversion — numbers and strings only.
import { inflateRawSync } from "node:zlib"

/** Minimal ZIP reader (stored + deflate), from a Buffer. Returns Map<name, Buffer>. */
export function unzip(buf) {
  const files = new Map()
  // locate End Of Central Directory
  let eocd = -1
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 22 - 65536; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error("zip: EOCD not found")
  let n = buf.readUInt16LE(eocd + 10)
  let off = buf.readUInt32LE(eocd + 16)
  if (off === 0xffffffff) throw new Error("zip64 not supported")
  for (let i = 0; i < n; i++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error("zip: bad central header")
    const method = buf.readUInt16LE(off + 10)
    const csize = buf.readUInt32LE(off + 20)
    const nameLen = buf.readUInt16LE(off + 28)
    const extraLen = buf.readUInt16LE(off + 30)
    const cmtLen = buf.readUInt16LE(off + 32)
    const lho = buf.readUInt32LE(off + 42)
    const name = buf.toString("utf8", off + 46, off + 46 + nameLen)
    const lNameLen = buf.readUInt16LE(lho + 26)
    const lExtraLen = buf.readUInt16LE(lho + 28)
    const start = lho + 30 + lNameLen + lExtraLen
    const raw = buf.subarray(start, start + csize)
    files.set(name, method === 0 ? Buffer.from(raw) : inflateRawSync(raw))
    off += 46 + nameLen + extraLen + cmtLen
  }
  return files
}

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }
const dec = (s) => s.replace(/&(amp|lt|gt|quot|apos|#x?\d*[0-9a-fA-F]*);/g, (m, e) =>
  ENT[e] ?? (e[0] === "#" ? String.fromCodePoint(Number(e[1] === "x" ? "0x" + e.slice(2) : e.slice(1))) : m))

function sharedStrings(files) {
  const xml = files.get("xl/sharedStrings.xml")?.toString("utf8")
  if (!xml) return []
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => dec(t[1])).join(""))
}

const colNum = (ref) => { let c = 0; for (const ch of ref.replace(/\d+/g, "")) c = c * 26 + (ch.charCodeAt(0) - 64); return c - 1 }

/** Reads an .xlsx buffer -> { sheetNames, sheet(name) -> rows of cell values (string|number|null). */
export function readXlsx(buf) {
  const files = unzip(buf)
  const ss = sharedStrings(files)
  const wb = files.get("xl/workbook.xml").toString("utf8")
  const rels = files.get("xl/_rels/workbook.xml.rels").toString("utf8")
  const relMap = new Map([...rels.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)]
    .map(([, id, t]) => [id, t.startsWith("/") ? t.slice(1) : "xl/" + t.replace(/^\.\//, "")]))
  const sheets = [...wb.matchAll(/<sheet[^>]*\/>/g)].map((m) => ({
    name: dec(/name="([^"]*)"/.exec(m[0])[1]),
    path: relMap.get(/r:id="([^"]*)"/.exec(m[0])[1]),
  }))
  const sheet = (name) => {
    const s = sheets.find((x) => x.name === name)
    if (!s) throw new Error(`sheet "${name}" not found (have: ${sheets.map((x) => x.name).join(", ")})`)
    const xml = files.get(s.path).toString("utf8")
    const out = []
    for (const rm of xml.matchAll(/<row\s([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const rowNum = Number(/\br="(\d+)"/.exec(rm[1])[1])
      const row = []
      for (const cm of (rm[2] ?? "").matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = cm[1]
        const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1]
        const t = /t="([^"]*)"/.exec(attrs)?.[1]
        const body = cm[2] ?? ""
        let v = null
        if (t === "inlineStr") v = [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => dec(x[1])).join("")
        else {
          const vm = /<v>([\s\S]*?)<\/v>/.exec(body)
          if (vm) v = t === "s" ? ss[Number(vm[1])] : t === "str" ? dec(vm[1]) : Number(vm[1])
        }
        row[ref ? colNum(ref) : row.length] = v
      }
      out[rowNum - 1] = row
    }
    return [...out].map((r) => r ?? [])
  }
  return { sheetNames: sheets.map((s) => s.name), sheet }
}
