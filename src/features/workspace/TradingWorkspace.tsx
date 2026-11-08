import { useEffect } from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useBinanceKlines } from '../market-overview/useBinanceKlines';
import { TradingWorkspaceView } from './TradingWorkspaceView';

export function TradingWorkspace() {
  const {
    sidebarCollapsed, activeTab, mode, selectedSymbol, toggleSidebar, setSidebarCollapsed,
    setActiveTab, setMode, setSelectedSymbol,
  } = useWorkspaceStore();
  const klines = useBinanceKlines();

  useEffect(() => {
    const breakpoint = window.matchMedia('(max-width: 1100px)');
    const updateSidebar = () => setSidebarCollapsed(breakpoint.matches);
    updateSidebar();
    breakpoint.addEventListener('change', updateSidebar);
    return () => breakpoint.removeEventListener('change', updateSidebar);
  }, [setSidebarCollapsed]);

  return (
    <TradingWorkspaceView
      sidebarCollapsed={sidebarCollapsed}
      activeTab={activeTab}
      mode={mode}
      selectedSymbol={selectedSymbol}
      klines={klines}
      onToggleSidebar={toggleSidebar}
      onSetActiveTab={setActiveTab}
      onSetMode={setMode}
      onSetSelectedSymbol={setSelectedSymbol}
    />
  );
}
