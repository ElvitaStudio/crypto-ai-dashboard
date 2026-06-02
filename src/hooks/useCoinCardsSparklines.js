import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchSmartKlines } from '../services/binance';
import { calcRSI } from '../services/analysis';

const CACHE_TTL = 60 * 1000;
const BATCH_SIZE = 5;

function calcCardVolumeSpike(klines) {
  if (!klines || klines.length < 21) return 0;
  const avgVol = klines.slice(0, 20).reduce((s, c) => s + c.v, 0) / 20;
  const lastVol = klines[klines.length - 1].v;
  if (!avgVol) return 0;
  return Math.round((lastVol / avgVol - 1) * 100);
}

export function useCoinCardsSparklines(symbols) {
  const cacheRef = useRef(new Map());
  const [cardData, setCardData] = useState({});

  const loadSymbol = async (symbol) => {
    const cached = cacheRef.current.get(symbol);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return { symbol, ...cached.data };
    }

    const klines = await fetchSmartKlines(symbol, '15m', 21);
    const closes = klines.map((c) => c.c);
    const data = {
      rsi: calcRSI(closes),
      volumeSpike: calcCardVolumeSpike(klines),
    };
    cacheRef.current.set(symbol, { data, ts: Date.now() });
    return { symbol, ...data };
  };

  const invalidateCache = useCallback(() => {
    cacheRef.current.clear();
    setCardData({});
  }, []);

  useEffect(() => {
    if (!symbols.length) {
      setCardData({});
      return undefined;
    }

    let cancelled = false;

    const initial = {};
    symbols.forEach((sym) => {
      const cached = cacheRef.current.get(sym);
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        initial[sym] = { ...cached.data, loading: false };
      } else {
        initial[sym] = { loading: true };
      }
    });
    setCardData(initial);

    (async () => {
      const toLoad = symbols.filter((sym) => {
        const cached = cacheRef.current.get(sym);
        return !(cached && Date.now() - cached.ts < CACHE_TTL);
      });

      for (let i = 0; i < toLoad.length; i += BATCH_SIZE) {
        if (cancelled) return;
        const batch = toLoad.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(batch.map(loadSymbol));
        if (cancelled) return;

        const updates = {};
        results.forEach((result, idx) => {
          const sym = batch[idx];
          if (result.status === 'fulfilled') {
            updates[sym] = { ...result.value, loading: false };
          } else {
            updates[sym] = {
              loading: false,
              rsi: 50,
              volumeSpike: 0,
            };
          }
        });
        setCardData((prev) => ({ ...prev, ...updates }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [symbols.join('|')]);

  return { cardData, invalidateCache };
}
