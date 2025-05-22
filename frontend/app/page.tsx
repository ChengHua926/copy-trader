"use client";

import { useState } from "react";

export default function Home() {
  const [wallet, setWallet] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wallet.trim()) {
      setError("Please enter a wallet address");
      return;
    }
    
    setLoading(true);
    setError("");
    setResult(null);
    
    try {
      // Call the backend API
      const response = await fetch("http://localhost:8000/process-wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ wallet_address: wallet }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || "Something went wrong");
      }
      
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to render progress status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-[#14F195]";
      case "pending": return "bg-yellow-500";
      case "failed": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Gradient Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-[#9945FF] opacity-20 blur-[128px] rounded-full" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-[#14F195] opacity-20 blur-[128px] rounded-full" />
      </div>

      <div className="relative container mx-auto px-4 py-16">
        <main className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 tracking-tight">
              Discover Your
              <span className="bg-gradient-to-r from-[#9945FF] to-[#14F195] text-transparent bg-clip-text"> Copy Traders</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Uncover who's following your trading moves on the Solana blockchain
            </p>
          </div>

          {/* Input Section */}
          <div className="bg-[#111111] border border-gray-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
            <div className="max-w-2xl mx-auto">
              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label htmlFor="wallet" className="block text-gray-300 text-lg font-medium mb-2">
                    Enter Your Solana Wallet Address
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      id="wallet"
                      value={wallet}
                      onChange={(e) => setWallet(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-[#1A1A1A] border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9945FF]/50 focus:border-transparent transition-all group-hover:border-gray-700"
                      placeholder="e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
                    />
                  </div>
                  {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#9945FF] to-[#14F195] text-black font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? "Processing..." : "Find Copy Traders"}
                </button>

                <p className="text-gray-500 text-sm mt-4 text-center">
                  Currently supporting Solana network only
                </p>
              </form>
            </div>
          </div>

          {/* Results Section */}
          {result && (
            <div className="mt-12 bg-[#111111] border border-gray-800 rounded-2xl p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-4">Processing Status</h2>
              
              {/* Progress Steps */}
              <div className="mb-6">
                <div className="relative">
                  {/* Progress bar */}
                  <div className="flex mb-6">
                    {result.progress && Object.entries(result.progress).map(([step, status], index, arr) => (
                      <div key={step} className="flex-1 relative">
                        <div className={`h-1 ${getStatusColor(status as string)}`}></div>
                        <div className={`w-4 h-4 rounded-full absolute top-1/2 -translate-y-1/2 ${index === 0 ? 'left-0' : index === arr.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2'} ${getStatusColor(status as string)}`}></div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Step labels */}
                  <div className="flex justify-between text-xs text-gray-400">
                    {result.progress && Object.keys(result.progress).map((step) => (
                      <div key={step} className="w-20 text-center">
                        {step.split('_').join(' ')}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg bg-[#1A1A1A] p-4 border border-gray-800">
                <div className="flex items-center mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#14F195] mr-2"></div>
                  <p className="text-white">{result.status === "success" ? "Success" : "Failed"}</p>
                </div>
                <p className="text-gray-400 mb-4">{result.message}</p>
                
                {result.data && (
                  <div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-[#222222] p-3 rounded">
                        <p className="text-gray-500 text-sm">Wallet</p>
                        <p className="text-white font-mono text-sm truncate">{result.data.wallet_address}</p>
                      </div>
                      <div className="bg-[#222222] p-3 rounded">
                        <p className="text-gray-500 text-sm">Transactions</p>
                        <p className="text-white">{result.data.transactions_fetched}</p>
                      </div>
                    </div>
                    
                    {result.data.buy_transactions !== undefined && (
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-[#222222] p-3 rounded">
                          <p className="text-gray-500 text-sm">Memecoin Purchases</p>
                          <p className="text-white">{result.data.buy_transactions}</p>
                        </div>
                        <div className="bg-[#222222] p-3 rounded">
                          <p className="text-gray-500 text-sm">Purchase Rate</p>
                          <p className="text-white">{result.data.buy_percentage}%</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="border-t border-gray-800 pt-4 mt-2">
                      <p className="text-gray-400 text-sm">
                        Current step: <span className="text-white">{result.current_step.replace('_', ' ')}</span>
                      </p>
                      {result.next_step && (
                        <p className="text-gray-400 text-sm">
                          Next step: <span className="text-white">{result.next_step.replace('_', ' ')}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tech Details */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1A1A] border border-gray-800">
              <div className="w-2 h-2 rounded-full bg-[#14F195] animate-pulse" />
              <span className="text-gray-400 text-sm">Powered by Solana</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
