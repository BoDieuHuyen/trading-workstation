import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  BaselineSeries,
  createSeriesMarkers,
  LineSeries,
  LineStyle,
  type CandlestickSeriesPartialOptions,
  type ChartOptions,
  type DeepPartial,
  type IChartApi,
  type ISeriesMarkersPluginApi,
  type ISeriesApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { MarketSymbol } from '../../config/marketSymbols';
import { setChartData } from './chartData';
import type { Candle, CandleData, CandleTooltipData } from './candle.types';
import type { MarketStateOverlay, TradeChartOverlay } from './marketState.types';
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
  chartOptions: () => DeepPartial<ChartOptions>;
  seriesOptions: CandlestickSeriesPartialOptions;
  statusLabel: string;
  toolbarContent?: ReactNode;
  markers?: SeriesMarker<Time>[];
  marketState?: MarketStateOverlay | null;
  tradeOverlay?: TradeChartOverlay | null;
}

function getPoiEndTime(
  poi: MarketStateOverlay['pois'][number],
  candles: CandleData[],
): Time {
  return poi.endTime ?? candles[candles.length - 1]?.time ?? poi.startTime;
}

function getMarketStateVisibleRange(
  marketState: MarketStateOverlay,
  candles: CandleData[],
) {
  const timestamps = [
    Number(marketState.marketStructure.eventPrice.time),
    Number(marketState.marketStructure.time),
    ...marketState.pois.flatMap((poi) => [
      Number(poi.startTime),
      Number(getPoiEndTime(poi, candles)),
    ]),
  ];
  const start = Math.min(...timestamps);
  const end = Math.max(...timestamps);
  const padding = Math.max((end - start) / 2, 60 * 60);

  return {
    from: (start - padding) as UTCTimestamp,
    to: (end + padding) as UTCTimestamp,
  };
}

function getTradeVisibleRange(trade: TradeChartOverlay) {
  const timestamps = [
    Number(trade.htf.marketStructure.eventPrice.time),
    Number(trade.htf.marketStructure.time),
    Number(trade.ltf.marketStructure.eventPrice.time),
    Number(trade.ltf.marketStructure.time),
    ...(trade.htf.poi ? [Number(trade.htf.poi.startTime)] : []),
    ...(trade.ltf.poi ? [Number(trade.ltf.poi.startTime)] : []),
    ...(trade.ltf.sweep ? [Number(trade.ltf.sweep.time)] : []),
  ];
  const start = Math.min(...timestamps);
  const end = Math.max(...timestamps);
  const padding = Math.max((end - start) / 4, 3 * 60 * 60);

  return {
    from: (start - padding) as UTCTimestamp,
    to: (end + padding) as UTCTimestamp,
  };
}

function getTradeRangeAroundCurrentView(
  trade: TradeChartOverlay,
  currentRange: { from: Time; to: Time },
) {
  const from = Number(currentRange.from);
  const to = Number(currentRange.to);
  const tradeTime = Number(trade.ltf.marketStructure.time);
  const width = to - from;

  if (tradeTime >= from && tradeTime <= to) return currentRange;

  const nextTo = tradeTime + width * 0.2;
  return {
    from: (nextTo - width) as UTCTimestamp,
    to: nextTo as UTCTimestamp,
  };
}

function getMarketStateLabelTime(
  candles: CandleData[],
  startTime: Time,
  endTime: Time,
): Time {
  const start = Number(startTime);
  const end = Number(endTime);
  const midpoint = (start + end) / 2;
  let closestTime: Time | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const candle of candles) {
    const time = Number(candle.time);
    if (time <= start || time >= end) continue;

    const distance = Math.abs(time - midpoint);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestTime = candle.time;
    }
  }

  return closestTime ?? Math.floor(midpoint) as UTCTimestamp;
}

