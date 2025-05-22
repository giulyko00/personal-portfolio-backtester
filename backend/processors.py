import pandas as pd
import numpy as np
from scipy import stats
from datetime import datetime
import re
from margin_scraper import calculate_margin_for_symbol

def process_tradestation_csv(file_paths, quantities):
    """Processa i file CSV di TradeStation e calcola le statistiche del portafoglio"""
    strategies = []
    portfolio_trades = []
    
    # Processa ogni file
    for i, file_path in enumerate(file_paths):
        quantity = quantities[i] if i < len(quantities) else 1
        file_name = file_path.split("/")[-1].split(".")[0]
        symbol = file_name.split("-")[0].strip().upper()
        
        # Leggi e analizza il contenuto del file
        trades = parse_tradestation_csv(file_path, quantity)
        
        # Calcola la curva di equity per questa strategia
        equity = calculate_equity_curve(trades)
        net_profit = equity[-1] if equity else 0
        
        # Aggiungi la strategia alla lista
        strategies.append({
            "name": file_name,
            "symbol": symbol,
            "quantity": quantity,
            "trades": trades,
            "equity": equity,
            "netProfit": net_profit
        })
        
        # Aggiungi trades al portafoglio
        portfolio_trades.extend(trades)
    
    # Ordina i trades del portafoglio per exit_time
    portfolio_trades.sort(key=lambda x: x["exitTime"])
    
    # Calcola l'equity del portafoglio
    portfolio_equity = calculate_equity_curve(portfolio_trades)
    
    # Calcola i drawdown
    drawdowns = calculate_drawdowns(portfolio_equity)
    
    # Calcola le statistiche
    statistics = calculate_statistics(portfolio_trades, portfolio_equity, drawdowns)
    
    # Calcola i rendimenti mensili e giornalieri
    monthly_returns = calculate_monthly_returns(portfolio_trades)
    daily_returns = calculate_daily_returns(portfolio_trades)
    
    # Calcola la matrice di correlazione
    dfs_equity_strategies = [{"exitTime": [t["exitTime"] for t in s["trades"]], "equity": s["equity"]} for s in strategies]
    correlation_matrix = calculate_strategy_correlation(dfs_equity_strategies, portfolio_trades)
    
    # Calcola i margini
    strategy_margins = calculate_strategy_margins(strategies)
    used_margins = calculate_used_margin(strategies, portfolio_trades, strategy_margins)
    
    # Calcola le statistiche dei margini
    margins = {
        "strategyMargins": strategy_margins,
        "minimumAccountRequired": sum(strategy_margins) + statistics["maxDrawdown"],
        "maxUsedMargin": max([m["totalMargin"] for m in used_margins]) if used_margins else 0,
        "maxUsedMarginOccurrences": count_max_occurrences([m["totalMargin"] for m in used_margins]) if used_margins else 0,
        "maxUsedMarginFirstDate": next((m["date"].strftime("%Y-%m-%d") for m in used_margins 
                                      if m["totalMargin"] == max([um["totalMargin"] for um in used_margins])), "") if used_margins else ""
    }
    
    # Restituisci i dati completi del portafoglio
    return {
        "strategies": strategies,
        "portfolioTrades": portfolio_trades,
        "portfolioEquity": portfolio_equity,
        "drawdowns": drawdowns,
        "statistics": statistics,
        "monthlyReturns": monthly_returns,
        "dailyReturns": daily_returns,
        "correlationMatrix": correlation_matrix,
        "margins": margins,
        "usedMargins": used_margins
    }

