import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  createSeriesMarkers,
  type CandlestickSeriesPartialOptions,
  type ChartOptions,
  type DeepPartial,
  type IChartApi,
  type ISeriesMarkersPluginApi,
  type ISeriesApi,
  type SeriesMarker,
  type Time,
} from 'lightweight-charts';
import type { MarketSymbol } from '../../config/marketSymbols';
import { setChartData } from './chartData';
import type { Candle, CandleData, CandleTooltipData } from './candle.types';
import { getCandleTooltipData } from './candleTooltip';
import { initializeChart } from './chartSetup';
import { ChartPanelView } from './ChartPanelView';

interface ChartPanelProps {
  panelId: string;
  symbol: MarketSymbol;
  timeframe: string;
  subtitle: string;
  candlesData: CandleData[];
  currentCandle: Candle | null;
  chartOptions: (showGrid: boolean) => DeepPartial<ChartOptions>;
  seriesOptions: CandlestickSeriesPartialOptions;
  statusLabel: string;
  toolbarContent?: ReactNode;
  markers?: SeriesMarker<Time>[];
}

export function ChartPanel({
  panelId,
  symbol,
  timeframe,
  subtitle,
  candlesData,
  currentCandle,
  chartOptions,
  seriesOptions,
  statusLabel,
  toolbarContent,
  markers,
}: ChartPanelProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const candlesDataRef = useRef(candlesData);
  const hasInitialDataRef = useRef(false);
  const previousDataLengthRef = useRef(0);
  const [showGrid, setShowGrid] = useState(true);
  const [showSwings, setShowSwings] = useState(true);
  const [showBOS, setShowBOS] = useState(true);
  const [showFVG, setShowFVG] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedCandle, setSelectedCandle] = useState<{
    data: CandleTooltipData;
    left: number;
    top: number;
  } | null>(null);

  candlesDataRef.current = candlesData;

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expanded]);

  useEffect(() => {
    if (!hostRef.current) return;
    const { chart, candles } = initializeChart(
      hostRef.current,
      chartOptions(showGrid),
      seriesOptions,
    );
    chartRef.current = chart;
    candlesRef.current = candles;
    markersRef.current = createSeriesMarkers(candles, markers ?? []);
    const onChartClick = (param: { time?: Time; point?: { x: number; y: number } }) => {
      if (param.time === undefined || !param.point || !hostRef.current) {
        setSelectedCandle(null);
        return;
      }

      const data = candlesDataRef.current;
      const index = data.findIndex((candle) => candle.time === param.time);
      if (index < 0) {
        setSelectedCandle(null);
        return;
      }

      const tooltipWidth = Math.min(282, hostRef.current.clientWidth - 16);
      const tooltipHeight = 180;
      setSelectedCandle({
        data: getCandleTooltipData(data, index),
        left: Math.max(8, Math.min(param.point.x + 12, hostRef.current.clientWidth - tooltipWidth - 8)),
        top: Math.max(8, Math.min(param.point.y + 12, hostRef.current.clientHeight - tooltipHeight - 8)),
      });
    };
    chart.subscribeClick(onChartClick);

    const resizeObserver = new ResizeObserver(() => chart.timeScale().fitContent());
    resizeObserver.observe(hostRef.current);

    return () => {
      resizeObserver.disconnect();
      markersRef.current?.detach();
      markersRef.current = null;
      chart.unsubscribeClick(onChartClick);
      chart.remove();
      chartRef.current = null;
      candlesRef.current = null;
    };
  }, []);

  useEffect(() => {
    markersRef.current?.setMarkers(markers ?? []);
  }, [markers]);

  useEffect(() => {
    candlesRef.current?.setData([]);
    hasInitialDataRef.current = false;
    previousDataLengthRef.current = 0;
    setSelectedCandle(null);
  }, [symbol, timeframe]);

  useEffect(() => {
    if (!chartRef.current || !candlesRef.current || candlesData.length === 0) return;
    if (!hasInitialDataRef.current) {
      setChartData(chartRef.current, candlesRef.current, candlesData);
      hasInitialDataRef.current = true;
    } else if (candlesData.length < previousDataLengthRef.current) {
      candlesRef.current.setData(candlesData);
    } else {
      candlesRef.current.update(candlesData[candlesData.length - 1]);
    }

    previousDataLengthRef.current = candlesData.length;
  }, [candlesData]);

  useEffect(() => {
    chartRef.current?.applyOptions(chartOptions(showGrid));
  }, [chartOptions, showGrid]);

  return (
    <ChartPanelView
      panelId={panelId}
      symbol={symbol}
      timeframe={timeframe}
      subtitle={subtitle}
      chartHostRef={hostRef}
      showGrid={showGrid}
      onShowGridChange={setShowGrid}
      showSwings={showSwings}
      onShowSwingsChange={setShowSwings}
      showBOS={showBOS}
      onShowBOSChange={setShowBOS}
      showFVG={showFVG}
      onShowFVGChange={setShowFVG}
      expanded={expanded}
      onToggleExpanded={() => setExpanded((isExpanded) => !isExpanded)}
      statusLabel={statusLabel}
      currentCandle={currentCandle}
      selectedCandle={selectedCandle}
      onCloseCandleTooltip={() => setSelectedCandle(null)}
      toolbarContent={toolbarContent}
    />
  );
}
