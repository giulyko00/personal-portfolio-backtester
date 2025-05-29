import type { PortfolioData, Strategy, Trade, UsedMargin } from "@/types/portfolio"

// Interfaccia per la cache dei margini
interface MarginsCache {
  margins: Record<string, number>
  lastUpdate: string
  source: string
  marginType: "intraday" | "overnight"
}

// Funzione per caricare i margini dalla cache
function loadMarginsFromCache(marginType: "intraday" | "overnight" = "intraday"): MarginsCache | null {
  if (typeof window === "undefined") return null

  try {
    const cached = localStorage.getItem(`margins_cache_${marginType}`)
    return cached ? JSON.parse(cached) : null
  } catch (error) {
    console.error("Error loading margins from cache:", error)
    return null
  }
}

// Funzione per salvare i margini nella cache
function saveMarginsToCache(data: MarginsCache): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(`margins_cache_${data.marginType}`, JSON.stringify(data))
  } catch (error) {
    console.error("Error saving margins to cache:", error)
  }
}

// Funzione per ottenere i margini (da API o cache)
async function getMargins(marginType: "intraday" | "overnight" = "intraday"): Promise<Record<string, number>> {
  // Verifica se abbiamo dati in cache recenti (ultimi 24 ore) per il tipo di margine richiesto
  const cached = loadMarginsFromCache(marginType)
  const now = new Date()

  if (cached) {
    const lastUpdate = new Date(cached.lastUpdate)
    const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)

    // Se l'aggiornamento è recente (meno di 24 ore), usa la cache
    if (hoursSinceUpdate < 24) {
      console.log(`Using cached ${marginType} margins data`)
      return cached.margins
    }
  }

  // Altrimenti, chiama l'API
  try {
    console.log(`Fetching fresh ${marginType} margins data from API`)
    const response = await fetch(`/api/margins?type=${marginType}`)

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    const data: MarginsCache = await response.json()

    // Salva i nuovi dati nella cache
    saveMarginsToCache(data)

    return data.margins
  } catch (error) {
    console.error("Error fetching margins:", error)

    // Se c'è un errore ma abbiamo dati in cache, usali comunque
    if (cached) {
      console.warn(`Using cached ${marginType} margins data due to API error`)
      return cached.margins
    }

    // Altrimenti, usa i valori hardcoded
    return getHardcodedMargins(marginType)
  }
}

// Valori hardcoded come fallback finale
function getHardcodedMargins(marginType: "intraday" | "overnight" = "intraday"): Record<string, number> {
  if (marginType === "intraday") {
    return {
      CL: 1650.0,
      ES: 2419.0,
      FDXM: 9125.0,
      FESX: 4107.0,
      GC: 1650.0,
      MCL: 662.0,
      MES: 241.9,
      MGC: 412.5,
      MNQ: 350.5,
      NQ: 3504.8,
      RB: 1800.5,
      MZS: 237.0,
      MZW: 182.0,
    }
  } else {
    return {
      CL: 6603.0,
      ES: 24449.0,
      FDXM: 9125.0,
      FESX: 4107.0,
      GC: 16500.0,
      MCL: 662.0,
      MES: 2419.0,
      MGC: 1650.0,
      MNQ: 3505.0,
      NQ: 35048.0,
      RB: 7202.0,
      MZS: 237.0,
      MZW: 182.0,
    }
  }
}

