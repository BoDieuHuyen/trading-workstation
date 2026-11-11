import { useEffect } from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useBinanceKlines } from '../market-overview/useBinanceKlines';
import { TradingWorkspaceView } from './TradingWorkspaceView';

export function TradingWorkspace() {
  const {
    sidebarCollapsed, activeTab, mode, selectedSymbol, toggleSidebar, setSidebarCollapsed,
    activeWorkspacePage, setActiveTab, navigateToWorkspace, goBack, goForward,
    setSelectedSymbol, workspaceHistory, workspaceForwardHistory,
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
      activeWorkspacePage={activeWorkspacePage}
      mode={mode}
      selectedSymbol={selectedSymbol}
      canGoBack={workspaceHistory.length > 0}
      canGoForward={workspaceForwardHistory.length > 0}
      klines={klines}
      onToggleSidebar={toggleSidebar}
      onSetActiveTab={setActiveTab}
      onNavigateToWorkspace={navigateToWorkspace}
      onGoBack={goBack}
      onGoForward={goForward}
      onSetSelectedSymbol={setSelectedSymbol}
    />
  );
}
