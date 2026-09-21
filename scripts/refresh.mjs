// Enchaîne les scripts de scripts/fetch/ (sources avec une API).
// Avec --manual, enchaîne ceux de scripts/manual/ : reconstruction depuis data/sources-manuelles/.
// La provenance de chaque série est dans DATASETS.md.
import { readdirSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const manual = process.argv.includes("--manual")
const dir = resolve(dirname(fileURLToPath(import.meta.url)), manual ? "manual" : "fetch")
const only = process.argv.slice(2).find((a) => !a.startsWith("--"))
const scripts = readdirSync(dir).filter((f) => f.endsWith(".mjs") && (!only || f.startsWith(only))).sort()
const failed = []
for (const script of scripts) {
  console.log(`\n▶ ${script}`)
  const res = spawnSync(process.execPath, [resolve(dir, script)], { stdio: "inherit" })
  if (res.status !== 0) failed.push(script)
}

if (failed.length) {
  console.error(`\n${failed.length} script(s) en échec : ${failed.join(", ")}`)
  console.error("Les rapports data/series/*-REPORT.md nomment les séries concernées.")
} else {
  console.log(manual ? "\nSources manuelles reconstruites." : "\nToutes les sources ont été rafraîchies.")
  console.log("Vérifier le contrat avant de committer : npm run validate")
}
process.exit(failed.length ? 1 : 0)
