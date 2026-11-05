import type {
  CandlestickData,
  SeriesMarker,
  Time,
  UTCTimestamp,
} from 'lightweight-charts';
import htfCandlesUrl from '../../backtest-results/data/htf_candles.js?url';
import htfSwingsUrl from '../../backtest-results/data/htf_swing.js?url';
import ltfCandlesUrl from '../../backtest-results/data/ltf_candles.js?url';
import type { CandleData } from '../chart/candle.types';

type TimeframeMode = 'htf' | 'ltf';

interface BacktestCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface BacktestSwing {
  time: number;
  type: 'high' | 'low';
  price: number;
}

const candleUrls: Record<TimeframeMode, string> = {
  htf: htfCandlesUrl,
  ltf: ltfCandlesUrl,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
  if (!isRecord(value)) return false;

  return (
    typeof value.time === 'number' &&
    Number.isFinite(value.time) &&
    (value.type === 'high' || value.type === 'low') &&
    typeof value.price === 'number' &&
    Number.isFinite(value.price)
  );
}

function parseSwings(source: string): SeriesMarker<Time>[] {
  const assignmentIndex = source.indexOf('const swings=');
  const arrayStart = source.indexOf('[', assignmentIndex);
  const arrayEnd = source.lastIndexOf(']');
  if (assignmentIndex < 0 || arrayStart < 0 || arrayEnd <= arrayStart) {
    throw new Error('HTF swing data has an invalid format.');
  }

  const parsed: unknown = JSON.parse(
    source.slice(arrayStart, arrayEnd + 1).replace(/,\s*([}\]])/g, '$1'),
  );
  if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isBacktestSwing)) {
    throw new Error('HTF swing data is empty or contains invalid points.');
  }

  return parsed
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

export async function loadBacktestSwings(): Promise<SeriesMarker<Time>[]> {
  const response = await fetch(htfSwingsUrl);
  if (!response.ok) {
    throw new Error(`Could not load HTF swing points (${response.status}).`);
  }

  return parseSwings(await response.text());
}
