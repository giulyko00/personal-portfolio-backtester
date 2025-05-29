import type { Trade } from "@/types/portfolio"

export interface MonteCarloResult {
  equityCurves: number[][]
  finalEquities: number[]
  maxDrawdowns: number[]
  annualReturns: number[]
  profitFactors: number[]
  sharpeRatios: number[]
  finalEquityPercentiles: number[] // [5%, 50%, 95%]
  maxDrawdownPercentiles: number[] // [5%, 50%, 95%]
  annualReturnPercentiles: number[] // [5%, 50%, 95%]
  profitFactorPercentiles: number[] // [5%, 50%, 95%]
  sharpeRatioPercentiles: number[] // [5%, 50%, 95%]
  probabilityOfProfit: number
  probabilityOfLargeDrawdown: number
  timeframe: string
  method: "bootstrap" | "parametric"
}

// Funzione principale per eseguire la simulazione Monte Carlo
export async function runMonteCarloSimulation(
  trades: Trade[],
  numSimulations: number,
  timeframe: string,
  method: "bootstrap" | "parametric" = "bootstrap",
): Promise<MonteCarloResult> {
  // Calcola il numero di trade da generare in base al timeframe
  const tradesPerYear = calculateTradesPerYear(trades)
  const numTradesForSimulation = calculateNumTradesForTimeframe(tradesPerYear, timeframe)

  // Array per memorizzare i risultati
  const equityCurves: number[][] = []
  const finalEquities: number[] = []
  const maxDrawdowns: number[] = []
  const annualReturns: number[] = []
  const profitFactors: number[] = []
  const sharpeRatios: number[] = []

  // Esegui le simulazioni
  for (let i = 0; i < numSimulations; i++) {
    // Genera una sequenza di trade simulati
    const simulatedTrades =
      method === "bootstrap"
        ? bootstrapTrades(trades, numTradesForSimulation)
        : generateParametricTrades(trades, numTradesForSimulation)

    // Calcola l'equity curve
    const equity = calculateEquityCurve(simulatedTrades)
    equityCurves.push(equity)

    // Calcola le statistiche
    finalEquities.push(equity[equity.length - 1] || 0)
    maxDrawdowns.push(calculateMaxDrawdown(equity))

    // Calcola il rendimento annualizzato
    const startValue = 10000 // Valore iniziale ipotetico
    const endValue = startValue + (equity[equity.length - 1] || 0)
    const years = getYearsFromTimeframe(timeframe)
    const annualReturn = Math.pow(endValue / startValue, 1 / years) - 1
    annualReturns.push(annualReturn)

    // Calcola il profit factor
    const profitFactor = calculateProfitFactor(simulatedTrades)
    profitFactors.push(profitFactor)

    // Calcola lo Sharpe ratio
    const sharpeRatio = calculateSharpeRatio(equity)
    sharpeRatios.push(sharpeRatio)
  }

  // Calcola i percentili
  const finalEquityPercentiles = calculatePercentiles(finalEquities, [0.05, 0.5, 0.95])
  const maxDrawdownPercentiles = calculatePercentiles(maxDrawdowns, [0.05, 0.5, 0.95])
  const annualReturnPercentiles = calculatePercentiles(annualReturns, [0.05, 0.5, 0.95])
  const profitFactorPercentiles = calculatePercentiles(profitFactors, [0.05, 0.5, 0.95])
  const sharpeRatioPercentiles = calculatePercentiles(sharpeRatios, [0.05, 0.5, 0.95])

  // Calcola altre statistiche
  const probabilityOfProfit = finalEquities.filter((eq) => eq > 0).length / finalEquities.length
  const probabilityOfLargeDrawdown =
    maxDrawdowns.filter((dd) => dd > 0.2 * Math.max(...finalEquities)).length / maxDrawdowns.length

  return {
    equityCurves,
    finalEquities,
    maxDrawdowns,
    annualReturns,
    profitFactors,
    sharpeRatios,
    finalEquityPercentiles,
    maxDrawdownPercentiles,
    annualReturnPercentiles,
    profitFactorPercentiles,
    sharpeRatioPercentiles,
    probabilityOfProfit,
    probabilityOfLargeDrawdown,
    timeframe,
    method,
  }
}

// Funzione per calcolare il numero di trade per anno
function calculateTradesPerYear(trades: Trade[]): number {
  if (trades.length <= 1) return 252 // Default: circa 1 trade al giorno di trading

  const firstDate = trades[0].exitTime
  const lastDate = trades[trades.length - 1].exitTime
  const yearsDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 365)

  return trades.length / Math.max(yearsDiff, 0.1) // Evita divisione per zero
}

// Funzione per calcolare il numero di trade per il timeframe specificato
function calculateNumTradesForTimeframe(tradesPerYear: number, timeframe: string): number {
  const years = getYearsFromTimeframe(timeframe)
  return Math.round(tradesPerYear * years)
}

