import { ImageResponse } from "next/og"

import { categorySlugs, loadCategory } from "@/lib/catalog"
import { formatFigure } from "@/lib/format"
import { formatPeriod } from "@/lib/periods"
import { SITE_NAME } from "@/lib/site"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Aperçu du thème"

export function generateStaticParams() {
  return categorySlugs().map((slug) => ({ slug }))
}

/**
 * Vignette de partage propre à chaque thème : son titre, son chiffre-clé et le nombre de graphes.
 * Sans elle, partager un thème affichait exactement la même image que la page d'accueil.
 * Les couleurs sont écrites en dur : cette image est rendue hors du navigateur, sans Tailwind.
 */
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const cat = loadCategory(slug)
  const figure = cat?.keyFigureValue

  return new ImageResponse(
    // Satori exige un `display` explicite sur tout élément à plusieurs enfants : chaque bloc
    // porte donc le sien, et chaque texte est une chaîne unique.
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0b0d10",
        color: "#f4f5f6",
        padding: 72,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: 26,
            color: "#8b949e",
            letterSpacing: 1,
          }}
        >
          {SITE_NAME.toUpperCase()}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 64,
            fontWeight: 600,
            lineHeight: 1.1,
          }}
        >
          {cat?.title ?? SITE_NAME}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontSize: 86,
            fontWeight: 700,
            color: "#4f8ef7",
          }}
        >
          {figure ? formatFigure(figure.value) : ""}
          <span style={{ marginLeft: 14, fontSize: 34, color: "#8b949e" }}>
            {figure?.unit ?? ""}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 8,
            fontSize: 28,
            color: "#8b949e",
          }}
        >
          {figure ? `${figure.label} · ${formatPeriod(figure.period)}` : ""}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 24,
          color: "#8b949e",
        }}
      >
        <span>{`${cat?.charts.length ?? 0} graphes · sources primaires citées`}</span>
        <span>lafrance.enchiffres.fr</span>
      </div>
    </div>,
    size
  )
}
