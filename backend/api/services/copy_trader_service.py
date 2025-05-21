import sys
import os
from pathlib import Path
from typing import Dict, Any
import json
import pandas as pd
from datetime import datetime

# Add the parent directory to sys.path to import the analysis scripts
sys.path.append(str(Path(__file__).parent.parent.parent))

from fetch_buy import fetch_transactions, save_transaction
from filter_tx import analyze_transaction, save_filtered_transaction
from fetch_swaps import fetch_all_swaps, save_swaps_to_file
from analyze_copy_trades import create_copy_trades_table, save_copy_trades_table
from calculate_follower_scores import calculate_follower_metrics, normalize_metrics, calculate_scores

from .config import settings, ensure_wallet_directories

class CopyTraderService:
    def __init__(self, wallet_address: str):
        self.wallet_address = wallet_address
        self.directories = ensure_wallet_directories(wallet_address)
        
    async def analyze_wallet(self) -> Dict[str, Any]:
        """
        Run the complete analysis pipeline for a wallet
        """
        try:
            # Step 1: Fetch transactions
            await self._fetch_transactions()
            
            # Step 2: Filter transactions
            await self._filter_transactions()
            
            # Step 3: Fetch swaps
            await self._fetch_swaps()
            
            # Step 4: Create copy trades table
            copy_trades_df = await self._create_copy_trades_table()
            
            # Step 5: Calculate follower scores
            follower_scores = await self._calculate_follower_scores(copy_trades_df)
            
            return {
                "status": "success",
                "wallet_address": self.wallet_address,
                "follower_scores": follower_scores,
                "analysis_timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "error",
                "wallet_address": self.wallet_address,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def _fetch_transactions(self):
        """Fetch and save transactions"""
        transactions = []
        last_signature = None
        
        while len(transactions) < 500:
            batch = fetch_transactions(before_signature=last_signature)
            if not batch:
                break
                
            for tx in batch:
                save_transaction(tx)
                
            transactions.extend(batch)
            if batch:
                last_signature = batch[-1].get("signature")
    
    async def _filter_transactions(self):
        """Filter transactions for memecoin purchases"""
        tx_dir = self.directories["transactions"]
        filtered_dir = self.directories["filtered_transactions"]
        
        for tx_file in tx_dir.glob("*.json"):
            with open(tx_file) as f:
                tx = json.load(f)
            
            filtered_data = analyze_transaction(tx)
            if filtered_data:
                save_filtered_transaction(filtered_data)
    
    async def _fetch_swaps(self):
        """Fetch swap data for filtered transactions"""
        filtered_dir = self.directories["filtered_transactions"]
        
        for filtered_tx_file in filtered_dir.glob("*.json"):
            with open(filtered_tx_file) as f:
                tx_data = json.load(f)
            
            token_address = tx_data['mint']
            timestamp = tx_data['timestamp']
            
            # Fetch swaps from timestamp to timestamp + 2 seconds
            swaps = fetch_all_swaps(token_address, timestamp, timestamp + 2)
            
            if swaps:
                save_swaps_to_file(swaps, token_address, tx_data['signature'])
    
    async def _create_copy_trades_table(self) -> pd.DataFrame:
        """Create and save copy trades table"""
        df = create_copy_trades_table()
        
        # Save to copy_trades directory
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        base_path = self.directories["copy_trades"] / f"copy_trades_{timestamp}"
        
        df.to_parquet(f"{base_path}.parquet")
        df.to_json(f"{base_path}.json", orient='records', indent=2)
        
        return df
    
    async def _calculate_follower_scores(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate and save follower scores"""
        # Calculate total number of unique lead transactions
        total_lead_buys = df['lead_index'].nunique()
        
        # Calculate metrics
        metrics = calculate_follower_metrics(df)
        metrics = normalize_metrics(metrics, total_lead_buys)
        metrics = calculate_scores(metrics)
        
        # Save results
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        base_path = self.directories["base"] / f"follower_scores_{timestamp}"
        
        metrics.to_parquet(f"{base_path}.parquet")
        metrics.to_json(f"{base_path}.json", orient='records', indent=2)
        
        # Convert to dict for API response
        return metrics.to_dict(orient='records') 