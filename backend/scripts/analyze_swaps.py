import json
import os
from typing import Dict, List, Tuple
from statistics import mean

def analyze_swaps_file(file_path: str) -> Tuple[int, int, int]:
    """
    Analyze a single swaps file and return:
    - number of transactions
    - min block number
    - max block number
    """
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        if not data.get('result'):
            return 0, 0, 0
        
        transactions = data['result']
        num_transactions = len(transactions)
        
        if num_transactions == 0:
            return 0, 0, 0
        
        block_numbers = [tx['blockNumber'] for tx in transactions]
        min_block = min(block_numbers)
        max_block = max(block_numbers)
        
        return num_transactions, min_block, max_block
    
    except Exception as e:
        print(f"Error analyzing file {file_path}: {e}")
        return 0, 0, 0

def analyze_all_swaps() -> None:
    """
    Analyze all swap files in the token_swaps directory
    """
    # Get the token_swaps directory path
    token_swaps_dir = os.path.join(os.path.dirname(__file__), "token_swaps")
    
    # Get all JSON files
    json_files = [f for f in os.listdir(token_swaps_dir) if f.endswith('.json')]
    
    if not json_files:
        print("No swap files found in token_swaps directory")
        return
    
    # Initialize lists to store results
    all_transaction_counts = []
    all_block_ranges = []
    
    # Process each file
    for json_file in json_files:
        file_path = os.path.join(token_swaps_dir, json_file)
        num_transactions, min_block, max_block = analyze_swaps_file(file_path)
        
        if num_transactions > 0:
            all_transaction_counts.append(num_transactions)
            block_range = max_block - min_block
            all_block_ranges.append(block_range)
            
            print(f"\nFile: {json_file}")
            print(f"Number of transactions: {num_transactions}")
            print(f"Block range: {min_block} to {max_block} (range: {block_range})")
    
    # Calculate and print averages
    if all_transaction_counts:
        avg_transactions = mean(all_transaction_counts)
        avg_block_range = mean(all_block_ranges)
        
        print("\nSummary Statistics:")
        print(f"Total files analyzed: {len(json_files)}")
        print(f"Files with transactions: {len(all_transaction_counts)}")
        print(f"Average number of transactions per file: {avg_transactions:.2f}")
        print(f"Average block range: {avg_block_range:.2f}")
        
        # Additional statistics
        print(f"\nTransaction count statistics:")
        print(f"Min transactions: {min(all_transaction_counts)}")
        print(f"Max transactions: {max(all_transaction_counts)}")
        
        print(f"\nBlock range statistics:")
        print(f"Min block range: {min(all_block_ranges)}")
        print(f"Max block range: {max(all_block_ranges)}")
    else:
        print("\nNo valid transaction data found in any files")

if __name__ == "__main__":
    analyze_all_swaps() 