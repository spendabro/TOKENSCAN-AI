# TokenLens AI — Web3 Token Security Intelligence Platform

**Tagline:** *Understand the token. Understand the risk.*

TokenLens AI is an open-source, read-only Web3 token security intelligence platform that combines live blockchain RPC inspection (`viem`), multi-provider security telemetry (**GoPlus Security**, **Honeypot.is v2**, **DEX Screener**), an independent **Deterministic Risk Engine**, and **Google Gemma 4** (`gemma-4-31b-it` / `gemma-4-26b-a4b-it`) grounded natural-language explanations in Analyst English, Simple English, and Nigerian Pidgin.

---

## 1. Architecture Overview

- **Frontend (`src/`)**: React 19, TypeScript, Tailwind CSS, Lucide Icons, and Recharts.
- **Backend (`server.ts`, `src/server/`)**: Express + Vite full-stack server with rate limiting, Zod validation, and persistent storage (`data/tokenlens-scans.json` + Prisma schema in `prisma/schema.prisma`).
- **Provider Adapters (`src/server/providers/`)**:
  - `rpcProvider.ts`: Direct EVM `eth_getCode` bytecode verification & ERC-20 metadata reads via `viem`, plus EVM EIP-55 checksum and Solana Base58 validation.
  - `goplusProvider.ts`: Contract permissions, proxy detection, mint/pause/blacklist flags, and holder concentration (excluding burn and LP addresses).
  - `honeypotProvider.ts`: Live buy/sell transaction simulation and gas/tax inspection on supported networks (Ethereum, BNB Smart Chain, Base).
  - `dexScreenerProvider.ts`: Active DEX trading pairs, pool liquidity distribution, 24h volume, and distinct Circulating Market Cap vs. Fully Diluted Valuation (FDV) telemetry.
- **Deterministic Risk Engine (`src/server/riskEngine.ts`)**:
  - Operates completely independently of the LLM.
  - Evaluates evidence across 5 categories (`Smart Contract Security` 30%, `Trading Restrictions` 30%, `Liquidity Analysis` 20%, `Holder Concentration` 10%, `Market Information` 10%).
  - Explicitly distinguishes between **Verified Observations**, **Third-Party Assessments**, **Heuristic Indicators**, and **Missing / Unverified Data**.
  - Missing data is marked `Unknown` and never treated as passing a security check.
- **Gemma 4 AI Analyst (`src/server/gemmaService.ts`)**:
  - Server-side `@google/genai` integration supporting `gemma-4-31b-it` and `gemma-4-26b-a4b-it`.
  - Sanitizes untrusted on-chain token metadata against prompt injection.
  - Validates JSON output strictly using `AIAnalysisSchema` (Zod), with a deterministic fallback synthesizer.

---

## 2. Quick Start & Launch Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and ensure `GEMINI_API_KEY` is set.
3. **Start Full-Stack Server**:
   ```bash
   npm run dev
   ```
   The application runs on `http://localhost:3000`.

---

## 3. Hackathon Demonstration Guide

1. **Live Blockchain Scanning**:
   - Click any of the **Live Quick-Scan** presets in the Hero section (`USDT`, `PEPE`, `USDC (Base)`, `CAKE (BSC)`, `UNI`) or paste any live contract address.
   - Watch the 10-step deterministic & Gemma 4 pipeline execute in real time.
2. **Token Name Disambiguation**:
   - Type `PEPE` or `USDC` into the scanner input (without `0x`). TokenLens AI prevents symbol confusion by displaying matching contracts across chains so you select the exact contract address and network.
3. **Multilingual AI Security Summary & Grounded Q&A**:
   - Inside any security report, switch the Gemma 4 summary between **Analyst English**, **Simple English**, and **Nigerian Pidgin**.
   - Scroll to the **Gemma 4 Security Analyst Q&A** panel at the bottom of the report and click suggested prompts to see evidence-cited responses (`[EV-SC-001]`, `[EV-TR-002]`).
4. **Synthetic Demo Mode**:
   - Toggle **Demo Mode** in the top bar or sidebar to inspect three clearly labeled synthetic edge cases (High/Critical Risk Token, Low Observed Risk Token, and Incomplete Solana Telemetry).
