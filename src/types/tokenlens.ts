import { z } from 'zod';

export type NetworkId =
  | 'ethereum'
  | 'bsc'
  | 'base'
  | 'arbitrum'
  | 'polygon'
  | 'solana'
  | 'hyperliquid';

export interface NetworkConfig {
  id: NetworkId;
  chainId: string;
  numericChainId?: number;
  name: string;
  shortName: string;
  nativeCurrency: string;
  explorerUrl: string;
  explorerName: string;
  goplusChainId: string;
  dexScreenerId: string;
  honeypotSupported: boolean;
  rpcSupported: boolean;
  isEvm: boolean;
  tier: 'MVP' | 'Expansion';
  badgeColor: string;
}

export const SUPPORTED_NETWORKS: Record<NetworkId, NetworkConfig> = {
  ethereum: {
    id: 'ethereum',
    chainId: '1',
    numericChainId: 1,
    name: 'Ethereum Mainnet',
    shortName: 'ETH',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://etherscan.io',
    explorerName: 'Etherscan',
    goplusChainId: '1',
    dexScreenerId: 'ethereum',
    honeypotSupported: true,
    rpcSupported: true,
    isEvm: true,
    tier: 'MVP',
    badgeColor: '#627EEA',
  },
  bsc: {
    id: 'bsc',
    chainId: '56',
    numericChainId: 56,
    name: 'BNB Smart Chain',
    shortName: 'BNB',
    nativeCurrency: 'BNB',
    explorerUrl: 'https://bscscan.com',
    explorerName: 'BscScan',
    goplusChainId: '56',
    dexScreenerId: 'bsc',
    honeypotSupported: true,
    rpcSupported: true,
    isEvm: true,
    tier: 'MVP',
    badgeColor: '#F3BA2F',
  },
  base: {
    id: 'base',
    chainId: '8453',
    numericChainId: 8453,
    name: 'Base',
    shortName: 'BASE',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://basescan.org',
    explorerName: 'BaseScan',
    goplusChainId: '8453',
    dexScreenerId: 'base',
    honeypotSupported: true,
    rpcSupported: true,
    isEvm: true,
    tier: 'MVP',
    badgeColor: '#0052FF',
  },
  arbitrum: {
    id: 'arbitrum',
    chainId: '42161',
    numericChainId: 42161,
    name: 'Arbitrum One',
    shortName: 'ARB',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://arbiscan.io',
    explorerName: 'Arbiscan',
    goplusChainId: '42161',
    dexScreenerId: 'arbitrum',
    honeypotSupported: false,
    rpcSupported: true,
    isEvm: true,
    tier: 'Expansion',
    badgeColor: '#28A0F0',
  },
  polygon: {
    id: 'polygon',
    chainId: '137',
    numericChainId: 137,
    name: 'Polygon PoS',
    shortName: 'POL',
    nativeCurrency: 'POL',
    explorerUrl: 'https://polygonscan.com',
    explorerName: 'PolygonScan',
    goplusChainId: '137',
    dexScreenerId: 'polygon',
    honeypotSupported: false,
    rpcSupported: true,
    isEvm: true,
    tier: 'Expansion',
    badgeColor: '#8247E5',
  },
  solana: {
    id: 'solana',
    chainId: 'solana',
    name: 'Solana',
    shortName: 'SOL',
    nativeCurrency: 'SOL',
    explorerUrl: 'https://solscan.io',
    explorerName: 'Solscan',
    goplusChainId: 'solana',
    dexScreenerId: 'solana',
    honeypotSupported: false,
    rpcSupported: false,
    isEvm: false,
    tier: 'Expansion',
    badgeColor: '#14F195',
  },
  hyperliquid: {
    id: 'hyperliquid',
    chainId: '999',
    numericChainId: 999,
    name: 'Hyperliquid (HyperEVM / Spot)',
    shortName: 'HYPE',
    nativeCurrency: 'HYPE',
    explorerUrl: 'https://hyperevmscan.io',
    explorerName: 'HyperEVMScan',
    goplusChainId: '999',
    dexScreenerId: 'hyperliquid',
    honeypotSupported: false,
    rpcSupported: true,
    isEvm: true,
    tier: 'Expansion',
    badgeColor: '#50D2C1',
  },
};

