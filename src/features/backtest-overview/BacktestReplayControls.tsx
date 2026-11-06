import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { SYSTEM_CONFIG } from '../../config/system';
import { useWorkspaceStore } from '../../stores/workspaceStore';

const REPLAY_SPEEDS = [1, 2, 5, 10] as const;

interface BacktestReplayControlsProps {
  marketStructureNumber: number | null;
  marketStructureCount: number;
}

export function BacktestReplayControls({
  marketStructureNumber,
  marketStructureCount,
}: BacktestReplayControlsProps) {
  const timeframe = useWorkspaceStore((state) => state.backtestTimeframe);
  const replayIndex = useWorkspaceStore((state) => state.replayIndex);
  const replayLastIndex = useWorkspaceStore((state) => state.replayLastIndex);
  const replayPlaying = useWorkspaceStore((state) => state.replayPlaying);
  const autoReplay = useWorkspaceStore((state) => state.autoReplay);
  const replaySpeed = useWorkspaceStore((state) => state.replaySpeed);
  const setBacktestTimeframe = useWorkspaceStore((state) => state.setBacktestTimeframe);
  const setReplayIndex = useWorkspaceStore((state) => state.setReplayIndex);
  const jumpToReplayStart = useWorkspaceStore((state) => state.jumpToReplayStart);
  const jumpToReplayEnd = useWorkspaceStore((state) => state.jumpToReplayEnd);
  const toggleReplay = useWorkspaceStore((state) => state.toggleReplay);
  const setAutoReplay = useWorkspaceStore((state) => state.setAutoReplay);
  const setReplaySpeed = useWorkspaceStore((state) => state.setReplaySpeed);
  const hasReplayData = replayLastIndex >= 0;
  const progressMaximum = Math.max(marketStructureCount, 1);
  const progressValue = Math.min(marketStructureNumber ?? 0, progressMaximum);
  const progressPercent = marketStructureNumber === null
    ? 0
    : (progressValue / progressMaximum) * 100;

  return (
    <section className="backtest-replay" aria-label={SYSTEM_CONFIG.ui.backtestReplay.ariaLabel}>
      <header className="backtest-replay__header">
        <span className="backtest-replay__title">{SYSTEM_CONFIG.ui.backtestReplay.title}</span>
        <div className="backtest-replay__timeframes" role="group" aria-label={SYSTEM_CONFIG.ui.backtestReplay.timeframeAriaLabel}>
          <button
            type="button"
            className={timeframe === 'htf' ? 'backtest-replay__timeframe backtest-replay__timeframe--active' : 'backtest-replay__timeframe'}
            aria-pressed={timeframe === 'htf'}
            onClick={() => setBacktestTimeframe('htf')}
          >
            HTF
          </button>
          <button
            type="button"
            className={timeframe === 'ltf' ? 'backtest-replay__timeframe backtest-replay__timeframe--active' : 'backtest-replay__timeframe'}
            aria-pressed={timeframe === 'ltf'}
            onClick={() => setBacktestTimeframe('ltf')}
          >
            LTF
          </button>
        </div>
      </header>

      <div className="backtest-replay__progress">
        <div className="backtest-replay__progress-heading">
          <span>MARKET STRUCTURE</span>
          <span className="backtest-replay__progress-count">
            {marketStructureNumber === null ? '--' : marketStructureNumber} / {marketStructureCount || '--'}
          </span>
        </div>
        <div
          className="backtest-replay__progress-track"
          role="progressbar"
          aria-label="Market structure progress"
          aria-valuemin={0}
          aria-valuemax={progressMaximum}
          aria-valuenow={progressValue}
          aria-valuetext={marketStructureNumber === null
            ? `No market structure selected; ${marketStructureCount} total`
            : `Market structure ${marketStructureNumber} of ${marketStructureCount}`}
        >
          <span style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="backtest-replay__transport">
        <button type="button" title={SYSTEM_CONFIG.ui.backtestReplay.first} aria-label={SYSTEM_CONFIG.ui.backtestReplay.first} disabled={!hasReplayData || replayIndex === 0} onClick={jumpToReplayStart}>
          <SkipBack size={14} />
        </button>
        <button type="button" title={SYSTEM_CONFIG.ui.backtestReplay.previous} aria-label={SYSTEM_CONFIG.ui.backtestReplay.previous} disabled={!hasReplayData || replayIndex === 0} onClick={() => setReplayIndex(replayIndex - 1)}>
          <ChevronLeft size={15} />
        </button>
        <button
          type="button"
          className="backtest-replay__play"
          title={replayPlaying ? SYSTEM_CONFIG.ui.backtestReplay.pause : SYSTEM_CONFIG.ui.backtestReplay.play}
          aria-label={replayPlaying ? SYSTEM_CONFIG.ui.backtestReplay.pause : SYSTEM_CONFIG.ui.backtestReplay.play}
          aria-pressed={replayPlaying}
          disabled={!hasReplayData || replayLastIndex === 0}
          onClick={toggleReplay}
        >
          {replayPlaying ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <button type="button" title={SYSTEM_CONFIG.ui.backtestReplay.next} aria-label={SYSTEM_CONFIG.ui.backtestReplay.next} disabled={!hasReplayData || replayIndex >= replayLastIndex} onClick={() => setReplayIndex(replayIndex + 1)}>
          <ChevronRight size={15} />
        </button>
        <button type="button" title={SYSTEM_CONFIG.ui.backtestReplay.last} aria-label={SYSTEM_CONFIG.ui.backtestReplay.last} disabled={!hasReplayData || replayIndex >= replayLastIndex} onClick={jumpToReplayEnd}>
          <SkipForward size={14} />
        </button>
      </div>

      <div className="backtest-replay__options">
        <button
          type="button"
          className={`backtest-replay__auto${autoReplay ? ' backtest-replay__auto--active' : ''}`}
          aria-pressed={autoReplay}
          onClick={() => setAutoReplay(!autoReplay)}
        >
          {SYSTEM_CONFIG.ui.backtestReplay.autoReplay}
          <span className="backtest-replay__switch" aria-hidden="true" />
        </button>
        <span className="backtest-replay__speed-summary">{replaySpeed}x {SYSTEM_CONFIG.ui.backtestReplay.speed}</span>
      </div>

      <div className="backtest-replay__speed">
        <span>{SYSTEM_CONFIG.ui.backtestReplay.speed}</span>
        <div role="group" aria-label={SYSTEM_CONFIG.ui.backtestReplay.speedAriaLabel}>
          {REPLAY_SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              className={replaySpeed === speed ? 'backtest-replay__speed-option backtest-replay__speed-option--active' : 'backtest-replay__speed-option'}
              aria-pressed={replaySpeed === speed}
              onClick={() => setReplaySpeed(speed)}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
