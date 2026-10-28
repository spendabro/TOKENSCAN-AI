import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  TrendingUp,
  TrendingDown,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Plus,
  X,
  RotateCcw,
  ExternalLink,
  Volume2,
} from 'lucide-react';
import {
  PriceAlert,
  PriceAlertCondition,
  TokenScanReport,
  SUPPORTED_NETWORKS,
} from '../types/tokenlens.ts';
import { formatTokenPrice } from '../utils/formatters.ts';

// Subtle Web Audio API notification chime (safe across all browsers without external audio files)
export function playAlertChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.16); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // ignore audio context restrictions
  }
}

interface TokenPriceAlertPanelProps {
  report: TokenScanReport;
  alerts: PriceAlert[];
  onCreateAlert: (params: {
    scanId: string;
    networkId: TokenScanReport['token']['networkId'];
    contractAddress: string;
    tokenName: string;
    tokenSymbol: string;
    condition: PriceAlertCondition;
    targetPriceUsd: number;
    baselinePriceUsd: number;
    note?: string;
  }) => void;
  onDeleteAlert: (alertId: string) => void;
  onRearmAlert: (alertId: string) => void;
  onCheckPricesNow: () => Promise<void>;
  isCheckingPrices: boolean;
}

export const TokenPriceAlertPanel: React.FC<TokenPriceAlertPanelProps> = ({
  report,
  alerts,
  onCreateAlert,
  onDeleteAlert,
  onRearmAlert,
  onCheckPricesNow,
  isCheckingPrices,
}) => {
  const currentPrice = report.market.priceUsd ?? 0;

  const tokenAlerts = alerts.filter(
    (a) =>
      a.networkId === report.token.networkId &&
      a.contractAddress.toLowerCase() === report.token.contractAddress.toLowerCase()
  );

  // Latest live price from either most recent alert check or report snapshot
  const latestObservedPrice =
    tokenAlerts.find((a) => a.lastCheckedPriceUsd !== null)?.lastCheckedPriceUsd ??
    currentPrice;

  const [targetInput, setTargetInput] = useState<string>(() => {
    if (currentPrice > 0) {
      const plus5 = currentPrice * 1.05;
      return plus5 < 0.01 ? plus5.toPrecision(4) : plus5.toFixed(4);
    }
    return '';
  });
  const [condition, setCondition] = useState<PriceAlertCondition>('above');
  const [noteInput, setNoteInput] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [browserPushStatus, setBrowserPushStatus] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  // Update default target input when switching reports
  useEffect(() => {
    if (currentPrice > 0) {
      const plus5 = currentPrice * 1.05;
      setTargetInput(plus5 < 0.01 ? plus5.toPrecision(4) : plus5.toFixed(4));
      setCondition('above');
    } else {
      setTargetInput('');
    }
    setFormError(null);
  }, [report.scanId, currentPrice]);

  const applyPercentagePreset = (pctDelta: number) => {
    const base = latestObservedPrice > 0 ? latestObservedPrice : currentPrice;
    if (base <= 0) return;
    const computed = base * (1 + pctDelta / 100);
    const formatted =
      computed < 0.0001
        ? computed.toPrecision(4)
        : computed < 1
          ? computed.toFixed(6)
          : computed.toFixed(2);
    setTargetInput(formatted);
    setCondition(pctDelta >= 0 ? 'above' : 'below');
    setFormError(null);
  };

  const handleRequestBrowserPush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setBrowserPushStatus(perm);
    } catch {
      // ignore permission errors in iframe
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTarget = Number(targetInput);
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setFormError('Please enter a valid positive target price in USD.');
      return;
    }

    const basePrice = latestObservedPrice > 0 ? latestObservedPrice : currentPrice;
    setFormError(null);

    onCreateAlert({
      scanId: report.scanId,
      networkId: report.token.networkId,
      contractAddress: report.token.contractAddress,
      tokenName: report.token.name,
      tokenSymbol: report.token.symbol,
      condition,
      targetPriceUsd: parsedTarget,
      baselinePriceUsd: basePrice,
      note: noteInput.trim() || undefined,
    });

    setNoteInput('');
  };

  return (
    <section
      id="token-price-alert-panel"
      aria-label="User-Defined Token Price Alert System"
      className="rounded-2xl bg-[#15162D] border border-[#25274D] p-4 sm:p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#23254A] pb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5 text-[#A78BFA]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-[#F8FAFC]">
                Price Threshold Alerts for {report.token.symbol}
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-[#22D3EE]/15 border border-[#22D3EE]/30 text-[10px] font-mono font-semibold text-[#22D3EE]">
                DEX Screener Live Feed
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Set a target USD threshold to receive instant in-app and browser notifications when{' '}
              <strong className="text-[#F8FAFC]">{report.token.symbol}</strong> crosses your level.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {browserPushStatus !== 'unsupported' && browserPushStatus !== 'granted' && (
            <button
              type="button"
              onClick={handleRequestBrowserPush}
              className="px-3 py-1.5 rounded-xl bg-[#0B0C1E] hover:bg-[#1E2040] border border-[#25274D] text-xs font-medium text-[#A78BFA] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Enable Browser Push</span>
            </button>
          )}

          <button
            type="button"
            disabled={isCheckingPrices}
            onClick={onCheckPricesNow}
            className="px-3 py-1.5 rounded-xl bg-[#0B0C1E] hover:bg-[#1E2040] border border-[#25274D] text-xs font-medium text-[#F8FAFC] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Poll DEX Screener live price feed now"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#22D3EE] ${isCheckingPrices ? 'animate-spin' : ''}`} />
            <span>{isCheckingPrices ? 'Checking DEX Price...' : 'Check Price Now'}</span>
          </button>
        </div>
      </div>

      {/* Alert Creation Form & Live Reference */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 7 Cols: Create Alert Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 p-4 rounded-xl bg-[#0B0C1E] border border-[#1E2040] space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-[#F8FAFC]">Configure New Price Alert</span>
            <span className="font-mono text-[#94A3B8]">
              Live Reference:{' '}
              <strong className="text-[#22D3EE]">{formatTokenPrice(latestObservedPrice)}</strong>
            </span>
          </div>

          {/* Quick Percentage Presets */}
          {latestObservedPrice > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] text-[#94A3B8]">
                Quick Target Presets (from live price):
              </div>
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                {[
                  { label: '+5%', pct: 5, positive: true },
                  { label: '+10%', pct: 10, positive: true },
                  { label: '+25%', pct: 25, positive: true },
                  { label: '-5%', pct: -5, positive: false },
                  { label: '-10%', pct: -10, positive: false },
                  { label: '-20%', pct: -20, positive: false },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPercentagePreset(preset.pct)}
                    className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                      preset.positive
                        ? 'bg-[#22C55E]/10 hover:bg-[#22C55E]/20 border-[#22C55E]/30 text-[#22C55E]'
                        : 'bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border-[#EF4444]/30 text-[#EF4444]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Condition Selector */}
            <div className="sm:col-span-5">
              <label
                htmlFor="alert-condition-select"
                className="block text-[11px] text-[#94A3B8] mb-1"
              >
                Trigger Condition
              </label>
              <select
                id="alert-condition-select"
                value={condition}
                onChange={(e) => setCondition(e.target.value as PriceAlertCondition)}
                className="w-full h-10 px-3 rounded-xl bg-[#15162D] border border-[#25274D] focus:border-[#8B5CF6] text-xs font-medium text-[#F8FAFC] focus:outline-none cursor-pointer"
              >
                <option value="above">Crosses Above (≥ Target)</option>
                <option value="below">Crosses Below (≤ Target)</option>
              </select>
            </div>

            {/* Target Price Input */}
            <div className="sm:col-span-7">
              <label
                htmlFor="alert-target-price-input"
                className="block text-[11px] text-[#94A3B8] mb-1"
              >
                Target Price (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#94A3B8]">
                  $
                </span>
                <input
                  id="alert-target-price-input"
                  type="number"
                  step="any"
                  min="0"
                  value={targetInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTargetInput(val);
                    const num = Number(val);
                    if (Number.isFinite(num) && num > 0 && latestObservedPrice > 0) {
                      setCondition(num >= latestObservedPrice ? 'above' : 'below');
                    }
                  }}
                  placeholder="0.00"
                  className="w-full h-10 pl-7 pr-3 rounded-xl bg-[#15162D] border border-[#25274D] focus:border-[#8B5CF6] text-xs font-mono text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="alert-note-input"
                className="block text-[11px] text-[#94A3B8] mb-1"
              >
                Optional Alert Label / Note
              </label>
              <input
                id="alert-note-input"
                type="text"
                maxLength={80}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="e.g. Breakout above resistance, Liquidity watch level..."
                className="w-full h-10 px-3 rounded-xl bg-[#15162D] border border-[#25274D] focus:border-[#8B5CF6] text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 shadow-md shadow-[#8B5CF6]/20 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Set Price Alert</span>
            </button>
          </div>

          {formError && (
            <div className="text-xs text-[#EF4444] font-medium">{formError}</div>
          )}
        </form>

        {/* Right 5 Cols: Active & Triggered Alerts for This Token */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#F8FAFC]">
              {report.token.symbol} Alert Watchlist ({tokenAlerts.length})
            </span>
            <span className="text-[11px] text-[#94A3B8] font-mono">
              Auto-polls every 20s
            </span>
          </div>

          {tokenAlerts.length === 0 ? (
            <div className="p-6 rounded-xl bg-[#0B0C1E] border border-[#1E2040] text-center space-y-1.5">
              <Bell className="w-5 h-5 text-[#94A3B8] mx-auto" />
              <div className="text-xs font-medium text-[#F8FAFC]">
                No price alerts set for {report.token.symbol}
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Set a target price on the left or click a percentage preset to monitor live DEX
                Screener price crossings.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {tokenAlerts.map((alert) => {
                const isTriggered = alert.status === 'triggered';
                const refPrice = alert.lastCheckedPriceUsd ?? latestObservedPrice;
                const distPct =
                  refPrice > 0
                    ? (((alert.targetPriceUsd - refPrice) / refPrice) * 100).toFixed(2)
                    : null;

                return (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-xl border transition-colors flex items-start justify-between gap-3 ${
                      isTriggered
                        ? 'bg-[#22C55E]/10 border-[#22C55E]/50'
                        : 'bg-[#0B0C1E] border-[#1E2040]'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                        {alert.condition === 'above' ? (
                          <TrendingUp className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
                        )}
                        <span className="text-[#F8FAFC]">
                          {alert.condition === 'above' ? 'Crosses Above' : 'Crosses Below'}
                        </span>
                        <span className="font-mono text-[#22D3EE]">
                          {formatTokenPrice(alert.targetPriceUsd)}
                        </span>
                        {isTriggered && (
                          <span className="px-1.5 py-0.5 rounded bg-[#22C55E] text-[#080817] text-[10px] font-mono font-bold">
                            TRIGGERED
                          </span>
                        )}
                      </div>

                      {alert.note && (
                        <div className="text-[11px] text-[#A78BFA] truncate">{alert.note}</div>
                      )}

                      <div className="text-[11px] font-mono text-[#94A3B8]">
                        {isTriggered ? (
                          <span className="text-[#22C55E]">
                            Crossed at {formatTokenPrice(alert.triggeredPriceUsd)} (
                            {alert.triggeredAt
                              ? new Date(alert.triggeredAt).toLocaleTimeString()
                              : 'Just now'}
                            )
                          </span>
                        ) : (
                          <span>
                            Now: {formatTokenPrice(refPrice)}
                            {distPct !== null && (
                              <span className="ml-1.5 text-[#94A3B8]">
                                ({Number(distPct) > 0 ? `+${distPct}%` : `${distPct}%`} to target)
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isTriggered && (
                        <button
                          type="button"
                          onClick={() => onRearmAlert(alert.id)}
                          title="Re-arm this price alert"
                          className="p-1.5 rounded-lg bg-[#15162D] hover:bg-[#1E2040] text-[#94A3B8] hover:text-[#22D3EE] transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteAlert(alert.id)}
                        title="Remove price alert"
                        className="p-1.5 rounded-lg bg-[#15162D] hover:bg-[#1E2040] text-[#94A3B8] hover:text-[#EF4444] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// GLOBAL REAL-TIME PRICE ALERT NOTIFICATION TOASTS & DRAWER
// ============================================================================

export const GlobalPriceAlertToasts: React.FC<{
  triggeredAlerts: PriceAlert[];
  onDismissNotification: (alertId: string) => void;
  onInspectAlertReport: (alert: PriceAlert) => void;
}> = ({ triggeredAlerts, onDismissNotification, onInspectAlertReport }) => {
  const unreadTriggered = triggeredAlerts.filter((a) => a.unreadNotification);

  if (unreadTriggered.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-20 right-4 z-50 w-full max-w-sm space-y-2.5 pointer-events-none"
    >
      {unreadTriggered.slice(0, 3).map((alert) => {
        const netCfg = SUPPORTED_NETWORKS[alert.networkId];
        return (
          <div
            key={alert.id}
            className="pointer-events-auto rounded-2xl bg-[#11132A]/95 backdrop-blur-md border-2 border-[#22C55E] p-4 shadow-2xl shadow-[#080817]/80 space-y-2.5 animate-in fade-in slide-in-from-top-3 duration-200"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#22C55E]/20 border border-[#22C55E]/50 flex items-center justify-center shrink-0">
                  <BellRing className="w-4 h-4 text-[#22C55E]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#22C55E]">
                    <span>PRICE ALERT TRIGGERED</span>
                    <Volume2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-sm font-bold text-[#F8FAFC]">
                    {alert.tokenName} ({alert.tokenSymbol}) · {netCfg.shortName}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDismissNotification(alert.id)}
                aria-label="Dismiss price alert notification"
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E2040] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-[#080817] border border-[#1E2040] text-xs font-mono space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[#94A3B8] font-sans">Threshold Crossed:</span>
                <span className="font-bold text-[#F8FAFC]">
                  {alert.condition === 'above' ? '≥ ' : '≤ '}
                  {formatTokenPrice(alert.targetPriceUsd)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#94A3B8] font-sans">Live DEX Screener Price:</span>
                <span className="font-bold text-[#22C55E]">
                  {formatTokenPrice(alert.triggeredPriceUsd ?? alert.lastCheckedPriceUsd)}
                </span>
              </div>
              {alert.note && (
                <div className="text-[11px] text-[#A78BFA] font-sans pt-0.5 truncate">
                  Note: {alert.note}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => onDismissNotification(alert.id)}
                className="px-3 py-1.5 rounded-lg bg-[#15162D] hover:bg-[#1E2040] text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
              >
                Acknowledge
              </button>
              <button
                type="button"
                onClick={() => onInspectAlertReport(alert)}
                className="px-3 py-1.5 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-xs font-bold text-[#080817] inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Open Report</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const PriceAlertsDropdownModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  alerts: PriceAlert[];
  onDeleteAlert: (alertId: string) => void;
  onRearmAlert: (alertId: string) => void;
  onInspectAlertReport: (alert: PriceAlert) => void;
  onCheckPricesNow: () => Promise<void>;
  isCheckingPrices: boolean;
}> = ({
  isOpen,
  onClose,
  alerts,
  onDeleteAlert,
  onRearmAlert,
  onInspectAlertReport,
  onCheckPricesNow,
  isCheckingPrices,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-3 sm:p-6 bg-[#080817]/60 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-[#15162D] border border-[#2A2D5A] shadow-2xl overflow-hidden mt-12">
        <div className="p-4 border-b border-[#23254A] flex items-center justify-between gap-2 bg-[#101126]">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-[#A78BFA]" />
            <h3 className="text-sm font-bold text-[#F8FAFC]">
              Token Price Alerts ({alerts.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isCheckingPrices}
              onClick={onCheckPricesNow}
              className="px-2.5 py-1 rounded-lg bg-[#15162D] hover:bg-[#1E2040] border border-[#25274D] text-[11px] font-medium text-[#22D3EE] inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isCheckingPrices ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Price Alerts Manager"
              className="p-1 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-[#1E2040] p-3 space-y-2">
          {alerts.length === 0 ? (
            <div className="py-10 px-4 text-center space-y-2">
              <Bell className="w-6 h-6 text-[#94A3B8] mx-auto" />
              <div className="text-xs font-semibold text-[#F8FAFC]">No Price Alerts Configured</div>
              <p className="text-[11px] text-[#94A3B8]">
                Open any scanned token report to set target price thresholds and receive automatic
                crossing notifications.
              </p>
            </div>
          ) : (
            alerts.map((alert) => {
              const isTriggered = alert.status === 'triggered';
              const netCfg = SUPPORTED_NETWORKS[alert.networkId];
              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                    isTriggered
                      ? 'bg-[#22C55E]/10 border-[#22C55E]/40'
                      : 'bg-[#0B0C1E] border-[#1E2040]'
                  }`}
                >
                  <div
                    onClick={() => {
                      onInspectAlertReport(alert);
                      onClose();
                    }}
                    className="space-y-1 min-w-0 flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#F8FAFC]">
                      <span className="truncate">{alert.tokenName}</span>
                      <span className="text-[#A78BFA] font-mono">({alert.tokenSymbol})</span>
                      <span className="text-[10px] text-[#22D3EE]">{netCfg.shortName}</span>
                      {isTriggered && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                      )}
                    </div>

                    <div className="text-xs font-mono text-[#F8FAFC]">
                      Target:{' '}
                      <strong className="text-[#22D3EE]">
                        {alert.condition === 'above' ? '≥ ' : '≤ '}
                        {formatTokenPrice(alert.targetPriceUsd)}
                      </strong>
                      {' · '}
                      <span className="text-[#94A3B8]">
                        Live:{' '}
                        {formatTokenPrice(
                          alert.triggeredPriceUsd ??
                            alert.lastCheckedPriceUsd ??
                            alert.baselinePriceUsd
                        )}
                      </span>
                    </div>

                    {alert.note && (
                      <div className="text-[11px] text-[#94A3B8] truncate">{alert.note}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isTriggered && (
                      <button
                        type="button"
                        onClick={() => onRearmAlert(alert.id)}
                        title="Re-arm alert"
                        className="p-1.5 rounded-lg bg-[#15162D] text-[#94A3B8] hover:text-[#22D3EE] cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteAlert(alert.id)}
                      title="Delete alert"
                      className="p-1.5 rounded-lg bg-[#15162D] text-[#94A3B8] hover:text-[#EF4444] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
