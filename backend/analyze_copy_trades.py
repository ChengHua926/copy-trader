import json
import os
from typing import Dict, List, Any
import pandas as pd
from datetime import datetime

def load_filtered_transaction(file_path: str) -> Dict[str, Any]:
    """Load a single filtered transaction file"""
    with open(file_path, 'r') as f:
        return json.load(f)

def load_swap_data(file_path: str) -> Dict[str, Any]:
    """Load a single swap data file"""
    with open(file_path, 'r') as f:
        return json.load(f)

def create_copy_trades_table() -> pd.DataFrame:
    """
    Create a table of copy trades by analyzing filtered transactions and swap data
    """
    # Initialize lists to store the data
    copy_trades = []
    
    # Get paths to directories
    filtered_tx_dir = os.path.join(os.path.dirname(__file__), "filtered_transactions")
    token_swaps_dir = os.path.join(os.path.dirname(__file__), "token_swaps")
    
    # Process each filtered transaction
    for filtered_tx_file in os.listdir(filtered_tx_dir):
        if not filtered_tx_file.endswith('.json'):
            continue
            
        # Load filtered transaction data
        filtered_tx_path = os.path.join(filtered_tx_dir, filtered_tx_file)
        filtered_tx = load_filtered_transaction(filtered_tx_path)
        
        lead_signature = filtered_tx['signature']
        token_mint = filtered_tx['mint']
        lead_slot = filtered_tx['slot']
        
        # Find corresponding swap data
        # The swap file name format is: swaps_{token_mint[:8]}_{lead_signature[:8]}.json
        swap_file = f"swaps_{token_mint[:8]}_{lead_signature[:8]}.json"
        swap_path = os.path.join(token_swaps_dir, swap_file)
        
        if not os.path.exists(swap_path):
            print(f"Warning: No swap data found for {lead_signature}")
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
                'timestamp': filtered_tx['timestamp']  # Adding timestamp for future analysis
            })
    
    # Create DataFrame
    df = pd.DataFrame(copy_trades)
    
    # Sort by lead_index and delay_slots
    df = df.sort_values(['lead_index', 'delay_slots'])
    
    return df

def save_copy_trades_table(df: pd.DataFrame) -> None:
    """
    Save the copy trades table in multiple formats for easy access
    """
    # Create timestamp for file names
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # Save as CSV
    csv_path = os.path.join(os.path.dirname(__file__), f"copy_trades_{timestamp}.csv")
    df.to_csv(csv_path, index=False)
    print(f"Saved CSV to: {csv_path}")
    
    # Save as Parquet (more efficient for large datasets)
    parquet_path = os.path.join(os.path.dirname(__file__), f"copy_trades_{timestamp}.parquet")
    df.to_parquet(parquet_path, index=False)
    print(f"Saved Parquet to: {parquet_path}")
    
    # Save as JSON (for easy programmatic access)
    json_path = os.path.join(os.path.dirname(__file__), f"copy_trades_{timestamp}.json")
    df.to_json(json_path, orient='records', indent=2)
    print(f"Saved JSON to: {json_path}")
    
    # Print summary statistics
    print("\nCopy Trades Summary:")
    print(f"Total number of copy trades: {len(df)}")
    print(f"Number of unique lead transactions: {df['lead_index'].nunique()}")
    print(f"Number of unique followers: {df['follower_addr'].nunique()}")
    print(f"Number of unique tokens: {df['token'].nunique()}")
    print("\nDelay Statistics (in slots):")
    print(df['delay_slots'].describe())

def main():
    print("Creating copy trades table...")
    df = create_copy_trades_table()
    
    print("\nSaving copy trades table...")
    save_copy_trades_table(df)

if __name__ == "__main__":
    main() 