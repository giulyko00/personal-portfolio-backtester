"use client"

import { useState } from "react"
import { FileUploader, type ImportFormat } from "@/components/file-uploader"
import { DateRangeFilter } from "@/components/date-range-filter"
import { TabNavigation } from "@/components/tab-navigation"
import { EquityCurveTab } from "@/components/tabs/equity-curve-tab"
import { ReturnsDistributionTab } from "@/components/tabs/returns-distribution-tab"
import { SingleStrategiesTab } from "@/components/tabs/single-strategies-tab"
import { MarginInfo } from "@/components/margin-info"
import type { PortfolioData } from "@/types/portfolio"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

// URL del backend configurabile
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"

export function BacktestDashboard() {
  const [activeTab, setActiveTab] = useState("equity-curve")
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({
    startDate: "2008-01-01",
    endDate: "2099-01-01",
  })
  const [symbols, setSymbols] = useState<string[]>([])

  const handleFilesUploaded = async (files: File[], quantities: number[], format: ImportFormat) => {
    setIsLoading(true)
    setError(null)

    try {
      // Estrai i simboli dai nomi dei file
      const extractedSymbols = files.map((file) => {
        const fileName = file.name.split(".")[0]
        return fileName.split("-")[0].trim().toUpperCase()
      })
      setSymbols(extractedSymbols)

      // Crea un FormData per inviare i file al backend Python
      const formData = new FormData()

      // Aggiungi i file
      files.forEach((file) => {
        formData.append("files", file)
      })

      // Aggiungi le quantità e il formato
      formData.append("quantities", JSON.stringify(quantities))
      formData.append("format", format)

      console.log(`Inviando richiesta a ${BACKEND_URL}/api/process...`)

      // Invia la richiesta al backend Python con un timeout più lungo
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 secondi di timeout

      const response = await fetch(`${BACKEND_URL}/api/process`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Errore HTTP ${response.status}: ${errorText}`)
      }

      // Analizza la risposta JSON
      const processedData = await response.json()

      // Converti le date da stringhe a oggetti Date
      const convertedData = convertDatesFromStrings(processedData)

      setPortfolioData(convertedData)
    } catch (error: any) {
      console.error(`Errore nell'elaborazione dei file ${format}:`, error)

      let errorMessage = "Si è verificato un errore durante l'elaborazione dei file."

      if (error.name === "AbortError") {
        errorMessage = "La richiesta è scaduta. Verifica che il backend sia in esecuzione e riprova."
      } else if (error.message.includes("Failed to fetch")) {
        errorMessage =
          "Impossibile connettersi al backend. Verifica che il server Python sia in esecuzione su http://localhost:5000."
      } else {
        errorMessage = `Errore: ${error.message}`
      }

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Funzione per convertire le date da stringhe a oggetti Date
  const convertDatesFromStrings = (data: any): PortfolioData => {
    // Converti le date nei trades
    if (data.portfolioTrades) {
      data.portfolioTrades = data.portfolioTrades.map((trade: any) => ({
        ...trade,
        openTime: new Date(trade.openTime),
        exitTime: new Date(trade.exitTime),
      }))
    }

    // Converti le date nelle strategie
    if (data.strategies) {
      data.strategies = data.strategies.map((strategy: any) => ({
        ...strategy,
        trades: strategy.trades.map((trade: any) => ({
          ...trade,
          openTime: new Date(trade.openTime),
          exitTime: new Date(trade.exitTime),
        })),
      }))
    }

    // Converti le date nei margini utilizzati
    if (data.usedMargins) {
      data.usedMargins = data.usedMargins.map((margin: any) => ({
        ...margin,
        date: new Date(margin.date),
      }))
    }

    // Se c'è una data di drawdown massimo, convertila
    if (data.statistics && data.statistics.maxDrawdownDate) {
      data.statistics.maxDrawdownDate = new Date(data.statistics.maxDrawdownDate)
    }

    return data as PortfolioData
  }

  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate })
    // Se abbiamo dati del portafoglio, li filtreremmo qui in base al nuovo intervallo di date
    if (portfolioData) {
      // Questo verrebbe implementato in un'applicazione reale
      // Per ora, registriamo solo il nuovo intervallo di date
      console.log(`Filtraggio dei dati da ${startDate} a ${endDate}`)
    }
  }

  const handleReset = () => {
    setPortfolioData(null)
    setActiveTab("equity-curve")
    setSymbols([])
    setError(null)
  }

  return (
    <div className="space-y-6">
      {!portfolioData ? (
        <>
          <FileUploader onFilesUploaded={handleFilesUploaded} isLoading={isLoading} />

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Errore! </strong>
              <span className="block sm:inline">{error}</span>
              <p className="mt-2 text-sm">
                Assicurati che il backend Python sia in esecuzione con il comando:
                <code className="block mt-1 bg-gray-200 p-2 rounded">
                  cd backend
                  <br />
                  python app.py
                </code>
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <MarginInfo symbols={symbols} />

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
