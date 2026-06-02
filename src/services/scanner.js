import {
  calcRSI,
  calcATR,
  calcMACD,
  calcBollingerBands,
  findSupportResistanceLevels,
  detectCandlePattern,
  analyzeMultiTimeframe,
  calcVolumeSpike,
  getBollingerPosition,
} from './analysis';
import { analyzeMarket } from './aiAnalysis';
import { saveSignal } from '../store/signalHistory';

const TIMEFRAMES = ['5m', '15m', '1h', '4h'];

function parseRawKlines(data) {
  if (!Array.isArray(data)) return [];
  return data.map((k) => ({
    t: k[0],
    o: parseFloat(k[1]),
    h: parseFloat(k[2]),
    l: parseFloat(k[3]),
    c: parseFloat(k[4]),
    v: parseFloat(k[5]),
  }));
}

async function fetchFuturesKlinesRaw(symbol, interval, limit) {
  const r = await fetch(
    `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  );
  if (!r.ok) throw new Error(`Futures klines: ${r.status}`);
  const data = await r.json();
  return parseRawKlines(data);
}

async function fetchFuturesTickerRaw(symbol) {
  const r = await fetch(
    `https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${symbol}`
  );
  if (!r.ok) throw new Error(`Futures ticker: ${r.status}`);
  const data = await r.json();
  return {
    lastPrice: parseFloat(data.lastPrice),
    priceChangePercent: parseFloat(data.priceChangePercent),
    quoteVolume: parseFloat(data.quoteVolume),
    openInterest: parseFloat(data.openInterest || 0),
    lastFundingRate: parseFloat(data.lastFundingRate || 0),
    markPrice: parseFloat(data.markPrice || data.lastPrice || 0),
  };
}

export async function scoreCoin(symbol) {
  try {
    const klineResults = await Promise.all(
      TIMEFRAMES.map((tf) => fetchFuturesKlinesRaw(symbol, tf, 50))
    );
    const candlesMap = {
      '5m': klineResults[0],
      '15m': klineResults[1],
      '1h': klineResults[2],
      '4h': klineResults[3],
    };
    const candles15 = candlesMap['15m'];

    const ticker = await fetchFuturesTickerRaw(symbol);
    const closes = candles15.map((c) => c.c);
    const rsi = calcRSI(closes);
    const atr = calcATR(candles15);
    const volumeSpike = calcVolumeSpike(candles15);
    const levels = findSupportResistanceLevels(candles15);
    const candlePattern = detectCandlePattern(candles15);
    const multiTimeframe = analyzeMultiTimeframe(candlesMap);

    const atrHistory = [];
    for (let i = 14; i <= candles15.length; i++) {
      atrHistory.push(calcATR(candles15.slice(0, i)));
    }
    const avgAtr =
      atrHistory.length >= 20
        ? atrHistory.slice(-20).reduce((a, b) => a + b, 0) / 20
        : atr;

    let score = 0;
    if (volumeSpike > 150) score += 3;
    if (rsi < 35 || rsi > 65) score += 2;
    if (
      multiTimeframe.confluence === 'strong_bull' ||
      multiTimeframe.confluence === 'strong_bear'
    ) {
      score += 2;
    }
    if (candlePattern.bias !== 'neutral') score += 1;

    const price = ticker.lastPrice;
    const allLevels = [...levels.supports, ...levels.resistances];
    const nearLevel = allLevels.some(
      (lvl) => price && Math.abs(price - lvl) / price < 0.005
    );
    if (nearLevel) score += 1;
    if (atr > avgAtr) score += 1;

    return {
      symbol,
      score,
      indicators: { rsi, volumeSpike, multiTimeframe, candlePattern, atr },
    };
  } catch {
    return { symbol, score: 0, indicators: {} };
  }
}

export async function runFullScan() {
  const r = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr');
  const data = await r.json();
  const coins = data
    .filter((t) => t.symbol.endsWith('USDT'))
    .sort(
      (a, b) =>
        Math.abs(+b.priceChangePercent) - Math.abs(+a.priceChangePercent)
    )
    .slice(0, 20)
    .map((t) => ({ symbol: t.symbol }));

  const scored = await Promise.all(coins.map((c) => scoreCoin(c.symbol)));
  const top3 = scored.sort((a, b) => b.score - a.score).slice(0, 3);

  const signals = [];
  for (const candidate of top3) {
    try {
      const [candles15, candles5, candles1h, candles4h] = await Promise.all([
        fetchFuturesKlinesRaw(candidate.symbol, '15m', 100),
        fetchFuturesKlinesRaw(candidate.symbol, '5m', 100),
        fetchFuturesKlinesRaw(candidate.symbol, '1h', 100),
        fetchFuturesKlinesRaw(candidate.symbol, '4h', 100),
      ]);
      const ticker = await fetchFuturesTickerRaw(candidate.symbol);
      const closes = candles15.map((c) => c.c);
      const macd = calcMACD(closes);
      const bb = calcBollingerBands(closes);
      const levels = findSupportResistanceLevels(candles15);
      const multiTimeframe = analyzeMultiTimeframe({
        '5m': candles5,
        '15m': candles15,
        '1h': candles1h,
        '4h': candles4h,
      });

      const marketData = {
        symbol: candidate.symbol,
        currentPrice: ticker.lastPrice,
        change24h: ticker.priceChangePercent,
        volume24h: ticker.quoteVolume,
        volumeSpike:
          candidate.indicators.volumeSpike ?? calcVolumeSpike(candles15),
        rsi: candidate.indicators.rsi ?? calcRSI(closes),
        macd,
        bollingerBandwidth: bb.bandwidth,
        bollingerPosition: getBollingerPosition(ticker.lastPrice, bb),
        atr: calcATR(candles15),
        candlePattern: detectCandlePattern(candles15),
        multiTimeframe,
        supports: levels.supports,
        resistances: levels.resistances,
        pivot: levels.pivot,
        orderBookBias: 50,
        openInterest: ticker.openInterest,
        fundingRate: ticker.lastFundingRate,
      };

      const signal = await analyzeMarket(marketData);
      if (signal.confidence >= 65 && !signal.error) {
        saveSignal(signal);
        signals.push(signal);
      }
    } catch {
      /* skip failed coin */
    }
  }

  return {
    signals,
    allCandidates: top3,
    scannedAt: Date.now(),
    nextScanAt: Date.now() + 60 * 60 * 1000,
  };
}
