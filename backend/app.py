from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from scipy import stats
import json
from datetime import datetime
import os
from processors import (
    process_tradestation_csv,
    process_multicharts_csv,
    process_ninjatrader_csv,
    calculate_equity_curve,
    calculate_drawdowns,
    calculate_statistics,
    calculate_monthly_returns,
    calculate_daily_returns,
    calculate_strategy_correlation,
    calculate_strategy_margins,
    calculate_used_margin,
    count_max_occurrences
)

app = Flask(__name__)
# Configura CORS per consentire richieste da qualsiasi origine
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/api/process', methods=['POST'])
def process_files():
    if 'files' not in request.files:
        return jsonify({'error': 'No files provided'}), 400
    
    files = request.files.getlist('files')
    quantities = json.loads(request.form.get('quantities', '[]'))
    format_type = request.form.get('format', 'tradestation')
    
    # Salva temporaneamente i file
    temp_paths = []
    for i, file in enumerate(files):
        temp_path = f"temp_{i}.csv"
        file.save(temp_path)
        temp_paths.append(temp_path)
    
    try:
        # Processa i file in base al formato selezionato
        if format_type == 'tradestation':
            portfolio_data = process_tradestation_csv(temp_paths, quantities)
        elif format_type == 'multicharts':
            portfolio_data = process_multicharts_csv(temp_paths, quantities)
        elif format_type == 'ninjatrader':
            portfolio_data = process_ninjatrader_csv(temp_paths, quantities)
        else:
            portfolio_data = process_tradestation_csv(temp_paths, quantities)
        
        # Converti date in stringhe per JSON
        portfolio_data = convert_dates_to_strings(portfolio_data)
        
        return jsonify(portfolio_data)
    
    except Exception as e:
        print(f"Errore durante l'elaborazione: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
    finally:
        # Pulisci i file temporanei
        for path in temp_paths:
            if os.path.exists(path):
                os.remove(path)

@app.route('/api/filter', methods=['POST'])
def filter_by_date():
    data = request.json
    if not data or 'portfolioData' not in data or 'startDate' not in data or 'endDate' not in data:
        return jsonify({'error': 'Dati mancanti'}), 400
    
    portfolio_data = data['portfolioData']
    start_date_str = data['startDate']
    end_date_str = data['endDate']
    
    try:
        # Converti le stringhe in datetime
        start_dt = datetime.fromisoformat(start_date_str) if start_date_str else datetime(1970, 1, 1)
        end_dt = datetime.fromisoformat(end_date_str) if end_date_str else datetime(2100, 1, 1)
        
        # Filtra i trades del portafoglio
        filtered_portfolio_trades = [
            t for t in portfolio_data['portfolioTrades'] 
            if datetime.fromisoformat(t['exitTime']) >= start_dt and datetime.fromisoformat(t['exitTime']) <= end_dt
        ]
        
        # Filtra le strategie
        filtered_strategies = []
        for strategy in portfolio_data['strategies']:
            filtered_trades = [
                t for t in strategy['trades'] 
                if datetime.fromisoformat(t['exitTime']) >= start_dt and datetime.fromisoformat(t['exitTime']) <= end_dt
            ]
            
            if filtered_trades:
                # Ricalcola equity per questa strategia
                equity = calculate_equity_curve(filtered_trades)
                net_profit = equity[-1] if equity else 0
                
                filtered_strategies.append({
                    "name": strategy['name'],
                    "symbol": strategy['symbol'],
                    "quantity": strategy['quantity'],
                    "trades": filtered_trades,
                    "equity": equity,
                    "netProfit": net_profit
                })
        
        # Ricalcola tutti i dati del portafoglio
        filtered_portfolio_equity = calculate_equity_curve(filtered_portfolio_trades)
        filtered_drawdowns = calculate_drawdowns(filtered_portfolio_equity)
        filtered_statistics = calculate_statistics(filtered_portfolio_trades, filtered_portfolio_equity, filtered_drawdowns)
        filtered_monthly_returns = calculate_monthly_returns(filtered_portfolio_trades)
        filtered_daily_returns = calculate_daily_returns(filtered_portfolio_trades)
        
        dfs_equity_strategies = [{"exitTime": [t['exitTime'] for t in s['trades']], "equity": s['equity']} for s in filtered_strategies]
        filtered_correlation_matrix = calculate_strategy_correlation(dfs_equity_strategies, filtered_portfolio_trades)
        
        filtered_strategy_margins = calculate_strategy_margins(filtered_strategies)
        filtered_used_margins = calculate_used_margin(filtered_strategies, filtered_portfolio_trades, filtered_strategy_margins)
        
        filtered_margins = {
            "strategyMargins": filtered_strategy_margins,
            "minimumAccountRequired": sum(filtered_strategy_margins) + filtered_statistics["maxDrawdown"],
            "maxUsedMargin": max([m["totalMargin"] for m in filtered_used_margins]) if filtered_used_margins else 0,
            "maxUsedMarginOccurrences": count_max_occurrences([m["totalMargin"] for m in filtered_used_margins]) if filtered_used_margins else 0,
            "maxUsedMarginFirstDate": next((m["date"].isoformat() for m in filtered_used_margins 
                                          if m["totalMargin"] == max([um["totalMargin"] for um in filtered_used_margins])), "") if filtered_used_margins else ""
        }
        
        filtered_portfolio_data = {
            "strategies": filtered_strategies,
            "portfolioTrades": filtered_portfolio_trades,
            "portfolioEquity": filtered_portfolio_equity,
            "drawdowns": filtered_drawdowns,
            "statistics": filtered_statistics,
            "monthlyReturns": filtered_monthly_returns,
            "dailyReturns": filtered_daily_returns,
            "correlationMatrix": filtered_correlation_matrix,
            "margins": filtered_margins,
            "usedMargins": filtered_used_margins
        }
        
        # Converti date in stringhe per JSON
        filtered_portfolio_data = convert_dates_to_strings(filtered_portfolio_data)
        
        return jsonify(filtered_portfolio_data)
    
    except Exception as e:
        print(f"Errore durante il filtraggio: {str(e)}")
        return jsonify({'error': str(e)}), 500

def convert_dates_to_strings(data):
    """Converte oggetti datetime in stringhe per la serializzazione JSON"""
    if isinstance(data, dict):
        return {k: convert_dates_to_strings(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [convert_dates_to_strings(i) for i in data]
    elif isinstance(data, pd.DataFrame):
        return data.to_dict(orient='records')
    elif isinstance(data, np.ndarray):
        return data.tolist()
    elif isinstance(data, datetime):
        return data.isoformat()
    else:
        return data

@app.route('/api/test', methods=['GET'])
def test_connection():
    """Endpoint di test per verificare che il server sia in esecuzione"""
    return jsonify({"status": "ok", "message": "Backend is running"})

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
