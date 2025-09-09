"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import type { PortfolioData } from "@/types/portfolio"
import { formatCurrency } from "@/lib/formatters"
import { runStressTest, type StressTestResult } from "@/lib/stress-test"

interface StressTestTabProps {
  portfolioData: PortfolioData;
  currency?: "USD" | "EUR";
  marginType?: "intraday" | "overnight";
  result: StressTestResult | null;
  setResult: (result: StressTestResult | null) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

export function StressTestTab({
  portfolioData,
  currency = "USD",
  marginType = "intraday",
  result: stressTestResult,
  setResult: setStressTestResult,
  isLoading,
  setIsLoading,
}: StressTestTabProps) {
  const [removalPercentage, setRemovalPercentage] = useState([5])

  const handleRunStressTest = async () => {
    setIsLoading(true)
    try {
      const newResult = await runStressTest(portfolioData, removalPercentage[0], marginType);
      setStressTestResult(newResult);
    } catch (error) {
      console.error("Error running stress test:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!portfolioData) {
    return <div>No data available</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Stress Test Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="removal-percentage">Remove {removalPercentage[0]}% of best trades</Label>
            <Slider
              id="removal-percentage"
              min={1}
              max={20}
              step={1}
              value={removalPercentage}
              onValueChange={setRemovalPercentage}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>1%</span>
              <span>20%</span>
            </div>
          </div>

          <Button onClick={handleRunStressTest} disabled={isLoading} className="w-full">
            {isLoading ? "Running Stress Test..." : "Run Stress Test"}
          </Button>
        </CardContent>
      </Card>

      {stressTestResult && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Stress Test Impact Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Trades Removed</div>
                  <div className="text-2xl font-bold">{stressTestResult.removedTradesCount}</div>
                  <div className="text-sm text-gray-500">
                    Value: {formatCurrency(stressTestResult.removedTradesValue, currency)}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Net Profit Impact</div>
                  <div
                    className={`text-2xl font-bold ${stressTestResult.impactOnNetProfit < 0 ? "text-red-600" : "text-green-600"}`}
                  >
                    {stressTestResult.impactOnNetProfit.toFixed(2)}%
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Max Drawdown Impact</div>
                  <div
                    className={`text-2xl font-bold ${stressTestResult.impactOnMaxDrawdown > 0 ? "text-red-600" : "text-green-600"}`}
                  >
                    {stressTestResult.impactOnMaxDrawdown.toFixed(2)}%
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Profit Factor Impact</div>
                  <div
                    className={`text-2xl font-bold ${stressTestResult.impactOnProfitFactor < 0 ? "text-red-600" : "text-green-600"}`}
                  >
                    {stressTestResult.impactOnProfitFactor.toFixed(2)}%
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Win Ratio Impact</div>
                  <div
                    className={`text-2xl font-bold ${stressTestResult.impactOnWinRatio < 0 ? "text-red-600" : "text-green-600"}`}
                  >
                    {stressTestResult.impactOnWinRatio.toFixed(2)}%
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Sharpe Ratio Impact</div>
                  <div
                    className={`text-2xl font-bold ${stressTestResult.impactOnSharpeRatio < 0 ? "text-red-600" : "text-green-600"}`}
                  >
                    {stressTestResult.impactOnSharpeRatio.toFixed(2)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistics Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Metric</th>
                      <th className="text-right py-2">Original</th>
                      <th className="text-right py-2">Stressed</th>
                      <th className="text-right py-2">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2">Total Net Profit</td>
                      <td className="text-right py-2">
                        {formatCurrency(stressTestResult.originalData.statistics.totalNetProfit, currency)}
                      </td>
                      <td className="text-right py-2">
                        {formatCurrency(stressTestResult.stressedData.statistics.totalNetProfit, currency)}
                      </td>
                      <td
                        className={`text-right py-2 ${stressTestResult.impactOnNetProfit < 0 ? "text-red-600" : "text-green-600"}`}
                      >
                        {stressTestResult.impactOnNetProfit.toFixed(2)}%
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Max Drawdown</td>
                      <td className="text-right py-2">
                        {formatCurrency(stressTestResult.originalData.statistics.maxDrawdown, currency)}
                      </td>
                      <td className="text-right py-2">
                        {formatCurrency(stressTestResult.stressedData.statistics.maxDrawdown, currency)}
                      </td>
                      <td
                        className={`text-right py-2 ${stressTestResult.impactOnMaxDrawdown > 0 ? "text-red-600" : "text-green-600"}`}
                      >
                        {stressTestResult.impactOnMaxDrawdown.toFixed(2)}%
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Profit Factor</td>
                      <td className="text-right py-2">
                        {stressTestResult.originalData.statistics.profitFactor.toFixed(2)}
                      </td>
                      <td className="text-right py-2">
                        {stressTestResult.stressedData.statistics.profitFactor.toFixed(2)}
                      </td>
                      <td
                        className={`text-right py-2 ${stressTestResult.impactOnProfitFactor < 0 ? "text-red-600" : "text-green-600"}`}
                      >
                        {stressTestResult.impactOnProfitFactor.toFixed(2)}%
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Win Ratio</td>
                      <td className="text-right py-2">
                        {stressTestResult.originalData.statistics.winRatioPercentage.toFixed(2)}%
                      </td>
                      <td className="text-right py-2">
                        {stressTestResult.stressedData.statistics.winRatioPercentage.toFixed(2)}%
                      </td>
                      <td
                        className={`text-right py-2 ${stressTestResult.impactOnWinRatio < 0 ? "text-red-600" : "text-green-600"}`}
                      >
                        {stressTestResult.impactOnWinRatio.toFixed(2)}%
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Sharpe Ratio</td>
                      <td className="text-right py-2">
                        {stressTestResult.originalData.statistics.sharpeRatio.toFixed(3)}
                      </td>
                      <td className="text-right py-2">
                        {stressTestResult.stressedData.statistics.sharpeRatio.toFixed(3)}
                      </td>
                      <td
                        className={`text-right py-2 ${stressTestResult.impactOnSharpeRatio < 0 ? "text-red-600" : "text-green-600"}`}
                      >
                        {stressTestResult.impactOnSharpeRatio.toFixed(2)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2">Total Trades</td>
                      <td className="text-right py-2">{stressTestResult.originalData.statistics.totalTrades}</td>
                      <td className="text-right py-2">{stressTestResult.stressedData.statistics.totalTrades}</td>
                      <td className="text-right py-2 text-red-600">-{stressTestResult.removedTradesCount}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
