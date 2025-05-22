"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

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
    <div className="w-4 h-4 bg-[#1E1E2E] rounded-full text-xs flex items-center justify-center text-white cursor-help">?</div>
    <div className="absolute left-full ml-2 w-64 p-2 bg-[#13131D] text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10">
      {text}
    </div>
  </div>
);

export default function ResultsPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("score");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const searchParams = useSearchParams();
  const wallet = searchParams.get("wallet") || "";

  useEffect(() => {
    // Fetch results from localStorage
    const storedResults = localStorage.getItem("copyTradersResult");
    if (storedResults) {
      setResult(JSON.parse(storedResults));
    }
    setLoading(false);
  }, []);

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

  // Sort function for the table
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("desc");
    }
  };

  // Sort the data
  const sortedData = result?.data?.follower_scores
    ? [...result.data.follower_scores].sort((a: FollowerScore, b: FollowerScore) => {
        let comparison = 0;
        
        switch (sortBy) {
          case "tier":
            // Custom sorting for tiers: Gold > Silver > Bronze
            const tierOrder = { "Gold": 3, "Silver": 2, "Bronze": 1, "": 0 };
            comparison = (tierOrder[a.tier as keyof typeof tierOrder] || 0) - (tierOrder[b.tier as keyof typeof tierOrder] || 0);
            break;
          case "score":
            comparison = a.score - b.score;
            break;
          case "hits":
            comparison = a.hits - b.hits;
            break;
          case "breadth":
            comparison = a.breadth - b.breadth;
            break;
          case "avg_delay":
            comparison = a.avg_delay - b.avg_delay;
            break;
          default:
            comparison = a.score - b.score;
        }
        
        return sortDirection === "asc" ? comparison : -comparison;
      })
    : [];

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0B13]">
        <div className="relative w-24 h-24">
          <div className="absolute w-full h-full border-4 border-t-[#14F195] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          <div className="absolute w-full h-full border-4 border-t-transparent border-r-[#9945FF] border-b-transparent border-l-transparent rounded-full animate-spin animation-delay-150"></div>
        </div>
        <p className="mt-8 text-xl text-white font-medium">Loading results...</p>
      </div>
    );
  }

  if (!result || !result.data) {
    return (
      <div className="min-h-screen bg-[#0B0B13] text-white flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">No results found</h1>
        <p className="text-gray-400 mb-6">Please try searching again</p>
        <Link href="/" className="px-6 py-2 bg-gradient-to-r from-[#9945FF] to-[#14F195] text-black font-medium rounded-lg">
          Go Back
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B13] text-white">
      {/* Gradient Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-[#9945FF] opacity-10 blur-[150px] rounded-full" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-[#14F195] opacity-10 blur-[150px] rounded-full" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-[#232336] bg-[#0F0F19] backdrop-blur-lg sticky top-0 z-20">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-white hover:text-[#14F195] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 111.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </Link>
              <h1 className="text-lg font-semibold">Copy Traders for <span className="font-mono text-[#14F195]">{truncateAddress(wallet)}</span></h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-full bg-[#1A1A2E] border border-[#232336] text-xs font-medium text-[#14F195]">
                Solana
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          {/* Stats Grid */}
          {result.data.tier_distribution && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-[#13131D] border border-[#232336] rounded-xl p-5">
                <div className="flex flex-col">
                  <span className="text-gray-400 text-sm mb-1">Total Followers</span>
                  <span className="text-3xl font-bold">{result.data.follower_scores.length}</span>
                </div>
              </div>
              <div className="bg-[#13131D] border border-[#232336] rounded-xl p-5">
                <div className="flex flex-col">
                  <span className="text-gray-400 text-sm mb-1">Gold Tier</span>
                  <span className="text-3xl font-bold text-yellow-400">{result.data.tier_distribution.Gold || 0}</span>
                </div>
              </div>
              <div className="bg-[#13131D] border border-[#232336] rounded-xl p-5">
                <div className="flex flex-col">
                  <span className="text-gray-400 text-sm mb-1">Silver Tier</span>
                  <span className="text-3xl font-bold text-gray-300">{result.data.tier_distribution.Silver || 0}</span>
                </div>
              </div>
              <div className="bg-[#13131D] border border-[#232336] rounded-xl p-5">
                <div className="flex flex-col">
                  <span className="text-gray-400 text-sm mb-1">Bronze Tier</span>
                  <span className="text-3xl font-bold text-amber-600">{result.data.tier_distribution.Bronze || 0}</span>
                </div>
              </div>
            </div>
          )}

          {/* Follower Table */}
          <div className="bg-[#13131D] border border-[#232336] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-xs uppercase bg-[#1A1A2E] text-gray-400">
                  <tr>
                    <th scope="col" className="px-5 py-4">Rank</th>
                    <th scope="col" className="px-5 py-4">Wallet</th>
                    <th 
                      scope="col" 
                      className="px-5 py-4 cursor-pointer hover:bg-[#232336]"
                      onClick={() => handleSort("tier")}
                    >
                      <div className="flex items-center">
                        Tier
                        <Tooltip text="Ranking based on copy trading score: Gold (≥0.75), Silver (≥0.5), Bronze (≥0.3)" />
                        {sortBy === "tier" && (
                          <svg xmlns="http://www.w3.org/2000/svg" className={`ml-1 h-3 w-3 transition-transform ${sortDirection === "asc" ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-5 py-4 cursor-pointer hover:bg-[#232336]"
                      onClick={() => handleSort("score")}
                    >
                      <div className="flex items-center">
                        Score
                        <Tooltip text="Combined metric measuring frequency, speed, and breadth of copying (0-1 scale)" />
                        {sortBy === "score" && (
                          <svg xmlns="http://www.w3.org/2000/svg" className={`ml-1 h-3 w-3 transition-transform ${sortDirection === "asc" ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-5 py-4 cursor-pointer hover:bg-[#232336]"
                      onClick={() => handleSort("hits")}
                    >
                      <div className="flex items-center">
                        Hits
                        <Tooltip text="Number of times this wallet followed your trades" />
                        {sortBy === "hits" && (
                          <svg xmlns="http://www.w3.org/2000/svg" className={`ml-1 h-3 w-3 transition-transform ${sortDirection === "asc" ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-5 py-4 cursor-pointer hover:bg-[#232336]"
                      onClick={() => handleSort("breadth")}
                    >
                      <div className="flex items-center">
                        Tokens
                        <Tooltip text="Number of different tokens they've copied from you" />
                        {sortBy === "breadth" && (
                          <svg xmlns="http://www.w3.org/2000/svg" className={`ml-1 h-3 w-3 transition-transform ${sortDirection === "asc" ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-5 py-4 cursor-pointer hover:bg-[#232336]"
                      onClick={() => handleSort("avg_delay")}
                    >
                      <div className="flex items-center">
                        Avg Delay
                        <Tooltip text="Average time (in slots) between your buy and the follower's buy. Lower is better." />
                        {sortBy === "avg_delay" && (
                          <svg xmlns="http://www.w3.org/2000/svg" className={`ml-1 h-3 w-3 transition-transform ${sortDirection === "asc" ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#232336]">
                  {sortedData.length > 0 ? (
                    sortedData.map((follower: FollowerScore, index: number) => (
                      <tr key={follower.addr} className="hover:bg-[#1A1A2E] transition-colors">
                        <td className="px-5 py-4 font-medium text-gray-300">{index + 1}</td>
                        <td className="px-5 py-4 font-mono text-sm">{truncateAddress(follower.addr)}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            follower.tier === "Gold" ? "bg-yellow-900/30 text-yellow-400" : 
                            follower.tier === "Silver" ? "bg-gray-700/30 text-gray-300" : 
                            "bg-amber-900/30 text-amber-600"
                          }`}>
                            {follower.tier}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center">
                            <div className="mr-2 font-medium">{follower.score.toFixed(3)}</div>
                            <div className="w-16 h-2 bg-[#232336] rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${
                                  follower.tier === "Gold" ? "bg-gradient-to-r from-yellow-500 to-yellow-300" : 
                                  follower.tier === "Silver" ? "bg-gradient-to-r from-gray-500 to-gray-300" : 
                                  "bg-gradient-to-r from-amber-700 to-amber-500"
                                }`}
                                style={{ width: `${follower.score * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-medium">{follower.hits}</td>
                        <td className="px-5 py-4 font-medium">{follower.breadth}</td>
                        <td className="px-5 py-4 text-gray-400">{follower.avg_delay.toFixed(1)} slots</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                        No copy traders found that meet the criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info Card */}
          <div className="mt-8 bg-[#13131D] border border-[#232336] rounded-xl p-5">
            <h3 className="text-lg font-medium mb-3 text-[#14F195]">About Copy Trader Analysis</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              This analysis identifies wallets that copy your trading activity on Solana. The scoring algorithm considers frequency (60%), speed (30%), and diversity (10%) of copied trades. 
              Tiers are assigned based on overall scores: Gold (≥0.75), Silver (≥0.5), and Bronze (≥0.3). Only transactions within a 2-second window after your trades are considered to 
              filter out coincidental trades.
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-[#232336] py-6 mt-12">
          <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1A2E] border border-[#232336] mb-4 md:mb-0">
              <div className="w-2 h-2 rounded-full bg-[#14F195] animate-pulse" />
              <span className="text-gray-400 text-sm">Powered by Solana</span>
            </div>
            <div className="text-gray-500 text-sm">
              Data refreshes every 30 seconds
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
} 