// Function to parse CSV data from TradeStation format
export async function processTradeStationCSV(
  files: File[],
  quantities: number[],
  marginType: "intraday" | "overnight" = "intraday",
): Promise<PortfolioData> {
  try {
    // This is a simplified implementation - in a real app, you would parse the CSV files
    // and perform all the calculations from the original Python script

    const strategies: Strategy[] = []
    const portfolioTrades: Trade[] = []

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const quantity = quantities[i]
      const fileName = file.name.split(".")[0]
      const symbol = fileName.split("-")[0].trim().toUpperCase()

      // Read and parse the file content
      const content = await file.text()
      const trades = parseTradeStationCSV(content, quantity)

      // Skip if no trades were parsed
      if (trades.length === 0) {
        console.warn(`No trades found in file: ${file.name}`)
        continue
      }

      // Calculate equity curve for this strategy
      const equity = calculateEquityCurve(trades)
      const netProfit = equity[equity.length - 1] || 0

      // Add strategy to the list
      strategies.push({
        name: fileName,
        symbol,
        quantity,
        trades,
        equity,
        netProfit,
      })

      // Add trades to portfolio
      portfolioTrades.push(...trades)
    }

    // Check if we have any strategies
    if (strategies.length === 0) {
      throw new Error("No valid strategies found in the uploaded files")
    }

    // Sort portfolio trades by exit time
    portfolioTrades.sort((a, b) => a.exitTime.getTime() - b.exitTime.getTime())

    // Calculate portfolio equity
    const portfolioEquity = calculateEquityCurve(portfolioTrades)

    // Calculate drawdowns
    const drawdowns = calculateDrawdowns(portfolioEquity)

    // Calculate statistics
    const statistics = calculateStatistics(portfolioTrades, portfolioEquity, drawdowns)

    // Calculate monthly and daily returns
    const monthlyReturns = calculateMonthlyReturns(portfolioTrades)
    const dailyReturns = calculateDailyReturns(portfolioTrades)

    // Calculate correlation matrix
    const dfsEquityStrategies = strategies.map((s) => ({
      exitTime: s.trades.map((t) => t.exitTime),
      equity: s.equity,
    }))
    const correlationMatrix = calculateStrategyCorrelation(dfsEquityStrategies, portfolioTrades)

    // Calculate margins
    const strategyMargins = await calculateStrategyMargins(strategies, marginType)
    const usedMargins = await calculateUsedMargin(strategies, portfolioTrades, strategyMargins)

    // Calculate margin statistics
    const margins = {
      strategyMargins,
      minimumAccountRequired: sum(strategyMargins) + statistics.maxDrawdown,
      maxUsedMargin: Math.max(...usedMargins.map((m) => m.totalMargin), 0),
      maxUsedMarginOccurrences: countMaxOccurrences(usedMargins.map((m) => m.totalMargin)),
      maxUsedMarginFirstDate:
        usedMargins
          .find((m) => m.totalMargin === Math.max(...usedMargins.map((um) => um.totalMargin), 0))
          ?.date.toISOString()
          .split("T")[0] || "",
    }

    // Calculate real minimum account required
    statistics.realMinimumAccountReq = statistics.maxDrawdown + margins.maxUsedMargin

    // Return the complete portfolio data
    return {
      strategies,
      portfolioTrades,
      portfolioEquity,
      drawdowns,
      statistics,
      monthlyReturns,
      dailyReturns,
      correlationMatrix,
      margins,
      usedMargins,
    }
  } catch (error) {
    console.error("Error in processTradeStationCSV:", error)
    throw new Error(`Error processing TradeStation files: ${error.message}`)
  }
}

