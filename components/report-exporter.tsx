"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Download, Loader2, FileSpreadsheet } from "lucide-react"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import type { PortfolioData } from "@/types/portfolio"
import type { MonteCarloResult } from "@/lib/monte-carlo"
import type { StressTestResult } from "@/lib/stress-test"

interface ReportExporterProps {
  portfolioData: PortfolioData
  currency: "USD" | "EUR"
  marginType: "intraday" | "overnight"
  monteCarloResult: MonteCarloResult | null
  stressTestResult: StressTestResult | null
  onRunMonteCarloSimulation: () => Promise<void>
  onRunStressTest: () => Promise<void>
}

export function ReportExporter({ 
  portfolioData, 
  currency, 
  marginType, 
  monteCarloResult, 
  stressTestResult, 
  onRunMonteCarloSimulation, 
  onRunStressTest 
}: ReportExporterProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingCSV, setIsExportingCSV] = useState(false)
  const { toast } = useToast()

  const exportDailyProfitsCSV = async () => {
    if (!portfolioData) return
    setIsExportingCSV(true)
    toast({ title: "Generating Daily Profits CSV..." })

    try {
      const { dailyReturns, portfolioEquity, drawdowns } = portfolioData

      // Convert dailyReturns object to sorted array of [date, profit]
      const sortedDailyEntries = Object.entries(dailyReturns)
        .map(([dateStr, profit]) => ({
          date: new Date(dateStr),
          profit,
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime())

      // Build CSV rows: date,daily_mtm,equity,drawdown,dd_duration
      const rows = [
        "date,daily_mtm,equity,drawdown,dd_duration",
        ...sortedDailyEntries.map((entry, idx) => {
          const dateStr = entry.date.toISOString().split("T")[0]
          const dailyMtm = entry.profit
          const equity = portfolioEquity[idx] ?? 0
          const drawdown = drawdowns[idx] ?? 0
          // Simple dd_duration: count consecutive days with negative drawdown
          let ddDuration = 0
          if (drawdown < 0) {
            let j = idx
            while (j >= 0 && drawdowns[j] < 0) {
              ddDuration++
              j--
            }
          }
          return `${dateStr},${dailyMtm},${equity},${drawdown},${ddDuration}`
        }),
      ]

      const csvContent = rows.join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `daily_profits_${new Date().toISOString().split("T")[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: "CSV Exported Successfully!",
        description: "Daily profits CSV has been downloaded.",
        variant: "default",
      })
    } catch (error) {
      console.error("Error exporting CSV:", error)
      toast({
        title: "Error Exporting CSV",
        description: "An unexpected error occurred. Please check the console for details.",
        variant: "destructive",
      })
    } finally {
      setIsExportingCSV(false)
    }
  }

  const captureElement = async (elementId: string, title: string): Promise<string> => {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error(`Element with id ${elementId} not found`)
    }

    // Scroll element into view and wait for rendering
    element.scrollIntoView({ behavior: "smooth", block: "start" })
    await new Promise(resolve => setTimeout(resolve, 500))

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: element.scrollWidth,
      height: element.scrollHeight,
    })

    return canvas.toDataURL("image/png", 0.95)
  }

  const generateReport = async () => {
    setIsExporting(true)
    toast({ title: "Initializing Report Export..." })

    try {
      // Check if simulations need to be run and run them if missing
      if (!monteCarloResult) {
        toast({ title: "Running Monte Carlo simulation..." })
        await onRunMonteCarloSimulation()
        // Wait a bit for the simulation to complete and UI to update
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      if (!stressTestResult) {
        toast({ title: "Running Stress Test..." })
        await onRunStressTest()
        // Wait a bit for the test to complete and UI to update
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      const pdf = new jsPDF("p", "mm", "a4")
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 20

      // Cover page
      toast({ title: "Creating cover..." })
      pdf.setFontSize(24)
      pdf.text("Portfolio Backtest Report", pageWidth / 2, 40, { align: "center" })
      
      pdf.setFontSize(16)
      const currentDate = new Date().toLocaleDateString("en-GB")
      pdf.text(`Generated on: ${currentDate}`, pageWidth / 2, 60, { align: "center" })
      
      pdf.setFontSize(12)
      pdf.text(`Currency: ${currency}`, pageWidth / 2, 80, { align: "center" })
      pdf.text(`Margin Type: ${marginType === "intraday" ? "Intraday" : "Overnight"}`, pageWidth / 2, 90, { align: "center" })
      
      // Portfolio summary
      if (portfolioData.strategies.length > 0) {
        pdf.text("Portfolio Strategies:", margin, 120)
        const strategies = portfolioData.strategies;
        const numStrategies = strategies.length;
        const maxStrategiesPerColumn = 14; // Max items before a new column
        const numColumns = Math.ceil(numStrategies / maxStrategiesPerColumn);
        const columnWidth = (pageWidth - margin * 2) / numColumns;
        let yPos = 130;

        strategies.forEach((strategy, index) => {
          const columnIndex = Math.floor(index / maxStrategiesPerColumn);
          const itemInColumnIndex = index % maxStrategiesPerColumn;

          if (itemInColumnIndex === 0 && columnIndex > 0) {
            yPos = 130; // Reset y-position for new column
          }

          const xPos = margin + (columnIndex * columnWidth);
          pdf.text(`${index + 1}. ${strategy.name} (Qty: ${strategy.quantity})`, xPos, yPos);
          yPos += 8;
        });
      }

      const tabs = [
        { id: "equity-curve-content", title: "Equity Curve & Statistics", tabId: "equity-curve" },
        { id: "returns-distribution-content", title: "Returns Distribution & Margins", tabId: "returns-distribution" },
        { id: "single-strategies-content", title: "Single Strategies", tabId: "single-strategies" },
        { id: "monte-carlo-content", title: "Monte Carlo Simulation", tabId: "monte-carlo" },
        { id: "stress-test-content", title: "Stress Test", tabId: "stress-test" }
      ]

      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i]
        toast({ title: `Capturing ${tab.title}...`, description: `(${i + 1}/${tabs.length})` })

        // Switch to the tab
        const tabButton = document.querySelector(`[data-tab="${tab.tabId}"]`) as HTMLButtonElement
        if (tabButton) {
          tabButton.click()
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait for tab content to load
        }

        try {
          // Try to capture the specific tab content
          let elementToCapture = document.getElementById(tab.id)
          
          // Fallback to the main dashboard content area
          if (!elementToCapture) {
            elementToCapture = document.querySelector('.bg-white.dark\\:bg-gray-800.rounded-lg.shadow-md.p-6') as HTMLElement
          }

          if (elementToCapture) {
            const imageData = await captureElement(elementToCapture.id || `tab-${i}`, tab.title)
            
            // Add new page (except for first tab)
            if (i > 0) {
              pdf.addPage()
            } else {
              pdf.addPage() // Add page after cover
            }

            // Add title
            pdf.setFontSize(18)
            pdf.text(tab.title, pageWidth / 2, 30, { align: "center" })

            // Calculate image dimensions
            const img = new Image()
            img.src = imageData
            await new Promise(resolve => {
              img.onload = resolve
            })

            const imgWidth = pageWidth - (margin * 2)
            const imgHeight = (img.height * imgWidth) / img.width
            
            // Check if image fits on page, if not scale it down
            const maxHeight = pageHeight - 60 // Leave space for title and margins
            const finalHeight = Math.min(imgHeight, maxHeight)
            const finalWidth = (img.width * finalHeight) / img.height

            pdf.addImage(imageData, "PNG", (pageWidth - finalWidth) / 2, 40, finalWidth, finalHeight)
          }
        } catch (error) {
          console.warn(`Could not capture ${tab.title}:`, error)
          // Add a page with error message
          if (i > 0) {
            pdf.addPage()
          } else {
            pdf.addPage()
          }
          pdf.setFontSize(18)
          pdf.text(tab.title, pageWidth / 2, 30, { align: "center" })
          pdf.setFontSize(12)
          pdf.text("Error capturing this section", pageWidth / 2, 60, { align: "center" })
        }
      }

      toast({ title: "Finalizing PDF..." })
      
      // Save the PDF
      const fileName = `Portfolio_Backtest_Report_${currentDate.replace(/\//g, "-")}.pdf`
      pdf.save(fileName)

      toast({
        title: "Report Exported Successfully!",
        description: `The report has been saved as ${fileName}`,
        variant: "success",
      })

    } catch (error) {
      console.error("Error generating report:", error)
      toast({
        title: "Error Generating Report",
        description: "An unexpected error occurred. Please check the console for details.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={exportDailyProfitsCSV}
        disabled={isExportingCSV || !portfolioData}
        className="flex items-center gap-2"
        variant="outline"
      >
        {isExportingCSV ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4" />
        )}
        {isExportingCSV ? "Exporting..." : "Export CSV"}
      </Button>
      <Button
        onClick={generateReport}
        disabled={isExporting}
        className="flex items-center gap-2"
        variant="outline"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {isExporting ? "Exporting..." : "Export Report"}
      </Button>
      
    </div>
  )
}
