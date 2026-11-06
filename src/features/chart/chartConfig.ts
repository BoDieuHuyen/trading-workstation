import {
  ColorType,
  CrosshairMode,
  type CandlestickSeriesPartialOptions,
} from 'lightweight-charts';

const GRID_COLOR = '#1b2a3d';
const CHART_BACKGROUND_COLOR = '#101a2a';

export function getChartOptions() {
  return {
    autoSize: true,
    layout: {
      background: { type: ColorType.Solid, color: CHART_BACKGROUND_COLOR },
      textColor: '#8fa1b8',
      fontFamily: 'Inter, ui-sans-serif, system-ui',
      fontSize: 11,
    },
    grid: getChartGridOptions(),
    crosshair: { mode: CrosshairMode.Normal },
    rightPriceScale: { borderColor: '#26364b' },
    timeScale: { borderColor: '#26364b', timeVisible: true, secondsVisible: false },
    handleScroll: true,
    handleScale: true,
  };
}

export function getChartGridOptions() {
  return {
    vertLines: { color: GRID_COLOR },
    horzLines: { color: GRID_COLOR },
  };
}

export const CANDLE_SERIES_OPTIONS: CandlestickSeriesPartialOptions = {
  upColor: '#20b887',
  downColor: '#ef626c',
  borderUpColor: '#20b887',
  borderDownColor: '#ef626c',
  wickUpColor: '#20b887',
  wickDownColor: '#ef626c',
};
