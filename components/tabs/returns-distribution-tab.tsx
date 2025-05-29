"use client"

import { useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PortfolioData } from "@/types/portfolio"
import { formatCurrency } from "@/lib/formatters"
import { createReturnsDistributionChart, createUsedMarginsChart } from "@/lib/chart-creators"

interface ReturnsDistributionTabProps {
  portfolioData: PortfolioData
  currency?: "USD" | "EUR"
}

export function ReturnsDistributionTab({ portfolioData, currency = "USD" }: ReturnsDistributionTabProps) {
  const returnsDistributionRef = useRef<HTMLDivElement>(null)
  const usedMarginsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (portfolioData && returnsDistributionRef.current && usedMarginsRef.current) {
      createReturnsDistributionChart(returnsDistributionRef.current, portfolioData, currency)
      createUsedMarginsChart(usedMarginsRef.current, portfolioData, currency)
    }

    // Cleanup function to destroy charts when component unmounts
    return () => {
      if (returnsDistributionRef.current) {
        returnsDistributionRef.current.innerHTML = ""
      }
      if (usedMarginsRef.current) {
        usedMarginsRef.current.innerHTML = ""
      }
    }
  }, [portfolioData, currency])

  if (!portfolioData) {
    return <div>No data available</div>
  }

  const { margins, statistics } = portfolioData

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Monthly Returns Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={returnsDistributionRef} className="h-[400px]"></div>
        </CardContent>
      </Card>

      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Used Margins</CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={usedMarginsRef} className="h-[400px]"></div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Margin Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {portfolioData.strategies.map((strategy, index) => (
                  <tr key={index} className={index % 2 === 0 ? "bg-gray-100 dark:bg-gray-800" : ""}>
                    <td className="px-4 py-2">Margin for {strategy.name}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(margins.strategyMargins[index], currency)}</td>
                  </tr>
                ))}

                <tr className="bg-gray-100 dark:bg-gray-800 font-medium">
                  <td className="px-4 py-2">Minimum Account Required</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(margins.minimumAccountRequired, currency)}</td>
                </tr>

                <tr>
                  <td className="px-4 py-2">Max Used Margin</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(margins.maxUsedMargin, currency)}</td>
                </tr>

                <tr className="bg-gray-100 dark:bg-gray-800">
                  <td className="px-4 py-2">Happened on</td>
                  <td className="px-4 py-2 text-right">{margins.maxUsedMarginOccurrences} different days</td>
                </tr>

                <tr>
                  <td className="px-4 py-2">First on</td>
                  <td className="px-4 py-2 text-right">{margins.maxUsedMarginFirstDate}</td>
                </tr>

                <tr className="bg-gray-100 dark:bg-gray-800 font-medium">
                  <td className="px-4 py-2">Real Minimum Account Req</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(statistics.realMinimumAccountReq, currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