// Function to parse CSV data from MultiCharts format
export async function processMultiChartsCSV(
  files: File[],
  quantities: number[],
  marginType: "intraday" | "overnight" = "intraday",
): Promise<PortfolioData> {
  try {
    const strategies: Strategy[] = []
    const portfolioTrades: Trade[] = []

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const quantity = quantities[i]
      const fileName = file.name.split(".")[0]
      const symbol = fileName.split("-")[0].trim().toUpperCase()

      // Read and parse the file content
      const content = await file.text()
      const trades = parseMultiChartsCSV(content, quantity)

      // Skip if no trades were parsed
      if (trades.length === 0) {
        console.warn(`No trades found in file: ${file.name}`)
        continue
      }

      // Calculate equity curve for this strategy
      const equity = calculateEquityCurve(trades)
      const netProfit = equity[equity.length - 1] || 0

      // Add strategy to the list
      strategies.push({
        name: fileName,
        symbol,
        quantity,
        trades,
        equity,
        netProfit,
      })

      // Add trades to portfolio
      portfolioTrades.push(...trades)
    }

    // Check if we have any strategies
    if (strategies.length === 0) {
      throw new Error("No valid strategies found in the uploaded files")
    }

    // The rest of the processing is the same as TradeStation
    portfolioTrades.sort((a, b) => a.exitTime.getTime() - b.exitTime.getTime())
    const portfolioEquity = calculateEquityCurve(portfolioTrades)
    const drawdowns = calculateDrawdowns(portfolioEquity)
    const statistics = calculateStatistics(portfolioTrades, portfolioEquity, drawdowns)
    const monthlyReturns = calculateMonthlyReturns(portfolioTrades)
    const dailyReturns = calculateDailyReturns(portfolioTrades)
    const dfsEquityStrategies = strategies.map((s) => ({
      exitTime: s.trades.map((t) => t.exitTime),
      equity: s.equity,
    }))
    const correlationMatrix = calculateStrategyCorrelation(dfsEquityStrategies, portfolioTrades)
    const strategyMargins = await calculateStrategyMargins(strategies, marginType)
    const usedMargins = await calculateUsedMargin(strategies, portfolioTrades, strategyMargins)
    const margins = {
      strategyMargins,
      minimumAccountRequired: sum(strategyMargins) + statistics.maxDrawdown,
      maxUsedMargin: Math.max(...usedMargins.map((m) => m.totalMargin), 0),
      maxUsedMarginOccurrences: countMaxOccurrences(usedMargins.map((m) => m.totalMargin)),
      maxUsedMarginFirstDate:
        usedMargins
          .find((m) => m.totalMargin === Math.max(...usedMargins.map((um) => um.totalMargin), 0))
          ?.date.toISOString()
          .split("T")[0] || "",
    }

    // Calculate real minimum account required
    statistics.realMinimumAccountReq = statistics.maxDrawdown + margins.maxUsedMargin

    return {
      strategies,
      portfolioTrades,
      portfolioEquity,
      drawdowns,
      statistics,
      monthlyReturns,
      dailyReturns,
      correlationMatrix,
      margins,
      usedMargins,
    }
  } catch (error) {
    console.error("Error in processMultiChartsCSV:", error)
    throw new Error(`Error processing MultiCharts files: ${error.message}`)
  }
}

// Function to parse CSV data from NinjaTrader format
export async function processNinjaTraderCSV(
  files: File[],
  quantities: number[],
  marginType: "intraday" | "overnight" = "intraday",
): Promise<PortfolioData> {
  try {
    const strategies: Strategy[] = []
    const portfolioTrades: Trade[] = []

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const quantity = quantities[i]
      const fileName = file.name.split(".")[0]
      const symbol = fileName.split("-")[0].trim().toUpperCase()

      // Read and parse the file content
      const content = await file.text()
      const trades = parseNinjaTraderCSV(content, quantity)

      // Skip if no trades were parsed
      if (trades.length === 0) {
        console.warn(`No trades found in file: ${file.name}`)
        continue
      }

      // Calculate equity curve for this strategy
      const equity = calculateEquityCurve(trades)
      const netProfit = equity[equity.length - 1] || 0

      // Add strategy to the list
      strategies.push({
        name: fileName,
        symbol,
        quantity,
        trades,
        equity,
        netProfit,
      })

      // Add trades to portfolio
      portfolioTrades.push(...trades)
    }

    // Check if we have any strategies
    if (strategies.length === 0) {
      throw new Error("No valid strategies found in the uploaded files")
    }

    // The rest of the processing is the same as TradeStation
    portfolioTrades.sort((a, b) => a.exitTime.getTime() - b.exitTime.getTime())
    const portfolioEquity = calculateEquityCurve(portfolioTrades)
    const drawdowns = calculateDrawdowns(portfolioEquity)
    const statistics = calculateStatistics(portfolioTrades, portfolioEquity, drawdowns)
    const monthlyReturns = calculateMonthlyReturns(portfolioTrades)
    const dailyReturns = calculateDailyReturns(portfolioTrades)
    const dfsEquityStrategies = strategies.map((s) => ({
      exitTime: s.trades.map((t) => t.exitTime),
      equity: s.equity,
    }))
    const correlationMatrix = calculateStrategyCorrelation(dfsEquityStrategies, portfolioTrades)
    const strategyMargins = await calculateStrategyMargins(strategies, marginType)
    const usedMargins = await calculateUsedMargin(strategies, portfolioTrades, strategyMargins)
    const margins = {
      strategyMargins,
      minimumAccountRequired: sum(strategyMargins) + statistics.maxDrawdown,
      maxUsedMargin: Math.max(...usedMargins.map((m) => m.totalMargin), 0),
      maxUsedMarginOccurrences: countMaxOccurrences(usedMargins.map((m) => m.totalMargin)),
      maxUsedMarginFirstDate:
        usedMargins
          .find((m) => m.totalMargin === Math.max(...usedMargins.map((um) => um.totalMargin), 0))
          ?.date.toISOString()
          .split("T")[0] || "",
    }

    // Calculate real minimum account required
    statistics.realMinimumAccountReq = statistics.maxDrawdown + margins.maxUsedMargin

    return {
      strategies,
      portfolioTrades,
      portfolioEquity,
      drawdowns,
      statistics,
      monthlyReturns,
      dailyReturns,
      correlationMatrix,
      margins,
      usedMargins,
    }
  } catch (error) {
    console.error("Error in processNinjaTraderCSV:", error)
    throw new Error(`Error processing NinjaTrader files: ${error.message}`)
  }
}

