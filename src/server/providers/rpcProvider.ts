import {
  createPublicClient,
  http,
  isAddress,
  getAddress,
  parseAbi,
  formatUnits,
  type Chain,
} from 'viem';
import { mainnet, bsc, base, arbitrum, polygon } from 'viem/chains';
import { NetworkId, SUPPORTED_NETWORKS, ProviderProvenance } from '../../types/tokenlens.ts';

const ERC20_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function owner() view returns (address)',
]);

const CHAIN_MAP: Partial<Record<NetworkId, { chain: Chain; rpcUrls: string[] }>> = {
  ethereum: {
    chain: mainnet,
    rpcUrls: [
      process.env.ETH_RPC_URL || 'https://ethereum-rpc.publicnode.com',
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
    ],
  },
  bsc: {
    chain: bsc,
    rpcUrls: [
      process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
      'https://bsc-rpc.publicnode.com',
    ],
  },
  base: {
    chain: base,
    rpcUrls: [
      process.env.BASE_RPC_URL || 'https://mainnet.base.org',
      'https://base-rpc.publicnode.com',
    ],
  },
  arbitrum: {
    chain: arbitrum,
    rpcUrls: [
      process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      'https://arbitrum-one-rpc.publicnode.com',
    ],
  },
  polygon: {
    chain: polygon,
    rpcUrls: [
      process.env.POLYGON_RPC_URL || 'https://polygon-bor-rpc.publicnode.com',
      'https://polygon-rpc.com',
    ],
  },
};

export interface OnChainTokenMetadata {
  normalizedAddress: string;
  isContractDeployed: boolean | null;
  bytecodeLength: number | null;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupplyFormatted: string | null;
  ownerAddress: string | null;
  provenance: ProviderProvenance;
}

export function validateContractAddress(
  networkId: NetworkId,
  rawAddress: string
): { valid: boolean; normalizedAddress: string; error?: string } {
  const trimmed = rawAddress.trim();
  const net = SUPPORTED_NETWORKS[networkId];
  if (!net) {
    return { valid: false, normalizedAddress: trimmed, error: 'Unsupported blockchain network.' };
  }

  if (net.isEvm) {
    if (!trimmed.startsWith('0x') || trimmed.length !== 42) {
      return {
        valid: false,
        normalizedAddress: trimmed,
        error: `Invalid ${net.name} contract address format. Expected a 42-character hexadecimal address starting with 0x (never a token symbol).`,
      };
    }
    if (!isAddress(trimmed, { strict: false })) {
      return {
        valid: false,
        normalizedAddress: trimmed,
        error: `Checksum or hexadecimal validation failed for ${net.name} address.`,
      };
    }
    try {
      const checksummed = getAddress(trimmed.toLowerCase());
      return { valid: true, normalizedAddress: checksummed };
    } catch {
      return {
        valid: false,
        normalizedAddress: trimmed,
        error: 'Unable to normalize EVM contract address.',
      };
    }
  } else {
    // Solana Base58 validation
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!base58Regex.test(trimmed)) {
      return {
        valid: false,
        normalizedAddress: trimmed,
        error: 'Invalid Solana mint address. Expected a 32–44 character Base58 public key.',
      };
    }
    return { valid: true, normalizedAddress: trimmed };
  }
}

