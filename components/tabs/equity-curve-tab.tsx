"use client"

import { useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PortfolioData } from "@/types/portfolio"
import { formatCurrency } from "@/lib/formatters"
import {
  createEquityCurveChart,
  createStrategiesEquityCurveChart,
  createDrawdownChart,
  createMonthlyReturnsTable,
  createCorrelationMatrix,
} from "@/lib/chart-creators"

interface EquityCurveTabProps {
  portfolioData: PortfolioData
  currency?: "USD" | "EUR"
}

export function EquityCurveTab({ portfolioData, currency = "USD" }: EquityCurveTabProps) {
  const equityChartRef = useRef<HTMLDivElement>(null)
  const strategiesChartRef = useRef<HTMLDivElement>(null)
  const drawdownChartRef = useRef<HTMLDivElement>(null)
  const monthlyReturnsRef = useRef<HTMLDivElement>(null)
  const correlationMatrixRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (
      portfolioData &&
      equityChartRef.current &&
      strategiesChartRef.current &&
      drawdownChartRef.current &&
      monthlyReturnsRef.current &&
      correlationMatrixRef.current
    ) {
      // Create charts using the chart creation functions
      createEquityCurveChart(equityChartRef.current, portfolioData, currency)
      createStrategiesEquityCurveChart(strategiesChartRef.current, portfolioData, currency)
      createDrawdownChart(drawdownChartRef.current, portfolioData, currency)
      createMonthlyReturnsTable(monthlyReturnsRef.current, portfolioData, currency)
      createCorrelationMatrix(correlationMatrixRef.current, portfolioData)
    }

    // Cleanup function to destroy charts when component unmounts
    return () => {
      if (equityChartRef.current) {
        equityChartRef.current.innerHTML = ""
      }
      if (strategiesChartRef.current) {
        strategiesChartRef.current.innerHTML = ""
      }
      if (drawdownChartRef.current) {
        drawdownChartRef.current.innerHTML = ""
      }
      if (correlationMatrixRef.current) {
        correlationMatrixRef.current.innerHTML = ""
      }
    }
  }, [portfolioData, currency])

  if (!portfolioData) {
    return <div>No data available</div>
  }

  const { statistics } = portfolioData

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="md:col-span-1 space-y-6">
        <div className="h-[500px]" ref={equityChartRef}></div>
        <div className="h-[500px]" ref={strategiesChartRef}></div>
        <div className="h-64" ref={drawdownChartRef}></div>
      </div>

      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                <tr className="bg-gray-100 dark:bg-gray-800 font-medium">
                  <td className="px-4 py-2">Net Profit/Max DD</td>
                  <td className="px-4 py-2 text-right">{statistics.netProfitMaxDD.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Net Profit/Mean DD</td>
                  <td className="px-4 py-2 text-right">{statistics.netProfitMeanDD.toFixed(2)}</td>
                </tr>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <td className="px-4 py-2">Sortino Ratio</td>
                  <td className="px-4 py-2 text-right">{statistics.sortinoRatio.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Sharpe Ratio</td>
                  <td className="px-4 py-2 text-right">{statistics.sharpeRatio.toFixed(2)}</td>
                </tr>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <td className="px-4 py-2">Real Minimum Account Req</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(statistics.realMinimumAccountReq, currency)}</td>
                </tr>

                {portfolioData.strategies.map((strategy, index) => (
                  <tr key={index} className={index % 2 === 0 ? "bg-gray-100 dark:bg-gray-800" : ""}>
                    <td className="px-4 py-2">Total Net Profit {strategy.name}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(strategy.netProfit, currency)}</td>
                  </tr>
                ))}

                <tr className="bg-gray-100 dark:bg-gray-800 font-medium">
                  <td className="px-4 py-2">Total Net Profit Portfolio</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(statistics.totalNetProfit, currency)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Max Drawdown</td>
                  <td className="px-4 py-2 text-right text-red-500">
                    -{formatCurrency(statistics.maxDrawdown, currency)}
                  </td>
                </tr>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <td className="px-4 py-2">Mean Drawdown</td>
                  <td className="px-4 py-2 text-right text-red-500">
                    -{formatCurrency(statistics.meanDrawdown, currency)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Profit Factor</td>
                  <td className="px-4 py-2 text-right">{statistics.profitFactor.toFixed(2)}</td>
                </tr>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <td className="px-4 py-2">Win Ratio Percentage</td>
                  <td className="px-4 py-2 text-right">{statistics.winRatioPercentage.toFixed(2)}%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Risk-Reward Ratio</td>
                  <td className="px-4 py-2 text-right">{statistics.riskRewardRatio.toFixed(2)}</td>
                </tr>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <td className="px-4 py-2">Total Trades</td>
                  <td className="px-4 py-2 text-right">{statistics.totalTrades}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Average Trade Profit</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(statistics.averageTradeProfit, currency)}</td>
                </tr>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <td className="px-4 py-2">Max Consec. Winning Trades</td>
                  <td className="px-4 py-2 text-right">{statistics.maxConsecutiveWinningTrades}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Max Consec. Losing Trades</td>
                  <td className="px-4 py-2 text-right">{statistics.maxConsecutiveLosingTrades}</td>
                </tr>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <td className="px-4 py-2">Trades per Month</td>
                  <td className="px-4 py-2 text-right">{statistics.tradesPerMonth.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Net Profit per Month</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(statistics.netProfitPerMonth, currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-8 gap-6 md:col-span-2">
        <Card className="md:col-span-5">
          <CardHeader>
            <CardTitle>Monthly Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={monthlyReturnsRef} className="h-[300px] overflow-auto"></div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Correlation Matrix</CardTitle>
            <div className="text-xs text-gray-500 flex flex-wrap gap-1 justify-end">
              <div className="flex items-center mr-1">
                <div className="w-3 h-3 mr-1 bg-red-500"></div>≥0.7
              </div>
              <div className="flex items-center mr-1">
                <div className="w-3 h-3 mr-1 bg-yellow-100"></div>≥0.3
              </div>
              <div className="flex items-center mr-1">
                <div className="w-3 h-3 mr-1 bg-green-100"></div>≤-0.3
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 mr-1 bg-green-200"></div>≤-0.7
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div ref={correlationMatrixRef} className="h-[300px]"></div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