// Helper function to parse TradeStation CSV format
function parseTradeStationCSV(csvContent: string, quantity: number): Trade[] {
  const lines = csvContent.split("\n")
  const trades: Trade[] = []

  // Skip header rows (first 6 rows in TradeStation format)
  let i = 6

  // Process trades (each trade is represented by 2 rows)
  while (i < lines.length - 1) {
    const openRow = lines[i].split(",")
    const closeRow = lines[i + 1].split(",")

    // Skip if we don't have both rows
    if (!openRow.length || !closeRow.length) {
      i += 2
      continue
    }

    // Extract data from the rows
    try {
      const openTimeStr = openRow[2]?.trim()
      const exitTimeStr = closeRow[2]?.trim()
      const profitStr = openRow[7]?.trim()

      if (!openTimeStr || !exitTimeStr || !profitStr) {
        i += 2
        continue
      }

      // Parse dates and profit
      const openTime = parseDate(openTimeStr)
      const exitTime = parseDate(exitTimeStr)
      const profit = parseProfit(profitStr) * quantity

      trades.push({ openTime, exitTime, profit })
    } catch (error) {
      console.error("Error parsing trade:", error)
    }

    i += 2
  }

  return trades
}

// Helper function to parse MultiCharts CSV format
function parseMultiChartsCSV(csvContent: string, quantity: number): Trade[] {
  const lines = csvContent.split("\n")
  const trades: Trade[] = []

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",")
    if (row.length < 5) continue

    try {
      const openTimeStr = row[0]?.trim()
      const exitTimeStr = row[1]?.trim()
      const profitStr = row[4]?.trim()

      if (!openTimeStr || !exitTimeStr || !profitStr) continue

      // Parse dates (format: YYYY-MM-DD HH:MM:SS)
      const openTime = new Date(openTimeStr)
      const exitTime = new Date(exitTimeStr)

      // Parse profit
      const profit = Number.parseFloat(profitStr) * quantity

      if (isNaN(openTime.getTime()) || isNaN(exitTime.getTime()) || isNaN(profit)) continue

      trades.push({ openTime, exitTime, profit })
    } catch (error) {
      console.error("Error parsing MultiCharts trade:", error)
    }
  }

  return trades
}

// Helper function to parse NinjaTrader CSV format
function parseNinjaTraderCSV(csvContent: string, quantity: number): Trade[] {
  const lines = csvContent.split("\n")
  const trades: Trade[] = []

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",")
    if (row.length < 6) continue

    try {
      const openTimeStr = row[0]?.trim()
      const exitTimeStr = row[1]?.trim()
      const profitStr = row[5]?.trim()

      if (!openTimeStr || !exitTimeStr || !profitStr) continue

      // Parse dates (format varies by NinjaTrader version)
      const openTime = new Date(openTimeStr)
      const exitTime = new Date(exitTimeStr)

      // Parse profit
      const profit = Number.parseFloat(profitStr) * quantity

      if (isNaN(openTime.getTime()) || isNaN(exitTime.getTime()) || isNaN(profit)) continue

      trades.push({ openTime, exitTime, profit })
    } catch (error) {
      console.error("Error parsing NinjaTrader trade:", error)
    }
  }

  return trades
}

