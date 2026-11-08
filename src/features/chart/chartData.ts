import type {
  CandlestickData,
  IChartApi,
  ISeriesApi,
  Time,
} from 'lightweight-charts';
import { MARKET_SYMBOLS, type MarketSymbol } from '../../config/marketSymbols';
import type { Candle } from './candle.types';

export function setChartData(
  chart: IChartApi,
  candles: ISeriesApi<'Candlestick'>,
  data: CandlestickData<Time>[],
) {
  candles.setData(data);
  chart.timeScale().fitContent();
}

export function getCandle(
  data: CandlestickData<Time>[],
  symbol: MarketSymbol,
  ohlc?: Candle,
): Candle {
  if (ohlc) return ohlc;

  const latestCandle = data[data.length - 1];
  const priceDigits = MARKET_SYMBOLS[symbol].priceDigits;
  const formatPrice = (price: number) => price.toLocaleString('en-US', {
    minimumFractionDigits: priceDigits,
    maximumFractionDigits: priceDigits,
  });

  return {
    open: formatPrice(latestCandle.open),
    high: formatPrice(latestCandle.high),
    low: formatPrice(latestCandle.low),
    close: formatPrice(latestCandle.close),
  };
}
