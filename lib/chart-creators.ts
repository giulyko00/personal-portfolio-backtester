"use client"

import { Chart, registerables } from "chart.js"
import { formatCurrency, formatNumber } from "@/lib/formatters"
import type { PortfolioData } from "@/types/portfolio"
import "chartjs-adapter-date-fns"

// Register all Chart.js components
Chart.register(...registerables)

// Color palette for strategies
const STRATEGY_COLORS = [
  "rgb(54, 162, 235)",
  "rgb(255, 99, 132)",
  "rgb(75, 192, 192)",
  "rgb(255, 159, 64)",
  "rgb(153, 102, 255)",
  "rgb(255, 205, 86)",
  "rgb(201, 203, 207)",
  "rgb(0, 128, 0)",
  "rgb(139, 0, 0)",
  "rgb(0, 0, 139)",
]

export function createEquityCurveChart(container: HTMLElement, portfolioData: PortfolioData): void {
  const { portfolioTrades, portfolioEquity, strategies } = portfolioData

  // Clear any existing chart
  container.innerHTML = ""
  const canvas = document.createElement("canvas")
  container.appendChild(canvas)

  // Prepare datasets
  const datasets = [
    {
      label: "Portfolio",
      data: portfolioEquity.map((value, index) => ({
        x: portfolioTrades[index]?.exitTime,
        y: value,
      })),
      borderColor: "rgb(0, 0, 0)",
      backgroundColor: "rgba(0, 0, 0, 0.1)",
      borderWidth: 2,
      tension: 0.1,
      fill: false,
      pointRadius: 0,
      pointHoverRadius: 3,
    },
  ]

  // Add datasets for each strategy
  strategies.forEach((strategy, index) => {
    datasets.push({
      label: strategy.name,
      data: strategy.equity.map((value, i) => ({
        x: strategy.trades[i]?.exitTime,
        y: value,
      })),
      borderColor: STRATEGY_COLORS[index % STRATEGY_COLORS.length],
      backgroundColor: `${STRATEGY_COLORS[index % STRATEGY_COLORS.length].replace("rgb", "rgba").replace(")", ", 0.1)")}`,
      borderWidth: 1.5,
      tension: 0.1,
      fill: false,
      pointRadius: 0,
      pointHoverRadius: 3,
    })
  })

  // Create the chart
  new Chart(canvas, {
    type: "line",
    data: {
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Equity Curve",
          font: {
            size: 16,
            weight: "bold",
          },
        },
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`,
          },
        },
        legend: {
          position: "top",
        },
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "month",
            tooltipFormat: "MMM d, yyyy",
          },
          title: {
            display: true,
            text: "Date",
          },
        },
        y: {
          title: {
            display: true,
            text: "Equity ($)",
          },
          ticks: {
            callback: (value) => formatCurrency(value as number),
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

// Modifica la funzione createDrawdownChart per utilizzare un grafico a linee invece di barre
export function createDrawdownChart(container: HTMLElement, portfolioData: PortfolioData): void {
  const { portfolioTrades, drawdowns } = portfolioData

  // Clear any existing chart
  container.innerHTML = ""
  const canvas = document.createElement("canvas")
  container.appendChild(canvas)

  // Create the chart
  new Chart(canvas, {
    type: "line",
    data: {
      datasets: [
        {
          label: "Drawdown",
          data: drawdowns.map((value, index) => ({
            x: portfolioTrades[index]?.exitTime,
            y: value,
          })),
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 2,
          fill: true,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Drawdown",
          font: {
            size: 14,
            weight: "bold",
          },
        },
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            label: (context) => `Drawdown: ${formatCurrency(context.parsed.y)}`,
          },
        },
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "month",
            tooltipFormat: "MMM d, yyyy",
          },
          title: {
            display: false,
            text: "Date",
          },
        },
        y: {
          title: {
            display: true,
            text: "Drawdown ($)",
          },
          ticks: {
            callback: (value) => formatCurrency(value as number),
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

export function createMonthlyReturnsTable(container: HTMLElement, portfolioData: PortfolioData): void {
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
          ${value ? formatCurrency(value) : ""}
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
        ${formatCurrency(yearTotal)}
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

export function createCorrelationMatrix(container: HTMLElement, portfolioData: PortfolioData): void {
  const { correlationMatrix, strategies } = portfolioData

  // Create a table-based visualization instead of using an unsupported chart type
  container.innerHTML = ""

  // Create the correlation matrix HTML
  let matrixHtml = `
    <table class="w-full text-sm">
      <thead>
        <tr>
          <th class="px-2 py-2 text-left bg-gray-100 dark:bg-gray-800"></th>
          ${strategies
            .map(
              (strategy, i) => `
            <th class="px-2 py-2 text-center bg-gray-100 dark:bg-gray-800">S${i + 1}</th>
          `,
            )
            .join("")}
        </tr>
      </thead>
      <tbody>
  `

  strategies.forEach((strategy, i) => {
    matrixHtml += `
      <tr>
        <td class="px-2 py-2 font-medium bg-gray-100 dark:bg-gray-800">S${i + 1}</td>
    `

    correlationMatrix[i].forEach((correlation, j) => {
      // Determine cell color based on correlation value
      let cellClass = ""

      if (i === j) {
        cellClass = "bg-gray-200 dark:bg-gray-700"
      } else if (correlation >= 0.7) {
        cellClass = "bg-red-200 dark:bg-red-900/50"
      } else if (correlation >= 0.3) {
        cellClass = "bg-yellow-100 dark:bg-yellow-900/30"
      } else if (correlation <= -0.3) {
        cellClass = "bg-green-100 dark:bg-green-900/30"
      } else if (correlation <= -0.7) {
        cellClass = "bg-green-200 dark:bg-green-900/50"
      }

      matrixHtml += `
        <td class="px-2 py-2 text-center ${cellClass}">
          ${formatNumber(correlation)}
        </td>
      `
    })

    matrixHtml += `</tr>`
  })

  matrixHtml += `
      </tbody>
    </table>
  `

  // No legend here as it's now in the CardHeader

  container.innerHTML = matrixHtml
}

export function createReturnsDistributionChart(container: HTMLElement, portfolioData: PortfolioData): void {
  const { monthlyReturns } = portfolioData
  const returns = Object.values(monthlyReturns)

  // Clear any existing chart
  container.innerHTML = ""
  const canvas = document.createElement("canvas")
  container.appendChild(canvas)

  // Calculate mean and standard deviation for Gaussian overlay
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length
  const stdDev = Math.sqrt(returns.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / returns.length)

  // Generate bins for histogram
  const min = Math.min(...returns)
  const max = Math.max(...returns)
  const range = max - min
  const binWidth = range / 20 // 20 bins
  const bins: number[] = []

  for (let i = 0; i < 20; i++) {
    bins.push(min + i * binWidth)
  }
  bins.push(max)

  // Count values in each bin
  const counts: number[] = Array(bins.length - 1).fill(0)
  returns.forEach((value) => {
    for (let i = 0; i < bins.length - 1; i++) {
      if (value >= bins[i] && value < bins[i + 1]) {
        counts[i]++
        break
      }
    }
  })

  // Normalize counts to get probability density
  const density = counts.map((count) => count / (returns.length * binWidth))

  // Generate Gaussian curve
  const gaussianX: number[] = []
  const gaussianY: number[] = []
  const step = range / 100

  for (let x = min; x <= max; x += step) {
    gaussianX.push(x)
    gaussianY.push((1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2)))
  }

  // Create the chart
  new Chart(canvas, {
    type: "bar",
    data: {
      labels: bins.slice(0, -1).map((bin, i) => `${formatCurrency(bin)} - ${formatCurrency(bins[i + 1])}`),
      datasets: [
        {
          label: "Monthly Returns Distribution",
          data: density,
          backgroundColor: "rgba(255, 159, 64, 0.7)",
          borderColor: "rgba(255, 159, 64, 1)",
          borderWidth: 1,
        },
        {
          label: "Gaussian Distribution",
          data: gaussianY,
          type: "line",
          pointRadius: 0,
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 2,
          fill: false,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Monthly Returns Distribution with Gaussian Overlay",
          font: {
            size: 16,
            weight: "bold",
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              if (context.datasetIndex === 0) {
                return `Frequency: ${formatNumber(context.parsed.y * returns.length * binWidth)}`
              } else {
                return `Gaussian: ${formatNumber(context.parsed.y)}`
              }
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Monthly Return ($)",
          },
          ticks: {
            maxRotation: 90,
            minRotation: 45,
            callback: (value, index) => {
              // Show fewer labels for readability
              return index % 4 === 0 ? formatCurrency(bins[index as number]) : ""
            },
          },
        },
        y: {
          title: {
            display: true,
            text: "Probability Density",
          },
        },
      },
    },
  })
}

export function createUsedMarginsChart(container: HTMLElement, portfolioData: PortfolioData): void {
  const { usedMargins, margins } = portfolioData

  // Clear any existing chart
  container.innerHTML = ""
  const canvas = document.createElement("canvas")
  container.appendChild(canvas)

  // Prepare data
  const dates = usedMargins.map((margin) => margin.date)
  const totalMargins = usedMargins.map((margin) => margin.totalMargin)
  const totalMarginSum = margins.strategyMargins.reduce((sum, margin) => sum + margin, 0)

  // Create the chart
  new Chart(canvas, {
    type: "line",
    data: {
      labels: dates,
      datasets: [
        {
          label: "Used Margin",
          data: totalMargins,
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
          fill: true,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 3,
        },
        {
          label: "Sum of Strategy Margins",
          data: Array(dates.length).fill(totalMarginSum),
          backgroundColor: "rgba(255, 99, 132, 0)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
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
          font: {
            size: 16,
            weight: "bold",
          },
        },
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "month",
            tooltipFormat: "MMM d, yyyy",
          },
          title: {
            display: true,
            text: "Date",
          },
        },
        y: {
          title: {
            display: true,
            text: "Margin ($)",
          },
          ticks: {
            callback: (value) => formatCurrency(value as number),
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

export function createSingleStrategyCharts(container: HTMLElement, portfolioData: PortfolioData): void {
  const { strategies } = portfolioData

  // Clear any existing content
  container.innerHTML = ""

  // Create a grid container with fixed height
  const gridContainer = document.createElement("div")
  gridContainer.className = "grid grid-cols-1 gap-6"
  container.appendChild(gridContainer)

  // Create a chart for each strategy
  strategies.forEach((strategy, index) => {
    const chartContainer = document.createElement("div")
    chartContainer.className = "bg-white dark:bg-gray-800 rounded-lg p-4"
    gridContainer.appendChild(chartContainer)

    const chartTitle = document.createElement("h3")
    chartTitle.className = "text-lg font-medium mb-2"
    chartTitle.textContent = `Strategy: ${strategy.name}`
    chartContainer.appendChild(chartTitle)

    const canvasContainer = document.createElement("div")
    canvasContainer.className = "h-64 mb-4" // Increased height
    chartContainer.appendChild(canvasContainer)

    const canvas = document.createElement("canvas")
    canvas.style.height = "100%"
    canvas.style.width = "100%"
    canvasContainer.appendChild(canvas)

    // Calculate max drawdown for this strategy
    const drawdowns = calculateDrawdowns(strategy.equity)
    const maxDrawdown = Math.abs(Math.min(...drawdowns) || 0)

    // Calculate profit factor (simplified)
    const profitFactor =
      strategy.trades.filter((t) => t.profit < 0).reduce((sum, t) => sum + Math.abs(t.profit), 0) === 0
        ? Number.POSITIVE_INFINITY
        : strategy.trades.filter((t) => t.profit > 0).reduce((sum, t) => sum + t.profit, 0) /
          strategy.trades.filter((t) => t.profit < 0).reduce((sum, t) => sum + Math.abs(t.profit), 0)

    // Create the chart
    new Chart(canvas, {
      type: "line",
      data: {
        datasets: [
          {
            label: "Equity",
            data: strategy.equity.map((value, i) => ({
              x: strategy.trades[i]?.exitTime,
              y: value,
            })),
            borderColor: STRATEGY_COLORS[index % STRATEGY_COLORS.length],
            backgroundColor: `${STRATEGY_COLORS[index % STRATEGY_COLORS.length].replace("rgb", "rgba").replace(")", ", 0.1)")}`,
            borderWidth: 2,
            tension: 0.1,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          tooltip: {
            mode: "index",
            intersect: false,
            callbacks: {
              label: (context) => `Equity: ${formatCurrency(context.parsed.y)}`,
            },
          },
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            type: "time",
            time: {
              unit: "month",
              tooltipFormat: "MMM d, yyyy",
            },
            title: {
              display: true,
              text: "Date",
            },
          },
          y: {
            title: {
              display: true,
              text: "Equity ($)",
            },
            ticks: {
              callback: (value) => formatCurrency(value as number),
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

    // Add statistics below the chart
    const statsContainer = document.createElement("div")
    statsContainer.className = "grid grid-cols-2 gap-4 text-sm mt-2"
    chartContainer.appendChild(statsContainer)

    const netProfitMaxDD = document.createElement("div")
    netProfitMaxDD.innerHTML = `
      <p class="font-medium">Net Profit/Max DD:</p>
      <p>${maxDrawdown ? (strategy.netProfit / maxDrawdown).toFixed(2) : "∞"}</p>
    `
    statsContainer.appendChild(netProfitMaxDD)

    const profitFactorElement = document.createElement("div")
    profitFactorElement.innerHTML = `
      <p class="font-medium">Profit Factor:</p>
      <p>${Number.isFinite(profitFactor) ? profitFactor.toFixed(2) : "∞"}</p>
    `
    statsContainer.appendChild(profitFactorElement)
  })
}

// Helper function to calculate drawdowns from equity curve
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
