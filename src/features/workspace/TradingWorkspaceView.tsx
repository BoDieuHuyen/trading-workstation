import {
  Activity, ChevronDown, CircleHelp, Clock3, Columns2, Download, LayoutDashboard,
  FileText, PanelLeftClose, Search, Settings, Star, Table2,
} from 'lucide-react';
import { useEffect } from 'react';
import { MARKET_SYMBOLS } from '../../config/marketSymbols';
import { SYSTEM_CONFIG } from '../../config/system';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import type { TradingWorkspaceViewProps } from './TradingWorkspaceView.types';
import { MarketOverview } from '../market-overview/MarketOverview';
import { BacktestOverview } from '../backtest-overview/BacktestOverview';
import { Report } from '../report/Report';

const watchlist = Object.values(MARKET_SYMBOLS);

export function TradingWorkspaceView({
  sidebarCollapsed,
  activeTab,
  activeWorkspacePage,
  mode,
  selectedSymbol,
  klines,
  onToggleSidebar,
  onSetActiveTab,
  onSetActiveWorkspacePage,
  onSetMode,
  onSetSelectedSymbol,
}: TradingWorkspaceViewProps) {
  const selectedMarket = MARKET_SYMBOLS[selectedSymbol];
  const selectedKline = klines[selectedSymbol];
  const selectedPrice = selectedKline?.price ?? '--';
  const selectedChange = selectedKline?.change ?? '--';
  const replayPlaying = useWorkspaceStore((state) => state.replayPlaying);
  const replaySpeed = useWorkspaceStore((state) => state.replaySpeed);
  const advanceReplay = useWorkspaceStore((state) => state.advanceReplay);

  useEffect(() => {
    if (mode !== 'backtest' || !replayPlaying) return;
    const intervalId = window.setInterval(advanceReplay, 1000 / replaySpeed);
    return () => window.clearInterval(intervalId);
  }, [advanceReplay, mode, replayPlaying, replaySpeed]);

  return (
    <main className="workstation">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon"><Activity size={18} /></div>
          <span>{SYSTEM_CONFIG.ui.brand.name}<span className="brand-accent">{SYSTEM_CONFIG.ui.brand.accent}</span></span>
          <span className="brand-version">{SYSTEM_CONFIG.ui.brand.workspace}</span>
        </div>
        <div className="topbar-divider" />
        <button className="symbol-select"><span className="coin-icon">{selectedMarket.icon}</span> {selectedSymbol} <ChevronDown className="muted" size={14} /></button>
        <span className="price-label">{selectedPrice} <span className={selectedChange.startsWith('+') ? 'positive' : 'negative'}>{selectedChange}</span></span>
        <div className="topbar-spacer" />
        <div className="mode-switch" role="group" aria-label={SYSTEM_CONFIG.ui.topbar.modeAriaLabel}>
          {SYSTEM_CONFIG.modes.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={mode === id ? 'mode-active' : ''}
              aria-pressed={mode === id}
              onClick={() => onSetMode(id)}
            >
              {id === 'live' && <span className={`live-dot${mode === id ? '' : ' live-dot--inactive'}`} />} {label}
            </button>
          ))}
        </div>
        <button className="top-button"><Clock3 size={14} /> {SYSTEM_CONFIG.ui.topbar.replay}</button>
        <button className="top-button"><LayoutDashboard size={14} /> {SYSTEM_CONFIG.ui.topbar.layout}</button>
        <button className="top-button"><Download size={14} /> {SYSTEM_CONFIG.ui.topbar.snapshot}</button>
        <button className="icon-button" title={SYSTEM_CONFIG.ui.topbar.settingsTitle}><Settings size={16} /></button>
        <div className="connection"><span className="live-dot" /> {SYSTEM_CONFIG.ui.topbar.connectionStatus}</div>
      </header>

      <div className="workspace-body">
        <aside className={`sidebar ${sidebarCollapsed ? 'sidebar--collapsed' : ''}`}>
          <div className="sidebar-head">
            {!sidebarCollapsed && <span>{SYSTEM_CONFIG.ui.sidebar.markets}</span>}
            <button className="icon-button" onClick={onToggleSidebar} title={sidebarCollapsed ? SYSTEM_CONFIG.ui.sidebar.expand : SYSTEM_CONFIG.ui.sidebar.collapse}>
              {sidebarCollapsed ? <Columns2 size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>
          {!sidebarCollapsed ? (
            <>
              <div className="sidebar-search"><Search size={14} /><input placeholder={SYSTEM_CONFIG.ui.sidebar.searchPlaceholder} /></div>
              <div className="sidebar-section-title"><span>{SYSTEM_CONFIG.ui.sidebar.watchlist}</span><button className="tiny-icon" title={SYSTEM_CONFIG.ui.sidebar.watchlistTitle}><Star size={13} /></button></div>
              {watchlist.map(({ symbol, key }) => {
                const kline = klines[symbol];
                const price = kline?.price ?? '--';
                const change = kline?.change ?? '--';
                return (
                  <button
                    className={`watch-row ${symbol === selectedSymbol ? 'watch-row--active' : ''}`}
                    key={symbol}
                    onClick={() => onSetSelectedSymbol(symbol)}
                    aria-pressed={symbol === selectedSymbol}
                  >
                    <span className={`watch-coin watch-coin--${key}`}>{MARKET_SYMBOLS[symbol].icon}</span>
                    <span className="watch-symbol">{symbol}</span>
                    <span className="watch-price">{price}<small className={change.startsWith('+') ? 'positive' : 'negative'}>{change}</small></span>
                  </button>
                );
              })}
              <div className="sidebar-section-title sidebar-section-title--spaced"><span>{SYSTEM_CONFIG.ui.sidebar.workspace}</span></div>
              <button
                className={`sidebar-link${activeWorkspacePage === 'chart' ? ' sidebar-link--active' : ''}`}
                aria-current={activeWorkspacePage === 'chart' ? 'page' : undefined}
                onClick={() => onSetActiveWorkspacePage('chart')}
              >
                <Columns2 size={15} /> {SYSTEM_CONFIG.ui.sidebar.chart}
              </button>
              <button
                className={`sidebar-link${activeWorkspacePage === 'eventFilters' ? ' sidebar-link--active' : ''}`}
                aria-current={activeWorkspacePage === 'eventFilters' ? 'page' : undefined}
                onClick={() => onSetActiveWorkspacePage('eventFilters')}
              >
                <FileText size={15} /> {SYSTEM_CONFIG.ui.sidebar.report}
              </button>
              <button className="sidebar-link"><Table2 size={15} /> {SYSTEM_CONFIG.ui.sidebar.dataExplorer}</button>
              <div className="sidebar-bottom"><CircleHelp size={14} /> {SYSTEM_CONFIG.ui.sidebar.help}</div>
            </>
          ) : (
            <div className="collapsed-icons">
              <button className="icon-button" title={SYSTEM_CONFIG.ui.sidebar.watchlistTitle}><Star size={16} /></button>
              <button className="icon-button" title={SYSTEM_CONFIG.ui.sidebar.searchTitle}><Search size={16} /></button>
            </div>
          )}
        </aside>

        <section className="main-area">
          <div className="page-heading">
            <div>
              <div className="eyebrow">{SYSTEM_CONFIG.ui.page.marketAnalysis} / {selectedSymbol}</div>
              <h1>{activeWorkspacePage === 'eventFilters'
                ? SYSTEM_CONFIG.ui.page.report
                : mode === 'backtest'
                  ? SYSTEM_CONFIG.ui.page.backtestOverview
                  : SYSTEM_CONFIG.ui.page.marketOverview} <span className="heading-dot">·</span> <span className="muted-heading">{selectedSymbol}</span></h1>
            </div>
          </div>

          {activeWorkspacePage === 'eventFilters' ? (
            <Report symbol={selectedSymbol} onSetSymbol={onSetSelectedSymbol} />
          ) : mode === 'backtest' ? (
            <BacktestOverview symbol={selectedSymbol} />
          ) : (
            <MarketOverview
              symbol={selectedSymbol}
              activeTab={activeTab}
              kline={selectedKline}
              onSetActiveTab={onSetActiveTab}
            />
          )}
        </section>
      </div>
    </main>
  );
}
