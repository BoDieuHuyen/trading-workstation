import type { CandlestickData, Time } from 'lightweight-charts';
import { MARKET_SYMBOLS, type MarketSymbol } from '../../config/marketSymbols';

export function makeCandles(count: number, intervalSeconds: number, symbol: MarketSymbol): CandlestickData<Time>[] {
  const now = Math.floor(Date.now() / 1000);
  const latestTime = Math.floor(now / intervalSeconds) * intervalSeconds;
  const { mockPrice: initialPrice, volatility } = MARKET_SYMBOLS[symbol];
  let price: number = initialPrice;
  const result: CandlestickData<Time>[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const time = (latestTime - i * intervalSeconds) as Time;
    const open = price;
    const drift = (Math.random() - 0.47) * volatility;
    const close = Math.max(initialPrice * 0.8, open + drift);
    const high = Math.max(open, close) + Math.random() * volatility * 0.42;
    const low = Math.min(open, close) - Math.random() * volatility * 0.42;
    result.push({ time, open, high, low, close });
    price = close;
  }
  return result;
}