// Helper function to parse date strings for TradeStation
function parseDate(dateStr: string): Date {
  // Assuming format is DD/MM/YYYY HH:MM
  const [datePart, timePart] = dateStr.split(" ")
  const [day, month, year] = datePart.split("/")
  const [hour, minute] = timePart.split(":")

  return new Date(
    Number.parseInt(year),
    Number.parseInt(month) - 1,
    Number.parseInt(day),
    Number.parseInt(hour),
    Number.parseInt(minute),
  )
}

// Helper function to parse profit values for TradeStation
function parseProfit(profitStr: string): number {
  // Remove currency symbols, commas, etc.
  const cleanedStr = profitStr.replace(/[$,()]/g, "")
  // If the profit was in parentheses, it's negative
  return profitStr.includes("(") ? -Number.parseFloat(cleanedStr) : Number.parseFloat(cleanedStr)
}

// Helper function to calculate equity curve from trades
function calculateEquityCurve(trades: Trade[]): number[] {
  const equity: number[] = []
  let cumulativeProfit = 0

  for (const trade of trades) {
    cumulativeProfit += trade.profit
    equity.push(cumulativeProfit)
  }

  return equity
}

// Helper function to calculate drawdowns from equity curve
function calculateDrawdowns(equity: number[]): number[] {
  const drawdowns: number[] = []
  let peak = equity[0] || 0

  for (const value of equity) {
    if (value > peak) {
      peak = value
    }
    const drawdown = value - peak
    drawdowns.push(drawdown)
  }

  return drawdowns
}

// Helper function to calculate statistics
function calculateStatistics(trades: Trade[], equity: number[], drawdowns: number[]): any {
  // Calculate total net profit
  const totalNetProfit = equity.length > 0 ? equity[equity.length - 1] : 0

  // Calculate max drawdown (as a positive number)
  const maxDrawdown = Math.abs(Math.min(...drawdowns, 0))

  // Calculate mean drawdown (as a positive number)
  const meanDrawdown = Math.abs(
    drawdowns.filter((d) => d < 0).reduce((sum, d) => sum + d, 0) / drawdowns.filter((d) => d < 0).length || 0,
  )

  // Calculate profit factor
  const grossProfit = trades.filter((t) => t.profit > 0).reduce((sum, t) => sum + t.profit, 0)
  const grossLoss = Math.abs(trades.filter((t) => t.profit < 0).reduce((sum, t) => sum + t.profit, 0))
  const profitFactor = grossLoss === 0 ? Number.POSITIVE_INFINITY : grossProfit / grossLoss

  // Calculate win ratio
  const winCount = trades.filter((t) => t.profit > 0).length
  const winRatioPercentage = (winCount / trades.length) * 100 || 0

  // Calculate risk-reward ratio
  const avgWin = grossProfit / winCount || 0
  const avgLoss = grossLoss / (trades.length - winCount) || 0
  const riskRewardRatio = avgLoss === 0 ? Number.POSITIVE_INFINITY : avgWin / avgLoss

  // Calculate consecutive trades
  let maxConsecutiveWinningTrades = 0
  let maxConsecutiveLosingTrades = 0
  let currentWinStreak = 0
  let currentLoseStreak = 0

  for (const trade of trades) {
    if (trade.profit > 0) {
      currentWinStreak++
      currentLoseStreak = 0
      maxConsecutiveWinningTrades = Math.max(maxConsecutiveWinningTrades, currentWinStreak)
    } else if (trade.profit < 0) {
      currentLoseStreak++
      currentWinStreak = 0
      maxConsecutiveLosingTrades = Math.max(maxConsecutiveLosingTrades, currentLoseStreak)
    }
  }

  // Calculate trades per month and net profit per month
  const firstDate = trades.length > 0 ? trades[0].exitTime : new Date()
  const lastDate = trades.length > 0 ? trades[trades.length - 1].exitTime : new Date()
  const monthsDiff =
    (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + lastDate.getMonth() - firstDate.getMonth() + 1
  const tradesPerMonth = trades.length / monthsDiff || 0
  const netProfitPerMonth = totalNetProfit / monthsDiff || 0

  // Calculate Sharpe and Sortino ratios
  const returns = []
  for (let i = 1; i < equity.length; i++) {
    returns.push((equity[i] - equity[i - 1]) / Math.max(Math.abs(equity[i - 1]), 1))
  }

  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length || 0
  const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length || 0)
  const downDev = Math.sqrt(
    returns.filter((r) => r < 0).reduce((sum, r) => sum + Math.pow(r, 2), 0) / returns.length || 0,
  )

  const sharpeRatio = stdDev === 0 ? 0 : meanReturn / stdDev
  const sortinoRatio = downDev === 0 ? 0 : meanReturn / downDev

  return {
    totalNetProfit,
    maxDrawdown,
    meanDrawdown,
    netProfitMaxDD: maxDrawdown === 0 ? Number.POSITIVE_INFINITY : totalNetProfit / maxDrawdown,
    netProfitMeanDD: meanDrawdown === 0 ? Number.POSITIVE_INFINITY : totalNetProfit / meanDrawdown,
    profitFactor,
    winRatioPercentage,
    riskRewardRatio,
    totalTrades: trades.length,
    averageTradeProfit: totalNetProfit / trades.length || 0,
    maxConsecutiveWinningTrades,
    maxConsecutiveLosingTrades,
    tradesPerMonth,
    netProfitPerMonth,
    sharpeRatio,
    sortinoRatio,
  }
}

