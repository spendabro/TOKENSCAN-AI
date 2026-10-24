import {
  NetworkId,
  SUPPORTED_NETWORKS,
  ContractPermissions,
  HolderAnalysisData,
  HolderEntry,
  ProviderProvenance,
} from '../../types/tokenlens.ts';

export interface GoPlusNormalizedResult {
  tokenName: string | null;
  tokenSymbol: string | null;
  totalSupply: string | null;
  isHoneypotFlag: boolean | null;
  buyTaxPercent: number | null;
  sellTaxPercent: number | null;
  permissions: ContractPermissions;
  holders: HolderAnalysisData;
  provenance: ProviderProvenance;
}

const BURN_ADDRESSES = new Set([
  '0x0000000000000000000000000000000000000000',
  '0x000000000000000000000000000000000000dead',
  '0x0000000000000000000000000000000000000001',
  '0xdead000000000000000042069420694206942069',
]);

function parseFlag(val: unknown): boolean | null {
  if (val === '1' || val === 1 || val === true) return true;
  if (val === '0' || val === 0 || val === false) return false;
  return null;
}

function parseTaxPercent(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  const num = Number(val);
  if (Number.isNaN(num)) return null;
  // GoPlus returns taxes as decimal fraction (e.g. "0.05" = 5%) or occasionally percentage if > 1
  return num <= 1 ? Number((num * 100).toFixed(2)) : Number(num.toFixed(2));
}

export function createEmptyGoPlusResult(provenance: ProviderProvenance): GoPlusNormalizedResult {
  return {
    tokenName: null,
    tokenSymbol: null,
    totalSupply: null,
    isHoneypotFlag: null,
    buyTaxPercent: null,
    sellTaxPercent: null,
    permissions: {
      isOpenSource: null,
      isProxy: null,
      isMintable: null,
      ownerAddress: null,
      isOwnershipRenounced: null,
      canTakeBackOwnership: null,
      hasBlacklist: null,
      hasWhitelist: null,
      isTransferPausable: null,
      canModifyTax: null,
      hasSelfDestruct: null,
      hasExternalCall: null,
      hasAntiWhale: null,
      hasTradingCooldown: null,
      cannotBuy: null,
      cannotSellAll: null,
    },
    holders: {
      totalHolders: null,
      lpHolderCount: null,
      top10InvestorPercent: null,
      burnPercent: null,
      lpLockedPercent: null,
      creatorAddress: null,
      creatorPercent: null,
      topHolders: [],
      dataComplete: false,
    },
    provenance,
  };
}

