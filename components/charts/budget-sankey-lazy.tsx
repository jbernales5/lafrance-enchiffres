"use client"

import dynamic from "next/dynamic"

import { ChartSkeleton } from "@/components/charts/chart-skeleton"

export const BudgetSankeyLazy = dynamic(
  () => import("@/components/charts/budget-sankey").then((m) => m.BudgetSankey),
  {
    ssr: false,
    loading: () => (
      <ChartSkeleton className="aspect-auto h-[420px] w-full animate-pulse rounded-2xl bg-muted/60 sm:h-[480px]" />
    ),
  }
)