def process_multicharts_csv(file_paths, quantities):
    """Processa i file CSV di MultiCharts e calcola le statistiche del portafoglio"""
    strategies = []
    portfolio_trades = []
    
    # Processa ogni file
    for i, file_path in enumerate(file_paths):
        quantity = quantities[i] if i < len(quantities) else 1
        file_name = file_path.split("/")[-1].split(".")[0]
        symbol = file_name.split("-")[0].strip().upper()
        
        # Leggi e analizza il contenuto del file
        trades = parse_multicharts_csv(file_path, quantity)
        
        # Calcola la curva di equity per questa strategia
        equity = calculate_equity_curve(trades)
        net_profit = equity[-1] if equity else 0
        
        # Aggiungi la strategia alla lista
        strategies.append({
            "name": file_name,
            "symbol": symbol,
            "quantity": quantity,
            "trades": trades,
            "equity": equity,
            "netProfit": net_profit
        })
        
        # Aggiungi trades al portafoglio
        portfolio_trades.extend(trades)
    
    # Il resto dell'elaborazione è lo stesso di TradeStation
    portfolio_trades.sort(key=lambda x: x["exitTime"])
    portfolio_equity = calculate_equity_curve(portfolio_trades)
    drawdowns = calculate_drawdowns(portfolio_equity)
    statistics = calculate_statistics(portfolio_trades, portfolio_equity, drawdowns)
    monthly_returns = calculate_monthly_returns(portfolio_trades)
    daily_returns = calculate_daily_returns(portfolio_trades)
    dfs_equity_strategies = [{"exitTime": [t["exitTime"] for t in s["trades"]], "equity": s["equity"]} for s in strategies]
    correlation_matrix = calculate_strategy_correlation(dfs_equity_strategies, portfolio_trades)
    strategy_margins = calculate_strategy_margins(strategies)
    used_margins = calculate_used_margin(strategies, portfolio_trades, strategy_margins)
    
    margins = {
        "strategyMargins": strategy_margins,
        "minimumAccountRequired": sum(strategy_margins) + statistics["maxDrawdown"],
        "maxUsedMargin": max([m["totalMargin"] for m in used_margins]) if used_margins else 0,
        "maxUsedMarginOccurrences": count_max_occurrences([m["totalMargin"] for m in used_margins]) if used_margins else 0,
        "maxUsedMarginFirstDate": next((m["date"].strftime("%Y-%m-%d") for m in used_margins 
                                      if m["totalMargin"] == max([um["totalMargin"] for um in used_margins])), "") if used_margins else ""
    }
    
    return {
        "strategies": strategies,
        "portfolioTrades": portfolio_trades,
        "portfolioEquity": portfolio_equity,
        "drawdowns": drawdowns,
        "statistics": statistics,
        "monthlyReturns": monthly_returns,
        "dailyReturns": daily_returns,
        "correlationMatrix": correlation_matrix,
        "margins": margins,
        "usedMargins": used_margins
    }

