import requests
import time
import json
import os
from typing import List, Dict, Any

#given wallet address, fetch last 500 SWAP and TRANSFER transactions


# Constants
HELIUS_API_KEY = "8d024022-a5bb-4586-a7ac-6aada64c3c8f"  # Replace with your actual API key
TARGET_WALLET = "DNfuF1L62WWyW3pNakVkyGGFzVVhj4Yr52jSmdTyeBHm"  # Replace with target wallet address
BASE_URL = "https://api.helius.xyz/v0/addresses"
TRANSACTION_TYPES = ["SWAP", "TRANSFER"]
TOTAL_TRANSACTIONS_NEEDED = 500
TRANSACTIONS_PER_PAGE = 100
TRANSACTIONS_DIR = os.path.join(os.path.dirname(__file__), "transactions")

def ensure_transactions_dir():
    """
    Create transactions directory if it doesn't exist
    """
    if not os.path.exists(TRANSACTIONS_DIR):
        os.makedirs(TRANSACTIONS_DIR)

def save_transaction(transaction: Dict[Any, Any]):
    """
    Save a single transaction as a JSON file
    """
    signature = transaction.get("signature", "")
    if not signature:
        return
    
    # Use first 8 characters of signature as filename
    filename = f"{signature[:8]}.json"
    filepath = os.path.join(TRANSACTIONS_DIR, filename)
    
    with open(filepath, 'w') as f:
        json.dump(transaction, f, indent=2)

def fetch_transactions(before_signature: str = None) -> List[Dict[Any, Any]]:
    """
    Fetch transactions from Helius API with pagination
    """
    url = f"{BASE_URL}/{TARGET_WALLET}/transactions"
    
    params = {
        "api-key": HELIUS_API_KEY,
        "limit": TRANSACTIONS_PER_PAGE,
        "type": TRANSACTION_TYPES  # Filter by transaction types directly in the API call
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

def main():
    # Ensure transactions directory exists
    ensure_transactions_dir()
    
    all_transactions = []
    last_signature = None
    
    while len(all_transactions) < TOTAL_TRANSACTIONS_NEEDED:
        # Fetch transactions
        transactions = fetch_transactions(last_signature)
        
        if not transactions:
            print("No more transactions to fetch")
            break
            
        # Save each transaction as a separate file
        for tx in transactions:
            save_transaction(tx)
            
        all_transactions.extend(transactions)
        
        # Update last signature for pagination
        if transactions:
            last_signature = transactions[-1].get("signature")
        
        # Add a small delay to avoid rate limiting
        time.sleep(0.5)
        
        print(f"Fetched and saved {len(all_transactions)} transactions so far...")
    
    # Trim to exact number needed
    all_transactions = all_transactions[:TOTAL_TRANSACTIONS_NEEDED]
    
    print(f"\nSuccessfully fetched and saved {len(all_transactions)} transactions")
    print(f"First transaction signature: {all_transactions[0].get('signature') if all_transactions else 'None'}")
    print(f"Last transaction signature: {all_transactions[-1].get('signature') if all_transactions else 'None'}")
    print(f"Transactions saved in: {TRANSACTIONS_DIR}")

if __name__ == "__main__":
    main()
