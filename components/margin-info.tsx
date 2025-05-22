"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { formatCurrency } from "@/lib/formatters"

// URL del backend configurabile
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"

interface MarginInfoProps {
  symbols: string[]
}

interface MarginData {
  [symbol: string]: number
}

export function MarginInfo({ symbols }: MarginInfoProps) {
  const [margins, setMargins] = useState<MarginData>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const fetchMargins = async () => {
    if (symbols.length === 0) return

    setIsLoading(true)
    setError(null)

    try {
      console.log(`Recupero margini da ${BACKEND_URL}/api/margins...`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 secondi di timeout

      const response = await fetch(`${BACKEND_URL}/api/margins`, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Errore HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      setMargins(data)
      setLastUpdated(new Date().toLocaleString())
    } catch (error: any) {
      console.error("Errore nel recupero dei margini:", error)

      let errorMessage = "Si è verificato un errore durante il recupero dei margini."

      if (error.name === "AbortError") {
        errorMessage = "La richiesta è scaduta. Verifica che il backend sia in esecuzione e riprova."
      } else if (error.message.includes("Failed to fetch")) {
        errorMessage = "Impossibile connettersi al backend. Verifica che il server Python sia in esecuzione."
      } else {
        errorMessage = `Errore: ${error.message}`
      }

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (symbols.length > 0) {
      fetchMargins()
    }
  }, [symbols])

  if (symbols.length === 0) {
    return null
  }

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Margini Aggiornati</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchMargins}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Aggiornamento...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Aggiorna Margini
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-500 mb-2">
              {lastUpdated ? `Ultimo aggiornamento: ${lastUpdated}` : "Margini non ancora caricati"}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <th className="px-4 py-2 text-left">Simbolo</th>
                    <th className="px-4 py-2 text-right">Margine</th>
                  </tr>
                </thead>
                <tbody>
                  {symbols.map((symbol, index) => (
                    <tr key={symbol} className={index % 2 === 0 ? "bg-gray-50 dark:bg-gray-900" : ""}>
                      <td className="px-4 py-2">{symbol}</td>
                      <td className="px-4 py-2 text-right">
                        {margins[symbol] ? formatCurrency(margins[symbol]) : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
