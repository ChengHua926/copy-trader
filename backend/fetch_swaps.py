import requests
import json
from typing import Dict, Any, Optional, List
from datetime import datetime
import os
import glob


#given token address and timestamp, fetch all swaps for that token address and from when target wallet buys to 2 seconds later. 

# Constants
MORALIS_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImJkNzAzMjg4LWE3NDktNDM4OC1iOWNkLTUwMjlmY2U4Y2Q1ZSIsIm9yZ0lkIjoiNDQ1MDE1IiwidXNlcklkIjoiNDU3ODY1IiwidHlwZUlkIjoiYmZkZGI3YmEtMGUzNi00MmY1LWExYTgtYmE2Mzg4N2MxMmUwIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NDYyMzYxOTgsImV4cCI6NDkwMTk5NjE5OH0.gfohteTPWzmjXQeIvbEhwYgrVLDYAIQyhKeGVcBLpQc"
BASE_URL = "https://solana-gateway.moralis.io/token/mainnet"

def fetch_token_swaps(token_address: str, from_date: int, to_date: int, cursor: Optional[str] = None) -> Dict[Any, Any]:
    """
    Fetch swap transactions for a specific token address using timestamps
    
    Args:
        token_address: The token address to fetch swaps for
        from_date: Start timestamp in seconds
        to_date: End timestamp in seconds
        cursor: Optional cursor for pagination
    
    Returns:
        Dictionary containing the API response
    """
    # Build the URL with parameters directly
    url = f"{BASE_URL}/{token_address}/swaps"
    
    # Add parameters to URL
    params = []
    params.append(f"fromDate={from_date}")
    params.append(f"toDate={to_date}")
    
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
        print(f"\nRequesting URL: {url}")
        print(f"Parameters:")
        print(f"- fromDate: {from_date}")
        print(f"- toDate: {to_date}")
        if cursor:
            print(f"- cursor: {cursor}")
        
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        print(f"\nResponse status: {response.status_code}")
        print(f"Response headers: {response.headers}")
        
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
            
        print(f"\nFetching next page with cursor: {cursor}")
    
    return all_results

def save_swaps_to_file(data: List[Dict[Any, Any]], token_address: str, original_tx_signature: str):
    """
    Save the swaps data to a JSON file in the token_swaps directory
    """
    # Create filename using token address and original transaction signature
    filename = f"swaps_{token_address[:8]}_{original_tx_signature[:8]}.json"
    
    # Create token_swaps directory if it doesn't exist
    token_swaps_dir = os.path.join(os.path.dirname(__file__), "token_swaps")
    os.makedirs(token_swaps_dir, exist_ok=True)
    
    filepath = os.path.join(token_swaps_dir, filename)
    
    with open(filepath, 'w') as f:
        json.dump({"result": data}, f, indent=2)
    
    print(f"\nSwaps data saved to: {filepath}")

def process_filtered_transactions():
    """
    Process all filtered transactions and fetch swaps for each one
    """
    # Get all JSON files from filtered_transactions directory
    filtered_tx_dir = os.path.join(os.path.dirname(__file__), "filtered_transactions")
    json_files = glob.glob(os.path.join(filtered_tx_dir, "*.json"))
    
    total_files = len(json_files)
    print(f"\nFound {total_files} filtered transaction files to process")
    
    for i, json_file in enumerate(json_files, 1):
        try:
            # Read the filtered transaction file
            with open(json_file, 'r') as f:
                tx_data = json.load(f)
            
            token_address = tx_data['mint']
            timestamp = tx_data['timestamp']
            signature = tx_data['signature']
            
            print(f"\nProcessing file {i}/{total_files}")
            print(f"Token Address: {token_address}")
            print(f"Timestamp: {timestamp}")
            print(f"Signature: {signature}")
            
            # Fetch swaps from timestamp to timestamp + 2 seconds
            from_date = timestamp
            to_date = timestamp + 2
            
            all_results = fetch_all_swaps(token_address, from_date, to_date)
            
            # Print results summary
            print(f"\nFound {len(all_results)} swap transactions")
            
            # Save results to file
            if all_results:
                save_swaps_to_file(all_results, token_address, signature)
            
        except Exception as e:
            print(f"Error processing file {json_file}: {e}")
            continue

def main():
    process_filtered_transactions()

if __name__ == "__main__":
    main() 