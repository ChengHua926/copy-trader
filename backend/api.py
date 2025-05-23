import os
import json
import time
import glob
import requests
import pandas as pd
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("copy_trader_api")

# Initialize FastAPI app
app = FastAPI(title="Copy Trader API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
HELIUS_API_KEY = "8d024022-a5bb-4586-a7ac-6aada64c3c8f"
MORALIS_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjdhNGZlYWQ5LTcwYTctNDM4Yi04OTllLWNkZTdkMWQxZGM5MSIsIm9yZ0lkIjoiNDQ4NTk4IiwidXNlcklkIjoiNDYxNTUyIiwidHlwZUlkIjoiOWI5ZjBiNjgtZjEzNy00M2Y0LWE3YzAtYzc0NGJmYzM1ZDk2IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NDc5NDEwMTIsImV4cCI6NDkwMzcwMTAxMn0.khJU9l1Q-uvGQsE5vAtrV6__CUqkSHLATociQt3QuA8"
HELIUS_BASE_URL = "https://api.helius.xyz/v0/addresses"
MORALIS_BASE_URL = "https://solana-gateway.moralis.io/token/mainnet"
TRANSACTION_TYPES = ["SWAP", "TRANSFER"]
TOTAL_TRANSACTIONS_NEEDED = 700
TRANSACTIONS_PER_PAGE = 100

# Follower scoring constants
WINDOW = 10  # Maximum delay for speed normalization
TIER_BOUNDARIES = {
    'Gold': 0.75,
    'Silver': 0.5,
    'Bronze': 0.3
}

# List of known non-memecoin tokens (SOL and common stablecoins)
NON_MEMECOINS = [
    'So11111111111111111111111111111111111111112',  # SOL
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',  # USDC
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',  # USDT
    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',  # mSOL
]

# Models
class WalletRequest(BaseModel):
    wallet_address: str

class ProgressResponse(BaseModel):
    status: str
    message: str
    data: Dict[str, Any] = {}
    current_step: str
    next_step: Optional[str] = None
    progress: Dict[str, Any] = {}

class FollowerScore(BaseModel):
    addr: str
    hits: int
    breadth: int
    avg_delay: float
    med_delay: float
    freq_norm: float
    speed_norm: float
    breadth_norm: float
    score: float
    tier: str

# New models for copy transactions endpoint
class CopyTransactionRequest(BaseModel):
    target_wallet: str
    follower_wallet: str

class TokenInfo(BaseModel):
    address: str
    name: str
    symbol: str
    logo: Optional[str] = ""

class TransactionInfo(BaseModel):
    slot: int
    timestamp: int
    signature: str
    amount: str
    usd_amount: float

class CopyTransaction(BaseModel):
    token: TokenInfo
    leader_transaction: TransactionInfo
    follower_transaction: TransactionInfo
    delay_slots: int

class CopyTransactionsResponse(BaseModel):
    transactions: List[CopyTransaction]

# Step 1: Fetch Transactions
def ensure_wallet_data_dirs(wallet_address: str) -> Dict[str, str]:
    """Create all necessary directories for a wallet's data"""
    wallet_dir = os.path.join(os.path.dirname(__file__), "data", wallet_address)
    transactions_dir = os.path.join(wallet_dir, "transactions")
    filtered_dir = os.path.join(wallet_dir, "filtered_transactions")
    token_swaps_dir = os.path.join(wallet_dir, "token_swaps")
    copy_trades_dir = os.path.join(wallet_dir, "copy_trades")
    
    # Create dirs if they don't exist
    os.makedirs(wallet_dir, exist_ok=True)
    os.makedirs(transactions_dir, exist_ok=True)
    os.makedirs(filtered_dir, exist_ok=True)
    os.makedirs(token_swaps_dir, exist_ok=True)
    os.makedirs(copy_trades_dir, exist_ok=True)
    
    return {
        "wallet_dir": wallet_dir,
        "transactions_dir": transactions_dir,
        "filtered_dir": filtered_dir,
        "token_swaps_dir": token_swaps_dir,
        "copy_trades_dir": copy_trades_dir
    }

def save_transaction(transaction: Dict[Any, Any], transactions_dir: str):
    """Save a single transaction as a JSON file"""
    signature = transaction.get("signature", "")
    if not signature:
        return
    
    # Use first 8 characters of signature as filename
    filename = f"{signature[:8]}.json"
    filepath = os.path.join(transactions_dir, filename)
    
    with open(filepath, 'w') as f:
        json.dump(transaction, f, indent=2)

def fetch_transactions(wallet_address: str, before_signature: str = None) -> List[Dict[Any, Any]]:
    """Fetch transactions from Helius API with pagination"""
    url = f"{HELIUS_BASE_URL}/{wallet_address}/transactions"
    
    params = {
        "api-key": HELIUS_API_KEY,
        "limit": TRANSACTIONS_PER_PAGE,
        "type": TRANSACTION_TYPES
    }
    
    if before_signature:
        params["before"] = before_signature
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching transactions: {e}")
        return []

def fetch_and_save_transactions(wallet_address: str) -> Dict[str, Any]:
    """Fetch transactions for a wallet and save them to disk"""
    # Set up directories
    dirs = ensure_wallet_data_dirs(wallet_address)
    transactions_dir = dirs["transactions_dir"]
    
    all_transactions = []
    last_signature = None
    
    while len(all_transactions) < TOTAL_TRANSACTIONS_NEEDED:
        # Fetch transactions
        transactions = fetch_transactions(wallet_address, last_signature)
        
        if not transactions:
            print(f"No more transactions for wallet {wallet_address}")
            break
            
        # Save each transaction as a separate file
        for tx in transactions:
            save_transaction(tx, transactions_dir)
            
        all_transactions.extend(transactions)
        
        # Update last signature for pagination
        if transactions:
            last_signature = transactions[-1].get("signature")
        
        # Add a small delay to avoid rate limiting
        time.sleep(0.5)
        
        print(f"Fetched and saved {len(all_transactions)} transactions so far for {wallet_address}...")
    
    # Trim to exact number needed
    all_transactions = all_transactions[:TOTAL_TRANSACTIONS_NEEDED]
    
    return {
        "transactions_fetched": len(all_transactions),
        "first_signature": all_transactions[0].get("signature") if all_transactions else None,
        "last_signature": all_transactions[-1].get("signature") if all_transactions else None,
        "transactions_dir": transactions_dir
    }

# Step 2: Filter Transactions
def analyze_transaction(tx: Dict[Any, Any], wallet_address: str) -> Optional[Dict[str, Any]]:
    """
    Analyze transaction to find memecoin purchases and return relevant details
    Returns None if not a buy transaction, or dict with details if it is
    """
    # Check if fee payer is our target wallet
    if tx.get('feePayer') != wallet_address:
        return None
    
    # Look for token transfers where our wallet is receiving tokens
    for transfer in tx.get('tokenTransfers', []):
        # Check if the tracked wallet is receiving the token
        if (transfer.get('toUserAccount') == wallet_address and 
            transfer.get('mint') not in NON_MEMECOINS):
            return {
                'mint': transfer.get('mint'),
                'amount': transfer.get('tokenAmount'),
                'slot': tx.get('slot'),
                'timestamp': tx.get('timestamp'),
                'signature': tx.get('signature')
            }
    
    return None

def save_filtered_transaction(tx_data: Dict[str, Any], filtered_dir: str):
    """Save filtered transaction data as JSON file"""
    signature = tx_data.get('signature', '')
    if not signature:
        return
    
    # Use first 8 characters of signature as filename
    filename = f"{signature[:8]}.json"
    filepath = os.path.join(filtered_dir, filename)
    
    with open(filepath, 'w') as f:
        json.dump(tx_data, f, indent=2)

def filter_transactions(wallet_address: str) -> Dict[str, Any]:
    """
    Process all transactions for a wallet and filter for memecoin purchases
    """
    dirs = ensure_wallet_data_dirs(wallet_address)
    transactions_dir = dirs["transactions_dir"]
    filtered_dir = dirs["filtered_dir"]
    
    total_txs = 0
    buy_txs = 0
    
    # Process each transaction file
    for filename in os.listdir(transactions_dir):
        if not filename.endswith('.json'):
            continue
            
        total_txs += 1
        filepath = os.path.join(transactions_dir, filename)
        
        try:
            with open(filepath, 'r') as f:
                tx = json.load(f)
                
            # Analyze transaction
            filtered_data = analyze_transaction(tx, wallet_address)
            if filtered_data:
                save_filtered_transaction(filtered_data, filtered_dir)
                buy_txs += 1
                
        except Exception as e:
            print(f"Error processing {filename}: {e}")
    
    return {
        "total_transactions": total_txs,
        "buy_transactions": buy_txs,
        "buy_percentage": round((buy_txs/total_txs*100), 2) if total_txs > 0 else 0,
        "filtered_dir": filtered_dir
    }

# Step 3: Fetch Swaps
def fetch_token_swaps(token_address: str, from_date: int, to_date: int, cursor: Optional[str] = None) -> Dict[Any, Any]:
    """
    Fetch swap transactions for a specific token address using timestamps
    """
    url = f"{MORALIS_BASE_URL}/{token_address}/swaps"
    
    # Add parameters to URL
    params = []
    params.append(f"fromDate={from_date}")
    params.append(f"toDate={to_date}")
    params.append("transactionTypes=buy")
    
    if cursor:
        params.append(f"cursor={cursor}")
    
    # Add order parameter
    params.append("order=DESC")
    
    # Join all parameters with &
    if params:
        url += "?" + "&".join(params)
    
    headers = {
        "Accept": "application/json",
        "X-API-Key": MORALIS_API_KEY
    }
    
    try:
        print(f"Requesting URL: {url}")
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        return data
    except requests.exceptions.RequestException as e:
        print(f"Error fetching swaps: {e}")
        return {}

def fetch_all_swaps(token_address: str, from_date: int, to_date: int) -> List[Dict[Any, Any]]:
    """
    Fetch all swap transactions using pagination
    """
    all_results = []
    cursor = None
    
    while True:
        result = fetch_token_swaps(token_address, from_date, to_date, cursor)
        
        if not result or 'result' not in result:
            break
            
        all_results.extend(result['result'])
        
        # Check if there's a cursor for the next page
        cursor = result.get('cursor')
        if not cursor:
            break
            
        print(f"Fetching next page with cursor: {cursor}")
    
    return all_results

def save_swaps_to_file(data: List[Dict[Any, Any]], token_address: str, original_tx_signature: str, token_swaps_dir: str):
    """
    Save the swaps data to a JSON file in the token_swaps directory
    """
    # Create filename using token address and original transaction signature
    filename = f"swaps_{token_address[:8]}_{original_tx_signature[:8]}.json"
    filepath = os.path.join(token_swaps_dir, filename)
    
    with open(filepath, 'w') as f:
        json.dump({"result": data}, f, indent=2)
    
    print(f"Swaps data saved to: {filepath}")
    return filepath

def fetch_swaps_for_filtered_transactions(wallet_address: str) -> Dict[str, Any]:
    """
    For each filtered transaction, fetch swaps that occurred right after it
    """
    dirs = ensure_wallet_data_dirs(wallet_address)
    filtered_dir = dirs["filtered_dir"]
    token_swaps_dir = dirs["token_swaps_dir"]
    
    # Get all filtered transaction files
    filtered_files = glob.glob(os.path.join(filtered_dir, "*.json"))
    
    total_files = len(filtered_files)
    print(f"Found {total_files} filtered transaction files to process")
    
    swaps_data = []
    processed_count = 0
    tokens_with_swaps = 0
    total_swaps_found = 0
    
    for i, filtered_file in enumerate(filtered_files, 1):
        try:
            # Read the filtered transaction file
            with open(filtered_file, 'r') as f:
                tx_data = json.load(f)
            
            token_address = tx_data['mint']
            timestamp = tx_data['timestamp']
            signature = tx_data['signature']
            
            print(f"Processing file {i}/{total_files}")
            print(f"Token Address: {token_address}")
            print(f"Timestamp: {timestamp}")
            
            # Fetch swaps from timestamp to timestamp + 3 seconds
            from_date = timestamp
            to_date = timestamp + 3
            
            # Fetch all swaps for this token in the time window
            all_results = fetch_all_swaps(token_address, from_date, to_date)
            
            # Save results to file if any were found
            if all_results:
                filepath = save_swaps_to_file(all_results, token_address, signature, token_swaps_dir)
                tokens_with_swaps += 1
                total_swaps_found += len(all_results)
                
                swaps_data.append({
                    "token": token_address,
                    "timestamp": timestamp,
                    "signature": signature,
                    "swaps_found": len(all_results),
                    "filepath": filepath
                })
            
            processed_count += 1
            
            # Add a small delay to avoid rate limiting
            time.sleep(0.5)
            
        except Exception as e:
            print(f"Error processing file {filtered_file}: {e}")
            continue
    
    return {
        "filtered_transactions_processed": processed_count,
        "tokens_with_swaps": tokens_with_swaps,
        "total_swaps_found": total_swaps_found,
        "swaps_data": swaps_data
    }

# Step 4: Analyze Copy Trades
def load_filtered_transaction(file_path: str) -> Dict[str, Any]:
    """Load a single filtered transaction file"""
    with open(file_path, 'r') as f:
        return json.load(f)

def load_swap_data(file_path: str) -> Dict[str, Any]:
    """Load a single swap data file"""
    with open(file_path, 'r') as f:
        return json.load(f)

def create_copy_trades_table(wallet_address: str) -> pd.DataFrame:
    """
    Create a table of copy trades by analyzing filtered transactions and swap data
    """
    # Initialize lists to store the data
    copy_trades = []
    
    # Get paths to directories
    dirs = ensure_wallet_data_dirs(wallet_address)
    filtered_dir = dirs["filtered_dir"]
    token_swaps_dir = dirs["token_swaps_dir"]
    
    # Process each filtered transaction
    for filtered_tx_file in os.listdir(filtered_dir):
        if not filtered_tx_file.endswith('.json'):
            continue
            
        # Load filtered transaction data
        filtered_tx_path = os.path.join(filtered_dir, filtered_tx_file)
        filtered_tx = load_filtered_transaction(filtered_tx_path)
        
        lead_signature = filtered_tx['signature']
        token_mint = filtered_tx['mint']
        lead_slot = filtered_tx['slot']
        
        # Find corresponding swap data
        # The swap file name format is: swaps_{token_mint[:8]}_{lead_signature[:8]}.json
        swap_file = f"swaps_{token_mint[:8]}_{lead_signature[:8]}.json"
        swap_path = os.path.join(token_swaps_dir, swap_file)
        
        if not os.path.exists(swap_path):
            print(f"No swap data found for {lead_signature}")
            continue
            
        # Load and process swap data
        swap_data = load_swap_data(swap_path)
        
        if not swap_data.get('result'):
            continue
            
        # Process each swap in the result
        for swap in swap_data['result']:
            follower_addr = swap['walletAddress']
            follower_slot = swap['blockNumber']
            
            # Calculate delay in slots
            delay_slots = follower_slot - lead_slot
            
            # Add to copy trades list
            copy_trades.append({
                'lead_index': lead_signature,
                'token': token_mint,
                'follower_addr': follower_addr,
                'delay_slots': delay_slots,
                'lead_slot': lead_slot,
                'follower_slot': follower_slot,
                'timestamp': filtered_tx['timestamp']
            })
    
    # Create DataFrame
    df = pd.DataFrame(copy_trades)
    
    # If the DataFrame is empty, return an empty DataFrame with the expected columns
    if df.empty:
        return pd.DataFrame(columns=[
            'lead_index', 'token', 'follower_addr', 'delay_slots', 
            'lead_slot', 'follower_slot', 'timestamp'
        ])
    
    # Sort by lead_index and delay_slots
    df = df.sort_values(['lead_index', 'delay_slots'])
    
    return df

def save_copy_trades_table(df: pd.DataFrame, wallet_address: str) -> Dict[str, Any]:
    """
    Save the copy trades table in multiple formats for easy access
    """
    # Create timestamp for file names
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # Get path to copy_trades directory
    dirs = ensure_wallet_data_dirs(wallet_address)
    copy_trades_dir = dirs["copy_trades_dir"]
    
    # Save as CSV
    csv_path = os.path.join(copy_trades_dir, f"copy_trades_{timestamp}.csv")
    df.to_csv(csv_path, index=False)
    
    # Save as Parquet (more efficient for large datasets)
    parquet_path = os.path.join(copy_trades_dir, f"copy_trades_{timestamp}.parquet")
    df.to_parquet(parquet_path, index=False)
    
    # Save as JSON (for easy programmatic access)
    json_path = os.path.join(copy_trades_dir, f"copy_trades_{timestamp}.json")
    df.to_json(json_path, orient='records', indent=2)
    
    # Generate summary statistics
    stats = {
        "total_copy_trades": len(df),
        "unique_lead_transactions": df['lead_index'].nunique() if not df.empty else 0,
        "unique_followers": df['follower_addr'].nunique() if not df.empty else 0,
        "unique_tokens": df['token'].nunique() if not df.empty else 0,
        "csv_path": csv_path,
        "parquet_path": parquet_path,
        "json_path": json_path
    }
    
    # Add delay statistics if the DataFrame is not empty
    if not df.empty:
        delay_stats = df['delay_slots'].describe().to_dict()
        stats["delay_stats"] = {
            "mean": delay_stats.get('mean', 0),
            "min": delay_stats.get('min', 0),
            "max": delay_stats.get('max', 0),
            "median": delay_stats.get('50%', 0)
        }
    else:
        stats["delay_stats"] = {
            "mean": 0,
            "min": 0,
            "max": 0,
            "median": 0
        }
    
    return stats

def analyze_copy_trades(wallet_address: str) -> Dict[str, Any]:
    """
    Create and save the copy trades table for a wallet
    """
    # Create the copy trades table
    df = create_copy_trades_table(wallet_address)
    
    # Save the table and get statistics
    stats = save_copy_trades_table(df, wallet_address)
    
    return stats, df

# Step 5: Calculate Follower Scores
def clean_copy_trades(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean the copy trades data by applying filtering rules
    
    Rules:
    1. Drop rows where delay_slots < 0 (frontrunning/MEV)
    2. Keep rows where 0 <= delay_slots <= WINDOW
    """
    if df.empty:
        return df
    
    # Apply filtering rules
    cleaned_df = df[(df['delay_slots'] >= 0) & (df['delay_slots'] <= WINDOW)]
    
    return cleaned_df

def calculate_follower_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate metrics for each follower
    """
    if df.empty:
        return pd.DataFrame(columns=[
            'addr', 'hits', 'breadth', 'avg_delay', 'med_delay'
        ])
    
    # Group by follower address and calculate metrics
    metrics = df.groupby('follower_addr').agg({
        'lead_index': 'count',  # hits
        'token': 'nunique',     # breadth
        'delay_slots': ['mean', 'median']  # avg_delay and med_delay
    }).reset_index()
    
    # Rename columns for clarity
    metrics.columns = ['addr', 'hits', 'breadth', 'avg_delay', 'med_delay']
    
    # Filter out followers with less than 3 hits
    metrics = metrics[metrics['hits'] >= 3]
    
    return metrics

def normalize_metrics(metrics: pd.DataFrame, total_lead_buys: int) -> pd.DataFrame:
    """
    Normalize the metrics according to the specified formulas
    """
    if metrics.empty:
        return metrics
    
    # Calculate normalizations
    metrics['freq_norm'] = metrics['hits'] / total_lead_buys
    
    # breadth_norm = breadth / hits
    metrics['breadth_norm'] = metrics['breadth'] / metrics['hits']
    
    # speed_norm: 1.0 if avg_delay ≤ 4, else linear fall-off to 0.0 at WINDOW
    metrics['speed_norm'] = metrics['avg_delay'].apply(
        lambda x: 1.0 if x <= 4 else max(0, 1 - (x - 4) / (WINDOW - 4))
    )
    
    return metrics

def calculate_scores(metrics: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate the final copy score and assign tiers
    """
    if metrics.empty:
        return metrics
    
    # Calculate copy score
    metrics['score'] = (
        0.6 * metrics['freq_norm'] +
        0.3 * metrics['speed_norm'] +
        0.1 * metrics['breadth_norm']
    )
    
    # Assign tiers based on score
    def assign_tier(score: float) -> str:
        if score >= TIER_BOUNDARIES['Gold']:
            return 'Gold'
        elif score >= TIER_BOUNDARIES['Silver']:
            return 'Silver'
        elif score >= TIER_BOUNDARIES['Bronze']:
            return 'Bronze'
        return 'Unranked'
    
    metrics['tier'] = metrics['score'].apply(assign_tier)
    
    return metrics

def save_follower_scores(metrics: pd.DataFrame, wallet_address: str) -> Dict[str, Any]:
    """
    Save the follower scores and return the data
    """
    if metrics.empty:
        return {
            "total_followers": 0,
            "follower_scores": []
        }
    
    # Create timestamp for file names
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # Get path to wallet directory
    dirs = ensure_wallet_data_dirs(wallet_address)
    wallet_dir = dirs["wallet_dir"]
    
    # Round numeric columns for better readability
    numeric_cols = ['avg_delay', 'med_delay', 'score', 'freq_norm', 'speed_norm', 'breadth_norm']
    metrics[numeric_cols] = metrics[numeric_cols].round(3)
    
    # Save as JSON
    json_path = os.path.join(wallet_dir, f"follower_scores_{timestamp}.json")
    metrics.to_json(json_path, orient='records', indent=2)
    
    # Save as Parquet
    parquet_path = os.path.join(wallet_dir, f"follower_scores_{timestamp}.parquet")
    metrics.to_parquet(parquet_path, index=False)
    
    # Create the response data
    follower_scores = metrics.to_dict('records')
    
    # Generate tier distribution stats
    tier_distribution = metrics['tier'].value_counts().to_dict()
    
    return {
        "total_followers": len(metrics),
        "tier_distribution": tier_distribution,
        "follower_scores": follower_scores,
        "json_path": json_path
    }

def calculate_follower_scores(wallet_address: str, copy_trades_df: pd.DataFrame) -> Dict[str, Any]:
    """
    Calculate and save follower scores based on copy trades data
    """
    # Clean the copy trades data
    cleaned_df = clean_copy_trades(copy_trades_df)
    
    # If data is empty after cleaning, return empty results
    if cleaned_df.empty:
        return {
            "total_followers": 0,
            "follower_scores": []
        }
    
    # Calculate total number of unique lead transactions
    total_lead_buys = cleaned_df['lead_index'].nunique()
    
    # Calculate follower metrics
    metrics = calculate_follower_metrics(cleaned_df)
    
    # If no followers meet criteria, return empty results
    if metrics.empty:
        return {
            "total_followers": 0,
            "follower_scores": []
        }
    
    # Normalize metrics
    metrics = normalize_metrics(metrics, total_lead_buys)
    
    # Calculate scores and assign tiers
    metrics = calculate_scores(metrics)
    
    # Save results and prepare response
    results = save_follower_scores(metrics, wallet_address)
    
    return results

# Main API endpoint
@app.post("/process-wallet", response_model=ProgressResponse)
async def process_wallet(request: WalletRequest):
    """
    Process a wallet address through multiple steps
    """
    wallet_address = request.wallet_address
    
    try:
        # Step 1: Fetch transactions
        fetch_result = fetch_and_save_transactions(wallet_address)
        
        # Step 2: Filter transactions
        filter_result = filter_transactions(wallet_address)
        
        # Step 3: Fetch swaps for filtered transactions
        swaps_result = fetch_swaps_for_filtered_transactions(wallet_address)
        
        # Step 4: Analyze copy trades
        analysis_result, copy_trades_df = analyze_copy_trades(wallet_address)
        
        # Step 5: Calculate follower scores
        scores_result = calculate_follower_scores(wallet_address, copy_trades_df)
        
        return ProgressResponse(
            status="success",
            message=f"Processed wallet {wallet_address}: Found {scores_result['total_followers']} copy traders following this wallet",
            data={
                "wallet_address": wallet_address,
                "transactions_fetched": fetch_result["transactions_fetched"],
                "buy_transactions": filter_result["buy_transactions"],
                "buy_percentage": filter_result["buy_percentage"],
                "swaps_processed": swaps_result["filtered_transactions_processed"],
                "tokens_with_swaps": swaps_result["tokens_with_swaps"],
                "total_swaps_found": swaps_result["total_swaps_found"],
                "copy_trades": {
                    "total": analysis_result["total_copy_trades"],
                    "unique_lead_transactions": analysis_result["unique_lead_transactions"],
                    "unique_followers": analysis_result["unique_followers"],
                    "unique_tokens": analysis_result["unique_tokens"],
                    "delay_stats": analysis_result["delay_stats"]
                },
                "follower_scores": scores_result["follower_scores"],
                "tier_distribution": scores_result.get("tier_distribution", {})
            },
            current_step="calculate_scores",
            next_step=None,
            progress={
                "fetch_transactions": "completed",
                "filter_transactions": "completed",
                "fetch_swaps": "completed",
                "analyze_copy_trades": "completed",
                "calculate_scores": "completed"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing wallet: {str(e)}")

@app.get("/")
async def root():
    """Root endpoint for health check"""
    return {"status": "healthy", "message": "Copy Trader API is running"}

@app.post("/get-copy-transactions", response_model=CopyTransactionsResponse)
async def get_copy_transactions(request: CopyTransactionRequest):
    """
    Get copy transactions between a target wallet and a follower wallet
    """
    target_wallet = request.target_wallet
    follower_wallet = request.follower_wallet
    
    logger.info(f"Processing copy transactions request for target wallet: {target_wallet} and follower wallet: {follower_wallet}")
    
    try:
        # Get paths to directories
        dirs = ensure_wallet_data_dirs(target_wallet)
        copy_trades_dir = dirs["copy_trades_dir"]
        token_swaps_dir = dirs["token_swaps_dir"]
        
        logger.info(f"Looking for copy trades in: {copy_trades_dir}")
        
        # Get all copy_trades JSON files
        copy_trades_files = glob.glob(os.path.join(copy_trades_dir, "*.json"))
        
        if not copy_trades_files:
            logger.warning(f"No copy trades files found for wallet: {target_wallet}")
            return CopyTransactionsResponse(transactions=[])
        
        # Sort files by modification time (newest first)
        copy_trades_files.sort(key=os.path.getmtime, reverse=True)
        
        # Use the most recent file
        latest_file = copy_trades_files[0]
        logger.info(f"Using most recent copy trades file: {latest_file}")
        
        # Load the copy trades data
        with open(latest_file, 'r') as f:
            copy_trades_data = json.load(f)
        
        # Filter for the specific follower wallet
        follower_trades = [trade for trade in copy_trades_data 
                          if trade.get('follower_addr') == follower_wallet]
        
        logger.info(f"Found {len(follower_trades)} copy trades for follower wallet: {follower_wallet}")
        
        # Deduplicate by creating a unique key for each transaction
        unique_trades = {}
        for trade in follower_trades:
            # Create a unique key using token, lead signature, and follower slot
            unique_key = f"{trade.get('token')}_{trade.get('lead_index')[:8]}_{trade.get('follower_slot')}"
            
            # Only keep one entry for each unique transaction
            if unique_key not in unique_trades:
                unique_trades[unique_key] = trade
        
        logger.info(f"After deduplication: {len(unique_trades)} unique copy trades")
        
        transactions = []
        
        # Use the deduplicated trades
        for trade in unique_trades.values():
            token_mint = trade.get('token')
            lead_signature = trade.get('lead_index')
            lead_slot = trade.get('lead_slot')
            follower_slot = trade.get('follower_slot')
            delay_slots = trade.get('delay_slots')
            timestamp = trade.get('timestamp')
            
            logger.info(f"Processing trade for token: {token_mint}, lead signature: {lead_signature[:8]}...")
            
            # Find the corresponding token swaps file
            # Format: swaps_{token_mint[:8]}_{lead_signature[:8]}.json
            swap_file_pattern = f"swaps_{token_mint[:8]}_{lead_signature[:8]}*.json"
            swap_files = glob.glob(os.path.join(token_swaps_dir, swap_file_pattern))
            
            if not swap_files:
                logger.warning(f"No swap file found for token: {token_mint} and signature: {lead_signature[:8]}")
                continue
            
            swap_file = swap_files[0]
            logger.info(f"Found swap file: {swap_file}")
            
            # Load the swap data
            with open(swap_file, 'r') as f:
                swap_data = json.load(f)
            
            # Find leader transaction
            leader_tx = None
            for result in swap_data.get('result', []):
                # Just a simple check - the leader transaction will have the exact signature
                if result.get('transactionHash') == lead_signature:
                    leader_tx = result
                    break
            
            # Find follower transaction
            follower_tx = None
            for result in swap_data.get('result', []):
                if result.get('walletAddress') == follower_wallet and result.get('blockNumber') == follower_slot:
                    follower_tx = result
                    break
            
            if not leader_tx or not follower_tx:
                logger.warning(f"Could not find both leader and follower transactions for token: {token_mint}")
                continue
            
            # Extract token info from leader transaction
            token_info = None
            if 'bought' in leader_tx and leader_tx['transactionType'] == 'buy':
                bought = leader_tx['bought']
                # Make sure logo is never None by defaulting to empty string
                logo = bought.get('logo', '')
                if logo is None:
                    logo = ''
                token_info = TokenInfo(
                    address=bought.get('address', ''),
                    name=bought.get('name', ''),
                    symbol=bought.get('symbol', ''),
                    logo=logo
                )
            
            if not token_info:
                logger.warning(f"Could not extract token info for token: {token_mint}")
                continue
            
            # Extract leader transaction info
            leader_transaction = TransactionInfo(
                slot=lead_slot,
                timestamp=timestamp,
                signature=lead_signature,
                amount=leader_tx.get('bought', {}).get('amount', '0'),
                usd_amount=leader_tx.get('bought', {}).get('usdAmount', 0)
            )
            
            # Extract follower transaction info
            follower_transaction = TransactionInfo(
                slot=follower_slot,
                timestamp=timestamp,  # Using the same timestamp for simplicity
                signature=follower_tx.get('transactionHash', ''),
                amount=follower_tx.get('bought', {}).get('amount', '0'),
                usd_amount=follower_tx.get('bought', {}).get('usdAmount', 0)
            )
            
            # Create a copy transaction object
            copy_transaction = CopyTransaction(
                token=token_info,
                leader_transaction=leader_transaction,
                follower_transaction=follower_transaction,
                delay_slots=delay_slots
            )
            
            transactions.append(copy_transaction)
            logger.info(f"Added copy transaction for token: {token_info.symbol}")
        
        return CopyTransactionsResponse(transactions=transactions)
    
    except Exception as e:
        logger.error(f"Error processing copy transactions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing copy transactions: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 