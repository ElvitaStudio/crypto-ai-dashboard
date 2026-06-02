export function calcRSI(closes, period = 14) {
  if (!closes || closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function calcEMA(closes, period) {
  if (!closes?.length) return 0;
  if (closes.length < period) return closes[closes.length - 1];
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
}

export function calcMACD(closes) {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macd = ema12 - ema26;

  const macdLine = [];
  for (let i = 26; i <= closes.length; i++) {
    const slice = closes.slice(0, i);
    macdLine.push(calcEMA(slice, 12) - calcEMA(slice, 26));
  }
  const signal = macdLine.length ? calcEMA(macdLine, 9) : 0;
  const histogram = macd - signal;
  const trend = histogram >= 0 ? 'bullish' : 'bearish';
  return { macd, signal, histogram, trend };
}

export function calcBollingerBands(closes, period = 20) {
  if (!closes?.length) {
    return { upper: 0, middle: 0, lower: 0, bandwidth: 0 };
  }
  const slice = closes.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((sum, c) => sum + (c - middle) ** 2, 0) / slice.length;
  const std = Math.sqrt(variance);
  const upper = middle + 2 * std;
  const lower = middle - 2 * std;
  const bandwidth = middle ? ((upper - lower) / middle) * 100 : 0;
  return { upper, middle, lower, bandwidth };
}

export function calcATR(candles, period = 14) {
  if (!candles || candles.length < 2) return 0;
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].h;
    const l = candles[i].l;
    const prevC = candles[i - 1].c;
    trs.push(Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC)));
  }
  const slice = trs.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export function findSupportResistanceLevels(candles, lookback = 50) {
  const slice = candles.slice(-lookback);
  const pivots = [];

  for (let i = 1; i < slice.length - 1; i++) {
    const prev = slice[i - 1];
    const cur = slice[i];
    const next = slice[i + 1];
    if (cur.h > prev.h && cur.h > next.h) {
      pivots.push({ price: cur.h, type: 'resistance' });
    }
    if (cur.l < prev.l && cur.l < next.l) {
      pivots.push({ price: cur.l, type: 'support' });
    }
  }

  const groupLevels = (items, type) => {
    const sorted = [...items].sort((a, b) => a.price - b.price);
    const groups = [];
    for (const p of sorted) {
      const existing = groups.find(
        (g) => Math.abs(g.price - p.price) / g.price < 0.003
      );
      if (existing) {
        existing.touches += 1;
        existing.price = (existing.price * (existing.touches - 1) + p.price) / existing.touches;
      } else {
        groups.push({ price: p.price, touches: 1, type });
      }
    }
    return groups.sort((a, b) => b.touches - a.touches).slice(0, 3).map((g) => g.price);
  };

  const resistances = groupLevels(
    pivots.filter((p) => p.type === 'resistance'),
    'resistance'
  );
  const supports = groupLevels(
    pivots.filter((p) => p.type === 'support'),
    'support'
  );

  const last = slice[slice.length - 1];
  const pivot = last ? (last.h + last.l + last.c) / 3 : 0;

  return { supports, resistances, pivot };
}

function bodySize(c) {
  return Math.abs(c.c - c.o);
}

function isBullish(c) {
  return c.c >= c.o;
}

