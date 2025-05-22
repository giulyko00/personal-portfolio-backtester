"use client"

import { useState } from "react"
import { FileUploader, type ImportFormat } from "@/components/file-uploader"
import { DateRangeFilter } from "@/components/date-range-filter"
import { TabNavigation } from "@/components/tab-navigation"
import { EquityCurveTab } from "@/components/tabs/equity-curve-tab"
import { ReturnsDistributionTab } from "@/components/tabs/returns-distribution-tab"
import { SingleStrategiesTab } from "@/components/tabs/single-strategies-tab"
import type { PortfolioData } from "@/types/portfolio"
import { processTradeStationCSV, processMultiChartsCSV, processNinjaTraderCSV } from "@/lib/data-processors"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { AlertCircle } from "lucide-react"

export function BacktestDashboard() {
  const [activeTab, setActiveTab] = useState("equity-curve")
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({
    startDate: "2008-01-01",
    endDate: "2099-01-01",
  })

  const handleFilesUploaded = async (files: File[], quantities: number[], format: ImportFormat) => {
    setIsLoading(true)
    setError(null)

    try {
      // Process the uploaded files based on the selected format
      let processedData: PortfolioData

      switch (format) {
        case "tradestation":
          processedData = await processTradeStationCSV(files, quantities)
          break
        case "multicharts":
          processedData = await processMultiChartsCSV(files, quantities)
          break
        case "ninjatrader":
          processedData = await processNinjaTraderCSV(files, quantities)
          break
        default:
          processedData = await processTradeStationCSV(files, quantities)
      }

      setPortfolioData(processedData)
    } catch (error) {
      console.error(`Error processing ${format} files:`, error)
      setError(error.message || `Error processing ${format} files. Please check the console for details.`)
      setPortfolioData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate })
    // If we have portfolio data, we would filter it here based on the new date range
    if (portfolioData) {
      // This would be implemented in a real application
      // For now, we'll just log the new date range
      console.log(`Filtering data from ${startDate} to ${endDate}`)
    }
  }

  const handleReset = () => {
    setPortfolioData(null)
    setError(null)
    setActiveTab("equity-curve")
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-1 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {!portfolioData ? (
        <FileUploader onFilesUploaded={handleFilesUploaded} isLoading={isLoading} />
      ) : (
        <>
          <div className="flex justify-between items-center">
            <DateRangeFilter
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onApplyFilter={handleDateRangeChange}
            />
            <Button variant="outline" className="flex items-center gap-2" onClick={handleReset}>
              <RefreshCw className="h-4 w-4" />
              Reset Analysis
            </Button>
          </div>

          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            {activeTab === "equity-curve" && <EquityCurveTab portfolioData={portfolioData} />}
            {activeTab === "returns-distribution" && <ReturnsDistributionTab portfolioData={portfolioData} />}
            {activeTab === "single-strategies" && <SingleStrategiesTab portfolioData={portfolioData} />}
          </div>
        </>
      )}
    </div>
  )
}
