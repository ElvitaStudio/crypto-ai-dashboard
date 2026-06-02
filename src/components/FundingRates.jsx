import { useState, useEffect, useCallback } from 'react';
import { fetchPremiumIndex } from '../services/futures';

function getNextFundingTime() {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const slots = [0, 8, 16];
  const nextSlot = slots.find((h) => h > utcHours);
  const next = new Date(now);
  if (nextSlot == null) {
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(0, 0, 0, 0);
  } else {
    next.setUTCHours(nextSlot, 0, 0, 0);
  }
  return next;
}

function rateColor(ratePct) {
  if (ratePct > 0.1) return '#ff4444';
  if (ratePct > 0) return '#26a69a';
  if (ratePct < -0.1) return '#3b82f6';
  return '#60a5fa';
}

function formatRatePct(rate) {
  return (rate * 100).toFixed(4);
}

export default function FundingRates({ selectedCoin, onMetrics }) {
  const [rates, setRates] = useState([]);
  const [nextFunding, setNextFunding] = useState(getNextFundingTime());

  const load = useCallback(async () => {
    const data = await fetchPremiumIndex();
    const sorted = data
      .sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate))
      .slice(0, 15);
    setRates(sorted);
    setNextFunding(getNextFundingTime());

    const selected = data.find((r) => r.symbol === selectedCoin);
    const ratePct = selected ? selected.fundingRate * 100 : null;
    onMetrics?.({
      fundingRate: ratePct,
      fundingRateExtreme: selected ? Math.abs(ratePct) > 0.15 : false,
    });
  }, [selectedCoin, onMetrics]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  const avgRate =
    rates.length > 0
      ? (rates.reduce((s, r) => s + r.fundingRate, 0) / rates.length) * 100
      : 0;

  return (
    <div className="widget-card funding-rates">
      <div className="widget-header">
        <h3 className="widget-title">FUNDING RATE</h3>
        <span className="widget-sub">
          След.: {nextFunding.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} UTC
        </span>
      </div>
      <ul className="funding-list">
        {rates.map((item) => {
          const pct = item.fundingRate * 100;
          const extreme = Math.abs(pct) > 0.15;
          const isSelected = item.symbol === selectedCoin;
          return (
            <li
              key={item.symbol}
              className={`funding-row ${isSelected ? 'selected' : ''}`}
            >
              <span className="funding-symbol">
                {item.symbol.replace('USDT', '')}
              </span>
              <span className="funding-rate" style={{ color: rateColor(pct) }}>
                {formatRatePct(item.fundingRate)}%
                {extreme && ' ⚠️'}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="funding-avg">
        Средний по рынку:{' '}
        <span style={{ color: rateColor(avgRate) }}>{avgRate.toFixed(4)}%</span>
      </div>
    </div>
  );
}
