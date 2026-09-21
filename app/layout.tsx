import type { Metadata } from "next"
import { JetBrains_Mono, Roboto } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { MarkersProvider } from "@/components/charts/markers-context"
import { cn } from "@/lib/utils"
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site"

const fontHeading = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-heading",
})

const fontSans = Roboto({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  keywords: ["Statistiques", "Données", "Data", "France", "Bilan", "Président"],
  authors: [
    { name: "Jonathan Bernales", url: "https://github.com/jbernales5" },
  ],
  openGraph: {
    type: "website",
    siteName: "LaFranceEnChiffres.fr",
    title: "LaFranceEnChiffres.fr",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [
      {
        url: "/images/og.jpg",
        width: 1200,
        height: 671,
        alt: "La France en chiffres : des données pour mieux comprendre la France d'aujourd'hui",
      },
    ],
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "LaFranceEnChiffres.fr",
    description: SITE_DESCRIPTION,
    images: ["/images/og.jpg"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        "font-sans",
        fontSans.variable,
        fontHeading.variable
      )}
    >
      <body>
        <ThemeProvider>
          <MarkersProvider>{children}</MarkersProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
