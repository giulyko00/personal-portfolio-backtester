import { Chart, registerables } from "chart.js"
import "chartjs-adapter-date-fns"
import type { PortfolioData } from "@/types/portfolio"
import { formatCurrency } from "@/lib/formatters"
import { calculateStrategyCorrelationMatrix } from "@/lib/correlation-utils"

// Register all Chart.js components
Chart.register(...registerables)

// Original chart creation functions
export function createEquityCurveChart(
  container: HTMLElement,
  portfolioData: PortfolioData,
  currency: "USD" | "EUR" = "USD",
): void {
  // Clear any existing chart
  container.innerHTML = ""
  const canvas = document.createElement("canvas")
  container.appendChild(canvas)

  // Prepare data for equity curve with time-based x-axis
  const labels = portfolioData.portfolioTrades.map((trade) => trade.exitTime)

  const datasets = [
    {
      label: "Portfolio Equity",
      data: portfolioData.portfolioEquity.map((equity, index) => ({
        x: portfolioData.portfolioTrades[index]?.exitTime,
        y: equity,
      })),
      borderColor: "rgba(0, 0, 0, 1)", // Black color for portfolio equity
      backgroundColor: "rgba(0, 0, 0, 0.1)",
      borderWidth: 3,
      fill: false,
      tension: 0.1,
      pointRadius: 0,
    },
    ...portfolioData.strategies.map((strategy, index) => ({
      label: strategy.name,
      data: strategy.equity.map((equity, tradeIndex) => ({
        x: strategy.trades[tradeIndex]?.exitTime,
        y: equity,
      })),
      borderColor: `hsl(${(index * 360) / portfolioData.strategies.length}, 70%, 50%)`,
      backgroundColor: `hsla(${(index * 360) / portfolioData.strategies.length}, 70%, 50%, 0.1)`,
      borderWidth: 1,
      fill: false,
      tension: 0.1,
      pointRadius: 0,
    })),
  ]

  new Chart(canvas, {
    type: "line",
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Equity Curves",
          font: { size: 16, weight: "bold" },
        },
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y, currency)}`,
          },
        },
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "month",
            displayFormats: {
              day: "MM/yyyy",
              month: "MM/yyyy",
            },
          },
          title: { display: true, text: "Date" },
        },
        y: {
          title: { display: true, text: `Equity (${currency})` },
          ticks: {
            callback: (value) => formatCurrency(value as number, currency),
          },
        },
      },
    },
  })
}

export function createDrawdownChart(
  container: HTMLElement,
  portfolioData: PortfolioData,
  currency: "USD" | "EUR" = "USD",
): void {
  // Clear any existing chart
  container.innerHTML = ""
  const canvas = document.createElement("canvas")
  container.appendChild(canvas)

  // Prepare data with time-based x-axis
  const data = portfolioData.drawdowns.map((drawdown, index) => ({
    x: portfolioData.portfolioTrades[index]?.exitTime,
    y: drawdown,
  }))

  new Chart(canvas, {
    type: "line",
    data: {
      datasets: [
        {
          label: "Drawdown",
          data: data,
          borderColor: "rgba(255, 99, 132, 1)",
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          borderWidth: 2,
          fill: true,
          tension: 0.1,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Drawdown Chart",
          font: { size: 16, weight: "bold" },
        },
        tooltip: {
          callbacks: {
            label: (context) => `Drawdown: ${formatCurrency(context.parsed.y, currency)}`,
          },
        },
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "month",
            displayFormats: {
              day: "MM/yyyy",
              month: "MM/yyyy",
            },
          },
          title: { display: true, text: "Date" },
        },
        y: {
          title: { display: true, text: `Drawdown (${currency})` },
          ticks: {
            callback: (value) => formatCurrency(value as number, currency),
          },
        },
      },
    },
  })
}

export function createMonthlyReturnsTable(
  container: HTMLElement,
  portfolioData: PortfolioData,
  currency: "USD" | "EUR" = "USD",
): void {
  const { monthlyReturns } = portfolioData

  // Group returns by year and month
  const yearMonthMap: { [year: string]: { [month: string]: number } } = {}

  Object.entries(monthlyReturns).forEach(([yearMonth, value]) => {
    const [year, month] = yearMonth.split("-")

    if (!yearMonthMap[year]) {
      yearMonthMap[year] = {}
    }

    yearMonthMap[year][month] = value
  })

  // Create the table HTML
  let tableHtml = `
    <table class="w-full text-sm">
      <thead>
        <tr>
          <th class="px-2 py-2 text-left bg-gray-100 dark:bg-gray-800">Year</th>
          <th class="px-2 py-2 text-right bg-gray-100 dark:bg-gray-800">Jan</th>
          <th class="px-2 py-2 text-right bg-gray-100 dark:bg-gray-800">Feb</th>
          <th class="px-2 py-2 text-right bg-gray-100 dark:bg-gray-800">Mar</th>
          <th class="px-2 py-2 text-right bg-gray-100 dark:bg-gray-800">Apr</th>
          <th class="px-2 py-2 text-right bg-gray-100 dark:bg-gray-800">May</th>
          <th class="px-2 py-2 text-right bg-gray-100 dark:bg-gray-800">Jun</th>
          <th class="px-2 py-2 text-right bg-gray-100 dark:bg-gray-800">Jul</th>
          <th class="px-2 py-2 text-right bg-gray-100 dark:bg-gray-800">Aug</th>
          <th class="px-2 py-2 text-right bg-gray-100 dark:bg-gray-800">Sep</th>
          <th class="px-2 py-2 text-right bg-gray-100 dark:bg-gray-800">Oct</th>
          <th class="px-2 py-2 text-right bg-gray-100 dark:bg-gray-800">Nov</th>
          <th class="px-2 py-2 text-right bg-gray-100 dark:bg-gray-800">Dec</th>
          <th class="px-2 py-2 text-right bg-gray-100 dark:bg-gray-800">Total</th>
        </tr>
      </thead>
      <tbody>
  `

  // Sort years in ascending order (oldest first)
  const years = Object.keys(yearMonthMap).sort((a, b) => Number.parseInt(a) - Number.parseInt(b))

  years.forEach((year) => {
    const monthData = yearMonthMap[year]
    let yearTotal = 0

    tableHtml += `<tr>
      <td class="px-2 py-2 font-medium">${year}</td>
    `

    for (let month = 1; month <= 12; month++) {
      const monthStr = String(month).padStart(2, "0")
      const value = monthData[monthStr] || 0
      yearTotal += value

      const cellClass =
        value > 0 ? "bg-green-100 dark:bg-green-900/30" : value < 0 ? "bg-red-100 dark:bg-red-900/30" : ""

      tableHtml += `
        <td class="px-2 py-2 text-right ${cellClass}">
          ${value ? formatCurrency(value, currency) : ""}
        </td>
      `
    }

    // Year total
    const totalCellClass =
      yearTotal > 0
        ? "bg-green-200 dark:bg-green-900/50 font-medium"
        : yearTotal < 0
          ? "bg-red-200 dark:bg-red-900/50 font-medium"
          : "font-medium"

    tableHtml += `
      <td class="px-2 py-2 text-right ${totalCellClass}">
        ${formatCurrency(yearTotal, currency)}
      </td>
    </tr>
    `
  })

  tableHtml += `
      </tbody>
    </table>
  `

  container.innerHTML = tableHtml
}

export function createCorrelationMatrix(
  container: HTMLElement,
  portfolioData: PortfolioData,
  correlationType: "pearson" | "spearman" = "pearson",
): void {
  // Clear any existing content
  container.innerHTML = ""

  // Create the control for switching the correlation type
  const controlsDiv = document.createElement("div")
  controlsDiv.className = "mb-4 flex items-center gap-4"

  const label = document.createElement("label")
  label.textContent = "Correlation Type:"
  label.className = "text-sm font-medium"

  const select = document.createElement("select")
  select.className = "px-3 py-1 border border-gray-300 rounded-md text-sm"
  select.innerHTML = `
    <option value="pearson" ${correlationType === "pearson" ? "selected" : ""}>Pearson</option>
    <option value="spearman" ${correlationType === "spearman" ? "selected" : ""}>Spearman</option>
  `

  select.addEventListener("change", (e) => {
    const newType = (e.target as HTMLSelectElement).value as "pearson" | "spearman"
    createCorrelationMatrix(container, portfolioData, newType)
  })

  controlsDiv.appendChild(label)
  controlsDiv.appendChild(select)
  container.appendChild(controlsDiv)

  // Recalculate the correlation matrix with the selected type
  const dfsEquityStrategies = portfolioData.strategies.map((s) => ({
    exitTime: s.trades.map((t) => t.exitTime),
    equity: s.equity,
  }))
  const correlationMatrix = calculateStrategyCorrelationMatrix(dfsEquityStrategies, correlationType)

  const table = document.createElement("table")
  table.className = "w-full text-xs"

  const thead = document.createElement("thead")
  const tbody = document.createElement("tbody")

  // Create header
  const headerRow = document.createElement("tr")
  headerRow.innerHTML = `<th class="px-2 py-1"></th>`
  portfolioData.strategies.forEach((strategy) => {
    headerRow.innerHTML += `<th class="px-2 py-1 text-center">${strategy.name.substring(0, 8)}</th>`
  })
  thead.appendChild(headerRow)

  // Create correlation matrix rows
  portfolioData.strategies.forEach((strategy, i) => {
    const row = document.createElement("tr")
    row.innerHTML = `<td class="px-2 py-1 font-medium">${strategy.name.substring(0, 8)}</td>`

    portfolioData.strategies.forEach((_, j) => {
      const correlation = correlationMatrix[i][j]
      let bgColor = "bg-white"

      if (correlation >= 0.7) bgColor = "bg-red-400"
      else if (correlation >= 0.3) bgColor = "bg-yellow-100"
      else if (correlation <= -0.3) bgColor = "bg-green-100"
      else if (correlation <= -0.7) bgColor = "bg-green-200"

      row.innerHTML += `<td class="px-2 py-1 text-center ${bgColor}">${correlation.toFixed(2)}</td>`
    })

    tbody.appendChild(row)
  })

  table.appendChild(thead)
  table.appendChild(tbody)
  container.appendChild(table)
}

export function createReturnsDistributionChart(
  container: HTMLElement,
  portfolioData: PortfolioData,
  currency: "USD" | "EUR" = "USD",
): void {
  // Clear any existing chart
  container.innerHTML = ""
  const canvas = document.createElement("canvas")
  container.appendChild(canvas)

  // Prepare data for histogram
  const returns = Object.values(portfolioData.monthlyReturns)
  const min = Math.min(...returns)
  const max = Math.max(...returns)
  const range = max - min
  const binWidth = range / 10 // 10 bins
  const bins: number[] = []

  for (let i = 0; i < 10; i++) {
    bins.push(min + i * binWidth)
  }
  bins.push(max)

  // Count values in each bin
  const counts: number[] = Array(bins.length - 1).fill(0)
  returns.forEach((value: number) => {
    for (let i = 0; i < bins.length - 1; i++) {
      if (value >= bins[i] && value < bins[i + 1]) {
        counts[i]++
        break
      }
    }
  })

  new Chart(canvas, {
    type: "bar",
    data: {
      labels: bins
        .slice(0, -1)
        .map((bin, i) => `${formatCurrency(bin, currency)} - ${formatCurrency(bins[i + 1], currency)}`),
      datasets: [
        {
          label: "Monthly Returns Distribution",
          data: counts,
          backgroundColor: "rgba(54, 162, 235, 0.7)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Monthly Returns Distribution",
          font: { size: 16, weight: "bold" },
        },
      },
      scales: {
        x: {
          title: { display: true, text: `Monthly Returns (${currency})` },
          ticks: { maxRotation: 45 },
        },
        y: {
          title: { display: true, text: "Frequency" },
        },
      },
    },
  })
}

export function createUsedMarginsChart(
  container: HTMLElement,
  portfolioData: PortfolioData,
  currency: "USD" | "EUR" = "USD",
): void {
  // Clear any existing chart
  container.innerHTML = ""
  const canvas = document.createElement("canvas")
  container.appendChild(canvas)

  const labels = portfolioData.usedMargins.map((margin) => margin.date.toISOString().split("T")[0])

  // Calculate sum of all strategy margins (constant line)
  const sumOfMargins = portfolioData.margins.strategyMargins.reduce((sum, margin) => sum + margin, 0)

  new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Used Margin",
          data: portfolioData.usedMargins.map((margin) => margin.totalMargin),
          borderColor: "rgba(255, 159, 64, 1)",
          backgroundColor: "rgba(255, 159, 64, 0.2)",
          borderWidth: 2,
          fill: true,
          tension: 0.1,
          pointRadius: 0,
        },
        {
          label: "Sum of Margins",
          data: portfolioData.usedMargins.map(() => sumOfMargins),
          borderColor: "rgba(255, 99, 132, 1)",
          backgroundColor: "rgba(255, 99, 132, 0.1)",
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          tension: 0,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Used Margins Over Time",
          font: { size: 16, weight: "bold" },
        },
        tooltip: {
          callbacks: {
            label: (context) => `Used Margin: ${formatCurrency(context.parsed.y, currency)}`,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Date" },
          ticks: { maxTicksLimit: 10 },
        },
        y: {
          title: { display: true, text: `Used Margin (${currency})` },
          ticks: {
            callback: (value) => formatCurrency(value as number, currency),
          },
        },
      },
    },
  })
}

export function createSingleStrategyCharts(
  container: HTMLElement,
  portfolioData: PortfolioData,
  currency: "USD" | "EUR" = "USD",
): void {
  // Clear any existing content
  container.innerHTML = ""

  portfolioData.strategies.forEach((strategy, index) => {
    const chartContainer = document.createElement("div")
    chartContainer.style.height = "384px" // 320px equivale a h-80 in Tailwind

    const canvas = document.createElement("canvas")
    chartContainer.appendChild(canvas)
    container.appendChild(chartContainer)

    // Prepare data with time-based x-axis
    const data = strategy.equity.map((equity, tradeIndex) => ({
      x: strategy.trades[tradeIndex]?.exitTime,
      y: equity,
    }))

    new Chart(canvas, {
      type: "line",
      data: {
        datasets: [
          {
            label: strategy.name,
            data: data,
            borderColor: `hsl(${(index * 360) / portfolioData.strategies.length}, 70%, 50%)`,
            backgroundColor: `hsla(${(index * 360) / portfolioData.strategies.length}, 70%, 50%, 0.1)`,
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `${strategy.name} - Net Profit: ${formatCurrency(strategy.netProfit, currency)}`,
            font: { size: 14, weight: "bold" },
          },
          tooltip: {
            callbacks: {
              label: (context) => `Equity: ${formatCurrency(context.parsed.y, currency)}`,
            },
          },
        },
        scales: {
          x: {
            type: "time",
            time: {
              unit: "month",
              displayFormats: {
                day: "MM/yyyy",
                month: "MM/yyyy",
              },
            },
            title: { display: true, text: "Date" },
          },
          y: {
            title: { display: true, text: `Equity (${currency})` },
            ticks: {
              callback: (value) => formatCurrency(value as number, currency),
            },
          },
        },
      },
    })
  })
}

// Monte Carlo chart creation functions
export function createMonteCarloCharts(
  monteCarloContainer: HTMLElement,
  drawdownDistributionContainer: HTMLElement,
  finalEquityDistributionContainer: HTMLElement,
  results: any,
  currency: "USD" | "EUR" = "USD",
): void {
  createMonteCarloEquityCurves(monteCarloContainer, results, currency)
  createDrawdownDistributionChart(drawdownDistributionContainer, results, currency)
  createFinalEquityDistributionChart(finalEquityDistributionContainer, results, currency)
}

function createMonteCarloEquityCurves(container: HTMLElement, results: any, currency: "USD" | "EUR" = "USD"): void {
  // Clear any existing chart
  container.innerHTML = ""
  const canvas = document.createElement("canvas")
  container.appendChild(canvas)

  // Prepare data
  const equityCurves = results.equityCurves
  const numPoints = equityCurves[0]?.length || 0

  // Create x-axis labels (trade numbers)
  const labels = Array.from({ length: numPoints }, (_, i) => i + 1)

  // Calculate percentile curves
  const percentiles = [0.05, 0.25, 0.5, 0.75, 0.95]
  const percentileCurves: number[][] = []

  for (let i = 0; i < numPoints; i++) {
    const pointValues = equityCurves.map((curve) => curve[i] || 0)
    const sortedValues = [...pointValues].sort((a, b) => a - b)

    const percentileValues = percentiles.map((p) => {
      const index = Math.floor(p * sortedValues.length)
      return sortedValues[index] || 0
    })

    percentileValues.forEach((value, pIndex) => {
      if (!percentileCurves[pIndex]) {
        percentileCurves[pIndex] = []
      }
      percentileCurves[pIndex].push(value)
    })
  }

  // Create datasets for the chart
  const datasets = [
    {
      label: "95th Percentile",
      data: percentileCurves[4],
      borderColor: "rgba(0, 200, 0, 1)",
      backgroundColor: "rgba(0, 200, 0, 0.1)",
      borderWidth: 2,
      fill: "+1",
      tension: 0.1,
      pointRadius: 0,
    },
    {
      label: "75th Percentile",
      data: percentileCurves[3],
      borderColor: "rgba(0, 150, 0, 1)",
      backgroundColor: "rgba(0, 150, 0, 0.1)",
      borderWidth: 2,
      fill: "+1",
      tension: 0.1,
      pointRadius: 0,
    },
    {
      label: "Median (50th)",
      data: percentileCurves[2],
      borderColor: "rgba(0, 0, 0, 1)",
      backgroundColor: "rgba(0, 0, 0, 0.1)",
      borderWidth: 3,
      fill: "+1",
      tension: 0.1,
      pointRadius: 0,
    },
    {
      label: "25th Percentile",
      data: percentileCurves[1],
      borderColor: "rgba(200, 0, 0, 0.7)",
      backgroundColor: "rgba(200, 0, 0, 0.1)",
      borderWidth: 2,
      fill: "+1",
      tension: 0.1,
      pointRadius: 0,
    },
    {
      label: "5th Percentile",
      data: percentileCurves[0],
      borderColor: "rgba(200, 0, 0, 1)",
      backgroundColor: "rgba(200, 0, 0, 0.1)",
      borderWidth: 2,
      fill: false,
      tension: 0.1,
      pointRadius: 0,
    },
  ]

  // Create the chart
  new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `Monte Carlo Simulation - ${results.timeframe} Projection`,
          font: {
            size: 16,
            weight: "bold",
          },
        },
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y, currency)}`,
          },
        },
        legend: {
          position: "top",
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Trade Number",
          },
        },
        y: {
          title: {
            display: true,
            text: `Equity (${currency})`,
          },
          ticks: {
            callback: (value) => formatCurrency(value as number, currency),
          },
        },
      },
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: false,
      },
    },
  })
}

