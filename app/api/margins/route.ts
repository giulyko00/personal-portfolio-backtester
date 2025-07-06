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
    const url = "https://www.tradestation.com/pricing/futures-margin-requirements/";
    console.log('Fetching margins from:', url);
    
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} - ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Log della struttura delle tabelle trovate
    $('table').each((i, table) => {
      const headers = $(table).find('th').map((_, th) => $(th).text().trim()).get();
      console.log(`Table ${i} - Headers:`, headers);
    });

    const margins: Record<string, number> = {};
    let processedRows = 0;
    let skippedRows = 0;

    // La tabella ha questa struttura:
    // Col 0: Product Description
    // Col 1: Symbol Root (simbolo)
    // Col 2: Intraday Initial
    // Col 3: Intraday Maintenance
    // Col 4: Long Overnight Margin
    // Col 5: Short Overnight Margin
    // ...altre colonne non rilevanti
    
    $('table tbody tr').each((i, row) => {
      const cols = $(row).find('td');
      
      // Controlla se ci sono abbastanza colonne
      if (cols.length < 6) {
        console.warn(`Skipping row ${i} - not enough columns (${cols.length})`);
        skippedRows++;
        return;
      }

      const symbol = $(cols[1]).text().trim();
      
      // Se non c'è un simbolo valido, salta la riga
      if (!symbol) {
        console.warn(`Skipping row ${i} - no symbol found`);
        skippedRows++;
        return;
      }
      
      // Seleziona le colonne in base al tipo di margine
      let margin1Text, margin2Text;
      
      if (marginType === 'intraday') {
        margin1Text = $(cols[2]).text().trim(); // Intraday Initial
        margin2Text = $(cols[3]).text().trim(); // Intraday Maintenance
      } else {
        // Per overnight, prendiamo il massimo tra Long e Short Overnight Margin
        const longOvernight = cleanMargin($(cols[4]).text().trim());
        const shortOvernight = cleanMargin($(cols[5]).text().trim());
        
        margin1Text = Math.max(longOvernight || 0, shortOvernight || 0).toString();
        margin2Text = '0'; // Non c'è un secondo valore per l'overnight
      }

      const margin1 = cleanMargin(margin1Text);
      const margin2 = cleanMargin(margin2Text);
      
      console.log(`Processing symbol: ${symbol}`, {
        marginType,
        margin1: margin1,
        margin2: margin2,
        selected: Math.max(margin1 || 0, margin2 || 0)
      });

      if (margin1 !== null || margin2 !== null) {
        // Prendi il massimo tra i due margini
        margins[symbol] = Math.max(margin1 || 0, margin2 || 0);
        processedRows++;
      } else {
        console.warn(`No valid margins for ${symbol}`, { 
          margin1Text, 
          margin2Text,
          rowHtml: $(row).html() 
        });
      }
    });
    
    console.log('Processing complete. Found', Object.keys(margins).length, 'valid symbols');

    return margins;
  } catch (error) {
    console.error('Error scraping margins:', error);
    return {};
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
  const startTime = Date.now();
  
  try {
    // Ottieni il tipo di margine dalla query string
    const { searchParams } = new URL(request.url);
    const marginType = searchParams.get("type") === "overnight" ? "overnight" : "intraday";
    
    console.log('API request - Margin type:', marginType);

    // Tenta lo scraping
    console.log('Starting margin scraping...');
    let margins = await scrapeTradeStationMargins(marginType);
    let source = "tradestation";

    // Se lo scraping fallisce, usa i valori hardcoded
    if (Object.keys(margins).length === 0) {
      console.log('Using hardcoded margins');
      margins = getHardcodedMargins(marginType);
      source = "hardcoded";
    } else {
      console.log('Found', Object.keys(margins).length, 'margins');
    }

    // Prepara la risposta
    const response: MarginsResponse = {
      margins,
      lastUpdate: new Date().toISOString(),
      source,
      marginType,
    };
    
    console.log('Request completed in', Date.now() - startTime, 'ms');

    return NextResponse.json(response)
  } catch (error) {
    console.error('API Error:', error);
    
    // In caso di errore, restituisci i valori hardcoded
    const marginType = "overnight"; // Default in caso di errore
    const fallbackMargins = getHardcodedMargins(marginType);
    console.log('Using fallback hardcoded margins');
    
    const fallbackResponse: MarginsResponse = {
      margins: fallbackMargins,
      lastUpdate: new Date().toISOString(),
      source: "fallback",
      marginType,
    };

    return NextResponse.json(fallbackResponse)
  }
}
