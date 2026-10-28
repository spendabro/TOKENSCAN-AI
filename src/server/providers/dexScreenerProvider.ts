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
    priceChange5m: null,
    liquidityUsd: null,
    volume24hUsd: null,
    volume6hUsd: null,
    volume1hUsd: null,
    volume5mUsd: null,
    marketCapUsd: null,
    fdvUsd: null,
    buys24h: null,
    sells24h: null,
    buys6h: null,
    sells6h: null,
    buys1h: null,
    sells1h: null,
    buys5m: null,
    sells5m: null,
    buyPressure24hPercent: null,
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
    let pairs: any[] = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData?.pairs)
        ? rawData.pairs
        : [];

    // For Hyperliquid, tokens can be indexed under 'hyperliquid' (L1 Spot) or 'hyperevm' (EVM Chain 999)
    if (pairs.length === 0 && networkId === 'hyperliquid') {
      try {
        const fallbackUrl = `https://api.dexscreener.com/token-pairs/v1/hyperevm/${encodeURIComponent(
          contractAddress
        )}`;
        const fbRes = await fetch(fallbackUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          pairs = Array.isArray(fbData)
            ? fbData
            : Array.isArray(fbData?.pairs)
              ? fbData.pairs
              : [];
        }
      } catch {
        // ignore fallback error
      }
    }

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
    let totalVolume6hUsd = 0;
    let totalVolume1hUsd = 0;
    let totalVolume5mUsd = 0;
    let totalBuys24h = 0;
    let totalSells24h = 0;
    let totalBuys6h = 0;
    let totalSells6h = 0;
    let totalBuys1h = 0;
    let totalSells1h = 0;
    let totalBuys5m = 0;
    let totalSells5m = 0;
    let hasTxnData = false;
    let oldestTimestampMs: number | null = null;

    const pools: LiquidityPoolInfo[] = sortedPairs.slice(0, 8).map((p) => {
      const liq = Number(p?.liquidity?.usd || 0);
      const vol = Number(p?.volume?.h24 || 0);
      totalLiquidityUsd += liq;
      totalVolume24hUsd += vol;
      totalVolume6hUsd += Number(p?.volume?.h6 || 0);
      totalVolume1hUsd += Number(p?.volume?.h1 || 0);
      totalVolume5mUsd += Number(p?.volume?.m5 || 0);

      const pBuys24h =
        p?.txns?.h24?.buys !== undefined && p?.txns?.h24?.buys !== null
          ? Number(p.txns.h24.buys)
          : null;
      const pSells24h =
        p?.txns?.h24?.sells !== undefined && p?.txns?.h24?.sells !== null
          ? Number(p.txns.h24.sells)
          : null;

      if (pBuys24h !== null || pSells24h !== null) {
        hasTxnData = true;
        totalBuys24h += pBuys24h || 0;
        totalSells24h += pSells24h || 0;
      }

      if (p?.txns?.h6?.buys !== undefined) {
        totalBuys6h += Number(p.txns.h6.buys || 0);
      }
      if (p?.txns?.h6?.sells !== undefined) {
        totalSells6h += Number(p.txns.h6.sells || 0);
      }
      if (p?.txns?.h1?.buys !== undefined) {
        totalBuys1h += Number(p.txns.h1.buys || 0);
      }
      if (p?.txns?.h1?.sells !== undefined) {
        totalSells1h += Number(p.txns.h1.sells || 0);
      }
      if (p?.txns?.m5?.buys !== undefined) {
        totalBuys5m += Number(p.txns.m5.buys || 0);
      }
      if (p?.txns?.m5?.sells !== undefined) {
        totalSells5m += Number(p.txns.m5.sells || 0);
      }

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
        buys24h: pBuys24h,
        sells24h: pSells24h,
        pairCreatedAt:
          p?.pairCreatedAt && typeof p.pairCreatedAt === 'number'
            ? new Date(p.pairCreatedAt).toISOString()
            : null,
        url: p?.url || undefined,
      };
    });

    // Aggregate remaining pairs' liquidity/volume/txns if more than 8 pairs
    for (let i = 8; i < sortedPairs.length; i++) {
      totalLiquidityUsd += Number(sortedPairs[i]?.liquidity?.usd || 0);
      totalVolume24hUsd += Number(sortedPairs[i]?.volume?.h24 || 0);
      totalVolume6hUsd += Number(sortedPairs[i]?.volume?.h6 || 0);
      totalVolume1hUsd += Number(sortedPairs[i]?.volume?.h1 || 0);
      totalVolume5mUsd += Number(sortedPairs[i]?.volume?.m5 || 0);
      if (sortedPairs[i]?.txns?.h24?.buys !== undefined) {
        hasTxnData = true;
        totalBuys24h += Number(sortedPairs[i].txns.h24.buys || 0);
      }
      if (sortedPairs[i]?.txns?.h24?.sells !== undefined) {
        hasTxnData = true;
        totalSells24h += Number(sortedPairs[i].txns.h24.sells || 0);
      }
      if (sortedPairs[i]?.txns?.h6?.buys !== undefined) {
        totalBuys6h += Number(sortedPairs[i].txns.h6.buys || 0);
      }
      if (sortedPairs[i]?.txns?.h6?.sells !== undefined) {
        totalSells6h += Number(sortedPairs[i].txns.h6.sells || 0);
      }
      if (sortedPairs[i]?.txns?.h1?.buys !== undefined) {
        totalBuys1h += Number(sortedPairs[i].txns.h1.buys || 0);
      }
      if (sortedPairs[i]?.txns?.h1?.sells !== undefined) {
        totalSells1h += Number(sortedPairs[i].txns.h1.sells || 0);
      }
      if (sortedPairs[i]?.txns?.m5?.buys !== undefined) {
        totalBuys5m += Number(sortedPairs[i].txns.m5.buys || 0);
      }
      if (sortedPairs[i]?.txns?.m5?.sells !== undefined) {
        totalSells5m += Number(sortedPairs[i].txns.m5.sells || 0);
      }
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

    const totalTxns24h = totalBuys24h + totalSells24h;
    const buyPressure24hPercent =
      hasTxnData && totalTxns24h > 0
        ? Number(((totalBuys24h / totalTxns24h) * 100).toFixed(1))
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
        priceChange5m:
          primaryPair?.priceChange?.m5 !== undefined
            ? Number(primaryPair.priceChange.m5)
            : null,
        liquidityUsd: Number(totalLiquidityUsd.toFixed(2)),
        volume24hUsd: Number(totalVolume24hUsd.toFixed(2)),
        volume6hUsd: Number(totalVolume6hUsd.toFixed(2)),
        volume1hUsd: Number(totalVolume1hUsd.toFixed(2)),
        volume5mUsd: Number(totalVolume5mUsd.toFixed(2)),
        marketCapUsd,
        fdvUsd,
        buys24h: hasTxnData ? totalBuys24h : null,
        sells24h: hasTxnData ? totalSells24h : null,
        buys6h: hasTxnData ? totalBuys6h : null,
        sells6h: hasTxnData ? totalSells6h : null,
        buys1h: hasTxnData ? totalBuys1h : null,
        sells1h: hasTxnData ? totalSells1h : null,
        buys5m: hasTxnData ? totalBuys5m : null,
        sells5m: hasTxnData ? totalSells5m : null,
        buyPressure24hPercent,
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
        note: `Fetched ${pairs.length} active trading pair(s), buy/sell order flow, and liquidity metrics from DEX Screener.`,
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
  hyperliquid: 'hyperliquid',
  hyperevm: 'hyperliquid',
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
