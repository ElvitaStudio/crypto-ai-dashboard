import { formatPrice, formatPercent } from '../utils/format';

function rsiColor(rsi) {
  if (rsi > 70) return '#ef5350';
  if (rsi < 30) return '#26a69a';
  return '#4a5568';
}

function formatVolLabel(spike) {
  const n = Number(spike) || 0;
  const text = n > 0 ? `Vol +${n}%` : `Vol ${n}%`;
  const color = n > 0 ? '#fbbf24' : '#4a5568';
  return { text: n > 150 ? `🔥 ${text}` : text, color };
}

export default function CoinCard({
  symbol,
  price = 0,
  change = 0,
  volume: _volume,
  rsi = 50,
  volSpike = 0,
  isCandidate,
  onOpen,
  children,
}) {
  const isUp = change >= 0;
  const trendColor = isUp ? '#26a69a' : '#ef5350';
  const vol = formatVolLabel(volSpike);
  const label = symbol?.replace('USDT', '') || '—';

  const handleOpen = (e) => {
    e?.stopPropagation?.();
    onOpen(symbol);
  };

  return (
    <article
      className={`coin-card ${isCandidate ? 'coin-card-candidate' : ''}`}
      onClick={() => onOpen(symbol)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(symbol)}
      role="button"
      tabIndex={0}
    >
      {isCandidate && <span className="coin-card-badge">🔥 Кандидат</span>}

      <div className="coin-card-left">
        <div className="coin-card-info">
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#e2e8f0',
              textShadow: isUp ? '0 0 8px #26a69a88' : '0 0 8px #ef535088',
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: 16,
              fontFamily: 'monospace',
              fontWeight: 600,
              color: trendColor,
              marginTop: 4,
            }}
          >
            {formatPrice(price)}
          </div>
          <span
            style={{
              display: 'inline-block',
              marginTop: 6,
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 700,
              background: isUp ? '#26a69a33' : '#ef535033',
              border: `1px solid ${trendColor}`,
              color: trendColor,
            }}
          >
            {formatPercent(change)}
          </span>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: rsiColor(rsi),
              marginTop: 6,
            }}
          >
            RSI {Number(rsi).toFixed(0)}
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: vol.color,
              marginTop: 4,
            }}
          >
            {vol.text}
          </div>
        </div>

        <button
          type="button"
          className="coin-card-open-btn"
          onClick={handleOpen}
        >
          Открыть →
        </button>
      </div>

      <div className="coin-card-right">{children}</div>
    </article>
  );
}
