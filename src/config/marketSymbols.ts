export const MARKET_SYMBOLS = {
  BTCUSDT: {
    symbol: "BTCUSDT",
    active: false,
    baseAsset: "BTC",
    quoteAsset: "USDT",
    icon: "₿",
    key: "btc",
    priceDigits: 1,
    mockPrice: 96_655.5,
    volatility: 430,
  },
  ETHUSDT: {
    symbol: "ETHUSDT",
    active: true,
    baseAsset: "ETH",
    quoteAsset: "USDT",
    icon: "◆",
    key: "eth",
    priceDigits: 2,
    mockPrice: 3_420.8,
    volatility: 36,
  },
  SOLUSDT: {
    symbol: "SOLUSDT",
    active: false,
    baseAsset: "SOL",
    quoteAsset: "USDT",
    icon: "◎",
    key: "sol",
    priceDigits: 2,
    mockPrice: 182.45,
    volatility: 6,
  },
  BNBUSDT: {
    symbol: "BNBUSDT",
    active: false,
    baseAsset: "BNB",
    quoteAsset: "USDT",
    icon: "B",
    key: "bnb",
    priceDigits: 2,
    mockPrice: 612.3,
    volatility: 13,
  },
} as const;

export type MarketSymbol = keyof typeof MARKET_SYMBOLS;

const activeSymbols = Object.values(MARKET_SYMBOLS).filter(
  ({ active }) => active,
);

if (activeSymbols.length !== 1) {
  throw new Error(
    `Expected exactly one active market symbol, found ${activeSymbols.length}.`,
  );
}

export const DEFAULT_MARKET_SYMBOL = activeSymbols[0].symbol;
