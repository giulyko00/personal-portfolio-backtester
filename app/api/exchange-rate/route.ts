import { NextResponse } from "next/server"

// Tipo per la risposta dell'API
interface ExchangeRateResponse {
  rate: number
  lastUpdate: string
  source: string
  baseCurrency: string
  targetCurrency: string
}

// Funzione per ottenere il tasso di cambio da un servizio esterno
async function fetchExchangeRate(): Promise<number> {
  try {
    // Utilizziamo exchangerate-api.com (servizio gratuito)
    const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rate: ${response.status}`)
    }

    const data = await response.json()
    return data.rates.EUR || 0.85 // Fallback rate
  } catch (error) {
    console.error("Error fetching exchange rate:", error)

    // Prova un servizio alternativo
    try {
      const response = await fetch("https://api.fixer.io/latest?base=USD&symbols=EUR", {
        cache: "no-store",
      })

      if (response.ok) {
        const data = await response.json()
        return data.rates.EUR || 0.85
      }
    } catch (fallbackError) {
      console.error("Fallback exchange rate service also failed:", fallbackError)
    }

    return 0.85 // Default fallback rate
  }
}

// Valore hardcoded come fallback
function getHardcodedExchangeRate(): number {
  return 0.85 // 1 USD = 0.85 EUR (valore approssimativo)
}

export async function GET() {
  try {
    // Tenta di ottenere il tasso di cambio
    let rate = await fetchExchangeRate()
    let source = "exchangerate-api"

    // Se il fetch fallisce, usa il valore hardcoded
    if (!rate || rate === 0) {
      rate = getHardcodedExchangeRate()
      source = "hardcoded"
    }

    // Prepara la risposta
    const response: ExchangeRateResponse = {
      rate,
      lastUpdate: new Date().toISOString(),
      source,
      baseCurrency: "USD",
      targetCurrency: "EUR",
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error in exchange rate API:", error)

    // In caso di errore, restituisci il valore hardcoded
    const fallbackResponse: ExchangeRateResponse = {
      rate: getHardcodedExchangeRate(),
      lastUpdate: new Date().toISOString(),
      source: "fallback",
      baseCurrency: "USD",
      targetCurrency: "EUR",
    }

    return NextResponse.json(fallbackResponse)
  }
}