def process_ninjatrader_csv(file_paths, quantities):
    """Processa i file CSV di NinjaTrader e calcola le statistiche del portafoglio"""
    strategies = []
    portfolio_trades = []
    
    # Processa ogni file
    for i, file_path in enumerate(file_paths):
        quantity = quantities[i] if i < len(quantities) else 1
        file_name = file_path.split("/")[-1].split(".")[0]
        symbol = file_name.split("-")[0].strip().upper()
        
        # Leggi e analizza il contenuto del file
        trades = parse_ninjatrader_csv(file_path, quantity)
        
        # Calcola la curva di equity per questa strategia
        equity = calculate_equity_curve(trades)
        net_profit = equity[-1] if equity else 0
        
        # Aggiungi la strategia alla lista
        strategies.append({
            "name": file_name,
            "symbol": symbol,
            "quantity": quantity,
            "trades": trades,
            "equity": equity,
            "netProfit": net_profit
        })
        
        # Aggiungi trades al portafoglio
        portfolio_trades.extend(trades)
    
    # Il resto dell'elaborazione è lo stesso di TradeStation
    portfolio_trades.sort(key=lambda x: x["exitTime"])
    portfolio_equity = calculate_equity_curve(portfolio_trades)
    drawdowns = calculate_drawdowns(portfolio_equity)
    statistics = calculate_statistics(portfolio_trades, portfolio_equity, drawdowns)
    monthly_returns = calculate_monthly_returns(portfolio_trades)
    daily_returns = calculate_daily_returns(portfolio_trades)
    dfs_equity_strategies = [{"exitTime": [t["exitTime"] for t in s["trades"]], "equity": s["equity"]} for s in strategies]
    correlation_matrix = calculate_strategy_correlation(dfs_equity_strategies, portfolio_trades)
    strategy_margins = calculate_strategy_margins(strategies)
    used_margins = calculate_used_margin(strategies, portfolio_trades, strategy_margins)
    
    margins = {
        "strategyMargins": strategy_margins,
        "minimumAccountRequired": sum(strategy_margins) + statistics["maxDrawdown"],
        "maxUsedMargin": max([m["totalMargin"] for m in used_margins]) if used_margins else 0,
        "maxUsedMarginOccurrences": count_max_occurrences([m["totalMargin"] for m in used_margins]) if used_margins else 0,
        "maxUsedMarginFirstDate": next((m["date"].strftime("%Y-%m-%d") for m in used_margins 
                                      if m["totalMargin"] == max([um["totalMargin"] for um in used_margins])), "") if used_margins else ""
    }
    
    return {
        "strategies": strategies,
        "portfolioTrades": portfolio_trades,
        "portfolioEquity": portfolio_equity,
        "drawdowns": drawdowns,
        "statistics": statistics,
        "monthlyReturns": monthly_returns,
        "dailyReturns": daily_returns,
        "correlationMatrix": correlation_matrix,
        "margins": margins,
        "usedMargins": used_margins
    }

def parse_tradestation_csv(file_path, quantity):
    """Analizza il formato CSV di TradeStation"""
    with open(file_path, 'r') as file:
        lines = file.readlines()
    
    trades = []
    
    # Salta le righe di intestazione (prime 6 righe nel formato TradeStation)
    i = 6
    
    # Elabora i trades (ogni trade è rappresentato da 2 righe)
    while i < len(lines) - 1:
        open_row = lines[i].split(",")
        close_row = lines[i + 1].split(",")
        
        # Salta se non abbiamo entrambe le righe
        if not open_row or not close_row:
            i += 2
            continue
        
        # Estrai i dati dalle righe
        try:
            open_time_str = open_row[2].strip() if len(open_row) > 2 else ""
            exit_time_str = close_row[2].strip() if len(close_row) > 2 else ""
            profit_str = open_row[7].strip() if len(open_row) > 7 else ""
            
            if not open_time_str or not exit_time_str or not profit_str:
                i += 2
                continue
            
            # Analizza date e profitto
            open_time = parse_date(open_time_str)
            exit_time = parse_date(exit_time_str)
            profit = parse_profit(profit_str) * quantity
            
            trades.append({
                "openTime": open_time,
                "exitTime": exit_time,
                "profit": profit
            })
        except Exception as e:
            print(f"Errore nell'analisi del trade: {e}")
        
        i += 2
    
    return trades

def parse_multicharts_csv(file_path, quantity):
    """Analizza il formato CSV di MultiCharts"""
    with open(file_path, 'r') as file:
        lines = file.readlines()
    
    trades = []
    
    # Salta la riga di intestazione
    i = 1
    
    # Elabora i trades (ogni trade è rappresentato da 1 riga in MultiCharts)
    while i < len(lines):
        row = lines[i].split(",")
        
        # Salta se la riga è vuota
        if not row:
            i += 1
            continue
        
        # Estrai i dati dalla riga
        try:
            # Assumendo che il formato MultiCharts abbia colonne: Date, Time, Type, Price, Contracts, Profit
            # Questo è un esempio semplificato - adatta in base al formato effettivo
            date_str = row[0].strip() if len(row) > 0 else ""
            time_str = row[1].strip() if len(row) > 1 else ""
            entry_date_str = row[5].strip() if len(row) > 5 else ""
            entry_time_str = row[6].strip() if len(row) > 6 else ""
            profit_str = row[10].strip() if len(row) > 10 else ""
            
            if not date_str or not time_str or not profit_str or not entry_date_str or not entry_time_str:
                i += 1
                continue
            
            # Analizza date e profitto
            exit_time = parse_multicharts_date(f"{date_str} {time_str}")
            open_time = parse_multicharts_date(f"{entry_date_str} {entry_time_str}")
            profit = parse_multicharts_profit(profit_str) * quantity
            
            trades.append({
                "openTime": open_time,
                "exitTime": exit_time,
                "profit": profit
            })
        except Exception as e:
            print(f"Errore nell'analisi del trade MultiCharts: {e}")
        
        i += 1
    
    return trades

