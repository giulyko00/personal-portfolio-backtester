// Interfaccia per la cache del tasso di cambio
interface ExchangeRateCache {
  rate: number
  lastUpdate: string
  source: string
  baseCurrency: string
  targetCurrency: string
}

// Funzione per caricare il tasso di cambio dalla cache
function loadExchangeRateFromCache(): ExchangeRateCache | null {
  if (typeof window === "undefined") return null

  try {
    const cached = localStorage.getItem("exchange_rate_cache")
    return cached ? JSON.parse(cached) : null
  } catch (error) {
    console.error("Error loading exchange rate from cache:", error)
    return null
  }
}

// Funzione per salvare il tasso di cambio nella cache
function saveExchangeRateToCache(data: ExchangeRateCache): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem("exchange_rate_cache", JSON.stringify(data))
  } catch (error) {
    console.error("Error saving exchange rate to cache:", error)
  }
}

// Funzione per ottenere il tasso di cambio (da API o cache)
async function getExchangeRate(): Promise<number> {
  // Verifica se abbiamo dati in cache recenti (ultimi 60 minuti)
  const cached = loadExchangeRateFromCache()
  const now = new Date()

  if (cached) {
    const lastUpdate = new Date(cached.lastUpdate)
    const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60)

    // Se l'aggiornamento è recente (meno di 60 minuti), usa la cache
    if (minutesSinceUpdate < 60) {
      console.log("Using cached exchange rate data")
      return cached.rate
    }
  }

  // Altrimenti, chiama l'API
  try {
    console.log("Fetching fresh exchange rate data from API")
    const response = await fetch("/api/exchange-rate")

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    const data: ExchangeRateCache = await response.json()

    // Salva i nuovi dati nella cache
    saveExchangeRateToCache(data)

    return data.rate
  } catch (error) {
    console.error("Error fetching exchange rate:", error)

    // Se c'è un errore ma abbiamo dati in cache, usali comunque
    if (cached) {
      console.warn("Using cached exchange rate data due to API error")
      return cached.rate
    }

    // Altrimenti, usa il valore hardcoded
    return 0.85 // Default fallback rate
  }
}

// Variabile globale per il tasso di cambio corrente
let currentExchangeRate = 0.85
let exchangeRatePromise: Promise<number> | null = null

// Funzione per inizializzare il tasso di cambio
export async function initializeExchangeRate(): Promise<void> {
  if (!exchangeRatePromise) {
    exchangeRatePromise = getExchangeRate()
  }
  currentExchangeRate = await exchangeRatePromise
}

// Funzione per aggiornare il tasso di cambio
export async function updateExchangeRate(): Promise<number> {
  exchangeRatePromise = getExchangeRate()
  currentExchangeRate = await exchangeRatePromise
  return currentExchangeRate
}

export function formatCurrency(value: number, currency: "USD" | "EUR" = "USD"): string {
  const convertedValue = currency === "EUR" ? value * currentExchangeRate : value

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(convertedValue)
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatPercent(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100)
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

// Funzione per convertire un valore da USD a EUR
export function convertCurrency(value: number, fromCurrency: "USD" | "EUR", toCurrency: "USD" | "EUR"): number {
  if (fromCurrency === toCurrency) return value

  if (fromCurrency === "USD" && toCurrency === "EUR") {
    return value * currentExchangeRate
  } else if (fromCurrency === "EUR" && toCurrency === "USD") {
    return value / currentExchangeRate
  }

  return value
}

// Funzione per ottenere il tasso di cambio corrente
export function getCurrentExchangeRate(): number {
  return currentExchangeRate
}
