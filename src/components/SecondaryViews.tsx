import React, { useState } from 'react';
import {
  BookOpen,
  Shield,
  Bookmark,
  History,
  FileText,
  Info,
  Settings,
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
  ChevronRight,
  Trash2,
  Download,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  TokenScanReport,
  NetworkId,
  SUPPORTED_NETWORKS,
} from '../types/tokenlens.ts';
import {
  formatUsd,
  formatTokenPrice,
  shortenAddress,
  formatRelativeTime,
  getClassificationStyles,
} from '../utils/formatters.ts';

// ============================================================================
// EDUCATIONAL GLOSSARY & SECURITY SIGNALS VIEW (Section 14)
// ============================================================================

const GLOSSARY_ENTRIES = [
  {
    id: 'honeypots',
    term: 'Honeypots',
    category: 'Trading Restrictions',
    summary:
      'A smart contract trap that allows investors to buy a token on a decentralized exchange but blocks or reverts sell transactions.',
    simpleEnglish:
      'Imagine a store where you can easily pay to buy an item, but the exit door is locked when you try to return or sell it back. Scammers create honeypot tokens so the price chart only goes up while nobody except the creator can sell.',
    pidginSummary:
      'Honeypot na token wey go gree make you buy am sharp-sharp, but when you wan sell am collect your money back, the smart contract go block your transaction.',
    technicalMechanism:
      'Implemented via custom require() conditions inside ERC-20 _transfer() hooks, hidden whitelist checks, or dynamic gas-griefing loops that only trigger when the recipient address is the automated market maker (AMM) pair.',
    howToVerify:
      'Check Honeypot.is trade simulation results, inspect recent sell transactions on the DEX pair explorer to confirm diverse wallets are selling, and verify that _transfer() contains no arbitrary sender restrictions.',
  },
  {
    id: 'liquidity',
    term: 'Liquidity & LP Locks',
    category: 'Liquidity Analysis',
    summary:
      'The pool of paired assets (such as ETH/USDC) deposited in a DEX smart contract that enables instant token swaps, and whether those pool tokens are time-locked.',
    simpleEnglish:
      'Liquidity is the cash reserve sitting in the trading pool. If a token has $1M in market cap but only $2,000 in liquidity, you cannot actually cash out more than a few hundred dollars. Even if a pool is large, if the creator has not "locked" the liquidity, they can pull all the cash out in one transaction (a "rug pull").',
    pidginSummary:
      'Liquidity na the real money wey dey inside the market pool wey people fit take buy and sell. If developer no lock that pool (LP Lock), dem fit carry all the money run anytime.',
    technicalMechanism:
      'When liquidity is added to Uniswap or PancakeSwap, the provider receives LP tokens representing ownership of the pool. Locking liquidity means transferring those LP tokens to a time-locked vault contract (e.g., Unicrypt, PinkLock, Team Finance) or burning them to 0x000...dead.',
    howToVerify:
      'Never infer liquidity lock status from pool dollar size alone. Inspect the holders of the LP pair contract on the block explorer to confirm the majority of LP tokens reside in a verified locker or burn address.',
  },
  {
    id: 'mint-authority',
    term: 'Mint Authority',
    category: 'Smart Contract Security',
    summary:
      'A privileged function in a token contract that allows designated addresses to create new tokens and increase total supply.',
    simpleEnglish:
      'Mint authority is like having a money printing press. If an untrusted developer still has mint authority, they can print billions of free tokens for themselves and dump them into the trading pool, draining all liquidity.',
    pidginSummary:
      'Mint authority mean say the person wey hold the power fit print new token join the ones wey dey ground, scatter the price.',
    technicalMechanism:
      'In ERC-20 contracts, an external/public mint(address to, uint256 amount) function guarded by onlyOwner or MINTER_ROLE calls _mint(). On Solana SPL tokens, it is controlled by the Mint Authority public key in the Mint account header.',
    howToVerify:
      'Check if is_mintable is flagged, verify whether ownership is renounced, or confirm the mint authority is controlled by a decentralized cross-chain bridge or governance timelock.',
  },
  {
    id: 'contract-ownership',
    term: 'Contract Ownership & Renouncement',
    category: 'Smart Contract Security',
    summary:
      'The administrative account (owner) authorized to call privileged settings functions in a smart contract.',
    simpleEnglish:
      'Many smart contracts have an "Owner" account that can change rules, pause trading, or adjust taxes. When developers "renounce ownership," they transfer this admin key to an unusable burn address (0x000...000) so nobody can change the owner settings anymore.',
    pidginSummary:
      'Contract owner na the ogakpata wey get admin key for the token. If dem "renounce ownership", e mean say dem don throway the admin key go burn address.',
    technicalMechanism:
      'OpenZeppelin Ownable stores an _owner address checked by the onlyOwner modifier. Calling renounceOwnership() sets _owner = address(0). Beware of contracts with hidden secondary admin variables or can_take_back_ownership functions.',
    howToVerify:
      'Call the owner() read function on the block explorer and search the verified Solidity code for custom modifiers besides onlyOwner.',
  },
  {
    id: 'proxy-contracts',
    term: 'Proxy Contracts & Upgradeability',
    category: 'Smart Contract Security',
    summary:
      'A modular smart contract pattern that separates token storage from logic code so administrators can upgrade the contract rules later.',
    simpleEnglish:
      'Normally, blockchain code cannot be changed once deployed. A Proxy contract is an exception: it acts as a permanent forwarding address pointing to a replaceable logic contract. Major companies like Circle (USDC) use proxies for legal upgrades, but an anonymous developer could use a proxy upgrade to add malicious rules later.',
    pidginSummary:
      'Proxy contract be like house wey the landlord fit change all the law inside anytime without changing the house address.',
    technicalMechanism:
      'Uses EVM delegatecall (EIP-1967 Transparent or UUPS Proxy) to execute code from an implementation contract in the storage context of the proxy contract.',
    howToVerify:
      'Check if the proxy admin is protected by a multi-signature wallet and a public timelock delay so users have warning before upgrades take effect.',
  },
  {
    id: 'blacklists',
    term: 'Blacklists & Address Freezing',
    category: 'Trading Restrictions',
    summary:
      'A contract mapping that prevents specific wallet addresses from sending, receiving, or selling tokens.',
    simpleEnglish:
      'A blacklist lets the contract administrator freeze individual wallets. Regulated stablecoins like USDT and USDC have blacklists to comply with law enforcement, but in unregulated tokens, a malicious owner can blacklist regular buyers right after they purchase so they can never sell.',
    pidginSummary:
      'Blacklist na list inside the contract where admin fit put your wallet address lock am make you no fit sell or move your token.',
    technicalMechanism:
      'A mapping(address => bool) isBlacklisted checked inside _beforeTokenTransfer or _transfer() that reverts when true.',
    howToVerify:
      'Check if hasBlacklist is present AND whether an active owner still controls the contract. If ownership is genuinely renounced and no blacklist manager role exists, the blacklist mapping can no longer be modified.',
  },
  {
    id: 'taxes',
    term: 'Buy and Sell Taxes',
    category: 'Trading Restrictions',
    summary:
      'Automatic percentage fees deducted by the token contract during decentralized exchange buys, sells, or wallet transfers.',
    simpleEnglish:
      'Some tokens charge a built-in fee every time you buy or sell (for example, a 5% buy tax and 5% sell tax). If a contract has a 50% or 99% sell tax, you lose almost all your money when selling.',
    pidginSummary:
      'Buy and sell tax na percentage cut wey the token contract go commot from your token anytime you buy or sell.',
    technicalMechanism:
      'Inside _transfer(), the contract detects swaps against automated market maker pair addresses and diverts a percentage of tokens to a marketing/treasury wallet.',
    howToVerify:
      'Review simulated buy/sell tax percentages AND check whether the contract owner has permission to modify tax rates (slippage_modifiable) without a hardcoded maximum limit.',
  },
  {
    id: 'holder-concentration',
    term: 'Holder Concentration',
    category: 'Holder Concentration',
    summary:
      'The percentage of circulating token supply controlled by the largest non-pool, non-burn wallets.',
    simpleEnglish:
      'If 5 people own 70% of all tokens, they have massive power over the price. If even one of them sells, the trading pool can be drained. Note that TokenLens automatically excludes burn addresses (destroyed tokens) and DEX liquidity pools when calculating investor concentration.',
    pidginSummary:
      'Holder concentration dey show whether na only few big-big wallet (whales) pack almost all the token.',
    technicalMechanism:
      'Aggregates top token balances from indexer telemetry, filtering out dead/burn addresses (0x000...dead) and smart contract liquidity pairs.',
    howToVerify:
      'Inspect the top holders tab on Etherscan/BscScan/BaseScan to check whether large holders are time-locked vesting contracts, exchange cold wallets, or unlocked EOA whales.',
  },
];

