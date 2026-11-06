import type {
  CandlestickData,
  SeriesMarker,
  Time,
  UTCTimestamp,
} from 'lightweight-charts';
import htfCandlesUrl from '../../backtest-results/data/htf_candles.js?url';
import htfMarketStatesUrl from '../../backtest-results/data/htf_market_states.js?url';
import htfSwingsUrl from '../../backtest-results/data/htf_swings.js?url';
import ltfCandlesUrl from '../../backtest-results/data/ltf_candles.js?url';
import ltfMarketStatesUrl from '../../backtest-results/data/ltf_market_states.js?url';
import ltfSwingsUrl from '../../backtest-results/data/ltf_swings.js?url';
import type { CandleData } from '../chart/candle.types';
import type { MarketStateOverlay } from '../chart/marketState.types';

type TimeframeMode = 'htf' | 'ltf';

interface BacktestCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

const candleUrls: Record<TimeframeMode, string> = {
  htf: htfCandlesUrl,
  ltf: ltfCandlesUrl,
};

const marketStateUrls: Record<TimeframeMode, string> = {
  htf: htfMarketStatesUrl,
  ltf: ltfMarketStatesUrl,
};

const swingUrls: Record<TimeframeMode, string> = {
  htf: htfSwingsUrl,
  ltf: ltfSwingsUrl,
};

interface RawMarketState {
  market_structure: {
    number: number;
    score: number;
    time: number;
    event: 'bos' | 'choch';
    bias: 'BULLISH' | 'BEARISH';
    event_price: {
      time: number;
      type: 'high' | 'low';
      price: number;
    };
  };
  pois: {
    time: number;
    end_time: number | null;
    high: number;
    low: number;
    scored: number;
    type: 'ORDER_BLOCK' | 'FVG';
    direction: 'BULLISH' | 'BEARISH';
  }[];
}

interface BacktestSwing {
  time: number;
  type: 'high' | 'low';
  price: number;
}

export type BacktestMarketState = MarketStateOverlay;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBacktestCandle(value: unknown): value is BacktestCandle {
  if (!isRecord(value)) return false;

  return ['time', 'open', 'high', 'low', 'close'].every(
    (field) => typeof value[field] === 'number' && Number.isFinite(value[field]),
  ) && (value.volume === undefined || (
    typeof value.volume === 'number' && Number.isFinite(value.volume) && value.volume >= 0
  ));
}

function parseCandles(source: string): CandleData[] {
  const assignmentIndex = source.indexOf('const candles=');
  const objectStart = source.indexOf('{', assignmentIndex);
  const objectEnd = source.lastIndexOf('}');
  if (assignmentIndex < 0 || objectStart < 0 || objectEnd <= objectStart) {
    throw new Error('Backtest candle data has an invalid format.');
  }

  const parsed: unknown = JSON.parse(
    source.slice(objectStart, objectEnd + 1).replace(/,\s*([}\]])/g, '$1'),
  );
  if (!isRecord(parsed)) {
    throw new Error('Backtest candle data must be an object.');
  }

  const candles = Object.values(parsed);
  if (candles.length === 0 || !candles.every(isBacktestCandle)) {
    throw new Error('Backtest candle data is empty or contains invalid candles.');
  }

  return candles
    .sort((left, right) => left.time - right.time)
    .map(({ time, open, high, low, close, volume }) => ({
      time: time as UTCTimestamp,
      open,
      high,
      low,
      close,
      ...(volume === undefined ? {} : { volume }),
    }));
}

function isBacktestSwing(value: unknown): value is BacktestSwing {
  return isRecord(value)
    && isFiniteNumber(value.time)
    && (value.type === 'high' || value.type === 'low')
    && isFiniteNumber(value.price);
}

function parseSwings(source: string): SeriesMarker<Time>[] {
  const assignmentIndex = source.indexOf('const swings=');
  const objectStart = source.indexOf('{', assignmentIndex);
  const objectEnd = source.lastIndexOf('}');
  if (assignmentIndex < 0 || objectStart < 0 || objectEnd <= objectStart) {
    throw new Error('Backtest swing data has an invalid format.');
  }

  const parsed: unknown = JSON.parse(source.slice(objectStart, objectEnd + 1));
  if (
    !isRecord(parsed) ||
    Object.keys(parsed).length === 0 ||
    !Object.values(parsed).every(isBacktestSwing)
  ) {
    throw new Error('Backtest swing data is empty or contains invalid points.');
  }

  return (Object.values(parsed) as BacktestSwing[])
    .sort((left, right) => left.time - right.time)
    .map(({ time, type, price }) => ({
      time: time as UTCTimestamp,
      position: 'atPriceMiddle',
      price,
      shape: 'circle',
      color: type === 'high' ? '#ef626c' : '#20b887',
      size: 1,
    }));
}

