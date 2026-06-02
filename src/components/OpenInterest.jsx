import { useState, useEffect, useCallback } from 'react';
import { fetchOpenInterest, fetchOpenInterestHist } from '../services/futures';
import { formatVolume } from '../utils/format';

function pctChange(current, previous) {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

function getInterpretation(priceUp, oiUp) {
  if (priceUp && oiUp) return 'Сильный тренд вверх 🟢';
  if (priceUp && !oiUp) return 'Шорт-сквиз / слабый рост 🟡';
  if (!priceUp && oiUp) return 'Сильный тренд вниз 🔴';
  return 'Лонг-ликвидации 🟡';
}

function OiSparkline({ data, rising }) {
  if (!data?.length) return null;
  const values = data.map((d) => d.sumOpenInterestValue);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 200;
  const h = 40;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1 || 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');
  const color = rising ? '#26a69a' : '#ef5350';
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="oi-sparkline">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </svg>
  );
}

export default function OpenInterest({ symbol, priceChange24h, onMetrics }) {
  const [oiUsd, setOiUsd] = useState(null);
  const [change1h, setChange1h] = useState(0);
  const [change24h, setChange24h] = useState(0);
  const [hist, setHist] = useState([]);
  const [interpretation, setInterpretation] = useState('');
  const [hasFutures, setHasFutures] = useState(true);

  const load = useCallback(async () => {
    const oi = await fetchOpenInterest(symbol);
    const history = await fetchOpenInterestHist(symbol, '1h', 24);

    if (!oi || !history.length) {
      setHasFutures(false);
      onMetrics?.({
        openInterest: null,
        openInterestChange1h: null,
        openInterestTrend: null,
      });
      return;
    }

    setHasFutures(true);
    const last = history[history.length - 1];
    const prev1h = history[history.length - 2];
    const first = history[0];
    const oiValue = last.sumOpenInterestValue;
    const ch1h = pctChange(last.sumOpenInterestValue, prev1h?.sumOpenInterestValue);
    const ch24h = pctChange(last.sumOpenInterestValue, first.sumOpenInterestValue);

    setOiUsd(oiValue);
    setChange1h(ch1h);
    setChange24h(ch24h);
    setHist(history);

    const priceUp = (priceChange24h ?? 0) >= 0;
    const oiUp = ch1h >= 0;
    const trend = getInterpretation(priceUp, oiUp);
    setInterpretation(trend);

    onMetrics?.({
      openInterest: oiValue,
      openInterestChange1h: ch1h,
      openInterestTrend: trend,
    });
  }, [symbol, priceChange24h, onMetrics]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  if (!hasFutures) return null;

  const rising = change1h >= 0;

  return (
    <div className="widget-card open-interest">
      <h3 className="widget-title">OPEN INTEREST</h3>
      <div className="oi-value">${formatVolume(oiUsd)}</div>
      <div className="oi-changes">
        <span style={{ color: change1h >= 0 ? 'var(--green)' : 'var(--red)' }}>
          1ч: {change1h >= 0 ? '+' : ''}{change1h.toFixed(2)}%
        </span>
        <span style={{ color: change24h >= 0 ? 'var(--green)' : 'var(--red)' }}>
          24ч: {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
        </span>
      </div>
      <OiSparkline data={hist} rising={rising} />
      <p className="oi-interpretation">{interpretation}</p>
    </div>
  );
}
