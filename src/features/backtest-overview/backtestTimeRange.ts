export type ParsedBacktestTimeRange =
  | { valid: true; from: number | null; to: number | null }
  | { valid: false; reason: 'invalid' | 'reversed' };

function parseBound(value: string): number | null | undefined {
  if (!value.trim()) return null;

  const timestamp = Number(value);
  return Number.isSafeInteger(timestamp) && timestamp > 0
    ? timestamp
    : undefined;
}

export function parseBacktestTimeRange(
  fromValue: string,
  toValue: string,
): ParsedBacktestTimeRange {
  const from = parseBound(fromValue);
  const to = parseBound(toValue);
  if (from === undefined || to === undefined) {
    return { valid: false, reason: 'invalid' };
  }
  if (from !== null && to !== null && from > to) {
    return { valid: false, reason: 'reversed' };
  }

  return { valid: true, from, to };
}

export function isWithinBacktestTimeRange(
  timestampSeconds: number,
  range: Extract<ParsedBacktestTimeRange, { valid: true }>,
): boolean {
  const timestampMilliseconds = timestampSeconds * 1000;
  return (range.from === null || timestampMilliseconds >= range.from)
    && (range.to === null || timestampMilliseconds <= range.to);
}
