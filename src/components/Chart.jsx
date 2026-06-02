import { useEffect, useRef } from 'react';
import {
  createChart,
  CrosshairMode,
  LineStyle,
} from 'lightweight-charts';

const priceFormatter = (price) => {
  const num = Number(price);
  if (num >= 1) {
    return num.toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (num >= 0.01) return num.toFixed(4);
  return num.toFixed(6);
};

function buildBollingerSeriesData(candles) {
  return candles
    .map((c, i) => {
      const slice = candles.slice(0, i + 1).map((x) => x.c);
      if (slice.length < 20) return null;
      const period = 20;
      const s = slice.slice(-period);
      const middle = s.reduce((a, b) => a + b, 0) / period;
      const variance = s.reduce((sum, x) => sum + (x - middle) ** 2, 0) / period;
      const std = Math.sqrt(variance);
      return {
        time: Math.floor(c.t / 1000),
        upper: middle + 2 * std,
        middle,
        lower: middle - 2 * std,
      };
    })
    .filter(Boolean);
}

export default function Chart({ symbol, candles, levels, livePrice, bollingerBands }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef({});
  const livePriceLineRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !candles?.length) return undefined;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
    seriesRef.current = {};
    livePriceLineRef.current = null;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#0d1117' },
        textColor: '#e2e8f0',
      },
      grid: {
        vertLines: { color: '#1e2433' },
        horzLines: { color: '#1e2433' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      localization: { priceFormatter },
      rightPriceScale: {
        visible: true,
        borderColor: '#1e2433',
        scaleMargins: { top: 0.05, bottom: 0.25 },
      },
      timeScale: {
        borderColor: '#1e2433',
        timeVisible: true,
      },
      width: containerRef.current.offsetWidth,
      height: 400,
    });

    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      priceScaleId: 'right',
      lastValueVisible: true,
    });

    const volSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      lastValueVisible: false,
      priceLineVisible: false,
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chart.priceScale('').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    candleSeries.setData(
      candles.map((c) => ({
        time: Math.floor(c.t / 1000),
        open: c.o,
        high: c.h,
        low: c.l,
        close: c.c,
      }))
    );

    volSeries.setData(
      candles.map((c) => ({
        time: Math.floor(c.t / 1000),
        value: c.v,
        color: c.c >= c.o ? '#26a69a44' : '#ef535044',
      }))
    );

    const series = { candleSeries, volSeries };

    if (bollingerBands) {
      const bbData = buildBollingerSeriesData(candles);
      const bbUpper = chart.addLineSeries({
        priceScaleId: 'right',
        color: '#3b82f680',
        lineWidth: 1,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      const bbMiddle = chart.addLineSeries({
        priceScaleId: 'right',
        color: '#6366f180',
        lineWidth: 1,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      const bbLower = chart.addLineSeries({
        priceScaleId: 'right',
        color: '#3b82f680',
        lineWidth: 1,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      bbUpper.setData(bbData.map((d) => ({ time: d.time, value: d.upper })));
      bbMiddle.setData(bbData.map((d) => ({ time: d.time, value: d.middle })));
      bbLower.setData(bbData.map((d) => ({ time: d.time, value: d.lower })));
      series.bbUpper = bbUpper;
      series.bbMiddle = bbMiddle;
      series.bbLower = bbLower;
    }

    levels?.resistances?.forEach((r) => {
      candleSeries.createPriceLine({
        price: r,
        color: '#ef5350',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'R',
      });
    });

    levels?.supports?.forEach((s) => {
      candleSeries.createPriceLine({
        price: s,
        color: '#26a69a',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'S',
      });
    });

    if (levels?.pivot) {
      candleSeries.createPriceLine({
        price: levels.pivot,
        color: '#fbbf24',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: 'P',
      });
    }

    seriesRef.current = series;

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.offsetWidth,
        });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      seriesRef.current = {};
      livePriceLineRef.current = null;
    };
  }, [candles, symbol, levels, bollingerBands]);

  useEffect(() => {
    const { candleSeries } = seriesRef.current;
    if (!candleSeries || !candles?.length) return;

    if (livePriceLineRef.current) {
      try {
        candleSeries.removePriceLine(livePriceLineRef.current);
      } catch {
        /* ignore */
      }
      livePriceLineRef.current = null;
    }

    if (livePrice == null) return;

    const last = candles[candles.length - 1];
    candleSeries.update({
      time: Math.floor(last.t / 1000),
      open: last.o,
      high: Math.max(last.h, livePrice),
      low: Math.min(last.l, livePrice),
      close: livePrice,
    });

    livePriceLineRef.current = candleSeries.createPriceLine({
      price: livePrice,
      color: '#fbbf24',
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
    });
  }, [livePrice, candles]);

  return <div ref={containerRef} style={{ width: '100%', minHeight: 400 }} />;
}
