import {
  NetworkId,
  SUPPORTED_NETWORKS,
  TradingSimulation,
  ProviderProvenance,
} from '../../types/tokenlens.ts';

export interface HoneypotNormalizedResult {
  simulation: TradingSimulation;
  provenance: ProviderProvenance;
}

export async function fetchHoneypotSimulation(
  networkId: NetworkId,
  contractAddress: string
): Promise<HoneypotNormalizedResult> {
  const startTime = Date.now();
  const net = SUPPORTED_NETWORKS[networkId];

  if (!net.honeypotSupported || !net.numericChainId) {
    return {
      simulation: {
        isHoneypot: null,
        honeypotReason: null,
        buyTaxPercent: null,
        sellTaxPercent: null,
        transferTaxPercent: null,
        buyGasUsed: null,
        sellGasUsed: null,
        simulationSupported: false,
        source: 'Not Supported on Network',
      },
      provenance: {
        provider: 'Honeypot.is',
        status: 'unsupported',
        latencyMs: Date.now() - startTime,
        observedAt: new Date().toISOString(),
        note: `Honeypot.is live trade simulation does not support ${net.name} (Chain ID: ${net.chainId}).`,
      },
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const url = `https://api.honeypot.is/v2/IsHoneypot?address=${encodeURIComponent(
      contractAddress
    )}&chainID=${net.numericChainId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        simulation: {
          isHoneypot: null,
          honeypotReason: null,
          buyTaxPercent: null,
          sellTaxPercent: null,
          transferTaxPercent: null,
          buyGasUsed: null,
          sellGasUsed: null,
          simulationSupported: true,
          source: 'Honeypot.is (Unavailable)',
        },
        provenance: {
          provider: 'Honeypot.is',
          status: 'unavailable',
          latencyMs: Date.now() - startTime,
          observedAt: new Date().toISOString(),
          note: `Honeypot.is could not simulate trades for this token (HTTP ${response.status} — often indicates no standard DEX router pair found).`,
        },
      };
    }

    const data = (await response.json()) as any;
    const isHoneypot =
      typeof data?.honeypotResult?.isHoneypot === 'boolean'
        ? data.honeypotResult.isHoneypot
        : null;
    const honeypotReason = data?.honeypotResult?.honeypotReason || null;

    const buyTax =
      data?.simulationResult?.buyTax !== undefined
        ? Number(Number(data.simulationResult.buyTax).toFixed(2))
        : null;
    const sellTax =
      data?.simulationResult?.sellTax !== undefined
        ? Number(Number(data.simulationResult.sellTax).toFixed(2))
        : null;
    const transferTax =
      data?.simulationResult?.transferTax !== undefined
        ? Number(Number(data.simulationResult.transferTax).toFixed(2))
        : null;
    const buyGas = data?.simulationResult?.buyGas
      ? Number(data.simulationResult.buyGas)
      : null;
    const sellGas = data?.simulationResult?.sellGas
      ? Number(data.simulationResult.sellGas)
      : null;

    return {
      simulation: {
        isHoneypot,
        honeypotReason,
        buyTaxPercent: buyTax,
        sellTaxPercent: sellTax,
        transferTaxPercent: transferTax,
        buyGasUsed: buyGas,
        sellGasUsed: sellGas,
        simulationSupported: true,
        source: 'Honeypot.is v2',
      },
      provenance: {
        provider: 'Honeypot.is',
        status: 'success',
        latencyMs: Date.now() - startTime,
        observedAt: new Date().toISOString(),
        note: `Executed buy/sell transaction simulation via Honeypot.is on ${net.name}.`,
      },
    };
  } catch (err: any) {
    clearTimeout(timeout);
    return {
      simulation: {
        isHoneypot: null,
        honeypotReason: null,
        buyTaxPercent: null,
        sellTaxPercent: null,
        transferTaxPercent: null,
        buyGasUsed: null,
        sellGasUsed: null,
        simulationSupported: true,
        source: 'Honeypot.is (Error)',
      },
      provenance: {
        provider: 'Honeypot.is',
        status: 'error',
        latencyMs: Date.now() - startTime,
        observedAt: new Date().toISOString(),
        note:
          err?.name === 'AbortError'
            ? 'Honeypot.is simulation timed out after 7.5s.'
            : 'Honeypot.is simulation request failed.',
      },
    };
  }
}
