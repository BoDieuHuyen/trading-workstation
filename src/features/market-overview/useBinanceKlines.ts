import { useEffect, useState } from "react";
import type { Time } from "lightweight-charts";
import { MARKET_SYMBOLS, type MarketSymbol } from "../../config/marketSymbols";
import { SYSTEM_CONFIG } from "../../config/system";
import { getCandle } from "../chart/chartData";
import type { Candle, CandleData } from "../chart/candle.types";

const KLINE_INTERVAL = "5m";
const KLINE_LIMIT = 100;
const MARKET_SYMBOLS_LIST = Object.keys(MARKET_SYMBOLS) as MarketSymbol[];

type KlineStatus = "loading" | "live" | "disconnected" | "unavailable";

export interface KlineDisplay {
  candlesData: CandleData[];
  currentCandle: Candle | null;
  price: string | null;
  change: string | null;
  statusLabel: string;
}

type KlineMap = Partial<Record<MarketSymbol, KlineDisplay>>;

interface KlineUpdate {
  symbol: MarketSymbol;
  candle: CandleData;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMarketSymbol(value: unknown): value is MarketSymbol {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(MARKET_SYMBOLS, value)
  );
}

function parseCandle(
  timeValue: unknown,
  openValue: unknown,
  highValue: unknown,
  lowValue: unknown,
  closeValue: unknown,
  volumeValue?: unknown,
): CandleData {
  const time = Number(timeValue);
  const open = Number(openValue);
  const high = Number(highValue);
  const low = Number(lowValue);
  const close = Number(closeValue);
  const volume = volumeValue === undefined ? undefined : Number(volumeValue);

  if (
    !Number.isSafeInteger(time) ||
    time <= 0 ||
    !Number.isFinite(open) ||
    !Number.isFinite(high) ||
    !Number.isFinite(low) ||
    !Number.isFinite(close) ||
    (volume !== undefined && (!Number.isFinite(volume) || volume < 0)) ||
    open <= 0 ||
    high <= 0 ||
    low <= 0 ||
    close <= 0 ||
    high < low
  ) {
    throw new Error("Binance returned an invalid 5m kline.");
  }

  return {
    time: Math.floor(time / 1000) as Time,
    open,
    high,
    low,
    close,
    ...(volume === undefined ? {} : { volume }),
  };
}

function parseKlineHistory(value: unknown): CandleData[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Binance returned no 5m klines.");
  }

  return value.map((row: unknown) => {
    if (!Array.isArray(row) || row.length < 5) {
      throw new Error("Binance returned a malformed 5m kline.");
    }

    return parseCandle(row[0], row[1], row[2], row[3], row[4], row[5]);
  });
}

function parseKlineUpdate(value: unknown): KlineUpdate | null {
  if (!isRecord(value) || !isRecord(value.data)) return null;

  const { data } = value;
  if (data.e !== "kline" || !isMarketSymbol(data.s) || !isRecord(data.k))
    return null;

  const kline = data.k;
  if (kline.i !== KLINE_INTERVAL) return null;

  return {
    symbol: data.s,
    candle: parseCandle(kline.t, kline.o, kline.h, kline.l, kline.c, kline.v),
  };
}

function updateLatestCandle(
  candlesData: CandleData[],
  update: CandleData,
): CandleData[] {
  const latest = candlesData[candlesData.length - 1];
  if (latest && update.time < latest.time) return candlesData;

  const next = candlesData.slice();
  if (latest && update.time === latest.time) {
    next[next.length - 1] = update;
  } else {
    next.push(update);
    if (next.length > KLINE_LIMIT) next.shift();
  }
  return next;
}

function formatPrice(price: number, symbol: MarketSymbol): string {
  const priceDigits = MARKET_SYMBOLS[symbol].priceDigits;
  return price.toLocaleString("en-US", {
    minimumFractionDigits: priceDigits,
    maximumFractionDigits: priceDigits,
  });
}

function createKlineDisplay(
  symbol: MarketSymbol,
  candlesData: CandleData[],
  status: KlineStatus,
): KlineDisplay {
  const latest = candlesData[candlesData.length - 1];
  const currentCandle = latest ? getCandle(candlesData, symbol) : null;
  const changePercent = latest
    ? ((latest.close - latest.open) / latest.open) * 100
    : null;
  const changePrefix = changePercent !== null && changePercent >= 0 ? "+" : "";

  const statusLabels: Record<KlineStatus, string> = {
    loading: SYSTEM_CONFIG.ui.chart.loadingData,
    live: SYSTEM_CONFIG.ui.chart.liveData,
    disconnected: SYSTEM_CONFIG.ui.chart.disconnectedData,
    unavailable: SYSTEM_CONFIG.ui.chart.unavailableData,
  };

  return {
    candlesData,
    currentCandle,
    price: latest ? formatPrice(latest.close, symbol) : null,
    change:
      changePercent === null
        ? null
        : `${changePrefix}${changePercent.toFixed(2)}%`,
    statusLabel: statusLabels[status],
  };
}

