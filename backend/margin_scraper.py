import os
import json
import time
import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import requests
import traceback

def get_script_directory():
    return os.path.abspath(os.path.dirname(__file__))

def get_cache_file_path(filename="margins_cache.json"):
    script_dir = get_script_directory()
    return os.path.join(script_dir, filename)

def load_margins_from_cache():
    """
    Carica i margini dal file JSON nella cartella dello script.
    Se il file non esiste, ritorna (None, None).
    """
    cache_file = get_cache_file_path()

    if not os.path.exists(cache_file):
        return None, None

    try:
        with open(cache_file, "r") as f:
            data = json.load(f)
        return data.get("margins"), data.get("last_update")
    except Exception as e:
        print(f"Errore nel caricamento della cache: {e}")
        return None, None

def save_margins_to_cache(margins_dict):
    """
    Salva i margini in un file JSON nella cartella dello script.
    """
    cache_file = get_cache_file_path()
    
    data_to_save = {
        "last_update": datetime.date.today().isoformat(),
        "margins": margins_dict
    }
    try:
        with open(cache_file, "w") as f:
            json.dump(data_to_save, f, indent=4)
        print(f"Cache salvata in {cache_file}")
    except Exception as e:
        print(f"Errore nel salvataggio della cache: {e}")

def get_margins():
    """
    Ritorna un dizionario {symbol: margin}. Se i margini sono in cache e
    sono aggiornati (stesso giorno), li carica da lì. Altrimenti fa scraping.
    """
    # Carica la cache, se esiste
    cached_margins, last_update_str = load_margins_from_cache()

    # Confrontiamo la data dell'ultimo aggiornamento con oggi
    today_str = datetime.date.today().isoformat()  # 'YYYY-MM-DD'
    
    # Se i margini sono già stati aggiornati oggi, usiamo quelli
    if cached_margins and last_update_str == today_str:
        print("Utilizzo margini dalla cache (aggiornati oggi)")
        return cached_margins

    # Altrimenti, esegui lo scraping
    print("Eseguo scraping dei margini...")
    try:
        new_margins = scrape_tradestation_margins()
        if new_margins:
            # Salva i nuovi margini in cache
            save_margins_to_cache(new_margins)
            return new_margins
        else:
            # Se scraping fallisce, tentiamo di usare i valori cached (se presenti)
            if cached_margins:
                print("[ATTENZIONE] Scraping fallito, uso i margini dalla cache di ieri/precedenti.")
                return cached_margins
            else:
                print("[ERRORE] Scraping fallito e cache inesistente.")
                # Ritorna un dizionario vuoto o valori di fallback
                return get_fallback_margins()
    except Exception as e:
        print(f"[ERRORE] Eccezione durante lo scraping: {e}")
        traceback.print_exc()
        # Se si verifica un'eccezione, usa i valori cached o di fallback
        if cached_margins:
            print("[ATTENZIONE] Uso i margini dalla cache di ieri/precedenti.")
            return cached_margins
        else:
            print("[ERRORE] Cache inesistente, uso valori di fallback.")
            return get_fallback_margins()

def get_fallback_margins():
    """
    Ritorna un dizionario di margini di fallback da usare quando lo scraping fallisce
    e non c'è una cache disponibile.
    """
    return {
        'CL': 5810.00,
        'ES': 16563.00,
        'FDXM': 7573.00,
        'FESX': 3579.00,
        'GC': 12650.00,
        'MCL': 583.00,
        'MES': 1656.00,
        'MGC': 1265.00,
        'MNQ': 2513.00,
        'NQ': 25135.00,
        'RB': 6481.00,
        'ZS': 2200.00,
        'ZW': 1925.00,
    }

