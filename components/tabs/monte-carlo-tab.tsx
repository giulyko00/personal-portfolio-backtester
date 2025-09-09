"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatNumber } from "@/lib/formatters"
import type { PortfolioData } from "@/types/portfolio"
import { runMonteCarloSimulation, type MonteCarloResult } from "@/lib/monte-carlo"
import { createMonteCarloCharts } from "@/lib/chart-creators"

interface MonteCarloTabProps {
  portfolioData: PortfolioData;
  currency?: "USD" | "EUR";
  results: MonteCarloResult | null;
  setResults: (results: MonteCarloResult | null) => void;
  isRunning: boolean;
  setIsRunning: (isRunning: boolean) => void;
}

export function MonteCarloTab({
  portfolioData,
  currency = "USD",
  results,
  setResults,
  isRunning,
  setIsRunning,
}: MonteCarloTabProps) {
  const [simulations, setSimulations] = useState(1000)
  const [timeframe, setTimeframe] = useState("1y")
  const [simulationMethod, setSimulationMethod] = useState<"bootstrap" | "parametric">("bootstrap")

  const monteCarloChartRef = useRef<HTMLDivElement>(null)
  const drawdownDistributionRef = useRef<HTMLDivElement>(null)
  const finalEquityDistributionRef = useRef<HTMLDivElement>(null)

  const runSimulation = async () => {
    if (!portfolioData || isRunning) return

    setIsRunning(true)

    try {
      // Run the simulation asynchronously to avoid blocking the UI
      setTimeout(async () => {
        const result = await runMonteCarloSimulation(
          portfolioData.portfolioTrades,
          simulations,
          timeframe,
          simulationMethod,
        )

        setResults(result)
        setIsRunning(false)
      }, 100)
    } catch (error) {
      console.error("Error running Monte Carlo simulation:", error)
      setIsRunning(false)
    }
  }

  // Update charts when results change
  useEffect(() => {
    if (
      results &&
      monteCarloChartRef.current &&
      drawdownDistributionRef.current &&
      finalEquityDistributionRef.current
    ) {
      createMonteCarloCharts(
        monteCarloChartRef.current,
        drawdownDistributionRef.current,
        finalEquityDistributionRef.current,
        results,
        currency,
      )
    }

    return () => {
      // Cleanup
      if (monteCarloChartRef.current) {
        monteCarloChartRef.current.innerHTML = ""
      }
      if (drawdownDistributionRef.current) {
        drawdownDistributionRef.current.innerHTML = ""
      }
      if (finalEquityDistributionRef.current) {
        finalEquityDistributionRef.current.innerHTML = ""
      }
    }
  }, [results, currency])

  if (!portfolioData) {
    return <div>No data available</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Monte Carlo Simulation Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="simulation-method">Simulation Method</Label>
              <Select
                value={simulationMethod}
                onValueChange={(value) => setSimulationMethod(value as "bootstrap" | "parametric")}
              >
                <SelectTrigger id="simulation-method">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bootstrap">Bootstrap (Resampling)</SelectItem>
                  <SelectItem value="parametric">Parametric (Normal Distribution)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Bootstrap resamples historical trades, parametric generates new trades based on distribution.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="simulations">Number of Simulations: {simulations}</Label>
              <Slider
                id="simulations"
                min={100}
                max={10000}
                step={100}
                value={[simulations]}
                onValueChange={(value) => setSimulations(value[0])}
                className="py-4"
              />
              <p className="text-xs text-gray-500">More simulations = more accurate results but slower performance.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeframe">Projection Timeframe</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger id="timeframe">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6m">6 Months</SelectItem>
                  <SelectItem value="1y">1 Year</SelectItem>
                  <SelectItem value="2y">2 Years</SelectItem>
                  <SelectItem value="5y">5 Years</SelectItem>
                  <SelectItem value="10y">10 Years</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">Projection period for the simulation.</p>
            </div>
          </div>

          <Button onClick={runSimulation} disabled={isRunning} className="mt-6 bg-blue-600 hover:bg-blue-700">
            {isRunning ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Running Simulation...
              </span>
            ) : (
              "Run Monte Carlo Simulation"
            )}
          </Button>
        </CardContent>
      </Card>

      {results ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Monte Carlo Equity Curves</CardTitle>
              </CardHeader>
              <CardContent>
                <div ref={monteCarloChartRef} className="h-[500px]"></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Maximum Drawdown Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div ref={drawdownDistributionRef} className="h-[400px]"></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Final Equity Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div ref={finalEquityDistributionRef} className="h-[400px]"></div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Monte Carlo Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-800">
                        <th className="px-4 py-2 text-left">Metric</th>
                        <th className="px-4 py-2 text-right">5th Percentile</th>
                        <th className="px-4 py-2 text-right">Median (50th)</th>
                        <th className="px-4 py-2 text-right">95th Percentile</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-4 py-2">Final Equity</td>
                        <td className="px-4 py-2 text-right">
                          {formatCurrency(results.finalEquityPercentiles[0], currency)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatCurrency(results.finalEquityPercentiles[1], currency)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatCurrency(results.finalEquityPercentiles[2], currency)}
                        </td>
                      </tr>
                      <tr className="bg-gray-100 dark:bg-gray-800">
                        <td className="px-4 py-2">Maximum Drawdown</td>
                        <td className="px-4 py-2 text-right text-red-500">
                          -{formatCurrency(results.maxDrawdownPercentiles[0], currency)}
                        </td>
                        <td className="px-4 py-2 text-right text-red-500">
                          -{formatCurrency(results.maxDrawdownPercentiles[1], currency)}
                        </td>
                        <td className="px-4 py-2 text-right text-red-500">
                          -{formatCurrency(results.maxDrawdownPercentiles[2], currency)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2">Annual Return</td>
                        <td className="px-4 py-2 text-right">
                          {formatNumber(results.annualReturnPercentiles[0] * 100, 2)}%
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatNumber(results.annualReturnPercentiles[1] * 100, 2)}%
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatNumber(results.annualReturnPercentiles[2] * 100, 2)}%
                        </td>
                      </tr>
                      <tr className="bg-gray-100 dark:bg-gray-800">
                        <td className="px-4 py-2">Profit Factor</td>
                        <td className="px-4 py-2 text-right">{formatNumber(results.profitFactorPercentiles[0], 2)}</td>
                        <td className="px-4 py-2 text-right">{formatNumber(results.profitFactorPercentiles[1], 2)}</td>
                        <td className="px-4 py-2 text-right">{formatNumber(results.profitFactorPercentiles[2], 2)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2">Sharpe Ratio</td>
                        <td className="px-4 py-2 text-right">{formatNumber(results.sharpeRatioPercentiles[0], 2)}</td>
                        <td className="px-4 py-2 text-right">{formatNumber(results.sharpeRatioPercentiles[1], 2)}</td>
                        <td className="px-4 py-2 text-right">{formatNumber(results.sharpeRatioPercentiles[2], 2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-medium mb-2">Probability of Profit</h4>
                    <div className="text-2xl font-bold">{formatNumber(results.probabilityOfProfit * 100, 2)}%</div>
                    <p className="text-sm text-gray-500 mt-1">Percentage of simulations that ended with a profit.</p>
                  </div>

                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-medium mb-2">Probability of 20%+ Drawdown</h4>
                    <div className="text-2xl font-bold">
                      {formatNumber(results.probabilityOfLargeDrawdown * 100, 2)}%
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Percentage of simulations with drawdowns exceeding 20%.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-lg text-center">
          <h3 className="text-xl font-medium mb-2">No Simulation Results Yet</h3>
          <p className="text-gray-500 mb-4">
            Run a Monte Carlo simulation to see how your portfolio might perform under different scenarios.
          </p>
          <p className="text-sm text-gray-500">
            Monte Carlo simulations help assess the robustness of your trading strategy by generating thousands of
            possible future scenarios based on your historical performance.
          </p>
        </div>
      )}
    </div>
  )
}
