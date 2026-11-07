import { ListFilter } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { MarketSymbol } from '../../config/marketSymbols';
import { SYSTEM_CONFIG } from '../../config/system';
import { CANDLE_SERIES_OPTIONS, getChartOptions } from '../chart/chartConfig';
import { getCandle } from '../chart/chartData';
import { ChartPanel } from '../chart/ChartPanel';
import {
  loadBacktestCandles,
  loadBacktestGeneratedAt,
  loadBacktestMarketStates,
  loadBacktestSetupTimes,
  loadBacktestSwings,
} from './backtestData';
import { BacktestReplayControls } from './BacktestReplayControls';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import type { CandlestickData, Time } from 'lightweight-charts';

const BACKTEST_CANDLE_SERIES_OPTIONS = {
  ...CANDLE_SERIES_OPTIONS,
  priceLineVisible: false,
};

type QuickFilter = 'all' | 'setup';

interface BacktestOverviewProps {
  symbol: MarketSymbol;
}

export function BacktestOverview({ symbol }: BacktestOverviewProps) {
  const timeframeMode = useWorkspaceStore((state) => state.backtestTimeframe);
  const replayIndex = useWorkspaceStore((state) => state.replayIndex);
  const setReplayLastIndex = useWorkspaceStore((state) => state.setReplayLastIndex);
  const timeframe = timeframeMode === 'htf' ? '1h' : '5m';
  const [candlesData, setCandlesData] = useState<CandlestickData<Time>[]>([]);
  const [marketStates, setMarketStates] = useState<Awaited<ReturnType<typeof loadBacktestMarketStates>>>([]);
  const [setupTimes, setSetupTimes] = useState<Set<number>>(() => new Set());
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [swingMarkers, setSwingMarkers] = useState<Awaited<ReturnType<typeof loadBacktestSwings>>>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCandlesData([]);
    setMarketStates([]);
    setSetupTimes(new Set());
    setQuickFilter('all');
    setSwingMarkers([]);
    setGeneratedAt(null);
    setDataError(null);
    setReplayLastIndex(-1);

    Promise.all([
      loadBacktestCandles(timeframeMode),
      loadBacktestGeneratedAt(timeframeMode),
      loadBacktestMarketStates(timeframeMode),
      loadBacktestSwings(timeframeMode),
      timeframeMode === 'htf' ? loadBacktestSetupTimes() : Promise.resolve(new Set<number>()),
    ]).then(
      ([candles, timestamp, states, swings, loadedSetupTimes]) => {
        if (!cancelled) {
          setCandlesData(candles);
          setGeneratedAt(timestamp);
          setMarketStates(states);
          setSetupTimes(loadedSetupTimes);
          setSwingMarkers(swings);
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

  const visibleMarketStates = quickFilter === 'setup' && timeframeMode === 'htf'
    ? marketStates.filter((state) => setupTimes.has(Number(state.marketStructure.time)))
    : marketStates;

  useEffect(() => {
    setReplayLastIndex(visibleMarketStates.length - 1);
  }, [setReplayLastIndex, visibleMarketStates.length]);

  const visibleCandles = replayIndex < 0
    ? []
    : candlesData;
  const currentCandle = visibleCandles.length > 0
    ? getCandle(visibleCandles, symbol)
    : null;
  const currentMarketState = visibleMarketStates[replayIndex] ?? null;

  return (
    <div className="market-workspace">
      <section className="chart-column">
        <ChartPanel
          panelId="backtest"
          symbol={symbol}
          timeframe={timeframe}
          subtitle={generatedAt ?? ''}
          candlesData={visibleCandles}
          currentCandle={currentCandle}
          chartOptions={getChartOptions}
          seriesOptions={BACKTEST_CANDLE_SERIES_OPTIONS}
          statusLabel={SYSTEM_CONFIG.ui.chart.demoData}
          markers={swingMarkers}
          marketState={currentMarketState}
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
        <BacktestReplayControls
          marketStructureCount={visibleMarketStates.length}
          marketStructureNumber={currentMarketState?.marketStructure.number ?? null}
          marketStructureNumbers={visibleMarketStates.map((state) => state.marketStructure.number)}
          quickFilter={timeframeMode === 'htf' ? quickFilter : 'all'}
          onQuickFilterChange={setQuickFilter}
          showSetupFilter={timeframeMode === 'htf'}
        />
        <div className="event-panel__content" />
      </aside>
    </div>
  );
}
