import { useState, useEffect, useCallback } from 'react';
import {
  fetchSmartKlines,
  fetchSmartTicker,
  fetchSmartOrderBook,
} from '../services/binance';
import {
  calcRSI,
  calcMACD,
  calcBollingerBands,
  calcATR,
  findSupportResistanceLevels,
  detectCandlePattern,
  analyzeMultiTimeframe,
  calcVolumeSpike,
  getBollingerPosition,
  calcOrderBookBias,
} from '../services/analysis';

const TIMEFRAMES = ['5m', '15m', '1h', '4h'];

export function useMarketData(symbol, interval) {
  const [candles, setCandles] = useState([]);
  const [allTimeframeCandles, setAllTimeframeCandles] = useState({});
  const [ticker, setTicker] = useState(null);
  const [indicators, setIndicators] = useState(null);
  const [levels, setLevels] = useState(null);
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [futuresData, setFuturesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const computeIndicators = useCallback((mainCandles, tfMap, tick, book) => {
    const closes = mainCandles.map((c) => c.c);
    const price = tick?.lastPrice || closes[closes.length - 1] || 0;
    const macd = calcMACD(closes);
    const bb = calcBollingerBands(closes);
    const lvl = findSupportResistanceLevels(mainCandles);
    const multiTf = analyzeMultiTimeframe(tfMap);

    return {
      rsi: calcRSI(closes),
      macd,
      bollinger: bb,
      bollingerBandwidth: bb.bandwidth,
      bollingerPosition: getBollingerPosition(price, bb),
      atr: calcATR(mainCandles),
      candlePattern: detectCandlePattern(mainCandles),
      volumeSpike: calcVolumeSpike(mainCandles),
      multiTimeframe: multiTf,
      orderBookBias: calcOrderBookBias(book),
    };
  }, []);

  const load = useCallback(async () => {
    setCandles([]);
    setTicker(null);
    setIndicators(null);
    setLevels(null);
    setOrderBook({ bids: [], asks: [] });
    setFuturesData(null);
    setAllTimeframeCandles({});
    setLoading(true);
    setError(null);
    try {
      const klineResults = await Promise.all(
        TIMEFRAMES.map((tf) => fetchSmartKlines(symbol, tf, 100))
      );
      const tfMap = {};
      TIMEFRAMES.forEach((tf, i) => {
        tfMap[tf] = klineResults[i];
      });

      const mainCandles = tfMap[interval] || klineResults[1];

      const [tick, book] = await Promise.all([
        fetchSmartTicker(symbol),
        fetchSmartOrderBook(symbol),
      ]);

      setCandles(mainCandles);
      setAllTimeframeCandles(tfMap);
      setTicker(tick);
      setOrderBook(book);
      if (tick?.source === 'futures') {
        setFuturesData({
          openInterest: tick.openInterest,
          lastFundingRate: tick.lastFundingRate,
          markPrice: tick.markPrice,
        });
      }
      setLevels(findSupportResistanceLevels(mainCandles));
      setIndicators(computeIndicators(mainCandles, tfMap, tick, book));
    } catch (e) {
      console.error('useMarketData load error:', symbol, e);
      setError(e?.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }, [symbol, interval, computeIndicators]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => {
    load();
  }, [load]);

  const updateCandles = useCallback((updater) => {
    setCandles((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setIndicators((ind) => {
        if (!ind) return ind;
        const closes = next.map((c) => c.c);
        const price = closes[closes.length - 1];
        const bb = calcBollingerBands(closes);
        return {
          ...ind,
          rsi: calcRSI(closes),
          macd: calcMACD(closes),
          bollinger: bb,
          bollingerBandwidth: bb.bandwidth,
          bollingerPosition: getBollingerPosition(price, bb),
          atr: calcATR(next),
          candlePattern: detectCandlePattern(next),
          volumeSpike: calcVolumeSpike(next),
        };
      });
      setLevels(findSupportResistanceLevels(next));
      return next;
    });
  }, []);

  return {
    candles,
    setCandles: updateCandles,
    allTimeframeCandles,
    ticker,
    indicators,
    levels,
    orderBook,
    futuresData,
    loading,
    error,
    refresh,
  };
}