export function detectCandlePattern(candles) {
  if (!candles || candles.length < 3) {
    return { name: 'none', bias: 'neutral' };
  }
  const [c1, c2, c3] = candles.slice(-3);
  const range1 = c1.h - c1.l || 0.0001;
  const range2 = c2.h - c2.l || 0.0001;
  const range3 = c3.h - c3.l || 0.0001;

  if (bodySize(c2) / range2 < 0.1) {
    return { name: 'doji', bias: 'neutral' };
  }

  const lowerShadow2 = Math.min(c2.o, c2.c) - c2.l;
  const upperShadow2 = c2.h - Math.max(c2.o, c2.c);
  if (lowerShadow2 > bodySize(c2) * 2 && upperShadow2 < bodySize(c2) * 0.5) {
    return { name: 'hammer', bias: 'bullish' };
  }
  if (upperShadow2 > bodySize(c2) * 2 && lowerShadow2 < bodySize(c2) * 0.5) {
    return { name: 'shooting_star', bias: 'bearish' };
  }

  if (!isBullish(c1) && isBullish(c2) && c2.o <= c1.c && c2.c >= c1.o) {
    return { name: 'bullish_engulfing', bias: 'bullish' };
  }
  if (isBullish(c1) && !isBullish(c2) && c2.o >= c1.c && c2.c <= c1.o) {
    return { name: 'bearish_engulfing', bias: 'bearish' };
  }

  if (!isBullish(c1) && bodySize(c2) / range2 < 0.3 && isBullish(c3) && c3.c > (c1.o + c1.c) / 2) {
    return { name: 'morning_star', bias: 'bullish' };
  }
  if (isBullish(c1) && bodySize(c2) / range2 < 0.3 && !isBullish(c3) && c3.c < (c1.o + c1.c) / 2) {
    return { name: 'evening_star', bias: 'bearish' };
  }

  return { name: 'none', bias: 'neutral' };
}

export function calcVolumeProfile(candles) {
  if (!candles?.length) return [];
  const prices = candles.flatMap((c) => [c.h, c.l, c.c]);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const zones = 24;
  const step = (max - min) / zones || 1;
  const profile = Array.from({ length: zones }, (_, i) => ({
    priceFrom: min + i * step,
    priceTo: min + (i + 1) * step,
    volume: 0,
    type: 'neutral',
    buyVol: 0,
    sellVol: 0,
  }));

  for (const c of candles) {
    const idx = Math.min(zones - 1, Math.max(0, Math.floor((c.c - min) / step)));
    profile[idx].volume += c.v;
    if (isBullish(c)) profile[idx].buyVol += c.v;
    else profile[idx].sellVol += c.v;
  }

  return profile.map((z) => ({
    priceFrom: z.priceFrom,
    priceTo: z.priceTo,
    volume: z.volume,
    type: z.buyVol >= z.sellVol ? 'buy' : 'sell',
  }));
}

export function analyzeTimeframe(candles) {
  if (!candles?.length) return 'sideways';
  const closes = candles.map((c) => c.c);
  const ema20 = calcEMA(closes, 20);
  const ema50 = calcEMA(closes, 50);
  if (ema20 > ema50 * 1.002) return 'uptrend';
  if (ema20 < ema50 * 0.998) return 'downtrend';
  return 'sideways';
}

export function analyzeMultiTimeframe(candlesMap) {
  const result = {};
  for (const tf of ['5m', '15m', '1h', '4h']) {
    result[tf] = analyzeTimeframe(candlesMap[tf] || []);
  }
  const up = Object.values(result).filter((t) => t === 'uptrend').length;
  const down = Object.values(result).filter((t) => t === 'downtrend').length;
  let confluence = 'mixed';
  if (up >= 3) confluence = 'strong_bull';
  else if (down >= 3) confluence = 'strong_bear';
  return { ...result, confluence };
}

export function calcVolumeSpike(candles) {
  if (!candles || candles.length < 21) return 0;
  const recent = candles[candles.length - 1].v;
  const avg = candles.slice(-21, -1).reduce((s, c) => s + c.v, 0) / 20;
  if (!avg) return 0;
  return ((recent - avg) / avg) * 100;
}

export function getBollingerPosition(price, bands) {
  if (!bands || !price) return 'Inside';
  if (price > bands.upper) return 'Above';
  if (price < bands.lower) return 'Below';
  return 'Inside';
}

export function calcOrderBookBias(book) {
  if (!book?.bids?.length || !book?.asks?.length) return 50;
  const bidVol = book.bids.slice(0, 10).reduce((s, [, q]) => s + q, 0);
  const askVol = book.asks.slice(0, 10).reduce((s, [, q]) => s + q, 0);
  const total = bidVol + askVol;
  if (!total) return 50;
  return (bidVol / total) * 100;
}
