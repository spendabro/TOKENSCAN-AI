/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import {
  NetworkId,
  TokenScanReport,
  PlatformStats,
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
  auth,
  db,
  onAuthStateChanged,
  signOutCurrentUser,
  addFirestoreBookmark,
  removeFirestoreBookmark,
  collection,
  onSnapshot,
  query,
  where,
  handleFirestoreError,
  OperationType,
  type User,
} from './lib/firebase.ts';

const BOOKMARKS_STORAGE_KEY = 'tokenlens_bookmarks_v1';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkId>('ethereum');
  const [addressInput, setAddressInput] = useState('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [lightMode, setLightMode] = useState(false);

  const [liveReports, setLiveReports] = useState<TokenScanReport[]>([]);
  const [demoReports, setDemoReports] = useState<TokenScanReport[]>([]);
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

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to user's Firestore bookmarks once authenticated
  useEffect(() => {
    if (!authReady || !currentUser) return;

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

  const fetchPlatformData = useCallback(async () => {
    try {
      const [reportsRes, demoRes] = await Promise.all([
        fetch('/api/reports'),
        fetch('/api/demo-reports'),
      ]);

      if (reportsRes.ok) {
        const data = await reportsRes.json();
        setLiveReports(data.reports || []);
        setStats(data.stats || null);
      }

      if (demoRes.ok) {
        const dData = await demoRes.json();
        setDemoReports(dData.demoReports || []);
      }
    } catch (err) {
      console.warn('Error fetching platform data:', err);
    } finally {
      setLoadingInitial(false);
    }
  }, []);

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

    // Optimistic UI update
    setBookmarkedAddresses((prev) => {
      const next = exists ? prev.filter((k) => k !== key) : [...prev, key];
      try {
        localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });

    if (currentUser && currentUser.emailVerified) {
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

  const combinedReports = demoMode ? [...demoReports, ...liveReports] : liveReports;

  const currentReport: TokenScanReport | null =
    [...liveReports, ...demoReports].find((r) => r.scanId === activeReportId) ||
    combinedReports[0] ||
    null;

  return (
    <div
      className={`min-h-screen flex ${
        lightMode ? 'bg-[#0E1024] text-[#F8FAFC]' : 'bg-[#080817] text-[#F8FAFC]'
      }`}
    >
      {/* Collapsible Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
        selectedNetwork={selectedNetwork}
        onSelectNetwork={setSelectedNetwork}
        demoMode={demoMode}
        onToggleDemoMode={() => setDemoMode((d) => !d)}
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
          demoMode={demoMode}
          onToggleDemoMode={() => setDemoMode((d) => !d)}
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

        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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
                demoMode={demoMode}
                demoReports={demoReports}
              />

              <AnalyticsCards stats={stats} loading={loadingInitial} />

              <TokenExplorerTable
                reports={combinedReports}
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
              reports={combinedReports}
              loading={loadingInitial}
              onOpenReport={handleOpenReport}
              onRescan={(netId, addr) => handleTriggerScan(netId, addr, true)}
              bookmarkedAddresses={bookmarkedAddresses}
              onToggleBookmark={handleToggleBookmark}
            />
          )}

          {activeTab === 'market' && (
            <MarketOverviewView
              reports={combinedReports}
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
              reports={[...liveReports, ...demoReports]}
              bookmarkedKeys={bookmarkedAddresses}
              onOpenReport={handleOpenReport}
              onToggleBookmark={handleToggleBookmark}
              onScanToken={(netId, addr) => handleTriggerScan(netId, addr, true)}
            />
          )}

          {activeTab === 'history' && (
            <SavedAndHistoryView
              mode="history"
              reports={combinedReports}
              bookmarkedKeys={bookmarkedAddresses}
              onOpenReport={handleOpenReport}
              onToggleBookmark={handleToggleBookmark}
              onScanToken={(netId, addr) => handleTriggerScan(netId, addr, true)}
            />
          )}

          {(activeTab === 'docs' || activeTab === 'about' || activeTab === 'settings') && (
            <DocumentationView
              demoMode={demoMode}
              onToggleDemoMode={() => setDemoMode((d) => !d)}
              demoReports={demoReports}
              onOpenReport={handleOpenReport}
            />
          )}
        </main>

        {/* Quiet Footer */}
        <footer className="mt-auto border-t border-[#1E2040] px-6 py-4 text-xs text-[#94A3B8] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
