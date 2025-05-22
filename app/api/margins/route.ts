import { NextResponse } from "next/server"
import * as cheerio from "cheerio"

// Tipo per la risposta dell'API
interface MarginsResponse {
  margins: Record<string, number>
  lastUpdate: string
  source: string
  marginType: "intraday" | "overnight"
}

// Funzione per pulire e convertire il testo in numero
function cleanMargin(text: string): number | null {
  const cleaned = text.replace(/[^0-9.]/g, "")
  return cleaned ? Number.parseFloat(cleaned) : null
}

// Funzione per ottenere i margini da TradeStation
async function scrapeTradeStationMargins(
  marginType: "intraday" | "overnight" = "intraday",
): Promise<Record<string, number>> {
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

      // Seleziona le colonne in base al tipo di margine
      const margin1Text = marginType === "intraday" ? $(cols[2]).text().trim() : $(cols[4]).text().trim()

      const margin2Text = marginType === "intraday" ? $(cols[3]).text().trim() : $(cols[5]).text().trim()

      const margin1 = cleanMargin(margin1Text)
      const margin2 = cleanMargin(margin2Text)

      if (margin1 !== null || margin2 !== null) {
        margins[symbol] = Math.max(margin1 || 0, margin2 || 0)
      }
    })

    return margins
  } catch (error) {
    console.error("Error scraping TradeStation margins:", error)
    return {}
  }
}

// Valori hardcoded come fallback
function getHardcodedMargins(marginType: "intraday" | "overnight" = "intraday"): Record<string, number> {
  if (marginType === "intraday") {
    return {
      CL: 2905.0,
      ES: 8281.0,
      FDXM: 3786.0,
      FESX: 1789.0,
      GC: 6325.0,
      MCL: 291.0,
      MES: 828.0,
      MGC: 632.0,
      MNQ: 1256.0,
      NQ: 12567.0,
      RB: 3240.0,
      ZS: 1100.0,
      ZW: 962.0,
    }
  } else {
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
}

export async function GET(request: Request) {
  try {
    // Ottieni il tipo di margine dalla query string
    const { searchParams } = new URL(request.url)
    const marginType = searchParams.get("type") === "overnight" ? "overnight" : "intraday"

    // Tenta lo scraping
    let margins = await scrapeTradeStationMargins(marginType)
    let source = "tradestation"

    // Se lo scraping fallisce, usa i valori hardcoded
    if (Object.keys(margins).length === 0) {
      margins = getHardcodedMargins(marginType)
      source = "hardcoded"
    }

    // Prepara la risposta
    const response: MarginsResponse = {
      margins,
      lastUpdate: new Date().toISOString(),
      source,
      marginType,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error in margins API:", error)

    // In caso di errore, restituisci i valori hardcoded
    const marginType = "overnight" // Default in caso di errore
    const fallbackResponse: MarginsResponse = {
      margins: getHardcodedMargins(marginType),
      lastUpdate: new Date().toISOString(),
      source: "fallback",
      marginType,
    }

    return NextResponse.json(fallbackResponse)
  }
}
