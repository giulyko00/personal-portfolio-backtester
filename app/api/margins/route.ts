import { NextResponse } from "next/server"
import * as cheerio from "cheerio"

// Tipo per la risposta dell'API
interface MarginsResponse {
  margins: Record<string, number>
  lastUpdate: string
  source: string
}

// Funzione per pulire e convertire il testo in numero
function cleanMargin(text: string): number | null {
  const cleaned = text.replace(/[^0-9.]/g, "")
  return cleaned ? Number.parseFloat(cleaned) : null
}

// Funzione per ottenere i margini da TradeStation
async function scrapeTradeStationMargins(): Promise<Record<string, number>> {
  try {
    const response = await fetch("https://www.tradestation.com/pricing/futures-margin-requirements/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const margins: Record<string, number> = {}

    $("table tbody tr").each((_, row) => {
      const cols = $(row).find("td")
      if (cols.length < 6) return

      const symbol = $(cols[1]).text().trim()
      const margin4Text = $(cols[4]).text().trim()
      const margin5Text = $(cols[5]).text().trim()

      const margin4 = cleanMargin(margin4Text)
      const margin5 = cleanMargin(margin5Text)

      if (margin4 !== null || margin5 !== null) {
        margins[symbol] = Math.max(margin4 || 0, margin5 || 0)
      }
    })

    return margins
  } catch (error) {
    console.error("Error scraping TradeStation margins:", error)
    return {}
  }
}

// Valori hardcoded come fallback
function getHardcodedMargins(): Record<string, number> {
  return {
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
}

export async function GET() {
  try {
    // Tenta lo scraping
    let margins = await scrapeTradeStationMargins()
    let source = "tradestation"

    // Se lo scraping fallisce, usa i valori hardcoded
    if (Object.keys(margins).length === 0) {
      margins = getHardcodedMargins()
      source = "hardcoded"
    }

    // Prepara la risposta
    const response: MarginsResponse = {
      margins,
      lastUpdate: new Date().toISOString(),
      source,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error in margins API:", error)

    // In caso di errore, restituisci i valori hardcoded
    const fallbackResponse: MarginsResponse = {
      margins: getHardcodedMargins(),
      lastUpdate: new Date().toISOString(),
      source: "fallback",
    }

    return NextResponse.json(fallbackResponse)
  }
}
