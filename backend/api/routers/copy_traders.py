from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import re
from typing import List, Dict, Any

from ..services.copy_trader_service import CopyTraderService

router = APIRouter()

class WalletRequest(BaseModel):
    wallet_address: str = Field(..., description="Solana wallet address to analyze")

    @property
    def is_valid_solana_address(self) -> bool:
        """Check if the wallet address is a valid Solana address format"""
        # Basic Solana address validation (base58 check)
        pattern = r'^[1-9A-HJ-NP-Za-km-z]{32,44}$'
        return bool(re.match(pattern, self.wallet_address))

class FollowerScore(BaseModel):
    addr: str
    hits: int
    breadth: int
    avg_delay: float
    med_delay: float
    freq_norm: float
    breadth_norm: float
    speed_norm: float
    score: float
    tier: str

class WalletAnalysisResponse(BaseModel):
    status: str
    wallet_address: str
    follower_scores: List[Dict[str, Any]]
    analysis_timestamp: str

@router.post("/analyze-wallet", response_model=WalletAnalysisResponse)
async def analyze_wallet(request: WalletRequest):
    """
    Analyze a wallet's trading activity and find its copy traders
    """
    if not request.is_valid_solana_address:
        raise HTTPException(
            status_code=400,
            detail="Invalid Solana wallet address format"
        )
    
    service = CopyTraderService(request.wallet_address)
    result = await service.analyze_wallet()
    
    if result["status"] == "error":
        raise HTTPException(
            status_code=500,
            detail=result["error"]
        )
    
    return result 