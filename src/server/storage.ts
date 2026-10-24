import fs from 'fs';
import path from 'path';
import {
  NetworkId,
  SUPPORTED_NETWORKS,
  TokenScanReport,
  PlatformStats,
  ContractPermissions,
  TradingSimulation,
} from '../types/tokenlens.ts';
import { validateContractAddress, fetchOnChainMetadata } from './providers/rpcProvider.ts';
import { fetchGoPlusSecurity } from './providers/goplusProvider.ts';
import { fetchHoneypotSimulation } from './providers/honeypotProvider.ts';
import { fetchDexScreenerMarket } from './providers/dexScreenerProvider.ts';
import { evaluateDeterministicRisk } from './riskEngine.ts';
import { generateGemmaSecurityExplanation } from './gemmaService.ts';
import { getSyntheticDemoReports } from './demoReports.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'tokenlens-scans.json');

interface DatabaseShape {
  liveReports: TokenScanReport[];
}

let memoryStore: DatabaseShape = {
  liveReports: [],
};

function loadDatabase(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseShape;
      if (Array.isArray(parsed?.liveReports)) {
        memoryStore.liveReports = parsed.liveReports;
      }
    }
  } catch (err) {
    console.warn('Could not load local scan store, initializing empty:', err);
  }
}

function saveDatabase(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist local scan store:', err);
  }
}

loadDatabase();

