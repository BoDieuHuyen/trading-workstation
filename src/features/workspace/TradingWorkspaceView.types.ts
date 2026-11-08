import type { TradingMode } from "../../config/system";
import type { BottomTab, WorkspacePage } from "../../stores/workspaceStore";
import type { MarketSymbol } from "../../config/marketSymbols";
import type { KlineDisplay } from "../market-overview/useBinanceKlines";

export interface TradingWorkspaceViewProps {
  sidebarCollapsed: boolean;
  activeTab: BottomTab;
  activeWorkspacePage: WorkspacePage;
  mode: TradingMode;
  selectedSymbol: MarketSymbol;
  klines: Partial<Record<MarketSymbol, KlineDisplay>>;
  onToggleSidebar: () => void;
  onSetActiveTab: (tab: BottomTab) => void;
  onSetActiveWorkspacePage: (page: WorkspacePage) => void;
  onSetMode: (mode: TradingMode) => void;
  onSetSelectedSymbol: (symbol: MarketSymbol) => void;
}
