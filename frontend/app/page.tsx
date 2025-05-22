"use client";

import { useState } from "react";

// Interface for follower score
interface FollowerScore {
  addr: string;
  hits: number;
  breadth: number;
  avg_delay: number;
  med_delay: number;
  freq_norm: number;
  speed_norm: number;
  breadth_norm: number;
  score: number;
  tier: string;
}

// Tooltip component
const Tooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-block ml-1">
    <div className="w-4 h-4 bg-gray-700 rounded-full text-xs flex items-center justify-center text-white cursor-help">?</div>
    <div className="absolute left-full ml-2 w-64 p-2 bg-[#222222] text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10">
      {text}
    </div>
  </div>
);

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

  // Helper function to get tier color
  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Gold": return "text-yellow-400";
      case "Silver": return "text-gray-300";
      case "Bronze": return "text-amber-600";
      default: return "text-gray-500";
    }
  };

  // Helper to truncate wallet addresses
  const truncateAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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

          {/* Copy Traders Results */}
          {result && result.data && result.data.follower_scores && (
            <div className="mt-12 bg-[#111111] border border-gray-800 rounded-2xl p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">Copy Traders</h2>
              
              {/* Tier distribution */}
              {result.data.tier_distribution && (
                <div className="grid grid-cols-4 gap-3 mb-8">
                  <div className="bg-[#222222] p-3 rounded text-center">
                    <p className="text-gray-500 text-sm">Total</p>
                    <p className="text-white text-lg font-bold">{result.data.follower_scores.length}</p>
                  </div>
                  <div className="bg-[#222222] p-3 rounded text-center">
                    <p className="text-gray-500 text-sm">Gold</p>
                    <p className="text-yellow-400 text-lg font-bold">
                      {result.data.tier_distribution.Gold || 0}
                    </p>
                  </div>
                  <div className="bg-[#222222] p-3 rounded text-center">
                    <p className="text-gray-500 text-sm">Silver</p>
                    <p className="text-gray-300 text-lg font-bold">
                      {result.data.tier_distribution.Silver || 0}
                    </p>
                  </div>
                  <div className="bg-[#222222] p-3 rounded text-center">
                    <p className="text-gray-500 text-sm">Bronze</p>
                    <p className="text-amber-600 text-lg font-bold">
                      {result.data.tier_distribution.Bronze || 0}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Follower list */}
              {result.data.follower_scores.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-400">
                    <thead className="text-xs uppercase bg-[#222222] text-gray-400">
                      <tr>
                        <th scope="col" className="px-4 py-3 rounded-l-lg">Wallet</th>
                        <th scope="col" className="px-4 py-3">
                          Tier
                          <Tooltip text="Ranking based on copy trading score: Gold (≥0.75), Silver (≥0.5), Bronze (≥0.3)" />
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Score
                          <Tooltip text="Combined metric measuring frequency, speed, and breadth of copying (0-1 scale)" />
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Hits
                          <Tooltip text="Number of times this wallet followed your trades" />
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Tokens
                          <Tooltip text="Number of different tokens they've copied from you" />
                        </th>
                        <th scope="col" className="px-4 py-3 rounded-r-lg">
                          Avg Delay
                          <Tooltip text="Average time (in slots) between your buy and the follower's buy. Lower is better." />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.data.follower_scores
                        .sort((a: FollowerScore, b: FollowerScore) => b.score - a.score)
                        .map((follower: FollowerScore, index: number) => (
                        <tr key={follower.addr} className={`border-b border-gray-800 ${index % 2 === 0 ? 'bg-[#1A1A1A]' : 'bg-[#1D1D1D]'}`}>
                          <td className="px-4 py-3 font-mono">{truncateAddress(follower.addr)}</td>
                          <td className="px-4 py-3">
                            <span className={`font-bold ${getTierColor(follower.tier)}`}>
                              {follower.tier}
                            </span>
                          </td>
                          <td className="px-4 py-3">{follower.score.toFixed(3)}</td>
                          <td className="px-4 py-3">{follower.hits}</td>
                          <td className="px-4 py-3">{follower.breadth}</td>
                          <td className="px-4 py-3">{follower.avg_delay.toFixed(1)} slots</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-[#222222] p-6 rounded text-center">
                  <p className="text-gray-400">No copy traders found that meet the criteria</p>
                </div>
              )}
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="mt-12 bg-[#111111] border border-gray-800 rounded-2xl p-8 shadow-2xl text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-t-[#14F195] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-white">Analyzing wallet activity and finding copy traders...</p>
                <p className="text-gray-400 text-sm mt-2">This may take a few minutes</p>
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
