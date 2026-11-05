import { ListFilter } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MARKET_SYMBOLS, type MarketSymbol } from '../../config/marketSymbols';
import { SYSTEM_CONFIG } from '../../config/system';
import { CANDLE_SERIES_OPTIONS, getChartOptions } from '../chart/chartConfig';
import { getCandle } from '../chart/chartData';
import { ChartPanel } from '../chart/ChartPanel';
import { loadBacktestCandles, loadBacktestSwings } from './backtestData';
import { BacktestReplayControls } from './BacktestReplayControls';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import type { CandlestickData, Time } from 'lightweight-charts';
import type { SeriesMarker } from 'lightweight-charts';

interface BacktestOverviewProps {
  symbol: MarketSymbol;
}

export function BacktestOverview({ symbol }: BacktestOverviewProps) {
  const selectedMarket = MARKET_SYMBOLS[symbol];
  const timeframeMode = useWorkspaceStore((state) => state.backtestTimeframe);
  const replayIndex = useWorkspaceStore((state) => state.replayIndex);
  const setReplayLastIndex = useWorkspaceStore((state) => state.setReplayLastIndex);
  const timeframe = timeframeMode === 'htf' ? '1h' : '5m';
  const [candlesData, setCandlesData] = useState<CandlestickData<Time>[]>([]);
  const [swingMarkers, setSwingMarkers] = useState<SeriesMarker<Time>[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCandlesData([]);
    setSwingMarkers([]);
    setDataError(null);
    setReplayLastIndex(-1);

    const dataPromise = timeframeMode === 'htf'
      ? Promise.all([loadBacktestCandles('htf'), loadBacktestSwings()])
      : loadBacktestCandles('ltf').then(
        (candles): [CandlestickData<Time>[], SeriesMarker<Time>[]] => [candles, []],
      );

    dataPromise.then(
      ([candles, markers]) => {
        if (!cancelled) {
          setCandlesData(candles);
          setSwingMarkers(markers);
          setReplayLastIndex(candles.length - 1);
        }
      },
      (error: unknown) => {
        if (!cancelled) {
          setDataError(error instanceof Error ? error.message : String(error));
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [setReplayLastIndex, timeframeMode]);

  const visibleCandles = replayIndex < 0
    ? []
    : candlesData.slice(0, replayIndex + 1);
  const currentCandle = visibleCandles.length > 0
    ? getCandle(visibleCandles, symbol)
    : null;

  return (
    <div className="market-workspace">
      <section className="chart-column">
        <ChartPanel
          panelId="backtest"
          symbol={symbol}
          timeframe={timeframe}
          subtitle={`${selectedMarket.baseAsset} / ${selectedMarket.quoteAsset} · ${SYSTEM_CONFIG.ui.chart.spot}`}
          candlesData={visibleCandles}
          currentCandle={currentCandle}
          chartOptions={getChartOptions}
          seriesOptions={CANDLE_SERIES_OPTIONS}
          statusLabel={SYSTEM_CONFIG.ui.chart.demoData}
          markers={swingMarkers}
          toolbarContent={dataError
            ? <span className="chart-status" role="alert">{dataError}</span>
            : undefined}
        />
      </section>
      <aside className="event-panel" aria-label={SYSTEM_CONFIG.ui.eventPanel.filterTitle}>
        <header className="event-panel__header">
          <div className="event-panel__title">
            <span className="eyebrow">{SYSTEM_CONFIG.ui.eventPanel.eyebrow}</span>
            <strong>{SYSTEM_CONFIG.ui.eventPanel.filterOptionsTitle}</strong>
          </div>
          <button className="icon-button" title={SYSTEM_CONFIG.ui.eventPanel.filterTitle}><ListFilter size={15} /></button>
        </header>
        <BacktestReplayControls />
        <div className="event-panel__content" />
      </aside>
    </div>
  );
}
