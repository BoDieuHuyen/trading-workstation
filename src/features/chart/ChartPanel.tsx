import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type Time,
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
}

function parseCandleMessage(message: unknown): CandlestickData<Time> | null {
  if (typeof message !== 'object' || message === null || Array.isArray(message)) return null;
  const candle = message as Record<string, unknown>;
  const { time, open, high, low, close } = candle;
  if (
    typeof time !== 'number' || typeof open !== 'number' || typeof high !== 'number'
    || typeof low !== 'number' || typeof close !== 'number'
  ) return null;
  if (
    !Number.isFinite(time) || !Number.isFinite(open) || !Number.isFinite(high)
    || !Number.isFinite(low) || !Number.isFinite(close) || time <= 0 || open <= 0
    || high < Math.max(open, close) || low <= 0 || low > Math.min(open, close)
  ) return null;

  return { time: time as Time, open, high, low, close };
}

export function ChartPanel({ panelId, symbol, timeframe, subtitle }: ChartPanelProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick', Time> | null>(null);
  const latestCandleTimeRef = useRef<number | null>(null);
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
  const [latestCandle, setLatestCandle] = useState(() => candlesData[candlesData.length - 1]);
  const [realtimeStatus, setRealtimeStatus] = useState<'demo' | 'connecting' | 'connected' | 'error'>('demo');
  const priceDigits = MARKET_SYMBOLS[symbol].priceDigits;
  const formatPrice = (price: number) => price.toLocaleString('en-US', {
    minimumFractionDigits: priceDigits,
    maximumFractionDigits: priceDigits,
  });
  const updateLastCandle = useCallback((candle: CandlestickData<Time>) => {
    const series = candleSeriesRef.current;
    if (!series) {
      console.error('Cannot update the last candle before the chart series is ready.');
      return;
    }

    const candleTime = Number(candle.time);
    if (latestCandleTimeRef.current !== null && candleTime < latestCandleTimeRef.current) {
      console.error('WebSocket sent an out-of-order candle.', candle);
      return;
    }

    series.update(candle);
    latestCandleTimeRef.current = candleTime;
    setLatestCandle(candle);
  }, []);
  const prices = {
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
    candleSeriesRef.current = candles;
    latestCandleTimeRef.current = Number(candlesData[candlesData.length - 1].time);
    setLatestCandle(candlesData[candlesData.length - 1]);
    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(() => chart.timeScale().fitContent());
    resizeObserver.observe(hostRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
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

  useEffect(() => {
    if (!SYSTEM_CONFIG.marketWebSocketUrl) return;

    let socket: WebSocket;
    try {
      const url = new URL(SYSTEM_CONFIG.marketWebSocketUrl);
      url.searchParams.set('symbol', symbol);
      url.searchParams.set('timeframe', timeframe);
      socket = new WebSocket(url);
    } catch (error) {
      console.error('Unable to connect to the configured market WebSocket URL.', error);
      setRealtimeStatus('error');
      return;
    }

    let disposed = false;
    setRealtimeStatus('connecting');
    socket.addEventListener('open', () => {
      if (!disposed) setRealtimeStatus('connected');
    });
    socket.addEventListener('close', () => {
      if (!disposed) setRealtimeStatus('demo');
    });
    socket.addEventListener('error', (event) => {
      if (!disposed) setRealtimeStatus('error');
      console.error('Market WebSocket connection failed.', event);
    });
    socket.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (typeof event.data !== 'string') {
        console.error('Market WebSocket messages must be JSON text.');
        return;
      }

      let payload: unknown;
      try {
        payload = JSON.parse(event.data);
      } catch (error) {
        console.error('Market WebSocket sent invalid JSON.', error);
        return;
      }

      const candle = parseCandleMessage(payload);
      if (!candle) {
        console.error('Market WebSocket sent an invalid candle payload.', payload);
        return;
      }

      updateLastCandle(candle);
    });

    return () => {
      disposed = true;
      socket.close();
      setRealtimeStatus('demo');
    };
  }, [symbol, timeframe, updateLastCandle]);

  const statusLabel = realtimeStatus === 'connected'
    ? SYSTEM_CONFIG.ui.chart.realtime
    : realtimeStatus === 'connecting'
      ? SYSTEM_CONFIG.ui.chart.connecting
      : realtimeStatus === 'error'
        ? SYSTEM_CONFIG.ui.chart.connectionError
        : SYSTEM_CONFIG.ui.chart.demoData;

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
      prices={prices}
    />
  );
}
