import { create } from 'zustand';
import { DEFAULT_MARKET_SYMBOL, type MarketSymbol } from '../config/marketSymbols';
import { SYSTEM_CONFIG, type TradingMode } from '../config/system';

export type BottomTab = 'events' | 'trades' | 'signals' | 'logs';
export type BacktestTimeframe = 'htf' | 'ltf';
export type BacktestReplaySpeed = 1 | 2 | 5 | 10;
export type { MarketSymbol } from '../config/marketSymbols';

interface WorkspaceState {
  sidebarCollapsed: boolean;
  activeTab: BottomTab;
  mode: TradingMode;
  selectedSymbol: MarketSymbol;
  backtestTimeframe: BacktestTimeframe;
  replayIndex: number;
  replayLastIndex: number;
  replayPlaying: boolean;
  autoReplay: boolean;
  replaySpeed: BacktestReplaySpeed;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveTab: (tab: BottomTab) => void;
  setMode: (mode: TradingMode) => void;
  setSelectedSymbol: (symbol: MarketSymbol) => void;
  setBacktestTimeframe: (timeframe: BacktestTimeframe) => void;
  setReplayLastIndex: (lastIndex: number) => void;
  setReplayIndex: (index: number) => void;
  jumpToReplayStart: () => void;
  jumpToReplayEnd: () => void;
  toggleReplay: () => void;
  advanceReplay: () => void;
  setAutoReplay: (enabled: boolean) => void;
  setReplaySpeed: (speed: BacktestReplaySpeed) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  sidebarCollapsed: false,
  activeTab: 'events',
  mode: SYSTEM_CONFIG.defaultMode,
  selectedSymbol: DEFAULT_MARKET_SYMBOL,
  backtestTimeframe: 'htf',
  replayIndex: 0,
  replayLastIndex: -1,
  replayPlaying: false,
  autoReplay: false,
  replaySpeed: 1,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setMode: (mode) => set({ mode, replayPlaying: false }),
  setSelectedSymbol: (selectedSymbol) => set({ selectedSymbol }),
  setBacktestTimeframe: (backtestTimeframe) => set((state) => (
    state.backtestTimeframe === backtestTimeframe
      ? {}
      : { backtestTimeframe, replayIndex: 0, replayLastIndex: -1, replayPlaying: false }
  )),
  setReplayLastIndex: (replayLastIndex) => set({
    replayLastIndex,
    replayIndex: Math.max(0, replayLastIndex),
    replayPlaying: false,
  }),
  setReplayIndex: (index) => set((state) => ({
    replayIndex: Math.max(0, Math.min(index, Math.max(0, state.replayLastIndex))),
    replayPlaying: false,
  })),
  jumpToReplayStart: () => set({ replayIndex: 0, replayPlaying: false }),
  jumpToReplayEnd: () => set((state) => ({
    replayIndex: Math.max(0, state.replayLastIndex),
    replayPlaying: false,
  })),
  toggleReplay: () => set((state) => {
    if (state.replayLastIndex <= 0) return { replayPlaying: false };
    if (state.replayPlaying) return { replayPlaying: false };
    return {
      replayIndex: state.replayIndex >= state.replayLastIndex ? 0 : state.replayIndex,
      replayPlaying: true,
    };
  }),
  advanceReplay: () => set((state) => {
    if (!state.replayPlaying || state.replayLastIndex <= 0) return {};
    if (state.replayIndex >= state.replayLastIndex) {
      return state.autoReplay
        ? { replayIndex: 0 }
        : { replayPlaying: false };
    }

    const replayIndex = state.replayIndex + 1;
    return {
      replayIndex,
      replayPlaying: replayIndex < state.replayLastIndex || state.autoReplay,
    };
  }),
  setAutoReplay: (autoReplay) => set({ autoReplay }),
  setReplaySpeed: (replaySpeed) => set({ replaySpeed }),
}));
