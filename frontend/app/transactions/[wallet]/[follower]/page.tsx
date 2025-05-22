"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

// Define types for the API response
interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  logo: string;
}

interface TransactionInfo {
  slot: number;
  timestamp: number;
  signature: string;
  amount: string;
  usd_amount: number;
}

interface CopyTransaction {
  token: TokenInfo;
  leader_transaction: TransactionInfo;
  follower_transaction: TransactionInfo;
  delay_slots: number;
}

interface TransactionsResponse {
  transactions: CopyTransaction[];
}

// Helper function to format date
const formatDate = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
};

// Helper function to truncate transaction hash
const truncateHash = (hash: string) => {
  if (!hash) return "";
  return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
};

// Helper function to format USD amount
const formatUSD = (amount: number) => {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Transaction Card Component
const TransactionCard = ({ transaction }: { transaction: CopyTransaction }) => {
  return (
    <div className="bg-[#13131D] border border-[#232336] rounded-xl p-6 mb-6 hover:border-[#9945FF]/30 transition-colors">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Token Information */}
        <div className="flex-none w-full md:w-48 flex flex-col items-center justify-center">
          <div className="h-16 w-16 mb-4 overflow-hidden rounded-full bg-[#1A1A2E] flex items-center justify-center">
            {transaction.token.logo ? (
              <img 
                src={transaction.token.logo} 
                alt={transaction.token.name} 
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-2xl font-bold text-[#14F195]">
                {transaction.token.symbol ? transaction.token.symbol.charAt(0) : "?"}
              </div>
            )}
          </div>
          <div className="text-lg font-bold text-white">{transaction.token.symbol}</div>
          <div className="text-sm text-gray-400 text-center mt-1">{transaction.token.name}</div>
        </div>
        
        {/* Transaction Details */}
        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Leader Transaction */}
          <div className="bg-[#1A1A2E] rounded-lg p-4 border border-[#232336]">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-400">Leader Transaction</div>
              <div className="px-2 py-1 bg-[#14F195]/10 text-[#14F195] text-xs font-medium rounded-full">
                Slot {transaction.leader_transaction.slot}
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-xs text-gray-400 mb-1">Amount</div>
              <div className="flex justify-between items-center">
                <div className="text-white">{transaction.leader_transaction.amount} {transaction.token.symbol}</div>
                <div className="text-[#14F195]">{formatUSD(transaction.leader_transaction.usd_amount)}</div>
              </div>
            </div>
            
            <div>
              <div className="text-xs text-gray-400 mb-1">Transaction</div>
              <a 
                href={`https://solscan.io/tx/${transaction.leader_transaction.signature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-[#14F195] transition-colors text-sm font-mono break-all"
              >
                {truncateHash(transaction.leader_transaction.signature)}
              </a>
            </div>
          </div>
          
          {/* Follower Transaction */}
          <div className="bg-[#1A1A2E] rounded-lg p-4 border border-[#232336]">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-400">Follower Transaction</div>
              <div className="px-2 py-1 bg-[#9945FF]/10 text-[#9945FF] text-xs font-medium rounded-full">
                Slot {transaction.follower_transaction.slot}
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-xs text-gray-400 mb-1">Amount</div>
              <div className="flex justify-between items-center">
                <div className="text-white">{transaction.follower_transaction.amount} {transaction.token.symbol}</div>
                <div className="text-[#9945FF]">{formatUSD(transaction.follower_transaction.usd_amount)}</div>
              </div>
            </div>
            
            <div>
              <div className="text-xs text-gray-400 mb-1">Transaction</div>
              <a 
                href={`https://solscan.io/tx/${transaction.follower_transaction.signature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-[#9945FF] transition-colors text-sm font-mono break-all"
              >
                {truncateHash(transaction.follower_transaction.signature)}
              </a>
            </div>
          </div>
        </div>
        
        {/* Delay Information */}
        <div className="flex-none w-full md:w-32 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-[#232336] mt-4 pt-4 md:mt-0 md:pt-0 md:pl-6">
          <div className="text-xs text-gray-400 mb-2">Copy Delay</div>
          <div className={`text-2xl font-bold ${
            transaction.delay_slots <= 3 ? "text-[#14F195]" : 
            transaction.delay_slots <= 6 ? "text-[#9945FF]" : 
            "text-[#FF9900]"
          }`}>
            {transaction.delay_slots} slots
          </div>
          <div className="text-xs text-gray-400 mt-2 text-center">
            {transaction.delay_slots <= 3 ? "Very Fast" : 
             transaction.delay_slots <= 6 ? "Fast" : 
             transaction.delay_slots <= 10 ? "Average" : "Slow"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<CopyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const params = useParams();
  const targetWallet = params?.wallet as string;
  const followerWallet = params?.follower as string;

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        
        const response = await fetch('http://localhost:8000/get-copy-transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            target_wallet: targetWallet,
            follower_wallet: followerWallet
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }
        
        const data: TransactionsResponse = await response.json();
        setTransactions(data.transactions);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('Failed to load transactions. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    if (targetWallet && followerWallet) {
      fetchTransactions();
    }
  }, [targetWallet, followerWallet]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0B13]">
        <div className="relative w-24 h-24">
          <div className="absolute w-full h-full border-4 border-t-[#14F195] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          <div className="absolute w-full h-full border-4 border-t-transparent border-r-[#9945FF] border-b-transparent border-l-transparent rounded-full animate-spin animation-delay-150"></div>
        </div>
        <p className="mt-8 text-xl text-white font-medium">Loading transactions...</p>
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
              <Link href={`/results?wallet=${targetWallet}`} className="text-white hover:text-[#14F195] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 111.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </Link>
              <h1 className="text-lg font-semibold">Copy Transactions</h1>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          {/* Wallets Info Card */}
          <div className="bg-[#13131D] border border-[#232336] rounded-xl p-6 mb-8">
            <div className="flex flex-col md:flex-row justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-2">Copy Trading Analysis</h2>
                <p className="text-gray-400 mb-4">
                  Showing transactions where <span className="text-[#9945FF]">follower</span> copied <span className="text-[#14F195]">leader</span>
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-[#1A1A2E] p-3 rounded-lg border border-[#232336]">
                    <div className="text-xs text-gray-400 mb-1">Leader Wallet</div>
                    <div className="font-mono text-sm tracking-wider text-[#14F195] break-all">
                      {targetWallet}
                    </div>
                  </div>
                  
                  <div className="bg-[#1A1A2E] p-3 rounded-lg border border-[#232336]">
                    <div className="text-xs text-gray-400 mb-1">Follower Wallet</div>
                    <div className="font-mono text-sm tracking-wider text-[#9945FF] break-all">
                      {followerWallet}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 md:mt-0 border-t md:border-t-0 md:border-l border-[#232336] pt-4 md:pt-0 md:pl-6 flex flex-col justify-center">
                <div className="text-gray-400 text-sm">Total Transactions</div>
                <div className="text-4xl font-bold bg-gradient-to-r from-[#9945FF] to-[#14F195] text-transparent bg-clip-text">
                  {transactions.length}
                </div>
                
                {transactions.length > 0 && (
                  <div className="flex items-center mt-2">
                    <div className="w-2 h-2 rounded-full bg-[#14F195] animate-pulse mr-2"></div>
                    <span className="text-sm text-gray-400">
                      Last copy on{" "}
                      {formatDate(transactions[0]?.leader_transaction.timestamp || 0)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Transactions List */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}
          
          {transactions.length > 0 ? (
            <div>
              {transactions.map((transaction, index) => (
                <TransactionCard key={index} transaction={transaction} />
              ))}
            </div>
          ) : !loading && !error ? (
            <div className="bg-[#13131D] border border-[#232336] rounded-xl p-8 text-center">
              <div className="text-xl font-medium mb-2">No copy transactions found</div>
              <p className="text-gray-400">
                No transactions were found where this wallet copied the leader.
              </p>
            </div>
          ) : null}
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