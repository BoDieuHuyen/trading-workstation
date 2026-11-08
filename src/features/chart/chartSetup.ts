import {
  CandlestickSeries,
  createChart,
  type CandlestickSeriesPartialOptions,
  type DeepPartial,
  type ChartOptions,
} from "lightweight-charts";

export function initializeChart(
  container: HTMLDivElement,
  chartOptions: DeepPartial<ChartOptions>,
  seriesOptions: CandlestickSeriesPartialOptions,
) {
  const chart = createChart(container, chartOptions);
  const candles = chart.addSeries(CandlestickSeries, seriesOptions);
  return { chart, candles };
}