// Funzione per convertire il timeframe in anni
function getYearsFromTimeframe(timeframe: string): number {
  switch (timeframe) {
    case "6m":
      return 0.5
    case "1y":
      return 1
    case "2y":
      return 2
    case "5y":
      return 5
    case "10y":
      return 10
    default:
      return 1
  }
}

// Funzione per generare trade con bootstrap (ricampionamento)
function bootstrapTrades(originalTrades: Trade[], numTrades: number): Trade[] {
  const simulatedTrades: Trade[] = []

  for (let i = 0; i < numTrades; i++) {
    // Seleziona un trade casuale dall'insieme originale
    const randomIndex = Math.floor(Math.random() * originalTrades.length)
    const randomTrade = originalTrades[randomIndex]

    // Crea una copia del trade
    simulatedTrades.push({
      openTime: new Date(randomTrade.openTime),
      exitTime: new Date(randomTrade.exitTime),
      profit: randomTrade.profit,
    })
  }

  // Ordina i trade per data di uscita
  simulatedTrades.sort((a, b) => a.exitTime.getTime() - b.exitTime.getTime())

  return simulatedTrades
}

// Funzione per generare trade con metodo parametrico (distribuzione normale)
function generateParametricTrades(originalTrades: Trade[], numTrades: number): Trade[] {
  // Calcola media e deviazione standard dei profitti
  const profits = originalTrades.map((trade) => trade.profit)
  const mean = profits.reduce((sum, profit) => sum + profit, 0) / profits.length
  const variance = profits.reduce((sum, profit) => sum + Math.pow(profit - mean, 2), 0) / profits.length
  const stdDev = Math.sqrt(variance)

  // Calcola la durata media dei trade
  const tradeDurations = originalTrades.map((trade) => trade.exitTime.getTime() - trade.openTime.getTime())
  const meanDuration = tradeDurations.reduce((sum, duration) => sum + duration, 0) / tradeDurations.length

  const simulatedTrades: Trade[] = []
  let currentDate = new Date()

  for (let i = 0; i < numTrades; i++) {
    // Genera un profitto dalla distribuzione normale
    const profit = generateNormalRandom(mean, stdDev)

    // Crea date di apertura e chiusura
    const openTime = new Date(currentDate)
    currentDate = new Date(currentDate.getTime() + meanDuration)
    const exitTime = new Date(currentDate)

    simulatedTrades.push({ openTime, exitTime, profit })
  }

  return simulatedTrades
}

// Funzione per generare un numero casuale da una distribuzione normale
function generateNormalRandom(mean: number, stdDev: number): number {
  // Box-Muller transform
  const u1 = Math.random()
  const u2 = Math.random()

  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)

  return z0 * stdDev + mean
}

// Funzione per calcolare l'equity curve
function calculateEquityCurve(trades: Trade[]): number[] {
  const equity: number[] = []
  let cumulativeProfit = 0

  for (const trade of trades) {
    cumulativeProfit += trade.profit
    equity.push(cumulativeProfit)
  }

  return equity
}

// Funzione per calcolare il massimo drawdown
function calculateMaxDrawdown(equity: number[]): number {
  let maxDrawdown = 0
  let peak = equity[0] || 0

  for (const value of equity) {
    if (value > peak) {
      peak = value
    } else {
      const drawdown = peak - value
      maxDrawdown = Math.max(maxDrawdown, drawdown)
    }
  }

  return maxDrawdown
}

// Funzione per calcolare il profit factor
function calculateProfitFactor(trades: Trade[]): number {
  const grossProfit = trades.filter((t) => t.profit > 0).reduce((sum, t) => sum + t.profit, 0)
  const grossLoss = Math.abs(trades.filter((t) => t.profit < 0).reduce((sum, t) => sum + t.profit, 0))

  return grossLoss === 0 ? 10 : grossProfit / grossLoss // Limita a 10 se il denominatore è zero
}

// Funzione per calcolare lo Sharpe ratio
function calculateSharpeRatio(equity: number[]): number {
  if (equity.length <= 1) return 0

  // Calcola i rendimenti
  const returns = []
  for (let i = 1; i < equity.length; i++) {
    const prevEquity = Math.max(1, equity[i - 1]) // Evita divisione per zero
    returns.push((equity[i] - equity[i - 1]) / prevEquity)
  }

  // Calcola media e deviazione standard
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
  const stdDev = Math.sqrt(variance)

  // Calcola lo Sharpe ratio (assumendo risk-free rate = 0)
  return stdDev === 0 ? 0 : (mean / stdDev) * Math.sqrt(252) // Annualizzato
}

// Funzione per calcolare i percentili
function calculatePercentiles(data: number[], percentiles: number[]): number[] {
  const sortedData = [...data].sort((a, b) => a - b)

  return percentiles.map((p) => {
    const index = Math.floor(p * sortedData.length)
    return sortedData[index] || 0
  })
}
