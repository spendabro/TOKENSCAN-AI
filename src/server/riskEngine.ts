import {
  type NetworkId,
  SUPPORTED_NETWORKS,
  type SecurityFinding,
  type SeverityLevel,
  type FindingCategory,
  type RiskOverviewMetrics,
  type RiskClassification,
  type ContractPermissions,
  type TradingSimulation,
  type MarketSnapshotData,
  type HolderAnalysisData,
} from '../types/tokenlens.ts';
import { type OnChainTokenMetadata } from './providers/rpcProvider.ts';

export interface DeterministicRiskInput {
  networkId: NetworkId;
  contractAddress: string;
  onChain: OnChainTokenMetadata;
  permissions: ContractPermissions;
  trading: TradingSimulation;
  market: MarketSnapshotData;
  holders: HolderAnalysisData;
}

const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  Critical: 5,
  High: 4,
  Moderate: 3,
  Low: 2,
  Informational: 1,
  Unknown: 0,
};

export function evaluateDeterministicRisk(input: DeterministicRiskInput): {
  findings: SecurityFinding[];
  riskOverview: RiskOverviewMetrics;
} {
  const { networkId, contractAddress, onChain, permissions, trading, market, holders } = input;
  const net = SUPPORTED_NETWORKS[networkId];
  const now = new Date().toISOString();
  const findings: SecurityFinding[] = [];

  // ============================================================================
  // CATEGORY 1: SMART CONTRACT SECURITY
  // ============================================================================

  // Check 1.1: On-Chain Bytecode Deployment (EVM only)
  if (net.isEvm) {
    if (onChain.isContractDeployed === false) {
      findings.push({
        id: 'EV-SC-001',
        category: 'Smart Contract Security',
        title: 'No Smart Contract Bytecode Deployed at Address',
        severity: 'Critical',
        status: 'Verified Observation',
        explanation: `Direct RPC eth_getCode call on ${net.name} returned empty bytecode (0x) for ${contractAddress}. This address is an Externally Owned Account (EOA) or undeployed address on this chain.`,
        beginnerExplanation: `There is no token smart contract deployed at this address on ${net.name}. Ensure you selected the right blockchain network and copied the exact token contract address rather than a personal wallet address.`,
        evidence: {
          network: net.name,
          address: contractAddress,
          isContractDeployed: false,
          bytecodeLengthBytes: 0,
        },
        source: 'On-Chain RPC (viem)',
        observedAt: now,
        confidence: 'High',
        recommendedAction: `Verify on ${net.explorerName} that ${contractAddress} is a token contract on ${net.name}.`,
      });
    } else if (onChain.isContractDeployed === true) {
      findings.push({
        id: 'EV-SC-001',
        category: 'Smart Contract Security',
        title: 'Deployed Smart Contract Bytecode Verified On-Chain',
        severity: 'Informational',
        status: 'Verified Observation',
        explanation: `On-chain RPC inspection confirmed active EVM bytecode (${onChain.bytecodeLength?.toLocaleString() || 'non-zero'} bytes) deployed at ${contractAddress} on ${net.name}.`,
        beginnerExplanation: `We verified directly on the ${net.name} blockchain that a real smart contract exists at this address.`,
        evidence: {
          network: net.name,
          isContractDeployed: true,
          bytecodeLengthBytes: onChain.bytecodeLength,
        },
        source: 'On-Chain RPC (viem)',
        observedAt: now,
        confidence: 'High',
        recommendedAction: 'Proceed to review source code verification and administrative permissions.',
      });
    }
  }

  // Check 1.2: Source Code Verification
  if (permissions.isOpenSource === false) {
    findings.push({
      id: 'EV-SC-002',
      category: 'Smart Contract Security',
      title: 'Unverified Smart Contract Source Code',
      severity: 'High',
      status: 'Third-Party Assessment',
      explanation:
        'Contract source code is reported as unverified on the block explorer. Unverified bytecode prevents public inspection of internal logic, hidden administrative backdoors, or custom transfer hooks.',
      beginnerExplanation:
        'The creators of this token have not published the human-readable code for this smart contract. Without public code, security researchers cannot easily see if hidden traps exist.',
      evidence: {
        isOpenSource: false,
        network: net.name,
      },
      source: 'GoPlus Security',
      observedAt: now,
      confidence: 'High',
      recommendedAction: `Inspect the "Contract" tab on ${net.explorerName} to see if source code has been verified recently.`,
    });
  } else if (permissions.isOpenSource === true) {
    findings.push({
      id: 'EV-SC-002',
      category: 'Smart Contract Security',
      title: 'Source Code Verified for Public Inspection',
      severity: 'Informational',
      status: 'Third-Party Assessment',
      explanation:
        'The smart contract source code is published and matched against deployed bytecode, allowing independent review of contract functions. Note: Source verification does not equal a formal security audit.',
      beginnerExplanation:
        'The contract code is publicly readable on the blockchain explorer, which improves transparency. However, readable code can still contain risky permissions.',
      evidence: {
        isOpenSource: true,
      },
      source: 'GoPlus Security',
      observedAt: now,
      confidence: 'High',
      recommendedAction: 'Review privileged owner functions in the verified contract code.',
    });
  } else {
    findings.push({
      id: 'EV-SC-002',
      category: 'Smart Contract Security',
      title: 'Source Code Verification Status Unavailable',
      severity: 'Unknown',
      status: 'Missing / Unverified Data',
      explanation:
        'Security providers did not return source code verification status for this contract.',
      beginnerExplanation:
        'We could not automatically confirm whether the contract source code is published. Missing data is not treated as safe.',
      evidence: {
        isOpenSource: null,
      },
      source: 'GoPlus Security',
      observedAt: now,
      confidence: 'Unavailable',
      recommendedAction: `Manually check the Contract tab on ${net.explorerName}.`,
    });
  }

  // Check 1.3: Ownership & Admin Configuration
  if (permissions.canTakeBackOwnership === true) {
    findings.push({
      id: 'EV-SC-003',
      category: 'Smart Contract Security',
      title: 'Ownership Can Be Reclaimed After Renouncement',
      severity: 'Critical',
      status: 'Third-Party Assessment',
      explanation:
        'The contract contains logic allowing a privileged address to reclaim administrative ownership even after appearing renounced.',
      beginnerExplanation:
        'Even if the developer claims to have given up control of this contract, a hidden function allows them to take back control at any time.',
      evidence: {
        canTakeBackOwnership: true,
        currentOwner: permissions.ownerAddress,
      },
      source: 'GoPlus Security',
      observedAt: now,
      confidence: 'High',
      recommendedAction: 'Inspect custom authorization modifiers in the contract source code.',
    });
  } else if (permissions.isOwnershipRenounced === true) {
    findings.push({
      id: 'EV-SC-003',
      category: 'Smart Contract Security',
      title: 'Contract Ownership Appears Renounced',
      severity: 'Low',
      status: 'Verified Observation',
      explanation:
        'The primary owner address is set to the zero or burn address, indicating standard Ownable administrative privileges have been renounced.',
      beginnerExplanation:
        'The main administrator key has been set to an empty burn address, meaning standard owner-only settings cannot be easily changed.',
      evidence: {
        ownerAddress: permissions.ownerAddress || '0x0000000000000000000000000000000000000000',
        isOwnershipRenounced: true,
      },
      source: onChain.ownerAddress ? 'On-Chain RPC (viem) & GoPlus' : 'GoPlus Security',
      observedAt: now,
      confidence: 'High',
      recommendedAction: 'Confirm no secondary role-based access control (AccessControl) roles remain active.',
    });
  } else if (permissions.ownerAddress) {
    findings.push({
      id: 'EV-SC-003',
      category: 'Smart Contract Security',
      title: 'Active Contract Owner / Authority Present',
      severity: 'Moderate',
      status: 'Verified Observation',
      explanation: `Contract ownership is held by an active address (${permissions.ownerAddress}). Having an active owner is common for managed protocols, but grants the owner ability to invoke any privileged functions present in the contract.`,
      beginnerExplanation: `An administrator account (${permissions.ownerAddress.slice(0, 8)}...${permissions.ownerAddress.slice(-6)}) currently controls this contract's privileged settings. Check whether this is a multi-signature wallet or a single person's wallet.`,
      evidence: {
        ownerAddress: permissions.ownerAddress,
        isOwnershipRenounced: false,
      },
      source: onChain.ownerAddress ? 'On-Chain RPC (viem) & GoPlus' : 'GoPlus Security',
      observedAt: now,
      confidence: 'High',
      recommendedAction: `Check ${permissions.ownerAddress} on ${net.explorerName} to determine if it is a multisig or timelock contract.`,
    });
  } else {
    findings.push({
      id: 'EV-SC-003',
      category: 'Smart Contract Security',
      title: 'Contract Ownership Configuration Unverified',
      severity: 'Unknown',
      status: 'Missing / Unverified Data',
      explanation:
        'No standard Ownable owner() getter or security provider ownership record was returned for this contract.',
      beginnerExplanation:
        'We could not automatically detect who owns or administers this contract.',
      evidence: {
        ownerAddress: null,
        isOwnershipRenounced: null,
      },
      source: 'On-Chain RPC (viem) & GoPlus',
      observedAt: now,
      confidence: 'Unavailable',
      recommendedAction: `Review the contract's read functions on ${net.explorerName} for custom admin or governance roles.`,
    });
  }

  // Check 1.4: Minting Capability
  if (permissions.isMintable === true) {
    findings.push({
      id: 'EV-SC-004',
      category: 'Smart Contract Security',
      title: 'Token Supply Minting Capability Detected',
      severity: 'High',
      status: 'Third-Party Assessment',
      explanation:
        'The contract exposes a minting capability that allows authorized accounts to create new tokens and increase total supply. Note: Capability presence means new tokens can be minted if the authority is invoked.',
      beginnerExplanation:
        'This contract has a function that can create brand-new tokens out of thin air. If misused or compromised, creating huge amounts of new tokens could dilute existing holders and crash the price.',
      evidence: {
        isMintable: true,
        ownerAddress: permissions.ownerAddress,
      },
      source: 'GoPlus Security',
      observedAt: now,
      confidence: 'High',
      recommendedAction: 'Verify who holds the MINTER role or owner address and whether minting is capped or timelocked.',
    });
  } else if (permissions.isMintable === false) {
    findings.push({
      id: 'EV-SC-004',
      category: 'Smart Contract Security',
      title: 'No Arbitrary Minting Function Detected',
      severity: 'Informational',
      status: 'Third-Party Assessment',
      explanation:
        'Security analysis did not detect an active arbitrary minting function in the token contract.',
      beginnerExplanation:
        'The token supply appears fixed—no standard function was found that would allow administrators to print extra tokens.',
      evidence: {
        isMintable: false,
      },
      source: 'GoPlus Security',
      observedAt: now,
      confidence: 'High',
      recommendedAction: 'No immediate action required regarding supply inflation.',
    });
  }

  // Check 1.5: Proxy / Upgradeability Pattern (EVM)
  if (net.isEvm && permissions.isProxy !== null) {
    if (permissions.isProxy === true) {
      findings.push({
        id: 'EV-SC-005',
        category: 'Smart Contract Security',
        title: 'Upgradeable Proxy Contract Pattern Detected',
        severity: 'Moderate',
        status: 'Third-Party Assessment',
        explanation:
          'This contract uses a proxy pattern allowing the underlying implementation logic to be upgraded by the proxy administrator. While used by major regulated tokens (e.g., USDC), upgradeability means contract rules can change in the future.',
        beginnerExplanation:
          'This token uses an "upgradeable" design, meaning the administrators can swap out the underlying code and rules of the token in the future without changing the token address.',
        evidence: {
          isProxy: true,
          ownerAddress: permissions.ownerAddress,
        },
        source: 'GoPlus Security',
        observedAt: now,
        confidence: 'High',
        recommendedAction: 'Check the ProxyAdmin owner on the block explorer to see if upgrades require a timelock or multisig.',
      });
    } else {
      findings.push({
        id: 'EV-SC-005',
        category: 'Smart Contract Security',
        title: 'Immutable Contract Pattern (Non-Proxy)',
        severity: 'Informational',
        status: 'Third-Party Assessment',
        explanation:
          'The contract does not use a delegatecall proxy upgrade pattern.',
        beginnerExplanation:
          'The contract code cannot be swapped out for a completely different implementation contract.',
        evidence: {
          isProxy: false,
        },
        source: 'GoPlus Security',
        observedAt: now,
        confidence: 'High',
        recommendedAction: 'None required.',
      });
    }
  }

  // Check 1.6: Dangerous Self-Destruct or External Call
  if (permissions.hasSelfDestruct === true || permissions.hasExternalCall === true) {
    findings.push({
      id: 'EV-SC-006',
      category: 'Smart Contract Security',
      title: permissions.hasSelfDestruct
        ? 'Self-Destruct / Contract Closure Capability Present'
        : 'External Contract Call Hook Present',
      severity: permissions.hasSelfDestruct ? 'Critical' : 'Moderate',
      status: 'Third-Party Assessment',
      explanation: permissions.hasSelfDestruct
        ? 'The contract includes a selfdestruct or account closure instruction that can destroy the contract state.'
        : 'The token contract invokes external contract calls during execution, which can introduce external dependencies or reentrancy vectors.',
      beginnerExplanation: permissions.hasSelfDestruct
        ? 'The contract contains a function capable of destroying or closing the token contract.'
        : 'When tokens are moved, this contract calls out to another external contract, which could change how transfers behave.',
      evidence: {
        hasSelfDestruct: permissions.hasSelfDestruct,
        hasExternalCall: permissions.hasExternalCall,
      },
      source: 'GoPlus Security',
      observedAt: now,
      confidence: 'Medium',
      recommendedAction: 'Audit all external contract addresses referenced in transfer hooks.',
    });
  }

  // ============================================================================
  // CATEGORY 2: TRADING RESTRICTIONS
  // ============================================================================

  // Check 2.1: Honeypot Simulation & Assessment
  const isHoneypotCombined =
    trading.isHoneypot === true || permissions.cannotSellAll === true;

  if (trading.isHoneypot === true) {
    findings.push({
      id: 'EV-TR-001',
      category: 'Trading Restrictions',
      title: 'Honeypot Behavior Detected in Trade Simulation',
      severity: 'Critical',
      status: 'Third-Party Assessment',
      explanation: `Simulated sell transactions failed or were blocked (${trading.honeypotReason || 'Sell restriction triggered'}). Simulated trading results are time-dependent and reflect current on-chain state.`,
      beginnerExplanation:
        'A trade simulation indicates that while you might be able to buy this token, selling it back is currently blocked or fails. This is a classic "honeypot" warning sign.',
      evidence: {
        isHoneypot: true,
        honeypotReason: trading.honeypotReason || 'Sell transaction reverted in simulation',
        simulationSource: trading.source,
      },
      source: trading.source,
      observedAt: now,
      confidence: 'High',
      recommendedAction: 'Do not interact with this token until sell execution is independently verified.',
    });
  } else if (trading.isHoneypot === false && permissions.cannotSellAll !== true) {
    findings.push({
      id: 'EV-TR-001',
      category: 'Trading Restrictions',
      title: 'Trade Simulation Executed Without Honeypot Revert',
      severity: 'Informational',
      status: 'Third-Party Assessment',
      explanation:
        'Automated buy and sell simulation completed at the time of scan without reverting. Note: Simulated trading results are time-dependent and may not reflect future behavior if privileged functions remain active.',
      beginnerExplanation:
        'At the moment of this scan, test buy and sell simulations succeeded. Keep in mind that if the contract owner still has special powers, trading rules could change later.',
      evidence: {
        isHoneypot: false,
        buyGasUsed: trading.buyGasUsed,
        sellGasUsed: trading.sellGasUsed,
      },
      source: trading.source,
      observedAt: now,
      confidence: 'High',
      recommendedAction: 'Cross-check contract permissions (blacklist, pause, tax modification) to ensure selling cannot be disabled later.',
    });
  } else {
    findings.push({
      id: 'EV-TR-001',
      category: 'Trading Restrictions',
      title: net.honeypotSupported
        ? 'Live Trade Simulation Data Unavailable'
        : `Trade Simulation Not Supported on ${net.name}`,
      severity: 'Unknown',
      status: 'Missing / Unverified Data',
      explanation: net.honeypotSupported
        ? 'Honeypot simulation could not be completed for this token pair.'
        : `Live EVM trade simulation via Honeypot.is is not supported on ${net.name}.`,
      beginnerExplanation:
        'We could not run a simulated buy-and-sell test for this token on this network. Missing simulation data does not mean the token is safe.',
      evidence: {
        simulationSupported: net.honeypotSupported,
        isHoneypot: null,
      },
      source: 'Honeypot.is & GoPlus Security',
      observedAt: now,
      confidence: 'Unavailable',
      recommendedAction: 'Inspect recent sell transactions directly on the DEX pair explorer before trading.',
    });
  }

  // Check 2.2: Buy and Sell Taxes
  const buyTax = trading.buyTaxPercent;
  const sellTax = trading.sellTaxPercent;

  if (buyTax !== null || sellTax !== null) {
    const maxTax = Math.max(buyTax ?? 0, sellTax ?? 0);
    let taxSeverity: SeverityLevel = 'Informational';
    if (maxTax >= 25) taxSeverity = 'Critical';
    else if (maxTax >= 10) taxSeverity = 'High';
    else if (maxTax >= 3) taxSeverity = 'Moderate';
    else if (maxTax > 0) taxSeverity = 'Low';

    findings.push({
      id: 'EV-TR-002',
      category: 'Trading Restrictions',
      title:
        maxTax === 0
          ? 'Zero Observed Buy & Sell Transfer Taxes (0%)'
          : `Observed Trading Taxes — Buy: ${buyTax ?? 0}% | Sell: ${sellTax ?? 0}%`,
      severity: taxSeverity,
      status: 'Third-Party Assessment',
      explanation: `Simulated trading observed a buy tax of ${buyTax ?? 0}% and a sell tax of ${sellTax ?? 0}%. ${
        permissions.canModifyTax
          ? 'Furthermore, the contract contains functions allowing the owner to modify tax rates.'
          : ''
      }`,
      beginnerExplanation:
        maxTax === 0
          ? 'Buying or selling this token did not charge an extra smart-contract fee during simulation.'
          : `When you buy or sell this token, the smart contract automatically deducts ${buyTax ?? 0}% on buys and ${sellTax ?? 0}% on sells.${
              maxTax >= 10 ? ' High taxes significantly reduce the amount you receive when selling.' : ''
            }`,
      evidence: {
        buyTaxPercent: buyTax,
        sellTaxPercent: sellTax,
        transferTaxPercent: trading.transferTaxPercent,
        canModifyTax: permissions.canModifyTax,
      },
      source: trading.source,
      observedAt: now,
      confidence: 'High',
      recommendedAction:
        permissions.canModifyTax
          ? 'Verify whether the contract sets a hard maximum cap on fee percentages in code.'
          : 'Check recent DEX swaps to confirm actual received token amounts.',
    });
  }

  // Check 2.3: Modifiable Tax /Pause / Blacklist Capabilities
  if (permissions.hasBlacklist === true) {
    findings.push({
      id: 'EV-TR-003',
      category: 'Trading Restrictions',
      title: 'Address Blacklist / Freeze Capability Present',
      severity: 'Moderate',
      status: 'Third-Party Assessment',
      explanation:
        'The token contract includes a blacklist or freeze mechanism. Note: This indicates the capability exists in the contract code; whether it is actively used against ordinary holders depends on the administrator (regulated stablecoins like USDT/USDC also include compliance blacklists).',
      beginnerExplanation:
        'The contract has a "blacklist" feature that allows the administrator to freeze specific wallet addresses and stop them from transferring or selling tokens.',
      evidence: {
        hasBlacklist: true,
        ownerAddress: permissions.ownerAddress,
      },
      source: 'GoPlus Security',
      observedAt: now,
      confidence: 'High',
      recommendedAction: 'Consider whether centralized address freezing is expected for this asset type (e.g., regulated stablecoin vs decentralized meme token).',
    });
  }

  if (permissions.isTransferPausable === true) {
    findings.push({
      id: 'EV-TR-004',
      category: 'Trading Restrictions',
      title: 'Global Transfer Pause Capability Present',
      severity: 'High',
      status: 'Third-Party Assessment',
      explanation:
        'The smart contract contains a pause mechanism capable of halting token transfers globally when triggered by an authorized address.',
      beginnerExplanation:
        'An administrator has a "pause button" built into the contract that can freeze all buying, selling, and transferring for everyone at once.',
      evidence: {
        isTransferPausable: true,
        ownerAddress: permissions.ownerAddress,
      },
      source: 'GoPlus Security',
      observedAt: now,
      confidence: 'High',
      recommendedAction: 'Verify whether the pause authority is controlled by a decentralized governance timelock.',
    });
  }

  if (permissions.canModifyTax === true) {
    findings.push({
      id: 'EV-TR-005',
      category: 'Trading Restrictions',
      title: 'Modifiable Transaction Fee / Tax Rates',
      severity: 'High',
      status: 'Third-Party Assessment',
      explanation:
        'Privileged functions allow the contract administrator to change buy or sell tax percentages after deployment.',
      beginnerExplanation:
        'Even if taxes look low right now, the contract owner has the power to raise the buy or sell tax later.',
      evidence: {
        canModifyTax: true,
        currentBuyTaxPercent: buyTax,
        currentSellTaxPercent: sellTax,
      },
      source: 'GoPlus Security',
      observedAt: now,
      confidence: 'High',
      recommendedAction: 'Check the smart contract source code to see if fee changes are capped (e.g., max 5%) or unrestricted (up to 99%).',
    });
  }

  if (permissions.cannotSellAll === true) {
    findings.push({
      id: 'EV-TR-006',
      category: 'Trading Restrictions',
      title: 'Holders Cannot Sell Full Token Balance',
      severity: 'Critical',
      status: 'Third-Party Assessment',
      explanation:
        'Contract rules restrict holders from selling 100% of their token balance in a standard transaction.',
      beginnerExplanation:
        'This token blocks wallets from selling their entire balance, forcing holders to leave tokens behind or failing when they try to exit.',
      evidence: {
        cannotSellAll: true,
      },
      source: 'GoPlus Security',
      observedAt: now,
      confidence: 'High',
      recommendedAction: 'Avoid trading contracts with balance retention traps.',
    });
  }

  // ============================================================================
  // CATEGORY 3: LIQUIDITY ANALYSIS
  // ============================================================================

  if (market.liquidityUsd === null || market.pairCount === 0) {
    findings.push({
      id: 'EV-LQ-001',
      category: 'Liquidity Analysis',
      title: 'No Active DEX Liquidity Pools Observed',
      severity: 'High',
      status: 'Missing / Unverified Data',
      explanation:
        'No active decentralized exchange liquidity pools were returned by DEX Screener for this contract on the selected network.',
      beginnerExplanation:
        'We could not find an active trading pool where this token can be bought or sold on decentralized exchanges. Without liquidity, tokens cannot be easily traded.',
      evidence: {
        liquidityUsd: 0,
        pairCount: 0,
      },
      source: 'DEX Screener',
      observedAt: now,
      confidence: 'High',
      recommendedAction: 'Confirm the token is actively listed on a decentralized exchange before attempting to swap.',
    });
  } else {
    const liq = market.liquidityUsd;
    let liqSeverity: SeverityLevel = 'Informational';
    if (liq < 5000) liqSeverity = 'Critical';
    else if (liq < 25000) liqSeverity = 'High';
    else if (liq < 100000) liqSeverity = 'Moderate';
    else liqSeverity = 'Low';

    findings.push({
      id: 'EV-LQ-001',
      category: 'Liquidity Analysis',
      title:
        liq < 25000
          ? `Low DEX Liquidity Depth ($${liq.toLocaleString('en-US')})`
          : `Active DEX Liquidity Observed ($${liq.toLocaleString('en-US')})`,
      severity: liqSeverity,
      status: 'Verified Observation',
      explanation: `Aggregated liquidity across ${market.pairCount} observed DEX trading pair(s) is $${liq.toLocaleString(
        'en-US'
      )}, led by ${market.primaryDex || 'primary DEX'}. Note: Liquidity size alone does not prove liquidity is locked.`,
      beginnerExplanation:
        liq < 25000
          ? `There is only $${liq.toLocaleString('en-US')} in the trading pool. Low liquidity means even small trades can cause huge price swings (slippage), and the pool could dry up quickly.`
          : `There is $${liq.toLocaleString('en-US')} across ${market.pairCount} trading pool(s). Remember that a large pool size does not automatically mean the liquidity is locked—always check LP lock status separately.`,
      evidence: {
        totalLiquidityUsd: liq,
        activePairsCount: market.pairCount,
        primaryDex: market.primaryDex,
        topPairLiquidityUsd: market.pools[0]?.liquidityUsd ?? null,
      },
      source: 'DEX Screener',
      observedAt: now,
      confidence: 'High',
      recommendedAction: 'Verify liquidity lock status independently of total liquidity USD value.',
    });
  }

  // Check 3.2: Liquidity Lock Evidence
  if (holders.lpLockedPercent !== null) {
    const lockedPct = holders.lpLockedPercent;
    findings.push({
      id: 'EV-LQ-002',
      category: 'Liquidity Analysis',
      title:
        lockedPct >= 80
          ? `Liquidity Pool Lock / Burn Evidence Observed (${lockedPct}%)`
          : lockedPct >= 30
            ? `Partial Liquidity Lock Observed (${lockedPct}%)`
            : `Low Verified Liquidity Lock Share (${lockedPct}%)`,
      severity: lockedPct >= 80 ? 'Low' : lockedPct >= 30 ? 'Moderate' : 'High',
      status: 'Third-Party Assessment',
      explanation: `GoPlus LP holder telemetry reports approximately ${lockedPct}% of observed LP tokens are held in known lock contracts or burn addresses.`,
      beginnerExplanation:
        lockedPct >= 80
          ? `About ${lockedPct}% of the liquidity pool tokens appear to be locked or burned, which reduces the risk of the developer suddenly pulling all funds from the trading pool.`
          : `Only ${lockedPct}% of the trading pool liquidity is reported as locked or burned. Unlocked liquidity can be withdrawn by liquidity providers at any time.`,
      evidence: {
        lpLockedPercent: lockedPct,
        lpHolderCount: holders.lpHolderCount,
      },
      source: 'GoPlus Security',
      observedAt: now,
      confidence: 'Medium',
      recommendedAction: 'Check the LP token holders tab on the block explorer and verify unlock dates on the locker contract.',
    });
  } else {
    findings.push({
      id: 'EV-LQ-002',
      category: 'Liquidity Analysis',
      title: 'Liquidity Lock Status Unverified',
      severity: 'Unknown',
      status: 'Missing / Unverified Data',
      explanation:
        'Verifiable LP token lock or burn percentage was not available from automated security providers (common for concentrated liquidity V3 positions or unindexed pools). Liquidity lock status is never inferred from pool size alone.',
      beginnerExplanation:
        'We could not automatically verify whether the funds in the trading pool are locked. Even if a pool has millions of dollars, unlocked liquidity can be withdrawn by its providers.',
      evidence: {
        lpLockedPercent: null,
        lpHolderCount: holders.lpHolderCount,
      },
      source: 'GoPlus Security',
      observedAt: now,
      confidence: 'Unavailable',
      recommendedAction: 'Inspect the liquidity pool contract or NFT position manager on the blockchain explorer.',
    });
  }

  // ============================================================================
  // CATEGORY 4: HOLDER CONCENTRATION
  // ============================================================================

  if (holders.dataComplete && holders.top10InvestorPercent !== null) {
    const top10Pct = holders.top10InvestorPercent;
    let holderSeverity: SeverityLevel = 'Informational';
    if (top10Pct >= 50) holderSeverity = 'High';
    else if (top10Pct >= 25) holderSeverity = 'Moderate';
    else holderSeverity = 'Low';

    findings.push({
      id: 'EV-HC-001',
      category: 'Holder Concentration',
      title:
        top10Pct >= 30
          ? `Elevated Top Holder Concentration (${top10Pct}% in Top Wallets)`
          : `Moderate/Distributed Top Holder Share (${top10Pct}% in Top Wallets)`,
      severity: holderSeverity,
      status: 'Heuristic Indicator',
      explanation: `Excluding identified burn addresses (${holders.burnPercent ?? 0}%) and tagged liquidity pool contracts, the top observed holders control ${top10Pct}% of total token supply across ${holders.totalHolders?.toLocaleString() || 'unknown'} total holders.`,
      beginnerExplanation: `After excluding burned tokens and trading pools, the largest wallets hold ${top10Pct}% of the supply. When a few wallets own a large share, they can heavily impact the price if they sell at once.`,
      evidence: {
        top10NonBurnNonPoolPercent: top10Pct,
        burnAddressPercent: holders.burnPercent,
        totalObservedHolders: holders.totalHolders,
        creatorPercent: holders.creatorPercent,
      },
      source: 'GoPlus Security',
      observedAt: now,
      confidence: 'Medium',
      recommendedAction: `Review the top holders list on ${net.explorerName} to check if large wallets are exchange custody wallets, vesting contracts, or individual whales.`,
    });
  } else {
    findings.push({
      id: 'EV-HC-001',
      category: 'Holder Concentration',
      title: 'Top Holder Distribution Data Incomplete',
      severity: 'Unknown',
      status: 'Missing / Unverified Data',
      explanation:
        'Detailed top-10 wallet distribution data was not returned by the security provider for this contract.',
      beginnerExplanation:
        'We could not retrieve the full list of top wallets holding this token. Always check the "Holders" tab on the block explorer.',
      evidence: {
        totalObservedHolders: holders.totalHolders,
        dataComplete: false,
      },
      source: 'GoPlus Security',
      observedAt: now,
      confidence: 'Unavailable',
      recommendedAction: `Open the Token Holders chart on ${net.explorerName} to inspect wallet concentration.`,
    });
  }

  // ============================================================================
  // CATEGORY 5: MARKET INFORMATION
  // ============================================================================

  if (market.priceUsd !== null) {
    // Check pool age heuristic
    let poolAgeDays: number | null = null;
    if (market.oldestPairCreatedAt) {
      const diffMs = Date.now() - new Date(market.oldestPairCreatedAt).getTime();
      poolAgeDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    const isVeryNewPool = poolAgeDays !== null && poolAgeDays < 7;

    findings.push({
      id: 'EV-MK-001',
      category: 'Market Information',
      title: isVeryNewPool
        ? `Newly Created Trading Pair (${poolAgeDays} day(s) old)`
        : 'Market & Valuation Telemetry Observed',
      severity: isVeryNewPool ? 'Moderate' : 'Informational',
      status: isVeryNewPool ? 'Heuristic Indicator' : 'Verified Observation',
      explanation: `Current DEX price is $${market.priceUsd}, with 24h volume of $${(
        market.volume24hUsd ?? 0
      ).toLocaleString('en-US')}. Market Cap is ${
        market.marketCapUsd !== null
          ? '$' + market.marketCapUsd.toLocaleString('en-US')
          : 'Unverified'
      } and Fully Diluted Valuation (FDV) is ${
        market.fdvUsd !== null ? '$' + market.fdvUsd.toLocaleString('en-US') : 'Unverified'
      }. Market Cap and FDV are tracked separately.`,
      beginnerExplanation: isVeryNewPool
        ? `This token's trading pool was created only ${poolAgeDays} day(s) ago. Brand-new tokens carry higher volatility and less historical track record.`
        : `This token is actively trading at $${market.priceUsd} with $${(
            market.volume24hUsd ?? 0
          ).toLocaleString('en-US')} in 24-hour trading volume.`,
      evidence: {
        priceUsd: market.priceUsd,
        volume24hUsd: market.volume24hUsd,
        marketCapUsd: market.marketCapUsd,
        fdvUsd: market.fdvUsd,
        poolAgeDays,
      },
      source: 'DEX Screener',
      observedAt: now,
      confidence: 'High',
      recommendedAction: 'Compare circulating Market Cap against Fully Diluted Valuation (FDV) to spot upcoming token unlock dilution.',
    });
  } else {
    findings.push({
      id: 'EV-MK-001',
      category: 'Market Information',
      title: 'Market Price & Valuation Data Unavailable',
      severity: 'Unknown',
      status: 'Missing / Unverified Data',
      explanation:
        'Live DEX market price, volume, and valuation metrics were not found for this contract.',
      beginnerExplanation:
        'No live market price or trading volume data was found on decentralized exchanges.',
      evidence: {
        priceUsd: null,
        marketCapUsd: null,
        fdvUsd: null,
      },
      source: 'DEX Screener',
      observedAt: now,
      confidence: 'Unavailable',
      recommendedAction: 'Verify whether the token trades exclusively on centralized exchanges or is not yet launched.',
    });
  }

  // ============================================================================
  // COMPUTE DETERMINISTIC RISK OVERVIEW & COVERAGE METRICS
  // ============================================================================

  const criticalCount = findings.filter((f) => f.severity === 'Critical').length;
  const highCount = findings.filter((f) => f.severity === 'High').length;
  const moderateCount = findings.filter((f) => f.severity === 'Moderate').length;
  const lowOrInfoCount = findings.filter(
    (f) => f.severity === 'Low' || f.severity === 'Informational'
  ).length;
  const unknownCount = findings.filter((f) => f.severity === 'Unknown').length;

  const totalChecks = findings.length;
  const completedChecks = totalChecks - unknownCount;
  const unavailableChecks = unknownCount;
  const dataCoveragePercent =
    totalChecks > 0 ? Math.round((completedChecks / totalChecks) * 100) : 0;

  // Category weights per Section 10 methodology
  const categoryWeights: Record<FindingCategory, number> = {
    'Smart Contract Security': 30,
    'Trading Restrictions': 30,
    'Liquidity Analysis': 20,
    'Holder Concentration': 10,
    'Market Information': 10,
  };

  const categories: FindingCategory[] = [
    'Smart Contract Security',
    'Trading Restrictions',
    'Liquidity Analysis',
    'Holder Concentration',
    'Market Information',
  ];

  const categoryBreakdown = categories.map((cat) => {
    const catFindings = findings.filter((f) => f.category === cat);
    const catCompleted = catFindings.filter((f) => f.severity !== 'Unknown').length;
    let highestSeverity: SeverityLevel = 'Unknown';
    for (const f of catFindings) {
      if (SEVERITY_ORDER[f.severity] > SEVERITY_ORDER[highestSeverity]) {
        highestSeverity = f.severity;
      }
    }
    return {
      category: cat,
      riskLevel: highestSeverity,
      weightPercent: categoryWeights[cat],
      completedChecks: catCompleted,
      totalChecks: catFindings.length,
    };
  });

  // Determine overall classification
  let classification: RiskClassification = 'Insufficient Data';
  if (dataCoveragePercent < 40 && criticalCount === 0 && highCount === 0) {
    classification = 'Insufficient Data';
  } else if (criticalCount > 0 || isHoneypotCombined) {
    classification = 'Critical Risk Indicators';
  } else if (highCount >= 2 || (highCount === 1 && moderateCount >= 2)) {
    classification = 'High Risk Signals';
  } else if (highCount === 1 || moderateCount >= 1) {
    classification = 'Moderate Risk Signals';
  } else {
    classification = 'Low Observed Risk';
  }

  // Transparent 0-100 Risk Index (Missing data adds uncertainty penalty rather than counting as 0 risk)
  let riskPoints = 0;
  riskPoints += criticalCount * 35;
  riskPoints += highCount * 20;
  riskPoints += moderateCount * 10;
  riskPoints += unknownCount * 8; // Missing data is never treated as passing a check
  const riskIndexScore =
    dataCoveragePercent < 25 && criticalCount === 0
      ? null
      : Math.min(100, Math.max(5, riskPoints));
  const safetyIndexScore = riskIndexScore !== null ? 100 - riskIndexScore : null;

  return {
    findings,
    riskOverview: {
      classification,
      riskIndexScore,
      safetyIndexScore,
      methodologyNote:
        'Deterministic Risk Index weights Smart Contract Security (30%), Trading Restrictions (30%), Liquidity (20%), Holders (10%), and Market Telemetry (10%). Missing or unverified checks apply an uncertainty penalty and are never treated as passing. A low risk score is never a guarantee of safety.',
      dataCoveragePercent,
      completedChecks,
      unavailableChecks,
      criticalCount,
      highCount,
      moderateCount,
      lowOrInfoCount,
      unknownCount,
      categoryBreakdown,
    },
  };
}
