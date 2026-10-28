import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Lock,
  Loader2,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import {
  signInWithGooglePopup,
  signInWithApplePopup,
  firebaseConfig,
} from '../lib/firebase.ts';
import { PlatformStats } from '../types/tokenlens.ts';

interface LandingPageProps {
  stats: PlatformStats | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({ stats }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'apple' | null>(null);
  const [analystEmailInput, setAnalystEmailInput] = useState('');

  const handleGoogleAuth = async () => {
    setLoadingProvider('google');
    try {
      await signInWithGooglePopup(analystEmailInput);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleAppleAuth = async () => {
    setLoadingProvider('apple');
    try {
      await signInWithApplePopup(analystEmailInput);
    } finally {
      setLoadingProvider(null);
    }
  };

  const scrollToAuthCard = () => {
    const el = document.getElementById('auth-portal-card');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="min-h-screen bg-[#080817] text-[#F8FAFC] flex flex-col selection:bg-[#8B5CF6]/30">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="sticky top-0 z-40 border-b border-[#1E2040] bg-[#080817]/90 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-8 px-6 lg:px-12 py-4">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            className="text-lg font-bold tracking-tight text-[#F8FAFC] whitespace-nowrap shrink-0"
          >
            TokenLens AI
          </a>

          {/* Zone 2: 4 concise single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#94A3B8]">
            <a
              href="#capabilities"
              className="hover:text-[#F8FAFC] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Capabilities
            </a>
            <a
              href="#methodology"
              className="hover:text-[#F8FAFC] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Methodology
            </a>
            <a
              href="#evidence"
              className="hover:text-[#F8FAFC] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Sample Evidence
            </a>
            <a
              href="#networks"
              className="hover:text-[#F8FAFC] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Networks
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={scrollToAuthCard}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Access Security Workspace
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* HERO SECTION: 2-Column Split with items-stretch */}
        <section className="relative overflow-hidden border-b border-[#1E2040]">
          {/* Subtle Ambient Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 left-1/4 w-[32rem] h-[32rem] rounded-full bg-[#8B5CF6]/12 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 right-1/4 w-[28rem] h-[28rem] rounded-full bg-[#22D3EE]/8 blur-3xl"
          />

          <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-12 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
              {/* Left 7 Columns: Value Proposition & Live Architecture Preview */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
                <div className="space-y-6">
                  {/* Quiet Unboxed Metadata Kicker */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#A78BFA]">
                    <span>Web3 Security Intelligence</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#94A3B8]">Deterministic Risk Engine</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#22D3EE]">Google Gemma 4 Explanations</span>
                  </div>

                  {/* Display Headline with text-wrap: balance */}
                  <h1
                    className="font-bold tracking-tight text-[#F8FAFC] leading-[1.08]"
                    style={{
                      fontSize: 'clamp(2.25rem, 4vw, 3.75rem)',
                      textWrap: 'balance',
                    }}
                  >
                    Understand the token. Understand the risk.
                  </h1>

                  <p className="text-base sm:text-lg text-[#94A3B8] max-w-2xl leading-relaxed">
                    Investigate smart-contract permissions, ownership structures, honeypot
                    simulations, liquidity locks, and holder concentration before you interact.
                    TokenLens AI pairs deterministic blockchain evidence with plain-language Gemma 4
                    explanations—without ever asking you to connect a crypto wallet.
                  </p>
                </div>

                {/* Live Evidence Preview Surface */}
                <div className="rounded-2xl bg-[#101126] border border-[#23254A] p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#94A3B8] border-b border-[#1E2040] pb-3">
                    <span className="font-semibold text-[#F8FAFC]">
                      Live Evidence Pipeline Preview
                    </span>
                    <span className="font-mono text-[#22D3EE]">
                      viem RPC · GoPlus · Honeypot.is · DEX Screener
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="text-[#94A3B8]">Contract Permissions</div>
                      <div className="font-semibold text-[#F8FAFC]">
                        Mint, Proxy, Pause &amp; Owner
                      </div>
                      <div className="text-[11px] text-[#94A3B8]">
                        Distinguishes capability presence from active abuse
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[#94A3B8]">Trade Simulation</div>
                      <div className="font-semibold text-[#F8FAFC]">
                        Buy/Sell Taxes &amp; Reverts
                      </div>
                      <div className="text-[11px] text-[#94A3B8]">
                        Point-in-time AMM swap execution &amp; gas checks
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[#94A3B8]">Grounded AI Analyst</div>
                      <div className="font-semibold text-[#F8FAFC]">
                        English, Simple &amp; Pidgin
                      </div>
                      <div className="text-[11px] text-[#94A3B8]">
                        Every claim cites a deterministic Evidence ID
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 5 Columns: Required Google / Apple Sign-Up & Sign-In Gate Card */}
              <div className="lg:col-span-5 flex flex-col">
                <div
                  id="auth-portal-card"
                  className="h-full rounded-2xl bg-[#15162D] border border-[#2A2D5A] p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-2xl"
                >
                  <div className="space-y-5">
                    {/* Interactive Segmented Tab Control (Sign Up vs Sign In) */}
                    <div className="grid grid-cols-2 gap-1 p-1 bg-[#080817] rounded-xl border border-[#23254A]">
                      <button
                        type="button"
                        onClick={() => setAuthMode('signup')}
                        className={`py-2 px-4 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                          authMode === 'signup'
                            ? 'bg-[#8B5CF6] text-white'
                            : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                        }`}
                      >
                        Create Account
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthMode('signin')}
                        className={`py-2 px-4 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                          authMode === 'signin'
                            ? 'bg-[#8B5CF6] text-white'
                            : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                        }`}
                      >
                        Sign In
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <h2 className="text-xl sm:text-2xl font-bold text-[#F8FAFC]">
                        {authMode === 'signup'
                          ? 'Sign up for TokenLens AI'
                          : 'Sign in to your workspace'}
                      </h2>
                      <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                        {authMode === 'signup'
                          ? 'Authenticate with Google or Apple on any mobile or desktop device to unlock live multi-chain token scanning and Gemma 4 security reports.'
                          : 'Welcome back. Continue with Google or Apple on any device to access your saved token scans and security dashboard.'}
                      </p>
                    </div>

                    {/* Optional Email / Handle for Mobile & Cross-Device Profile */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="analyst-email-input"
                        className="block text-[11px] font-medium text-[#94A3B8]"
                      >
                        Email or Analyst Handle (Optional for mobile &amp; in-app browsers)
                      </label>
                      <input
                        id="analyst-email-input"
                        type="text"
                        value={analystEmailInput}
                        onChange={(e) => setAnalystEmailInput(e.target.value)}
                        placeholder="you@example.com or @handle"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#080817] border border-[#2A2D5A] focus:border-[#8B5CF6] text-xs sm:text-sm text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none"
                      />
                    </div>

                    {/* OAuth Provider Buttons */}
                    <div className="space-y-3 pt-1">
                      {/* Continue with Google */}
                      <button
                        type="button"
                        disabled={loadingProvider !== null}
                        onClick={handleGoogleAuth}
                        className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-60 text-[#080817] font-semibold text-sm flex items-center justify-center gap-3 transition-colors cursor-pointer"
                      >
                        {loadingProvider === 'google' ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#080817]" />
                        ) : (
                          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              fill="#4285F4"
                              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                            />
                          </svg>
                        )}
                        <span className="whitespace-nowrap">
                          {authMode === 'signup'
                            ? 'Sign up with Google'
                            : 'Continue with Google'}
                        </span>
                      </button>

                      {/* Continue with Apple */}
                      <button
                        type="button"
                        disabled={loadingProvider !== null}
                        onClick={handleAppleAuth}
                        className="w-full py-3 px-4 rounded-xl bg-[#080817] hover:bg-[#101126] disabled:opacity-60 text-[#F8FAFC] border border-[#2A2D5A] hover:border-[#8B5CF6]/60 font-semibold text-sm flex items-center justify-center gap-3 transition-colors cursor-pointer"
                      >
                        {loadingProvider === 'apple' ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#F8FAFC]" />
                        ) : (
                          <svg
                            className="w-4 h-4 shrink-0 fill-current"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                          </svg>
                        )}
                        <span className="whitespace-nowrap">
                          {authMode === 'signup'
                            ? 'Sign up with Apple'
                            : 'Continue with Apple'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Read-Only Security Guarantee Footer inside Card */}
                  <div className="pt-4 border-t border-[#23254A] space-y-2 text-xs text-[#94A3B8]">
                    <div className="flex items-center gap-2 text-[#F8FAFC] font-medium">
                      <Lock className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                      <span>Zero-Wallet Read-Only Security Guarantee</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      TokenLens AI never requests wallet connections, token approvals, private keys,
                      or seed phrases. Your account is strictly used to protect scan quotas and sync
                      your bookmarked token reports across devices.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* FULL-WIDTH 4-COLUMN KPI / TELEMETRY STRIP BELOW HERO SPLIT */}
            <div className="mt-10 pt-8 border-t border-[#1E2040] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[#F8FAFC]">
                  4 Providers
                </div>
                <div className="text-xs text-[#94A3B8] mt-1">
                  On-Chain RPC (viem) · GoPlus · Honeypot.is · DEX Screener
                </div>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[#F8FAFC]">
                  {stats ? `${stats.mvpNetworksCount} MVP / ${stats.supportedNetworksCount} Chains` : '3 MVP / 6 Chains'}
                </div>
                <div className="text-xs text-[#94A3B8] mt-1">
                  Ethereum · BNB Smart Chain · Base · Arbitrum · Polygon · Solana
                </div>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[#F8FAFC]">
                  10-Step Pipeline
                </div>
                <div className="text-xs text-[#94A3B8] mt-1">
                  Deterministic Risk Engine Evaluated Prior to AI Explanation
                </div>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[#F8FAFC]">
                  3 Languages
                </div>
                <div className="text-xs text-[#94A3B8] mt-1">
                  Analyst English · Simple Beginner English · Nigerian Pidgin
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: CORE CAPABILITIES ASYMMETRIC BENTO GRID */}
        <section id="capabilities" className="py-16 lg:py-24 border-b border-[#1E2040]">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-12 space-y-10">
            <div className="max-w-2xl space-y-3">
              <div className="text-xs font-medium text-[#A78BFA]">
                Architecture &amp; Capabilities
              </div>
              <h2
                className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]"
                style={{ textWrap: 'balance' }}
              >
                Evidence-backed token intelligence built for clarity, not hype.
              </h2>
              <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
                Existing block explorers overwhelm beginners with raw hexadecimal calldata, while
                automated scoring bots hide missing data behind arbitrary 0–100 numbers. TokenLens
                AI separates deterministic verification from AI translation.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Bento Item 1 (col-span-2) */}
              <div className="lg:col-span-2 rounded-2xl bg-[#15162D] border border-[#23254A] p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="text-xs font-mono text-[#A78BFA]">
                    01. Smart Contract Permission &amp; Bytecode Inspection
                  </div>
                  <h3 className="text-xl font-bold text-[#F8FAFC]">
                    Distinguish between a capability existing and a capability being abused.
                  </h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed max-w-2xl">
                    Regulated stablecoins like USDT and USDC include address blacklists and upgrade
                    proxies for legal compliance, whereas unregulated tokens may use those same
                    functions to trap buyers. TokenLens AI inspects deployed bytecode via{' '}
                    <code className="text-[#F8FAFC] font-mono">viem</code> and GoPlus Security to
                    show who holds administrative keys, whether ownership can be secretly reclaimed,
                    and whether minting is still active.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#23254A] font-mono text-xs">
                  <div>
                    <div className="text-[#94A3B8]">Bytecode Check</div>
                    <div className="text-[#22C55E] font-semibold mt-0.5">eth_getCode RPC</div>
                  </div>
                  <div>
                    <div className="text-[#94A3B8]">Mint Authority</div>
                    <div className="text-[#F8FAFC] font-semibold mt-0.5">Supply Dilution</div>
                  </div>
                  <div>
                    <div className="text-[#94A3B8]">Proxy Detection</div>
                    <div className="text-[#F8FAFC] font-semibold mt-0.5">EIP-1967 / UUPS</div>
                  </div>
                  <div>
                    <div className="text-[#94A3B8]">Admin Reclaim</div>
                    <div className="text-[#F59E0B] font-semibold mt-0.5">Hidden Modifiers</div>
                  </div>
                </div>
              </div>

              {/* Bento Item 2 (col-span-1) */}
              <div className="rounded-2xl bg-[#15162D] border border-[#23254A] p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="text-xs font-mono text-[#22D3EE]">
                    02. Live Trade &amp; Honeypot Simulation
                  </div>
                  <h3 className="text-xl font-bold text-[#F8FAFC]">
                    Point-in-time buy and sell swap simulation.
                  </h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">
                    Integrates Honeypot.is v2 to simulate buy and sell transactions, measuring exact
                    buy tax, sell tax, transfer tax, and gas usage while warning when taxes remain
                    modifiable by the contract owner.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0B0C1E] border border-[#1E2040] font-mono text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">Simulated Buy / Sell Tax</span>
                    <span className="text-[#22C55E]">0.00% / 0.00%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">Unsupported Network Handling</span>
                    <span className="text-[#F59E0B]">Explicit Notice</span>
                  </div>
                </div>
              </div>

              {/* Bento Item 3 (col-span-1) */}
              <div className="rounded-2xl bg-[#15162D] border border-[#23254A] p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="text-xs font-mono text-[#22D3EE]">
                    03. Liquidity Locks &amp; Holder Separation
                  </div>
                  <h3 className="text-xl font-bold text-[#F8FAFC]">
                    Never confuse pool size with locked liquidity.
                  </h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">
                    Separates burn addresses (<code className="font-mono text-[#F8FAFC]">0x000...dead</code>) and
                    DEX liquidity pool contracts from ordinary investor wallets, and tracks
                    circulating Market Cap distinctly from Fully Diluted Valuation (FDV).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0B0C1E] border border-[#1E2040] font-mono text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">Burn &amp; LP Exclusion</span>
                    <span className="text-[#22C55E]">Automated</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">Market Cap vs. FDV</span>
                    <span className="text-[#A78BFA]">Never Substituted</span>
                  </div>
                </div>
              </div>

              {/* Bento Item 4 (col-span-2) */}
              <div className="lg:col-span-2 rounded-2xl bg-[#15162D] border border-[#23254A] p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="text-xs font-mono text-[#A78BFA]">
                    04. Grounded Google Gemma 4 Security Analyst
                  </div>
                  <h3 className="text-xl font-bold text-[#F8FAFC]">
                    Strict Zod-validated explanations in English, Simple English, and Nigerian Pidgin.
                  </h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed max-w-2xl">
                    Gemma 4 never invents risk scores, holder percentages, or audit claims. Every
                    statement in the AI summary and interactive Q&amp;A panel is grounded in the
                    deterministic evidence array and cites verifiable Evidence IDs (such as{' '}
                    <code className="font-mono text-[#22D3EE]">[EV-SC-002]</code> or{' '}
                    <code className="font-mono text-[#22D3EE]">[EV-TR-001]</code>).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[#23254A] text-xs">
                  <div className="p-3 rounded-xl bg-[#0B0C1E] border border-[#1E2040]">
                    <div className="font-semibold text-[#F8FAFC]">Analyst English</div>
                    <div className="text-[#94A3B8] mt-0.5">
                      Technical breakdown for researchers &amp; developers
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0B0C1E] border border-[#1E2040]">
                    <div className="font-semibold text-[#A78BFA]">Simple English</div>
                    <div className="text-[#94A3B8] mt-0.5">
                      Plain, jargon-free guidance for DeFi beginners
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0B0C1E] border border-[#1E2040]">
                    <div className="font-semibold text-[#22C55E]">Nigerian Pidgin</div>
                    <div className="text-[#94A3B8] mt-0.5">
                      Accessible localized explanations for West African users
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: EPISTEMIC METHODOLOGY & SAMPLE EVIDENCE ADJACENCY */}
        <section id="methodology" className="py-16 lg:py-24 border-b border-[#1E2040]">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-12 space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5 space-y-4">
                <div className="text-xs font-medium text-[#22D3EE]">
                  Epistemic Integrity &amp; Risk Methodology
                </div>
                <h2
                  className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]"
                  style={{ textWrap: 'balance' }}
                >
                  Four distinct evidence tiers. Missing data is never treated as safe.
                </h2>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Automated scanners often mark a check with a green checkmark simply because an API
                  returned <code className="font-mono text-[#F8FAFC]">null</code>. TokenLens AI
                  classifies every security signal into one of four transparent categories and
                  tracks **Data Coverage (%)** separately from **Observed Risk**.
                </p>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-[#101126] border border-[#23254A] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#22C55E]">
                      1. Verified Observations
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                  </div>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    Direct on-chain state reads via <code className="font-mono text-[#F8FAFC]">viem</code>{' '}
                    RPC (deployed bytecode length, ERC-20 total supply, decimals, and Ownable owner
                    address) plus active DEX pool reserves.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#101126] border border-[#23254A] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#22D3EE]">
                      2. Third-Party Assessments
                    </span>
                    <ShieldCheck className="w-4 h-4 text-[#22D3EE]" />
                  </div>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    Static and dynamic security indicators reported by GoPlus Security and
                    Honeypot.is v2 trade simulations, with explicit provider attribution and latency
                    timestamps.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#101126] border border-[#23254A] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#F59E0B]">
                      3. Heuristic Risk Indicators
                    </span>
                    <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                  </div>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    Contextual signals such as top-10 non-pool holder concentration and newly
                    created DEX trading pairs (&lt;7 days old) that warrant extra caution.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#101126] border border-[#23254A] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#94A3B8]">
                      4. Missing / Unverified Data
                    </span>
                    <Lock className="w-4 h-4 text-[#94A3B8]" />
                  </div>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    When a check is unsupported on a network or unindexed by a provider, it is
                    labeled <code className="font-mono text-[#F8FAFC]">Unknown</code> and applies an
                    uncertainty notice rather than passing silently.
                  </p>
                </div>
              </div>
            </div>

            {/* Proof / Sample Evidence Comparison Block */}
            <div id="evidence" className="rounded-2xl bg-[#15162D] border border-[#25274D] p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#23254A] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#F8FAFC]">
                    Real-World Evidence Comparison Inside the Workspace
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Examples of deterministic findings generated by the TokenLens AI engine
                  </p>
                </div>
                <button
                  type="button"
                  onClick={scrollToAuthCard}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[#A78BFA] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                >
                  <span>Sign in to inspect full interactive reports</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-xl bg-[#0B0C1E] border border-[#1E2040] space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#F8FAFC] font-bold">
                      Tether USD (USDT) · Ethereum Mainnet
                    </span>
                    <span className="text-[#F59E0B]">MODERATE SIGNALS</span>
                  </div>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    <strong>[EV-TR-003] &amp; [EV-TR-004]:</strong> Detects active owner address,
                    global transfer pause capability, and compliance address blacklist on-chain,
                    while explaining in plain English why centralized stablecoins include these
                    admin controls.
                  </p>
                  <div className="text-[11px] font-mono text-[#22D3EE]">
                    100% Data Coverage · 0% Buy/Sell Tax · $190M+ DEX Liquidity
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-[#0B0C1E] border border-[#1E2040] space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#F8FAFC] font-bold">
                      Pepe (PEPE) · Ethereum Mainnet
                    </span>
                    <span className="text-[#22C55E]">LOW OBSERVED RISK</span>
                  </div>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    <strong>[EV-SC-003] &amp; [EV-TR-002]:</strong> Verifies renounced contract
                    ownership, immutable non-proxy code, and 0% buy/sell taxes in live Honeypot.is
                    simulation, while still reminding users of market volatility.
                  </p>
                  <div className="text-[11px] font-mono text-[#22D3EE]">
                    100% Data Coverage · Ownership Renounced · Multi-Pool Liquidity
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: SUPPORTED NETWORKS & FINAL CONVERSION CTA */}
        <section id="networks" className="py-16 lg:py-20">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
            <div className="rounded-2xl bg-gradient-to-br from-[#161735] via-[#121329] to-[#0B0C1E] border border-[#2A2D5A] p-8 sm:p-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="space-y-3 max-w-2xl">
                <div className="text-xs font-mono text-[#A78BFA]">
                  Multi-Chain Provider Capability Detection
                </div>
                <h2
                  className="text-2xl sm:text-3xl font-bold text-[#F8FAFC]"
                  style={{ textWrap: 'balance' }}
                >
                  Ready to inspect any token across Ethereum, BNB Smart Chain, Base, Hyperliquid,
                  Solana, Arbitrum, and Polygon?
                </h2>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Create your free analyst account or sign in with Google or Apple to enter the
                  TokenLens AI dashboard.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={scrollToAuthCard}
                  className="px-6 py-3.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-sm font-semibold text-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  Sign In with Google or Apple
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* QUIET FOOTER */}
      <footer className="border-t border-[#1E2040] bg-[#080817] py-8 px-6 lg:px-12 text-xs text-[#94A3B8]">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <strong className="text-[#F8FAFC]">TokenLens AI</strong> — Understand the token.
            Understand the risk. Open-source Web3 security intelligence.
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <a href="#capabilities" className="hover:text-[#F8FAFC] transition-colors">
              Capabilities
            </a>
            <a href="#methodology" className="hover:text-[#F8FAFC] transition-colors">
              Methodology
            </a>
            <a href="#evidence" className="hover:text-[#F8FAFC] transition-colors">
              Evidence Standards
            </a>
            <button
              type="button"
              onClick={scrollToAuthCard}
              className="hover:text-[#F8FAFC] transition-colors cursor-pointer"
            >
              Analyst Sign In
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
