import {
  IconBuildingBank,
  IconChartDots,
  IconHome,
  IconLeaf,
  IconSchool,
  IconScale,
  IconShieldHalf,
  IconShield,
  IconTrendingUp,
  IconUsers,
  type Icon,
} from "@tabler/icons-react"

/** One icon per theme, keyed by category slug. */
const ICONS: Record<string, Icon> = {
  "finances-publiques": IconBuildingBank,
  productivite: IconTrendingUp,
  climat: IconLeaf,
  demographie: IconUsers,
  defense: IconShield,
  education: IconSchool,
  logement: IconHome,
  "cohesion-sociale": IconScale,
  securite: IconShieldHalf,
}

export function categoryIcon(slug: string): Icon {
  return ICONS[slug] ?? IconChartDots
}
