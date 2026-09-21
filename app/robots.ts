import type { MetadataRoute } from "next"

import { SITE_URL } from "@/lib/site"

/**
 * Tout est public et destiné à être repris : moteurs de recherche comme moteurs conversationnels
 * sont explicitement autorisés. Les données restent sous la licence de leurs producteurs, rappelée
 * dans DATA-LICENSE.md et en tête de chaque CSV téléchargé.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      // Nommés explicitement : plusieurs de ces robots n'appliquent la règle générique
      // qu'à défaut d'une règle à leur nom.
      {
        userAgent: [
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "ClaudeBot",
          "Claude-User",
          "Claude-SearchBot",
          "PerplexityBot",
          "Perplexity-User",
          "Google-Extended",
          "Applebot-Extended",
          "CCBot",
          "Bingbot",
        ],
        allow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
