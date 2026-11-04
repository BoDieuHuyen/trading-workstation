import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  createChart,
  type IChartApi,
  type Time,
} from 'lightweight-charts';
import { Activity, Camera, Maximize2, Minimize2, MoreHorizontal, Settings2 } from 'lucide-react';
import { MARKET_SYMBOLS, type MarketSymbol } from '../../config/marketSymbols';
import { SYSTEM_CONFIG } from '../../config/system';
import { makeCandles } from './mockData';

interface ChartPanelProps {
  panelId: string;
  symbol: MarketSymbol;
  timeframe: string;
  subtitle: string;
}

export function ChartPanel({ panelId, symbol, timeframe, subtitle }: ChartPanelProps) {
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
  }, [candlesData, showGrid]);

  return (
    <section className={`chart-panel${expanded ? ' chart-panel--expanded' : ''}`}>
      <header className="chart-panel__header">
        <div className="chart-heading">
          <span className="symbol-mark">{MARKET_SYMBOLS[symbol].icon}</span>
          <div>
            <div className="chart-title">{symbol} <span className="market-dot" /></div>
            <div className="chart-subtitle">{subtitle}</div>
          </div>
        </div>
        <div className="chart-actions">
          <span className="timeframe-chip">{timeframe}</span>
          <button className="icon-button" title={SYSTEM_CONFIG.ui.chart.settingsTitle}><Settings2 size={15} /></button>
          <button className="icon-button" title={SYSTEM_CONFIG.ui.chart.screenshotTitle}><Camera size={15} /></button>
          <button className="icon-button" title={SYSTEM_CONFIG.ui.chart.moreTitle}><MoreHorizontal size={16} /></button>
        </div>
      </header>

      <div className="chart-toolbar">
        <label className="mini-toggle"><input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} /> {SYSTEM_CONFIG.ui.chart.grid}</label>
        <label className="mini-toggle"><input type="checkbox" checked={showSwings} onChange={(e) => setShowSwings(e.target.checked)} /> {SYSTEM_CONFIG.ui.chart.swings}</label>
        <label className="mini-toggle"><input type="checkbox" checked={showBOS} onChange={(e) => setShowBOS(e.target.checked)} /> {SYSTEM_CONFIG.ui.chart.bos}</label>
        <label className="mini-toggle"><input type="checkbox" checked={showFVG} onChange={(e) => setShowFVG(e.target.checked)} /> {SYSTEM_CONFIG.ui.chart.fvg}</label>
        <span className="toolbar-spacer" />
        <span className="chart-status"><Activity size={12} /> {SYSTEM_CONFIG.ui.chart.demoData}</span>
        <span className="sr-only">{panelId}-{showSwings}-{showBOS}-{showFVG}</span>
      </div>

      <div className="chart-canvas-wrap">
        <div className="chart-canvas" ref={hostRef} />
        <div className="chart-watermark">{SYSTEM_CONFIG.ui.chart.watermark}</div>
      </div>
      <footer className="chart-panel__footer">
        <span>{SYSTEM_CONFIG.ui.chart.open} <b>{formatPrice(latestCandle.open)}</b></span>
        <span>{SYSTEM_CONFIG.ui.chart.high} <b className="positive">{formatPrice(latestCandle.high)}</b></span>
        <span>{SYSTEM_CONFIG.ui.chart.low} <b className="negative">{formatPrice(latestCandle.low)}</b></span>
        <span>{SYSTEM_CONFIG.ui.chart.close} <b>{formatPrice(latestCandle.close)}</b></span>
        <button
          className="expand-chart"
          title={expanded ? SYSTEM_CONFIG.ui.chart.restoreTitle : SYSTEM_CONFIG.ui.chart.expandTitle}
          aria-label={expanded ? SYSTEM_CONFIG.ui.chart.restoreTitle : SYSTEM_CONFIG.ui.chart.expandTitle}
          aria-expanded={expanded}
          onClick={() => setExpanded((isExpanded) => !isExpanded)}
        >
          {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </footer>
    </section>
  );
}
