/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import {
  NetworkId,
  TokenScanReport,
  PlatformStats,
  PriceAlert,
  PriceAlertCondition,
} from './types/tokenlens.ts';
import {
  Sidebar,
  TopBar,
  MobileBottomNav,
  NavTab,
} from './components/Navigation.tsx';
import {
  HeroScanner,
  AnalyticsCards,
  TokenExplorerTable,
} from './components/DashboardComponents.tsx';
import { ReportView } from './components/ReportView.tsx';
import {
  SecuritySignalsGlossaryView,
  MarketOverviewView,
  SavedAndHistoryView,
  DocumentationView,
} from './components/SecondaryViews.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import {
  GlobalPriceAlertToasts,
  PriceAlertsDropdownModal,
  playAlertChime,
} from './components/PriceAlertPanel.tsx';
import { formatTokenPrice } from './utils/formatters.ts';
import {
  auth,
  db,
  subscribeToAuthSession,
  createUniversalFallbackSession,
  signOutCurrentUser,
  addFirestoreBookmark,
  removeFirestoreBookmark,
  collection,
  onSnapshot,
  query,
  where,
  handleFirestoreError,
  OperationType,
  type SessionUser,
} from './lib/firebase.ts';

const BOOKMARKS_STORAGE_KEY = 'tokenlens_bookmarks_v1';
const PRICE_ALERTS_STORAGE_KEY = 'tokenlens_price_alerts_v1';

