"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarIcon } from "lucide-react"
import type { PortfolioData } from "@/types/portfolio"

interface DateRangeFilterProps {
  startDate: string
  endDate: string
  portfolioData: PortfolioData | null
  onApplyFilter: (startDate: string, endDate: string, filteredData: PortfolioData) => void
  isLoading: boolean
}

export function DateRangeFilter({ startDate, endDate, portfolioData, onApplyFilter, isLoading }: DateRangeFilterProps) {
  const [localStartDate, setLocalStartDate] = useState(startDate)
  const [localEndDate, setLocalEndDate] = useState(endDate)

  const handleApplyFilter = async () => {
    if (!portfolioData) return

    try {
      // Invia i dati al backend Python per il filtraggio
      const response = await fetch("http://localhost:5000/api/filter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          portfolioData,
          startDate: localStartDate,
          endDate: localEndDate,
        }),
      })

      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`)
      }

      // Analizza la risposta JSON
      const filteredData = await response.json()

      // Converti le date da stringhe a oggetti Date
      const convertedData = convertDatesFromStrings(filteredData)

      // Passa i dati filtrati al componente padre
      onApplyFilter(localStartDate, localEndDate, convertedData)
    } catch (error) {
      console.error("Errore durante il filtraggio dei dati:", error)
      alert("Errore durante il filtraggio dei dati. Controlla la console per i dettagli.")
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

  return (
    <Card className="bg-gray-100 dark:bg-gray-800 border-none shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="start-date">Start Date (YYYY-MM-DD)</Label>
            <div className="relative">
              <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                id="start-date"
                type="text"
                placeholder="YYYY-MM-DD"
                value={localStartDate}
                onChange={(e) => setLocalStartDate(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="end-date">End Date (YYYY-MM-DD)</Label>
            <div className="relative">
              <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                id="end-date"
                type="text"
                placeholder="YYYY-MM-DD"
                value={localEndDate}
                onChange={(e) => setLocalEndDate(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Button
            onClick={handleApplyFilter}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isLoading || !portfolioData}
          >
            {isLoading ? "Filtraggio..." : "Apply Filter"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