def parse_ninjatrader_csv(file_path, quantity):
    """Analizza il formato CSV di NinjaTrader"""
    with open(file_path, 'r') as file:
        lines = file.readlines()
    
    trades = []
    
    # Salta la riga di intestazione
    i = 1
    
    # Elabora i trades (ogni trade è rappresentato da 1 riga in NinjaTrader)
    while i < len(lines):
        row = lines[i].split(",")
        
        # Salta se la riga è vuota
        if not row:
            i += 1
            continue
        
        # Estrai i dati dalla riga
        try:
            # Assumendo che il formato NinjaTrader abbia colonne: Entry Time, Exit Time, Profit
            # Questo è un esempio semplificato - adatta in base al formato effettivo
            entry_time_str = row[0].strip() if len(row) > 0 else ""
            exit_time_str = row[1].strip() if len(row) > 1 else ""
            profit_str = row[2].strip() if len(row) > 2 else ""
            
            if not entry_time_str or not exit_time_str or not profit_str:
                i += 1
                continue
            
            # Analizza date e profitto
            open_time = parse_ninjatrader_date(entry_time_str)
            exit_time = parse_ninjatrader_date(exit_time_str)
            profit = parse_ninjatrader_profit(profit_str) * quantity
            
            trades.append({
                "openTime": open_time,
                "exitTime": exit_time,
                "profit": profit
            })
        except Exception as e:
            print(f"Errore nell'analisi del trade NinjaTrader: {e}")
        
        i += 1
    
    return trades

def parse_date(date_str):
    """Analizza le stringhe di data per TradeStation"""
    # Assumendo che il formato sia DD/MM/YYYY HH:MM
    date_part, time_part = date_str.split(" ")
    day, month, year = date_part.split("/")
    hour, minute = time_part.split(":")
    
    return datetime(int(year), int(month), int(day), int(hour), int(minute))

def parse_multicharts_date(date_str):
    """Analizza le stringhe di data per MultiCharts"""
    # Assumendo che il formato sia MM/DD/YYYY HH:MM:SS
    date_part, time_part = date_str.split(" ")
    month, day, year = date_part.split("/")
    time_parts = time_part.split(":")
    hour = time_parts[0]
    minute = time_parts[1]
    second = time_parts[2] if len(time_parts) > 2 else "0"
    
    return datetime(int(year), int(month), int(day), int(hour), int(minute), int(second))

def parse_ninjatrader_date(date_str):
    """Analizza le stringhe di data per NinjaTrader"""
    # Assumendo che il formato sia YYYY-MM-DD HH:MM:SS
    date_part, time_part = date_str.split(" ")
    year, month, day = date_part.split("-")
    time_parts = time_part.split(":")
    hour = time_parts[0]
    minute = time_parts[1]
    second = time_parts[2] if len(time_parts) > 2 else "0"
    
    return datetime(int(year), int(month), int(day), int(hour), int(minute), int(second))

def parse_profit(profit_str):
    """Analizza i valori di profitto per TradeStation"""
    # Rimuovi simboli di valuta, virgole, ecc.
    cleaned_str = re.sub(r'[$,()]', '', profit_str)
    # Se il profitto era tra parentesi, è negativo
    return -float(cleaned_str) if "(" in profit_str else float(cleaned_str)

