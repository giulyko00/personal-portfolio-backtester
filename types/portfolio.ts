export interface Trade {
  openTime: Date
  exitTime: Date
  profit: number
}

export interface Strategy {
  name: string
  symbol: string
  quantity: number
  trades: Trade[]
  equity: number[]
  netProfit: number
}

export interface Statistics {
  totalNetProfit: number
  maxDrawdown: number
  meanDrawdown: number
  netProfitMaxDD: number
  netProfitMeanDD: number
  profitFactor: number
  winRatioPercentage: number
  riskRewardRatio: number
  totalTrades: number
  averageTradeProfit: number
  maxConsecutiveWinningTrades: number
  maxConsecutiveLosingTrades: number
  tradesPerMonth: number
  netProfitPerMonth: number
  sharpeRatio: number
  sortinoRatio: number
  realMinimumAccountReq: number
  maxDrawdownDate?: Date
  maxCumulativeHigh?: number
}

export interface MonthlyReturns {
  [yearMonth: string]: number
}

export interface DailyReturns {
  [day: string]: number
}

export interface Margins {
  strategyMargins: number[]
  minimumAccountRequired: number
  maxUsedMargin: number
  maxUsedMarginOccurrences: number
  maxUsedMarginFirstDate: string
}

export interface UsedMargin {
  date: Date
  totalMargin: number
  strategyMargins: { [strategyName: string]: number }
}

export interface PortfolioData {
  strategies: Strategy[]
  portfolioTrades: Trade[]
  portfolioEquity: number[]
  drawdowns: number[]
  statistics: Statistics
  monthlyReturns: MonthlyReturns
  dailyReturns: DailyReturns
  correlationMatrix: number[][]
  margins: Margins
  usedMargins: UsedMargin[]
}