function createDrawdownDistributionChart(container: HTMLElement, results: any, currency: "USD" | "EUR" = "USD"): void {
  // Clear any existing chart
  container.innerHTML = ""
  const canvas = document.createElement("canvas")
  container.appendChild(canvas)

  // Prepare data for histogram
  const maxDrawdowns = results.maxDrawdowns
  const min = Math.min(...maxDrawdowns)
  const max = Math.max(...maxDrawdowns)
  const range = max - min
  const binWidth = range / 20 // 20 bins
  const bins: number[] = []

  for (let i = 0; i < 20; i++) {
    bins.push(min + i * binWidth)
  }
  bins.push(max)

  // Count values in each bin
  const counts: number[] = Array(bins.length - 1).fill(0)
  maxDrawdowns.forEach((value: number) => {
    for (let i = 0; i < bins.length - 1; i++) {
      if (value >= bins[i] && value < bins[i + 1]) {
        counts[i]++
        break
      }
    }
  })

  // Create the chart
  new Chart(canvas, {
    type: "bar",
    data: {
      labels: bins
        .slice(0, -1)
        .map((bin, i) => `${formatCurrency(bin, currency)} - ${formatCurrency(bins[i + 1], currency)}`),
      datasets: [
        {
          label: "Maximum Drawdown Distribution",
          data: counts,
          backgroundColor: "rgba(255, 99, 132, 0.7)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Maximum Drawdown Distribution",
          font: {
            size: 16,
            weight: "bold",
          },
        },
        tooltip: {
          callbacks: {
            label: (context) =>
              `Count: ${context.parsed.y} (${((context.parsed.y / maxDrawdowns.length) * 100).toFixed(1)}%)`,
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: `Maximum Drawdown (${currency})`,
          },
          ticks: {
            maxRotation: 90,
            minRotation: 45,
            callback: (value, index) => {
              // Show fewer labels for readability
              return index % 4 === 0 ? formatCurrency(bins[index as number], currency) : ""
            },
          },
        },
        y: {
          title: {
            display: true,
            text: "Frequency",
          },
        },
      },
    },
  })
}