def parse_multicharts_profit(profit_str):
    """Analizza i valori di profitto per MultiCharts"""
    # Rimuovi simboli di valuta, virgole, ecc.
    cleaned_str = re.sub(r'[$,]', '', profit_str)
    # Controlla se il valore è negativo
    return -float(cleaned_str[1:]) if profit_str.startswith("-") else float(cleaned_str)

def parse_ninjatrader_profit(profit_str):
    """Analizza i valori di profitto per NinjaTrader"""
    # Rimuovi simboli di valuta, virgole, ecc.
    cleaned_str = re.sub(r'[$,]', '', profit_str)
    # Controlla se il valore è negativo
    return -float(cleaned_str[1:]) if profit_str.startswith("-") else float(cleaned_str)

def calculate_equity_curve(trades):
    """Calcola la curva di equity dai trades"""
    equity = []
    cumulative_profit = 0
    
    for trade in trades:
        cumulative_profit += trade["profit"]
        equity.append(cumulative_profit)
    
    return equity

def calculate_drawdowns(equity):
    """Calcola i drawdown dalla curva di equity"""
    drawdowns = []
    peak = equity[0] if equity else 0
    
    for value in equity:
        if value > peak:
            peak = value
        drawdown = peak - value
        drawdowns.append(-drawdown)  # Valori negativi per i drawdown
    
    return drawdowns

