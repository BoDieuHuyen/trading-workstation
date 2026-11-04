import { useEffect } from 'react';
import {
  Activity, Bell, ChevronDown, CircleHelp, Clock3, Columns2, Download, LayoutDashboard,
  ListFilter, PanelLeftClose, Search, Settings, Star, Table2, Terminal, Wallet,
} from 'lucide-react';
import { MARKET_SYMBOLS } from '../../config/marketSymbols';
import { SYSTEM_CONFIG } from '../../config/system';
import { useWorkspaceStore, type BottomTab } from '../../stores/workspaceStore';
import { ChartPanel } from '../chart/ChartPanel';

const tabIcons: Record<BottomTab, typeof Activity> = {
  events: Activity,
  trades: Wallet,
  signals: Bell,
  logs: Terminal,
};
const tabs = SYSTEM_CONFIG.ui.activityTabs.map(({ id, label }) => ({
  id,
  label,
  icon: tabIcons[id],
}));

const sampleEvents = [
  ['10:42:15', '1H', 'BOS+', '96,420.5', 'Bullish'],
  ['10:45:02', '15m', 'CHOCH+', '96,515.0', 'Bullish'],
  ['10:48:31', '15m', 'FVG', '96,590.0', 'Detected'],
  ['11:02:08', '15m', 'ENTRY', '96,655.5', 'Triggered'],
];

const watchlist = Object.values(MARKET_SYMBOLS);

export function TradingWorkspace() {
  const {
    sidebarCollapsed, activeTab, mode, selectedSymbol, toggleSidebar, setSidebarCollapsed,
    setActiveTab, setMode, setSelectedSymbol,
  } = useWorkspaceStore();
  const selectedMarket = MARKET_SYMBOLS[selectedSymbol];

  useEffect(() => {
    const breakpoint = window.matchMedia('(max-width: 1100px)');
    const updateSidebar = () => setSidebarCollapsed(breakpoint.matches);
    updateSidebar();
    breakpoint.addEventListener('change', updateSidebar);
    return () => breakpoint.removeEventListener('change', updateSidebar);
  }, [setSidebarCollapsed]);

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
        <span className="price-label">{selectedMarket.price} <span className={selectedMarket.change.startsWith('+') ? 'positive' : 'negative'}>{selectedMarket.change}</span></span>
        <div className="topbar-spacer" />
        <div className="mode-switch" role="group" aria-label={SYSTEM_CONFIG.ui.topbar.modeAriaLabel}>
          {SYSTEM_CONFIG.modes.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={mode === id ? 'mode-active' : ''}
              aria-pressed={mode === id}
              onClick={() => setMode(id)}
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
            <button className="icon-button" onClick={toggleSidebar} title={sidebarCollapsed ? SYSTEM_CONFIG.ui.sidebar.expand : SYSTEM_CONFIG.ui.sidebar.collapse}>
              {sidebarCollapsed ? <Columns2 size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>
          {!sidebarCollapsed ? (
            <>
              <div className="sidebar-search"><Search size={14} /><input placeholder={SYSTEM_CONFIG.ui.sidebar.searchPlaceholder} /></div>
              <div className="sidebar-section-title"><span>{SYSTEM_CONFIG.ui.sidebar.watchlist}</span><button className="tiny-icon" title={SYSTEM_CONFIG.ui.sidebar.watchlistTitle}><Star size={13} /></button></div>
              {watchlist.map(({ symbol, price, change, key }) => (
                <button
                  className={`watch-row ${symbol === selectedSymbol ? 'watch-row--active' : ''}`}
                  key={symbol}
                  onClick={() => setSelectedSymbol(symbol)}
                  aria-pressed={symbol === selectedSymbol}
                >
                  <span className={`watch-coin watch-coin--${key}`}>{MARKET_SYMBOLS[symbol].icon}</span>
                  <span className="watch-symbol">{symbol}</span>
                  <span className="watch-price">{price}<small className={change.startsWith('+') ? 'positive' : 'negative'}>{change}</small></span>
                </button>
              ))}
              <div className="sidebar-section-title sidebar-section-title--spaced"><span>{SYSTEM_CONFIG.ui.sidebar.workspace}</span></div>
              <button className="sidebar-link sidebar-link--active"><Columns2 size={15} /> {SYSTEM_CONFIG.ui.sidebar.chart}</button>
              <button className="sidebar-link"><ListFilter size={15} /> {SYSTEM_CONFIG.ui.sidebar.eventFilters}</button>
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
              <h1>{SYSTEM_CONFIG.ui.page.marketOverview} <span className="heading-dot">·</span> <span className="muted-heading">{selectedSymbol}</span></h1>
            </div>
          </div>

          <div className="market-workspace">
            <section className="chart-column">
              <ChartPanel panelId="market" symbol={selectedSymbol} timeframe="15m" subtitle={`${selectedMarket.baseAsset} / ${selectedMarket.quoteAsset} · ${SYSTEM_CONFIG.ui.chart.spot}`} />
            </section>

            <section className="event-panel" aria-label={SYSTEM_CONFIG.ui.eventPanel.ariaLabel}>
              <header className="event-panel__header">
                <div className="event-panel__title">
                  <span className="eyebrow">{SYSTEM_CONFIG.ui.eventPanel.eyebrow}</span>
                  <strong>{SYSTEM_CONFIG.ui.eventPanel.title}</strong>
                </div>
                <button className="icon-button" title={SYSTEM_CONFIG.ui.eventPanel.filterTitle}><ListFilter size={15} /></button>
              </header>
              <nav className="event-tabs" aria-label={SYSTEM_CONFIG.ui.eventPanel.tabsAriaLabel}>
                {tabs.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    className={`event-tab ${activeTab === id ? 'event-tab--active' : ''}`}
                    onClick={() => setActiveTab(id)}
                  >
                    <Icon size={13} /> {label}
                    {id === 'events' && <span className="tab-count">4</span>}
                  </button>
                ))}
              </nav>
              <div className="event-panel__content">
                {activeTab === 'events' ? (
                  <table className="data-table">
                    <thead><tr>{SYSTEM_CONFIG.ui.eventPanel.tableColumns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
                    <tbody>{sampleEvents.map((row) => (
                      <tr key={row.join('-')}>
                        {row.map((cell, index) => (
                          <td key={index}>
                            {index === 2
                              ? <span className={`event-pill event-pill--${cell.toLowerCase().replace('+', '')}`}>{cell}</span>
                              : index === 4 ? <span className="positive">{cell}</span> : cell}
                          </td>
                        ))}
                      </tr>
                    ))}</tbody>
                  </table>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon"><Activity size={20} /></div>
                    <strong>{tabs.find((tab) => tab.id === activeTab)?.label}</strong>
                    <span>{SYSTEM_CONFIG.ui.eventPanel.emptyDescription}</span>
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