function createFinalEquityDistributionChart(
  container: HTMLElement,
  results: any,
  currency: "USD" | "EUR" = "USD",
): void {
  // Clear any existing chart
  container.innerHTML = ""
  const canvas = document.createElement("canvas")
  container.appendChild(canvas)

  // Prepare data for histogram
  const finalEquities = results.finalEquities
  const min = Math.min(...finalEquities)
  const max = Math.max(...finalEquities)
  const range = max - min
  const binWidth = range / 20 // 20 bins
  const bins: number[] = []

  for (let i = 0; i < 20; i++) {
    bins.push(min + i * binWidth)
  }
  bins.push(max)

  // Count values in each bin
  const counts: number[] = Array(bins.length - 1).fill(0)
  finalEquities.forEach((value: number) => {
    for (let i = 0; i < bins.length - 1; i++) {
      if (value >= bins[i] && value < bins[i + 1]) {
        counts[i]++
        break
      }
    }
  })

  // Create the chart
  new Chart(canvas, {
    type: "bar",
    data: {
      labels: bins
        .slice(0, -1)
        .map((bin, i) => `${formatCurrency(bin, currency)} - ${formatCurrency(bins[i + 1], currency)}`),
      datasets: [
        {
          label: "Final Equity Distribution",
          data: counts,
          backgroundColor: "rgba(54, 162, 235, 0.7)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Final Equity Distribution",
          font: {
            size: 16,
            weight: "bold",
          },
        },
        tooltip: {
          callbacks: {
            label: (context) =>
              `Count: ${context.parsed.y} (${((context.parsed.y / finalEquities.length) * 100).toFixed(1)}%)`,
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: `Final Equity (${currency})`,
          },
          ticks: {
            maxRotation: 90,
            minRotation: 45,
            callback: (value, index) => {
              // Show fewer labels for readability
              return index % 4 === 0 ? formatCurrency(bins[index as number], currency) : ""
            },
          },
        },
        y: {
          title: {
            display: true,
            text: "Frequency",
          },
        },
      },
    },
  })
}