// Helper function to calculate monthly returns
function calculateMonthlyReturns(trades: Trade[]): Record<string, number> {
  const monthlyReturns: Record<string, number> = {}

  for (const trade of trades) {
    const date = trade.exitTime
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

    if (!monthlyReturns[yearMonth]) {
      monthlyReturns[yearMonth] = 0
    }

    monthlyReturns[yearMonth] += trade.profit
  }

  return monthlyReturns
}

// Helper function to calculate daily returns
function calculateDailyReturns(trades: Trade[]): Record<string, number> {
  const dailyReturns: Record<string, number> = {}

  for (const trade of trades) {
    const date = trade.exitTime
    const day = date.toISOString().split("T")[0]

    if (!dailyReturns[day]) {
      dailyReturns[day] = 0
    }

    dailyReturns[day] += trade.profit
  }

  return dailyReturns
}

// Helper function to calculate strategy correlation
function calculateStrategyCorrelation(
  dfsEquityStrategies: Array<{ exitTime: Date[]; equity: number[] }>,
  portfolioTrades: Trade[],
): number[][] {
  const numStrategies = dfsEquityStrategies.length
  const correlationMatrix: number[][] = Array(numStrategies)
    .fill(0)
    .map(() => Array(numStrategies).fill(0))

  // Fill diagonal with 1s (self-correlation)
  for (let i = 0; i < numStrategies; i++) {
    correlationMatrix[i][i] = 1
  }

  // Calculate correlation between each pair of strategies
  for (let i = 0; i < numStrategies; i++) {
    for (let j = i + 1; j < numStrategies; j++) {
      const strategy1 = dfsEquityStrategies[i]
      const strategy2 = dfsEquityStrategies[j]

      // Calculate returns for both strategies
      const returns1: number[] = []
      const returns2: number[] = []

      for (let k = 1; k < strategy1.equity.length; k++) {
        returns1.push(strategy1.equity[k] - strategy1.equity[k - 1])
      }

      for (let k = 1; k < strategy2.equity.length; k++) {
        returns2.push(strategy2.equity[k] - strategy2.equity[k - 1])
      }

      // Calculate correlation if we have enough data
      if (returns1.length > 1 && returns2.length > 1) {
        const correlation = calculateCorrelation(returns1, returns2)
        correlationMatrix[i][j] = correlation
        correlationMatrix[j][i] = correlation // Matrix is symmetric
      }
    }
  }

  return correlationMatrix
}

