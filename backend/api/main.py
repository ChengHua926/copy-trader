from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .routers import copy_traders
from .services.config import Settings

app = FastAPI(
    title="Copy Trader API",
    description="API for analyzing copy trading behavior on Solana",
    version="1.0.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(copy_traders.router, prefix="/api/v1", tags=["copy-traders"])

@app.get("/")
async def root():
    return {"message": "Welcome to Copy Trader API"} 