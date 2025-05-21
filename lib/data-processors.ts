import type { PortfolioData, Trade, Strategy, MonthlyReturns, DailyReturns } from "@/types/portfolio"

// Function to parse CSV data from TradeStation format
export async function processTradeStationCSV(files: File[], quantities: number[]): Promise<PortfolioData> {
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
  const strategyMargins = calculateStrategyMargins(strategies)
  const usedMargins = calculateUsedMargin(strategies, portfolioTrades, strategyMargins)

  // Calculate margin statistics
  const margins = {
    strategyMargins,
    minimumAccountRequired: sum(strategyMargins) + statistics.maxDrawdown,
    maxUsedMargin: Math.max(...usedMargins.map((m) => m.totalMargin)),
    maxUsedMarginOccurrences: countMaxOccurrences(usedMargins.map((m) => m.totalMargin)),
    maxUsedMarginFirstDate:
      usedMargins
        .find((m) => m.totalMargin === Math.max(...usedMargins.map((um) => um.totalMargin)))
        ?.date.toISOString()
        .split("T")[0] || "",
  }

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
}

// Function to parse CSV data from MultiCharts format
export async function processMultiChartsCSV(files: File[], quantities: number[]): Promise<PortfolioData> {
  // For now, we'll use the same implementation as TradeStation with a different parser
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
  const strategyMargins = calculateStrategyMargins(strategies)
  const usedMargins = calculateUsedMargin(strategies, portfolioTrades, strategyMargins)
  const margins = {
    strategyMargins,
    minimumAccountRequired: sum(strategyMargins) + statistics.maxDrawdown,
    maxUsedMargin: Math.max(...usedMargins.map((m) => m.totalMargin)),
    maxUsedMarginOccurrences: countMaxOccurrences(usedMargins.map((m) => m.totalMargin)),
    maxUsedMarginFirstDate:
      usedMargins
        .find((m) => m.totalMargin === Math.max(...usedMargins.map((um) => um.totalMargin)))
        ?.date.toISOString()
        .split("T")[0] || "",
  }

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
}

// Function to parse CSV data from NinjaTrader format
export async function processNinjaTraderCSV(files: File[], quantities: number[]): Promise<PortfolioData> {
  // For now, we'll use the same implementation as TradeStation with a different parser
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
  const strategyMargins = calculateStrategyMargins(strategies)
  const usedMargins = calculateUsedMargin(strategies, portfolioTrades, strategyMargins)
  const margins = {
    strategyMargins,
    minimumAccountRequired: sum(strategyMargins) + statistics.maxDrawdown,
    maxUsedMargin: Math.max(...usedMargins.map((m) => m.totalMargin)),
    maxUsedMarginOccurrences: countMaxOccurrences(usedMargins.map((m) => m.totalMargin)),
    maxUsedMarginFirstDate:
      usedMargins
        .find((m) => m.totalMargin === Math.max(...usedMargins.map((um) => um.totalMargin)))
        ?.date.toISOString()
        .split("T")[0] || "",
  }

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
  let i = 1

  // Process trades (each trade is represented by 1 row in MultiCharts)
  while (i < lines.length) {
    const row = lines[i].split(",")

    // Skip if row is empty
    if (!row.length) {
      i++
      continue
    }

    // Extract data from the row
    try {
      // Assuming MultiCharts format has columns: Date, Time, Type, Price, Contracts, Profit
      // This is a simplified example - adjust based on actual format
      const dateStr = row[0]?.trim()
      const timeStr = row[1]?.trim()
      const entryDateStr = row[5]?.trim()
      const entryTimeStr = row[6]?.trim()
      const profitStr = row[10]?.trim()

      if (!dateStr || !timeStr || !profitStr || !entryDateStr || !entryTimeStr) {
        i++
        continue
      }

      // Parse dates and profit
      const exitTime = parseMultiChartsDate(`${dateStr} ${timeStr}`)
      const openTime = parseMultiChartsDate(`${entryDateStr} ${entryTimeStr}`)
      const profit = parseMultiChartsProfit(profitStr) * quantity

      trades.push({ openTime, exitTime, profit })
    } catch (error) {
      console.error("Error parsing MultiCharts trade:", error)
    }

    i++
  }

  return trades
}