// Helper function to calculate correlation between two arrays
function calculateCorrelation(x: number[], y: number[]): number {
  // Use a simple approach for correlation calculation
  const n = Math.min(x.length, y.length)
  if (n <= 1) return 0

  // Calculate means
  const meanX = x.reduce((sum, val) => sum + val, 0) / n
  const meanY = y.reduce((sum, val) => sum + val, 0) / n

  // Calculate covariance and variances
  let covariance = 0
  let varX = 0
  let varY = 0

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX
    const diffY = y[i] - meanY
    covariance += diffX * diffY
    varX += diffX * diffX
    varY += diffY * diffY
  }

  // Calculate correlation
  if (varX === 0 || varY === 0) return 0
  return covariance / (Math.sqrt(varX) * Math.sqrt(varY))
}

// Helper function to calculate used margin over time
async function calculateUsedMargin(
  strategies: Strategy[],
  portfolioTrades: Trade[],
  strategyMargins: number[],
): Promise<UsedMargin[]> {
  try {
    if (portfolioTrades.length === 0) {
      return []
    }

    // Get the date range from the portfolio trades
    const startDate = new Date(Math.min(...portfolioTrades.map((t) => t.openTime.getTime())))
    const endDate = new Date(Math.max(...portfolioTrades.map((t) => t.exitTime.getTime())))

    // Generate dates at daily intervals (instead of hourly)
    // This reduces the number of dates by 24x
    const dates: Date[] = []
    const currentDate = new Date(startDate)

    // Limit the number of dates to prevent stack overflow
    const maxDates = 1000
    let dateCount = 0

    while (currentDate <= endDate && dateCount < maxDates) {
      dates.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1) // Move to next day
      dateCount++
    }

    // If we have too many dates, sample them
    let sampledDates = dates
    if (dates.length > maxDates) {
      const sampleInterval = Math.ceil(dates.length / maxDates)
      sampledDates = dates.filter((_, i) => i % sampleInterval === 0)
      console.log(`Sampled ${sampledDates.length} dates from ${dates.length} total dates`)
    }

    // Calculate used margin for each date
    const usedMargins: UsedMargin[] = []

    for (const date of sampledDates) {
      const strategyMarginsUsed: Record<string, number> = {}
      let totalMargin = 0

      // Check each strategy
      for (let i = 0; i < strategies.length; i++) {
        const strategy = strategies[i]
        const margin = strategyMargins[i]

        // Check if the strategy has an open position on this date
        const hasOpenPosition = strategy.trades.some((trade) => trade.openTime <= date && trade.exitTime >= date)

        if (hasOpenPosition) {
          strategyMarginsUsed[strategy.name] = margin
          totalMargin += margin
        } else {
          strategyMarginsUsed[strategy.name] = 0
        }
      }

      usedMargins.push({
        date,
        totalMargin,
        strategyMargins: strategyMarginsUsed,
      })
    }

    return usedMargins
  } catch (error) {
    console.error("Error calculating used margin:", error)
    return []
  }
}

// Helper function to sum an array of numbers
function sum(numbers: number[]): number {
  return numbers.reduce((total, num) => total + num, 0)
}

// Helper function to count occurrences of the maximum value
function countMaxOccurrences(numbers: number[]): number {
  if (numbers.length === 0) return 0
  const max = Math.max(...numbers)
  return numbers.filter((n) => n === max).length
}

// Helper function to calculate strategy margins
async function calculateStrategyMargins(
  strategies: Strategy[],
  marginType: "intraday" | "overnight" = "intraday",
): Promise<number[]> {
  try {
    // Get margins from API or cache
    const margins = await getMargins(marginType)

    // Calculate margin for each strategy
    return strategies.map((strategy) => {
      const symbol = strategy.symbol.toUpperCase()
      const marginPerContract = margins[symbol] || 0
      return marginPerContract * strategy.quantity
    })
  } catch (error) {
    console.error("Error calculating strategy margins:", error)
    // Return default margins in case of error
    return strategies.map(() => (marginType === "intraday" ? 2500 : 5000)) // Default margin based on type
  }
}
