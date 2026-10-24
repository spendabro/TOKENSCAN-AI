import { SeverityLevel, RiskClassification } from '../types/tokenlens.ts';

export function formatUsd(val: number | null | undefined, compact = true): string {
  if (val === null || val === undefined || Number.isNaN(val)) return 'Unavailable';
  if (val === 0) return '$0.00';

  if (!compact) {
    if (val < 0.0001) return `$${val.toExponential(2)}`;
    if (val < 1) return `$${val.toFixed(6)}`;
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  if (val >= 1_000_000_000) {
    return `$${(val / 1_000_000_000).toFixed(2)}B`;
  }
  if (val >= 1_000_000) {
    return `$${(val / 1_000_000).toFixed(2)}M`;
  }
  if (val >= 1_000) {
    return `$${(val / 1_000).toFixed(2)}K`;
  }
  if (val < 0.0001) {
    return `$${val.toFixed(7)}`;
  }
  if (val < 1) {
    return `$${val.toFixed(4)}`;
  }
  return `$${val.toFixed(2)}`;
}

export function formatTokenPrice(price: number | null | undefined): string {
  if (price === null || price === undefined || Number.isNaN(price)) return 'Unavailable';
  if (price === 0) return '$0.00';
  if (price < 0.000001) return `$${price.toExponential(3)}`;
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function shortenAddress(addr: string | null | undefined, chars = 6): string {
  if (!addr) return 'Unknown';
  if (addr.length <= chars * 2 + 2) return addr;
  return `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}`;
}

export function formatRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export function getSeverityStyles(severity: SeverityLevel): {
  text: string;
  bg: string;
  border: string;
  label: string;
} {
  switch (severity) {
    case 'Critical':
      return {
        text: 'text-[#EF4444]',
        bg: 'bg-[#EF4444]/10',
        border: 'border-[#EF4444]/30',
        label: 'CRITICAL RISK',
      };
    case 'High':
      return {
        text: 'text-[#F97316]',
        bg: 'bg-[#F97316]/10',
        border: 'border-[#F97316]/30',
        label: 'HIGH RISK',
      };
    case 'Moderate':
      return {
        text: 'text-[#F59E0B]',
        bg: 'bg-[#F59E0B]/10',
        border: 'border-[#F59E0B]/30',
        label: 'MODERATE WARNING',
      };
    case 'Low':
      return {
        text: 'text-[#22C55E]',
        bg: 'bg-[#22C55E]/10',
        border: 'border-[#22C55E]/30',
        label: 'LOW OBSERVED RISK',
      };
    case 'Informational':
      return {
        text: 'text-[#22D3EE]',
        bg: 'bg-[#22D3EE]/10',
        border: 'border-[#22D3EE]/30',
        label: 'INFORMATIONAL',
      };
    case 'Unknown':
    default:
      return {
        text: 'text-[#94A3B8]',
        bg: 'bg-[#94A3B8]/10',
        border: 'border-[#94A3B8]/30',
        label: 'UNVERIFIED / MISSING',
      };
  }
}

export function getClassificationStyles(classification: RiskClassification): {
  text: string;
  bg: string;
  border: string;
  shortLabel: string;
} {
  switch (classification) {
    case 'Critical Risk Indicators':
      return {
        text: 'text-[#EF4444]',
        bg: 'bg-[#EF4444]/10',
        border: 'border-[#EF4444]/30',
        shortLabel: 'Critical Indicators',
      };
    case 'High Risk Signals':
      return {
        text: 'text-[#F97316]',
        bg: 'bg-[#F97316]/10',
        border: 'border-[#F97316]/30',
        shortLabel: 'High Risk Signals',
      };
    case 'Moderate Risk Signals':
      return {
        text: 'text-[#F59E0B]',
        bg: 'bg-[#F59E0B]/10',
        border: 'border-[#F59E0B]/30',
        shortLabel: 'Moderate Signals',
      };
    case 'Low Observed Risk':
      return {
        text: 'text-[#22C55E]',
        bg: 'bg-[#22C55E]/10',
        border: 'border-[#22C55E]/30',
        shortLabel: 'Low Observed Risk',
      };
    case 'Insufficient Data':
    default:
      return {
        text: 'text-[#94A3B8]',
        bg: 'bg-[#94A3B8]/10',
        border: 'border-[#94A3B8]/30',
        shortLabel: 'Insufficient Data',
      };
  }
}

export const CURATED_QUICK_TOKENS: {
  label: string;
  symbol: string;
  networkId: 'ethereum' | 'bsc' | 'base';
  address: string;
  note: string;
}[] = [
  {
    label: 'Tether USD',
    symbol: 'USDT',
    networkId: 'ethereum',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    note: 'Centralized stablecoin with blacklist & pause authority',
  },
  {
    label: 'Pepe',
    symbol: 'PEPE',
    networkId: 'ethereum',
    address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
    note: 'Renounced ownership, 0% tax, deep Uniswap liquidity',
  },
  {
    label: 'USD Coin (Base)',
    symbol: 'USDC',
    networkId: 'base',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    note: 'Upgradeable proxy contract with compliance controls',
  },
  {
    label: 'PancakeSwap Token',
    symbol: 'CAKE',
    networkId: 'bsc',
    address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
    note: 'BNB Smart Chain ecosystem token with mint authority',
  },
  {
    label: 'Uniswap',
    symbol: 'UNI',
    networkId: 'ethereum',
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    note: 'Governance token on Ethereum Mainnet',
  },
];