export type SeverityLevel =
  | 'Informational'
  | 'Low'
  | 'Moderate'
  | 'High'
  | 'Critical'
  | 'Unknown';

export type EvidenceNature =
  | 'Verified Observation'
  | 'Third-Party Assessment'
  | 'Heuristic Indicator'
  | 'Missing / Unverified Data';

export type FindingCategory =
  | 'Smart Contract Security'
  | 'Trading Restrictions'
  | 'Liquidity Analysis'
  | 'Holder Concentration'
  | 'Market Information';

export interface SecurityFinding {
  id: string;
  category: FindingCategory;
  title: string;
  severity: SeverityLevel;
  status: EvidenceNature;
  explanation: string;
  beginnerExplanation: string;
  evidence: Record<string, string | number | boolean | null>;
  source: string;
  observedAt: string;
  confidence: 'High' | 'Medium' | 'Low' | 'Unavailable';
  recommendedAction: string;
}

export interface ProviderProvenance {
  provider: 'On-Chain RPC (viem)' | 'GoPlus Security' | 'Honeypot.is' | 'DEX Screener';
  status: 'success' | 'partial' | 'unsupported' | 'unavailable' | 'error';
  latencyMs?: number;
  observedAt: string;
  note: string;
}

export interface LiquidityPoolInfo {
  pairAddress: string;
  dexId: string;
  baseTokenSymbol: string;
  quoteTokenSymbol: string;
  priceUsd: number | null;
  liquidityUsd: number;
  volume24hUsd: number;
  buys24h?: number | null;
  sells24h?: number | null;
  pairCreatedAt: string | null;
  url?: string;
}

export interface HolderEntry {
  address: string;
  tag: string;
  percent: number;
  isContract: boolean;
  isLocked: boolean;
  category: 'Investor / Unidentified' | 'Burn / Dead Address' | 'Liquidity Pool / Contract' | 'Creator / Owner';
}

export interface ContractPermissions {
  isOpenSource: boolean | null;
  isProxy: boolean | null;
  isMintable: boolean | null;
  ownerAddress: string | null;
  isOwnershipRenounced: boolean | null;
  canTakeBackOwnership: boolean | null;
  hasBlacklist: boolean | null;
  hasWhitelist: boolean | null;
  isTransferPausable: boolean | null;
  canModifyTax: boolean | null;
  hasSelfDestruct: boolean | null;
  hasExternalCall: boolean | null;
  hasAntiWhale: boolean | null;
  hasTradingCooldown: boolean | null;
  cannotBuy: boolean | null;
  cannotSellAll: boolean | null;
}

export interface TradingSimulation {
  isHoneypot: boolean | null;
  honeypotReason: string | null;
  buyTaxPercent: number | null;
  sellTaxPercent: number | null;
  transferTaxPercent: number | null;
  buyGasUsed: number | null;
  sellGasUsed: number | null;
  simulationSupported: boolean;
  source: string;
}

export interface MarketSnapshotData {
  priceUsd: number | null;
  priceChange24h: number | null;
  priceChange6h: number | null;
  priceChange1h: number | null;
  priceChange5m?: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  volume6hUsd?: number | null;
  volume1hUsd?: number | null;
  volume5mUsd?: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  buys24h?: number | null;
  sells24h?: number | null;
  buys6h?: number | null;
  sells6h?: number | null;
  buys1h?: number | null;
  sells1h?: number | null;
  buys5m?: number | null;
  sells5m?: number | null;
  buyPressure24hPercent?: number | null;
  pairCount: number;
  oldestPairCreatedAt: string | null;
  primaryDex: string | null;
  pools: LiquidityPoolInfo[];
}

