import os
import json
from typing import Dict, Any, Optional, Tuple

#given last 500 SWAP or TRANSFER transactions, filter out the ones where our wallet is buying a memecoin, for each transactoin, return mint, amount, slot number, timestamp, signature



# Constants
WALLET_TO_TRACK = "DNfuF1L62WWyW3pNakVkyGGFzVVhj4Yr52jSmdTyeBHm"
TRANSACTIONS_DIR = os.path.join(os.path.dirname(__file__), "transactions")
FILTERED_DIR = os.path.join(os.path.dirname(__file__), "filtered_transactions")

# List of known non-memecoin tokens (SOL and common stablecoins)
NON_MEMECOINS = [
    'So11111111111111111111111111111111111111112',  # SOL
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',  # USDC
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',  # USDT
    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',  # mSOL
]

def ensure_filtered_dir():
    """Create filtered transactions directory if it doesn't exist"""
    if not os.path.exists(FILTERED_DIR):
        os.makedirs(FILTERED_DIR)

def analyze_transaction(tx: Dict[Any, Any]) -> Optional[Dict[str, Any]]:
    """
    Analyze transaction to find memecoin purchases and return relevant details
    Returns None if not a buy transaction, or dict with details if it is
    """
    # Check if fee payer is our target wallet
    if tx.get('feePayer') != WALLET_TO_TRACK:
        return None
    
    # Look for token transfers where our wallet is receiving tokens
    for transfer in tx.get('tokenTransfers', []):
        # Check if the tracked wallet is receiving the token
        if (transfer.get('toUserAccount') == WALLET_TO_TRACK and 
            transfer.get('mint') not in NON_MEMECOINS):
            return {
                'mint': transfer.get('mint'),
                'amount': transfer.get('tokenAmount'),
                'slot': tx.get('slot'),
                'timestamp': tx.get('timestamp'),
                'signature': tx.get('signature')
            }
    
    return None

def save_filtered_transaction(tx_data: Dict[str, Any]):
    """Save filtered transaction data as JSON file"""
    signature = tx_data.get('signature', '')
    if not signature:
        return
    
    # Use first 8 characters of signature as filename
    filename = f"{signature[:8]}.json"
    filepath = os.path.join(FILTERED_DIR, filename)
    
    with open(filepath, 'w') as f:
        json.dump(tx_data, f, indent=2)

def process_transactions() -> Tuple[int, int]:
    """
    Process all transactions in the transactions folder
    Returns tuple of (total transactions processed, number of buy transactions found)
    """
    ensure_filtered_dir()
    
    total_txs = 0
    buy_txs = 0
    
    # Process each transaction file
    for filename in os.listdir(TRANSACTIONS_DIR):
        if not filename.endswith('.json'):
            continue
            
        total_txs += 1
        filepath = os.path.join(TRANSACTIONS_DIR, filename)
        
        try:
            with open(filepath, 'r') as f:
                tx = json.load(f)
                
            # Analyze transaction
            filtered_data = analyze_transaction(tx)
            if filtered_data:
                save_filtered_transaction(filtered_data)
                buy_txs += 1
                
        except Exception as e:
            print(f"Error processing {filename}: {e}")
    
    return total_txs, buy_txs

def main():
    print("Starting transaction analysis...")
    total_txs, buy_txs = process_transactions()
    
    print("\nAnalysis Complete!")
    print(f"Total transactions processed: {total_txs}")
    print(f"Buy transactions found: {buy_txs}")
    print(f"Buy transaction percentage: {(buy_txs/total_txs*100):.2f}%")
    print(f"\nFiltered transactions saved in: {FILTERED_DIR}")

if __name__ == "__main__":
    main()