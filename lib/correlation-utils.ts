// Funzioni per calcolare diversi tipi di correlazione

export type CorrelationType = "pearson" | "spearman"

// Calcola la correlazione di Pearson
export function calculatePearsonCorrelation(x: number[], y: number[]): number {
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

// Calcola la correlazione di Spearman
export function calculateSpearmanCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length)
  if (n <= 1) return 0

  // Crea array di indici per il ranking
  const xRanks = getRanks(x.slice(0, n))
  const yRanks = getRanks(y.slice(0, n))

  // Calcola la correlazione di Pearson sui ranks
  return calculatePearsonCorrelation(xRanks, yRanks)
}

// Funzione helper per calcolare i ranks
function getRanks(values: number[]): number[] {
  const n = values.length
  const indexed = values.map((value, index) => ({ value, index }))

  // Ordina per valore
  indexed.sort((a, b) => a.value - b.value)

  const ranks = new Array(n)

  // Assegna i ranks gestendo i ties (valori uguali)
  for (let i = 0; i < n; i++) {
    let j = i
    // Trova tutti i valori uguali
    while (j < n - 1 && indexed[j].value === indexed[j + 1].value) {
      j++
    }

    // Calcola il rank medio per i ties
    const avgRank = (i + j + 2) / 2 // +2 perché i ranks iniziano da 1

    // Assegna il rank medio a tutti i valori uguali
    for (let k = i; k <= j; k++) {
      ranks[indexed[k].index] = avgRank
    }

    i = j
  }

  return ranks
}

// Calcola la matrice di correlazione per le strategie
export function calculateStrategyCorrelationMatrix(
  dfsEquityStrategies: Array<{ exitTime: Date[]; equity: number[] }>,
  correlationType: CorrelationType = "pearson",
): number[][] {
  const numStrategies = dfsEquityStrategies.length
  const correlationMatrix: number[][] = Array(numStrategies)
    .fill(0)
    .map(() => Array(numStrategies).fill(0))

  // Riempi la diagonale con 1s (auto-correlazione)
  for (let i = 0; i < numStrategies; i++) {
    correlationMatrix[i][i] = 1
  }

  // Calcola la correlazione tra ogni coppia di strategie
  for (let i = 0; i < numStrategies; i++) {
    for (let j = i + 1; j < numStrategies; j++) {
      const strategy1 = dfsEquityStrategies[i]
      const strategy2 = dfsEquityStrategies[j]

      // Calcola i rendimenti per entrambe le strategie
      const returns1: number[] = []
      const returns2: number[] = []

      for (let k = 1; k < strategy1.equity.length; k++) {
        returns1.push(strategy1.equity[k] - strategy1.equity[k - 1])
      }

      for (let k = 1; k < strategy2.equity.length; k++) {
        returns2.push(strategy2.equity[k] - strategy2.equity[k - 1])
      }

      // Calcola la correlazione se abbiamo abbastanza dati
      if (returns1.length > 1 && returns2.length > 1) {
        const correlation =
          correlationType === "pearson"
            ? calculatePearsonCorrelation(returns1, returns2)
            : calculateSpearmanCorrelation(returns1, returns2)

        correlationMatrix[i][j] = correlation
        correlationMatrix[j][i] = correlation // La matrice è simmetrica
      }
    }
  }

  return correlationMatrix
}