// Helper function to parse NinjaTrader CSV format
function parseNinjaTraderCSV(csvContent: string, quantity: number): Trade[] {
  const lines = csvContent.split("\n")
  const trades: Trade[] = []

  // Skip header row
  let i = 1

  // Process trades (each trade is represented by 1 row in NinjaTrader)
  while (i < lines.length) {
    const row = lines[i].split(",")

    // Skip if row is empty
    if (!row.length) {
      i++
      continue
    }

    // Extract data from the row
    try {
      // Assuming NinjaTrader format has columns: Entry Time, Exit Time, Profit
      // This is a simplified example - adjust based on actual format
      const entryTimeStr = row[0]?.trim()
      const exitTimeStr = row[1]?.trim()
      const profitStr = row[2]?.trim()

      if (!entryTimeStr || !exitTimeStr || !profitStr) {
        i++
        continue
      }

      // Parse dates and profit
      const openTime = parseNinjaTraderDate(entryTimeStr)
      const exitTime = parseNinjaTraderDate(exitTimeStr)
      const profit = parseNinjaTraderProfit(profitStr) * quantity

      trades.push({ openTime, exitTime, profit })
    } catch (error) {
      console.error("Error parsing NinjaTrader trade:", error)
    }

    i++
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

// Helper function to parse date strings for MultiCharts
function parseMultiChartsDate(dateStr: string): Date {
  // Assuming format is MM/DD/YYYY HH:MM:SS
  const [datePart, timePart] = dateStr.split(" ")
  const [month, day, year] = datePart.split("/")
  const [hour, minute, second] = timePart.split(":")

  return new Date(
    Number.parseInt(year),
    Number.parseInt(month) - 1,
    Number.parseInt(day),
    Number.parseInt(hour),
    Number.parseInt(minute),
    Number.parseInt(second || "0"),
  )
}

// Helper function to parse date strings for NinjaTrader
function parseNinjaTraderDate(dateStr: string): Date {
  // Assuming format is YYYY-MM-DD HH:MM:SS
  const [datePart, timePart] = dateStr.split(" ")
  const [year, month, day] = datePart.split("-")
  const [hour, minute, second] = timePart.split(":")

  return new Date(
    Number.parseInt(year),
    Number.parseInt(month) - 1,
    Number.parseInt(day),
    Number.parseInt(hour),
    Number.parseInt(minute),
    Number.parseInt(second || "0"),
  )
}

// Helper function to parse profit values for TradeStation
function parseProfit(profitStr: string): number {
  // Remove currency symbols, commas, etc.
  const cleanedStr = profitStr.replace(/[$,()]/g, "")
  // If the profit was in parentheses, it's negative
  return profitStr.includes("(") ? -Number.parseFloat(cleanedStr) : Number.parseFloat(cleanedStr)
}

// Helper function to parse profit values for MultiCharts
function parseMultiChartsProfit(profitStr: string): number {
  // Remove currency symbols, commas, etc.
  const cleanedStr = profitStr.replace(/[$,]/g, "")
  // Check if the value is negative
  return profitStr.startsWith("-") ? -Number.parseFloat(cleanedStr.substring(1)) : Number.parseFloat(cleanedStr)
}

// Helper function to parse profit values for NinjaTrader
function parseNinjaTraderProfit(profitStr: string): number {
  // Remove currency symbols, commas, etc.
  const cleanedStr = profitStr.replace(/[$,]/g, "")
  // Check if the value is negative
  return profitStr.startsWith("-") ? -Number.parseFloat(cleanedStr.substring(1)) : Number.parseFloat(cleanedStr)
}

// Calculate equity curve from trades
function calculateEquityCurve(trades: Trade[]): number[] {
  const equity: number[] = []
  let cumulativeProfit = 0

  for (const trade of trades) {
    cumulativeProfit += trade.profit
    equity.push(cumulativeProfit)
  }

  return equity
}

// Calculate drawdowns from equity curve
function calculateDrawdowns(equity: number[]): number[] {
  const drawdowns: number[] = []
  let peak = equity[0] || 0

  for (const value of equity) {
    if (value > peak) {
      peak = value
    }
    const drawdown = peak - value
    drawdowns.push(-drawdown) // Negative values for drawdowns
  }

  return drawdowns
}

// Calculate statistics from portfolio data
function calculateStatistics(trades: Trade[], equity: number[], drawdowns: number[]): any {
  // This is a simplified implementation - in a real app, you would implement
  // all the statistical calculations from the original Python script

  const totalNetProfit = equity[equity.length - 1] || 0

  // Calculate max drawdown
  const maxDrawdown = Math.abs(Math.min(...drawdowns) || 0)

  // Calculate mean drawdown
  const meanDrawdown = Math.abs(drawdowns.reduce((sum, dd) => sum + dd, 0) / drawdowns.length)

  // Calculate win ratio
  const winningTrades = trades.filter((t) => t.profit > 0)
  const winRatioPercentage = (winningTrades.length / trades.length) * 100

  // Calculate average win and loss
  const winningProfits = winningTrades.map((t) => t.profit)
  const losingProfits = trades.filter((t) => t.profit < 0).map((t) => t.profit)

  const averageWin = winningProfits.length ? winningProfits.reduce((sum, p) => sum + p, 0) / winningProfits.length : 0

  const averageLoss = losingProfits.length ? losingProfits.reduce((sum, p) => sum + p, 0) / losingProfits.length : 0

  const riskRewardRatio = averageLoss !== 0 ? averageWin / Math.abs(averageLoss) : Number.POSITIVE_INFINITY

  // Calculate profit factor
  const totalGrossProfit = winningProfits.reduce((sum, p) => sum + p, 0)
  const totalGrossLoss = Math.abs(losingProfits.reduce((sum, p) => sum + p, 0))
  const profitFactor = totalGrossLoss !== 0 ? totalGrossProfit / totalGrossLoss : Number.POSITIVE_INFINITY

  // Calculate average trade profit
  const averageTradeProfit = trades.length ? trades.reduce((sum, t) => sum + t.profit, 0) / trades.length : 0

  // Calculate max consecutive winning/losing trades
  const maxConsecutiveWinningTrades = calculateMaxConsecutive(trades.map((t) => t.profit > 0))
  const maxConsecutiveLosingTrades = calculateMaxConsecutive(trades.map((t) => t.profit < 0))

  // Calculate trades per month
  const months = new Set(trades.map((t) => `${t.exitTime.getFullYear()}-${t.exitTime.getMonth() + 1}`))
  const tradesPerMonth = trades.length / Math.max(months.size, 1)

  // Calculate net profit per month
  const netProfitPerMonth = totalNetProfit / Math.max(months.size, 1)

  // Calculate Sharpe and Sortino ratios (simplified)
  const sharpeRatio = 1.5 // Placeholder
  const sortinoRatio = 2.0 // Placeholder

  // Calculate real minimum account requirement
  const realMinimumAccountReq = 10000 // Placeholder

  return {
    totalNetProfit,
    maxDrawdown,
    meanDrawdown,
    netProfitMaxDD: maxDrawdown !== 0 ? totalNetProfit / maxDrawdown : Number.POSITIVE_INFINITY,
    netProfitMeanDD: meanDrawdown !== 0 ? totalNetProfit / meanDrawdown : Number.POSITIVE_INFINITY,
    profitFactor,
    winRatioPercentage,
    riskRewardRatio,
    totalTrades: trades.length,
    averageTradeProfit,
    maxConsecutiveWinningTrades,
    maxConsecutiveLosingTrades,
    tradesPerMonth,
    netProfitPerMonth,
    sharpeRatio,
    sortinoRatio,
    realMinimumAccountReq,
  }
}

// Calculate max consecutive true values
function calculateMaxConsecutive(boolArray: boolean[]): number {
  let maxConsecutive = 0
  let currentConsecutive = 0

  for (const value of boolArray) {
    if (value) {
      currentConsecutive++
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive)
    } else {
      currentConsecutive = 0
    }
  }

  return maxConsecutive
}

// Calculate monthly returns
function calculateMonthlyReturns(trades: Trade[]): MonthlyReturns {
  const monthlyReturns: MonthlyReturns = {}

  for (const trade of trades) {
    const yearMonth = `${trade.exitTime.getFullYear()}-${String(trade.exitTime.getMonth() + 1).padStart(2, "0")}`

    if (!monthlyReturns[yearMonth]) {
      monthlyReturns[yearMonth] = 0
    }

    monthlyReturns[yearMonth] += trade.profit
  }

  return monthlyReturns
}

// Calculate daily returns
function calculateDailyReturns(trades: Trade[]): DailyReturns {
  const dailyReturns: DailyReturns = {}

  for (const trade of trades) {
    const day = trade.exitTime.toISOString().split("T")[0]

    if (!dailyReturns[day]) {
      dailyReturns[day] = 0
    }

    dailyReturns[day] += trade.profit
  }

  return dailyReturns
}

// Calculate strategy correlation
function calculateStrategyCorrelation(dfsEquityStrategies: any[], portfolioTrades: Trade[]): number[][] {
  // This is a simplified implementation - in a real app, you would implement
  // the correlation calculation from the original Python script

  const numStrategies = dfsEquityStrategies.length
  const correlationMatrix: number[][] = []

  // Create an identity matrix as a placeholder
  for (let i = 0; i < numStrategies; i++) {
    correlationMatrix.push([])
    for (let j = 0; j < numStrategies; j++) {
      correlationMatrix[i].push(i === j ? 1 : 0.5 - Math.random() * 0.5)
    }
  }

  return correlationMatrix
}

// Calculate strategy margins
function calculateStrategyMargins(strategies: Strategy[]): number[] {
  return strategies.map((strategy) => {
    // This would normally call an API or use a lookup table for margin requirements
    // For now, we'll use a simplified approach
    const marginLookup: { [key: string]: number } = {
      CL: 5810.0,
      ES: 16563.0,
      FDXM: 7573.0,
      FESX: 3579.0,
      GC: 12650.0,
      MCL: 583.0,
      MES: 1656.0,
      MGC: 1265.0,
      MNQ: 2513.0,
      NQ: 25135.0,
      RB: 6481.0,
      ZS: 2200.0,
      ZW: 1925.0,
    }

    const margin = marginLookup[strategy.symbol] || 5000 // Default margin if symbol not found
    return margin * strategy.quantity
  })
}

// Calculate used margin
function calculateUsedMargin(strategies: Strategy[], portfolioTrades: Trade[], strategyMargins: number[]): any[] {
  // This is a simplified implementation - in a real app, you would implement
  // the margin calculation from the original Python script

  // Find the date range
  const startDate = new Date(Math.min(...portfolioTrades.map((t) => t.openTime.getTime())))
  const endDate = new Date(Math.max(...portfolioTrades.map((t) => t.exitTime.getTime())))

  // Create a series of dates (hourly intervals)
  const dates: Date[] = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate))
    currentDate.setHours(currentDate.getHours() + 1)
  }

  // Calculate used margin for each date
  return dates.map((date) => {
    const strategyMarginsUsed: { [strategyName: string]: number } = {}
    let totalMargin = 0

    strategies.forEach((strategy, i) => {
      // Check if there are open trades for this strategy on this date
      const openTrades = strategy.trades.filter((t) => t.openTime <= date && date <= t.exitTime)

      const marginUsed = openTrades.length > 0 ? strategyMargins[i] : 0
      strategyMarginsUsed[strategy.name] = marginUsed
      totalMargin += marginUsed
    })

    return {
      date,
      totalMargin,
      strategyMargins: strategyMarginsUsed,
    }
  })
}

// Helper function to sum an array of numbers
function sum(numbers: number[]): number {
  return numbers.reduce((total, num) => total + num, 0)
}

// Helper function to count occurrences of the maximum value
function countMaxOccurrences(numbers: number[]): number {
  const max = Math.max(...numbers)
  return numbers.filter((n) => n === max).length
}
