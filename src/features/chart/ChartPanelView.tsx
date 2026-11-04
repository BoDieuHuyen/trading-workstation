import { Activity, Camera, Maximize2, Minimize2, MoreHorizontal, Settings2 } from 'lucide-react';
import { MARKET_SYMBOLS } from '../../config/marketSymbols';
import { SYSTEM_CONFIG } from '../../config/system';
import type { ChartPanelViewProps } from './ChartPanelView.types';

export function ChartPanelView({
  panelId,
  symbol,
  timeframe,
  subtitle,
  chartHostRef,
  showGrid,
  onShowGridChange,
  showSwings,
  onShowSwingsChange,
  showBOS,
  onShowBOSChange,
  showFVG,
  onShowFVGChange,
  expanded,
  onToggleExpanded,
  statusLabel,
  prices,
}: ChartPanelViewProps) {
  return (
    <section className={`chart-panel${expanded ? ' chart-panel--expanded' : ''}`}>
      <header className="chart-panel__header">
        <div className="chart-heading">
          <span className="symbol-mark">{MARKET_SYMBOLS[symbol].icon}</span>
          <div>
            <div className="chart-title">{symbol} <span className="market-dot" /></div>
            <div className="chart-subtitle">{subtitle}</div>
          </div>
        </div>
        <div className="chart-actions">
          <span className="timeframe-chip">{timeframe}</span>
          <button className="icon-button" title={SYSTEM_CONFIG.ui.chart.settingsTitle}><Settings2 size={15} /></button>
          <button className="icon-button" title={SYSTEM_CONFIG.ui.chart.screenshotTitle}><Camera size={15} /></button>
          <button className="icon-button" title={SYSTEM_CONFIG.ui.chart.moreTitle}><MoreHorizontal size={16} /></button>
        </div>
      </header>

      <div className="chart-toolbar">
        <label className="mini-toggle"><input type="checkbox" checked={showGrid} onChange={(event) => onShowGridChange(event.target.checked)} /> {SYSTEM_CONFIG.ui.chart.grid}</label>
        <label className="mini-toggle"><input type="checkbox" checked={showSwings} onChange={(event) => onShowSwingsChange(event.target.checked)} /> {SYSTEM_CONFIG.ui.chart.swings}</label>
        <label className="mini-toggle"><input type="checkbox" checked={showBOS} onChange={(event) => onShowBOSChange(event.target.checked)} /> {SYSTEM_CONFIG.ui.chart.bos}</label>
        <label className="mini-toggle"><input type="checkbox" checked={showFVG} onChange={(event) => onShowFVGChange(event.target.checked)} /> {SYSTEM_CONFIG.ui.chart.fvg}</label>
        <span className="toolbar-spacer" />
        <span className="chart-status"><Activity size={12} /> {statusLabel}</span>
        <span className="sr-only">{panelId}-{showSwings}-{showBOS}-{showFVG}</span>
      </div>

      <div className="chart-canvas-wrap">
        <div className="chart-canvas" ref={chartHostRef} />
        <div className="chart-watermark">{SYSTEM_CONFIG.ui.chart.watermark}</div>
      </div>
      <footer className="chart-panel__footer">
        <span>{SYSTEM_CONFIG.ui.chart.open} <b>{prices.open}</b></span>
        <span>{SYSTEM_CONFIG.ui.chart.high} <b className="positive">{prices.high}</b></span>
        <span>{SYSTEM_CONFIG.ui.chart.low} <b className="negative">{prices.low}</b></span>
        <span>{SYSTEM_CONFIG.ui.chart.close} <b>{prices.close}</b></span>
        <button
          className="expand-chart"
          title={expanded ? SYSTEM_CONFIG.ui.chart.restoreTitle : SYSTEM_CONFIG.ui.chart.expandTitle}
          aria-label={expanded ? SYSTEM_CONFIG.ui.chart.restoreTitle : SYSTEM_CONFIG.ui.chart.expandTitle}
          aria-expanded={expanded}
          onClick={onToggleExpanded}
        >
          {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </footer>
    </section>
  );
}
