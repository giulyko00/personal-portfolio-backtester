import { BacktestDashboard } from "@/components/backtest-dashboard"

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          Portfolio Backtester
        </h1>

        <BacktestDashboard />

        <section className="mt-10 ml-16">
          <h3 className="font-semibold mb-4">
            #TODO
          </h3>
          <ul className="list-disc list-inside space-y-2 text-md">
            <li>Correlazione di Spearman vs Pearson</li>
            <li>Calcolo margini in USD/Euro</li>
            <li>
              Simulazione di eliminazione del 5% (o altro numero) dei best trades
              come stress/robustness test
            </li>
            <li>Aggiungere simulazione Monte Carlo (?)</li>
            <li>
              Algoritmo di ottimizzazione portafoglio in base alle strategie inserite,
              variando i pesi e massimizzando una metrica, mirando a un max drawdown percentuale
            </li>
          </ul>
        </section>
      </div>
    </main>
  )
}