export const SecuritySignalsGlossaryView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = GLOSSARY_ENTRIES.filter((entry) => {
    if (selectedCategory !== 'all' && entry.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        entry.term.toLowerCase().includes(q) ||
        entry.summary.toLowerCase().includes(q) ||
        entry.simpleEnglish.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="rounded-2xl bg-[#15162D] border border-[#25274D] p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#F8FAFC] flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-[#A78BFA]" />
              <span>Web3 Security Signals &amp; Educational Glossary</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
              Understand what each deterministic security check means in plain English, Nigerian
              Pidgin, and on-chain technical terms.
            </p>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search glossary terms (e.g. honeypot, proxy)..."
            aria-label="Search educational glossary"
            className="w-full md:w-72 px-3.5 py-2 rounded-xl bg-[#0B0C1E] border border-[#25274D] text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {['all', 'Smart Contract Security', 'Trading Restrictions', 'Liquidity Analysis', 'Holder Concentration'].map(
            (cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#8B5CF6] text-white'
                    : 'bg-[#0B0C1E] text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                {cat === 'all' ? 'All Security Concepts (8)' : cat}
              </button>
            )
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filtered.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl bg-[#15162D] border border-[#25274D] p-6 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-[#23254A] pb-3">
                <h3 className="text-lg font-bold text-[#F8FAFC]">{item.term}</h3>
                <span className="text-xs font-mono text-[#22D3EE]">{item.category}</span>
              </div>

              <p className="text-xs sm:text-sm font-medium text-[#F8FAFC] leading-relaxed">
                {item.summary}
              </p>

              <div className="p-3.5 rounded-xl bg-[#0B0C1E] border border-[#1E2040] space-y-1.5">
                <div className="text-xs font-semibold text-[#A78BFA]">
                  Plain English for Beginners
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">{item.simpleEnglish}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0B0C1E] border border-[#1E2040] space-y-1.5">
                <div className="text-xs font-semibold text-[#22C55E]">
                  Nigerian Pidgin Explanation
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">{item.pidginSummary}</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#23254A] text-xs">
              <div>
                <strong className="text-[#F8FAFC]">Smart Contract Mechanism: </strong>
                <span className="text-[#94A3B8]">{item.technicalMechanism}</span>
              </div>
              <div>
                <strong className="text-[#22D3EE]">How to Verify Independently: </strong>
                <span className="text-[#94A3B8]">{item.howToVerify}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MARKET OVERVIEW VIEW
// ============================================================================

export const MarketOverviewView: React.FC<{
  reports: TokenScanReport[];
  onOpenReport: (scanId: string) => void;
}> = ({ reports, onOpenReport }) => {
  const chartData = reports
    .filter((r) => r.market.liquidityUsd !== null && r.market.liquidityUsd > 0)
    .slice(0, 8)
    .map((r) => ({
      symbol: `${r.token.symbol} (${SUPPORTED_NETWORKS[r.token.networkId].shortName})`,
      liquidityUsd: r.market.liquidityUsd || 0,
      volume24hUsd: r.market.volume24hUsd || 0,
      scanId: r.scanId,
    }));

  return (
    <div className="space-y-6 pb-12">
      <div className="rounded-2xl bg-[#15162D] border border-[#25274D] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#23254A] pb-3">
          <div>
            <h2 className="text-lg font-bold text-[#F8FAFC] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#22D3EE]" />
              <span>DEX Liquidity &amp; Volume Comparison Across Scanned Tokens</span>
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Live market metrics sourced from DEX Screener. Market Cap and Fully Diluted Valuation
              (FDV) are tracked distinctly.
            </p>
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <XAxis dataKey="symbol" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <YAxis
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  tickFormatter={(v) => formatUsd(Number(v))}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#0B0C1E',
                    borderColor: '#25274D',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(val: any, name: any) => [
                    formatUsd(Number(val)),
                    name === 'liquidityUsd' ? 'Total DEX Liquidity' : '24h Trading Volume',
                  ]}
                />
                <Bar dataKey="liquidityUsd" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="volume24hUsd" fill="#22D3EE" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-[#94A3B8]">
            No DEX liquidity snapshots recorded yet. Scan a token to populate market analytics.
          </div>
        )}
      </div>

      {/* Valuation Comparison Table */}
      <div className="rounded-2xl bg-[#15162D] border border-[#25274D] overflow-hidden">
        <div className="p-5 border-b border-[#23254A]">
          <h3 className="text-sm font-bold text-[#F8FAFC]">
            Circulating Market Cap vs. Fully Diluted Valuation (FDV) Matrix
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono tabular-nums">
            <thead>
              <tr className="bg-[#101126] border-b border-[#23254A] text-[11px] text-[#94A3B8] font-sans">
                <th className="py-3 px-4">Token</th>
                <th className="py-3 px-3">Network</th>
                <th className="py-3 px-3 text-right">Price (USD)</th>
                <th className="py-3 px-3 text-right">24h Change</th>
                <th className="py-3 px-3 text-right">Circulating Market Cap</th>
                <th className="py-3 px-3 text-right">Fully Diluted Valuation (FDV)</th>
                <th className="py-3 px-3 text-right">DEX Liquidity</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2040]">
              {reports.map((r) => (
                <tr
                  key={r.scanId}
                  onClick={() => onOpenReport(r.scanId)}
                  className="hover:bg-[#1A1C3A]/60 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-sans font-semibold text-[#F8FAFC]">
                    {r.token.name} <span className="text-[#A78BFA] font-mono">({r.token.symbol})</span>
                  </td>
                  <td className="py-3 px-3 text-[#22D3EE]">
                    {SUPPORTED_NETWORKS[r.token.networkId].shortName}
                  </td>
                  <td className="py-3 px-3 text-right text-[#F8FAFC]">
                    {formatTokenPrice(r.market.priceUsd)}
                  </td>
                  <td
                    className={`py-3 px-3 text-right ${
                      r.market.priceChange24h === null
                        ? 'text-[#94A3B8]'
                        : r.market.priceChange24h >= 0
                          ? 'text-[#22C55E]'
                          : 'text-[#EF4444]'
                    }`}
                  >
                    {r.market.priceChange24h !== null
                      ? `${r.market.priceChange24h > 0 ? '+' : ''}${r.market.priceChange24h}%`
                      : 'N/A'}
                  </td>
                  <td className="py-3 px-3 text-right text-[#F8FAFC]">
                    {formatUsd(r.market.marketCapUsd)}
                  </td>
                  <td className="py-3 px-3 text-right text-[#A78BFA]">
                    {formatUsd(r.market.fdvUsd)}
                  </td>
                  <td className="py-3 px-3 text-right text-[#F8FAFC]">
                    {formatUsd(r.market.liquidityUsd)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-[#A78BFA] hover:underline inline-flex items-center gap-1 font-sans">
                      <span>View</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// BOOKMARKS & SCAN HISTORY VIEW
// ============================================================================

export const SavedAndHistoryView: React.FC<{
  mode: 'bookmarks' | 'history';
  reports: TokenScanReport[];
  bookmarkedKeys: string[];
  onOpenReport: (scanId: string) => void;
  onToggleBookmark: (networkId: NetworkId, contractAddress: string) => void;
  onScanToken: (networkId: NetworkId, contractAddress: string) => void;
}> = ({ mode, reports, bookmarkedKeys, onOpenReport, onToggleBookmark, onScanToken }) => {
  const displayedReports =
    mode === 'bookmarks'
      ? reports.filter((r) =>
          bookmarkedKeys.includes(`${r.token.networkId}:${r.token.contractAddress.toLowerCase()}`)
        )
      : reports;

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(displayedReports, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tokenlens-${mode}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="rounded-2xl bg-[#15162D] border border-[#25274D] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#F8FAFC] flex items-center gap-2.5">
            {mode === 'bookmarks' ? (
              <>
                <Bookmark className="w-5 h-5 text-[#A78BFA]" />
                <span>Saved Token Bookmarks ({displayedReports.length})</span>
              </>
            ) : (
              <>
                <History className="w-5 h-5 text-[#22D3EE]" />
                <span>Platform Scan History ({displayedReports.length})</span>
              </>
            )}
          </h2>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
            {mode === 'bookmarks'
              ? 'Tokens you have bookmarked in your browser for ongoing security monitoring.'
              : 'Chronological record of security scans with timestamp, data coverage, and risk summary.'}
          </p>
        </div>

        {displayedReports.length > 0 && (
          <button
            type="button"
            onClick={handleExportJson}
            className="px-3.5 py-2 rounded-xl bg-[#0B0C1E] hover:bg-[#1E2040] border border-[#25274D] text-xs font-medium text-[#F8FAFC] inline-flex items-center gap-2 transition-colors cursor-pointer self-start"
          >
            <Download className="w-4 h-4 text-[#A78BFA]" />
            <span>Export JSON</span>
          </button>
        )}
      </div>

      {displayedReports.length === 0 ? (
        <div className="rounded-2xl bg-[#15162D] border border-[#25274D] p-12 text-center space-y-3">
          <div className="text-sm font-semibold text-[#F8FAFC]">
            {mode === 'bookmarks'
              ? 'No bookmarked tokens yet'
              : 'No scan history recorded yet'}
          </div>
          <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
            {mode === 'bookmarks'
              ? 'Click the Bookmark button on any token row or security report to save it here for quick review.'
              : 'Paste any contract address in the scanner to generate your first evidence-backed security report.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedReports.map((report) => {
            const netCfg = SUPPORTED_NETWORKS[report.token.networkId];
            const classStyle = getClassificationStyles(report.riskOverview.classification);
            return (
              <div
                key={report.scanId}
                className="rounded-2xl bg-[#15162D] border border-[#25274D] p-5 flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#F8FAFC]">{report.token.name}</h3>
                      <span className="text-xs font-mono text-[#A78BFA]">
                        ({report.token.symbol})
                      </span>
                      <span className="text-xs text-[#22D3EE] font-semibold">
                        · {netCfg.shortName}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-[#94A3B8] mt-1">
                      {report.token.contractAddress}
                    </div>
                  </div>

                  {mode === 'bookmarks' && (
                    <button
                      type="button"
                      onClick={() =>
                        onToggleBookmark(report.token.networkId, report.token.contractAddress)
                      }
                      aria-label="Remove bookmark"
                      className="p-1.5 rounded-lg bg-[#0B0C1E] text-[#94A3B8] hover:text-[#EF4444] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-[#94A3B8] line-clamp-2 leading-relaxed">
                  {report.aiAnalysis.executiveSummary}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#23254A] text-xs">
                  <div className="flex items-center gap-2 font-mono">
                    <span className={`font-semibold ${classStyle.text}`}>
                      {classStyle.shortLabel}
                    </span>
                    <span className="text-[#94A3B8]">·</span>
                    <span className="text-[#F8FAFC]">
                      {report.riskOverview.dataCoveragePercent}% Coverage
                    </span>
                    <span className="text-[#94A3B8]">·</span>
                    <span className="text-[#94A3B8]">{formatRelativeTime(report.scannedAt)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!report.isDemo && (
                      <button
                        type="button"
                        onClick={() =>
                          onScanToken(report.token.networkId, report.token.contractAddress)
                        }
                        className="px-2.5 py-1 rounded-lg bg-[#0B0C1E] hover:bg-[#1E2040] border border-[#25274D] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                      >
                        Rescan
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenReport(report.scanId)}
                      className="px-3 py-1 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold transition-colors cursor-pointer"
                    >
                      Open Report
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// DOCUMENTATION, METHODOLOGY & ABOUT VIEW
// ============================================================================

export const DocumentationView: React.FC<{
  demoMode: boolean;
  onToggleDemoMode: () => void;
  demoReports: TokenScanReport[];
  onOpenReport: (scanId: string) => void;
}> = ({ demoMode, onToggleDemoMode, demoReports, onOpenReport }) => {
  const networks = Object.values(SUPPORTED_NETWORKS);

  return (
    <div className="space-y-6 pb-12">
      {/* Architecture & Epistemic Principles */}
      <section className="rounded-2xl bg-[#15162D] border border-[#25274D] p-6 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-[#23254A] pb-3">
          <FileText className="w-5 h-5 text-[#A78BFA]" />
          <h2 className="text-lg font-bold text-[#F8FAFC]">
            TokenLens AI — Risk Engine Methodology &amp; Epistemic Standards
          </h2>
        </div>

        <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
          TokenLens AI separates deterministic blockchain security analysis from AI natural-language
          translation. Neither the deterministic engine nor Gemma 4 is permitted to declare any
          token &ldquo;guaranteed safe&rdquo; or &ldquo;guaranteed fraudulent&rdquo; based solely on
          automated indicators.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="p-4 rounded-xl bg-[#0B0C1E] border border-[#1E2040] space-y-1.5">
            <div className="text-xs font-bold text-[#22C55E]">1. Verified Observations</div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Direct on-chain state reads via <code className="text-[#F8FAFC]">viem</code> RPC
              (contract bytecode existence, ERC-20 supply/decimals, Ownable owner address) and live
              DEX pool reserves.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0C1E] border border-[#1E2040] space-y-1.5">
            <div className="text-xs font-bold text-[#22D3EE]">2. Third-Party Assessments</div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Static and dynamic security indicators reported by GoPlus Security and Honeypot.is v2
              trade simulations, explicitly attributed to their source provider.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0C1E] border border-[#1E2040] space-y-1.5">
            <div className="text-xs font-bold text-[#F59E0B]">3. Heuristic Indicators</div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Contextual risk signals such as top-10 wallet concentration (excluding burn and LP
              addresses) and newly created DEX pairs (&lt;7 days old).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0C1E] border border-[#1E2040] space-y-1.5">
            <div className="text-xs font-bold text-[#94A3B8]">4. Missing / Unverified Data</div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              When a provider does not support a network or has not indexed a contract, the check is
              marked <code className="text-[#F8FAFC]">Unknown</code>. Missing data is never treated
              as passing a security check.
            </p>
          </div>
        </div>
      </section>

      {/* Network Capability Matrix */}
      <section className="rounded-2xl bg-[#15162D] border border-[#25274D] overflow-hidden">
        <div className="p-5 border-b border-[#23254A]">
          <h3 className="text-base font-bold text-[#F8FAFC]">
            Supported Networks &amp; Provider Capability Detection Matrix
          </h3>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            TokenLens detects provider capabilities per chain and skips EVM-specific bytecode rules
            when inspecting Solana tokens.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-[#101126] border-b border-[#23254A] text-[11px] text-[#94A3B8] font-sans">
                <th className="py-3 px-4">Blockchain Network</th>
                <th className="py-3 px-3">Chain ID</th>
                <th className="py-3 px-3">Tier</th>
                <th className="py-3 px-3">On-Chain RPC (viem)</th>
                <th className="py-3 px-3">GoPlus Security</th>
                <th className="py-3 px-3">Honeypot.is v2</th>
                <th className="py-3 px-4">DEX Screener</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2040]">
              {networks.map((net) => (
                <tr key={net.id}>
                  <td className="py-3 px-4 font-sans font-semibold text-[#F8FAFC]">
                    {net.name} ({net.shortName})
                  </td>
                  <td className="py-3 px-3 text-[#94A3B8]">{net.chainId}</td>
                  <td className="py-3 px-3">
                    <span
                      className={
                        net.tier === 'MVP' ? 'text-[#22C55E] font-semibold' : 'text-[#A78BFA]'
                      }
                    >
                      {net.tier}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {net.rpcSupported ? (
                      <span className="text-[#22C55E]">Supported (EVM)</span>
                    ) : (
                      <span className="text-[#F59E0B]">Non-EVM (Skipped)</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-[#22C55E]">Supported</td>
                  <td className="py-3 px-3">
                    {net.honeypotSupported ? (
                      <span className="text-[#22C55E]">Supported</span>
                    ) : (
                      <span className="text-[#94A3B8]">Not Supported</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-[#22C55E]">Supported</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Synthetic Demo Mode Control Panel */}
      <section className="rounded-2xl bg-[#15162D] border border-[#25274D] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#23254A] pb-3">
          <div className="flex items-center gap-2.5">
            <FlaskConical className="w-5 h-5 text-[#F59E0B]" />
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC]">
                Hackathon Demo Mode &amp; Synthetic Test Scenarios
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Inspect synthetic edge-case reports clearly labeled as Demo Mode alongside live
                blockchain scanning.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleDemoMode}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              demoMode
                ? 'bg-[#F59E0B] text-[#080817]'
                : 'bg-[#0B0C1E] border border-[#25274D] text-[#F8FAFC] hover:border-[#F59E0B]'
            }`}
          >
            {demoMode ? 'Disable Synthetic Demo Mode' : 'Enable Synthetic Demo Mode'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {demoReports.map((dr) => (
            <div
              key={dr.scanId}
              className="p-4 rounded-xl bg-[#0B0C1E] border border-[#23254A] flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1">
                <div className="text-xs font-mono text-[#F59E0B]">[SYNTHETIC SAMPLE]</div>
                <div className="text-sm font-bold text-[#F8FAFC]">{dr.demoScenarioLabel}</div>
                <div className="text-xs text-[#94A3B8]">
                  {dr.token.name} ({dr.token.symbol})
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenReport(dr.scanId)}
                className="w-full py-2 rounded-lg bg-[#15162D] hover:bg-[#8B5CF6] text-xs font-semibold text-[#F8FAFC] hover:text-white transition-colors cursor-pointer"
              >
                Inspect Demo Scenario
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