function isRawMarketState(value: unknown): value is RawMarketState {
  if (!isRecord(value) || !isRecord(value.market_structure) || !Array.isArray(value.pois)) {
    return false;
  }

  const structure = value.market_structure;
  const eventPrice = structure.event_price;
  if (
    !isFiniteNumber(structure.number) ||
    !Number.isSafeInteger(structure.number) ||
    structure.number < 1 ||
    !isFiniteNumber(structure.score) ||
    !isFiniteNumber(structure.time) ||
    (structure.event !== 'bos' && structure.event !== 'choch') ||
    (structure.bias !== 'BULLISH' && structure.bias !== 'BEARISH') ||
    !isRecord(eventPrice) ||
    !isFiniteNumber(eventPrice.time) ||
    (eventPrice.type !== 'high' && eventPrice.type !== 'low') ||
    !isFiniteNumber(eventPrice.price)
  ) {
    return false;
  }

  const stateTime = structure.time;
  if (eventPrice.time >= stateTime) return false;

  return value.pois.every((poi: unknown) => {
    if (!isRecord(poi)) return false;

    const poiTime = poi.time;
    const endTime = poi.end_time;
    const high = poi.high;
    const low = poi.low;
    if (
      !isFiniteNumber(poiTime) ||
      (endTime !== null && !isFiniteNumber(endTime)) ||
      !isFiniteNumber(high) ||
      !isFiniteNumber(low) ||
      !isFiniteNumber(poi.scored)
    ) {
      return false;
    }

    return (
      poiTime <= stateTime &&
      (endTime ?? stateTime) > poiTime &&
      high > low &&
      (poi.type === 'ORDER_BLOCK' || poi.type === 'FVG') &&
      (poi.direction === 'BULLISH' || poi.direction === 'BEARISH')
    );
  });
}

function parseMarketStates(source: string): BacktestMarketState[] {
  const assignmentIndex = source.indexOf('const market_states=');
  const objectStart = source.indexOf('{', assignmentIndex);
  const objectEnd = source.lastIndexOf('}');
  if (assignmentIndex < 0 || objectStart < 0 || objectEnd <= objectStart) {
    throw new Error('Backtest market-state data has an invalid format.');
  }

  const parsed: unknown = JSON.parse(source.slice(objectStart, objectEnd + 1));
  if (
    !isRecord(parsed) ||
    !Object.values(parsed).every(isRawMarketState) ||
    Object.keys(parsed).length === 0
  ) {
    throw new Error('Backtest market-state data is empty or contains invalid states.');
  }

  return (Object.values(parsed) as RawMarketState[])
    .map(({ market_structure: structure, pois }) => ({
      marketStructure: {
        number: structure.number,
        score: structure.score,
        time: structure.time as UTCTimestamp,
        eventPrice: {
          time: structure.event_price.time as UTCTimestamp,
          type: structure.event_price.type,
          price: structure.event_price.price,
        },
        event: structure.event,
        bias: structure.bias,
      },
      pois: pois.map((poi) => ({
        startTime: poi.time as UTCTimestamp,
        endTime: (poi.end_time ?? structure.time) as UTCTimestamp,
        high: poi.high,
        low: poi.low,
        score: poi.scored,
        type: poi.type,
        direction: poi.direction,
      })),
    }))
    .sort((left, right) => Number(left.marketStructure.time) - Number(right.marketStructure.time));
}

export async function loadBacktestCandles(
  timeframeMode: TimeframeMode,
): Promise<CandlestickData<Time>[]> {
  const response = await fetch(candleUrls[timeframeMode]);
  if (!response.ok) {
    throw new Error(
      `Could not load ${timeframeMode.toUpperCase()} backtest candles (${response.status}).`,
    );
  }

  return parseCandles(await response.text());
}

export async function loadBacktestMarketStates(
  timeframeMode: TimeframeMode,
): Promise<BacktestMarketState[]> {
  const response = await fetch(marketStateUrls[timeframeMode]);
  if (!response.ok) {
    throw new Error(
      `Could not load ${timeframeMode.toUpperCase()} market states (${response.status}).`,
    );
  }

  return parseMarketStates(await response.text());
}

export async function loadBacktestSwings(
  timeframeMode: TimeframeMode,
): Promise<SeriesMarker<Time>[]> {
  const response = await fetch(swingUrls[timeframeMode]);
  if (!response.ok) {
    throw new Error(
      `Could not load ${timeframeMode.toUpperCase()} swing points (${response.status}).`,
    );
  }

  return parseSwings(await response.text());
}
