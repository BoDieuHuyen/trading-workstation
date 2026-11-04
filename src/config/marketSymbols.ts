export const MARKET_SYMBOLS = {
  BTCUSDT: {
    symbol: "BTCUSDT",
    active: false,
    baseAsset: "BTC",
    quoteAsset: "USDT",
    icon: "₿",
    key: "btc",
    price: "96,655.50",
    change: "+1.42%",
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
    price: "3,420.80",
    change: "+0.85%",
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
    price: "182.45",
    change: "-0.32%",
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
    price: "612.30",
    change: "+0.24%",
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
