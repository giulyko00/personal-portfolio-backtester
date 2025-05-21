import os
import json
import time
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup

def get_script_directory():
    """Restituisce il percorso della directory dello script"""
    return os.path.abspath(os.path.dirname(__file__))

def get_cache_file_path(filename="margins_cache.json"):
    """Restituisce il percorso completo del file di cache"""
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

    with open(cache_file, "r") as f:
        data = json.load(f)
    return data.get("margins"), data.get("last_update")

def save_margins_to_cache(margins_dict):
    """
    Salva i margini in un file JSON nella cartella dello script.
    """
    cache_file = get_cache_file_path()
    
    data_to_save = {
        "last_update": datetime.today().date().isoformat(),
        "margins": margins_dict
    }
    with open(cache_file, "w") as f:
        json.dump(data_to_save, f, indent=4)

def get_margins():
    """
    Ritorna un dizionario {symbol: margin}. Se i margini sono in cache e
    sono aggiornati (stesso giorno), li carica da lì. Altrimenti fa scraping.
    """
    # Carica la cache, se esiste
    cached_margins, last_update_str = load_margins_from_cache()

    # Confrontiamo la data dell'ultimo aggiornamento con oggi
    today_str = datetime.today().date().isoformat()  # 'YYYY-MM-DD'
    
    # Se i margini sono già stati aggiornati oggi, usiamo quelli
    if cached_margins and last_update_str == today_str:
        print("Usando margini dalla cache...")
        return cached_margins

    # Altrimenti, esegui lo scraping
    print("Eseguo scraping dei margini...")
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
            return {}

def scrape_tradestation_margins():
    """
    Scarica la pagina dei margin requirements di TradeStation e restituisce un dizionario:
        { 'Symbol Root': float(max_value), ... }
    Per ogni riga della tabella, estrae il simbolo (colonna 1) e prende il valore massimo tra
    la colonna 4 e la colonna 5 (rispettivamente a indice 4 e 5).
    Se la tabella non viene trovata o la struttura è cambiata, ritorna un dizionario vuoto.
    """
    url = "https://www.tradestation.com/pricing/futures-margin-requirements/"
    
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    
    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.get(url)
        time.sleep(10)  # Attendi il caricamento della pagina
        html_source = driver.page_source
        driver.quit()
    except Exception as e:
        print(f"[ERRORE] Errore durante lo scraping: {e}")
        return {}
    
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

def scrape_ninjatrader_margins():
    """
    Scarica la pagina "Margins" di NinjaTrader e restituisce un dizionario:
        { 'Symbol': float(initial_margin), ... }
    L'Initial margin si trova nella 6° colonna della tabella (indice 5),
    mentre la 1° colonna (indice 0) contiene il Symbol.
    Ritorna un dizionario vuoto se la pagina/struttura non è accessibile.
    """
    url = "https://ninjatrader.com/pricing/margins/"
    
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    
    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.get(url)
        time.sleep(10)  # Attendi il caricamento della pagina
        html_source = driver.page_source
        driver.quit()
    except Exception as e:
        print(f"[ERRORE] Errore durante lo scraping: {e}")
        return {}

    soup = BeautifulSoup(html_source, "html.parser")
    table = soup.find("table")
    if not table:
        print("[ERRORE] Tabella dei margini non trovata o struttura cambiata.")
        return {}

    margins_dict = {}
    tbody = table.find("tbody")
    if tbody:
        rows = tbody.find_all("tr")
    else:
        rows = table.find_all("tr")

    # Salta eventualmente l'header
    for row in rows[1:]:
        cols = row.find_all("td")
        if len(cols) < 6:
            continue  # riga non valida o tabella differente

        symbol_text = cols[0].get_text(strip=True)
        initial_text = cols[5].get_text(strip=True)

        # Se la cella è vuota o un trattino, saltiamo
        if not symbol_text or not initial_text or initial_text == '-':
            continue

        # Pulisci stringa da $ , EUR, e spazi
        temp = (initial_text
                .replace("$", "")
                .replace("EUR", "")
                .replace(",", "")
                .strip())

        try:
            val = float(temp)
        except ValueError:
            continue

        margins_dict[symbol_text] = val

    return margins_dict

def calculate_margin_for_symbol(symbol):
    """
    Calcola il margine per un simbolo specifico.
    Utilizza lo scraping o la cache per ottenere i margini aggiornati.
    """
    # Margini di backup (fonte: NinjaTrader)
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
            if sym in margin_backup:
                margin_backup[sym] = val

    # Ritorniamo il margine del simbolo richiesto
    return margin_backup.get(symbol, 0.0)
