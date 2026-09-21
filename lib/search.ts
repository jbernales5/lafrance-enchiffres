import "server-only"

import { loadCategories, type LoadedCategory } from "@/lib/catalog"
import { normalize, type SearchEntry } from "@/lib/search-match"

const STOP_WORDS = new Set(
  "a au aux avec ce ces dans de des du elle en et eux il je la le les leur lui ma mais me meme mes moi mon ne nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre vous c d j l m n s t y ete etee etees etes etant sont est".split(
    " "
  )
)

/**
 * Words the entry should also match on. Duplicates and stop words are dropped so the index
 * stays small: it is serialized into every page that renders the header.
 */
function termsOf(parts: (string | undefined)[], already: string): string {
  const seen = new Set(normalize(already).split(" "))
  const out: string[] = []
  for (const word of normalize(parts.filter(Boolean).join(" ")).split(" ")) {
    if (!word || word.length < 3 || STOP_WORDS.has(word) || seen.has(word))
      continue
    seen.add(word)
    out.push(word)
  }
  return out.join(" ")
}

/**
 * Mots que les gens tapent et qui ne figurent dans aucun titre : « prison » pour la population
 * carcérale, « immobilier » pour le logement. Les clés de THEME_ALIASES sont des slugs de thème
 * et profitent à tous ses graphes ; celles de CHART_ALIASES sont « thème/graphe ». Une clé qui ne
 * correspond à rien fait échouer le build, pour qu'elles ne pourrissent pas en silence.
 */
const THEME_ALIASES: Record<string, string> = {
  "finances-publiques": "budget etat impot taxe fiscalite depense publique",
  productivite: "croissance richesse emploi travail entreprise",
  climat:
    "rechauffement climatique carbone emission ges environnement ecologie",
  demographie: "population natalite vieillissement pension",
  defense: "armee militaire guerre souverainete",
  education: "ecole eleve enseignement scolaire etudiant",
  logement: "immobilier immo achat location bail loyer habitat",
  "cohesion-sociale": "inegalite riche pauvre redistribution solidarite",
  securite:
    "delinquance criminalite crime insecurite police gendarmerie justice",
}

const CHART_ALIASES: Record<string, string> = {
  "securite/prisons": "prison detention detenu ecroue surpopulation carceral",
  "securite/auteurs-victimes": "agresseur auteur plainte violence",
  "securite/delinquance": "criminalite crime insecurite",
  "securite/delinquance-europe": "criminalite crime insecurite",
  "securite/infractions-mensuelles": "criminalite crime insecurite conjoncture",
  "securite/homicides-couple": "feminicide conjugal meurtre",
  "securite/morts-routes": "accident route voiture",
  "finances-publiques/dette": "endettement emprunt maastricht",
  "finances-publiques/deficit": "solde budgetaire",
  "finances-publiques/interets": "charge taux emprunt",
  "finances-publiques/abstention": "election vote participation democratie",
  "cohesion-sociale/inflation": "prix vie chere pouvoir achat",
  "cohesion-sociale/smic": "salaire minimum",
  "cohesion-sociale/minima-sociaux": "rsa aah aspa ass allocation aide sociale",
  "cohesion-sociale/allocataires-cnaf": "caf allocation prime activite",
  "cohesion-sociale/pauvrete": "precarite seuil",
  "cohesion-sociale/gini": "inegalite concentration",
  "cohesion-sociale/ecart-salarial": "inegalite femme homme parite",
  "productivite/chomage": "emploi travail sans emploi demandeur",
  "productivite/industrie": "desindustrialisation usine manufacture",
  "productivite/creations": "entrepreneur creation societe",
  "productivite/defaillances": "faillite liquidation depot bilan",
  "productivite/recherche": "innovation rd developpement",
  "demographie/immigres": "immigration migrant etranger",
  "demographie/asile": "refugie demandeur asile immigration",
  "demographie/fecondite": "natalite bebe enfant naissance",
  "demographie/depenses-retraites": "pension systeme retraite",
  "demographie/cotisants-retraites":
    "pension systeme retraite rapport demographique",
  "demographie/age-retraite": "depart pension reforme",
  "education/pisa": "classement niveau eleve international",
  "education/salaires-enseignants": "professeur prof remuneration",
  "education/sorties-precoces": "decrochage abandon scolaire",
  "logement/prix-anciens": "prix vente achat metre carre immobilier",
  "logement/loyers": "loyer location bail",
  "logement/taux-effort": "cout charge budget menage",
  "logement/construction": "chantier permis construire batiment",
  "climat/temperature": "rechauffement canicule chaleur",
  "climat/secteurs": "ges methane transport agriculture industrie",
  "defense/depenses-pib": "armee budget militaire otan",
  "defense/effectifs": "armee soldat militaire",
  "defense/dependance-energetique": "energie gaz petrole souverainete",
}