export function getAllLiveReports(): TokenScanReport[] {
  return [...memoryStore.liveReports].sort(
    (a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
  );
}

export function getReportById(scanId: string): TokenScanReport | null {
  const demoReports = getSyntheticDemoReports();
  const demoMatch = demoReports.find((d) => d.scanId === scanId);
  if (demoMatch) return demoMatch;

  return memoryStore.liveReports.find((r) => r.scanId === scanId) || null;
}

export function getPlatformStats(): PlatformStats {
  const live = memoryStore.liveReports;
  const totalScansPerformed = live.length;

  // Count distinct tokens with High or Critical or Moderate risk indicators
  const tokensWithRiskSet = new Set<string>();
  let criticalFindingsIdentified = 0;

  for (const report of live) {
    const key = `${report.token.networkId}:${report.token.contractAddress.toLowerCase()}`;
    if (
      report.riskOverview.criticalCount > 0 ||
      report.riskOverview.highCount > 0 ||
      report.riskOverview.moderateCount > 0
    ) {
      tokensWithRiskSet.add(key);
    }
    criticalFindingsIdentified +=
      report.riskOverview.criticalCount + report.riskOverview.highCount;
  }

  const allNetworks = Object.values(SUPPORTED_NETWORKS);
  const mvpNetworks = allNetworks.filter((n) => n.tier === 'MVP');

  return {
    totalScansPerformed,
    tokensWithRiskIndicators: tokensWithRiskSet.size,
    criticalFindingsIdentified,
    supportedNetworksCount: allNetworks.length,
    mvpNetworksCount: mvpNetworks.length,
    lastScanTimestamp: live[0]?.scannedAt || null,
  };
}

export async function executeLiveTokenScan(params: {
  networkId: NetworkId;
  contractAddress: string;
  forceRescan?: boolean;
}): Promise<TokenScanReport> {
  const startTime = Date.now();
  const { networkId, forceRescan = false } = params;

  const validation = validateContractAddress(networkId, params.contractAddress);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid contract address.');
  }

  const normalizedAddress = validation.normalizedAddress;
  const net = SUPPORTED_NETWORKS[networkId];

  // Check recent cached scan (within 5 minutes) unless forceRescan is true
  if (!forceRescan) {
    const existing = memoryStore.liveReports.find(
      (r) =>
        r.token.networkId === networkId &&
        r.token.contractAddress.toLowerCase() === normalizedAddress.toLowerCase() &&
        Date.now() - new Date(r.scannedAt).getTime() < 5 * 60 * 1000
    );
    if (existing) {
      return existing;
    }
  }

  // Execute all 4 providers in parallel with individual error resilience
  const [onChain, goplus, honeypot, dex] = await Promise.all([
    fetchOnChainMetadata(networkId, normalizedAddress),
    fetchGoPlusSecurity(networkId, normalizedAddress),
    fetchHoneypotSimulation(networkId, normalizedAddress),
    fetchDexScreenerMarket(networkId, normalizedAddress),
  ]);

  // Reconcile Token Metadata across On-Chain RPC, GoPlus, and DEX Screener
  const tokenName =
    onChain.name ||
    goplus.tokenName ||
    dex.tokenName ||
    `Unverified Contract (${normalizedAddress.slice(0, 6)}...${normalizedAddress.slice(-4)})`;

  const tokenSymbol =
    onChain.symbol || goplus.tokenSymbol || dex.tokenSymbol || 'UNKNOWN';

  const decimals = onChain.decimals ?? (net.isEvm ? 18 : 9);
  const totalSupplyFormatted = onChain.totalSupplyFormatted || goplus.totalSupply || null;

  // Merge permissions from GoPlus + On-Chain RPC owner fallback
  const mergedOwner = goplus.permissions.ownerAddress ?? onChain.ownerAddress ?? null;
  const isZeroOwner =
    mergedOwner !== null &&
    (mergedOwner.toLowerCase() === '0x0000000000000000000000000000000000000000' ||
      mergedOwner.toLowerCase() === '0x000000000000000000000000000000000000dead');

  const permissions: ContractPermissions = {
    ...goplus.permissions,
    ownerAddress: mergedOwner,
    isOwnershipRenounced:
      goplus.permissions.isOwnershipRenounced !== null
        ? goplus.permissions.isOwnershipRenounced
        : mergedOwner !== null
          ? isZeroOwner
          : null,
  };

  // Merge Trading Simulation from Honeypot.is + GoPlus fallback
  const trading: TradingSimulation = {
    isHoneypot:
      honeypot.simulation.isHoneypot !== null
        ? honeypot.simulation.isHoneypot
        : goplus.isHoneypotFlag,
    honeypotReason: honeypot.simulation.honeypotReason,
    buyTaxPercent:
      honeypot.simulation.buyTaxPercent !== null
        ? honeypot.simulation.buyTaxPercent
        : goplus.buyTaxPercent,
    sellTaxPercent:
      honeypot.simulation.sellTaxPercent !== null
        ? honeypot.simulation.sellTaxPercent
        : goplus.sellTaxPercent,
    transferTaxPercent: honeypot.simulation.transferTaxPercent,
    buyGasUsed: honeypot.simulation.buyGasUsed,
    sellGasUsed: honeypot.simulation.sellGasUsed,
    simulationSupported: honeypot.simulation.simulationSupported || goplus.isHoneypotFlag !== null,
    source:
      honeypot.provenance.status === 'success'
        ? 'Honeypot.is v2 & GoPlus Security'
        : goplus.provenance.status === 'success'
          ? 'GoPlus Security'
          : honeypot.simulation.source,
  };

  // Run Deterministic Risk Engine
  const { findings, riskOverview } = evaluateDeterministicRisk({
    networkId,
    contractAddress: normalizedAddress,
    onChain,
    permissions,
    trading,
    market: dex.market,
    holders: goplus.holders,
  });

  // Generate Grounded Gemma 4 AI Explanation
  const aiAnalysis = await generateGemmaSecurityExplanation({
    networkId,
    contractAddress: normalizedAddress,
    tokenName,
    tokenSymbol,
    riskOverview,
    findings,
  });

  const scanId = `scan-${networkId}-${normalizedAddress.slice(0, 8).toLowerCase()}-${Date.now()}`;

  const report: TokenScanReport = {
    scanId,
    isDemo: false,
    token: {
      networkId,
      chainId: net.chainId,
      contractAddress: normalizedAddress,
      name: tokenName,
      symbol: tokenSymbol,
      decimals,
      totalSupplyFormatted,
      logoUrl: dex.logoUrl,
      isContractVerifiedOnChain: onChain.isContractDeployed,
    },
    scannedAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    riskOverview,
    permissions,
    trading,
    market: dex.market,
    holders: goplus.holders,
    findings,
    providers: [
      onChain.provenance,
      goplus.provenance,
      honeypot.provenance,
      dex.provenance,
    ],
    aiAnalysis,
  };

  // Prepend to liveReports (keep latest 100 scans)
  memoryStore.liveReports = [
    report,
    ...memoryStore.liveReports.filter(
      (r) =>
        !(
          r.token.networkId === networkId &&
          r.token.contractAddress.toLowerCase() === normalizedAddress.toLowerCase()
        )
    ),
  ].slice(0, 100);

  saveDatabase();
  return report;
}

// Seed real live blockchain scans on first startup if database is empty
export async function ensureInitialRealScansSeeded(): Promise<void> {
  if (memoryStore.liveReports.length > 0) return;

  const initialRealTokens: { networkId: NetworkId; address: string }[] = [
    // Tether USDT on Ethereum (has blacklist + pause + active owner -> great real risk signals!)
    { networkId: 'ethereum', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
    // Pepe on Ethereum (renounced ownership, 0% tax, deep liquidity)
    { networkId: 'ethereum', address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933' },
    // USDC on Base (proxy contract + blacklist capability)
    { networkId: 'base', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
    // PancakeSwap CAKE on BNB Smart Chain
    { networkId: 'bsc', address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82' },
  ];

  for (const item of initialRealTokens) {
    try {
      await executeLiveTokenScan({
        networkId: item.networkId,
        contractAddress: item.address,
      });
    } catch (err) {
      console.warn(`Initial live scan failed for ${item.address}:`, err);
    }
  }
}
