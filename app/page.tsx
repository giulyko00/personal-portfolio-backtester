import { BacktestDashboard } from "@/components/backtest-dashboard"

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Portfolio Backtester</h1>
        <BacktestDashboard />
      </div>
    </main>
  )
}
