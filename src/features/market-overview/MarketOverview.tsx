import { Activity, Bell, ListFilter, Terminal, Wallet } from 'lucide-react';
import { MARKET_SYMBOLS, type MarketSymbol } from '../../config/marketSymbols';
import { SYSTEM_CONFIG } from '../../config/system';
import type { BottomTab } from '../../stores/workspaceStore';
import { ChartPanel } from '../chart/ChartPanel';

interface MarketOverviewProps {
  symbol: MarketSymbol;
  activeTab: BottomTab;
  ohlc?: {
    open: string;
    high: string;
    low: string;
    close: string;
  };
  onSetActiveTab: (tab: BottomTab) => void;
}

const sampleEvents = [
  ['10:42:15', '1H', 'BOS+', '96,420.5', 'Bullish'],
  ['10:45:02', '15m', 'CHOCH+', '96,515.0', 'Bullish'],
  ['10:48:31', '15m', 'FVG', '96,590.0', 'Detected'],
  ['11:02:08', '15m', 'ENTRY', '96,655.5', 'Triggered'],
];

const tabs = SYSTEM_CONFIG.ui.activityTabs;
const tabIcons: Record<BottomTab, typeof Activity> = {
  events: Activity,
  trades: Wallet,
  signals: Bell,
  logs: Terminal,
};

export function MarketOverview({
  symbol,
  activeTab,
  ohlc,
  onSetActiveTab,
}: MarketOverviewProps) {
  const selectedMarket = MARKET_SYMBOLS[symbol];

  return (
    <div className="market-workspace">
      <section className="chart-column">
        <ChartPanel
          panelId="market"
          symbol={symbol}
          timeframe="15m"
          subtitle={`${selectedMarket.baseAsset} / ${selectedMarket.quoteAsset} · ${SYSTEM_CONFIG.ui.chart.spot}`}
          ohlc={ohlc}
        />
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
          {tabs.map(({ id, label }) => {
            const Icon = tabIcons[id];
            return (
              <button
                key={id}
                className={`event-tab ${activeTab === id ? 'event-tab--active' : ''}`}
                onClick={() => onSetActiveTab(id)}
              >
                <Icon size={13} /> {label}
                {id === 'events' && <span className="tab-count">4</span>}
              </button>
            );
          })}
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
  );
}
