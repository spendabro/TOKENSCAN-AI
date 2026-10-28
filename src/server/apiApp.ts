import 'dotenv/config';
import express from 'express';
import { z } from 'zod';
import { type NetworkId, SUPPORTED_NETWORKS } from '../types/tokenlens.ts';
import { validateContractAddress } from './providers/rpcProvider.ts';
import { searchTokensByQuery } from './providers/dexScreenerProvider.ts';
import {
  getAllLiveReports,
  getReportById,
  getPlatformStats,
  executeLiveTokenScan,
  ensureInitialRealScansSeeded,
} from './storage.ts';
import { getSyntheticDemoReports } from './demoReports.ts';
import { answerReportQuestionWithGemma } from './gemmaService.ts';

// Simple in-memory rate limiter per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string, maxRequests = 40, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) {
    return false;
  }
  entry.count += 1;
  return true;
}

const ScanRequestSchema = z.object({
  networkId: z.enum([
    'ethereum',
    'bsc',
    'base',
    'arbitrum',
    'polygon',
    'solana',
    'hyperliquid',
  ]),
  contractAddress: z.string().min(10).max(100),
  forceRescan: z.boolean().optional(),
});

const AskQuestionSchema = z.object({
  question: z.string().min(2).max(500),
  languageMode: z.enum(['standard', 'simple', 'pidgin']).optional().default('standard'),
});

export function createApiApp() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  // Trigger non-blocking initial live seed so dashboard has genuine live scans ready
  ensureInitialRealScansSeeded().catch((err) =>
    console.warn('Background initial live scan seed warning:', err)
  );

  // Health & Platform Stats endpoint
  app.get('/api/stats', (_req, res) => {
    res.json({
      stats: getPlatformStats(),
      networks: Object.values(SUPPORTED_NETWORKS),
    });
  });

  // Get all live scanned reports
  app.get('/api/reports', (_req, res) => {
    res.json({
      reports: getAllLiveReports(),
      stats: getPlatformStats(),
    });
  });

  // Get synthetic demo mode reports
  app.get('/api/demo-reports', (_req, res) => {
    res.json({
      demoReports: getSyntheticDemoReports(),
    });
  });

  // Get a single report by scanId (works for both live and demo reports)
  app.get('/api/reports/:scanId', (req, res) => {
    const report = getReportById(req.params.scanId);
    if (!report) {
      res.status(404).json({ error: 'Security report not found.' });
      return;
    }
    res.json({ report });
  });

  // Validate a contract address before scanning
  app.get('/api/validate-address', (req, res) => {
    const networkId = String(req.query.networkId || 'ethereum') as NetworkId;
    const address = String(req.query.address || '');
    if (!SUPPORTED_NETWORKS[networkId]) {
      res.status(400).json({ valid: false, error: 'Unsupported blockchain network.' });
      return;
    }
    const result = validateContractAddress(networkId, address);
    res.json(result);
  });

  // Search tokens by name/symbol via DEX Screener resolver
  app.get('/api/search-tokens', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) {
      res.json({ candidates: [] });
      return;
    }
    const candidates = await searchTokensByQuery(q);
    res.json({ candidates });
  });

  // Execute a full 10-step token security scan
  app.post('/api/scan', async (req, res) => {
    const ip = req.ip || 'local';
    if (!checkRateLimit(ip, 25, 60_000)) {
      res.status(429).json({
        error: 'Rate limit exceeded. Please wait a moment before initiating another scan.',
      });
      return;
    }

    const parsed = ScanRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid scan request parameters. Provide a valid networkId and contractAddress.',
        details: parsed.error.flatten(),
      });
      return;
    }

    try {
      const report = await executeLiveTokenScan({
        networkId: parsed.data.networkId,
        contractAddress: parsed.data.contractAddress,
        forceRescan: parsed.data.forceRescan,
      });
      res.json({
        report,
        stats: getPlatformStats(),
      });
    } catch (err: any) {
      res.status(400).json({
        error: err?.message || 'Failed to complete token security scan.',
      });
    }
  });

  // Ask the Gemma 4 AI Security Analyst a grounded question about a specific report
  app.post('/api/reports/:scanId/ask', async (req, res) => {
    const ip = req.ip || 'local';
    if (!checkRateLimit(ip, 30, 60_000)) {
      res.status(429).json({
        error: 'Rate limit reached for AI Analyst questions. Please wait a moment.',
      });
      return;
    }

    const report = getReportById(req.params.scanId);
    if (!report) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }

    const parsed = AskQuestionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Please enter a valid question (2–500 characters).' });
      return;
    }

    try {
      const response = await answerReportQuestionWithGemma({
        report,
        question: parsed.data.question,
        languageMode: parsed.data.languageMode,
      });
      res.json(response);
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'Unable to generate AI Analyst response right now.',
      });
    }
  });

  return app;
}