def calculate_statistics(trades, equity, drawdowns):
    """Calcola le statistiche dai dati del portafoglio"""
    # Utilizziamo pandas e numpy per calcoli statistici più avanzati
    
    if not trades or not equity:
        return {
            "totalNetProfit": 0,
            "maxDrawdown": 0,
            "meanDrawdown": 0,
            "netProfitMaxDD": float('inf'),
            "netProfitMeanDD": float('inf'),
            "profitFactor": float('inf'),
            "winRatioPercentage": 0,
            "riskRewardRatio": 0,
            "totalTrades": 0,
            "averageTradeProfit": 0,
            "maxConsecutiveWinningTrades": 0,
            "maxConsecutiveLosingTrades": 0,
            "tradesPerMonth": 0,
            "netProfitPerMonth": 0,
            "sharpeRatio": 0,
            "sortinoRatio": 0,
            "realMinimumAccountReq": 10000
        }
    
    # Converti i dati in DataFrame per un'analisi più facile
    df_trades = pd.DataFrame([{
        'openTime': t['openTime'],
        'exitTime': t['exitTime'],
        'profit': t['profit']
    } for t in trades])
    
    # Calcola il profitto netto totale
    total_net_profit = equity[-1] if equity else 0
    
    # Calcola il drawdown massimo
    max_drawdown = abs(min(drawdowns)) if drawdowns else 0
    
    # Calcola il drawdown medio
    mean_drawdown = abs(sum(drawdowns) / len(drawdowns)) if drawdowns else 0
    
    # Calcola il rapporto di vincita
    winning_trades = df_trades[df_trades['profit'] > 0]
    win_ratio_percentage = (len(winning_trades) / len(df_trades) * 100) if len(df_trades) > 0 else 0
    
    # Calcola la vincita media e la perdita
    winning_profits = winning_trades['profit'].tolist() if not winning_trades.empty else []
    losing_profits = df_trades[df_trades['profit'] < 0]['profit'].tolist()
    
    average_win = sum(winning_profits) / len(winning_profits) if winning_profits else 0
    average_loss = sum(losing_profits) / len(losing_profits) if losing_profits else 0
    
    risk_reward_ratio = abs(average_win / average_loss) if average_loss != 0 else float('inf')
    
    # Calcola il fattore di profitto
    total_gross_profit = sum(winning_profits)
    total_gross_loss = abs(sum(losing_profits))
    profit_factor = total_gross_profit / total_gross_loss if total_gross_loss != 0 else float('inf')
    
    # Calcola il profitto medio per trade
    average_trade_profit = df_trades['profit'].mean() if not df_trades.empty else 0
    
    # Calcola il massimo di trade vincenti/perdenti consecutivi
    df_trades['is_win'] = df_trades['profit'] > 0
    df_trades['is_loss'] = df_trades['profit'] < 0
    
    # Funzione per calcolare il massimo di valori consecutivi
    def max_consecutive(series):
        max_consec = 0
        current_consec = 0
        for val in series:
            if val:
                current_consec += 1
                max_consec = max(max_consec, current_consec)
            else:
                current_consec = 0
        return max_consec
    
    max_consecutive_winning_trades = max_consecutive(df_trades['is_win'])
    max_consecutive_losing_trades = max_consecutive(df_trades['is_loss'])
    
    # Calcola i trade per mese
    df_trades['year_month'] = df_trades['exitTime'].apply(lambda x: f"{x.year}-{x.month:02d}")
    months = df_trades['year_month'].nunique()
    trades_per_month = len(df_trades) / max(months, 1)
    
    # Calcola il profitto netto per mese
    net_profit_per_month = total_net_profit / max(months, 1)
    
    # Calcola i rapporti Sharpe e Sortino (utilizzando pandas per calcoli più precisi)
    # Assumiamo un tasso privo di rischio del 0%
    if len(df_trades) > 1:
        # Calcola i rendimenti giornalieri
        df_trades['date'] = df_trades['exitTime'].dt.date
        daily_returns = df_trades.groupby('date')['profit'].sum()
        
        # Sharpe Ratio
        sharpe_ratio = daily_returns.mean() / daily_returns.std() * np.sqrt(252) if daily_returns.std() != 0 else 0
        
        # Sortino Ratio (considera solo i rendimenti negativi)
        negative_returns = daily_returns[daily_returns < 0]
        sortino_ratio = daily_returns.mean() / negative_returns.std() * np.sqrt(252) if not negative_returns.empty and negative_returns.std() != 0 else 0
    else:
        sharpe_ratio = 0
        sortino_ratio = 0
    
    # Calcola il requisito minimo reale dell'account
    # Questo è un valore segnaposto - in un'app reale, implementeresti un calcolo più sofisticato
    real_minimum_account_req = max_drawdown * 2
    
    return {
        "totalNetProfit": total_net_profit,
        "maxDrawdown": max_drawdown,
        "meanDrawdown": mean_drawdown,
        "netProfitMaxDD": total_net_profit / max_drawdown if max_drawdown != 0 else float('inf'),
        "netProfitMeanDD": total_net_profit / mean_drawdown if mean_drawdown != 0 else float('inf'),
        "profitFactor": profit_factor,
        "winRatioPercentage": win_ratio_percentage,
        "riskRewardRatio": risk_reward_ratio,
        "totalTrades": len(df_trades),
        "averageTradeProfit": average_trade_profit,
        "maxConsecutiveWinningTrades": max_consecutive_winning_trades,
        "maxConsecutiveLosingTrades": max_consecutive_losing_trades,
        "tradesPerMonth": trades_per_month,
        "netProfitPerMonth": net_profit_per_month,
        "sharpeRatio": sharpe_ratio,
        "sortinoRatio": sortino_ratio,
        "realMinimumAccountReq": real_minimum_account_req
    }

def calculate_monthly_returns(trades):
    """Calcola i rendimenti mensili"""
    monthly_returns = {}
    
    for trade in trades:
        year_month = f"{trade['exitTime'].year}-{trade['exitTime'].month:02d}"
        
        if year_month not in monthly_returns:
            monthly_returns[year_month] = 0
        
        monthly_returns[year_month] += trade['profit']
    
    return monthly_returns

