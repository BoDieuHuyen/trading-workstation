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
- Event rows and chart candles are mock/demo data. The top-bar and watchlist prices subscribe to Binance's combined Spot 24-hour ticker stream for all configured symbols; no API key is required.
- The screenshot button is a UI placeholder; Playwright screenshot automation is a later step.
- SMC toggles are UI placeholders at this stage; the renderers and event routing are not implemented yet.
- The selected symbol's last price and 24-hour change, along with watchlist prices, are updated from Binance ticker events.
- Google Fonts are loaded from the network; the app falls back to system fonts if unavailable.

## Next implementation steps
1. Define the backend event contract (`symbol`, `timeframe`, `event_id`, `sequence`, `type`, `payload`).
2. Add REST snapshot loading and WebSocket event routing.
3. Implement dedicated SMC renderers.
4. Add persistent workspace presets.
5. Add Playwright screenshot worker and Telegram notification.
