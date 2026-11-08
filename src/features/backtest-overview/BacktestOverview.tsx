import { useEffect, useMemo, useState } from 'react';
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
  loadBacktestTrades,
} from './backtestData';
import type { BacktestTrade, BacktestTradePoi } from './backtestData';
import { BacktestReplayControls } from './BacktestReplayControls';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import type { TradeChartOverlay } from '../chart/marketState.types';
import type { CandlestickData, Time, UTCTimestamp } from 'lightweight-charts';

const BACKTEST_CANDLE_SERIES_OPTIONS = {
  ...CANDLE_SERIES_OPTIONS,
  priceLineVisible: false,
};

function toTradeChartPoi(
  poi: BacktestTradePoi | null,
): TradeChartOverlay['htf']['poi'] {
  if (!poi) return null;

  return {
    startTime: poi.time as UTCTimestamp,
    endTime: poi.endTime === null ? null : poi.endTime as UTCTimestamp,
    high: poi.high,
    low: poi.low,
    score: poi.score,
    type: poi.type === 1 ? 'ORDER_BLOCK' : 'FVG',
    direction: poi.direction,
  };
}

function getTradeExitType(trade: BacktestTrade): 'TP' | 'SL' {
  const isTakeProfit = trade.side === 'LONG'
    ? trade.exitPrice > trade.entryPrice
    : trade.exitPrice < trade.entryPrice;

  return isTakeProfit ? 'TP' : 'SL';
}

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
  const [higherTimeframeMarketStates, setHigherTimeframeMarketStates] = useState<Awaited<ReturnType<typeof loadBacktestMarketStates>>>([]);
  const [setupTimes, setSetupTimes] = useState<Set<number>>(() => new Set());
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [trades, setTrades] = useState<Awaited<ReturnType<typeof loadBacktestTrades>>>([]);
  const [selectedSetupId, setSelectedSetupId] = useState('');
  const [tradeFilterActive, setTradeFilterActive] = useState(timeframeMode === 'ltf');
  const [swingMarkers, setSwingMarkers] = useState<Awaited<ReturnType<typeof loadBacktestSwings>>>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCandlesData([]);
    setMarketStates([]);
    setHigherTimeframeMarketStates([]);
    setSetupTimes(new Set());
    setQuickFilter('all');
    setTrades([]);
    setSelectedSetupId('');
    setTradeFilterActive(timeframeMode === 'ltf');
    setSwingMarkers([]);
    setGeneratedAt(null);
    setDataError(null);
    setReplayLastIndex(-1);

    Promise.all([
      loadBacktestCandles(timeframeMode),
      loadBacktestGeneratedAt(timeframeMode),
      loadBacktestMarketStates(timeframeMode),
      timeframeMode === 'ltf' ? loadBacktestMarketStates('htf') : Promise.resolve([]),
      loadBacktestSwings(timeframeMode),
      timeframeMode === 'htf' ? loadBacktestSetupTimes() : Promise.resolve(new Set<number>()),
      timeframeMode === 'ltf' ? loadBacktestTrades() : Promise.resolve([]),
    ]).then(
      ([candles, timestamp, states, loadedHigherTimeframeStates, swings, loadedSetupTimes, loadedTrades]) => {
        if (!cancelled) {
          setCandlesData(candles);
          setGeneratedAt(timestamp);
          setMarketStates(states);
          setHigherTimeframeMarketStates(
            timeframeMode === 'htf' ? states : loadedHigherTimeframeStates,
          );
          setSetupTimes(loadedSetupTimes);
          setTrades(loadedTrades);
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

  const setupOptions = [...new Map(
    trades.map(({ setup }) => [setup.id, setup]),
  ).values()].sort((left, right) => left.number - right.number);
  const filteredTrades = trades
    .filter((trade) => !selectedSetupId || trade.setup.id === selectedSetupId)
    .sort((left, right) => left.ltf.marketStructure.time - right.ltf.marketStructure.time);
  const ltfMarketStatesByTime = new Map(
    marketStates.map((state) => [Number(state.marketStructure.time), state]),
  );
  const htfMarketStatesByTime = new Map(
    higherTimeframeMarketStates.map((state) => [Number(state.marketStructure.time), state]),
  );
  const tradeEntries = filteredTrades.map((trade) => {
    const ltfMarketState = ltfMarketStatesByTime.get(trade.ltf.marketStructure.time);
    const htfMarketState = htfMarketStatesByTime.get(trade.htf.marketStructure.time);
    return ltfMarketState && htfMarketState
      ? { trade, ltfMarketState, htfMarketState }
      : undefined;
  });
  const hasMissingTradeMarketState = tradeEntries.some((entry) => entry === undefined);
  const matchedTradeEntries = tradeEntries.filter(
    (entry): entry is NonNullable<(typeof tradeEntries)[number]> => entry !== undefined,
  );
  const matchedTradeMarketStates = matchedTradeEntries.map(({ trade, ltfMarketState }) => ({
    ...ltfMarketState,
    marketStructure: {
      ...ltfMarketState.marketStructure,
      event: trade.ltf.marketStructure.event,
      bias: trade.ltf.marketStructure.bias,
      score: trade.ltf.marketStructure.score,
    },
  }));
  const tradeFilteredMarketStates = tradeFilterActive && timeframeMode === 'ltf'
    ? matchedTradeMarketStates
    : marketStates;
  const visibleMarketStates = quickFilter === 'setup' && timeframeMode === 'htf'
    ? marketStates.filter((state) => setupTimes.has(Number(state.marketStructure.time)))
    : tradeFilteredMarketStates;

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
  const currentTradeIndex = currentMarketState
    ? filteredTrades.findIndex(
      (trade) => trade.ltf.marketStructure.time === Number(currentMarketState.marketStructure.time),
    )
    : -1;
  const tradeProgressNumber = currentTradeIndex < 0 ? null : currentTradeIndex + 1;
  const currentTradeEntry = timeframeMode === 'ltf' && tradeFilterActive
    ? matchedTradeEntries[replayIndex] ?? null
    : null;
  const currentTradeTime = currentTradeEntry?.trade.ltf.marketStructure.time
    ?? currentMarketState?.marketStructure.time
    ?? null;
  const winningTrades = trades.filter((trade) => trade.pnl > 0).length;
  const losingTrades = trades.filter((trade) => trade.pnl < 0).length;
  const tradeSummary = {
    count: trades.length,
    wins: winningTrades,
    losses: losingTrades,
    winRate: winningTrades + losingTrades > 0
      ? (winningTrades / (winningTrades + losingTrades)) * 100
      : 0,
    totalPnl: trades.reduce((total, trade) => total + trade.pnl, 0),
    currentBalance: SYSTEM_CONFIG.backtest.initialBalance
      + (currentTradeTime === null
        ? 0
        : trades
          .filter((trade) => trade.ltf.marketStructure.time <= Number(currentTradeTime))
          .reduce((total, trade) => total + trade.pnl, 0)),
    startTime: trades.length > 0
      ? Math.min(...trades.map((trade) => trade.time))
      : null,
    endTime: trades.length > 0
      ? Math.max(...trades.map((trade) => trade.endTime))
      : null,
  };
  const selectedTrade = currentTradeEntry?.trade ?? null;
  const selectedTradeExitType = selectedTrade ? getTradeExitType(selectedTrade) : null;
  const tradeOverlay = useMemo<TradeChartOverlay | null>(
    () => currentTradeEntry
      ? {
        tradeNumber: currentTradeEntry.trade.number,
        trade: {
          entry: {
            time: currentTradeEntry.trade.time as UTCTimestamp,
            price: currentTradeEntry.trade.entryPrice,
          },
          exit: {
            time: currentTradeEntry.trade.endTime as UTCTimestamp,
            price: currentTradeEntry.trade.exitPrice,
            stopLoss: currentTradeEntry.trade.stopLoss,
            type: getTradeExitType(currentTradeEntry.trade),
          },
        },
        htf: {
          marketStructure: {
            number: currentTradeEntry.htfMarketState.marketStructure.number,
            score: currentTradeEntry.trade.htf.marketStructure.score,
            time: currentTradeEntry.trade.htf.marketStructure.time as UTCTimestamp,
            eventPrice: currentTradeEntry.htfMarketState.marketStructure.eventPrice,
            event: currentTradeEntry.trade.htf.marketStructure.event,
            bias: currentTradeEntry.trade.htf.marketStructure.bias,
          },
          poi: toTradeChartPoi(currentTradeEntry.trade.htf.poi),
        },
        ltf: {
          marketStructure: {
            number: currentTradeEntry.ltfMarketState.marketStructure.number,
            score: currentTradeEntry.trade.ltf.marketStructure.score,
            time: currentTradeEntry.trade.ltf.marketStructure.time as UTCTimestamp,
            eventPrice: currentTradeEntry.ltfMarketState.marketStructure.eventPrice,
            event: currentTradeEntry.trade.ltf.marketStructure.event,
            bias: currentTradeEntry.trade.ltf.marketStructure.bias,
          },
          poi: toTradeChartPoi(currentTradeEntry.trade.ltf.poi),
          sweep: currentTradeEntry.trade.ltf.sweep
            ? {
              time: currentTradeEntry.trade.ltf.sweep.time as UTCTimestamp,
              direction: currentTradeEntry.trade.ltf.sweep.direction,
            }
            : null,
        },
      }
      : null,
    [
      currentTradeEntry?.trade,
      currentTradeEntry?.htfMarketState,
      currentTradeEntry?.ltfMarketState,
    ],
  );
  const chartError = dataError ?? (
    timeframeMode === 'ltf' && tradeFilterActive && hasMissingTradeMarketState
      ? SYSTEM_CONFIG.ui.backtestReplay.tradeMarketStructureMissing
      : null
  );

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
          marketState={timeframeMode === 'ltf' && tradeFilterActive ? null : currentMarketState}
          tradeOverlay={tradeOverlay}
          toolbarContent={chartError
            ? <span className="chart-status" role="alert">{chartError}</span>
            : undefined}
        />
      </section>
      <aside className="event-panel" aria-label={SYSTEM_CONFIG.ui.eventPanel.filterTitle}>
        <BacktestReplayControls
          marketStructureCount={visibleMarketStates.length}
          marketStructureNumber={currentMarketState?.marketStructure.number ?? null}
          tradeProgressNumber={tradeProgressNumber}
          tradeCount={filteredTrades.length}
          marketStructureNumbers={visibleMarketStates.map((state) => state.marketStructure.number)}
          marketStructureTimes={visibleMarketStates.map((state) => Number(state.marketStructure.time))}
          tradeSearchTargets={filteredTrades.map((trade) => ({
            number: trade.number,
            marketStructureTime: trade.ltf.marketStructure.time,
          }))}
          quickFilter={timeframeMode === 'htf' ? quickFilter : 'all'}
          onQuickFilterChange={setQuickFilter}
          showSetupFilter={timeframeMode === 'htf'}
          setupOptions={setupOptions}
          selectedSetupId={selectedSetupId}
          onSelectedSetupChange={setSelectedSetupId}
          showTradeControls={timeframeMode === 'ltf'}
          tradeFilterActive={tradeFilterActive}
          onTradeFilterChange={setTradeFilterActive}
          tradeSummary={tradeSummary}
          selectedTrade={selectedTrade}
          selectedTradeExitType={selectedTradeExitType}
        />
      </aside>
    </div>
  );
}
