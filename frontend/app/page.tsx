"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wallet.trim()) {
      setError("Please enter a wallet address");
      return;
    }
    
    setLoading(true);
    setError("");
    
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
      
      // Store the result in localStorage to pass it to the results page
      localStorage.setItem("copyTradersResult", JSON.stringify(data));
      
      // Navigate to the results page
      router.push(`/results?wallet=${encodeURIComponent(wallet)}`);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "Failed to fetch data");
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

      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-90">
          <div className="relative w-24 h-24">
            <div className="absolute w-full h-full border-4 border-t-[#14F195] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            <div className="absolute w-full h-full border-4 border-t-transparent border-r-[#9945FF] border-b-transparent border-l-transparent rounded-full animate-spin animation-delay-150"></div>
          </div>
          <p className="mt-8 text-xl text-white font-medium">Analyzing on-chain activity</p>
          <p className="mt-2 text-gray-400">Finding your copy traders, this may take a minute...</p>
        </div>
      )}

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
                  Find Copy Traders
                </button>

                <p className="text-gray-500 text-sm mt-4 text-center">
                  Currently supporting Solana network only
                </p>
              </form>
            </div>
          </div>

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
