/**
 * Champs de couleur diffus derrière une page, sur le modèle de l'accueil. Sans `accent`, la
 * teinte reste celle du site ; avec, c'est celle du thème, pour qu'une page de thème se
 * reconnaisse à sa couleur comme sa bande sur l'accueil.
 */
export function PageBackdrop({ accent }: { accent?: string }) {
  const tint = accent ? `var(${accent})` : "var(--series-2)"

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] overflow-hidden"
      style={{ ["--tint" as string]: tint }}
    >
      <div className="absolute -top-48 left-[-12%] size-[560px] rounded-full bg-[radial-gradient(closest-side,var(--tint),transparent)] opacity-20 blur-3xl dark:opacity-25" />
      <div className="absolute top-[-140px] right-[-10%] size-[480px] rounded-full bg-[radial-gradient(closest-side,var(--tint),transparent)] opacity-12 blur-3xl dark:opacity-18" />
      <div className="absolute top-[180px] left-[30%] size-[420px] rounded-full bg-[radial-gradient(closest-side,var(--series-ref),transparent)] opacity-8 blur-3xl dark:opacity-12" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent to-background" />
    </div>
  )
}
