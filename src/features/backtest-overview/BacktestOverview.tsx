import { ListFilter } from 'lucide-react';
import { MARKET_SYMBOLS, type MarketSymbol } from '../../config/marketSymbols';
import { SYSTEM_CONFIG } from '../../config/system';
import { ChartPanel } from '../chart/ChartPanel';

interface BacktestOverviewProps {
  symbol: MarketSymbol;
  ohlc?: {
    open: string;
    high: string;
    low: string;
    close: string;
  };
}

export function BacktestOverview({ symbol, ohlc }: BacktestOverviewProps) {
  const selectedMarket = MARKET_SYMBOLS[symbol];

  return (
    <div className="market-workspace">
      <section className="chart-column">
        <ChartPanel
          panelId="backtest"
          symbol={symbol}
          timeframe="15m"
          subtitle={`${selectedMarket.baseAsset} / ${selectedMarket.quoteAsset} · ${SYSTEM_CONFIG.ui.chart.spot}`}
          ohlc={ohlc}
        />
      </section>
      <aside className="event-panel" aria-label={SYSTEM_CONFIG.ui.eventPanel.filterTitle}>
        <header className="event-panel__header">
          <div className="event-panel__title">
            <span className="eyebrow">{SYSTEM_CONFIG.ui.eventPanel.filterTitle}</span>
            <strong>{SYSTEM_CONFIG.ui.eventPanel.filterOptionsTitle}</strong>
          </div>
          <button className="icon-button" title={SYSTEM_CONFIG.ui.eventPanel.filterTitle}><ListFilter size={15} /></button>
        </header>
        <div className="event-panel__content" />
      </aside>
    </div>
  );
}
