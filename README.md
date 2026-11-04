# Trading Workstation — UI Foundation

React + TypeScript + Vite + Ant Design reset + Lightweight Charts + Zustand.

## Requirements
- Node.js 20+ (recommended)
- npm

## Run locally
```bash
npm install
npm run dev
```
Open the URL printed by Vite (usually http://localhost:5173).

## Build
```bash
npm run build
npm run preview
```

## Included
- Dark trading workstation layout
- Collapsible left sidebar / watchlist
- Split BTCUSDT H1 + M15 chart panels
- Real Lightweight Charts candlestick charts with generated demo candles
- Per-chart demo display controls
- Draggable chart divider
- Resizable / collapsible bottom panel
- Bottom tabs: Events, Trades, Signals, Logs
- Zustand workspace state

## Important notes
- Market prices and event rows are mock/demo data. To update the chart from a WebSocket, set `VITE_MARKET_WS_URL`; the app adds `symbol` and `timeframe` query parameters and expects JSON text with `time` (Unix seconds), `open`, `high`, `low`, and `close` fields.
- The screenshot button is a UI placeholder; Playwright screenshot automation is a later step.
- SMC toggles are UI placeholders at this stage; the renderers and event routing are not implemented yet.
- The chart seeds demo candles and applies validated WebSocket candles incrementally when an endpoint is configured.
- Google Fonts are loaded from the network; the app falls back to system fonts if unavailable.

## Next implementation steps
1. Define the backend event contract (`symbol`, `timeframe`, `event_id`, `sequence`, `type`, `payload`).
2. Add REST snapshot loading and WebSocket event routing.
3. Implement dedicated SMC renderers.
4. Add persistent workspace presets.
5. Add Playwright screenshot worker and Telegram notification.
