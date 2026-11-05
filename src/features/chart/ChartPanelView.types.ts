import type { RefObject } from 'react';
import type { ReactNode } from 'react';
import type { MarketSymbol } from '../../config/marketSymbols';
import type { Candle, CandleTooltipData } from './candle.types';

export interface ChartPanelViewProps {
  panelId: string;
  symbol: MarketSymbol;
  timeframe: string;
  subtitle: string;
  chartHostRef: RefObject<HTMLDivElement>;
  showGrid: boolean;
  onShowGridChange: (show: boolean) => void;
  showSwings: boolean;
  onShowSwingsChange: (show: boolean) => void;
  showBOS: boolean;
  onShowBOSChange: (show: boolean) => void;
  showFVG: boolean;
  onShowFVGChange: (show: boolean) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  statusLabel: string;
  currentCandle: Candle | null;
  selectedCandle: {
    data: CandleTooltipData;
    left: number;
    top: number;
  } | null;
  onCloseCandleTooltip: () => void;
  toolbarContent?: ReactNode;
}
