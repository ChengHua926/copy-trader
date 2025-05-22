import os
import json
import time
import glob
import requests
from typing import Dict, Any, List, Optional, Tuple
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Initialize FastAPI app
app = FastAPI(title="Copy Trader API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
HELIUS_API_KEY = "8d024022-a5bb-4586-a7ac-6aada64c3c8f"
BASE_URL = "https://api.helius.xyz/v0/addresses"
TRANSACTION_TYPES = ["SWAP", "TRANSFER"]
TOTAL_TRANSACTIONS_NEEDED = 500
TRANSACTIONS_PER_PAGE = 100

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

# Step 1: Fetch Transactions
def ensure_wallet_data_dirs(wallet_address: str) -> Dict[str, str]:
    """Create all necessary directories for a wallet's data"""
    wallet_dir = os.path.join(os.path.dirname(__file__), "data", wallet_address)
    transactions_dir = os.path.join(wallet_dir, "transactions")
    filtered_dir = os.path.join(wallet_dir, "filtered_transactions")
    
    # Create dirs if they don't exist
    os.makedirs(wallet_dir, exist_ok=True)
    os.makedirs(transactions_dir, exist_ok=True)
    os.makedirs(filtered_dir, exist_ok=True)
    
    return {
        "wallet_dir": wallet_dir,
        "transactions_dir": transactions_dir,
        "filtered_dir": filtered_dir
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
    url = f"{BASE_URL}/{wallet_address}/transactions"
    
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
        
        return ProgressResponse(
            status="success",
            message=f"Processed {fetch_result['transactions_fetched']} transactions, found {filter_result['buy_transactions']} memecoin purchases",
            data={
                "wallet_address": wallet_address,
                "transactions_fetched": fetch_result["transactions_fetched"],
                "buy_transactions": filter_result["buy_transactions"],
                "buy_percentage": filter_result["buy_percentage"]
            },
            current_step="filter_transactions",
            next_step="fetch_swaps",
            progress={
                "fetch_transactions": "completed",
                "filter_transactions": "completed",
                "fetch_swaps": "pending",
                "analyze_copy_trades": "pending",
                "calculate_scores": "pending"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing wallet: {str(e)}")

@app.get("/")
async def root():
    """Root endpoint for health check"""
    return {"status": "healthy", "message": "Copy Trader API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 