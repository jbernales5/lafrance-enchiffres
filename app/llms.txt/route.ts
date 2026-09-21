import { effectiveLicense, loadCategories } from "@/lib/catalog"
import { SITE_NAME, SITE_URL } from "@/lib/site"

export const dynamic = "force-static"

/**
 * Index en texte brut à destination des agents et des moteurs conversationnels : ce que contient
 * le site, où trouver chaque série, et sous quelle licence la réutiliser. Généré depuis le
 * catalogue, donc toujours à jour.
 */
export function GET() {
  const categories = loadCategories()
  const lines: (string | null)[] = [
    `# ${SITE_NAME}`,
    "",
    "> Tableau de bord de statistiques publiques françaises. Chaque graphe vient d'une source primaire, avec la requête exacte qui l'a produit, son unité, sa licence et sa date de récupération. Aucune valeur n'est saisie à la main.",
    "",
    "Les choix de thèmes, d'indicateurs, de pays de comparaison et de périodes sont arbitraires et assumés comme tels ; la chaîne qui va du producteur au graphe, elle, est automatisée et vérifiable. Le projet n'est pas une démarche scientifique : c'est un travail de mise en forme, entièrement ouvert.",
    "",
    "## Comment récupérer les données",
    "",
    "Chaque série est un CSV à trois colonnes `period,series,value`, servi à l'adresse indiquée ci-dessous. Le fichier téléchargé porte en tête son producteur, sa requête d'origine, son unité, sa licence et l'attribution demandée. Les métadonnées complètes sont dans le dépôt, sous `data/series/<thème>/<graphe>.meta.json`.",
    "",
    `- Dépôt : https://github.com/jbernales5/lafrance-enchiffres`,
    `- Licences des données : https://github.com/jbernales5/lafrance-enchiffres/blob/main/DATA-LICENSE.md`,
    `- Méthode : ${SITE_URL}/methode`,
    "",
  ]

  for (const cat of categories) {
    lines.push(
      `## ${cat.title}`,
      "",
      `${SITE_URL}/${cat.slug}`,
      "",
      cat.lead,
      ""
    )
    for (const chart of cat.charts) {
      if (chart.status !== "ready" || !chart.meta) continue
      const meta = chart.meta
      const { license } = effectiveLicense(meta.source)
      const periods = chart.rows.map((r) => r.period).sort()
      const span =
        periods.length > 0
          ? `${periods[0].slice(0, 4)}–${periods[periods.length - 1].slice(0, 4)}`
          : ""
      lines.push(
        `- **${chart.title}** — ${chart.subtitle ?? ""}`.trimEnd(),
        `  - Page : ${SITE_URL}/${cat.slug}#${chart.id}`,
        `  - Données (CSV) : ${SITE_URL}/series/${chart.file}`,
        `  - Producteur : ${meta.source.upstream ?? meta.source.publisher}${meta.source.upstream ? `, republié par ${meta.source.publisher}` : ""}`,
        `  - Unité : ${meta.unit} · Période : ${span} · Dernière observation : ${meta.lastObservation}`,
        license ? `  - Licence : ${license.name}` : ""
      )
    }
    lines.push("")
  }

  // On ne retire que les lignes conditionnelles absentes : les lignes vides structurent le texte.
  return new Response(lines.filter((l) => l !== null).join("\n") + "\n", {
    headers: { "content-type": "text/plain; charset=utf-8" },
  })
}
