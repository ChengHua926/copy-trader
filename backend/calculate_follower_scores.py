import pandas as pd
import json
import os
from datetime import datetime
from typing import Dict, Any

# Constants
WINDOW = 10  # Maximum delay for speed normalization
TIER_BOUNDARIES = {
    'Gold': 0.8,
    'Silver': 0.5,
    'Bronze': 0.3
}

def load_latest_copy_trades() -> pd.DataFrame:
    """Load the most recent copy trades parquet file"""
    # Get all parquet files in the directory
    parquet_files = [f for f in os.listdir(os.path.dirname(__file__)) 
                    if f.startswith('copy_trades_') and f.endswith('.parquet')]
    
    if not parquet_files:
        raise FileNotFoundError("No copy trades parquet files found")
    
    # Get the most recent file
    latest_file = max(parquet_files)
    file_path = os.path.join(os.path.dirname(__file__), latest_file)
    
    print(f"Loading copy trades from: {latest_file}")
    return pd.read_parquet(file_path)

def calculate_follower_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate metrics for each follower
    """
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
    # Calculate normalizations
    metrics['freq_norm'] = metrics['hits'] / total_lead_buys
    
    # breadth_norm = breadth / hits
    metrics['breadth_norm'] = metrics['breadth'] / metrics['hits']
    
    # speed_norm: 1.0 if avg_delay ≤ 3, else linear fall-off to 0.0 at WINDOW
    metrics['speed_norm'] = metrics['avg_delay'].apply(
        lambda x: 1.0 if x <= 3 else max(0, 1 - (x - 3) / (WINDOW - 3))
    )
    
    return metrics

def calculate_scores(metrics: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate the final copy score and assign tiers
    """
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

def save_follower_scores(metrics: pd.DataFrame) -> None:
    """
    Save the follower scores in multiple formats
    """
    # Create timestamp for file names
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # Round numeric columns for better readability
    numeric_cols = ['avg_delay', 'med_delay', 'score', 'freq_norm', 'speed_norm', 'breadth_norm']
    metrics[numeric_cols] = metrics[numeric_cols].round(3)
    
    # Save as JSON
    json_path = os.path.join(os.path.dirname(__file__), f"follower_scores_{timestamp}.json")
    metrics.to_json(json_path, orient='records', indent=2)
    print(f"Saved JSON to: {json_path}")
    
    # Save as Parquet
    parquet_path = os.path.join(os.path.dirname(__file__), f"follower_scores_{timestamp}.parquet")
    metrics.to_parquet(parquet_path, index=False)
    print(f"Saved Parquet to: {parquet_path}")
    
    # Print summary statistics
    print("\nFollower Scores Summary:")
    print(f"Total followers analyzed: {len(metrics)}")
    print("\nTier Distribution:")
    print(metrics['tier'].value_counts())
    print("\nScore Statistics:")
    print(metrics['score'].describe())
    print("\nTop 5 Followers:")
    print(metrics.nlargest(5, 'score')[['addr', 'hits', 'breadth', 'avg_delay', 'score', 'tier']])

def main():
    # Load copy trades data
    df = load_latest_copy_trades()
    
    # Calculate total number of unique lead transactions
    total_lead_buys = df['lead_index'].nunique()
    print(f"Total number of lead transactions: {total_lead_buys}")
    
    # Calculate follower metrics
    print("\nCalculating follower metrics...")
    metrics = calculate_follower_metrics(df)
    
    # Normalize metrics
    print("Normalizing metrics...")
    metrics = normalize_metrics(metrics, total_lead_buys)
    
    # Calculate scores and assign tiers
    print("Calculating scores and assigning tiers...")
    metrics = calculate_scores(metrics)
    
    # Save results
    print("\nSaving follower scores...")
    save_follower_scores(metrics)

if __name__ == "__main__":
    main() 