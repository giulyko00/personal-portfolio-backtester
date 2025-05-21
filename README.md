# Portfolio Backtester

Un'applicazione per analizzare le prestazioni di portafogli di trading con supporto per diversi formati di file CSV.

## Struttura del Progetto

- `app/`: Frontend Next.js
- `components/`: Componenti React
- `lib/`: Utility e funzioni di supporto
- `backend/`: Backend Python per l'elaborazione dei dati

## Requisiti

- Node.js 14+ e npm
- Python 3.8+
- pip (gestore pacchetti Python)

## Installazione

### Frontend (Next.js)

\`\`\`bash
npm install
\`\`\`

### Backend (Python)

\`\`\`bash
cd backend
pip install -r requirements.txt
\`\`\`

## Esecuzione

### Frontend

\`\`\`bash
npm run dev
\`\`\`

Il frontend sarà disponibile all'indirizzo `http://localhost:3000`.

### Backend

\`\`\`bash
cd backend
python app.py
\`\`\`

Il backend sarà disponibile all'indirizzo `http://localhost:5000`.

## Utilizzo

1. Avvia sia il frontend che il backend
2. Carica i file CSV di trading nel formato desiderato (TradeStation, MultiCharts o NinjaTrader)
3. Specifica le quantità per ogni strategia
4. Visualizza l'analisi del portafoglio con grafici e statistiche

## Formati di File Supportati

- **TradeStation**: Formato CSV standard di TradeStation
- **MultiCharts**: Formato CSV standard di MultiCharts
- **NinjaTrader**: Formato CSV standard di NinjaTrader
