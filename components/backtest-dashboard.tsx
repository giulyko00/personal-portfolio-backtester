"use client"

import { useState, useEffect } from "react"
import { FileUploader, type ImportFormat } from "@/components/file-uploader"
import { DateRangeFilter } from "@/components/date-range-filter"
import { TabNavigation } from "@/components/tab-navigation"
import { EquityCurveTab } from "@/components/tabs/equity-curve-tab"
import { ReturnsDistributionTab } from "@/components/tabs/returns-distribution-tab"
import { SingleStrategiesTab } from "@/components/tabs/single-strategies-tab"
import type { PortfolioData } from "@/types/portfolio"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

// URL del backend
const API_URL = "http://localhost:5000"

export function BacktestDashboard() {
  const [activeTab, setActiveTab] = useState("equity-curve")
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking")
  const [dateRange, setDateRange] = useState({
    startDate: "2008-01-01",
    endDate: "2099-01-01",
  })

  // Verifica che il backend sia in esecuzione all'avvio del componente
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/api/test`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          setBackendStatus("online")
        } else {
          setBackendStatus("offline")
        }
      } catch (error) {
        console.error("Errore durante la verifica dello stato del backend:", error)
        setBackendStatus("offline")
      }
    }

    checkBackendStatus()
  }, [])

  const handleFilesUploaded = async (files: File[], quantities: number[], format: ImportFormat) => {
    setIsLoading(true)
    setError(null)

    try {
      // Verifica che il backend sia in esecuzione
      if (backendStatus === "offline") {
        throw new Error(
          "Il backend Python non è in esecuzione. Avvia il server Python con 'python app.py' nella cartella backend.",
        )
      }

      // Crea un FormData per inviare i file al backend Python
      const formData = new FormData()

      // Aggiungi i file
      files.forEach((file) => {
        formData.append("files", file)
      })

      // Aggiungi le quantità e il formato
      formData.append("quantities", JSON.stringify(quantities))
      formData.append("format", format)

      // Invia la richiesta al backend Python
      const response = await fetch(`${API_URL}/api/process`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Errore HTTP: ${response.status}`)
      }

      // Analizza la risposta JSON
      const processedData = await response.json()

      // Converti le date da stringhe a oggetti Date
      const convertedData = convertDatesFromStrings(processedData)

      setPortfolioData(convertedData)
    } catch (error) {
      console.error(`Errore nell'elaborazione dei file ${format}:`, error)
      setError(error instanceof Error ? error.message : "Errore sconosciuto")
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

  const handleDateRangeChange = async (startDate: string, endDate: string, filteredData: PortfolioData) => {
    setDateRange({ startDate, endDate })
    setPortfolioData(filteredData)
  }

  const handleReset = () => {
    setPortfolioData(null)
    setActiveTab("equity-curve")
    setError(null)
    setDateRange({
      startDate: "2008-01-01",
      endDate: "2099-01-01",
    })
  }

  return (
    <div className="space-y-6">
      {backendStatus === "offline" && (
        <Alert variant="destructive">
          <AlertTitle>Backend non disponibile</AlertTitle>
          <AlertDescription>
            Il backend Python non è in esecuzione. Avvia il server Python con 'python app.py' nella cartella backend.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Errore</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!portfolioData ? (
        <FileUploader
          onFilesUploaded={handleFilesUploaded}
          isLoading={isLoading}
          disabled={backendStatus === "offline"}
        />
      ) : (
        <>
          <div className="flex justify-between items-center">
            <DateRangeFilter
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              portfolioData={portfolioData}
              onApplyFilter={handleDateRangeChange}
              isLoading={isLoading}
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
