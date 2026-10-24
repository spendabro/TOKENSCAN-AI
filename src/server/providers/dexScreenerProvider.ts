import {
  type NetworkId,
  SUPPORTED_NETWORKS,
  type MarketSnapshotData,
  type LiquidityPoolInfo,
  type ProviderProvenance,
  type TokenSearchCandidate,
} from '../../types/tokenlens.ts';

export interface DexScreenerNormalizedResult {
  tokenName: string | null;
  tokenSymbol: string | null;
  logoUrl: string | null;
  market: MarketSnapshotData;
  provenance: ProviderProvenance;
}

export async function fetchDexScreenerMarket(
  networkId: NetworkId,
  contractAddress: string
): Promise<DexScreenerNormalizedResult> {
  const startTime = Date.now();
  const net = SUPPORTED_NETWORKS[networkId];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  const emptyMarket: MarketSnapshotData = {
    priceUsd: null,
    priceChange24h: null,
    priceChange6h: null,
    priceChange1h: null,
    liquidityUsd: null,
    volume24hUsd: null,
    marketCapUsd: null,
    fdvUsd: null,
    pairCount: 0,
    oldestPairCreatedAt: null,
    primaryDex: null,
    pools: [],
  };

  try {
    const url = `https://api.dexscreener.com/token-pairs/v1/${net.dexScreenerId}/${encodeURIComponent(
      contractAddress
    )}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        tokenName: null,
        tokenSymbol: null,
        logoUrl: null,
        market: emptyMarket,
        provenance: {
          provider: 'DEX Screener',
          status: 'error',
          latencyMs: Date.now() - startTime,
          observedAt: new Date().toISOString(),
          note: `DEX Screener returned HTTP ${response.status}.`,
        },
      };
    }

    const rawData = await response.json();
    const pairs: any[] = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData?.pairs)
        ? rawData.pairs
        : [];

    if (pairs.length === 0) {
      return {
        tokenName: null,
        tokenSymbol: null,
        logoUrl: null,
        market: emptyMarket,
        provenance: {
          provider: 'DEX Screener',
          status: 'unavailable',
          latencyMs: Date.now() - startTime,
          observedAt: new Date().toISOString(),
          note: `No active decentralized exchange trading pairs found on ${net.name} via DEX Screener.`,
        },
      };
    }

    // Sort pairs by USD liquidity descending
    const sortedPairs = [...pairs].sort(
      (a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0)
    );

    const primaryPair = sortedPairs[0];
    const isBaseTarget =
      String(primaryPair?.baseToken?.address || '').toLowerCase() ===
      contractAddress.toLowerCase();
    const targetTokenObj = isBaseTarget ? primaryPair?.baseToken : primaryPair?.quoteToken;

    let totalLiquidityUsd = 0;
    let totalVolume24hUsd = 0;
    let oldestTimestampMs: number | null = null;

    const pools: LiquidityPoolInfo[] = sortedPairs.slice(0, 8).map((p) => {
      const liq = Number(p?.liquidity?.usd || 0);
      const vol = Number(p?.volume?.h24 || 0);
      totalLiquidityUsd += liq;
      totalVolume24hUsd += vol;

      if (p?.pairCreatedAt && typeof p.pairCreatedAt === 'number') {
        if (oldestTimestampMs === null || p.pairCreatedAt < oldestTimestampMs) {
          oldestTimestampMs = p.pairCreatedAt;
        }
      }

      return {
        pairAddress: String(p?.pairAddress || ''),
        dexId: String(p?.dexId || 'DEX'),
        baseTokenSymbol: String(p?.baseToken?.symbol || '?'),
        quoteTokenSymbol: String(p?.quoteToken?.symbol || '?'),
        priceUsd: p?.priceUsd ? Number(p.priceUsd) : null,
        liquidityUsd: Number(liq.toFixed(2)),
        volume24hUsd: Number(vol.toFixed(2)),
        pairCreatedAt:
          p?.pairCreatedAt && typeof p.pairCreatedAt === 'number'
            ? new Date(p.pairCreatedAt).toISOString()
            : null,
        url: p?.url || undefined,
      };
    });

    // Aggregate remaining pairs' liquidity/volume if more than 8 pairs
    for (let i = 8; i < sortedPairs.length; i++) {
      totalLiquidityUsd += Number(sortedPairs[i]?.liquidity?.usd || 0);
      totalVolume24hUsd += Number(sortedPairs[i]?.volume?.h24 || 0);
    }

    // Keep Market Cap and FDV strictly distinct per Section 8E
    const marketCapUsd =
      primaryPair?.marketCap !== undefined && primaryPair?.marketCap !== null
        ? Number(primaryPair.marketCap)
        : null;
    const fdvUsd =
      primaryPair?.fdv !== undefined && primaryPair?.fdv !== null
        ? Number(primaryPair.fdv)
        : null;

    return {
      tokenName: targetTokenObj?.name || primaryPair?.baseToken?.name || null,
      tokenSymbol: targetTokenObj?.symbol || primaryPair?.baseToken?.symbol || null,
      logoUrl: primaryPair?.info?.imageUrl || null,
      market: {
        priceUsd: primaryPair?.priceUsd ? Number(primaryPair.priceUsd) : null,
        priceChange24h:
          primaryPair?.priceChange?.h24 !== undefined
            ? Number(primaryPair.priceChange.h24)
            : null,
        priceChange6h:
          primaryPair?.priceChange?.h6 !== undefined
            ? Number(primaryPair.priceChange.h6)
            : null,
        priceChange1h:
          primaryPair?.priceChange?.h1 !== undefined
            ? Number(primaryPair.priceChange.h1)
            : null,
        liquidityUsd: Number(totalLiquidityUsd.toFixed(2)),
        volume24hUsd: Number(totalVolume24hUsd.toFixed(2)),
        marketCapUsd,
        fdvUsd,
        pairCount: pairs.length,
        oldestPairCreatedAt: oldestTimestampMs
          ? new Date(oldestTimestampMs).toISOString()
          : null,
        primaryDex: String(primaryPair?.dexId || 'DEX'),
        pools,
      },
      provenance: {
        provider: 'DEX Screener',
        status: 'success',
        latencyMs: Date.now() - startTime,
        observedAt: new Date().toISOString(),
        note: `Fetched ${pairs.length} active trading pair(s) and liquidity metrics from DEX Screener.`,
      },
    };
  } catch (err: any) {
    clearTimeout(timeout);
    return {
      tokenName: null,
      tokenSymbol: null,
      logoUrl: null,
      market: emptyMarket,
      provenance: {
        provider: 'DEX Screener',
        status: 'error',
        latencyMs: Date.now() - startTime,
        observedAt: new Date().toISOString(),
        note:
          err?.name === 'AbortError'
            ? 'DEX Screener request timed out after 7.5s.'
            : 'DEX Screener request failed.',
      },
    };
  }
}

const DEX_CHAIN_TO_NETWORK: Record<string, NetworkId> = {
  ethereum: 'ethereum',
  bsc: 'bsc',
  base: 'base',
  arbitrum: 'arbitrum',
  polygon: 'polygon',
  solana: 'solana',
};

export async function searchTokensByQuery(query: string): Promise<TokenSearchCandidate[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(trimmed)}`,
      {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    if (!res.ok) return [];

    const data = (await res.json()) as any;
    const pairs: any[] = Array.isArray(data?.pairs) ? data.pairs : [];

    const seen = new Set<string>();
    const candidates: TokenSearchCandidate[] = [];

    for (const p of pairs) {
      const networkId = DEX_CHAIN_TO_NETWORK[String(p?.chainId || '').toLowerCase()];
      if (!networkId) continue;

      const addr = String(p?.baseToken?.address || '');
      if (!addr) continue;

      const key = `${networkId}:${addr.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      candidates.push({
        networkId,
        chainId: SUPPORTED_NETWORKS[networkId].chainId,
        contractAddress: addr,
        name: String(p?.baseToken?.name || 'Unknown Token'),
        symbol: String(p?.baseToken?.symbol || '?'),
        priceUsd: p?.priceUsd ? Number(p.priceUsd) : null,
        liquidityUsd: p?.liquidity?.usd ? Number(p.liquidity.usd) : null,
        volume24hUsd: p?.volume?.h24 ? Number(p.volume.h24) : null,
        dexId: String(p?.dexId || 'DEX'),
        pairAddress: String(p?.pairAddress || ''),
      });

      if (candidates.length >= 10) break;
    }

    return candidates;
  } catch {
    clearTimeout(timeout);
    return [];
  }
}