export async function fetchGoPlusSecurity(
  networkId: NetworkId,
  contractAddress: string
): Promise<GoPlusNormalizedResult> {
  const startTime = Date.now();
  const net = SUPPORTED_NETWORKS[networkId];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const endpoint = net.isEvm
      ? `https://api.gopluslabs.io/api/v1/token_security/${net.goplusChainId}?contract_addresses=${encodeURIComponent(contractAddress.toLowerCase())}`
      : `https://api.gopluslabs.io/api/v1/solana/token_security?contract_addresses=${encodeURIComponent(contractAddress)}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return createEmptyGoPlusResult({
        provider: 'GoPlus Security',
        status: 'error',
        latencyMs: Date.now() - startTime,
        observedAt: new Date().toISOString(),
        note: `GoPlus API returned HTTP ${response.status}.`,
      });
    }

    const json = (await response.json()) as {
      code?: number;
      message?: string;
      result?: Record<string, any>;
    };

    const resultMap = json?.result || {};
    const record =
      resultMap[contractAddress.toLowerCase()] ||
      resultMap[contractAddress] ||
      Object.values(resultMap)[0];

    if (!record) {
      return createEmptyGoPlusResult({
        provider: 'GoPlus Security',
        status: 'unavailable',
        latencyMs: Date.now() - startTime,
        observedAt: new Date().toISOString(),
        note: `GoPlus Security has not indexed this contract on ${net.name} yet.`,
      });
    }

    if (!net.isEvm) {
      // Solana-specific parsing (GoPlus Solana structure)
      const isMintable = record.mintable?.status === '1';
      const isFreezable = record.freezable?.status === '1';
      return {
        tokenName: record.metadata?.name || null,
        tokenSymbol: record.metadata?.symbol || null,
        totalSupply: record.total_supply ? String(record.total_supply) : null,
        isHoneypotFlag: null,
        buyTaxPercent: null,
        sellTaxPercent: null,
        permissions: {
          isOpenSource: true,
          isProxy: null,
          isMintable,
          ownerAddress: record.mintable?.authority?.[0]?.address || null,
          isOwnershipRenounced: !isMintable,
          canTakeBackOwnership: null,
          hasBlacklist: isFreezable,
          hasWhitelist: null,
          isTransferPausable: isFreezable,
          canModifyTax: record.transfer_fee_upgradable?.status === '1',
          hasSelfDestruct: record.closable?.status === '1',
          hasExternalCall: null,
          hasAntiWhale: null,
          hasTradingCooldown: null,
          cannotBuy: null,
          cannotSellAll: null,
        },
        holders: {
          totalHolders: record.holder_count ? Number(record.holder_count) : null,
          lpHolderCount: null,
          top10InvestorPercent: null,
          burnPercent: null,
          lpLockedPercent: null,
          creatorAddress: record.creators?.[0]?.address || null,
          creatorPercent: null,
          topHolders: [],
          dataComplete: false,
        },
        provenance: {
          provider: 'GoPlus Security',
          status: 'success',
          latencyMs: Date.now() - startTime,
          observedAt: new Date().toISOString(),
          note: `Retrieved Solana SPL token security indicators from GoPlus Security.`,
        },
      };
    }

    // EVM GoPlus parsing
    const ownerAddressRaw =
      typeof record.owner_address === 'string' && record.owner_address.trim() !== ''
        ? record.owner_address.trim()
        : null;

    const isOwnershipRenounced =
      ownerAddressRaw !== null
        ? BURN_ADDRESSES.has(ownerAddressRaw.toLowerCase())
        : record.owner_address === ''
          ? true
          : null;

    const creatorAddress =
      typeof record.creator_address === 'string' && record.creator_address.trim() !== ''
        ? record.creator_address.trim()
        : null;

    const rawHolders: any[] = Array.isArray(record.holders) ? record.holders : [];
    const rawLpHolders: any[] = Array.isArray(record.lp_holders) ? record.lp_holders : [];

    let top10InvestorPercent = 0;
    let burnPercent = 0;

    const parsedHolders: HolderEntry[] = rawHolders.slice(0, 10).map((h) => {
      const addr = String(h.address || '').toLowerCase();
      const pct = Number((Number(h.percent || 0) * 100).toFixed(2));
      const tag = String(h.tag || '').trim();
      const isContract = parseFlag(h.is_contract) === true;
      const isLocked = parseFlag(h.is_locked) === true;

      let category: HolderEntry['category'] = 'Investor / Unidentified';
      if (
        BURN_ADDRESSES.has(addr) ||
        tag.toLowerCase().includes('burn') ||
        tag.toLowerCase().includes('dead') ||
        tag.toLowerCase().includes('null')
      ) {
        category = 'Burn / Dead Address';
        burnPercent += pct;
      } else if (creatorAddress && addr === creatorAddress.toLowerCase()) {
        category = 'Creator / Owner';
        top10InvestorPercent += pct;
      } else if (
        isContract ||
        tag.toLowerCase().includes('uniswap') ||
        tag.toLowerCase().includes('pancake') ||
        tag.toLowerCase().includes('pool') ||
        tag.toLowerCase().includes('pair') ||
        tag.toLowerCase().includes('vault')
      ) {
        category = 'Liquidity Pool / Contract';
      } else {
        top10InvestorPercent += pct;
      }

      return {
        address: String(h.address || ''),
        tag: tag || (category === 'Burn / Dead Address' ? 'Burn Address' : ''),
        percent: pct,
        isContract,
        isLocked,
        category,
      };
    });

    let lpLockedPercent: number | null = null;
    if (rawLpHolders.length > 0) {
      let lockedSum = 0;
      for (const lp of rawLpHolders) {
        const addr = String(lp.address || '').toLowerCase();
        const isLocked = parseFlag(lp.is_locked) === true || BURN_ADDRESSES.has(addr);
        if (isLocked) {
          lockedSum += Number(lp.percent || 0) * 100;
        }
      }
      lpLockedPercent = Number(Math.min(100, lockedSum).toFixed(2));
    }

    return {
      tokenName: record.token_name || null,
      tokenSymbol: record.token_symbol || null,
      totalSupply: record.total_supply ? String(record.total_supply) : null,
      isHoneypotFlag: parseFlag(record.is_honeypot),
      buyTaxPercent: parseTaxPercent(record.buy_tax),
      sellTaxPercent: parseTaxPercent(record.sell_tax),
      permissions: {
        isOpenSource: parseFlag(record.is_open_source),
        isProxy: parseFlag(record.is_proxy),
        isMintable: parseFlag(record.is_mintable),
        ownerAddress: ownerAddressRaw,
        isOwnershipRenounced,
        canTakeBackOwnership: parseFlag(record.can_take_back_ownership),
        hasBlacklist: parseFlag(record.is_blacklisted),
        hasWhitelist: parseFlag(record.is_whitelisted),
        isTransferPausable: parseFlag(record.transfer_pausable),
        canModifyTax: parseFlag(record.slippage_modifiable),
        hasSelfDestruct: parseFlag(record.selfdestruct),
        hasExternalCall: parseFlag(record.external_call),
        hasAntiWhale: parseFlag(record.is_anti_whale),
        hasTradingCooldown: parseFlag(record.trading_cooldown),
        cannotBuy: parseFlag(record.cannot_buy),
        cannotSellAll: parseFlag(record.cannot_sell_all),
      },
      holders: {
        totalHolders: record.holder_count ? Number(record.holder_count) : null,
        lpHolderCount: record.lp_holder_count ? Number(record.lp_holder_count) : null,
        top10InvestorPercent:
          parsedHolders.length > 0 ? Number(top10InvestorPercent.toFixed(2)) : null,
        burnPercent: parsedHolders.length > 0 ? Number(burnPercent.toFixed(2)) : null,
        lpLockedPercent,
        creatorAddress,
        creatorPercent:
          record.creator_percent !== undefined
            ? Number((Number(record.creator_percent) * 100).toFixed(2))
            : null,
        topHolders: parsedHolders,
        dataComplete: parsedHolders.length > 0,
      },
      provenance: {
        provider: 'GoPlus Security',
        status: 'success',
        latencyMs: Date.now() - startTime,
        observedAt: new Date().toISOString(),
        note: `Retrieved contract security telemetry and holder distribution from GoPlus Security (${net.name}).`,
      },
    };
  } catch (err: any) {
    clearTimeout(timeout);
    return createEmptyGoPlusResult({
      provider: 'GoPlus Security',
      status: 'error',
      latencyMs: Date.now() - startTime,
      observedAt: new Date().toISOString(),
      note:
        err?.name === 'AbortError'
          ? 'GoPlus Security request timed out after 8.5s.'
          : 'GoPlus Security endpoint could not be reached.',
    });
  }
}
