import React, { useState, useMemo, useEffect } from 'react';
import {
  Copy,
  Check,
  Download,
  Image as ImageIcon,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import {
  type TokenScanReport,
  SUPPORTED_NETWORKS,
} from '../types/tokenlens.ts';
import {
  formatUsd,
  formatTokenPrice,
  shortenAddress,
  getClassificationStyles,
} from '../utils/formatters.ts';

interface XShareCardStudioProps {
  report: TokenScanReport;
}

type PostStyleMode = 'full' | 'compact' | 'pidgin';

export const XShareCardStudio: React.FC<XShareCardStudioProps> = ({ report }) => {
  const [postMode, setPostMode] = useState<PostStyleMode>('full');
  const [customPostText, setCustomPostText] = useState<string>('');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [imageStatusMsg, setImageStatusMsg] = useState<string | null>(null);

  const netCfg = SUPPORTED_NETWORKS[report.token.networkId];
  const classStyle = getClassificationStyles(report.riskOverview.classification);

  // Compute Buy / Sell Rate metrics (combining live DEX Screener txns or fallback)
  const buys24h = report.market.buys24h ?? null;
  const sells24h = report.market.sells24h ?? null;
  const totalTxns24h =
    buys24h !== null && sells24h !== null ? buys24h + sells24h : null;

  const buyRatePercent =
    report.market.buyPressure24hPercent !== undefined &&
    report.market.buyPressure24hPercent !== null
      ? report.market.buyPressure24hPercent
      : totalTxns24h && totalTxns24h > 0 && buys24h !== null
        ? Number(((buys24h / totalTxns24h) * 100).toFixed(1))
        : null;

  const sellRatePercent =
    buyRatePercent !== null ? Number((100 - buyRatePercent).toFixed(1)) : null;

  const buyTaxStr =
    report.trading.buyTaxPercent !== null ? `${report.trading.buyTaxPercent}%` : 'N/A';
  const sellTaxStr =
    report.trading.sellTaxPercent !== null ? `${report.trading.sellTaxPercent}%` : 'N/A';
  const transferTaxStr =
    report.trading.transferTaxPercent !== null
      ? `${report.trading.transferTaxPercent}%`
      : '0%';

  const mcDisplay =
    report.market.marketCapUsd !== null
      ? formatUsd(report.market.marketCapUsd)
      : report.market.fdvUsd !== null
        ? `${formatUsd(report.market.fdvUsd)} (FDV)`
        : 'Unreported';

  const fdvDisplay =
    report.market.fdvUsd !== null ? formatUsd(report.market.fdvUsd) : 'Unreported';

  const priceDisplay = formatTokenPrice(report.market.priceUsd);
  const change24hDisplay =
    report.market.priceChange24h !== null
      ? `${report.market.priceChange24h > 0 ? '+' : ''}${report.market.priceChange24h}%`
      : 'N/A';

  const honeypotLabel =
    report.trading.isHoneypot === true
      ? 'ALERT: Honeypot Revert'
      : report.trading.isHoneypot === false
        ? 'PASSED (No Honeypot)'
        : 'Unavailable';

  const ownershipLabel =
    report.permissions.isOwnershipRenounced === true
      ? 'Renounced'
      : report.permissions.isOwnershipRenounced === false
        ? 'Active Owner'
        : 'Unverified';

  const mintLabel =
    report.permissions.isMintable === true
      ? 'Mintable (Risk)'
      : report.permissions.isMintable === false
        ? 'No Mint'
        : 'Unverified';

  const blacklistLabel =
    report.permissions.hasBlacklist === true
      ? 'Blacklist Present'
      : report.permissions.hasBlacklist === false
        ? 'No Blacklist'
        : 'Unverified';

  const proxyLabel =
    report.permissions.isProxy === true
      ? 'Upgradeable Proxy'
      : report.permissions.isProxy === false
        ? 'Immutable'
        : 'Unverified';

  const taxModLabel =
    report.permissions.canModifyTax === true
      ? 'Modifiable Fees'
      : report.permissions.canModifyTax === false
        ? 'Fixed Fees'
        : 'Unverified';

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'https://tokenlens.ai';
    const url = new URL(window.location.href);
    url.searchParams.set('report', report.scanId);
    return url.toString();
  }, [report.scanId]);

  // Build formatted X post text based on mode
  const generatedPostText = useMemo(() => {
    const sym = `$${report.token.symbol.toUpperCase()}`;
    const riskEmoji =
      report.riskOverview.classification === 'Critical Risk Indicators'
        ? '🚨'
        : report.riskOverview.classification === 'High Risk Signals'
          ? '⚠️'
          : report.riskOverview.classification === 'Moderate Risk Signals'
            ? '🟡'
            : report.riskOverview.classification === 'Low Observed Risk'
              ? '🛡️'
              : '🔍';

    const orderFlowLine =
      buys24h !== null && sells24h !== null && buyRatePercent !== null
        ? `${buys24h.toLocaleString()} Buys / ${sells24h.toLocaleString()} Sells (${buyRatePercent}% Buy Rate · ${sellRatePercent}% Sell Rate)`
        : 'Order flow telemetry pending';

    if (postMode === 'compact') {
      return [
        `${riskEmoji} ${sym} (${report.token.name}) Security Scan on ${netCfg.shortName}`,
        ` Verdict: ${report.riskOverview.classification} (Risk: ${report.riskOverview.riskIndexScore ?? 'N/A'}/100)`,
        `📊 MC: ${mcDisplay} | Price: ${priceDisplay} (${change24hDisplay}) | Liq: ${formatUsd(report.market.liquidityUsd)}`,
        `🔄 Taxes: Buy ${buyTaxStr} / Sell ${sellTaxStr} | 24h Rate: ${buyRatePercent !== null ? `${buyRatePercent}% Buys / ${sellRatePercent}% Sells` : 'N/A'}`,
        `🔐 Honeypot: ${honeypotLabel} | Owner: ${ownershipLabel} | Mint: ${mintLabel}`,
        `CA: ${shortenAddress(report.token.contractAddress, 6)}`,
        `Scanned via @TokenLensAI`,
      ].join('\n');
    }

    if (postMode === 'pidgin') {
      return [
        `${riskEmoji} TOKENLENS AI SCAN RESULT: ${sym} (${report.token.name}) on ${netCfg.name}`,
        `CA: ${report.token.contractAddress}`,
        ``,
        `📊 MARKET & VALUATION:`,
        `• Market Cap (MC): ${mcDisplay} | FDV: ${fdvDisplay}`,
        `• Price: ${priceDisplay} (24h: ${change24hDisplay})`,
        `• DEX Liquidity: ${formatUsd(report.market.liquidityUsd)} | 24h Vol: ${formatUsd(report.market.volume24hUsd)}`,
        ``,
        `⚖️ BUY & SELL RATE / TAXES:`,
        `• Buy Tax: ${buyTaxStr} | Sell Tax: ${sellTaxStr} | Transfer Tax: ${transferTaxStr}`,
        `• 24h Buy vs Sell Rate: ${orderFlowLine}`,
        `• Honeypot Check: ${honeypotLabel}`,
        ``,
        `🔐 CONTRACT & HOLDERS CHECK:`,
        `• Risk Level: ${report.riskOverview.classification} (Risk Score: ${report.riskOverview.riskIndexScore ?? 'N/A'}/100)`,
        `• Ownership: ${ownershipLabel} | Mint: ${mintLabel} | Blacklist: ${blacklistLabel}`,
        `• Top 10 Holders: ${report.holders.top10InvestorPercent !== null ? `${report.holders.top10InvestorPercent}%` : 'N/A'} | LP Lock: ${report.holders.lpLockedPercent !== null ? `${report.holders.lpLockedPercent}%` : 'Unverified'}`,
        ``,
        `🤖 Gemma 4 Pidgin Verdict: "${report.aiAnalysis.pidginSummary}"`,
        ``,
        `Full Evidence Report: ${shareUrl}`,
      ].join('\n');
    }

    // Default: 'full' — carries every single detail
    return [
      `${riskEmoji} TOKENLENS AI SECURITY REPORT: ${sym} (${report.token.name})`,
      `Chain: ${netCfg.name} | CA: ${report.token.contractAddress}`,
      ``,
      `🛡️ RISK CLASSIFICATION: ${report.riskOverview.classification.toUpperCase()}`,
      `• Risk Index: ${report.riskOverview.riskIndexScore ?? 'N/A'}/100 | Safety Index: ${report.riskOverview.safetyIndexScore ?? 'N/A'}/100`,
      `• Signals: ${report.riskOverview.criticalCount} Critical · ${report.riskOverview.highCount} High · ${report.riskOverview.moderateCount} Warnings (${report.riskOverview.dataCoveragePercent}% Coverage)`,
      ``,
      `📊 MARKET CAP & LIQUIDITY TELEMETRY:`,
      `• Market Cap (MC): ${mcDisplay} | FDV: ${fdvDisplay}`,
      `• Price: ${priceDisplay} (24h Change: ${change24hDisplay})`,
      `• Total Liquidity: ${formatUsd(report.market.liquidityUsd)} (${report.market.pairCount} Pools on ${report.market.primaryDex?.toUpperCase() || 'DEX'})`,
      `• 24h Volume: ${formatUsd(report.market.volume24hUsd)}`,
      ``,
      `🔄 RATE OF BUY & SELL / TRADING SIMULATION:`,
      `• Buy Tax Rate: ${buyTaxStr} | Sell Tax Rate: ${sellTaxStr} | Transfer Tax: ${transferTaxStr}`,
      `• 24h Buy/Sell Flow: ${orderFlowLine}`,
      `• Honeypot Status: ${honeypotLabel}`,
      ``,
      `🔐 SMART CONTRACT & HOLDER AUDIT:`,
      `• Ownership: ${ownershipLabel} | Minting: ${mintLabel}`,
      `• Blacklist: ${blacklistLabel} | Proxy: ${proxyLabel} | Tax Rules: ${taxModLabel}`,
      `• Top 10 Holders: ${report.holders.top10InvestorPercent !== null ? `${report.holders.top10InvestorPercent}%` : 'Unavailable'} | Burned: ${report.holders.burnPercent !== null ? `${report.holders.burnPercent}%` : 'N/A'} | LP Locked: ${report.holders.lpLockedPercent !== null ? `${report.holders.lpLockedPercent}%` : 'Unverified'}`,
      ``,
      `🤖 Gemma 4 AI Takeaway: ${report.aiAnalysis.executiveSummary}`,
      ``,
      `Inspect live report: ${shareUrl}`,
    ].join('\n');
  }, [
    report,
    postMode,
    netCfg,
    mcDisplay,
    fdvDisplay,
    priceDisplay,
    change24hDisplay,
    buyTaxStr,
    sellTaxStr,
    transferTaxStr,
    buys24h,
    sells24h,
    buyRatePercent,
    sellRatePercent,
    honeypotLabel,
    ownershipLabel,
    mintLabel,
    blacklistLabel,
    proxyLabel,
    taxModLabel,
    shareUrl,
  ]);

  useEffect(() => {
    setCustomPostText(generatedPostText);
  }, [generatedPostText]);

  const handleCopyPostText = () => {
    navigator.clipboard.writeText(customPostText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  // Render a crisp 1200x675 HD PNG on an offscreen HTML5 Canvas for X/Twitter sharing
  const renderCardToCanvas = (): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 675;
    const ctx = canvas.getContext('2d')!;

    // 1. Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 675);
    bgGrad.addColorStop(0, '#080817');
    bgGrad.addColorStop(0.55, '#101126');
    bgGrad.addColorStop(1, '#15162D');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 675);

    // Subtle top accent bar based on risk severity
    const riskColor =
      report.riskOverview.classification === 'Critical Risk Indicators'
        ? '#EF4444'
        : report.riskOverview.classification === 'High Risk Signals'
          ? '#F97316'
          : report.riskOverview.classification === 'Moderate Risk Signals'
            ? '#F59E0B'
            : report.riskOverview.classification === 'Low Observed Risk'
              ? '#22C55E'
              : '#22D3EE';

    const topBarGrad = ctx.createLinearGradient(0, 0, 1200, 0);
    topBarGrad.addColorStop(0, '#8B5CF6');
    topBarGrad.addColorStop(0.5, riskColor);
    topBarGrad.addColorStop(1, '#22D3EE');
    ctx.fillStyle = topBarGrad;
    ctx.fillRect(0, 0, 1200, 8);

    // Helper for rounded rectangles
    const drawBox = (
      x: number,
      y: number,
      w: number,
      h: number,
      fill: string,
      stroke: string,
      r = 14
    ) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    };

    // 2. Header Row
    ctx.fillStyle = '#A78BFA';
    ctx.font = 'bold 16px Inter, system-ui, sans-serif';
    ctx.fillText('TOKENLENS AI  ·  ON-CHAIN SECURITY & MARKET INTELLIGENCE REPORT', 44, 46);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '14px monospace';
    const scanDateStr = `SCANNED: ${new Date(report.scannedAt).toLocaleString()}`;
    const dateWidth = ctx.measureText(scanDateStr).width;
    ctx.fillText(scanDateStr, 1156 - dateWidth, 46);

    // Token Title & Contract Box
    drawBox(44, 64, 730, 108, '#0B0C1E', '#25274D', 16);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 34px Inter, system-ui, sans-serif';
    const titleStr = `${report.token.name.slice(0, 26)} ($${report.token.symbol.toUpperCase()})`;
    ctx.fillText(titleStr, 68, 112);

    ctx.fillStyle = '#22D3EE';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(
      `${netCfg.name.toUpperCase()}  ·  CA: ${report.token.contractAddress}`,
      68,
      146
    );

    // Risk Classification Box (Top Right)
    drawBox(794, 64, 362, 108, '#0B0C1E', riskColor, 16);
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 13px Inter, system-ui, sans-serif';
    ctx.fillText('OBSERVED RISK CLASSIFICATION', 818, 94);

    ctx.fillStyle = riskColor;
    ctx.font = 'bold 24px Inter, system-ui, sans-serif';
    ctx.fillText(report.riskOverview.classification, 818, 126);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(
      `Risk Score: ${report.riskOverview.riskIndexScore ?? 'N/A'}/100  ·  Crit: ${report.riskOverview.criticalCount}  High: ${report.riskOverview.highCount}  Warn: ${report.riskOverview.moderateCount}`,
      818,
      154
    );

    // 3. ROW 2: MARKET CAP, FDV, PRICE, LIQUIDITY, 24H VOLUME (5 Metric Boxes)
    const metricBoxes = [
      {
        label: 'MARKET CAP (MC)',
        value: mcDisplay,
        sub: `FDV: ${fdvDisplay}`,
        color: '#F8FAFC',
      },
      {
        label: 'TOKEN PRICE (USD)',
        value: priceDisplay,
        sub: `24h Change: ${change24hDisplay}`,
        color:
          (report.market.priceChange24h ?? 0) >= 0 ? '#22C55E' : '#EF4444',
      },
      {
        label: 'TOTAL DEX LIQUIDITY',
        value: formatUsd(report.market.liquidityUsd),
        sub: `${report.market.pairCount} Active Pool(s)`,
        color: '#22D3EE',
      },
      {
        label: '24H DEX VOLUME',
        value: formatUsd(report.market.volume24hUsd),
        sub: `Primary DEX: ${(report.market.primaryDex || 'DEX').toUpperCase()}`,
        color: '#A78BFA',
      },
    ];

    const boxW = 266;
    const gap = 16;
    metricBoxes.forEach((m, idx) => {
      const bx = 44 + idx * (boxW + gap);
      const by = 190;
      drawBox(bx, by, boxW, 106, '#0B0C1E', '#23254A', 14);

      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 12px Inter, system-ui, sans-serif';
      ctx.fillText(m.label, bx + 18, by + 28);

      ctx.fillStyle = m.color;
      ctx.font = 'bold 24px monospace';
      ctx.fillText(m.value.slice(0, 18), bx + 18, by + 62);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '13px monospace';
      ctx.fillText(m.sub.slice(0, 28), bx + 18, by + 88);
    });

    // 4. ROW 3: BUY & SELL RATE / TAXES + ORDER FLOW PRESSURE (Left) & CONTRACT MATRIX (Right)
    // Left Panel: Rate of Buy & Sell (Taxes + 24h Buy/Sell Order Flow)
    drawBox(44, 314, 548, 224, '#0B0C1E', '#25274D', 16);

    ctx.fillStyle = '#22D3EE';
    ctx.font = 'bold 15px Inter, system-ui, sans-serif';
    ctx.fillText('RATE OF BUY & SELL  ·  TAXES & 24H ORDER FLOW', 66, 344);

    // Buy Tax / Sell Tax / Honeypot mini cells
    drawBox(66, 360, 156, 72, '#15162D', '#25274D', 10);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillText('BUY TAX RATE', 82, 382);
    ctx.fillStyle = (report.trading.buyTaxPercent ?? 0) >= 10 ? '#EF4444' : '#22C55E';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(buyTaxStr, 82, 414);

    drawBox(236, 360, 156, 72, '#15162D', '#25274D', 10);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillText('SELL TAX RATE', 252, 382);
    ctx.fillStyle = (report.trading.sellTaxPercent ?? 0) >= 10 ? '#EF4444' : '#22C55E';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(sellTaxStr, 252, 414);

    drawBox(406, 360, 164, 72, '#15162D', '#25274D', 10);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillText('HONEYPOT CHECK', 420, 382);
    ctx.fillStyle =
      report.trading.isHoneypot === true
        ? '#EF4444'
        : report.trading.isHoneypot === false
          ? '#22C55E'
          : '#94A3B8';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(
      report.trading.isHoneypot === true
        ? 'HONEYPOT!'
        : report.trading.isHoneypot === false
          ? 'PASSED'
          : 'UNAVAILABLE',
      420,
      412
    );

    // 24h Buy vs Sell Pressure Bar
    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 14px monospace';
    const buyFlowLabel =
      buys24h !== null && buyRatePercent !== null
        ? `24H BUYS: ${buys24h.toLocaleString()} (${buyRatePercent}%)`
        : '24H BUYS: N/A';
    const sellFlowLabel =
      sells24h !== null && sellRatePercent !== null
        ? `24H SELLS: ${sells24h.toLocaleString()} (${sellRatePercent}%)`
        : '24H SELLS: N/A';

    ctx.fillStyle = '#22C55E';
    ctx.fillText(buyFlowLabel, 66, 462);

    ctx.fillStyle = '#EF4444';
    const sellLabelW = ctx.measureText(sellFlowLabel).width;
    ctx.fillText(sellFlowLabel, 570 - sellLabelW, 462);

    // Bar track
    const barX = 66;
    const barY = 476;
    const barW = 504;
    const barH = 18;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 9);
    ctx.fillStyle = '#EF4444';
    ctx.fill();

    const greenW =
      buyRatePercent !== null ? Math.max(12, Math.min(barW - 12, (buyRatePercent / 100) * barW)) : barW / 2;
    ctx.beginPath();
    ctx.roundRect(barX, barY, greenW, barH, 9);
    ctx.fillStyle = '#22C55E';
    ctx.fill();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px monospace';
    ctx.fillText(
      `Transfer Tax: ${transferTaxStr}  ·  1h Flow: ${report.market.buys1h ?? '-'} Buys / ${report.market.sells1h ?? '-'} Sells`,
      66,
      518
    );

    // Right Panel: Smart Contract Permissions & Holder Concentration
    drawBox(608, 314, 548, 224, '#0B0C1E', '#25274D', 16);
    ctx.fillStyle = '#A78BFA';
    ctx.font = 'bold 15px Inter, system-ui, sans-serif';
    ctx.fillText('SMART CONTRACT PERMISSIONS & HOLDER AUDIT', 630, 344);

    const flags = [
      { k: 'Ownership', v: ownershipLabel, risky: report.permissions.isOwnershipRenounced === false },
      { k: 'Mint Authority', v: mintLabel, risky: report.permissions.isMintable === true },
      { k: 'Blacklist Hook', v: blacklistLabel, risky: report.permissions.hasBlacklist === true },
      { k: 'Contract Type', v: proxyLabel, risky: report.permissions.isProxy === true },
      {
        k: 'Top 10 Holders',
        v:
          report.holders.top10InvestorPercent !== null
            ? `${report.holders.top10InvestorPercent}% Supply`
            : 'Unavailable',
        risky: (report.holders.top10InvestorPercent ?? 0) >= 30,
      },
      {
        k: 'LP Locked / Burn',
        v:
          report.holders.lpLockedPercent !== null
            ? `${report.holders.lpLockedPercent}% Locked`
            : 'Unverified',
        risky: (report.holders.lpLockedPercent ?? 0) < 50,
      },
    ];

    flags.forEach((f, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const fx = 630 + col * 256;
      const fy = 360 + row * 54;
      drawBox(fx, fy, 244, 44, '#15162D', '#23254A', 8);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.fillText(f.k, fx + 12, fy + 18);

      ctx.fillStyle = f.risky ? '#F59E0B' : '#22C55E';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(f.v.slice(0, 20), fx + 12, fy + 36);
    });

    // 5. ROW 4: GEMMA 4 AI VERDICT FOOTER
    drawBox(44, 554, 1112, 92, '#0B0C1E', '#8B5CF6', 14);
    ctx.fillStyle = '#A78BFA';
    ctx.font = 'bold 13px Inter, system-ui, sans-serif';
    ctx.fillText('GEMMA 4 AI SECURITY VERDICT', 66, 580);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '15px Inter, system-ui, sans-serif';
    const summaryClean = report.aiAnalysis.executiveSummary.replace(/\s+/g, ' ').trim();
    const line1 = summaryClean.slice(0, 125);
    const line2 = summaryClean.length > 125 ? summaryClean.slice(125, 240) + (summaryClean.length > 240 ? '...' : '') : '';
    ctx.fillText(line1, 66, 606);
    if (line2) {
      ctx.fillText(line2, 66, 628);
    }

    return canvas;
  };

  const handleCopyCardImage = async () => {
    try {
      const canvas = renderCardToCanvas();
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (!blob) throw new Error('Could not generate image blob');

      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob,
          }),
        ]);
        setCopiedImage(true);
        setImageStatusMsg('HD Scan Card copied to clipboard! Press Ctrl+V / Cmd+V in your X post.');
        setTimeout(() => {
          setCopiedImage(false);
          setImageStatusMsg(null);
        }, 4000);
      } else {
        handleDownloadCardImage();
      }
    } catch {
      // Fallback to downloading PNG if browser restricts clipboard image write
      handleDownloadCardImage();
      setImageStatusMsg('Card downloaded as PNG (attach it directly to your X post).');
      setTimeout(() => setImageStatusMsg(null), 4000);
    }
  };

  const handleDownloadCardImage = () => {
    const canvas = renderCardToCanvas();
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `TokenLens-${report.token.symbol.toUpperCase()}-Security-Scan.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const xIntentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(customPostText)}`;

  return (
    <section
      id="x-share-card-studio"
      className="rounded-2xl bg-[#15162D] border border-[#8B5CF6]/50 p-4 sm:p-6 space-y-5 sm:space-y-6"
    >
      {/* Studio Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#23254A] pb-4">
        <div className="space-y-1">
          <div className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-[#22D3EE]">
            Social Security Intelligence Card · Ready for X (Twitter)
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#F8FAFC]">
            Copy &amp; Post Full Token Scan Result on X
          </h3>
          <p className="text-xs text-[#94A3B8]">
            Includes Market Cap (MC), FDV, Price, Liquidity, Buy/Sell Tax Rates, 24h Buy vs Sell
            Order Flow, Smart Contract Flags, and Gemma 4 AI Verdict.
          </p>
        </div>

        {/* Primary Action Bar */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 shrink-0 w-full lg:w-auto">
          <button
            type="button"
            onClick={handleCopyCardImage}
            className="px-3 py-2 rounded-xl bg-[#0B0C1E] hover:bg-[#1E2040] border border-[#25274D] text-xs font-semibold text-[#F8FAFC] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedImage ? (
              <>
                <Check className="w-4 h-4 text-[#22C55E] shrink-0" />
                <span className="text-[#22C55E]">Image Copied!</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4 text-[#22D3EE] shrink-0" />
                <span>Copy Card Image</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadCardImage}
            className="px-3 py-2 rounded-xl bg-[#0B0C1E] hover:bg-[#1E2040] border border-[#25274D] text-xs font-semibold text-[#F8FAFC] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#A78BFA] shrink-0" />
            <span>Download PNG</span>
          </button>

          <button
            type="button"
            onClick={handleCopyPostText}
            className="px-3 py-2 rounded-xl bg-[#0B0C1E] hover:bg-[#1E2040] border border-[#8B5CF6]/60 text-xs font-semibold text-[#F8FAFC] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedText ? (
              <>
                <Check className="w-4 h-4 text-[#22C55E] shrink-0" />
                <span className="text-[#22C55E]">Post Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#A78BFA] shrink-0" />
                <span>Copy X Text</span>
              </>
            )}
          </button>

          <a
            href={xIntentUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              handleCopyCardImage().catch(() => {});
            }}
            className="px-3.5 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Post on X</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </a>
        </div>
      </div>

      {imageStatusMsg && (
        <div className="p-3 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/40 text-xs text-[#22C55E] font-medium">
          {imageStatusMsg}
        </div>
      )}

      {/* Main Split: Left = Visual X Snapshot Card | Right = Formatted X Post Text Editor */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 Cols): LIVE VISUAL X SNAPSHOT CARD */}
        <div className="xl:col-span-7 rounded-2xl bg-[#080817] border border-[#2A2D5A] overflow-hidden shadow-2xl">
          {/* Top Gradient Accent Bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#8B5CF6] via-[#22D3EE] to-[#22C55E]" />

          <div className="p-5 sm:p-6 space-y-5">
            {/* Card Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#94A3B8] border-b border-[#1E2040] pb-3">
              <span className="text-[#A78BFA] font-semibold">
                TOKENLENS AI · SECURITY &amp; MARKET SCAN CARD
              </span>
              <span>
                {netCfg.name} · {new Date(report.scannedAt).toLocaleDateString()}
              </span>
            </div>

            {/* Token Identity + Risk Verdict Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#101126] border border-[#23254A] rounded-xl p-4">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg sm:text-xl font-bold text-[#F8FAFC]">
                    {report.token.name}
                  </span>
                  <span className="text-sm font-mono font-bold text-[#22D3EE]">
                    ${report.token.symbol.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs font-mono text-[#94A3B8] break-all">
                  CA: <span className="text-[#F8FAFC]">{report.token.contractAddress}</span>
                </div>
              </div>

              <div className="shrink-0 sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-[#1E2040]">
                <div className="text-[11px] text-[#94A3B8]">Risk Verdict</div>
                <div className={`text-sm sm:text-base font-bold flex sm:justify-end items-center gap-1.5 ${classStyle.text}`}>
                  {report.riskOverview.classification === 'Critical Risk Indicators' ||
                  report.riskOverview.classification === 'High Risk Signals' ? (
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                  ) : report.riskOverview.classification === 'Moderate Risk Signals' ? (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  ) : report.riskOverview.classification === 'Low Observed Risk' ? (
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                  ) : (
                    <HelpCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{report.riskOverview.classification}</span>
                </div>
                <div className="text-[11px] font-mono text-[#94A3B8] mt-0.5">
                  Risk Score: <strong className="text-[#F8FAFC]">{report.riskOverview.riskIndexScore ?? 'N/A'}/100</strong> · Crit: {report.riskOverview.criticalCount} · High: {report.riskOverview.highCount}
                </div>
              </div>
            </div>

            {/* Market Cap, FDV, Price, Liquidity & Volume Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono tabular-nums">
              <div className="p-3 rounded-xl bg-[#101126] border border-[#1E2040]">
                <div className="text-[10px] text-[#94A3B8] uppercase">Market Cap (MC)</div>
                <div className="text-sm sm:text-base font-bold text-[#F8FAFC] mt-0.5">
                  {mcDisplay}
                </div>
                <div className="text-[10px] text-[#A78BFA] mt-0.5">FDV: {fdvDisplay}</div>
              </div>

              <div className="p-3 rounded-xl bg-[#101126] border border-[#1E2040]">
                <div className="text-[10px] text-[#94A3B8] uppercase">Price (USD)</div>
                <div className="text-sm sm:text-base font-bold text-[#F8FAFC] mt-0.5">
                  {priceDisplay}
                </div>
                <div
                  className={`text-[10px] mt-0.5 inline-flex items-center gap-0.5 ${
                    (report.market.priceChange24h ?? 0) >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                  }`}
                >
                  {(report.market.priceChange24h ?? 0) >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>24h: {change24hDisplay}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#101126] border border-[#1E2040]">
                <div className="text-[10px] text-[#94A3B8] uppercase">DEX Liquidity</div>
                <div className="text-sm sm:text-base font-bold text-[#22D3EE] mt-0.5">
                  {formatUsd(report.market.liquidityUsd)}
                </div>
                <div className="text-[10px] text-[#94A3B8] mt-0.5">
                  {report.market.pairCount} Active Pool(s)
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#101126] border border-[#1E2040]">
                <div className="text-[10px] text-[#94A3B8] uppercase">24h Volume</div>
                <div className="text-sm sm:text-base font-bold text-[#F8FAFC] mt-0.5">
                  {formatUsd(report.market.volume24hUsd)}
                </div>
                <div className="text-[10px] text-[#94A3B8] mt-0.5 uppercase">
                  DEX: {report.market.primaryDex || 'N/A'}
                </div>
              </div>
            </div>

            {/* BUY & SELL RATE + TAXES SECTION */}
            <div className="p-4 rounded-xl bg-[#101126] border border-[#23254A] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#22D3EE] uppercase tracking-wider">
                  Rate of Buy &amp; Sell · Taxes &amp; 24h Order Flow
                </span>
                <span className="text-xs font-mono text-[#94A3B8]">
                  Honeypot:{' '}
                  <strong
                    className={
                      report.trading.isHoneypot === true
                        ? 'text-[#EF4444]'
                        : report.trading.isHoneypot === false
                          ? 'text-[#22C55E]'
                          : 'text-[#94A3B8]'
                    }
                  >
                    {honeypotLabel}
                  </strong>
                </span>
              </div>

              {/* Buy Tax / Sell Tax / Transfer Tax / 24h Txn Count */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono tabular-nums text-xs">
                <div className="p-2.5 rounded-lg bg-[#080817] border border-[#1E2040]">
                  <div className="text-[10px] text-[#94A3B8]">Buy Tax Rate</div>
                  <div
                    className={`text-sm font-bold mt-0.5 ${
                      (report.trading.buyTaxPercent ?? 0) >= 10
                        ? 'text-[#EF4444]'
                        : (report.trading.buyTaxPercent ?? 0) > 0
                          ? 'text-[#F59E0B]'
                          : 'text-[#22C55E]'
                    }`}
                  >
                    {buyTaxStr}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#080817] border border-[#1E2040]">
                  <div className="text-[10px] text-[#94A3B8]">Sell Tax Rate</div>
                  <div
                    className={`text-sm font-bold mt-0.5 ${
                      (report.trading.sellTaxPercent ?? 0) >= 10
                        ? 'text-[#EF4444]'
                        : (report.trading.sellTaxPercent ?? 0) > 0
                          ? 'text-[#F59E0B]'
                          : 'text-[#22C55E]'
                    }`}
                  >
                    {sellTaxStr}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#080817] border border-[#1E2040]">
                  <div className="text-[10px] text-[#94A3B8]">24h Buy Txns</div>
                  <div className="text-sm font-bold text-[#22C55E] mt-0.5 inline-flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>
                      {buys24h !== null ? buys24h.toLocaleString() : 'N/A'}
                      {buyRatePercent !== null ? ` (${buyRatePercent}%)` : ''}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#080817] border border-[#1E2040]">
                  <div className="text-[10px] text-[#94A3B8]">24h Sell Txns</div>
                  <div className="text-sm font-bold text-[#EF4444] mt-0.5 inline-flex items-center gap-1">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>
                      {sells24h !== null ? sells24h.toLocaleString() : 'N/A'}
                      {sellRatePercent !== null ? ` (${sellRatePercent}%)` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Visual Buy vs Sell Pressure Bar */}
              {buyRatePercent !== null && sellRatePercent !== null && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#22C55E]">
                      Buy Pressure: {buyRatePercent}% ({buys24h?.toLocaleString()} buys)
                    </span>
                    <span className="text-[#EF4444]">
                      Sell Pressure: {sellRatePercent}% ({sells24h?.toLocaleString()} sells)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-lg bg-[#EF4444]/80 overflow-hidden flex">
                    <div
                      className="h-full bg-[#22C55E] transition-all duration-300"
                      style={{ width: `${Math.max(5, Math.min(95, buyRatePercent))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Smart Contract & Holder Security Checklist */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#101126] border border-[#1E2040] flex items-center justify-between">
                <span className="text-[#94A3B8] font-sans">Ownership:</span>
                <span
                  className={
                    report.permissions.isOwnershipRenounced === true
                      ? 'text-[#22C55E] font-semibold'
                      : 'text-[#F59E0B] font-semibold'
                  }
                >
                  {ownershipLabel}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#101126] border border-[#1E2040] flex items-center justify-between">
                <span className="text-[#94A3B8] font-sans">Minting:</span>
                <span
                  className={
                    report.permissions.isMintable === true
                      ? 'text-[#EF4444] font-semibold'
                      : 'text-[#22C55E] font-semibold'
                  }
                >
                  {mintLabel}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#101126] border border-[#1E2040] flex items-center justify-between">
                <span className="text-[#94A3B8] font-sans">Blacklist:</span>
                <span
                  className={
                    report.permissions.hasBlacklist === true
                      ? 'text-[#F59E0B] font-semibold'
                      : 'text-[#22C55E] font-semibold'
                  }
                >
                  {blacklistLabel}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#101126] border border-[#1E2040] flex items-center justify-between">
                <span className="text-[#94A3B8] font-sans">Contract:</span>
                <span
                  className={
                    report.permissions.isProxy === true
                      ? 'text-[#F59E0B] font-semibold'
                      : 'text-[#22C55E] font-semibold'
                  }
                >
                  {proxyLabel}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#101126] border border-[#1E2040] flex items-center justify-between">
                <span className="text-[#94A3B8] font-sans">Top 10 Holders:</span>
                <span
                  className={
                    (report.holders.top10InvestorPercent ?? 0) >= 30
                      ? 'text-[#F59E0B] font-semibold'
                      : 'text-[#22C55E] font-semibold'
                  }
                >
                  {report.holders.top10InvestorPercent !== null
                    ? `${report.holders.top10InvestorPercent}%`
                    : 'N/A'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#101126] border border-[#1E2040] flex items-center justify-between">
                <span className="text-[#94A3B8] font-sans">LP Lock:</span>
                <span
                  className={
                    (report.holders.lpLockedPercent ?? 0) >= 70
                      ? 'text-[#22C55E] font-semibold'
                      : 'text-[#F59E0B] font-semibold'
                  }
                >
                  {report.holders.lpLockedPercent !== null
                    ? `${report.holders.lpLockedPercent}%`
                    : 'Unverified'}
                </span>
              </div>
            </div>

            {/* Gemma 4 AI Executive Verdict Footer */}
            <div className="p-3.5 rounded-xl bg-[#101126] border border-[#8B5CF6]/40 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#A78BFA] inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gemma 4 Security Takeaway</span>
                </span>
                <span className="font-mono text-[#94A3B8]">
                  Coverage: {report.riskOverview.dataCoveragePercent}%
                </span>
              </div>
              <p className="text-xs text-[#F8FAFC] leading-relaxed line-clamp-2">
                {report.aiAnalysis.executiveSummary}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 Cols): X POST TEXT TEMPLATE & EDITOR */}
        <div className="xl:col-span-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#F8FAFC]">
              Select X Post Style:
            </span>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0B0C1E] border border-[#25274D]">
              {(
                [
                  { id: 'full', label: 'Full Details' },
                  { id: 'compact', label: 'Compact (<280)' },
                  { id: 'pidgin', label: 'Pidgin Alpha' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPostMode(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    postMode === tab.id
                      ? 'bg-[#8B5CF6] text-white'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <textarea
              value={customPostText}
              onChange={(e) => setCustomPostText(e.target.value)}
              rows={15}
              aria-label="Editable X post text with token scan results"
              className="w-full p-4 rounded-xl bg-[#0B0C1E] border border-[#25274D] focus:border-[#8B5CF6] text-xs font-mono text-[#F8FAFC] leading-relaxed focus:outline-none resize-y"
            />
            <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
              <span>{customPostText.length} characters</span>
              <span>Tip: Click &ldquo;Copy Card Image&rdquo; and paste (Ctrl+V) into your X post</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleCopyPostText}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0B0C1E] hover:bg-[#1E2040] border border-[#25274D] text-xs font-semibold text-[#F8FAFC] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {copiedText ? (
                <>
                  <Check className="w-4 h-4 text-[#22C55E]" />
                  <span className="text-[#22C55E]">Copied Post Text!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#A78BFA]" />
                  <span>Copy Post Text</span>
                </>
              )}
            </button>

            <a
              href={xIntentUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                handleCopyCardImage().catch(() => {});
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors"
            >
              <span>Post on X Now</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
