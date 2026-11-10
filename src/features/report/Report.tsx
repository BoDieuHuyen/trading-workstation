import { CalendarDays, ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { MARKET_SYMBOLS, type MarketSymbol } from '../../config/marketSymbols';
import { SYSTEM_CONFIG, type TradingMode } from '../../config/system';
import { loadBacktestTrades } from '../backtest-overview/backtestData';
import type { BacktestTrade } from '../backtest-overview/backtestData';

interface ReportProps {
  symbol: MarketSymbol;
  mode: TradingMode;
  onSetSymbol: (symbol: MarketSymbol) => void;
}

const setupTypes = ['CHOCH + OB', 'BOS + OB', 'CHOCH + FVG', 'Liquidity Sweep'];
const initialSetupTypes = ['CHOCH + OB', 'BOS + OB'];
const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
const reportTabs = ['Overview', 'Trade Explorer', 'Performance', 'Setup Analysis', 'Risk Analysis'];
const tradeExplorerFilters = ['All Trades', 'Win', 'Loss', 'Long', 'Short'] as const;
type TradeExplorerFilter = (typeof tradeExplorerFilters)[number];
const USDT_FORMAT = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function isMarketSymbol(value: string): value is MarketSymbol {
  return Object.values(MARKET_SYMBOLS).some((market) => market.symbol === value);
}

function matchesSetupType(trade: BacktestTrade, setupType: string): boolean {
  const event = trade.htf.marketStructure.event;
  const poiType = trade.htf.poi?.type;

  switch (setupType) {
    case 'CHOCH + OB':
      return event === 'choch' && poiType === 1;
    case 'BOS + OB':
      return event === 'bos' && poiType === 1;
    case 'CHOCH + FVG':
      return event === 'choch' && poiType === 2;
    case 'Liquidity Sweep':
      return trade.ltf.sweep !== null;
    default:
      return false;
  }
}

function getTradeSetupType(trade: BacktestTrade): string {
  return setupTypes.find((setupType) => matchesSetupType(trade, setupType)) ?? 'Other';
}

function getTradeResult(trade: BacktestTrade): 'Win' | 'Loss' | 'Break even' {
  return trade.pnl > 0 ? 'Win' : trade.pnl < 0 ? 'Loss' : 'Break even';
}

function getTradeR(trade: BacktestTrade): number | null {
  const risk = Math.abs(trade.entryPrice - trade.stopLoss) * trade.volume;
  return risk > 0 ? trade.pnl / risk : null;
}

function getDateBoundary(value: string, endOfDay: boolean): number | null {
  if (!value) return null;
  const time = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`).getTime();
  return Number.isFinite(time) ? time / 1000 : null;
}

function formatTradeDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

export function Report({ symbol, mode, onSetSymbol }: ReportProps) {
  const [direction, setDirection] = useState('All');
  const [result, setResult] = useState('All');
  const [timeframe, setTimeframe] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedSetupTypes, setSelectedSetupTypes] = useState<string[]>(initialSetupTypes);
  const [activeReportTab, setActiveReportTab] = useState(reportTabs[0]);
  const [tradeExplorerFilter, setTradeExplorerFilter] = useState<TradeExplorerFilter>('All Trades');
  const [selectedTradeNumber, setSelectedTradeNumber] = useState<number | null>(null);
  const [trades, setTrades] = useState<BacktestTrade[]>([]);
  const [tradeDataLoading, setTradeDataLoading] = useState(true);
  const [tradeDataError, setTradeDataError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadBacktestTrades().then(
      (loadedTrades) => {
        if (!cancelled) setTrades(loadedTrades);
      },
      (error: unknown) => {
        if (!cancelled) setTradeDataError(error instanceof Error ? error.message : String(error));
      },
    ).finally(() => {
      if (!cancelled) setTradeDataLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTrades = useMemo(() => {
    const fromTimestamp = getDateBoundary(fromDate, false);
    const toTimestamp = getDateBoundary(toDate, true);
    const selectedSymbol = symbol.toUpperCase();

    return trades.filter((trade) => {
      if (trade.symbol.replace(/-/g, '').toUpperCase() !== selectedSymbol) return false;
      if (direction === 'Bullish' && trade.side !== 'LONG') return false;
      if (direction === 'Bearish' && trade.side !== 'SHORT') return false;
      if (result === 'Win' && trade.pnl <= 0) return false;
      if (result === 'Loss' && trade.pnl >= 0) return false;
      if (timeframe !== 'All' && timeframe !== '5m') return false;
      if (fromTimestamp !== null && trade.time < fromTimestamp) return false;
      if (toTimestamp !== null && trade.time > toTimestamp) return false;
      return selectedSetupTypes.length === 0
        || selectedSetupTypes.some((setupType) => matchesSetupType(trade, setupType));
    });
  }, [direction, fromDate, result, selectedSetupTypes, symbol, timeframe, toDate, trades]);

  const reportStats = useMemo(() => {
    const winningTrades = filteredTrades.filter((trade) => trade.pnl > 0);
    const losingTrades = filteredTrades.filter((trade) => trade.pnl < 0);
    const grossProfit = winningTrades.reduce((total, trade) => total + trade.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((total, trade) => total + trade.pnl, 0));
    const totalPnl = filteredTrades.reduce((total, trade) => total + trade.pnl, 0);
    const initialBalance = trades[0]?.openingBalance ?? SYSTEM_CONFIG.backtest.initialBalance;
    const orderedTrades = [...filteredTrades].sort((left, right) => left.time - right.time);
    let balance = initialBalance;
    let peakBalance = initialBalance;
    let maxDrawdown = 0;
    let totalR = 0;
    let riskedTrades = 0;

    for (const trade of orderedTrades) {
      balance += trade.pnl;
      peakBalance = Math.max(peakBalance, balance);
      if (peakBalance > 0) maxDrawdown = Math.max(maxDrawdown, ((peakBalance - balance) / peakBalance) * 100);

      const risk = Math.abs(trade.entryPrice - trade.stopLoss) * trade.volume;
      if (risk > 0) {
        totalR += trade.pnl / risk;
        riskedTrades += 1;
      }
    }

    const timestamps = filteredTrades.map((trade) => trade.time);
    return {
      netProfit: initialBalance > 0 ? (totalPnl / initialBalance) * 100 : 0,
      winRate: winningTrades.length + losingTrades.length > 0
        ? (winningTrades.length / (winningTrades.length + losingTrades.length)) * 100
        : 0,
      profitFactor: grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? '∞' : '—',
      maxDrawdown,
      totalTrades: filteredTrades.length,
      expectancy: riskedTrades > 0 ? `${(totalR / riskedTrades).toFixed(2)}R` : '—',
      dateRange: timestamps.length > 0
        ? `${formatTradeDate(Math.min(...timestamps))} – ${formatTradeDate(Math.max(...timestamps))}`
        : 'No trades',
    };
  }, [filteredTrades, trades]);

  const equityCurve = useMemo(() => {
    const orderedTrades = [...filteredTrades].sort((left, right) => left.time - right.time);
    if (orderedTrades.length === 0) return { hasTrades: false, points: [], ticks: [], labelInterval: 1 };

    const initialBalance = trades[0]?.openingBalance ?? SYSTEM_CONFIG.backtest.initialBalance;
    const dailyPnl = new Map<string, number>();
    for (const trade of orderedTrades) {
      const day = new Date(trade.time * 1000).toISOString().slice(0, 10);
      dailyPnl.set(day, (dailyPnl.get(day) ?? 0) + trade.pnl);
    }

    const firstTradeDate = new Date(orderedTrades[0].time * 1000);
    const lastTradeDate = new Date(orderedTrades[orderedTrades.length - 1].time * 1000);
    const firstDay = Date.UTC(firstTradeDate.getUTCFullYear(), firstTradeDate.getUTCMonth(), firstTradeDate.getUTCDate());
    const lastDay = Date.UTC(lastTradeDate.getUTCFullYear(), lastTradeDate.getUTCMonth(), lastTradeDate.getUTCDate());
    const dayCount = Math.floor((lastDay - firstDay) / 86_400_000) + 1;
    let cumulativePnl = 0;
    const dailyReturns = Array.from({ length: dayCount }, (_, index) => {
      const date = new Date(firstDay + index * 86_400_000);
      const key = date.toISOString().slice(0, 10);
      cumulativePnl += dailyPnl.get(key) ?? 0;
      return {
        date: key,
        label: `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
        hasTrade: dailyPnl.has(key),
        returnPct: initialBalance > 0 ? (cumulativePnl / initialBalance) * 100 : 0,
      };
    });

    const lowestReturn = Math.min(0, ...dailyReturns.map(({ returnPct }) => returnPct));
    const highestReturn = Math.max(0, ...dailyReturns.map(({ returnPct }) => returnPct));
    const rawStep = Math.max((highestReturn - lowestReturn) / 4, 1);
    const step = Math.max(1, Math.ceil(rawStep / 7)) * 7;
    const minReturn = Math.floor(lowestReturn / step) * step;
    const maxReturn = Math.ceil(highestReturn / step) * step;
    const chartMin = Math.min(minReturn, 0);
    const chartMax = maxReturn > chartMin ? maxReturn : chartMin + step;
    const chart = { left: 48, right: 704, top: 14, bottom: 220 };
    const points = dailyReturns.map(({ date, label, hasTrade, returnPct }, index) => {
      const x = chart.left + (index / Math.max(dailyReturns.length - 1, 1)) * (chart.right - chart.left);
      const y = chart.bottom - ((returnPct - chartMin) / (chartMax - chartMin)) * (chart.bottom - chart.top);
      return { x, y, date, label, hasTrade };
    });
    const tickCount = Math.round((chartMax - chartMin) / step);

    return {
      hasTrades: true,
      points,
      ticks: Array.from({ length: tickCount + 1 }, (_, index) => ({
        value: chartMin + index * step,
        y: chart.bottom - (index / tickCount) * (chart.bottom - chart.top),
      })),
      labelInterval: Math.max(1, Math.ceil(points.length / 8)),
    };
  }, [filteredTrades, trades]);

  const reportMetrics: { label: string; value: string; tone?: 'positive' | 'negative' }[] = [
    { label: 'Net Profit', value: tradeDataLoading || tradeDataError || reportStats.totalTrades === 0 ? '—' : `${reportStats.netProfit >= 0 ? '+' : ''}${reportStats.netProfit.toFixed(1)}%`, tone: reportStats.netProfit >= 0 ? 'positive' as const : 'negative' as const },
    { label: 'Win Rate', value: tradeDataLoading || tradeDataError || reportStats.totalTrades === 0 ? '—' : `${reportStats.winRate.toFixed(1)}%` },
    { label: 'Profit Factor', value: tradeDataLoading || tradeDataError || reportStats.totalTrades === 0 ? '—' : reportStats.profitFactor },
    { label: 'Max Drawdown', value: tradeDataLoading || tradeDataError || reportStats.totalTrades === 0 ? '—' : `-${reportStats.maxDrawdown.toFixed(1)}%`, tone: 'negative' as const },
    { label: 'Total Trades', value: tradeDataLoading ? '…' : String(reportStats.totalTrades) },
    { label: 'Expectancy', value: tradeDataLoading || tradeDataError || reportStats.totalTrades === 0 ? '—' : reportStats.expectancy },
  ];
  const explorerTrades = useMemo(() => filteredTrades
    .filter((trade) => {
      switch (tradeExplorerFilter) {
        case 'Win':
          return trade.pnl > 0;
        case 'Loss':
          return trade.pnl < 0;
        case 'Long':
          return trade.side === 'LONG';
        case 'Short':
          return trade.side === 'SHORT';
        default:
          return true;
      }
    })
    .sort((left, right) => left.number - right.number), [filteredTrades, tradeExplorerFilter]);
  const selectedTrade = explorerTrades.find((trade) => trade.number === selectedTradeNumber)
    ?? explorerTrades[0]
    ?? null;
  const selectedTradeR = selectedTrade ? getTradeR(selectedTrade) : null;
  const clearAll = () => {
    setDirection('All');
    setResult('All');
    setTimeframe('All');
    setFromDate('');
    setToDate('');
    setSelectedSetupTypes([]);
  };

  const toggleSetupType = (setupType: string) => {
    setSelectedSetupTypes((selected) => selected.includes(setupType)
      ? selected.filter((item) => item !== setupType)
      : [...selected, setupType]);
  };

  return (
    <div className="report-page">
      <div className="report-layout">
        <aside className="report-summary" aria-labelledby="report-summary-title">
          <header className="report-summary__header">
            <div>
              <h2 id="report-summary-title">{mode === 'backtest' ? 'Backtest Report' : 'Report'}</h2>
              <p>{symbol} · {timeframe === 'All' ? '5m' : timeframe} · {reportStats.dateRange}</p>
            </div>
            <span className={`report-summary__status${tradeDataError ? ' report-summary__status--error' : ''}`}>
              {tradeDataLoading ? 'Loading' : tradeDataError ? 'Error' : reportStats.totalTrades > 0 ? 'Completed' : 'No trades'}
            </span>
          </header>

          {tradeDataError && <p className="report-summary__error" role="alert">{tradeDataError}</p>}

          <div className="report-summary__metrics">
            {reportMetrics.map(({ label, value, tone }) => (
              <div className="report-summary__metric" key={label}>
                <span>{label}</span>
                <strong className={tone ? `report-summary__value report-summary__value--${tone}` : 'report-summary__value'}>
                  {value}
                </strong>
              </div>
            ))}
          </div>

          <nav className="report-summary__tabs" aria-label="Report sections">
            {reportTabs.map((tab) => (
              <button
                type="button"
                key={tab}
                className={activeReportTab === tab ? 'report-summary__tab report-summary__tab--active' : 'report-summary__tab'}
                aria-pressed={activeReportTab === tab}
                onClick={() => setActiveReportTab(tab)}
              >
                {tab}
              </button>
            ))}
          </nav>
        </aside>

        <section className="report-filters" aria-labelledby="global-filters-title">
        <div className="report-main-grid">
          <div className="report-global-filters">
            <h2 id="global-filters-title">Global Filters</h2>
            <div className="report-filter-grid">
              <label className="report-field">
                <span>Symbol</span>
                <span className="report-select-wrap">
                  <select
                    value={symbol}
                    aria-label="Symbol"
                    onChange={(event) => {
                      if (isMarketSymbol(event.target.value)) onSetSymbol(event.target.value);
                    }}
                  >
                    {Object.values(MARKET_SYMBOLS).map(({ symbol: marketSymbol }) => (
                      <option key={marketSymbol} value={marketSymbol}>{marketSymbol}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} aria-hidden="true" />
                </span>
              </label>
              <label className="report-field">
                <span>Timeframe</span>
                <span className="report-select-wrap">
                  <select value={timeframe} onChange={(event) => setTimeframe(event.target.value)}>
                    <option>All</option>
                    {timeframes.map((option) => <option key={option}>{option}</option>)}
                  </select>
                  <ChevronDown size={14} aria-hidden="true" />
                </span>
              </label>
              <label className="report-field">
                <span>Direction</span>
                <span className="report-select-wrap">
                  <select value={direction} onChange={(event) => setDirection(event.target.value)}>
                    {['All', 'Bullish', 'Bearish'].map((option) => <option key={option}>{option}</option>)}
                  </select>
                  <ChevronDown size={14} aria-hidden="true" />
                </span>
              </label>
              <label className="report-field">
                <span>Result</span>
                <span className="report-select-wrap">
                  <select value={result} onChange={(event) => setResult(event.target.value)}>
                    {['All', 'Win', 'Loss'].map((option) => <option key={option}>{option}</option>)}
                  </select>
                  <ChevronDown size={14} aria-hidden="true" />
                </span>
              </label>
            </div>
          </div>

          <div className="report-date-range">
            <h4>Date Range</h4>
            <div className="report-filter-grid">
              <label className="report-field report-date-field">
                <span>From</span>
                <span className="report-date-input">
                  <CalendarDays size={13} aria-hidden="true" />
                  <input type="date" aria-label="From date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
                </span>
              </label>
              <label className="report-field report-date-field">
                <span>To</span>
                <span className="report-date-input">
                  <CalendarDays size={13} aria-hidden="true" />
                  <input type="date" aria-label="To date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
                </span>
              </label>
            </div>
          </div>

          <fieldset className="report-setup-types">
            <legend>Setup Types</legend>
            <div className="report-setup-heading">
              <span>Select multiple setups</span>
              <button type="button" onClick={clearAll}>Clear all</button>
            </div>
            <div className="report-setup-list">
              {setupTypes.map((setupType) => (
                <label key={setupType} className="report-setup-option">
                  <input
                    type="checkbox"
                    checked={selectedSetupTypes.includes(setupType)}
                    onChange={() => toggleSetupType(setupType)}
                  />
                  <span>{setupType}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <p className="report-note">Filters and metrics are calculated from the loaded backtest trade data.</p>
        </section>
      </div>
      {activeReportTab === 'Overview' && (
        <section className="report-equity" aria-labelledby="report-equity-title">
          <h3 id="report-equity-title">Equity Curve</h3>
          {tradeDataError ? (
            <p className="report-equity__empty">Equity curve unavailable because trade data could not be loaded.</p>
          ) : tradeDataLoading ? (
            <p className="report-equity__empty">Loading equity curve…</p>
          ) : equityCurve.hasTrades ? (
            <svg
              className="report-equity__chart"
              viewBox="0 0 720 250"
              preserveAspectRatio="none"
              role="img"
              aria-label={`Daily equity curve for ${filteredTrades.length} trades`}
            >
              {equityCurve.ticks.map(({ value, y }) => (
                <g key={value}>
                  <line x1="48" x2="704" y1={y} y2={y} className="report-equity__gridline" />
                  <text x="0" y={y + 4} className="report-equity__axis-label">{value.toFixed(0)}%</text>
                </g>
              ))}
              <polyline points={equityCurve.points.map(({ x, y }) => `${x},${y}`).join(' ')} className="report-equity__line" />
              {equityCurve.points.map(({ x, y, date, label, hasTrade }, index) => (
                <g key={date}>
                  {hasTrade && <circle cx={x} cy={y} r="3" className="report-equity__point" />}
                  {(index % equityCurve.labelInterval === 0 || index === equityCurve.points.length - 1) && (
                    <text x={x} y="244" textAnchor="middle" className="report-equity__axis-label">{label}</text>
                  )}
                </g>
              ))}
            </svg>
          ) : (
            <p className="report-equity__empty">No trades for the selected filters.</p>
          )}
        </section>
      )}
      {activeReportTab === 'Trade Explorer' && (
        <section className="report-explorer" aria-labelledby="report-explorer-title">
          <h3 id="report-explorer-title">Trade Explorer</h3>
          <div className="report-explorer__filters" role="group" aria-label="Trade filters">
            {tradeExplorerFilters.map((filter) => (
              <button
                type="button"
                key={filter}
                className={`report-explorer__filter${tradeExplorerFilter === filter ? ' report-explorer__filter--active' : ''}${filter === 'Win' ? ' report-explorer__filter--win' : ''}${filter === 'Loss' ? ' report-explorer__filter--loss' : ''}`}
                aria-pressed={tradeExplorerFilter === filter}
                onClick={() => setTradeExplorerFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>

          {tradeDataLoading ? (
            <p className="report-explorer__empty">Loading trades…</p>
          ) : tradeDataError ? (
            <p className="report-explorer__empty" role="alert">{tradeDataError}</p>
          ) : (
            <>
              <div className="report-trade-table-wrap">
                <table className="report-trade-table">
                  <thead>
                    <tr><th>ID</th><th>Setup</th><th>Direction</th><th>Result</th><th>R</th></tr>
                  </thead>
                  <tbody>
                    {explorerTrades.map((trade) => {
                      const tradeR = getTradeR(trade);
                      const tradeResult = getTradeResult(trade);
                      return (
                        <tr
                          className={selectedTrade?.number === trade.number ? 'report-trade-row--selected' : ''}
                          key={trade.number}
                          tabIndex={0}
                          aria-selected={selectedTrade?.number === trade.number}
                          onClick={() => setSelectedTradeNumber(trade.number)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setSelectedTradeNumber(trade.number);
                            }
                          }}
                        >
                          <td>
                            <button
                              type="button"
                              className="report-trade-id"
                              aria-pressed={selectedTrade?.number === trade.number}
                              onClick={() => setSelectedTradeNumber(trade.number)}
                            >
                              #{String(trade.number).padStart(3, '0')}
                            </button>
                          </td>
                          <td>{getTradeSetupType(trade)}</td>
                          <td>{trade.side === 'LONG' ? 'Long' : 'Short'}</td>
                          <td>
                            <span className={`report-trade-result report-trade-result--${tradeResult.toLowerCase().replace(' ', '-')}`}>
                              {tradeResult}
                            </span>
                          </td>
                          <td className={tradeR === null ? '' : tradeR >= 0 ? 'positive' : 'negative'}>
                            {tradeR === null ? '—' : `${tradeR > 0 ? '+' : ''}${tradeR.toFixed(1)}R`}
                          </td>
                        </tr>
                      );
                    })}
                    {explorerTrades.length === 0 && (
                      <tr><td className="report-trade-table__empty" colSpan={5}>No trades match the selected filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {selectedTrade && (
                <section className="report-selected-trade" aria-labelledby="selected-trade-title">
                  <h4 id="selected-trade-title">Selected Trade: #{String(selectedTrade.number).padStart(3, '0')}</h4>
                  <div className="report-trade-details">
                    <div><span>Entry</span><strong>{selectedTrade.entryPrice.toLocaleString('en-US')}</strong></div>
                    <div><span>Exit</span><strong>{selectedTrade.exitPrice.toLocaleString('en-US')}</strong></div>
                    <div>
                      <span>Risk</span>
                      <strong>{selectedTrade.openingBalance > 0
                        ? `${((Math.abs(selectedTrade.entryPrice - selectedTrade.stopLoss) * selectedTrade.volume / selectedTrade.openingBalance) * 100).toFixed(1)}%`
                        : '—'}</strong>
                    </div>
                    <div>
                      <span>Result</span>
                      <strong className={selectedTrade.pnl >= 0 ? 'positive' : 'negative'}>
                        {selectedTradeR === null ? '—' : `${selectedTradeR > 0 ? '+' : ''}${selectedTradeR.toFixed(1)}R`}
                      </strong>
                    </div>
                    <div>
                      <span>P&amp;L</span>
                      <strong className={selectedTrade.pnl >= 0 ? 'positive' : 'negative'}>
                        {`${selectedTrade.pnl > 0 ? '+' : ''}${USDT_FORMAT.format(selectedTrade.pnl)} USDT`}
                      </strong>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </section>
      )}
      {!['Overview', 'Trade Explorer'].includes(activeReportTab) && (
        <section className="report-tab-placeholder">
          <h3>{activeReportTab}</h3>
          <p>This report section is not available yet.</p>
        </section>
      )}
    </div>
  );
}
