"use client"

import { useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PortfolioData } from "@/types/portfolio"
import { createSingleStrategyCharts } from "@/lib/chart-creators"

interface SingleStrategiesTabProps {
  portfolioData: PortfolioData
}

export function SingleStrategiesTab({ portfolioData }: SingleStrategiesTabProps) {
  const strategiesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (portfolioData && strategiesContainerRef.current) {
      createSingleStrategyCharts(strategiesContainerRef.current, portfolioData)
    }

    // Cleanup function to destroy charts when component unmounts
    return () => {
      if (strategiesContainerRef.current) {
        strategiesContainerRef.current.innerHTML = ""
      }
    }
  }, [portfolioData])

  if (!portfolioData) {
    return <div>No data available</div>
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Equity Curves of Single Strategies</CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={strategiesContainerRef} className="grid grid-cols-1 md:grid-cols-2 gap-6"></div>
        </CardContent>
      </Card>
    </div>
  )
}
