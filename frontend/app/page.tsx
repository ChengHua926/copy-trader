"use client";

export default function Home() {
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
              <div className="mb-6">
                <label htmlFor="wallet" className="block text-gray-300 text-lg font-medium mb-2">
                  Enter Your Solana Wallet Address
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    id="wallet"
                    className="w-full px-4 py-3 rounded-lg bg-[#1A1A1A] border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9945FF]/50 focus:border-transparent transition-all group-hover:border-gray-700"
                    placeholder="e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="w-6 h-6 text-gray-500 group-hover:text-gray-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <button className="w-full bg-gradient-to-r from-[#9945FF] to-[#14F195] text-black font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-all transform hover:scale-[1.02] active:scale-[0.98]">
                Find Copy Traders
              </button>

              <p className="text-gray-500 text-sm mt-4 text-center">
                Currently supporting Solana network only
              </p>
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
