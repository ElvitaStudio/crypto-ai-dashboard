import { useEffect, useState } from 'react';
import { fetchTopCoinsGecko } from '../services/binance';
import { formatPercent } from '../utils/format';

export default function CoinSelector({ selected, onSelect }) {
  const [coins, setCoins] = useState([]);

  useEffect(() => {
    fetchTopCoinsGecko().then(setCoins);
  }, []);

  return (
    <div className="coin-selector">
      <div className="coin-scroll">
        {coins.map((c) => {
          const ticker = c.symbol.replace('USDT', '');
          const isActive = c.symbol === selected;
          const color = c.priceChangePercent >= 0 ? 'var(--green)' : 'var(--red)';
          return (
            <button
              key={c.symbol}
              type="button"
              className={`coin-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(c.symbol)}
            >
              <span>{ticker}</span>
              <span style={{ color }}>{formatPercent(c.priceChangePercent)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
