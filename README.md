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

## Run in a Dev Container

1. Open the project in VS Code with the Dev Containers extension installed.
2. Run **Dev Containers: Reopen in Container**. The container installs dependencies with `npm ci`.
3. Start the development server with `npm run dev -- --host 0.0.0.0`.

Port 5173 is forwarded automatically. Container dependencies use a separate volume so host-installed `node_modules` are not reused.

## Build

```bash
npm run build
npm run preview
```

## Run in production with Docker

Build and start the production container:

```bash
docker compose up --build -d
```

Open http://localhost:8080. To use another host port, set `APP_PORT` (for example, `APP_PORT=9000 docker compose up --build -d`). Check container health with `docker compose ps`, and stop it with `docker compose down`.

## Included

- Dark trading workstation layout
- Collapsible left sidebar / watchlist
- Split BTCUSDT H1 + M15 chart panels
- Real Lightweight Charts candlestick charts with generated demo candles
- Per-chart demo display controls
- Draggable chart divider
- Resizable / collapsible bottom panel
- Bottom tabs: Events, Trades, Signals, Logs
- LTF backtest replay can be filtered by inclusive candle-time range using millisecond timestamps.
- Zustand workspace state
- Workspace preferences (mode, backtest timeframe, symbol, layout, selected setup, and separate HTF/LTF search numbers) are saved in browser storage and restored on reload.

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
