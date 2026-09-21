/**
 * Insère un bloc schema.org. Le contenu vient toujours du catalogue, jamais d'une saisie :
 * `JSON.stringify` suffit donc à le rendre sûr, et le `<` évite qu'une chaîne contenant
 * `</script>` ne ferme la balise.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}
