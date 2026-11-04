import { useEffect, useState } from 'react';
import { MARKET_SYMBOLS, type MarketSymbol } from '../../config/marketSymbols';
import { SYSTEM_CONFIG } from '../../config/system';

interface TickerUpdate {
  symbol: MarketSymbol;
  lastPrice: number;
  priceChangePercent: number;
  ohlc: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
}

export interface TickerDisplay {
  price: string;
  change: string;
  ohlc?: {
    open: string;
    high: string;
    low: string;
    close: string;
  };
}

function isMarketSymbol(value: unknown): value is MarketSymbol {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(MARKET_SYMBOLS, value);
}

function parseTickerMessage(value: unknown): TickerUpdate | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const envelope = value as Record<string, unknown>;
  if (typeof envelope.data !== 'object' || envelope.data === null || Array.isArray(envelope.data)) return null;

  const ticker = envelope.data as Record<string, unknown>;
  const lastPrice = Number(ticker.c);
  const priceChangePercent = Number(ticker.P);
  const open = Number(ticker.o);
  const high = Number(ticker.h);
  const low = Number(ticker.l);
  if (
    ticker.e !== '24hrTicker'
    || !isMarketSymbol(ticker.s)
    || !Number.isFinite(lastPrice)
    || lastPrice <= 0
    || !Number.isFinite(priceChangePercent)
    || !Number.isFinite(open)
    || !Number.isFinite(high)
    || !Number.isFinite(low)
    || open <= 0
    || high <= 0
    || low <= 0
  ) return null;

  return {
    symbol: ticker.s,
    lastPrice,
    priceChangePercent,
    ohlc: { open, high, low, close: lastPrice },
  };
}

export function useBinanceTickers(): Partial<Record<MarketSymbol, TickerDisplay>> {
  const [tickers, setTickers] = useState<Partial<Record<MarketSymbol, TickerDisplay>>>({});

  useEffect(() => {
    const streams = Object.values(MARKET_SYMBOLS)
      .map(({ symbol }) => `${symbol.toLowerCase()}@ticker`)
      .join('/');
    let socket: WebSocket;
    try {
      socket = new WebSocket(`${SYSTEM_CONFIG.binanceCombinedWebSocketUrl}?streams=${streams}`);
    } catch (error) {
      console.error('Unable to open the Binance ticker streams.', error);
      return;
    }

    let disposed = false;
    socket.addEventListener('error', (event) => {
      console.error('Binance ticker stream failed.', event);
    });
    socket.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (typeof event.data !== 'string') {
        console.error('Binance ticker messages must be JSON text.');
        return;
      }

      let payload: unknown;
      try {
        payload = JSON.parse(event.data);
      } catch (error) {
        console.error('Binance sent invalid ticker JSON.', error);
        return;
      }

      const update = parseTickerMessage(payload);
      if (!update) {
        console.error('Binance sent an invalid combined ticker update.', payload);
        return;
      }
      if (disposed) return;

      const priceDigits = MARKET_SYMBOLS[update.symbol].priceDigits;
      const changePrefix = update.priceChangePercent >= 0 ? '+' : '';
      const formatPrice = (price: number) => price.toLocaleString('en-US', {
        minimumFractionDigits: priceDigits,
        maximumFractionDigits: priceDigits,
      });
      setTickers((current) => ({
        ...current,
        [update.symbol]: {
          price: formatPrice(update.lastPrice),
          change: `${changePrefix}${update.priceChangePercent.toFixed(2)}%`,
          ohlc: {
            open: formatPrice(update.ohlc.open),
            high: formatPrice(update.ohlc.high),
            low: formatPrice(update.ohlc.low),
            close: formatPrice(update.ohlc.close),
          },
        },
      }));
    });

    return () => {
      disposed = true;
      socket.close();
    };
  }, []);

  return tickers;
}