function getPoiLineColor(poi: MarketStateOverlay['pois'][number]): string {
  return poi.type === 'FVG'
    ? '#8b5cf6'
    : poi.direction === 'BULLISH'
      ? '#20b887'
      : '#ef626c';
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
  marketState,
  tradeOverlay,
}: ChartPanelProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const marketStructureRef = useRef<ISeriesApi<'Line'> | null>(null);
  const poiSeriesRef = useRef<ISeriesApi<'Baseline'>[]>([]);
  const marketStateRangeRef = useRef<{ from: Time; to: Time } | null>(null);
  const hasTradeRangeRef = useRef(false);
  const candlesDataRef = useRef(candlesData);
  const hasInitialDataRef = useRef(false);
  const previousDataLengthRef = useRef(0);
  const [showSwings, setShowSwings] = useState(false);
  const [showFVG, setShowFVG] = useState(true);
  const [showOB, setShowOB] = useState(true);
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
      chartOptions(),
      seriesOptions,
    );
    chartRef.current = chart;
    candlesRef.current = candles;
    markersRef.current = createSeriesMarkers(candles, markers ?? []);
    const timeScale = chart.timeScale();
    const onVisibleTimeRangeChange = (range: { from: Time; to: Time } | null) => {
      marketStateRangeRef.current = range;
    };
    timeScale.subscribeVisibleTimeRangeChange(onVisibleTimeRangeChange);
    const marketStructure = chart.addSeries(LineSeries, {
      color: '#20b887',
      lineStyle: LineStyle.Dashed,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    marketStructureRef.current = marketStructure;
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

    const resizeObserver = new ResizeObserver(() => {
      if (!hasInitialDataRef.current) return;
      const visibleRange = marketStateRangeRef.current;
      if (visibleRange) {
        chart.timeScale().setVisibleRange(visibleRange);
      } else {
        chart.timeScale().fitContent();
      }
    });
    resizeObserver.observe(hostRef.current);

    return () => {
      resizeObserver.disconnect();
      markersRef.current?.detach();
      markersRef.current = null;
      timeScale.unsubscribeVisibleTimeRangeChange(onVisibleTimeRangeChange);
      for (const series of poiSeriesRef.current) {
        chart.removeSeries(series);
      }
      poiSeriesRef.current = [];
      marketStructureRef.current = null;
      marketStateRangeRef.current = null;
      chart.unsubscribeClick(onChartClick);
      chart.remove();
      chartRef.current = null;
      candlesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const marketStructure = marketStructureRef.current;
    if (!chart || !marketStructure) return;

    marketStructure.setData([]);
    for (const series of poiSeriesRef.current) {
      chart.removeSeries(series);
    }
    poiSeriesRef.current = [];

    if (!marketState || candlesData.length === 0) {
      return;
    }

    const { marketStructure: structure } = marketState;
    const structureColor = structure.bias === 'BEARISH' ? '#ef626c' : '#20b887';
    marketStateRangeRef.current = getMarketStateVisibleRange(marketState, candlesData);
    marketStructure.applyOptions({ color: structureColor });
    const labelTime = getMarketStateLabelTime(
      candlesData,
      structure.eventPrice.time,
      structure.time,
    );
    marketStructure.setData([
      { time: structure.eventPrice.time, value: structure.eventPrice.price },
      { time: labelTime, value: structure.eventPrice.price },
      { time: structure.time, value: structure.eventPrice.price },
    ]);

    const visiblePois = marketState.pois.filter((poi) => (
      poi.type === 'FVG' ? showFVG : showOB
    ));
    for (const poi of visiblePois) {
      const endTime = getPoiEndTime(poi, candlesData);
      const color = poi.type === 'FVG'
        ? 'rgba(139, 92, 246, 0.14)'
        : poi.direction === 'BULLISH'
          ? 'rgba(32, 184, 135, 0.14)'
          : 'rgba(239, 98, 108, 0.14)';
      const lineColor = getPoiLineColor(poi);
      const series = chart.addSeries(BaselineSeries, {
        baseValue: { type: 'price', price: poi.low },
        topLineColor: lineColor,
        bottomLineColor: lineColor,
        topFillColor1: color,
        topFillColor2: color,
        bottomFillColor1: color,
        bottomFillColor2: color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      series.setData([
        { time: poi.startTime, value: poi.high },
        { time: endTime, value: poi.high },
      ]);
      poiSeriesRef.current.push(series);
    }

    if (hasInitialDataRef.current) {
      chart.timeScale().setVisibleRange(marketStateRangeRef.current);
    }
  }, [candlesData, marketState, showFVG, showOB]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (!tradeOverlay) {
      hasTradeRangeRef.current = false;
      if (!marketState) {
        marketStateRangeRef.current = null;
      }
      return;
    }

    if (candlesData.length === 0) return;

    const timeScale = chart.timeScale();
    const currentRange = timeScale.getVisibleRange();
    const visibleRange = hasTradeRangeRef.current && currentRange
      ? getTradeRangeAroundCurrentView(tradeOverlay, currentRange)
      : getTradeVisibleRange(tradeOverlay);
    marketStateRangeRef.current = visibleRange;
    hasTradeRangeRef.current = true;
    const rangeChanged = !currentRange
      || currentRange.from !== visibleRange.from
      || currentRange.to !== visibleRange.to;
    if (hasInitialDataRef.current && rangeChanged) {
      timeScale.setVisibleRange(visibleRange);
    }
  }, [candlesData, marketState, tradeOverlay]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (!tradeOverlay) {
      if (!marketState) {
        for (const series of poiSeriesRef.current) {
          chart.removeSeries(series);
        }
        poiSeriesRef.current = [];
      }
      return;
    }

    for (const series of poiSeriesRef.current) {
      chart.removeSeries(series);
    }
    poiSeriesRef.current = [];

    const tradePois = [
      tradeOverlay.htf.poi,
      tradeOverlay.ltf.poi,
    ].flatMap((poi) => (
      poi && (poi.type === 'FVG' ? showFVG : showOB) ? [poi] : []
    ));
    for (const poi of tradePois) {
      const endTime = getPoiEndTime(poi, candlesData);
      const color = poi.type === 'FVG'
        ? 'rgba(139, 92, 246, 0.14)'
        : poi.direction === 'BULLISH'
          ? 'rgba(32, 184, 135, 0.14)'
          : 'rgba(239, 98, 108, 0.14)';
      const lineColor = getPoiLineColor(poi);
      const series = chart.addSeries(BaselineSeries, {
        baseValue: { type: 'price', price: poi.low },
        topLineColor: lineColor,
        bottomLineColor: lineColor,
        topFillColor1: color,
        topFillColor2: color,
        bottomFillColor1: color,
        bottomFillColor2: color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      series.setData([
        { time: poi.startTime, value: poi.high },
        { time: endTime, value: poi.high },
      ]);
      poiSeriesRef.current.push(series);
    }
  }, [candlesData, marketState, showFVG, showOB, tradeOverlay]);

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
    if (marketStateRangeRef.current) {
      chartRef.current.timeScale().setVisibleRange(marketStateRangeRef.current);
    }
  }, [candlesData]);

  useEffect(() => {
    const marketStateMarkers: SeriesMarker<Time>[] = marketState
      ? [
        {
          time: getMarketStateLabelTime(
            candlesData,
            marketState.marketStructure.eventPrice.time,
            marketState.marketStructure.time,
          ),
          position: marketState.marketStructure.bias === 'BEARISH'
            ? 'atPriceBottom' as const
            : 'atPriceTop' as const,
          price: marketState.marketStructure.eventPrice.price,
          shape: 'circle' as const,
          color: marketState.marketStructure.bias === 'BEARISH' ? '#ef626c' : '#20b887',
          text: `${marketState.marketStructure.event === 'choch' ? 'CHoCH' : 'BOS'}: ${marketState.marketStructure.score.toFixed(2)}`,
          size: 0,
        },
        ...marketState.pois
          .filter((poi) => (poi.type === 'FVG' ? showFVG : showOB))
          .map((poi) => ({
            time: getMarketStateLabelTime(candlesData, poi.startTime, getPoiEndTime(poi, candlesData)),
            position: 'atPriceMiddle' as const,
            price: poi.high,
            shape: 'circle' as const,
            color: getPoiLineColor(poi),
            text: `${poi.type === 'FVG' ? 'FVG' : 'OB'}: ${poi.score.toFixed(1)}`,
            size: 0,
          })),
      ]
      : [];
    const tradeStructureMarkers: SeriesMarker<Time>[] = tradeOverlay
      ? [
        {
          time: getMarketStateLabelTime(
            candlesData,
            tradeOverlay.htf.marketStructure.eventPrice.time,
            tradeOverlay.htf.marketStructure.time,
          ),
          position: tradeOverlay.htf.marketStructure.bias === 'BEARISH'
            ? 'atPriceBottom' as const
            : 'atPriceTop' as const,
          price: tradeOverlay.htf.marketStructure.eventPrice.price,
          shape: 'square',
          color: tradeOverlay.htf.marketStructure.bias === 'BEARISH' ? '#ef626c' : '#20b887',
          text: tradeOverlay.htf.marketStructure.event.toUpperCase(),
          size: 1,
        },
        {
          time: getMarketStateLabelTime(
            candlesData,
            tradeOverlay.ltf.marketStructure.eventPrice.time,
            tradeOverlay.ltf.marketStructure.time,
          ),
          position: tradeOverlay.ltf.marketStructure.bias === 'BEARISH'
            ? 'atPriceBottom' as const
            : 'atPriceTop' as const,
          price: tradeOverlay.ltf.marketStructure.eventPrice.price,
          shape: 'circle',
          color: tradeOverlay.ltf.marketStructure.bias === 'BEARISH' ? '#ef626c' : '#20b887',
          text: tradeOverlay.ltf.marketStructure.event.toLowerCase(),
          size: 1,
        },
        {
          time: tradeOverlay.trade.entry.time,
          position: 'atPriceMiddle',
          price: tradeOverlay.trade.entry.price,
          shape: 'circle',
          color: '#60a5fa',
          text: 'Entry',
          size: 1,
        },
        {
          time: tradeOverlay.trade.exit.time,
          position: 'atPriceMiddle',
          price: tradeOverlay.trade.exit.type === 'TP'
            ? tradeOverlay.trade.exit.price
            : tradeOverlay.trade.exit.stopLoss,
          shape: 'circle',
          color: tradeOverlay.trade.exit.type === 'TP' ? '#20b887' : '#ef626c',
          text: tradeOverlay.trade.exit.type,
          size: 1,
        },
        ...(tradeOverlay.ltf.sweep
          ? [{
            time: tradeOverlay.ltf.sweep.time,
            position: tradeOverlay.ltf.sweep.direction === 'BEARISH'
              ? 'aboveBar' as const
              : 'belowBar' as const,
            shape: tradeOverlay.ltf.sweep.direction === 'BEARISH'
              ? 'arrowDown' as const
              : 'arrowUp' as const,
            color: tradeOverlay.ltf.sweep.direction === 'BEARISH' ? '#ef626c' : '#20b887',
            text: 'sweep',
            size: 1,
          }]
          : []),
        ...[
          { poi: tradeOverlay.htf.poi, shape: 'square' as const, uppercase: true },
          { poi: tradeOverlay.ltf.poi, shape: 'circle' as const, uppercase: false },
        ].flatMap(({ poi, shape, uppercase }) => {
          if (!poi || (poi.type === 'FVG' ? !showFVG : !showOB)) return [];

          const label = poi.type === 'FVG' ? 'FVG' : 'OB';
          return [{
            time: poi.startTime,
            position: 'atPriceMiddle' as const,
            price: poi.high,
            shape,
            color: getPoiLineColor(poi),
            text: uppercase ? label : label.toLowerCase(),
            size: 1,
          }];
        }),
      ]
      : [];
    const allMarkers = [
      ...(showSwings ? markers ?? [] : []),
      ...marketStateMarkers,
      ...tradeStructureMarkers,
    ];
    allMarkers.sort((left, right) => Number(left.time) - Number(right.time));
    markersRef.current?.setMarkers(allMarkers);
  }, [candlesData, markers, marketState, showFVG, showOB, showSwings, tradeOverlay]);

  return (
    <ChartPanelView
      panelId={panelId}
      symbol={symbol}
      timeframe={timeframe}
      subtitle={subtitle}
      chartHostRef={hostRef}
      showSwings={showSwings}
      onShowSwingsChange={setShowSwings}
      showFVG={showFVG}
      onShowFVGChange={setShowFVG}
      showOB={showOB}
      onShowOBChange={setShowOB}
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