def calculate_daily_returns(trades):
    """Calcola i rendimenti giornalieri"""
    daily_returns = {}
    
    for trade in trades:
        day = trade['exitTime'].strftime("%Y-%m-%d")
        
        if day not in daily_returns:
            daily_returns[day] = 0
        
        daily_returns[day] += trade['profit']
    
    return daily_returns

def calculate_strategy_correlation(dfs_equity_strategies, portfolio_trades):
    """Calcola la correlazione tra le strategie"""
    # Utilizziamo pandas per calcolare la correlazione
    
    if not dfs_equity_strategies or len(dfs_equity_strategies) < 2:
        return [[1.0]]  # Se c'è una sola strategia, la correlazione è 1
    
    # Crea un DataFrame con i rendimenti giornalieri per ogni strategia
    strategy_returns = {}
    
    for i, strategy_data in enumerate(dfs_equity_strategies):
        if not strategy_data['exitTime'] or not strategy_data['equity']:
            continue
            
        # Crea una serie temporale di equity
        df = pd.DataFrame({
            'date': [t.date() for t in strategy_data['exitTime']],
            f'equity_{i}': strategy_data['equity']
        })
        
        # Calcola i rendimenti giornalieri
        df = df.sort_values('date')
        df[f'return_{i}'] = df[f'equity_{i}'].pct_change()
        
        # Aggiungi al dizionario
        for _, row in df.iterrows():
            date = row['date']
            if date not in strategy_returns:
                strategy_returns[date] = {}
            strategy_returns[date][f'return_{i}'] = row[f'return_{i}']
    
    # Converti in DataFrame
    df_returns = pd.DataFrame.from_dict(strategy_returns, orient='index')
    df_returns = df_returns.fillna(0)  # Riempi i valori NaN con 0
    
    # Calcola la matrice di correlazione
    correlation_matrix = df_returns.corr().values.tolist()
    
    # Se ci sono NaN nella matrice, sostituiscili con 0
    for i in range(len(correlation_matrix)):
        for j in range(len(correlation_matrix[i])):
            if pd.isna(correlation_matrix[i][j]):
                correlation_matrix[i][j] = 0.0
    
    return correlation_matrix

def calculate_strategy_margins(strategies):
    """Calcola i margini delle strategie utilizzando lo scraping da TradeStation"""
    strategy_margins = []
    
    for strategy in strategies:
        symbol = strategy['symbol']
        quantity = strategy['quantity']
        margin = calculate_margin_for_symbol(symbol) * quantity
        strategy_margins.append(margin)
    
    return strategy_margins

def calculate_used_margin(strategies, portfolio_trades, strategy_margins):
    """Calcola il margine utilizzato"""
    if not portfolio_trades:
        return []
        
    # Trova l'intervallo di date
    start_date = min([t['openTime'] for t in portfolio_trades])
    end_date = max([t['exitTime'] for t in portfolio_trades])
    
    # Crea una serie di date (intervalli orari)
    dates = []
    current_date = start_date
    
    while current_date <= end_date:
        dates.append(current_date)
        current_date = current_date.replace(hour=current_date.hour + 1)
    
    # Calcola il margine utilizzato per ogni data
    used_margins = []
    
    for date in dates:
        strategy_margins_used = {}
        total_margin = 0
        
        for i, strategy in enumerate(strategies):
            # Controlla se ci sono trade aperti per questa strategia in questa data
            open_trades = [t for t in strategy['trades'] if t['openTime'] <= date <= t['exitTime']]
            
            margin_used = strategy_margins[i] if open_trades else 0
            strategy_margins_used[strategy['name']] = margin_used
            total_margin += margin_used
        
        used_margins.append({
            "date": date,
            "totalMargin": total_margin,
            "strategyMargins": strategy_margins_used
        })
    
    return used_margins

def count_max_occurrences(numbers):
    """Conta le occorrenze del valore massimo"""
    if not numbers:
        return 0
    max_value = max(numbers)
    return numbers.count(max_value)