export async function fetchOnChainMetadata(
  networkId: NetworkId,
  contractAddress: string
): Promise<OnChainTokenMetadata> {
  const startTime = Date.now();
  const net = SUPPORTED_NETWORKS[networkId];

  if (!net.isEvm || !net.rpcSupported) {
    return {
      normalizedAddress: contractAddress,
      isContractDeployed: null,
      bytecodeLength: null,
      name: null,
      symbol: null,
      decimals: null,
      totalSupplyFormatted: null,
      ownerAddress: null,
      provenance: {
        provider: 'On-Chain RPC (viem)',
        status: 'unsupported',
        latencyMs: Date.now() - startTime,
        observedAt: new Date().toISOString(),
        note: `Direct EVM RPC inspection via viem is not applicable to ${net.name}. EVM-specific bytecode rules are skipped.`,
      },
    };
  }

  const chainEntry = CHAIN_MAP[networkId];
  if (!chainEntry) {
    return {
      normalizedAddress: contractAddress,
      isContractDeployed: null,
      bytecodeLength: null,
      name: null,
      symbol: null,
      decimals: null,
      totalSupplyFormatted: null,
      ownerAddress: null,
      provenance: {
        provider: 'On-Chain RPC (viem)',
        status: 'unavailable',
        latencyMs: Date.now() - startTime,
        observedAt: new Date().toISOString(),
        note: `No RPC endpoint configured for ${net.name}.`,
      },
    };
  }

  const addr = contractAddress as `0x${string}`;

  const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('RPC timeout')), ms)),
    ]);

  for (const rpcUrl of chainEntry.rpcUrls.slice(0, 2)) {
    try {
      const client = createPublicClient({
        chain: chainEntry.chain,
        transport: http(rpcUrl, { timeout: 3000, retryCount: 0 }),
      });

      const bytecode = await withTimeout(client.getBytecode({ address: addr }), 3200);
      const isContractDeployed = Boolean(bytecode && bytecode !== '0x' && bytecode.length > 2);
      const bytecodeLength = bytecode ? Math.floor((bytecode.length - 2) / 2) : 0;

      if (!isContractDeployed) {
        return {
          normalizedAddress: contractAddress,
          isContractDeployed: false,
          bytecodeLength: 0,
          name: null,
          symbol: null,
          decimals: null,
          totalSupplyFormatted: null,
          ownerAddress: null,
          provenance: {
            provider: 'On-Chain RPC (viem)',
            status: 'success',
            latencyMs: Date.now() - startTime,
            observedAt: new Date().toISOString(),
            note: `Verified on ${net.name} via RPC: No smart contract bytecode found at this address (EOA or undeployed address).`,
          },
        };
      }

      const [nameRes, symbolRes, decimalsRes, supplyRes, ownerRes] = await withTimeout(
        Promise.allSettled([
          client.readContract({ address: addr, abi: ERC20_ABI, functionName: 'name' }),
          client.readContract({ address: addr, abi: ERC20_ABI, functionName: 'symbol' }),
          client.readContract({ address: addr, abi: ERC20_ABI, functionName: 'decimals' }),
          client.readContract({ address: addr, abi: ERC20_ABI, functionName: 'totalSupply' }),
          client.readContract({ address: addr, abi: ERC20_ABI, functionName: 'owner' }),
        ]),
        3500
      );

      const name = nameRes.status === 'fulfilled' ? String(nameRes.value) : null;
      const symbol = symbolRes.status === 'fulfilled' ? String(symbolRes.value) : null;
      const decimals = decimalsRes.status === 'fulfilled' ? Number(decimalsRes.value) : 18;
      const rawSupply = supplyRes.status === 'fulfilled' ? (supplyRes.value as bigint) : null;
      const ownerAddress =
        ownerRes.status === 'fulfilled' && ownerRes.value ? String(ownerRes.value) : null;

      let totalSupplyFormatted: string | null = null;
      if (rawSupply !== null) {
        try {
          const formatted = Number(formatUnits(rawSupply, decimals));
          totalSupplyFormatted = formatted.toLocaleString('en-US', { maximumFractionDigits: 2 });
        } catch {
          totalSupplyFormatted = rawSupply.toString();
        }
      }

      return {
        normalizedAddress: contractAddress,
        isContractDeployed: true,
        bytecodeLength,
        name,
        symbol,
        decimals,
        totalSupplyFormatted,
        ownerAddress,
        provenance: {
          provider: 'On-Chain RPC (viem)',
          status: 'success',
          latencyMs: Date.now() - startTime,
          observedAt: new Date().toISOString(),
          note: `Read ERC-20 state & contract bytecode (${bytecodeLength.toLocaleString()} bytes) directly from ${net.name}.`,
        },
      };
    } catch {
      // Try next fallback RPC URL
      continue;
    }
  }

  return {
    normalizedAddress: contractAddress,
    isContractDeployed: null,
    bytecodeLength: null,
    name: null,
    symbol: null,
    decimals: null,
    totalSupplyFormatted: null,
    ownerAddress: null,
    provenance: {
      provider: 'On-Chain RPC (viem)',
      status: 'error',
      latencyMs: Date.now() - startTime,
      observedAt: new Date().toISOString(),
      note: `RPC read timed out or failed on ${net.name}. Falling back to indexer metadata.`,
    },
  };
}