function checkAliasKeys(categories: LoadedCategory[]) {
  const slugs = new Set(categories.map((c) => c.slug))
  const charts = new Set(
    categories.flatMap((c) => c.charts.map((ch) => `${c.slug}/${ch.id}`))
  )
  for (const key of Object.keys(THEME_ALIASES))
    if (!slugs.has(key))
      throw new Error(
        `search: THEME_ALIASES["${key}"] ne correspond à aucun thème`
      )
  for (const key of Object.keys(CHART_ALIASES))
    if (!charts.has(key))
      throw new Error(
        `search: CHART_ALIASES["${key}"] ne correspond à aucun graphe`
      )
}

/** Everything searchable, computed from the catalog so it can never drift from the pages. */
export function buildSearchIndex(
  categories: LoadedCategory[] = loadCategories()
): SearchEntry[] {
  checkAliasKeys(categories)
  const entries: SearchEntry[] = []

  for (const cat of categories) {
    entries.push({
      id: `theme-${cat.slug}`,
      kind: "theme",
      title: cat.title,
      hint: `${cat.charts.length} graphe${cat.charts.length > 1 ? "s" : ""}`,
      themeSlug: cat.slug,
      href: `/${cat.slug}`,
      terms: termsOf([cat.short, cat.lead, THEME_ALIASES[cat.slug]], cat.title),
    })

    for (const chart of cat.charts) {
      const labels = Object.values(chart.meta?.seriesLabels ?? {})
      const variants = chart.loadedVariants.flatMap((v) => [
        v.label,
        v.subtitle,
      ])
      const perspectives = Object.values(chart.perspectiveLabels ?? {})
      const title = chart.title
      const hint = chart.subtitle
      entries.push({
        id: `chart-${cat.slug}-${chart.id}`,
        kind: "chart",
        title,
        hint,
        theme: cat.short,
        themeSlug: cat.slug,
        href: `/${cat.slug}#${chart.id}`,
        terms: termsOf(
          [
            cat.short,
            cat.title,
            THEME_ALIASES[cat.slug],
            CHART_ALIASES[`${cat.slug}/${chart.id}`],
            chart.note,
            chart.meta?.unit,
            chart.meta?.source.publisher,
            chart.meta?.source.upstream,
            ...labels,
            ...variants,
            ...perspectives,
          ],
          `${title} ${hint ?? ""}`
        ),
      })
    }
  }

  for (const page of [
    {
      title: "Méthode",
      href: "/methode",
      hint: "Comment les données sont choisies, vérifiées et mises en perspective",
      terms:
        "faq questions frequentes comment ca fonctionne neutralite arbitraire sources primaires verification definitions repere mandat licence",
    },
    {
      title: "Contribuer",
      href: "/contribuer",
      hint: "Signaler une erreur, proposer un indicateur, déposer une série",
      terms: "participer github issue pull request proposition correction",
    },
    {
      title: "À propos",
      href: "/a-propos",
      hint: "Qui porte le projet, ce qu'il fait et ce qu'il ne fait pas",
      terms: "qui auteur projet pourquoi correction gouvernance",
    },
    {
      title: "Mentions légales",
      href: "/mentions-legales",
      hint: "Éditeur, hébergeur, données personnelles, licences",
      terms:
        "legal editeur hebergeur rgpd cookie confidentialite licence contact",
    },
  ]) {
    entries.push({
      id: `page-${page.href}`,
      kind: "page",
      title: page.title,
      hint: page.hint,
      href: page.href,
      terms: page.terms,
    })
  }

  return entries
}
