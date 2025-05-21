from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from scipy import stats
import json
from datetime import datetime
import os
import traceback
from processors import (
    process_tradestation_csv,
    process_multicharts_csv,
    process_ninjatrader_csv
)
from margin_scraper import get_margins, calculate_margin_for_symbol

app = Flask(__name__)
# Configurazione CORS più permissiva per lo sviluppo
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
        error_message = str(e)
        stack_trace = traceback.format_exc()
        print(f"Errore durante l'elaborazione: {error_message}")
        print(stack_trace)
        return jsonify({'error': error_message, 'stack_trace': stack_trace}), 500
    
    finally:
        # Pulisci i file temporanei
        for path in temp_paths:
            if os.path.exists(path):
                os.remove(path)

@app.route('/api/margins', methods=['GET'])
def get_all_margins():
    """Endpoint per ottenere tutti i margini aggiornati"""
    try:
        margins = get_margins()
        return jsonify(margins)
    except Exception as e:
        error_message = str(e)
        stack_trace = traceback.format_exc()
        print(f"Errore durante il recupero dei margini: {error_message}")
        print(stack_trace)
        return jsonify({'error': error_message, 'stack_trace': stack_trace}), 500

@app.route('/api/margins/<symbol>', methods=['GET'])
def get_symbol_margin(symbol):
    """Endpoint per ottenere il margine di un simbolo specifico"""
    try:
        margin = calculate_margin_for_symbol(symbol.upper())
        return jsonify({'symbol': symbol.upper(), 'margin': margin})
    except Exception as e:
        error_message = str(e)
        stack_trace = traceback.format_exc()
        print(f"Errore durante il recupero del margine per {symbol}: {error_message}")
        print(stack_trace)
        return jsonify({'error': error_message, 'stack_trace': stack_trace}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Endpoint per verificare che il server sia in esecuzione"""
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})

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

if __name__ == '__main__':
    # Stampa un messaggio di avvio per confermare che il server è in esecuzione
    print("Avvio del server backend su http://localhost:5000")
    print("Premi CTRL+C per terminare")
    app.run(debug=True, port=5000, host='0.0.0.0')