function dispatchBrowserNotification(alert: PriceAlert, livePrice: number) {
  try {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification(
        `TokenLens Alert: ${alert.tokenSymbol} ${
          alert.condition === 'above' ? '≥' : '≤'
        } ${formatTokenPrice(alert.targetPriceUsd)}`,
        {
          body: `${alert.tokenName} (${alert.tokenSymbol}) is now trading at ${formatTokenPrice(
            livePrice
          )} on DEX Screener.${alert.note ? ` Note: ${alert.note}` : ''}`,
        }
      );
    }
  } catch {
    // ignore browser notification errors in restricted contexts
  }
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkId>('ethereum');
  const [addressInput, setAddressInput] = useState('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [lightMode, setLightMode] = useState(false);

  const [liveReports, setLiveReports] = useState<TokenScanReport[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);

  const [bookmarkedAddresses, setBookmarkedAddresses] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // User-Defined Price Alerts state persisted in localStorage
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>(() => {
    try {
      const saved = localStorage.getItem(PRICE_ALERTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCheckingPrices, setIsCheckingPrices] = useState(false);
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const alertsRef = useRef<PriceAlert[]>(priceAlerts);

  useEffect(() => {
    alertsRef.current = priceAlerts;
    try {
      localStorage.setItem(PRICE_ALERTS_STORAGE_KEY, JSON.stringify(priceAlerts));
    } catch {
      // ignore storage quota errors
    }
  }, [priceAlerts]);

  // Listen to unified Firebase + Universal Cross-Device Session state
  useEffect(() => {
    const unsubscribe = subscribeToAuthSession((user) => {
      // If a user opened a direct shared report link (?report=<scanId>) on any device,
      // automatically establish a session so the shared report opens immediately without a login wall
      const params = new URLSearchParams(window.location.search);
      const sharedScanId = params.get('report');
      if (!user && sharedScanId) {
        const autoUser = createUniversalFallbackSession('google.com', 'Shared Report Viewer');
        setCurrentUser(autoUser);
        setAuthReady(true);
        return;
      }

      setCurrentUser(user);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to user's Firestore bookmarks when authenticated with a Firestore-backed session
  useEffect(() => {
    if (!authReady || !currentUser || !currentUser.isFirestoreBacked || !auth.currentUser) {
      return;
    }

    const bmPath = `users/${currentUser.uid}/bookmarks`;
    const bmQuery = query(
      collection(db, bmPath),
      where('uid', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      bmQuery,
      (snapshot) => {
        const cloudKeys: string[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.networkId && data.contractAddress) {
            cloudKeys.push(`${data.networkId}:${String(data.contractAddress).toLowerCase()}`);
          }
        });
        setBookmarkedAddresses(cloudKeys);
        try {
          localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(cloudKeys));
        } catch {
          // ignore local storage error
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, bmPath);
      }
    );

    return () => unsubscribe();
  }, [authReady, currentUser]);

  // Evaluate active price alerts against newly observed token prices
  const evaluateAlertsWithLivePrice = useCallback(
    (networkId: NetworkId, contractAddress: string, livePriceUsd: number | null) => {
      if (livePriceUsd === null || !Number.isFinite(livePriceUsd) || livePriceUsd <= 0) {
        return;
      }

      const normAddr = contractAddress.toLowerCase();
      const nowIso = new Date().toISOString();

      let newlyTriggered: PriceAlert[] = [];

      setPriceAlerts((prev) =>
        prev.map((alert) => {
          if (
            alert.networkId !== networkId ||
            alert.contractAddress.toLowerCase() !== normAddr
          ) {
            return alert;
          }

          if (alert.status === 'triggered') {
            return {
              ...alert,
              lastCheckedPriceUsd: livePriceUsd,
              lastCheckedAt: nowIso,
            };
          }

          const crossed =
            (alert.condition === 'above' && livePriceUsd >= alert.targetPriceUsd) ||
            (alert.condition === 'below' && livePriceUsd <= alert.targetPriceUsd);

          if (crossed) {
            const updated: PriceAlert = {
              ...alert,
              lastCheckedPriceUsd: livePriceUsd,
              lastCheckedAt: nowIso,
              status: 'triggered',
              triggeredAt: nowIso,
              triggeredPriceUsd: livePriceUsd,
              unreadNotification: true,
            };
            newlyTriggered.push(updated);
            return updated;
          }

          return {
            ...alert,
            lastCheckedPriceUsd: livePriceUsd,
            lastCheckedAt: nowIso,
          };
        })
      );

      // Update matching report's market price so the UI & D3 chart stay synchronized
      setLiveReports((prevReports) =>
        prevReports.map((rep) => {
          if (
            rep.token.networkId === networkId &&
            rep.token.contractAddress.toLowerCase() === normAddr
          ) {
            return {
              ...rep,
              market: {
                ...rep.market,
                priceUsd: livePriceUsd,
              },
            };
          }
          return rep;
        })
      );

      if (newlyTriggered.length > 0) {
        playAlertChime();
        newlyTriggered.forEach((trig) => dispatchBrowserNotification(trig, livePriceUsd));
      }
    },
    []
  );

  // Poll DEX Screener live price feed (/api/market-price) for all monitored tokens
  const checkMonitoredAlertPrices = useCallback(async () => {
    const currentAlerts = alertsRef.current;
    if (currentAlerts.length === 0) return;

    // Group unique networkId:contractAddress pairs that have active alerts (or are in the watchlist)
    const uniqueTokens = new Map<string, { networkId: NetworkId; contractAddress: string }>();
    currentAlerts.forEach((a) => {
      const key = `${a.networkId}:${a.contractAddress.toLowerCase()}`;
      if (!uniqueTokens.has(key)) {
        uniqueTokens.set(key, {
          networkId: a.networkId,
          contractAddress: a.contractAddress,
        });
      }
    });

    if (uniqueTokens.size === 0) return;

    setIsCheckingPrices(true);
    try {
      await Promise.all(
        Array.from(uniqueTokens.values()).map(async ({ networkId, contractAddress }) => {
          try {
            const res = await fetch(
              `/api/market-price?networkId=${encodeURIComponent(
                networkId
              )}&address=${encodeURIComponent(contractAddress)}`
            );
            if (res.ok) {
              const data = await res.json();
              if (typeof data.priceUsd === 'number' && data.priceUsd > 0) {
                evaluateAlertsWithLivePrice(networkId, contractAddress, data.priceUsd);
              }
            }
          } catch {
            // ignore transient network errors during background poll
          }
        })
      );
    } finally {
      setIsCheckingPrices(false);
    }
  }, [evaluateAlertsWithLivePrice]);

  // Automatic 20-second background polling when user has price alerts
  useEffect(() => {
    const hasActiveAlerts = priceAlerts.some((a) => a.status === 'active');
    if (!hasActiveAlerts) return;

    const interval = setInterval(() => {
      checkMonitoredAlertPrices();
    }, 20_000);

    return () => clearInterval(interval);
  }, [priceAlerts, checkMonitoredAlertPrices]);

  const handleCreateAlert = (params: {
    scanId: string;
    networkId: NetworkId;
    contractAddress: string;
    tokenName: string;
    tokenSymbol: string;
    condition: PriceAlertCondition;
    targetPriceUsd: number;
    baselinePriceUsd: number;
    note?: string;
  }) => {
    const nowIso = new Date().toISOString();
    const livePrice = params.baselinePriceUsd;
    const alreadyCrossed =
      livePrice > 0 &&
      ((params.condition === 'above' && livePrice >= params.targetPriceUsd) ||
        (params.condition === 'below' && livePrice <= params.targetPriceUsd));

    const newAlert: PriceAlert = {
      id: `alert_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      scanId: params.scanId,
      networkId: params.networkId,
      contractAddress: params.contractAddress,
      tokenName: params.tokenName,
      tokenSymbol: params.tokenSymbol,
      condition: params.condition,
      targetPriceUsd: params.targetPriceUsd,
      baselinePriceUsd: params.baselinePriceUsd,
      lastCheckedPriceUsd: livePrice > 0 ? livePrice : null,
      lastCheckedAt: nowIso,
      status: alreadyCrossed ? 'triggered' : 'active',
      triggeredAt: alreadyCrossed ? nowIso : null,
      triggeredPriceUsd: alreadyCrossed ? livePrice : null,
      createdAt: nowIso,
      note: params.note,
      unreadNotification: alreadyCrossed,
    };

    setPriceAlerts((prev) => [newAlert, ...prev]);

    if (alreadyCrossed) {
      playAlertChime();
      dispatchBrowserNotification(newAlert, livePrice);
    } else {
      // Immediately verify against live DEX Screener endpoint
      setTimeout(() => {
        checkMonitoredAlertPrices();
      }, 250);
    }
  };

  const handleDeleteAlert = (alertId: string) => {
    setPriceAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const handleRearmAlert = (alertId: string) => {
    setPriceAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: 'active',
              triggeredAt: null,
              triggeredPriceUsd: null,
              unreadNotification: false,
            }
          : a
      )
    );
    setTimeout(() => {
      checkMonitoredAlertPrices();
    }, 200);
  };

  const handleDismissAlertNotification = (alertId: string) => {
    setPriceAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, unreadNotification: false } : a
      )
    );
  };

  const handleInspectAlertReport = (alert: PriceAlert) => {
    handleDismissAlertNotification(alert.id);
    const matchingReport = liveReports.find(
      (r) =>
        r.scanId === alert.scanId ||
        (r.token.networkId === alert.networkId &&
          r.token.contractAddress.toLowerCase() === alert.contractAddress.toLowerCase())
    );
    if (matchingReport) {
      setActiveReportId(matchingReport.scanId);
      setActiveTab('reports');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleTriggerScan(alert.networkId, alert.contractAddress, false);
    }
  };

  const fetchPlatformData = useCallback(async () => {
    try {
      const reportsRes = await fetch('/api/reports');
      if (reportsRes.ok) {
        const data = await reportsRes.json();
        const fetchedReports: TokenScanReport[] = data.reports || [];
        setLiveReports(fetchedReports);
        setStats(data.stats || null);

        // Evaluate any active alerts against fetched reports' prices
        fetchedReports.forEach((rep) => {
          if (rep.market.priceUsd !== null) {
            evaluateAlertsWithLivePrice(
              rep.token.networkId,
              rep.token.contractAddress,
              rep.market.priceUsd
            );
          }
        });
      }
    } catch (err) {
      console.warn('Error fetching platform data:', err);
    } finally {
      setLoadingInitial(false);
    }
  }, [evaluateAlertsWithLivePrice]);

  useEffect(() => {
    fetchPlatformData();
    const timer = setTimeout(() => {
      fetchPlatformData();
    }, 4500);
    return () => clearTimeout(timer);
  }, [fetchPlatformData]);

  // Handle Shareable Report URL (?report=<scanId>)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedScanId = params.get('report');
    if (sharedScanId) {
      setActiveReportId(sharedScanId);
      setActiveTab('reports');
    }
  }, []);

  const handleToggleBookmark = async (networkId: NetworkId, contractAddress: string) => {
    const key = `${networkId}:${contractAddress.toLowerCase()}`;
    const exists = bookmarkedAddresses.includes(key);

    // Optimistic UI update + localStorage persistence
    setBookmarkedAddresses((prev) => {
      const next = exists ? prev.filter((k) => k !== key) : [...prev, key];
      try {
        localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });

    if (currentUser && currentUser.isFirestoreBacked && auth.currentUser) {
      if (exists) {
        await removeFirestoreBookmark(currentUser.uid, networkId, contractAddress);
      } else {
        await addFirestoreBookmark(currentUser.uid, networkId, contractAddress);
      }
    }
  };

  const handleOpenReport = (scanId: string) => {
    setActiveReportId(scanId);
    setActiveTab('reports');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTriggerScan = async (
    networkId: NetworkId,
    contractAddress: string,
    forceRescan = false
  ) => {
    setScanError(null);
    setIsScanning(true);
    setScanStepIndex(0);

    const stepInterval = setInterval(() => {
      setScanStepIndex((prev) => (prev < 8 ? prev + 1 : prev));
    }, 550);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          networkId,
          contractAddress: contractAddress.trim(),
          forceRescan,
        }),
      });

      const data = await res.json();
      clearInterval(stepInterval);

      if (!res.ok) {
        setScanError(data.error || 'Token security scan failed.');
        setIsScanning(false);
        return;
      }

      setScanStepIndex(9);
      const newReport: TokenScanReport = data.report;

      setLiveReports((prev) => [
        newReport,
        ...prev.filter((r) => r.scanId !== newReport.scanId),
      ]);
      if (data.stats) {
        setStats(data.stats);
      }

      if (newReport.market.priceUsd !== null) {
        evaluateAlertsWithLivePrice(
          newReport.token.networkId,
          newReport.token.contractAddress,
          newReport.market.priceUsd
        );
      }

      setActiveReportId(newReport.scanId);
      setActiveTab('reports');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      clearInterval(stepInterval);
      setScanError(err?.message || 'Network error while executing token scan.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleGlobalSearchSubmit = () => {
    const q = globalSearchQuery.trim();
    if (!q) return;
    setAddressInput(q);
    if (q.startsWith('0x') || q.length >= 32) {
      handleTriggerScan(selectedNetwork, q, false);
    } else {
      setActiveTab('scanner');
    }
  };

  const handleSignOut = async () => {
    await signOutCurrentUser();
    setActiveTab('dashboard');
  };

  // Initial Auth Readiness Check
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#080817] text-[#F8FAFC] flex flex-col items-center justify-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#22D3EE] flex items-center justify-center shadow-lg shadow-[#8B5CF6]/20">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-center gap-2 text-xs text-[#94A3B8] font-mono">
          <Loader2 className="w-4 h-4 animate-spin text-[#8B5CF6]" />
          <span>Initializing TokenLens AI Security Session...</span>
        </div>
      </div>
    );
  }

  // Require Sign-Up or Sign-In with Google or Apple on the Landing Page before accessing the Dashboard
  if (!currentUser) {
    return <LandingPage stats={stats} />;
  }

  const currentReport: TokenScanReport | null =
    liveReports.find((r) => r.scanId === activeReportId) ||
    liveReports[0] ||
    null;

  const unreadAlertsCount = priceAlerts.filter((a) => a.unreadNotification).length;

  return (
    <div
      className={`min-h-screen flex ${
        lightMode ? 'bg-[#0E1024] text-[#F8FAFC]' : 'bg-[#080817] text-[#F8FAFC]'
      }`}
    >
      {/* Real-Time Price Alert Notification Toasts */}
      <GlobalPriceAlertToasts
        triggeredAlerts={priceAlerts}
        onDismissNotification={handleDismissAlertNotification}
        onInspectAlertReport={handleInspectAlertReport}
      />

      {/* Price Alerts Manager Modal */}
      <PriceAlertsDropdownModal
        isOpen={alertsModalOpen}
        onClose={() => setAlertsModalOpen(false)}
        alerts={priceAlerts}
        onDeleteAlert={handleDeleteAlert}
        onRearmAlert={handleRearmAlert}
        onInspectAlertReport={handleInspectAlertReport}
        onCheckPricesNow={checkMonitoredAlertPrices}
        isCheckingPrices={isCheckingPrices}
      />

      {/* Collapsible Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
        selectedNetwork={selectedNetwork}
        onSelectNetwork={setSelectedNetwork}
        bookmarksCount={bookmarkedAddresses.length}
        historyCount={liveReports.length}
        lightMode={lightMode}
        onToggleLightMode={() => setLightMode((l) => !l)}
        globalSearchQuery={globalSearchQuery}
        onGlobalSearchChange={setGlobalSearchQuery}
        onGlobalSearchSubmit={handleGlobalSearchSubmit}
        currentUser={currentUser}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <TopBar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
          selectedNetwork={selectedNetwork}
          onSelectNetwork={setSelectedNetwork}
          bookmarksCount={bookmarkedAddresses.length}
          historyCount={liveReports.length}
          lightMode={lightMode}
          onToggleLightMode={() => setLightMode((l) => !l)}
          globalSearchQuery={globalSearchQuery}
          onGlobalSearchChange={setGlobalSearchQuery}
          onGlobalSearchSubmit={handleGlobalSearchSubmit}
          currentUser={currentUser}
          onSignOut={handleSignOut}
          alertsCount={priceAlerts.length}
          unreadAlertsCount={unreadAlertsCount}
          onOpenAlertsModal={() => setAlertsModalOpen(true)}
        />

        <main className="flex-1 w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
          {(activeTab === 'dashboard' || activeTab === 'scanner') && (
            <>
              <HeroScanner
                selectedNetwork={selectedNetwork}
                onSelectNetwork={setSelectedNetwork}
                addressInput={addressInput}
                onAddressInputChange={setAddressInput}
                onTriggerScan={handleTriggerScan}
                isScanning={isScanning}
                scanStepIndex={scanStepIndex}
                scanError={scanError}
                recentReports={liveReports.slice(0, 4)}
                onOpenReport={handleOpenReport}
              />

              <AnalyticsCards stats={stats} loading={loadingInitial} />

              <TokenExplorerTable
                reports={liveReports}
                loading={loadingInitial}
                onOpenReport={handleOpenReport}
                onRescan={(netId, addr) => handleTriggerScan(netId, addr, true)}
                bookmarkedAddresses={bookmarkedAddresses}
                onToggleBookmark={handleToggleBookmark}
              />
            </>
          )}

          {activeTab === 'explore' && (
            <TokenExplorerTable
              reports={liveReports}
              loading={loadingInitial}
              onOpenReport={handleOpenReport}
              onRescan={(netId, addr) => handleTriggerScan(netId, addr, true)}
              bookmarkedAddresses={bookmarkedAddresses}
              onToggleBookmark={handleToggleBookmark}
            />
          )}

          {activeTab === 'market' && (
            <MarketOverviewView
              reports={liveReports}
              onOpenReport={handleOpenReport}
            />
          )}

          {activeTab === 'reports' && (
            <>
              {currentReport ? (
                <ReportView
                  report={currentReport}
                  onBackToDashboard={() => setActiveTab('dashboard')}
                  onRescan={(netId, addr) => handleTriggerScan(netId, addr, true)}
                  isScanning={isScanning}
                  isBookmarked={bookmarkedAddresses.includes(
                    `${currentReport.token.networkId}:${currentReport.token.contractAddress.toLowerCase()}`
                  )}
                  onToggleBookmark={() =>
                    handleToggleBookmark(
                      currentReport.token.networkId,
                      currentReport.token.contractAddress
                    )
                  }
                  alerts={priceAlerts}
                  onCreateAlert={handleCreateAlert}
                  onDeleteAlert={handleDeleteAlert}
                  onRearmAlert={handleRearmAlert}
                  onCheckPricesNow={checkMonitoredAlertPrices}
                  isCheckingPrices={isCheckingPrices}
                />
              ) : (
                <div className="rounded-2xl bg-[#15162D] border border-[#25274D] p-12 text-center space-y-3">
                  <div className="text-base font-bold text-[#F8FAFC]">
                    No Token Security Report Selected
                  </div>
                  <p className="text-xs text-[#94A3B8]">
                    Scan a token contract from the Dashboard or select a recent report to view
                    detailed security telemetry.
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === 'signals' && <SecuritySignalsGlossaryView />}

          {activeTab === 'bookmarks' && (
            <SavedAndHistoryView
              mode="bookmarks"
              reports={liveReports}
              bookmarkedKeys={bookmarkedAddresses}
              onOpenReport={handleOpenReport}
              onToggleBookmark={handleToggleBookmark}
              onScanToken={(netId, addr) => handleTriggerScan(netId, addr, true)}
            />
          )}

          {activeTab === 'history' && (
            <SavedAndHistoryView
              mode="history"
              reports={liveReports}
              bookmarkedKeys={bookmarkedAddresses}
              onOpenReport={handleOpenReport}
              onToggleBookmark={handleToggleBookmark}
              onScanToken={(netId, addr) => handleTriggerScan(netId, addr, true)}
            />
          )}

          {(activeTab === 'docs' || activeTab === 'about' || activeTab === 'settings') && (
            <DocumentationView />
          )}
        </main>

        {/* Quiet Footer */}
        <footer className="mt-auto border-t border-[#1E2040] px-4 sm:px-6 py-4 text-xs text-[#94A3B8] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <strong>TokenLens AI</strong> — Understand the token. Understand the risk. Read-only
            security intelligence; never financial advice.
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('signals')}
              className="hover:text-[#F8FAFC] transition-colors"
            >
              Security Glossary
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('docs')}
              className="hover:text-[#F8FAFC] transition-colors"
            >
              Risk Methodology
            </button>
          </div>
        </footer>
      </div>

      {/* Adaptive Mobile Bottom Bar */}
      <MobileBottomNav activeTab={activeTab} onSelectTab={setActiveTab} />
    </div>
  );
}
