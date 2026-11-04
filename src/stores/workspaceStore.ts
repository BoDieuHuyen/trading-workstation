import { create } from 'zustand';
import { DEFAULT_MARKET_SYMBOL, type MarketSymbol } from '../config/marketSymbols';
import { SYSTEM_CONFIG, type TradingMode } from '../config/system';

export type BottomTab = 'events' | 'trades' | 'signals' | 'logs';
export type { MarketSymbol } from '../config/marketSymbols';

interface WorkspaceState {
  sidebarCollapsed: boolean;
  activeTab: BottomTab;
  mode: TradingMode;
  selectedSymbol: MarketSymbol;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveTab: (tab: BottomTab) => void;
  setMode: (mode: TradingMode) => void;
  setSelectedSymbol: (symbol: MarketSymbol) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  sidebarCollapsed: false,
  activeTab: 'events',
  mode: SYSTEM_CONFIG.defaultMode,
  selectedSymbol: DEFAULT_MARKET_SYMBOL,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setMode: (mode) => set({ mode }),
  setSelectedSymbol: (selectedSymbol) => set({ selectedSymbol }),
}));