function updateAllStatuses(current: KlineMap, status: KlineStatus): KlineMap {
  const next = { ...current };
  for (const symbol of MARKET_SYMBOLS_LIST) {
    const entry = current[symbol];
    if (entry)
      next[symbol] = createKlineDisplay(symbol, entry.candlesData, status);
  }
  return next;
}

export function useBinanceKlines(): KlineMap {
  const [klines, setKlines] = useState<KlineMap>({});

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    let socket: WebSocket | null = null;

    setKlines(
      Object.fromEntries(
        MARKET_SYMBOLS_LIST.map((symbol) => [
          symbol,
          createKlineDisplay(symbol, [], "loading"),
        ]),
      ),
    );

    const loadKlineHistory = async (symbol: MarketSymbol) => {
      try {
        const url = new URL(SYSTEM_CONFIG.binanceKlinesUrl);
        url.search = new URLSearchParams({
          symbol: MARKET_SYMBOLS[symbol].symbol,
          interval: KLINE_INTERVAL,
          limit: String(KLINE_LIMIT),
        }).toString();
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(
            `Binance kline request failed with status ${response.status}.`,
          );
        }
        return createKlineDisplay(
          symbol,
          parseKlineHistory(await response.json()),
          "loading",
        );
      } catch (error) {
        if (controller.signal.aborted) return null;
        console.error(`Unable to load Binance 5m klines for ${symbol}.`, error);
        return createKlineDisplay(symbol, [], "unavailable");
      }
    };

    const loadKlines = async () => {
      const histories = await Promise.all(
        MARKET_SYMBOLS_LIST.map(async (symbol) => ({
          symbol,
          display: await loadKlineHistory(symbol),
        })),
      );
      if (disposed) return;

      setKlines((current) => {
        const next = { ...current };
        for (const { symbol, display } of histories) {
          if (display) next[symbol] = display;
        }
        return next;
      });

      const streams = MARKET_SYMBOLS_LIST.map(
        (symbol) =>
          `${MARKET_SYMBOLS[symbol].symbol.toLowerCase()}@kline_${KLINE_INTERVAL}`,
      ).join("/");
      try {
        socket = new WebSocket(
          `${SYSTEM_CONFIG.binanceCombinedWebSocketUrl}?streams=${streams}`,
        );
      } catch (error) {
        console.error("Unable to open the Binance 5m kline streams.", error);
        setKlines((current) => updateAllStatuses(current, "disconnected"));
        return;
      }

      socket.addEventListener("open", () => {
        if (!disposed)
          setKlines((current) => updateAllStatuses(current, "live"));
      });
      socket.addEventListener("error", (event) => {
        console.error("Binance 5m kline stream failed.", event);
        if (!disposed)
          setKlines((current) => updateAllStatuses(current, "disconnected"));
      });
      socket.addEventListener("close", () => {
        if (!disposed)
          setKlines((current) => updateAllStatuses(current, "disconnected"));
      });
      socket.addEventListener("message", (event: MessageEvent<unknown>) => {
        if (typeof event.data !== "string") {
          console.error("Binance 5m kline messages must be JSON text.");
          return;
        }

        let payload: unknown;
        try {
          payload = JSON.parse(event.data);
        } catch (error) {
          console.error("Binance sent invalid 5m kline JSON.", error);
          return;
        }

        try {
          const update = parseKlineUpdate(payload);
          if (!update) {
            console.error("Binance sent an invalid 5m kline update.", payload);
            return;
          }
          if (disposed) return;

          setKlines((current) => {
            const previous = current[update.symbol];
            const candlesData = updateLatestCandle(
              previous?.candlesData ?? [],
              update.candle,
            );
            return {
              ...current,
              [update.symbol]: createKlineDisplay(
                update.symbol,
                candlesData,
                "live",
              ),
            };
          });
        } catch (error) {
          console.error("Binance sent an invalid 5m kline update.", error);
        }
      });
    };

    void loadKlines();

    return () => {
      disposed = true;
      controller.abort();
      socket?.close();
    };
  }, []);

  return klines;
}
