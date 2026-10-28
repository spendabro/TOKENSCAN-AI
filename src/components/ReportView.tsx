import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Copy,
  Check,
  ExternalLink,
  Bookmark,
  RefreshCw,
  Share2,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Lock,
  Unlock,
  Users,
  Coins,
  Code2,
  Scale,
  ArrowLeft,
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
  SecurityFinding,
} from '../types/tokenlens.ts';
import {
  formatUsd,
  formatTokenPrice,
  shortenAddress,
  getSeverityStyles,
  getClassificationStyles,
} from '../utils/formatters.ts';
import { XShareCardStudio } from './XShareCardStudio.tsx';

interface ReportViewProps {
  report: TokenScanReport;
  onBackToDashboard: () => void;
  onRescan: (networkId: NetworkId, contractAddress: string) => void;
  isScanning: boolean;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
}

export const ReportView: React.FC<ReportViewProps> = ({
  report,
  onBackToDashboard,
  onRescan,
  isScanning,
  isBookmarked,
  onToggleBookmark,
}) => {
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [summaryLang, setSummaryLang] = useState<'standard' | 'simple' | 'pidgin'>('standard');
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    report.findings.forEach((f, idx) => {
      if (f.severity === 'Critical' || f.severity === 'High' || idx === 0) {
        initial[f.id] = true;
      }
    });
    return initial;
  });

  // Gemma 4 Q&A Analyst State
  const [qaInput, setQaInput] = useState('');
  const [qaLang, setQaLang] = useState<'standard' | 'simple' | 'pidgin'>('standard');
  const [qaLoading, setQaLoading] = useState(false);
  const [qaHistory, setQaHistory] = useState<
    {
      question: string;
      answer: string;
      citedEvidenceIds: string[];
      modelUsed: string;
    }[]
  >([]);

  const netCfg = SUPPORTED_NETWORKS[report.token.networkId];
  const classStyle = getClassificationStyles(report.riskOverview.classification);

  const explorerAddressUrl = netCfg.isEvm
    ? `${netCfg.explorerUrl}/address/${report.token.contractAddress}`
    : `${netCfg.explorerUrl}/token/${report.token.contractAddress}`;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(report.token.contractAddress);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  const handleShareReport = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('report', report.scanId);
    navigator.clipboard.writeText(url.toString());
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const toggleFindingExpand = (id: string) => {
    setExpandedFindings((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const scrollToFinding = (evidenceId: string) => {
    setExpandedFindings((prev) => ({ ...prev, [evidenceId]: true }));
    const el = document.getElementById(`finding-card-${evidenceId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleAskQuestion = async (questionText: string, overrideLang?: 'standard' | 'simple' | 'pidgin') => {
    const trimmed = questionText.trim();
    if (!trimmed || qaLoading) return;

    const targetLang = overrideLang || qaLang;
    setQaLoading(true);
    setQaInput('');

    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(report.scanId)}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          languageMode: targetLang,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setQaHistory((prev) => [
          ...prev,
          {
            question: trimmed,
            answer: data.answer,
            citedEvidenceIds: data.citedEvidenceIds || [],
            modelUsed: data.modelUsed || 'gemma-4-31b-it',
          },
        ]);
      }
    } catch {
      setQaHistory((prev) => [
        ...prev,
        {
          question: trimmed,
          answer:
            'Could not reach the Gemma 4 analyst endpoint right now. Please review the deterministic evidence cards above.',
          citedEvidenceIds: [],
          modelUsed: 'offline',
        },
      ]);
    } finally {
      setQaLoading(false);
    }
  };

  // Permission Matrix Items
  const permissionItems: {
    label: string;
    value: boolean | null;
    riskWhenTrue: boolean;
    trueLabel: string;
    falseLabel: string;
    tooltip: string;
  }[] = [
    {
      label: 'Source Code Verified',
      value: report.permissions.isOpenSource,
      riskWhenTrue: false,
      trueLabel: 'Verified Public Code',
      falseLabel: 'Unverified Bytecode',
      tooltip: 'Whether human-readable contract code is published on the blockchain explorer.',
    },
    {
      label: 'Ownership Renounced',
      value: report.permissions.isOwnershipRenounced,
      riskWhenTrue: false,
      trueLabel: 'Renounced (Zero/Burn)',
      falseLabel: 'Active Owner Present',
      tooltip: 'Whether standard Ownable admin privileges have been relinquished.',
    },
    {
      label: 'Minting Capability',
      value: report.permissions.isMintable,
      riskWhenTrue: true,
      trueLabel: 'Mint Authority Present',
      falseLabel: 'No Mint Function Detected',
      tooltip: 'Whether authorized accounts can create new tokens and dilute holders.',
    },
    {
      label: 'Proxy / Upgradeable',
      value: report.permissions.isProxy,
      riskWhenTrue: true,
      trueLabel: 'Upgradeable Proxy',
      falseLabel: 'Immutable Contract',
      tooltip: 'Whether the underlying contract logic can be replaced by an admin.',
    },
    {
      label: 'Address Blacklist',
      value: report.permissions.hasBlacklist,
      riskWhenTrue: true,
      trueLabel: 'Blacklist Present',
      falseLabel: 'No Blacklist Detected',
      tooltip: 'Whether specific wallet addresses can be blocked from transferring tokens.',
    },
    {
      label: 'Global Transfer Pause',
      value: report.permissions.isTransferPausable,
      riskWhenTrue: true,
      trueLabel: 'Pausable Transfers',
      falseLabel: 'Not Pausable',
      tooltip: 'Whether an admin can pause all token trading and transfers globally.',
    },
    {
      label: 'Modifiable Tax Rates',
      value: report.permissions.canModifyTax,
      riskWhenTrue: true,
      trueLabel: 'Taxes Modifiable',
      falseLabel: 'Fixed Tax Rules',
      tooltip: 'Whether buy/sell fee percentages can be changed by an admin after launch.',
    },
    {
      label: 'Ownership Reclaimable',
      value: report.permissions.canTakeBackOwnership,
      riskWhenTrue: true,
      trueLabel: 'Can Reclaim Ownership',
      falseLabel: 'No Reclaim Hook',
      tooltip: 'Whether ownership can be secretly reclaimed after renouncement.',
    },
  ];

  // Prepare Pool Liquidity Chart Data
  const poolChartData = report.market.pools.slice(0, 5).map((p, idx) => ({
    name: `${p.baseTokenSymbol}/${p.quoteTokenSymbol} (${p.dexId.slice(0, 10)}) #${idx + 1}`,
    liquidityUsd: p.liquidityUsd,
    volume24hUsd: p.volume24hUsd,
  }));

  // Prepare Holder Distribution Chart Data
  const holderChartData = [
    {
      name: 'Top 10 Non-Pool Wallets',
      percent: report.holders.top10InvestorPercent ?? 0,
      color: '#8B5CF6',
    },
    {
      name: 'Burn / Dead Addresses',
      percent: report.holders.burnPercent ?? 0,
      color: '#22C55E',
    },
    {
      name: 'Creator / Deployer',
      percent: report.holders.creatorPercent ?? 0,
      color: '#F59E0B',
    },
    {
      name: 'Remaining Circulating / Pools',
      percent: Math.max(
        0,
        Number(
          (
            100 -
            (report.holders.top10InvestorPercent ?? 0) -
            (report.holders.burnPercent ?? 0)
          ).toFixed(2)
        )
      ),
      color: '#22D3EE',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Back Button & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Back to Scanner &amp; Explorer</span>
        </button>

        <div className="text-[11px] sm:text-xs text-[#94A3B8] font-mono truncate max-w-full">
          Report ID: <span className="text-[#F8FAFC]">{report.scanId}</span>
        </div>
      </div>

      {/* SYNTHETIC DEMO MODE WARNING BANNER */}
      {report.isDemo && (
        <div
          role="region"
          aria-label="Synthetic Demo Report Notice"
          className="p-4 rounded-2xl bg-[#F59E0B]/15 border border-[#F59E0B]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <FlaskConical className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-[#F59E0B]">
                SYNTHETIC DEMO MODE REPORT — {report.demoScenarioLabel}
              </div>
              <p className="text-xs text-[#F8FAFC]/90 mt-0.5">
                This report contains synthetic sample data designed to demonstrate how TokenLens AI
                handles high-risk permissions, low-risk contracts, and incomplete provider telemetry.
                It is not a live blockchain scan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="px-3.5 py-2 rounded-xl bg-[#080817] hover:bg-[#15162D] border border-[#F59E0B]/40 text-xs font-semibold text-[#F59E0B] whitespace-nowrap shrink-0"
          >
            Scan a Live Token
          </button>
        </div>
      )}

      {/* 1. REPORT HEADER */}
      <section className="rounded-2xl bg-[#15162D] border border-[#25274D] p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
          <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#8B5CF6]/30 to-[#22D3EE]/30 border border-[#2A2D5A] flex items-center justify-center font-bold text-base sm:text-lg text-[#F8FAFC] shrink-0 overflow-hidden">
              {report.token.logoUrl ? (
                <img
                  src={report.token.logoUrl}
                  alt={report.token.symbol}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                report.token.symbol.slice(0, 3).toUpperCase()
              )}
            </div>

            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-2xl font-bold text-[#F8FAFC] break-words">
                  {report.token.name}
                </h2>
                <span className="text-xs sm:text-sm font-mono font-semibold text-[#A78BFA]">
                  ({report.token.symbol})
                </span>
                <span className="text-[#94A3B8]">·</span>
                <span className="text-xs font-semibold text-[#22D3EE]">{netCfg.name}</span>
              </div>

              {/* Contract Address Bar */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#94A3B8]">
                <span className="font-mono text-[11px] sm:text-xs text-[#F8FAFC] bg-[#0B0C1E] px-2.5 py-1 rounded-lg border border-[#1E2040] break-all">
                  {report.token.contractAddress}
                </span>

                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0B0C1E] hover:bg-[#1E2040] border border-[#25274D] text-[#F8FAFC] transition-colors cursor-pointer"
                >
                  {copiedAddr ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                      <span className="text-[#22C55E]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                {!report.isDemo && (
                  <a
                    href={explorerAddressUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0B0C1E] hover:bg-[#1E2040] border border-[#25274D] text-[#F8FAFC] transition-colors"
                  >
                    <span>{netCfg.explorerName}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </a>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-[#94A3B8] pt-0.5">
                <span>
                  Scanned:{' '}
                  <strong className="text-[#F8FAFC] font-mono">
                    {new Date(report.scannedAt).toLocaleString()}
                  </strong>
                </span>
                <span>·</span>
                <span>
                  Decimals:{' '}
                  <strong className="text-[#F8FAFC] font-mono">
                    {report.token.decimals ?? 'N/A'}
                  </strong>
                </span>
                {report.token.totalSupplyFormatted && (
                  <>
                    <span>·</span>
                    <span>
                      Supply:{' '}
                      <strong className="text-[#F8FAFC] font-mono">
                        {report.token.totalSupplyFormatted}
                      </strong>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Header Actions: Bookmark, Post on X, Copy Link, Rescan */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 shrink-0 w-full lg:w-auto">
            <button
              type="button"
              onClick={onToggleBookmark}
              className={`px-3 py-2 rounded-xl border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                isBookmarked
                  ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-[#F8FAFC]'
                  : 'bg-[#0B0C1E] border-[#25274D] text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              <Bookmark className="w-4 h-4 shrink-0" />
              <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('x-share-card-studio');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="px-3 py-2 rounded-xl bg-[#0B0C1E] hover:bg-[#1E2040] border border-[#22D3EE]/50 text-xs font-semibold text-[#22D3EE] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-[#22D3EE] shrink-0" />
              <span>Post on X</span>
            </button>

            <button
              type="button"
              onClick={handleShareReport}
              className="px-3 py-2 rounded-xl bg-[#0B0C1E] hover:bg-[#1E2040] border border-[#25274D] text-xs font-medium text-[#F8FAFC] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedShare ? (
                <>
                  <Check className="w-4 h-4 text-[#22C55E] shrink-0" />
                  <span className="text-[#22C55E]">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#94A3B8] shrink-0" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            {!report.isDemo && (
              <button
                type="button"
                disabled={isScanning}
                onClick={() => onRescan(report.token.networkId, report.token.contractAddress)}
                className="px-3.5 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 shrink-0 ${isScanning ? 'animate-spin' : ''}`} />
                <span>Rescan Live</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. RISK OVERVIEW & SEPARATE INDICATORS (Observed Risk, Data Coverage, Report Freshness) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Indicator 1: Observed Risk Classification */}
        <div className="lg:col-span-5 rounded-2xl bg-[#15162D] border border-[#25274D] p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-[#94A3B8] mb-1">
                1. Observed Risk Classification
              </div>
              <div className={`text-xl font-bold flex items-center gap-2 ${classStyle.text}`}>
                {report.riskOverview.classification === 'Critical Risk Indicators' ||
                report.riskOverview.classification === 'High Risk Signals' ? (
                  <ShieldAlert className="w-6 h-6 shrink-0" />
                ) : report.riskOverview.classification === 'Moderate Risk Signals' ? (
                  <AlertTriangle className="w-6 h-6 shrink-0" />
                ) : report.riskOverview.classification === 'Low Observed Risk' ? (
                  <ShieldCheck className="w-6 h-6 shrink-0" />
                ) : (
                  <HelpCircle className="w-6 h-6 shrink-0" />
                )}
                <span>{report.riskOverview.classification}</span>
              </div>
            </div>

            {report.riskOverview.riskIndexScore !== null && (
              <div className="text-right font-mono tabular-nums">
                <div className="text-[11px] text-[#94A3B8]">Risk Index</div>
                <div className={`text-xl font-bold ${classStyle.text}`}>
                  {report.riskOverview.riskIndexScore}/100
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#23254A] text-center font-mono tabular-nums">
            <div className="p-2 rounded-xl bg-[#0B0C1E]">
              <div className="text-base font-bold text-[#EF4444]">
                {report.riskOverview.criticalCount}
              </div>
              <div className="text-[10px] text-[#94A3B8]">Critical</div>
            </div>
            <div className="p-2 rounded-xl bg-[#0B0C1E]">
              <div className="text-base font-bold text-[#F97316]">
                {report.riskOverview.highCount}
              </div>
              <div className="text-[10px] text-[#94A3B8]">High</div>
            </div>
            <div className="p-2 rounded-xl bg-[#0B0C1E]">
              <div className="text-base font-bold text-[#F59E0B]">
                {report.riskOverview.moderateCount}
              </div>
              <div className="text-[10px] text-[#94A3B8]">Warnings</div>
            </div>
            <div className="p-2 rounded-xl bg-[#0B0C1E]">
              <div className="text-base font-bold text-[#22C55E]">
                {report.riskOverview.lowOrInfoCount}
              </div>
              <div className="text-[10px] text-[#94A3B8]">Low/Info</div>
            </div>
          </div>

          <p className="text-[11px] text-[#94A3B8] leading-relaxed">
            {report.riskOverview.methodologyNote}
          </p>
        </div>

        {/* Indicator 2: Data Coverage & Check Completeness */}
        <div className="lg:col-span-4 rounded-2xl bg-[#15162D] border border-[#25274D] p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[#94A3B8]">
                2. Telemetry Data Coverage
              </span>
              <span className="text-lg font-bold font-mono tabular-nums text-[#22D3EE]">
                {report.riskOverview.dataCoveragePercent}%
              </span>
            </div>
            <div className="w-full h-2 bg-[#0B0C1E] rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE]"
                style={{ width: `${report.riskOverview.dataCoveragePercent}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 font-mono text-xs tabular-nums">
              <div className="p-2.5 rounded-xl bg-[#0B0C1E] border border-[#1E2040]">
                <div className="text-[#22C55E] font-bold text-sm">
                  {report.riskOverview.completedChecks} Checks
                </div>
                <div className="text-[11px] text-[#94A3B8]">Completed &amp; Verified</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0B0C1E] border border-[#1E2040]">
                <div className="text-[#94A3B8] font-bold text-sm">
                  {report.riskOverview.unavailableChecks} Checks
                </div>
                <div className="text-[11px] text-[#94A3B8]">Unavailable / Unknown</div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[#23254A]">
            <div className="text-[11px] font-medium text-[#94A3B8]">Category Coverage Weights:</div>
            {report.riskOverview.categoryBreakdown.map((cb) => {
              const sevStyle = getSeverityStyles(cb.riskLevel);
              return (
                <div key={cb.category} className="flex items-center justify-between text-xs">
                  <span className="text-[#F8FAFC] truncate">{cb.category}</span>
                  <span className={`font-mono text-[11px] ${sevStyle.text}`}>
                    {cb.riskLevel} ({cb.completedChecks}/{cb.totalChecks})
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Indicator 3: Report Freshness & Provider Provenance */}
        <div className="lg:col-span-3 rounded-2xl bg-[#15162D] border border-[#25274D] p-5 flex flex-col justify-between space-y-3">
          <div>
            <div className="text-xs font-medium text-[#94A3B8] mb-2">
              3. Provider Provenance &amp; Freshness
            </div>
            <div className="space-y-2">
              {report.providers.map((prov) => (
                <div
                  key={prov.provider}
                  className="p-2.5 rounded-xl bg-[#0B0C1E] border border-[#1E2040] text-xs"
                >
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-[#F8FAFC]">{prov.provider}</span>
                    <span
                      className={`font-mono text-[11px] ${
                        prov.status === 'success'
                          ? 'text-[#22C55E]'
                          : prov.status === 'unsupported'
                            ? 'text-[#F59E0B]'
                            : 'text-[#94A3B8]'
                      }`}
                    >
                      {prov.status === 'success'
                        ? 'Active'
                        : prov.status === 'unsupported'
                          ? 'Not Supported'
                          : 'Unavailable'}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#94A3B8] mt-0.5 line-clamp-2" title={prov.note}>
                    {prov.note}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-[#94A3B8] font-mono pt-1 border-t border-[#23254A]">
            Scan latency: {report.durationMs}ms
          </div>
        </div>
      </section>

      {/* X (TWITTER) SHAREABLE SCAN RESULT CARD & POST STUDIO */}
      <XShareCardStudio report={report} />

      {/* 3. GEMMA 4 AI SECURITY SUMMARY SECTION */}
      <section className="rounded-2xl bg-gradient-to-br from-[#161735] to-[#121329] border border-[#8B5CF6]/40 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#25274D] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#A78BFA]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#F8FAFC]">
                Gemma 4 Grounded Security Intelligence Summary
              </h3>
              <div className="text-xs text-[#94A3B8] font-mono">
                Model: {report.aiAnalysis.modelUsed} · Strictly grounded in {report.findings.length} evidence items
              </div>
            </div>
          </div>

          {/* Language Mode Switcher (Standard English, Simple English, Nigerian Pidgin) */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0B0C1E] border border-[#25274D] self-start">
            <button
              type="button"
              onClick={() => setSummaryLang('standard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                summaryLang === 'standard'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Analyst English
            </button>
            <button
              type="button"
              onClick={() => setSummaryLang('simple')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                summaryLang === 'simple'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Simple English
            </button>
            <button
              type="button"
              onClick={() => setSummaryLang('pidgin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                summaryLang === 'pidgin'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Nigerian Pidgin
            </button>
          </div>
        </div>

        {/* Summary Text Output */}
        <div className="p-4 rounded-xl bg-[#0B0C1E]/90 border border-[#23254A] space-y-2">
          <div className="text-xs font-semibold text-[#A78BFA]">
            {summaryLang === 'standard'
              ? 'Executive Security Assessment'
              : summaryLang === 'simple'
                ? 'Beginner-Friendly Plain English Explanation'
                : 'Nigerian Pidgin Security Breakdown'}
          </div>
          <p className="text-sm text-[#F8FAFC] leading-relaxed">
            {summaryLang === 'standard'
              ? report.aiAnalysis.executiveSummary
              : summaryLang === 'simple'
                ? report.aiAnalysis.simpleEnglishSummary
                : report.aiAnalysis.pidginSummary}
          </p>
          {summaryLang === 'standard' && (
            <p className="text-xs text-[#94A3B8] pt-1 leading-relaxed">
              {report.aiAnalysis.overallAssessment}
            </p>
          )}
        </div>

        {/* Grounded Key Findings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {report.aiAnalysis.keyFindings.map((kf, idx) => {
            const sevStyle = getSeverityStyles(kf.severity);
            return (
              <div
                key={`${kf.evidenceId}-${idx}`}
                className="p-3.5 rounded-xl bg-[#0B0C1E]/80 border border-[#23254A] flex flex-col justify-between gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-[#F8FAFC]">{kf.title}</span>
                  <button
                    type="button"
                    onClick={() => scrollToFinding(kf.evidenceId)}
                    className="text-[11px] font-mono text-[#22D3EE] hover:underline shrink-0 cursor-pointer"
                    title="Jump to deterministic evidence record"
                  >
                    [{kf.evidenceId}]
                  </button>
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">{kf.explanation}</p>
                <div className={`text-[11px] font-mono font-semibold ${sevStyle.text}`}>
                  Severity: {kf.severity}
                </div>
              </div>
            );
          })}
        </div>

        {/* Uncertainty Notes & Verification Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-[#0B0C1E]/60 border border-[#23254A] space-y-2">
            <div className="text-xs font-semibold text-[#F59E0B] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Uncertainty &amp; Limitations Notes</span>
            </div>
            <ul className="space-y-1.5 text-xs text-[#94A3B8] list-disc list-inside">
              {report.aiAnalysis.uncertaintyNotes.map((note, idx) => (
                <li key={idx} className="leading-relaxed">
                  {note}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0C1E]/60 border border-[#23254A] space-y-2">
            <div className="text-xs font-semibold text-[#22D3EE] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Suggested Independent Verification Steps</span>
            </div>
            <ul className="space-y-1.5 text-xs text-[#94A3B8] list-disc list-inside">
              {report.aiAnalysis.suggestedVerificationSteps.map((step, idx) => (
                <li key={idx} className="leading-relaxed">
                  {step}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 4. SMART CONTRACT PERMISSIONS & TRADING RESTRICTIONS (2-Column Split) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Smart Contract Security Matrix (7 Cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-[#15162D] border border-[#25274D] p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-[#23254A] pb-3">
            <div className="flex items-center gap-2.5">
              <Code2 className="w-5 h-5 text-[#A78BFA]" />
              <div>
                <h3 className="text-base font-bold text-[#F8FAFC]">
                  Smart Contract Security &amp; Permissions
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  Distinguishes capability presence from active abuse or unverified state
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {permissionItems.map((item) => {
              const isNull = item.value === null;
              const isRisky = !isNull && (item.riskWhenTrue ? item.value === true : item.value === false);

              return (
                <div
                  key={item.label}
                  title={item.tooltip}
                  className="p-3.5 rounded-xl bg-[#0B0C1E] border border-[#1E2040] flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-[#94A3B8]">{item.label}</div>
                    <div
                      className={`text-xs font-semibold ${
                        isNull
                          ? 'text-[#94A3B8]'
                          : isRisky
                            ? 'text-[#F59E0B]'
                            : 'text-[#22C55E]'
                      }`}
                    >
                      {isNull
                        ? 'Data Unavailable'
                        : item.value
                          ? item.trueLabel
                          : item.falseLabel}
                    </div>
                  </div>

                  <div className="shrink-0 mt-0.5">
                    {isNull ? (
                      <MinusCircle className="w-4 h-4 text-[#94A3B8]" />
                    ) : isRisky ? (
                      <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-[#101126] border border-[#23254A] text-xs text-[#94A3B8] flex items-center justify-between gap-2">
            <span>
              Owner / Authority Address:{' '}
              <strong className="text-[#F8FAFC] font-mono">
                {report.permissions.ownerAddress || 'None / Unverified'}
              </strong>
            </span>
            <span className="text-[11px] text-[#A78BFA]">Not a formal audit</span>
          </div>
        </div>

        {/* Trading Restrictions & Simulation (5 Cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-[#15162D] border border-[#25274D] p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-[#23254A] pb-3">
            <div className="flex items-center gap-2.5">
              <Scale className="w-5 h-5 text-[#22D3EE]" />
              <div>
                <h3 className="text-base font-bold text-[#F8FAFC]">
                  Trading Restrictions &amp; Simulation
                </h3>
                <p className="text-xs text-[#94A3B8]">Source: {report.trading.source}</p>
              </div>
            </div>
          </div>

          {/* Honeypot Status Banner */}
          <div className="p-4 rounded-xl bg-[#0B0C1E] border border-[#1E2040] flex items-center justify-between">
            <div>
              <div className="text-xs text-[#94A3B8]">Honeypot Simulation Status</div>
              <div
                className={`text-base font-bold mt-0.5 ${
                  report.trading.isHoneypot === true
                    ? 'text-[#EF4444]'
                    : report.trading.isHoneypot === false
                      ? 'text-[#22C55E]'
                      : 'text-[#94A3B8]'
                }`}
              >
                {report.trading.isHoneypot === true
                  ? 'CRITICAL: Honeypot Revert Detected'
                  : report.trading.isHoneypot === false
                    ? 'No Honeypot Revert at Scan Time'
                    : netCfg.honeypotSupported
                      ? 'Simulation Data Unavailable'
                      : `Not Supported on ${netCfg.shortName}`}
              </div>
            </div>
            {report.trading.isHoneypot === true ? (
              <XCircle className="w-7 h-7 text-[#EF4444] shrink-0" />
            ) : report.trading.isHoneypot === false ? (
              <CheckCircle2 className="w-7 h-7 text-[#22C55E] shrink-0" />
            ) : (
              <HelpCircle className="w-7 h-7 text-[#94A3B8] shrink-0" />
            )}
          </div>

          {/* Buy / Sell / Transfer Taxes */}
          <div className="grid grid-cols-3 gap-3 font-mono tabular-nums text-center">
            <div className="p-3.5 rounded-xl bg-[#0B0C1E] border border-[#1E2040]">
              <div className="text-[11px] text-[#94A3B8] mb-1">Buy Tax</div>
              <div
                className={`text-lg font-bold ${
                  (report.trading.buyTaxPercent ?? 0) >= 10
                    ? 'text-[#EF4444]'
                    : (report.trading.buyTaxPercent ?? 0) > 0
                      ? 'text-[#F59E0B]'
                      : 'text-[#22C55E]'
                }`}
              >
                {report.trading.buyTaxPercent !== null ? `${report.trading.buyTaxPercent}%` : 'N/A'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0B0C1E] border border-[#1E2040]">
              <div className="text-[11px] text-[#94A3B8] mb-1">Sell Tax</div>
              <div
                className={`text-lg font-bold ${
                  (report.trading.sellTaxPercent ?? 0) >= 10
                    ? 'text-[#EF4444]'
                    : (report.trading.sellTaxPercent ?? 0) > 0
                      ? 'text-[#F59E0B]'
                      : 'text-[#22C55E]'
                }`}
              >
                {report.trading.sellTaxPercent !== null ? `${report.trading.sellTaxPercent}%` : 'N/A'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0B0C1E] border border-[#1E2040]">
              <div className="text-[11px] text-[#94A3B8] mb-1">Transfer Tax</div>
              <div className="text-lg font-bold text-[#F8FAFC]">
                {report.trading.transferTaxPercent !== null
                  ? `${report.trading.transferTaxPercent}%`
                  : 'N/A'}
              </div>
            </div>
          </div>

          {/* 24h Buy vs Sell Order Flow Rate */}
          <div className="p-3.5 rounded-xl bg-[#0B0C1E] border border-[#1E2040] space-y-2 font-mono tabular-nums">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#94A3B8] font-sans font-medium">
                24h Rate of Buy vs Sell (Order Flow)
              </span>
              <span className="text-[#22D3EE] font-semibold">
                {report.market.buyPressure24hPercent !== undefined &&
                report.market.buyPressure24hPercent !== null
                  ? `${report.market.buyPressure24hPercent}% Buy / ${(100 - report.market.buyPressure24hPercent).toFixed(1)}% Sell`
                  : 'Telemetry Pending'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-[#101126] border border-[#1E2040] flex items-center justify-between">
                <span className="text-[#94A3B8]">24h Buys:</span>
                <span className="text-[#22C55E] font-bold">
                  {report.market.buys24h !== undefined && report.market.buys24h !== null
                    ? report.market.buys24h.toLocaleString()
                    : 'N/A'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-[#101126] border border-[#1E2040] flex items-center justify-between">
                <span className="text-[#94A3B8]">24h Sells:</span>
                <span className="text-[#EF4444] font-bold">
                  {report.market.sells24h !== undefined && report.market.sells24h !== null
                    ? report.market.sells24h.toLocaleString()
                    : 'N/A'}
                </span>
              </div>
            </div>

            {report.market.buyPressure24hPercent !== undefined &&
              report.market.buyPressure24hPercent !== null && (
                <div className="h-2 w-full rounded-lg bg-[#EF4444]/80 overflow-hidden flex">
                  <div
                    className="h-full bg-[#22C55E]"
                    style={{
                      width: `${Math.max(5, Math.min(95, report.market.buyPressure24hPercent))}%`,
                    }}
                  />
                </div>
              )}
          </div>

          <div className="p-3 rounded-xl bg-[#101126] border border-[#23254A] text-[11px] text-[#94A3B8] leading-relaxed">
            <strong>Time-Dependence Notice:</strong> Simulated trading results reflect on-chain
            conditions at the exact timestamp of this scan and may change if privileged contract
            functions (such as fee modifiers or blacklists) are invoked later.
          </div>
        </div>
      </section>

      {/* 5. LIQUIDITY ANALYSIS & HOLDER CONCENTRATION (2-Column Split with Recharts) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Liquidity Analysis (6 Cols) */}
        <div className="lg:col-span-6 rounded-2xl bg-[#15162D] border border-[#25274D] p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-[#23254A] pb-3">
            <div className="flex items-center gap-2.5">
              <Coins className="w-5 h-5 text-[#22D3EE]" />
              <div>
                <h3 className="text-base font-bold text-[#F8FAFC]">DEX Liquidity Analysis</h3>
                <p className="text-xs text-[#94A3B8]">
                  Pool size never implies liquidity is locked — check LP lock evidence separately
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 font-mono tabular-nums">
            <div className="p-3 rounded-xl bg-[#0B0C1E] border border-[#1E2040]">
              <div className="text-[11px] text-[#94A3B8]">Total DEX Liquidity</div>
              <div className="text-base font-bold text-[#F8FAFC] mt-0.5">
                {formatUsd(report.market.liquidityUsd)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#0B0C1E] border border-[#1E2040]">
              <div className="text-[11px] text-[#94A3B8]">Active DEX Pairs</div>
              <div className="text-base font-bold text-[#F8FAFC] mt-0.5">
                {report.market.pairCount}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#0B0C1E] border border-[#1E2040]">
              <div className="text-[11px] text-[#94A3B8]">Verified LP Lock</div>
              <div
                className={`text-base font-bold mt-0.5 flex items-center gap-1 ${
                  report.holders.lpLockedPercent === null
                    ? 'text-[#94A3B8]'
                    : report.holders.lpLockedPercent >= 70
                      ? 'text-[#22C55E]'
                      : 'text-[#F59E0B]'
                }`}
              >
                {report.holders.lpLockedPercent !== null ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>{report.holders.lpLockedPercent}%</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Unverified</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Pool Distribution Chart */}
          {poolChartData.length > 0 ? (
            <div className="h-44 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={poolChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#0B0C1E',
                      borderColor: '#25274D',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [formatUsd(Number(val)), 'Pool Liquidity']}
                  />
                  <Bar dataKey="liquidityUsd" radius={[0, 6, 6, 0]}>
                    {poolChartData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#8B5CF6' : '#22D3EE'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-[#94A3B8] bg-[#0B0C1E] rounded-xl">
              No active DEX pools reported by DEX Screener.
            </div>
          )}

          {/* Top Pools Table */}
          {report.market.pools.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono tabular-nums">
                <thead>
                  <tr className="text-[11px] text-[#94A3B8] border-b border-[#23254A]">
                    <th className="py-2">Pair / DEX</th>
                    <th className="py-2 text-right">Liquidity</th>
                    <th className="py-2 text-right">24h Vol</th>
                    <th className="py-2 text-right">Pool Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2040]">
                  {report.market.pools.slice(0, 4).map((pool) => (
                    <tr key={pool.pairAddress}>
                      <td className="py-2 text-[#F8FAFC]">
                        {pool.baseTokenSymbol}/{pool.quoteTokenSymbol}{' '}
                        <span className="text-[#A78BFA]">({pool.dexId})</span>
                      </td>
                      <td className="py-2 text-right text-[#F8FAFC]">
                        {formatUsd(pool.liquidityUsd)}
                      </td>
                      <td className="py-2 text-right text-[#94A3B8]">
                        {formatUsd(pool.volume24hUsd)}
                      </td>
                      <td className="py-2 text-right text-[#94A3B8]">
                        {pool.pairCreatedAt
                          ? new Date(pool.pairCreatedAt).toLocaleDateString()
                          : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Holder Concentration (6 Cols) */}
        <div className="lg:col-span-6 rounded-2xl bg-[#15162D] border border-[#25274D] p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-[#23254A] pb-3">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-[#A78BFA]" />
              <div>
                <h3 className="text-base font-bold text-[#F8FAFC]">Holder Concentration</h3>
                <p className="text-xs text-[#94A3B8]">
                  Separates investor wallets from burn addresses and liquidity pools
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 font-mono tabular-nums">
            <div className="p-3 rounded-xl bg-[#0B0C1E] border border-[#1E2040]">
              <div className="text-[11px] text-[#94A3B8]">Observed Holders</div>
              <div className="text-base font-bold text-[#F8FAFC] mt-0.5">
                {report.holders.totalHolders !== null
                  ? report.holders.totalHolders.toLocaleString('en-US')
                  : 'Unavailable'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#0B0C1E] border border-[#1E2040]">
              <div className="text-[11px] text-[#94A3B8]">Top Non-Pool Share</div>
              <div
                className={`text-base font-bold mt-0.5 ${
                  report.holders.top10InvestorPercent === null
                    ? 'text-[#94A3B8]'
                    : report.holders.top10InvestorPercent >= 30
                      ? 'text-[#F59E0B]'
                      : 'text-[#22C55E]'
                }`}
              >
                {report.holders.top10InvestorPercent !== null
                  ? `${report.holders.top10InvestorPercent}%`
                  : 'Incomplete'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#0B0C1E] border border-[#1E2040]">
              <div className="text-[11px] text-[#94A3B8]">Burned Share</div>
              <div className="text-base font-bold text-[#22C55E] mt-0.5">
                {report.holders.burnPercent !== null ? `${report.holders.burnPercent}%` : 'N/A'}
              </div>
            </div>
          </div>

          {report.holders.dataComplete ? (
            <>
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={holderChartData}
                    layout="vertical"
                    margin={{ left: 10, right: 20 }}
                  >
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={165}
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#0B0C1E',
                        borderColor: '#25274D',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                      formatter={(val: any) => [`${val}%`, 'Supply Share']}
                    />
                    <Bar dataKey="percent" radius={[0, 6, 6, 0]}>
                      {holderChartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono tabular-nums">
                  <thead>
                    <tr className="text-[11px] text-[#94A3B8] border-b border-[#23254A]">
                      <th className="py-2">Holder Address</th>
                      <th className="py-2">Classification</th>
                      <th className="py-2 text-right">Supply %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2040]">
                    {report.holders.topHolders.slice(0, 5).map((h, i) => (
                      <tr key={`${h.address}-${i}`}>
                        <td className="py-2 text-[#F8FAFC]">
                          {shortenAddress(h.address)}{' '}
                          {h.tag && <span className="text-[#A78BFA]">({h.tag})</span>}
                        </td>
                        <td className="py-2 text-[#94A3B8] font-sans">{h.category}</td>
                        <td className="py-2 text-right text-[#F8FAFC]">{h.percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="p-6 rounded-xl bg-[#0B0C1E] border border-[#1E2040] text-xs text-[#94A3B8] text-center">
              Top holder wallet breakdown is incomplete or unavailable from automated providers for
              this network. Inspect the Holders tab on {netCfg.explorerName}.
            </div>
          )}
        </div>
      </section>

      {/* 6. MARKET INFORMATION (Keeping Market Cap & FDV Strictly Distinct) */}
      <section className="rounded-2xl bg-[#15162D] border border-[#25274D] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#23254A] pb-3">
          <div>
            <h3 className="text-base font-bold text-[#F8FAFC]">
              Market &amp; Valuation Telemetry (DEX Screener)
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Circulating Market Capitalization and Fully Diluted Valuation (FDV) are reported
              separately and never substituted
            </p>
          </div>
          {report.market.oldestPairCreatedAt && (
            <span className="text-xs font-mono text-[#94A3B8]">
              Oldest Pair Created: {new Date(report.market.oldestPairCreatedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono tabular-nums">
          <div className="p-3.5 rounded-xl bg-[#0B0C1E] border border-[#1E2040]">
            <div className="text-[11px] text-[#94A3B8]">Current Price</div>
            <div className="text-base font-bold text-[#F8FAFC] mt-1">
              {formatTokenPrice(report.market.priceUsd)}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0B0C1E] border border-[#1E2040]">
            <div className="text-[11px] text-[#94A3B8]">24h Price Change</div>
            <div
              className={`text-base font-bold mt-1 ${
                report.market.priceChange24h === null
                  ? 'text-[#94A3B8]'
                  : report.market.priceChange24h >= 0
                    ? 'text-[#22C55E]'
                    : 'text-[#EF4444]'
              }`}
            >
              {report.market.priceChange24h !== null
                ? `${report.market.priceChange24h > 0 ? '+' : ''}${report.market.priceChange24h}%`
                : 'Unavailable'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0B0C1E] border border-[#1E2040]">
            <div className="text-[11px] text-[#94A3B8]">Market Cap (Circulating)</div>
            <div className="text-base font-bold text-[#F8FAFC] mt-1">
              {formatUsd(report.market.marketCapUsd)}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0B0C1E] border border-[#1E2040]">
            <div className="text-[11px] text-[#94A3B8]">Fully Diluted (FDV)</div>
            <div className="text-base font-bold text-[#A78BFA] mt-1">
              {formatUsd(report.market.fdvUsd)}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0B0C1E] border border-[#1E2040]">
            <div className="text-[11px] text-[#94A3B8]">24h Volume</div>
            <div className="text-base font-bold text-[#F8FAFC] mt-1">
              {formatUsd(report.market.volume24hUsd)}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0B0C1E] border border-[#1E2040]">
            <div className="text-[11px] text-[#94A3B8]">Primary DEX</div>
            <div className="text-base font-bold text-[#22D3EE] mt-1 uppercase">
              {report.market.primaryDex || 'None'}
            </div>
          </div>
        </div>
      </section>

      {/* 7. EXPANDABLE DETERMINISTIC EVIDENCE & SOURCES */}
      <section className="rounded-2xl bg-[#15162D] border border-[#25274D] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#23254A] pb-3">
          <div>
            <h3 className="text-base font-bold text-[#F8FAFC]">
              Deterministic Evidence &amp; Security Findings ({report.findings.length})
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Every finding is generated deterministically prior to AI explanation. Click any finding
              to inspect raw technical evidence.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {report.findings.map((finding: SecurityFinding) => {
            const sevStyle = getSeverityStyles(finding.severity);
            const isExpanded = Boolean(expandedFindings[finding.id]);

            return (
              <div
                key={finding.id}
                id={`finding-card-${finding.id}`}
                className="rounded-xl bg-[#0B0C1E] border border-[#23254A] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFindingExpand(finding.id)}
                  className="w-full p-4 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#12142B] transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-xs font-semibold text-[#A78BFA] shrink-0 mt-0.5">
                      [{finding.id}]
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-[#F8FAFC]">{finding.title}</div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#94A3B8] mt-1">
                        <span>{finding.category}</span>
                        <span>·</span>
                        <span className="text-[#22D3EE]">{finding.status}</span>
                        <span>·</span>
                        <span>Source: {finding.source}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <span className={`text-xs font-mono font-bold ${sevStyle.text}`}>
                      {sevStyle.label}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#94A3B8]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-[#1E2040] space-y-3 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                      <div className="p-3 rounded-xl bg-[#15162D] space-y-1">
                        <div className="font-semibold text-[#A78BFA]">
                          Beginner-Friendly Explanation
                        </div>
                        <p className="text-[#F8FAFC] leading-relaxed">
                          {finding.beginnerExplanation}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-[#15162D] space-y-1">
                        <div className="font-semibold text-[#22D3EE]">
                          Technical Assessment &amp; Provenance
                        </div>
                        <p className="text-[#94A3B8] leading-relaxed">{finding.explanation}</p>
                      </div>
                    </div>

                    {/* Raw Evidence Key-Value Record */}
                    <div className="p-3 rounded-xl bg-[#101126] border border-[#1E2040] font-mono">
                      <div className="text-[11px] text-[#94A3B8] mb-1.5">
                        Observed Evidence Parameters (Confidence: {finding.confidence} · Observed:{' '}
                        {new Date(finding.observedAt).toLocaleTimeString()}):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.entries(finding.evidence).map(([k, v]) => (
                          <div key={k} className="text-[11px] truncate">
                            <span className="text-[#94A3B8]">{k}: </span>
                            <span className="text-[#F8FAFC]">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[#94A3B8] pt-1">
                      <div>
                        <strong className="text-[#F8FAFC]">Recommended Verification Action: </strong>
                        <span>{finding.recommendedAction}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. GEMMA 4 AI ANALYST QUESTION-AND-ANSWER PANEL */}
      <section className="rounded-2xl bg-[#15162D] border border-[#8B5CF6]/50 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#23254A] pb-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-[#A78BFA]" />
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC]">
                Ask the Gemma 4 Security Analyst About {report.token.symbol}
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Answers are strictly grounded in this report&apos;s evidence. No financial or
                buy/sell advice is ever provided.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="qa-lang-select" className="text-xs text-[#94A3B8]">
              Response Mode:
            </label>
            <select
              id="qa-lang-select"
              value={qaLang}
              onChange={(e) => setQaLang(e.target.value as 'standard' | 'simple' | 'pidgin')}
              className="px-2.5 py-1.5 rounded-xl bg-[#0B0C1E] border border-[#25274D] text-xs text-[#F8FAFC] focus:outline-none"
            >
              <option value="standard">Standard English</option>
              <option value="simple">Simple English</option>
              <option value="pidgin">Nigerian Pidgin</option>
            </select>
          </div>
        </div>

        {/* Suggested Questions */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { q: 'What are the biggest risks with this token?', lang: undefined },
            { q: 'What does mint authority mean?', lang: undefined },
            { q: 'Why is liquidity important?', lang: undefined },
            { q: 'Explain this contract permission.', lang: undefined },
            { q: 'Which security checks were unavailable?', lang: undefined },
            { q: 'Explain this report in simple English.', lang: 'simple' as const },
            { q: 'Explain this report in Nigerian Pidgin.', lang: 'pidgin' as const },
          ].map((item) => (
            <button
              key={item.q}
              type="button"
              disabled={qaLoading}
              onClick={() => handleAskQuestion(item.q, item.lang)}
              className="px-3 py-1.5 rounded-xl bg-[#0B0C1E] hover:bg-[#1E2040] border border-[#25274D] hover:border-[#8B5CF6]/60 text-xs text-[#F8FAFC] transition-colors cursor-pointer"
            >
              {item.q}
            </button>
          ))}
        </div>

        {/* Q&A Conversation Thread */}
        {qaHistory.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto p-3 rounded-xl bg-[#0B0C1E] border border-[#1E2040]">
            {qaHistory.map((turn, idx) => (
              <div key={idx} className="space-y-2 pb-3 border-b border-[#1E2040] last:border-none last:pb-0">
                <div className="text-xs font-semibold text-[#A78BFA]">Q: {turn.question}</div>
                <div className="text-xs sm:text-sm text-[#F8FAFC] leading-relaxed whitespace-pre-line">
                  {turn.answer}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#94A3B8]">
                  <span>Model: {turn.modelUsed}</span>
                  {turn.citedEvidenceIds.length > 0 && (
                    <>
                      <span>·</span>
                      <span>Cited Evidence:</span>
                      {turn.citedEvidenceIds.map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => scrollToFinding(id)}
                          className="text-[#22D3EE] hover:underline cursor-pointer"
                        >
                          [{id}]
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Question Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAskQuestion(qaInput);
          }}
          className="flex gap-2.5"
        >
          <input
            type="text"
            value={qaInput}
            onChange={(e) => setQaInput(e.target.value)}
            disabled={qaLoading}
            placeholder={`Ask a security question about ${report.token.name} (${report.token.symbol})...`}
            aria-label="Ask Gemma 4 Analyst a question about this token report"
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#0B0C1E] border border-[#25274D] focus:border-[#8B5CF6] text-xs sm:text-sm text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none"
          />
          <button
            type="submit"
            disabled={qaLoading || !qaInput.trim()}
            className="px-5 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-xs sm:text-sm font-semibold text-white inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            {qaLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Ask Gemma 4</span>
              </>
            )}
          </button>
        </form>
      </section>
    </div>
  );
};
