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

// Copy button component
const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 p-1 rounded-md hover:bg-[#232336] transition-colors"
      title="Copy address"
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#14F195]" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
        </svg>
      )}
    </button>
  );
};

// Simplified score indicator that just uses color
const ScoreIndicator = ({ score }: { score: number }) => {
  // Get color based on score range
  const getScoreColor = () => {
    if (score >= 0.75) return "text-[#14F195]"; // High confidence
    if (score >= 0.5) return "text-[#9945FF]";  // Medium confidence
    if (score >= 0.3) return "text-[#FF9900]";  // Low confidence
    return "text-gray-400";                    // Very low confidence
  };
  
  return (
    <div className={`font-medium ${getScoreColor()} flex justify-center`}>
      {score.toFixed(3)}
    </div>
  );
};

// Pagination component
const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: { 
  currentPage: number; 
  totalPages: number; 
  onPageChange: (page: number) => void 
}) => {
  return (
    <div className="flex items-center justify-center mt-6 space-x-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1 rounded border border-[#232336] bg-[#1A1A2E] text-white disabled:opacity-50"
      >
        ← Prev
      </button>
      
      <div className="px-3 py-1 rounded bg-[#232336] text-white">
        <span className="font-medium">{currentPage}</span>
        <span className="text-gray-400"> / {totalPages}</span>
      </div>
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1 rounded border border-[#232336] bg-[#1A1A2E] text-white disabled:opacity-50"
      >
        Next →
      </button>
    </div>
  );
};

export default function ResultsPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("score");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;
  
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

  // Map the old tier names to confidence levels
  const mapTierToConfidence = (oldTier: string) => {
    switch (oldTier) {
      case "Gold": return "High Confidence";
      case "Silver": return "Medium Confidence";
      case "Bronze": return "Low Confidence";
      default: return "Unknown";
    }
  };

  // Sort function for the table
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("desc");
    }
    setCurrentPage(1); // Reset to first page on sort change
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Filter and sort the data
  const processedData = result?.data?.follower_scores
    ? [...result.data.follower_scores]
        // Filter out the target wallet
        .filter((follower: FollowerScore) => follower.addr.toLowerCase() !== wallet.toLowerCase())
        // Map old tiers to confidence levels
        .map((follower: FollowerScore) => ({
          ...follower,
          tier: mapTierToConfidence(follower.tier)
        }))
        // Sort the data
        .sort((a: FollowerScore, b: FollowerScore) => {
          let comparison = 0;
          
          switch (sortBy) {
            case "tier":
              // Custom sorting for confidence levels
              const tierOrder = { "High Confidence": 3, "Medium Confidence": 2, "Low Confidence": 1, "": 0 };
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
    
  // Calculate pagination info
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = processedData.slice(startIndex, startIndex + itemsPerPage);

  // Calculate tier distribution based on confidence levels
  const tierDistribution = processedData.reduce((acc: Record<string, number>, follower: FollowerScore) => {
    acc[follower.tier] = (acc[follower.tier] || 0) + 1;
    return acc;
  }, {});

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
              <h1 className="text-lg font-semibold">Copy Traders for <span className="font-mono text-[#14F195]">{wallet}</span></h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-full bg-[#1A1A2E] border border-[#232336] text-xs font-medium text-[#14F195]">
                Solana
              </div>
              <div className="px-3 py-1.5 rounded-full bg-[#1A1A2E] border border-[#232336] text-xs font-medium text-white">
                <span className="text-[#14F195]">{processedData.length}</span> followers
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          {/* Copy Trader Summary Card */}
          <div className="bg-[#13131D] border border-[#232336] rounded-xl p-6 mb-8">
            <div className="flex flex-col md:flex-row">
              {/* Primary metrics section */}
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-4">Copy Trader Analysis</h2>
                
                <div className="flex items-end gap-3">
                  <div>
                    <div className="text-gray-400 text-sm">Likely Copy Traders</div>
                    <div className="text-4xl font-bold bg-gradient-to-r from-[#9945FF] to-[#14F195] text-transparent bg-clip-text">
                      {(tierDistribution["High Confidence"] || 0) + (tierDistribution["Medium Confidence"] || 0)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-400 mb-1.5">
                    out of <span className="text-white font-medium">{processedData.length}</span> addresses
                  </div>
                </div>
                
                <div className="mt-6 grid grid-cols-3 gap-6">
                  <div>
                    <div className="flex items-center mb-1.5">
                      <div className="w-3 h-3 rounded-full bg-[#14F195] mr-2"></div>
                      <div className="text-sm text-gray-400">High Confidence</div>
                    </div>
                    <div className="text-2xl font-bold">{tierDistribution["High Confidence"] || 0}</div>
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-1.5">
                      <div className="w-3 h-3 rounded-full bg-[#9945FF] mr-2"></div>
                      <div className="text-sm text-gray-400">Medium Confidence</div>
                    </div>
                    <div className="text-2xl font-bold">{tierDistribution["Medium Confidence"] || 0}</div>
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-1.5">
                      <div className="w-3 h-3 rounded-full bg-[#FF9900] mr-2"></div>
                      <div className="text-sm text-gray-400">Low Confidence</div>
                    </div>
                    <div className="text-2xl font-bold">{tierDistribution["Low Confidence"] || 0}</div>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-[#232336]">
                  <div className="flex justify-between">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-[#14F195] animate-pulse mr-2"></div>
                      <span className="text-sm text-gray-400">Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, processedData.length)} of {processedData.length}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-400">Copy Rate: </span>
                      <span className="text-[#14F195] font-medium">
                        {processedData.length > 0 
                          ? `${Math.round(((tierDistribution["High Confidence"] || 0) + (tierDistribution["Medium Confidence"] || 0)) / processedData.length * 100)}%` 
                          : "0%"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Follower Table */}
          <div className="bg-[#13131D] border border-[#232336] rounded-xl overflow-hidden">
            <div className="w-full">
              <table className="w-full text-left">
                <thead className="text-xs uppercase bg-[#1A1A2E] text-gray-400">
                  <tr>
                    <th scope="col" className="px-5 py-4 text-center">Rank</th>
                    <th scope="col" className="px-5 py-4">Wallet</th>
                    <th 
                      scope="col" 
                      className="px-5 py-4 cursor-pointer hover:bg-[#232336] text-center"
                      onClick={() => handleSort("tier")}
                    >
                      <div className="flex items-center justify-center">
                        Confidence Level
                        <Tooltip text="Likelihood that this wallet is copy trading you: High (≥0.75), Medium (≥0.5), Low (≥0.3)" />
                        {sortBy === "tier" && (
                          <svg xmlns="http://www.w3.org/2000/svg" className={`ml-1 h-3 w-3 transition-transform ${sortDirection === "asc" ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-5 py-4 cursor-pointer hover:bg-[#232336] text-center"
                      onClick={() => handleSort("score")}
                    >
                      <div className="flex items-center justify-center">
                        Score
                        <Tooltip text="Probability score (0-1 scale) indicating likelihood of copy trading" />
                        {sortBy === "score" && (
                          <svg xmlns="http://www.w3.org/2000/svg" className={`ml-1 h-3 w-3 transition-transform ${sortDirection === "asc" ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-5 py-4 cursor-pointer hover:bg-[#232336] text-center"
                      onClick={() => handleSort("hits")}
                    >
                      <div className="flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-[#14F195]" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 3a1 1 0 000 2h10a1 1 0 100-2H3zm0 4a1 1 0 000 2h6a1 1 0 100-2H3zm0 4a1 1 0 100 2h8a1 1 0 100-2H3z" clipRule="evenodd" />
                        </svg>
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
                      className="px-5 py-4 cursor-pointer hover:bg-[#232336] text-center"
                      onClick={() => handleSort("breadth")}
                    >
                      <div className="flex items-center justify-center">
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
                      className="px-5 py-4 cursor-pointer hover:bg-[#232336] text-center"
                      onClick={() => handleSort("avg_delay")}
                    >
                      <div className="flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-[#FF9900]" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
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
                  {paginatedData.length > 0 ? (
                    paginatedData.map((follower: FollowerScore, index: number) => (
                      <tr key={follower.addr} className="hover:bg-[#1A1A2E] transition-colors">
                        <td className="px-5 py-4 font-medium text-gray-300 text-center">{startIndex + index + 1}</td>
                        <td className="px-5 py-4">
                          <div className="group flex items-center">
                            <span className="font-mono text-sm tracking-wider text-gray-200">{follower.addr}</span>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <CopyButton text={follower.addr} />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium ${
                            follower.tier === "High Confidence" ? "bg-[#14F195]/10 text-[#14F195] border border-[#14F195]/30" : 
                            follower.tier === "Medium Confidence" ? "bg-[#9945FF]/10 text-[#9945FF] border border-[#9945FF]/30" : 
                            "bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/30"
                          }`}>
                            {follower.tier === "High Confidence" && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                              </svg>
                            )}
                            {follower.tier}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <ScoreIndicator score={follower.score} />
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="font-medium">{follower.hits}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="font-medium">{follower.breadth}</span>
                        </td>
                        <td className="px-5 py-4 text-gray-400 text-center">
                          {follower.avg_delay.toFixed(1)} slots
                        </td>
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
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-[#232336]">
                <Pagination 
                  currentPage={currentPage} 
                  totalPages={totalPages} 
                  onPageChange={handlePageChange} 
                />
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-[#232336] py-6 mt-12">
          <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1A2E] border border-[#232336] mb-4 md:mb-0">
              <div className="w-2 h-2 rounded-full bg-[#14F195] animate-pulse" />
              <span className="text-gray-400 text-sm">Powered by Solana</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
} 