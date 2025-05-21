from pydantic_settings import BaseSettings
import os
from pathlib import Path

class Settings(BaseSettings):
    # API Keys
    HELIUS_API_KEY: str = "8d024022-a5bb-4586-a7ac-6aada64c3c8f"
    MORALIS_API_KEY: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImJkNzAzMjg4LWE3NDktNDM4OC1iOWNkLTUwMjlmY2U4Y2Q1ZSIsIm9yZ0lkIjoiNDQ1MDE1IiwidXNlcklkIjoiNDU3ODY1IiwidHlwZUlkIjoiYmZkZGI3YmEtMGUzNi00MmY1LWExYTgtYmE2Mzg4N2MxMmUwIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NDYyMzYxOTgsImV4cCI6NDkwMTk5NjE5OH0.gfohteTPWzmjXQeIvbEhwYgrVLDYAIQyhKeGVcBLpQc"
    
    # Base directory for data storage
    BASE_DATA_DIR: Path = Path(__file__).parent.parent.parent / "data"
    
    # API Configuration
    CACHE_EXPIRY: int = 3600  # Cache results for 1 hour
    MAX_CONCURRENT_REQUESTS: int = 5
    
    class Config:
        env_file = ".env"

settings = Settings()

def get_wallet_data_dir(wallet_address: str) -> Path:
    """Get the data directory for a specific wallet"""
    return settings.BASE_DATA_DIR / wallet_address

def ensure_wallet_directories(wallet_address: str) -> dict[str, Path]:
    """Create and return all necessary directories for a wallet"""
    base_dir = get_wallet_data_dir(wallet_address)
    
    directories = {
        "base": base_dir,
        "transactions": base_dir / "transactions",
        "filtered_transactions": base_dir / "filtered_transactions",
        "token_swaps": base_dir / "token_swaps",
        "copy_trades": base_dir / "copy_trades"
    }
    
    # Create all directories
    for dir_path in directories.values():
        dir_path.mkdir(parents=True, exist_ok=True)
    
    return directories 