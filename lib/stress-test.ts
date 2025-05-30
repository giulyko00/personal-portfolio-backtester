import type { PortfolioData, Strategy, Trade } from "@/types/portfolio"

export interface StressTestResult {
  originalData: PortfolioData
  stressedData: PortfolioData
  removedTradesCount: number
  removedTradesValue: number
  impactOnNetProfit: number
  impactOnMaxDrawdown: number
  impactOnProfitFactor: number
  impactOnWinRatio: number
  impactOnSharpeRatio: number
}

// Funzione principale per eseguire lo stress test
export async function runStressTest(
  portfolioData: PortfolioData,
  removalPercentage = 5,
  marginType: "intraday" | "overnight" = "intraday",
): Promise<StressTestResult> {
  // Identifica i migliori trade (per profitto)
  const allTrades = portfolioData.portfolioTrades.slice()
  const bestTrades = allTrades.filter((trade) => trade.profit > 0).sort((a, b) => b.profit - a.profit)

  const tradesToRemove = Math.floor(bestTrades.length * (removalPercentage / 100))
  const removedTrades = bestTrades.slice(0, tradesToRemove)
  const removedTradesValue = removedTrades.reduce((sum, trade) => sum + trade.profit, 0)

  // Crea nuove strategie senza i trade rimossi
  const stressedStrategies: Strategy[] = portfolioData.strategies.map((strategy) => {
    const filteredTrades = strategy.trades.filter(
      (trade) =>
        !removedTrades.some(
          (removedTrade) =>
            removedTrade.openTime.getTime() === trade.openTime.getTime() &&
            removedTrade.exitTime.getTime() === trade.exitTime.getTime() &&
            removedTrade.profit === trade.profit,
        ),
    )

    // Ricalcola l'equity curve
    const equity: number[] = []
    let cumulativeProfit = 0
    for (const trade of filteredTrades) {
      cumulativeProfit += trade.profit
      equity.push(cumulativeProfit)
    }

    return {
      ...strategy,
      trades: filteredTrades,
      equity,
      netProfit: equity[equity.length - 1] || 0,
    }
  })

  // Ricalcola i dati del portfolio
  const stressedPortfolioTrades = stressedStrategies
    .flatMap((s) => s.trades)
    .sort((a, b) => a.exitTime.getTime() - b.exitTime.getTime())

  const stressedPortfolioEquity: number[] = []
  let cumulativeProfit = 0
  for (const trade of stressedPortfolioTrades) {
    cumulativeProfit += trade.profit
    stressedPortfolioEquity.push(cumulativeProfit)
  }

  // Ricalcola drawdowns
  const stressedDrawdowns: number[] = []
  let peak = stressedPortfolioEquity[0] || 0
  for (const value of stressedPortfolioEquity) {
    if (value > peak) {
      peak = value
    }
    const drawdown = value - peak
    stressedDrawdowns.push(drawdown)
  }

  // Ricalcola statistiche
  const stressedStatistics = calculateStressedStatistics(
    stressedPortfolioTrades,
    stressedPortfolioEquity,
    stressedDrawdowns,
  )

  // Ricalcola monthly returns
  const stressedMonthlyReturns: Record<string, number> = {}
  for (const trade of stressedPortfolioTrades) {
    const date = trade.exitTime
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    if (!stressedMonthlyReturns[yearMonth]) {
      stressedMonthlyReturns[yearMonth] = 0
    }
    stressedMonthlyReturns[yearMonth] += trade.profit
  }

  // Ricalcola daily returns
  const stressedDailyReturns: Record<string, number> = {}
  for (const trade of stressedPortfolioTrades) {
    const date = trade.exitTime
    const day = date.toISOString().split("T")[0]
    if (!stressedDailyReturns[day]) {
      stressedDailyReturns[day] = 0
    }
    stressedDailyReturns[day] += trade.profit
  }

  // Ricalcola correlation matrix
  const dfsEquityStrategies = stressedStrategies.map((s) => ({
    exitTime: s.trades.map((t) => t.exitTime),
    equity: s.equity,
  }))
  const stressedCorrelationMatrix = calculateStrategyCorrelation(dfsEquityStrategies, stressedPortfolioTrades)

  // Usa i margini originali (non cambiano)
  const stressedData: PortfolioData = {
    strategies: stressedStrategies,
    portfolioTrades: stressedPortfolioTrades,
    portfolioEquity: stressedPortfolioEquity,
    drawdowns: stressedDrawdowns,
    statistics: stressedStatistics,
    monthlyReturns: stressedMonthlyReturns,
    dailyReturns: stressedDailyReturns,
    correlationMatrix: stressedCorrelationMatrix,
    margins: portfolioData.margins, // Mantieni i margini originali
    usedMargins: portfolioData.usedMargins, // Mantieni i margini utilizzati originali
  }

  // Calcola gli impatti
  const impactOnNetProfit =
    ((stressedStatistics.totalNetProfit - portfolioData.statistics.totalNetProfit) /
      portfolioData.statistics.totalNetProfit) *
    100
  const impactOnMaxDrawdown =
    ((stressedStatistics.maxDrawdown - portfolioData.statistics.maxDrawdown) / portfolioData.statistics.maxDrawdown) *
    100
  const impactOnProfitFactor =
    ((stressedStatistics.profitFactor - portfolioData.statistics.profitFactor) /
      portfolioData.statistics.profitFactor) *
    100
  const impactOnWinRatio =
    ((stressedStatistics.winRatioPercentage - portfolioData.statistics.winRatioPercentage) /
      portfolioData.statistics.winRatioPercentage) *
    100
  const impactOnSharpeRatio =
    ((stressedStatistics.sharpeRatio - portfolioData.statistics.sharpeRatio) / portfolioData.statistics.sharpeRatio) *
    100

  return {
    originalData: portfolioData,
    stressedData,
    removedTradesCount: tradesToRemove,
    removedTradesValue,
    impactOnNetProfit,
    impactOnMaxDrawdown,
    impactOnProfitFactor,
    impactOnWinRatio,
    impactOnSharpeRatio,
  }
}

