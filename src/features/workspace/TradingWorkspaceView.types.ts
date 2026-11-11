import type { TradingMode } from "../../config/system";
import type { BottomTab, WorkspacePage, WorkspaceRouteTarget } from "../../stores/workspaceStore";
import type { MarketSymbol } from "../../config/marketSymbols";
import type { KlineDisplay } from "../market-overview/useBinanceKlines";

export interface TradingWorkspaceViewProps {
  sidebarCollapsed: boolean;
  activeTab: BottomTab;
  activeWorkspacePage: WorkspacePage;
  mode: TradingMode;
  selectedSymbol: MarketSymbol;
  canGoBack: boolean;
  canGoForward: boolean;
  klines: Partial<Record<MarketSymbol, KlineDisplay>>;
  onToggleSidebar: () => void;
  onSetActiveTab: (tab: BottomTab) => void;
  onNavigateToWorkspace: (target: WorkspaceRouteTarget) => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onSetSelectedSymbol: (symbol: MarketSymbol) => void;
}
