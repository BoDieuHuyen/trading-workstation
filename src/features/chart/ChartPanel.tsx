import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  createChart,
  type IChartApi,
} from 'lightweight-charts';
import { MARKET_SYMBOLS, type MarketSymbol } from '../../config/marketSymbols';
import { SYSTEM_CONFIG } from '../../config/system';
import { makeCandles } from './mockData';
import { ChartPanelView } from './ChartPanelView';

interface ChartPanelProps {
  panelId: string;
  symbol: MarketSymbol;
  timeframe: string;
  subtitle: string;
  ohlc?: {
    open: string;
    high: string;
    low: string;
    close: string;
  };
}

export function ChartPanel({ panelId, symbol, timeframe, subtitle, ohlc }: ChartPanelProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showSwings, setShowSwings] = useState(true);
  const [showBOS, setShowBOS] = useState(true);
  const [showFVG, setShowFVG] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const interval = useMemo(() => {
    const map: Record<string, number> = { '5m': 300, '15m': 900, '1h': 3600, '4h': 14400 };
    return map[timeframe] ?? 900;
  }, [timeframe]);
  const candlesData = useMemo(() => makeCandles(100, interval, symbol), [interval, symbol]);
  const latestCandle = candlesData[candlesData.length - 1];
  const priceDigits = MARKET_SYMBOLS[symbol].priceDigits;
  const formatPrice = (price: number) => price.toLocaleString('en-US', {
    minimumFractionDigits: priceDigits,
    maximumFractionDigits: priceDigits,
  });
  const prices = ohlc ?? {
    open: formatPrice(latestCandle.open),
    high: formatPrice(latestCandle.high),
    low: formatPrice(latestCandle.low),
    close: formatPrice(latestCandle.close),
  };

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
    const chart = createChart(hostRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#101a2a' },
        textColor: '#8fa1b8',
        fontFamily: 'Inter, ui-sans-serif, system-ui',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: showGrid ? '#1b2a3d' : '#101a2a' },
        horzLines: { color: showGrid ? '#1b2a3d' : '#101a2a' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#26364b' },
      timeScale: { borderColor: '#26364b', timeVisible: true, secondsVisible: false },
      handleScroll: true,
      handleScale: true,
    });
    chartRef.current = chart;

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: '#20b887',
      downColor: '#ef626c',
      borderUpColor: '#20b887',
      borderDownColor: '#ef626c',
      wickUpColor: '#20b887',
      wickDownColor: '#ef626c',
    });
    candles.setData(candlesData);
    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(() => chart.timeScale().fitContent());
    resizeObserver.observe(hostRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [candlesData]);

  useEffect(() => {
    chartRef.current?.applyOptions({
      grid: {
        vertLines: { color: showGrid ? '#1b2a3d' : '#101a2a' },
        horzLines: { color: showGrid ? '#1b2a3d' : '#101a2a' },
      },
    });
  }, [showGrid]);

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
      statusLabel={SYSTEM_CONFIG.ui.chart.demoData}
      prices={prices}
    />
  );
}
