"use client"

import { useState, useEffect } from "react"
import { FileUploader, type ImportFormat } from "@/components/file-uploader"
import { DateRangeFilter } from "@/components/date-range-filter"
import { TabNavigation } from "@/components/tab-navigation"
import { EquityCurveTab } from "@/components/tabs/equity-curve-tab"
import { ReturnsDistributionTab } from "@/components/tabs/returns-distribution-tab"
import { SingleStrategiesTab } from "@/components/tabs/single-strategies-tab"
import type { PortfolioData } from "@/types/portfolio"
import { processTradeStationCSV, processMultiChartsCSV, processNinjaTraderCSV } from "@/lib/data-processors"
import { initializeExchangeRate, updateExchangeRate } from "@/lib/formatters"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { RefreshCw } from "lucide-react"
import { AlertCircle } from "lucide-react"

export function BacktestDashboard() {
  const [activeTab, setActiveTab] = useState("equity-curve")
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [marginType, setMarginType] = useState<"intraday" | "overnight">("intraday")
  const [currency, setCurrency] = useState<"USD" | "EUR">("USD")
  const [exchangeRateLoading, setExchangeRateLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    startDate: "2008-01-01",
    endDate: "2099-01-01",
  })

  // Inizializza il tasso di cambio al caricamento del componente
  useEffect(() => {
    initializeExchangeRate().catch(console.error)
  }, [])

  const handleFilesUploaded = async (files: File[], quantities: number[], format: ImportFormat) => {
    setIsLoading(true)
    setError(null)

    try {
      // Process the uploaded files based on the selected format
      let processedData: PortfolioData

      switch (format) {
        case "tradestation":
          processedData = await processTradeStationCSV(files, quantities, marginType)
          break
        case "multicharts":
          processedData = await processMultiChartsCSV(files, quantities, marginType)
          break
        case "ninjatrader":
          processedData = await processNinjaTraderCSV(files, quantities, marginType)
          break
        default:
          processedData = await processTradeStationCSV(files, quantities, marginType)
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

  const handleMarginTypeChange = (checked: boolean) => {
    const newMarginType = checked ? "overnight" : "intraday"
    setMarginType(newMarginType)

    // Se abbiamo già dei dati, ricalcoliamo con il nuovo tipo di margine
    if (portfolioData && portfolioData.strategies.length > 0) {
      setIsLoading(true)
      setError(null)

      // Riutilizziamo gli stessi file e quantità
      const format = "tradestation" // Assumiamo un formato di default
      const files = [] as File[] // Non abbiamo più i file originali
      const quantities = portfolioData.strategies.map((s) => s.quantity)

      // Questo è un workaround, in un'app reale dovresti salvare i file originali
      // o implementare un modo per ricalcolare i margini senza riprocessare tutto
      setTimeout(() => {
        setIsLoading(false)
        // Mostra un messaggio che indica che è necessario ricaricare i file
        setError("Per applicare il nuovo tipo di margine, carica nuovamente i file.")
      }, 500)
    }
  }

  const handleCurrencyChange = async (checked: boolean) => {
    const newCurrency = checked ? "EUR" : "USD"
    setCurrency(newCurrency)

    // Se stiamo passando a EUR, aggiorna il tasso di cambio
    if (newCurrency === "EUR") {
      setExchangeRateLoading(true)
      try {
        await updateExchangeRate()
        console.log("Exchange rate updated successfully")
      } catch (error) {
        console.error("Error updating exchange rate:", error)
        setError("Errore nell'aggiornamento del tasso di cambio. Verrà utilizzato un valore di fallback.")
      } finally {
        setExchangeRateLoading(false)
      }
    }
  }

  const handleUpdateExchangeRate = async () => {
    setExchangeRateLoading(true)
    try {
      const newRate = await updateExchangeRate()
      console.log(`Exchange rate updated: 1 USD = ${newRate.toFixed(4)} EUR`)
    } catch (error) {
      console.error("Error updating exchange rate:", error)
      setError("Errore nell'aggiornamento del tasso di cambio.")
    } finally {
      setExchangeRateLoading(false)
    }
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
        <>
          <div className="flex items-center justify-end mb-4 space-x-6">
            <div className="flex items-center space-x-2">
              <Label htmlFor="margin-type" className="text-sm font-medium">
                {marginType === "intraday" ? "Intraday Margins" : "Overnight Margins"}
              </Label>
              <Switch id="margin-type" checked={marginType === "overnight"} onCheckedChange={handleMarginTypeChange} />
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="currency-type" className="text-sm font-medium">
                {currency === "USD" ? "USD ($)" : "EUR (€)"}
              </Label>
              <Switch
                id="currency-type"
                checked={currency === "EUR"}
                onCheckedChange={handleCurrencyChange}
                disabled={exchangeRateLoading}
              />
              {exchangeRateLoading && <RefreshCw className="h-4 w-4 animate-spin text-gray-500" />}
            </div>
          </div>
          <FileUploader onFilesUploaded={handleFilesUploaded} isLoading={isLoading} />
        </>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <DateRangeFilter
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onApplyFilter={handleDateRangeChange}
            />
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="margin-type-switch" className="text-sm font-medium">
                  {marginType === "intraday" ? "Intraday Margins" : "Overnight Margins"}
                </Label>
                <Switch
                  id="margin-type-switch"
                  checked={marginType === "overnight"}
                  onCheckedChange={handleMarginTypeChange}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="currency-type-switch" className="text-sm font-medium">
                  {currency === "USD" ? "USD ($)" : "EUR (€)"}
                </Label>
                <Switch
                  id="currency-type-switch"
                  checked={currency === "EUR"}
                  onCheckedChange={handleCurrencyChange}
                  disabled={exchangeRateLoading}
                />
                {currency === "EUR" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUpdateExchangeRate}
                    disabled={exchangeRateLoading}
                    className="ml-2"
                  >
                    {exchangeRateLoading ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
              <Button variant="outline" className="flex items-center gap-2" onClick={handleReset}>
                <RefreshCw className="h-4 w-4" />
                Reset Analysis
              </Button>
            </div>
          </div>

          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            {activeTab === "equity-curve" && <EquityCurveTab portfolioData={portfolioData} currency={currency} />}
            {activeTab === "returns-distribution" && (
              <ReturnsDistributionTab portfolioData={portfolioData} currency={currency} />
            )}
            {activeTab === "single-strategies" && (
              <SingleStrategiesTab portfolioData={portfolioData} currency={currency} />
            )}
          </div>
        </>
      )}
    </div>
  )
}
