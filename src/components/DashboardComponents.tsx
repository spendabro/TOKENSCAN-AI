import React, { useState, useEffect } from 'react';
import {
  Search,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  ArrowUpDown,
  Bookmark,
  ExternalLink,
  CheckCircle2,
  Loader2,
  FlaskConical,
  Layers,
  Activity,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import {
  NetworkId,
  SUPPORTED_NETWORKS,
  TokenScanReport,
  PlatformStats,
  TokenSearchCandidate,
} from '../types/tokenlens.ts';
import {
  formatUsd,
  formatTokenPrice,
  shortenAddress,
  formatRelativeTime,
  getClassificationStyles,
  CURATED_QUICK_TOKENS,
} from '../utils/formatters.ts';

const SCAN_WORKFLOW_STEPS = [
  '1. Validating contract address checksum',
  '2. Identifying blockchain network & capabilities',
  '3. Retrieving on-chain ERC-20 / SPL metadata',
  '4. Fetching GoPlus smart-contract security signals',
  '5. Fetching DEX Screener liquidity & market pairs',
  '6. Running Honeypot.is trade simulation & deterministic rules',
  '7. Normalizing findings into unified evidence schema',
  '8. Sending grounded evidence to Google Gemma 4',
  '9. Validating structured AI output with Zod schema',
  '10. Rendering final evidence-backed security report',
];

interface HeroScannerProps {
  selectedNetwork: NetworkId;
  onSelectNetwork: (net: NetworkId) => void;
  addressInput: string;
  onAddressInputChange: (val: string) => void;
  onTriggerScan: (networkId: NetworkId, contractAddress: string, forceRescan?: boolean) => void;
  isScanning: boolean;
  scanStepIndex: number;
  scanError: string | null;
  recentReports: TokenScanReport[];
  onOpenReport: (scanId: string) => void;
  demoMode: boolean;
  demoReports: TokenScanReport[];
}

export const HeroScanner: React.FC<HeroScannerProps> = ({
  selectedNetwork,
  onSelectNetwork,
  addressInput,
  onAddressInputChange,
  onTriggerScan,
  isScanning,
  scanStepIndex,
  scanError,
  recentReports,
  onOpenReport,
  demoMode,
  demoReports,
}) => {
  const [searchCandidates, setSearchCandidates] = useState<TokenSearchCandidate[]>([]);
  const [isSearchingName, setIsSearchingName] = useState(false);
  const [localValidationMsg, setLocalValidationMsg] = useState<string | null>(null);

  const activeNet = SUPPORTED_NETWORKS[selectedNetwork];

  // Detect if user typed a token name/symbol instead of a contract address
  const looksLikeAddress =
    addressInput.trim().startsWith('0x') || addressInput.trim().length >= 32;

  useEffect(() => {
    const trimmed = addressInput.trim();
    setLocalValidationMsg(null);

    if (!trimmed || looksLikeAddress || trimmed.length < 2) {
      setSearchCandidates([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingName(true);
      try {
        const res = await fetch(`/api/search-tokens?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchCandidates(data.candidates || []);
        }
      } catch {
        // ignore search error
      } finally {
        setIsSearchingName(false);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [addressInput, looksLikeAddress]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = addressInput.trim();
    if (!trimmed) {
      setLocalValidationMsg('Please paste a token contract address to scan.');
      return;
    }
    if (!looksLikeAddress) {
      setLocalValidationMsg(
        'Token symbols are not unique identifiers. Please select the exact contract address and network from the resolver list below, or paste a full contract address.'
      );
      return;
    }
    setLocalValidationMsg(null);
    onTriggerScan(selectedNetwork, trimmed, false);
  };

  return (
    <section className="relative rounded-2xl bg-gradient-to-br from-[#12132C] via-[#101126] to-[#17143A] border border-[#25274D] p-4 sm:p-6 lg:p-8 overflow-hidden shadow-xl">
      {/* Subtle Ambient Purple/Indigo Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#8B5CF6]/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-1/3 w-80 h-80 rounded-full bg-[#22D3EE]/10 blur-3xl"
      />

      <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 items-center">
        {/* Left 7 Columns: Scanner Input & Quick Controls */}
        <div className="xl:col-span-7 space-y-4 sm:space-y-5 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-[#A78BFA] font-medium">
            <span>Gemma 4 Grounded Security Intelligence</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#94A3B8]">
              Ethereum, BNB Chain, Base, Hyperliquid, Solana &amp; Multi-Chain
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#F8FAFC] leading-tight">
              Scan any token. Understand the risks.
            </h2>
            <p className="text-xs sm:text-base text-[#94A3B8] max-w-2xl leading-relaxed">
              Explore smart-contract permissions, trading restrictions, liquidity conditions, and
              security signals with AI-powered explanations.
            </p>
          </div>

          {/* Primary Scanner Form */}
          <form onSubmit={handleFormSubmit} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              {/* Network Selector */}
              <div className="w-full sm:w-52 shrink-0">
                <label htmlFor="hero-network-select" className="sr-only">
                  Blockchain Network
                </label>
                <select
                  id="hero-network-select"
                  value={selectedNetwork}
                  onChange={(e) => onSelectNetwork(e.target.value as NetworkId)}
                  disabled={isScanning}
                  className="w-full h-11 sm:h-12 px-3.5 rounded-xl bg-[#080817]/90 border border-[#2A2D5A] focus:border-[#8B5CF6] text-xs sm:text-sm font-medium text-[#F8FAFC] focus:outline-none transition-colors cursor-pointer"
                >
                  <optgroup label="MVP Priority Networks">
                    <option value="ethereum">Ethereum (ETH)</option>
                    <option value="bsc">BNB Chain (BSC)</option>
                    <option value="base">Base (BASE)</option>
                  </optgroup>
                  <optgroup label="Expansion Networks">
                    <option value="hyperliquid">Hyperliquid (HYPE)</option>
                    <option value="solana">Solana (SOL)</option>
                    <option value="arbitrum">Arbitrum (ARB)</option>
                    <option value="polygon">Polygon (POL)</option>
                  </optgroup>
                </select>
              </div>

              {/* Contract Address / Token Resolver Input */}
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => onAddressInputChange(e.target.value)}
                  disabled={isScanning}
                  placeholder={
                    selectedNetwork === 'hyperliquid'
                      ? 'Paste Hyperliquid CA / Spot ID (0x...) or search token'
                      : activeNet.isEvm
                        ? `Paste ${activeNet.shortName} contract address (0x...) or search token`
                        : 'Paste Solana token mint address (Base58) or search token'
                  }
                  aria-label="Token contract address or name search"
                  className="w-full h-11 sm:h-12 pl-10 pr-3.5 rounded-xl bg-[#080817]/90 border border-[#2A2D5A] focus:border-[#8B5CF6] text-xs sm:text-sm text-[#F8FAFC] placeholder-[#94A3B8] font-mono focus:outline-none transition-colors"
                />
              </div>

              {/* Scan Button */}
              <button
                type="submit"
                disabled={isScanning}
                className="w-full sm:w-auto h-11 sm:h-12 px-6 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] disabled:opacity-60 text-sm font-semibold text-white shadow-lg shadow-[#8B5CF6]/25 transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Scanning...</span>
                  </>
                ) : (
                  <>
                    <ScanSearch className="w-4 h-4" />
                    <span>Scan Token</span>
                  </>
                )}
              </button>
            </div>

            {/* Validation or Error Feedback */}
            {(localValidationMsg || scanError) && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#F8FAFC] flex items-start gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[#EF4444]">Validation Notice: </span>
                  <span>{localValidationMsg || scanError}</span>
                </div>
              </div>
            )}

            {/* Token Name Disambiguation Resolver Dropdown */}
            {!looksLikeAddress && addressInput.trim().length >= 2 && (
              <div className="rounded-xl bg-[#080817] border border-[#2A2D5A] p-3 space-y-2 shadow-2xl">
                <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                  <span>
                    Token symbols are shared by many contracts. Select the exact verified contract
                    address and network:
                  </span>
                  {isSearchingName && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8B5CF6]" />}
                </div>
                {searchCandidates.length === 0 && !isSearchingName ? (
                  <p className="text-xs text-[#94A3B8] py-2">
                    No matching DEX pairs found for &ldquo;{addressInput}&rdquo;. Paste a full
                    contract address directly.
                  </p>
                ) : (
                  <div className="max-h-56 overflow-y-auto divide-y divide-[#1E2040]">
                    {searchCandidates.map((cand) => {
                      const netCfg = SUPPORTED_NETWORKS[cand.networkId];
                      return (
                        <button
                          key={`${cand.networkId}:${cand.contractAddress}`}
                          type="button"
                          onClick={() => {
                            onSelectNetwork(cand.networkId);
                            onAddressInputChange(cand.contractAddress);
                            setSearchCandidates([]);
                            setLocalValidationMsg(null);
                            onTriggerScan(cand.networkId, cand.contractAddress, false);
                          }}
                          className="w-full py-2 px-2.5 hover:bg-[#15162D] flex items-center justify-between gap-3 text-left transition-colors rounded-lg"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs font-semibold text-[#F8FAFC]">
                              <span className="truncate">{cand.name}</span>
                              <span className="text-[#A78BFA] font-mono">({cand.symbol})</span>
                              <span className="text-[#94A3B8]">·</span>
                              <span className="text-[#22D3EE]">{netCfg.shortName}</span>
                            </div>
                            <div className="text-[11px] text-[#94A3B8] font-mono truncate">
                              {cand.contractAddress}
                            </div>
                          </div>
                          <div className="text-right shrink-0 font-mono text-xs">
                            <div className="text-[#F8FAFC]">{formatTokenPrice(cand.priceUsd)}</div>
                            <div className="text-[11px] text-[#94A3B8]">
                              Liq: {formatUsd(cand.liquidityUsd)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </form>

          {/* 10-Step Progress Bar when actively scanning */}
          {isScanning && (
            <div className="p-4 rounded-xl bg-[#080817]/90 border border-[#8B5CF6]/40 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#A78BFA] flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{SCAN_WORKFLOW_STEPS[scanStepIndex] || SCAN_WORKFLOW_STEPS[0]}</span>
                </span>
                <span className="font-mono text-[#94A3B8] tabular-nums">
                  Step {Math.min(10, scanStepIndex + 1)} / 10
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#15162D] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] transition-all duration-200"
                  style={{ width: `${Math.min(100, ((scanStepIndex + 1) / 10) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Quick Live Token Presets & Recent Scans */}
          <div className="pt-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[#94A3B8] font-medium">Live Quick-Scan:</span>
              {CURATED_QUICK_TOKENS.map((item) => (
                <button
                  key={`${item.networkId}:${item.address}`}
                  type="button"
                  disabled={isScanning}
                  onClick={() => {
                    onSelectNetwork(item.networkId);
                    onAddressInputChange(item.address);
                    onTriggerScan(item.networkId, item.address, false);
                  }}
                  title={`${item.label} (${item.note})`}
                  className="px-2.5 py-1 rounded-lg bg-[#15162D] hover:bg-[#1E2044] border border-[#25274D] hover:border-[#8B5CF6]/50 text-[#F8FAFC] transition-colors font-mono text-[11px] flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="font-semibold text-[#A78BFA]">{item.symbol}</span>
                  <span className="text-[#94A3B8]">
                    ({SUPPORTED_NETWORKS[item.networkId].shortName})
                  </span>
                </button>
              ))}
            </div>

            {/* Synthetic Demo Mode Quick Strip when Demo Mode is enabled */}
            {demoMode && demoReports.length > 0 && (
              <div className="p-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-[#F59E0B] font-medium">
                  <FlaskConical className="w-4 h-4 shrink-0" />
                  <span>Synthetic Demo Mode Active — Explore sample scenarios:</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {demoReports.map((dr) => (
                    <button
                      key={dr.scanId}
                      type="button"
                      onClick={() => onOpenReport(dr.scanId)}
                      className="px-2.5 py-1 rounded-lg bg-[#080817] hover:bg-[#15162D] border border-[#F59E0B]/40 text-xs text-[#F8FAFC] font-medium transition-colors cursor-pointer"
                    >
                      {dr.token.symbol}: {dr.riskOverview.classification}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Columns: Visual Architecture Diagram inspired by Reference Image */}
        <div className="xl:col-span-5 hidden sm:flex flex-col items-center justify-center">
          <div className="relative w-full max-w-md py-4 px-2">
            {/* Top Row Nodes */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                type="button"
                onClick={() => {
                  if (recentReports[0]) onOpenReport(recentReports[0].scanId);
                }}
                className="p-3.5 rounded-xl bg-[#15162D]/90 border border-[#2A2D5A] hover:border-[#8B5CF6]/60 text-left transition-all shadow-md"
              >
                <div className="text-xs font-semibold text-[#F8FAFC] mb-0.5">
                  Contract Permissions
                </div>
                <div className="text-[11px] text-[#94A3B8]">
                  Mint, Pause, Proxy &amp; Owner Checks
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (recentReports[0]) onOpenReport(recentReports[0].scanId);
                }}
                className="p-3.5 rounded-xl bg-[#15162D]/90 border border-[#2A2D5A] hover:border-[#8B5CF6]/60 text-left transition-all shadow-md"
              >
                <div className="text-xs font-semibold text-[#F8FAFC] mb-0.5">
                  Trading Simulation
                </div>
                <div className="text-[11px] text-[#94A3B8]">
                  Honeypot, Buy/Sell Taxes &amp; Limits
                </div>
              </button>
            </div>

            {/* Central Lens Hub with SVG Connector Lines */}
            <div className="relative flex items-center justify-center my-2">
              <svg
                className="w-full h-20 text-[#8B5CF6]/40"
                viewBox="0 0 360 80"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M75 0 V28 Q75 40 87 40 H155"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M285 0 V28 Q285 40 273 40 H205"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M75 80 V52 Q75 40 87 40 H155"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M285 80 V52 Q285 40 273 40 H205"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>

              <div className="absolute w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#4F46E5] p-0.5 shadow-2xl shadow-[#8B5CF6]/40 flex items-center justify-center">
                <div className="w-full h-full rounded-[14px] bg-[#0B0C1E] flex items-center justify-center">
                  <ScanSearch className="w-7 h-7 text-[#A78BFA]" />
                </div>
              </div>
            </div>

            {/* Bottom Row Nodes */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <button
                type="button"
                onClick={() => {
                  if (recentReports[0]) onOpenReport(recentReports[0].scanId);
                }}
                className="p-3.5 rounded-xl bg-[#15162D]/90 border border-[#2A2D5A] hover:border-[#22D3EE]/60 text-left transition-all shadow-md"
              >
                <div className="text-xs font-semibold text-[#F8FAFC] mb-0.5">
                  Liquidity &amp; Holders
                </div>
                <div className="text-[11px] text-[#94A3B8]">
                  DEX Pools, LP Locks &amp; Top Wallets
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (recentReports[0]) onOpenReport(recentReports[0].scanId);
                }}
                className="p-3.5 rounded-xl bg-[#15162D]/90 border border-[#2A2D5A] hover:border-[#22D3EE]/60 text-left transition-all shadow-md"
              >
                <div className="text-xs font-semibold text-[#F8FAFC] mb-0.5">
                  Gemma 4 AI Analyst
                </div>
                <div className="text-[11px] text-[#94A3B8]">
                  English, Simple &amp; Pidgin Reports
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// ANALYTICS CARDS (Real Platform Telemetry Only)
// ============================================================================

export const AnalyticsCards: React.FC<{
  stats: PlatformStats | null;
  loading: boolean;
}> = ({ stats, loading }) => {
  const cards = [
    {
      title: 'Total Scans Performed',
      value: stats ? stats.totalScansPerformed.toLocaleString('en-US') : '0',
      subtitle:
        stats && stats.totalScansPerformed > 0
          ? `Last scan ${formatRelativeTime(stats.lastScanTimestamp)}`
          : 'No scans recorded yet',
      icon: Activity,
      accent: 'from-[#8B5CF6]/20 to-transparent',
      iconColor: 'text-[#A78BFA]',
    },
    {
      title: 'Tokens With Risk Indicators',
      value: stats ? stats.tokensWithRiskIndicators.toLocaleString('en-US') : '0',
      subtitle: 'Unique contracts with Moderate/High/Critical flags',
      icon: AlertTriangle,
      accent: 'from-[#F59E0B]/20 to-transparent',
      iconColor: 'text-[#F59E0B]',
    },
    {
      title: 'Critical & High Findings Identified',
      value: stats ? stats.criticalFindingsIdentified.toLocaleString('en-US') : '0',
      subtitle: 'Evidence-backed high-severity security signals',
      icon: ShieldAlert,
      accent: 'from-[#EF4444]/20 to-transparent',
      iconColor: 'text-[#EF4444]',
    },
    {
      title: 'Supported Networks',
      value: stats
        ? `${stats.mvpNetworksCount} MVP / ${stats.supportedNetworksCount} Total`
        : '3 MVP / 7 Total',
      subtitle: 'ETH, BSC, Base + Hyperliquid, SOL, ARB, POL',
      icon: Layers,
      accent: 'from-[#22D3EE]/20 to-transparent',
      iconColor: 'text-[#22D3EE]',
    },
  ];

  return (
    <section
      aria-label="Platform Security Metrics"
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="relative rounded-2xl bg-[#15162D] border border-[#23254A] p-5 overflow-hidden flex flex-col justify-between"
          >
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t ${card.accent}`}
            />
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#101126] border border-[#25274D] flex items-center justify-center">
                <Icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <span className="text-[11px] text-[#94A3B8] font-mono">Verified Record</span>
            </div>

            <div className="relative z-10">
              <div className="text-xs font-medium text-[#94A3B8] mb-1">{card.title}</div>
              {loading ? (
                <div className="h-8 w-24 rounded-lg bg-[#1E2040] animate-pulse my-1" />
              ) : (
                <div className="text-2xl font-bold text-[#F8FAFC] font-mono tabular-nums tracking-tight">
                  {card.value}
                </div>
              )}
              <div className="text-[11px] text-[#94A3B8] mt-1 truncate">{card.subtitle}</div>
            </div>
          </div>
        );
      })}
    </section>
  );
};

// ============================================================================
// TOKEN EXPLORER TABLE (Sortable, Filterable, Paginated, Mobile-Adaptive)
// ============================================================================

interface TokenExplorerTableProps {
  reports: TokenScanReport[];
  loading: boolean;
  onOpenReport: (scanId: string) => void;
  onRescan: (networkId: NetworkId, contractAddress: string) => void;
  bookmarkedAddresses: string[];
  onToggleBookmark: (networkId: NetworkId, contractAddress: string) => void;
}

type SortField = 'scannedAt' | 'price' | 'marketCap' | 'liquidity' | 'volume' | 'coverage';

export const TokenExplorerTable: React.FC<TokenExplorerTableProps> = ({
  reports,
  loading,
  onOpenReport,
  onRescan,
  bookmarkedAddresses,
  onToggleBookmark,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [networkFilter, setNetworkFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<'all' | 'flagged' | 'low'>('all');
  const [sortField, setSortField] = useState<SortField>('scannedAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filtered = reports.filter((r) => {
    if (networkFilter !== 'all' && r.token.networkId !== networkFilter) return false;
    if (riskFilter === 'flagged') {
      if (
        r.riskOverview.criticalCount === 0 &&
        r.riskOverview.highCount === 0 &&
        r.riskOverview.moderateCount === 0
      ) {
        return false;
      }
    }
    if (riskFilter === 'low' && r.riskOverview.classification !== 'Low Observed Risk') {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = r.token.name.toLowerCase().includes(q);
      const matchSymbol = r.token.symbol.toLowerCase().includes(q);
      const matchAddr = r.token.contractAddress.toLowerCase().includes(q);
      if (!matchName && !matchSymbol && !matchAddr) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let valA = 0;
    let valB = 0;
    switch (sortField) {
      case 'price':
        valA = a.market.priceUsd ?? -1;
        valB = b.market.priceUsd ?? -1;
        break;
      case 'marketCap':
        valA = a.market.marketCapUsd ?? -1;
        valB = b.market.marketCapUsd ?? -1;
        break;
      case 'liquidity':
        valA = a.market.liquidityUsd ?? -1;
        valB = b.market.liquidityUsd ?? -1;
        break;
      case 'volume':
        valA = a.market.volume24hUsd ?? -1;
        valB = b.market.volume24hUsd ?? -1;
        break;
      case 'coverage':
        valA = a.riskOverview.dataCoveragePercent;
        valB = b.riskOverview.dataCoveragePercent;
        break;
      case 'scannedAt':
      default:
        valA = new Date(a.scannedAt).getTime();
        valB = new Date(b.scannedAt).getTime();
        break;
    }
    return sortAsc ? valA - valB : valB - valA;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <section className="rounded-2xl bg-[#15162D] border border-[#23254A] overflow-hidden">
      {/* Toolbar: Filter Tabs + Search + Network Filter */}
      <div className="p-3.5 sm:p-5 border-b border-[#23254A] flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-1 p-1 bg-[#0B0C1E] rounded-xl border border-[#1E2040] overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setRiskFilter('all');
              setPage(1);
            }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              riskFilter === 'all'
                ? 'bg-[#8B5CF6] text-white'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            All Scanned ({reports.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setRiskFilter('flagged');
              setPage(1);
            }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              riskFilter === 'flagged'
                ? 'bg-[#8B5CF6] text-white'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            Risk Indicators
          </button>
          <button
            type="button"
            onClick={() => {
              setRiskFilter('low');
              setPage(1);
            }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              riskFilter === 'low'
                ? 'bg-[#8B5CF6] text-white'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            Low Risk
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by name, symbol, or 0x..."
              aria-label="Filter token explorer table"
              className="w-full pl-9 pr-3 py-2 sm:py-1.5 rounded-xl bg-[#0B0C1E] border border-[#23254A] focus:border-[#8B5CF6] text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none"
            />
          </div>

          <select
            value={networkFilter}
            onChange={(e) => {
              setNetworkFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by blockchain network"
            className="px-3 py-2 sm:py-1.5 rounded-xl bg-[#0B0C1E] border border-[#23254A] text-xs text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6] cursor-pointer"
          >
            <option value="all">All Networks</option>
            <option value="ethereum">Ethereum</option>
            <option value="bsc">BNB Chain</option>
            <option value="base">Base</option>
            <option value="hyperliquid">Hyperliquid</option>
            <option value="solana">Solana</option>
            <option value="arbitrum">Arbitrum</option>
            <option value="polygon">Polygon</option>
          </select>
        </div>
      </div>

      {/* Desktop Data Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#23254A] bg-[#101126] text-[11px] font-semibold text-[#94A3B8]">
              <th className="py-3.5 px-4">Token Name &amp; Contract</th>
              <th className="py-3.5 px-3">Symbol</th>
              <th className="py-3.5 px-3">Blockchain</th>
              <th className="py-3.5 px-3 text-right">
                <button
                  type="button"
                  onClick={() => toggleSort('price')}
                  className="inline-flex items-center gap-1 hover:text-[#F8FAFC]"
                >
                  <span>Current Price</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3.5 px-3 text-right">
                <button
                  type="button"
                  onClick={() => toggleSort('marketCap')}
                  className="inline-flex items-center gap-1 hover:text-[#F8FAFC]"
                >
                  <span>Market Cap</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3.5 px-3 text-right">
                <button
                  type="button"
                  onClick={() => toggleSort('liquidity')}
                  className="inline-flex items-center gap-1 hover:text-[#F8FAFC]"
                >
                  <span>Liquidity</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3.5 px-3 text-right">
                <button
                  type="button"
                  onClick={() => toggleSort('volume')}
                  className="inline-flex items-center gap-1 hover:text-[#F8FAFC]"
                >
                  <span>24h Volume</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3.5 px-3">Risk Classification</th>
              <th className="py-3.5 px-3">Scan Status &amp; Coverage</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2040] text-xs">
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td colSpan={10} className="py-4 px-4">
                    <div className="h-6 bg-[#1E2040] rounded-lg w-full" />
                  </td>
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 px-4 text-center text-[#94A3B8]">
                  No scanned tokens match your current filter. Paste a contract address above to run
                  a live scan.
                </td>
              </tr>
            ) : (
              paginated.map((report) => {
                const netCfg = SUPPORTED_NETWORKS[report.token.networkId];
                const classStyle = getClassificationStyles(report.riskOverview.classification);
                const bookmarkKey = `${report.token.networkId}:${report.token.contractAddress.toLowerCase()}`;
                const isBookmarked = bookmarkedAddresses.includes(bookmarkKey);

                return (
                  <tr
                    key={report.scanId}
                    onClick={() => onOpenReport(report.scanId)}
                    className="hover:bg-[#1A1C3A]/70 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8B5CF6]/30 to-[#22D3EE]/30 border border-[#2A2D5A] flex items-center justify-center font-bold text-xs text-[#F8FAFC] shrink-0 overflow-hidden">
                          {report.token.logoUrl ? (
                            <img
                              src={report.token.logoUrl}
                              alt={report.token.symbol}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            report.token.symbol.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-[#F8FAFC] group-hover:text-[#A78BFA] transition-colors flex items-center gap-1.5">
                            <span className="truncate max-w-[180px]">{report.token.name}</span>
                            {report.isDemo && (
                              <span className="text-[10px] font-mono text-[#F59E0B]">
                                [DEMO]
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#94A3B8] font-mono">
                            {shortenAddress(report.token.contractAddress)}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 font-mono font-medium text-[#F8FAFC]">
                      {report.token.symbol}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="font-medium text-[#F8FAFC]">{netCfg.shortName}</span>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#F8FAFC]">
                      {formatTokenPrice(report.market.priceUsd)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#94A3B8]">
                      {formatUsd(report.market.marketCapUsd)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#F8FAFC]">
                      {formatUsd(report.market.liquidityUsd)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#94A3B8]">
                      {formatUsd(report.market.volume24hUsd)}
                    </td>

                    <td className="py-3.5 px-3">
                      <div className={`inline-flex items-center gap-1.5 font-medium ${classStyle.text}`}>
                        {report.riskOverview.classification === 'Critical Risk Indicators' ||
                        report.riskOverview.classification === 'High Risk Signals' ? (
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        ) : report.riskOverview.classification === 'Moderate Risk Signals' ? (
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        ) : report.riskOverview.classification === 'Low Observed Risk' ? (
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span className="whitespace-nowrap">{classStyle.shortLabel}</span>
                      </div>
                      <div className="text-[11px] text-[#94A3B8] mt-0.5 font-mono tabular-nums">
                        {report.riskOverview.criticalCount} Crit · {report.riskOverview.highCount} High ·{' '}
                        {report.riskOverview.moderateCount} Mod
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5 text-[#F8FAFC] font-mono tabular-nums">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                        <span>{report.riskOverview.dataCoveragePercent}% Coverage</span>
                      </div>
                      <div className="text-[11px] text-[#94A3B8]">
                        {formatRelativeTime(report.scannedAt)}
                      </div>
                    </td>

                    <td
                      className="py-3.5 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onToggleBookmark(report.token.networkId, report.token.contractAddress)
                          }
                          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark token'}
                          title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Token'}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isBookmarked
                              ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-[#A78BFA]'
                              : 'bg-[#0B0C1E] border-[#23254A] text-[#94A3B8] hover:text-[#F8FAFC]'
                          }`}
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>
                        {!report.isDemo && (
                          <button
                            type="button"
                            onClick={() =>
                              onRescan(report.token.networkId, report.token.contractAddress)
                            }
                            aria-label="Rescan token"
                            title="Force Live Rescan"
                            className="p-1.5 rounded-lg bg-[#0B0C1E] border border-[#23254A] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenReport(report.scanId)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#8B5CF6]/15 hover:bg-[#8B5CF6] text-[#A78BFA] hover:text-white font-medium transition-colors inline-flex items-center gap-1 whitespace-nowrap"
                        >
                          <span>Report</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Card Layout */}
      <div className="md:hidden divide-y divide-[#1E2040]">
        {paginated.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#94A3B8]">
            No scanned tokens match your filter.
          </div>
        ) : (
          paginated.map((report) => {
            const netCfg = SUPPORTED_NETWORKS[report.token.networkId];
            const classStyle = getClassificationStyles(report.riskOverview.classification);
            return (
              <div
                key={report.scanId}
                onClick={() => onOpenReport(report.scanId)}
                className="p-4 space-y-3 hover:bg-[#1A1C3A]/60 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-[#F8FAFC] truncate">
                      {report.token.name}{' '}
                      <span className="text-[#A78BFA] font-mono">({report.token.symbol})</span>
                    </div>
                    <div className="text-[11px] text-[#94A3B8] font-mono mt-0.5">
                      <span className="text-[#22D3EE]">{netCfg.shortName}</span> ·{' '}
                      {shortenAddress(report.token.contractAddress)}
                    </div>
                  </div>
                  <div className={`text-xs font-semibold shrink-0 ${classStyle.text}`}>
                    {classStyle.shortLabel}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono tabular-nums bg-[#0B0C1E] p-2.5 rounded-xl border border-[#1E2040]">
                  <div>
                    <div className="text-[10px] text-[#94A3B8]">Price</div>
                    <div className="text-[#F8FAFC] font-bold">
                      {formatTokenPrice(report.market.priceUsd)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#94A3B8]">Market Cap (MC)</div>
                    <div className="text-[#F8FAFC] font-bold">
                      {formatUsd(report.market.marketCapUsd ?? report.market.fdvUsd)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#94A3B8]">DEX Liquidity</div>
                    <div className="text-[#22D3EE] font-bold">
                      {formatUsd(report.market.liquidityUsd)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#94A3B8]">Buy / Sell Tax</div>
                    <div className="text-[#F8FAFC]">
                      {report.trading.buyTaxPercent !== null ? `${report.trading.buyTaxPercent}%` : '-'} /{' '}
                      {report.trading.sellTaxPercent !== null ? `${report.trading.sellTaxPercent}%` : '-'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#94A3B8] pt-0.5">
                  <span>
                    {report.riskOverview.criticalCount} Crit · {report.riskOverview.highCount} High ·{' '}
                    {report.riskOverview.dataCoveragePercent}% Coverage
                  </span>
                  <span className="text-[#A78BFA] font-semibold inline-flex items-center gap-0.5">
                    <span>Open Report</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Attribution & Pagination */}
      <div className="px-5 py-3.5 bg-[#101126] border-t border-[#23254A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#94A3B8]">
        <div>
          Data attributed to{' '}
          <span className="text-[#F8FAFC] font-medium">On-Chain RPC (viem)</span>,{' '}
          <span className="text-[#F8FAFC] font-medium">GoPlus Security</span>,{' '}
          <span className="text-[#F8FAFC] font-medium">Honeypot.is</span> &amp;{' '}
          <span className="text-[#F8FAFC] font-medium">DEX Screener</span>.
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-lg bg-[#15162D] border border-[#25274D] disabled:opacity-40 text-[#F8FAFC]"
            >
              Previous
            </button>
            <span className="font-mono tabular-nums">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-lg bg-[#15162D] border border-[#25274D] disabled:opacity-40 text-[#F8FAFC]"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