def scrape_tradestation_margins():
    """
    Scarica la pagina dei margin requirements di TradeStation e restituisce un dizionario:
        { 'Symbol Root': float(max_value), ... }
    Per ogni riga della tabella, estrae il simbolo (colonna 1) e prende il valore massimo tra
    la colonna 4 e la colonna 5 (rispettivamente a indice 4 e 5).
    Se la tabella non viene trovata o la struttura è cambiata, ritorna un dizionario vuoto.
    """
    url = "https://www.tradestation.com/pricing/futures-margin-requirements/"
    
    # Prova prima con requests, che è più veloce e leggero
    try:
        print("Tentativo di scraping con requests...")
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            html_source = response.text
            margins_dict = parse_tradestation_html(html_source)
            if margins_dict:
                print(f"Scraping con requests riuscito: trovati {len(margins_dict)} simboli")
                return margins_dict
    except Exception as e:
        print(f"Errore durante lo scraping con requests: {e}")
    
    # Se requests fallisce, prova con Selenium
    try:
        print("Tentativo di scraping con Selenium...")
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.get(url)
        print("Pagina caricata, attendo 10 secondi...")
        time.sleep(10)
        html_source = driver.page_source
        driver.quit()
        
        margins_dict = parse_tradestation_html(html_source)
        if margins_dict:
            print(f"Scraping con Selenium riuscito: trovati {len(margins_dict)} simboli")
            return margins_dict
        else:
            print("Nessun margine trovato con Selenium")
            return {}
    except Exception as e:
        print(f"Errore durante lo scraping con Selenium: {e}")
        traceback.print_exc()
        return {}

def parse_tradestation_html(html_source):
    """
    Analizza l'HTML della pagina di TradeStation e estrae i margini.
    """
    soup = BeautifulSoup(html_source, "html.parser")
    table = soup.find("table")
    if not table:
        print("[ERRORE] Tabella dei margini non trovata o struttura cambiata.")
        return {}
    
    margins_dict = {}
    tbody = table.find("tbody")
    rows = tbody.find_all("tr") if tbody else table.find_all("tr")
    
    # Se la prima riga contiene header, la saltiamo
    if rows and rows[0].find_all("th"):
        rows = rows[1:]
    
    # Funzione di utilità per pulire e convertire una stringa in float
    def clean_margin(text):
        temp = ''.join(ch for ch in text if ch.isdigit() or ch in ['.', '-'])
        try:
            return float(temp)
        except ValueError:
            return None

    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 6:
            continue
        
        symbol_text = cols[1].get_text(strip=True)
        margin_text_4 = cols[4].get_text(strip=True)
        margin_text_5 = cols[5].get_text(strip=True)
        
        # Se entrambi i valori sono mancanti o segnati come "NONE" o "-", saltiamo la riga
        if (margin_text_4.upper() in ["NONE", "-"]) and (margin_text_5.upper() in ["NONE", "-"]):
            continue
        
        margin_val_4 = clean_margin(margin_text_4) if margin_text_4.upper() not in ["NONE", "-"] else None
        margin_val_5 = clean_margin(margin_text_5) if margin_text_5.upper() not in ["NONE", "-"] else None
        
        # Se almeno uno dei due è valido, prendo il massimo
        if margin_val_4 is None and margin_val_5 is None:
            continue
        elif margin_val_4 is None:
            max_margin = margin_val_5
        elif margin_val_5 is None:
            max_margin = margin_val_4
        else:
            max_margin = max(margin_val_4, margin_val_5)
        
        margins_dict[symbol_text] = max_margin
    
    return margins_dict

def calculate_margin_for_symbol(symbol):
    """
    Calcola il margine per un simbolo specifico.
    """
    # Initial margin (margine massimo richiesto) (fonte: NinjaTrader)
    margin_backup = {
        'CL': 5810.00,
        'ES': 16563.00,
        'FDXM': 7573.00,
        'FESX': 3579.00,
        'GC': 12650.00,
        'MCL': 583.00,
        'MES': 1656.00,
        'MGC': 1265.00,
        'MNQ': 2513.00,
        'NQ': 25135.00,
        'RB': 6481.00,
        'ZS': 2200.00,
        'ZW': 1925.00,
    }

    # Scraping "fresco" da TradeStation
    new_data = get_margins()

    # Se lo scraping ha avuto successo (non è vuoto),
    # aggiorniamo i valori esistenti.
    if new_data:
        for sym, val in new_data.items():
            # Se lo symbol c'è nel backup, aggiorno.
            # Oppure potresti aggiungerlo se non esiste.
            if sym in margin_backup:
                margin_backup[sym] = val

    # Infine ritorniamo il margine del simbolo richiesto
    return margin_backup.get(symbol, 0.0)

def calculate_margin_for_strategy(file_names, symbols, quantities):
    """
    Calcola i margini per ogni strategia.
    """
    strategy_margins = []
    for i, symbol in enumerate(symbols):
        quantity = quantities[i]
        margin = calculate_margin_for_symbol(symbol) * quantity
        strategy_margins.append(margin)
    return strategy_margins
