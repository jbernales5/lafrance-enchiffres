/** Soft blurred color fields behind the landing hero, built from the series tokens so light and dark stay coherent. */
export function LandingBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[780px] overflow-hidden"
    >
      <div className="absolute -top-40 left-[-10%] size-[620px] rounded-full bg-[radial-gradient(closest-side,var(--series-2),transparent)] opacity-25 blur-3xl dark:opacity-30" />
      <div className="absolute top-[-120px] right-[-8%] size-[560px] rounded-full bg-[radial-gradient(closest-side,var(--series-1),transparent)] opacity-20 blur-3xl dark:opacity-25" />
      <div className="absolute top-[260px] left-[35%] size-[520px] rounded-full bg-[radial-gradient(closest-side,var(--series-3),transparent)] opacity-15 blur-3xl dark:opacity-20" />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-background" />
    </div>
  )
}