export interface HolderAnalysisData {
  totalHolders: number | null;
  lpHolderCount: number | null;
  top10InvestorPercent: number | null;
  burnPercent: number | null;
  lpLockedPercent: number | null;
  creatorAddress: string | null;
  creatorPercent: number | null;
  topHolders: HolderEntry[];
  dataComplete: boolean;
}

// Zod Schema for Gemma 4 Structured Response
export const AIAnalysisSchema = z.object({
  executiveSummary: z.string().min(10),
  overallAssessment: z.string().min(10),
  simpleEnglishSummary: z.string().min(10),
  pidginSummary: z.string().min(10),
  keyFindings: z.array(
    z.object({
      title: z.string(),
      explanation: z.string(),
      severity: z.enum(['Informational', 'Low', 'Moderate', 'High', 'Critical', 'Unknown']),
      evidenceId: z.string(),
    })
  ),
  evidenceReferences: z.array(z.string()),
  uncertaintyNotes: z.array(z.string()),
  suggestedVerificationSteps: z.array(z.string()),
  glossary: z.array(
    z.object({
      term: z.string(),
      definition: z.string(),
    })
  ),
});

export type AIAnalysisOutput = z.infer<typeof AIAnalysisSchema>;

export type RiskClassification =
  | 'Low Observed Risk'
  | 'Moderate Risk Signals'
  | 'High Risk Signals'
  | 'Critical Risk Indicators'
  | 'Insufficient Data';

export interface RiskOverviewMetrics {
  classification: RiskClassification;
  riskIndexScore: number | null; // 0-100 where higher means higher risk, or null if insufficient data
  safetyIndexScore: number | null; // 0-100 where 100 means fewest observed risk signals
  methodologyNote: string;
  dataCoveragePercent: number;
  completedChecks: number;
  unavailableChecks: number;
  criticalCount: number;
  highCount: number;
  moderateCount: number;
  lowOrInfoCount: number;
  unknownCount: number;
  categoryBreakdown: {
    category: FindingCategory;
    riskLevel: SeverityLevel;
    weightPercent: number;
    completedChecks: number;
    totalChecks: number;
  }[];
}

export interface TokenScanReport {
  scanId: string;
  isDemo: boolean;
  demoScenarioLabel?: string;
  token: {
    networkId: NetworkId;
    chainId: string;
    contractAddress: string;
    name: string;
    symbol: string;
    decimals: number | null;
    totalSupplyFormatted: string | null;
    logoUrl?: string | null;
    isContractVerifiedOnChain: boolean | null;
  };
  scannedAt: string;
  durationMs: number;
  riskOverview: RiskOverviewMetrics;
  permissions: ContractPermissions;
  trading: TradingSimulation;
  market: MarketSnapshotData;
  holders: HolderAnalysisData;
  findings: SecurityFinding[];
  providers: ProviderProvenance[];
  aiAnalysis: AIAnalysisOutput & {
    modelUsed: string;
    generatedAt: string;
    isFallbackTemplate: boolean;
  };
}

export interface PlatformStats {
  totalScansPerformed: number;
  tokensWithRiskIndicators: number;
  criticalFindingsIdentified: number;
  supportedNetworksCount: number;
  mvpNetworksCount: number;
  lastScanTimestamp: string | null;
}

export interface TokenSearchCandidate {
  networkId: NetworkId;
  chainId: string;
  contractAddress: string;
  name: string;
  symbol: string;
  priceUsd: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  dexId: string;
  pairAddress: string;
}

export type PriceAlertCondition = 'above' | 'below';

export interface PriceAlert {
  id: string;
  scanId?: string;
  networkId: NetworkId;
  contractAddress: string;
  tokenName: string;
  tokenSymbol: string;
  condition: PriceAlertCondition;
  targetPriceUsd: number;
  baselinePriceUsd: number;
  lastCheckedPriceUsd: number | null;
  lastCheckedAt: string | null;
  status: 'active' | 'triggered';
  triggeredAt: string | null;
  triggeredPriceUsd: number | null;
  createdAt: string;
  note?: string;
  unreadNotification?: boolean;
}

