import type { TradingMode } from '../../config/system';
import type { BottomTab } from '../../stores/workspaceStore';
import type { MarketSymbol } from '../../config/marketSymbols';
import type { TickerDisplay } from './useBinanceTickers';

export interface TradingWorkspaceViewProps {
  sidebarCollapsed: boolean;
  activeTab: BottomTab;
  mode: TradingMode;
  selectedSymbol: MarketSymbol;
  tickers: Partial<Record<MarketSymbol, TickerDisplay>>;
  onToggleSidebar: () => void;
  onSetActiveTab: (tab: BottomTab) => void;
  onSetMode: (mode: TradingMode) => void;
  onSetSelectedSymbol: (symbol: MarketSymbol) => void;
}