// Funzione helper per calcolare le statistiche stressate
function calculateStressedStatistics(trades: Trade[], equity: number[], drawdowns: number[]): any {
  const totalNetProfit = equity.length > 0 ? equity[equity.length - 1] : 0
  const maxDrawdown = Math.abs(Math.min(...drawdowns, 0))
  const meanDrawdown = Math.abs(
    drawdowns.filter((d) => d < 0).reduce((sum, d) => sum + d, 0) / drawdowns.filter((d) => d < 0).length || 0,
  )

  const grossProfit = trades.filter((t) => t.profit > 0).reduce((sum, t) => sum + t.profit, 0)
  const grossLoss = Math.abs(trades.filter((t) => t.profit < 0).reduce((sum, t) => sum + t.profit, 0))
  const profitFactor = grossLoss === 0 ? Number.POSITIVE_INFINITY : grossProfit / grossLoss

  const winCount = trades.filter((t) => t.profit > 0).length
  const winRatioPercentage = (winCount / trades.length) * 100 || 0

  const avgWin = grossProfit / winCount || 0
  const avgLoss = grossLoss / (trades.length - winCount) || 0
  const riskRewardRatio = avgLoss === 0 ? Number.POSITIVE_INFINITY : avgWin / avgLoss

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

  const firstDate = trades.length > 0 ? trades[0].exitTime : new Date()
  const lastDate = trades.length > 0 ? trades[trades.length - 1].exitTime : new Date()
  const monthsDiff =
    (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + lastDate.getMonth() - firstDate.getMonth() + 1
  const tradesPerMonth = trades.length / monthsDiff || 0
  const netProfitPerMonth = totalNetProfit / monthsDiff || 0

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
    realMinimumAccountReq: 0, // Sarà calcolato dopo
  }
}

// Funzione helper per calcolare la correlazione tra strategie
function calculateStrategyCorrelation(
  dfsEquityStrategies: Array<{ exitTime: Date[]; equity: number[] }>,
  portfolioTrades: Trade[],
): number[][] {
  const numStrategies = dfsEquityStrategies.length
  const correlationMatrix: number[][] = Array(numStrategies)
    .fill(0)
    .map(() => Array(numStrategies).fill(0))

  for (let i = 0; i < numStrategies; i++) {
    correlationMatrix[i][i] = 1
  }

  for (let i = 0; i < numStrategies; i++) {
    for (let j = i + 1; j < numStrategies; j++) {
      const strategy1 = dfsEquityStrategies[i]
      const strategy2 = dfsEquityStrategies[j]

      const returns1: number[] = []
      const returns2: number[] = []

      for (let k = 1; k < strategy1.equity.length; k++) {
        returns1.push(strategy1.equity[k] - strategy1.equity[k - 1])
      }

      for (let k = 1; k < strategy2.equity.length; k++) {
        returns2.push(strategy2.equity[k] - strategy2.equity[k - 1])
      }

      if (returns1.length > 1 && returns2.length > 1) {
        const correlation = calculateCorrelation(returns1, returns2)
        correlationMatrix[i][j] = correlation
        correlationMatrix[j][i] = correlation
      }
    }
  }

  return correlationMatrix
}

// Funzione helper per calcolare la correlazione tra due array
function calculateCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length)
  if (n <= 1) return 0

  const meanX = x.reduce((sum, val) => sum + val, 0) / n
  const meanY = y.reduce((sum, val) => sum + val, 0) / n

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

  if (varX === 0 || varY === 0) return 0
  return covariance / (Math.sqrt(varX) * Math.sqrt(varY))
}
