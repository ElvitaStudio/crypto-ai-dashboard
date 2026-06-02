import { formatPrice, formatPercent } from '../utils/format';

function distPct(price, current) {
  if (!price || !current) return '—';
  const d = ((price - current) / current) * 100;
  return formatPercent(d);
}

export default function Indicators({ indicators, levels, currentPrice }) {
  if (!indicators) {
    return <div className="card">Загрузка индикаторов...</div>;
  }

  const { rsi, macd, bollingerPosition, bollingerBandwidth, atr, candlePattern } = indicators;
  const rsiColor = rsi > 70 ? 'var(--red)' : rsi < 30 ? 'var(--green)' : 'var(--blue)';

  const patternIcons = {
    doji: '◆',
    hammer: '🔨',
    shooting_star: '⭐',
    bullish_engulfing: '📈',
    bearish_engulfing: '📉',
    morning_star: '🌅',
    evening_star: '🌆',
    none: '—',
  };

  return (
    <div className="card indicators-panel fade-in-up">
      <h3 className="card-title">Индикаторы</h3>

      <div className="indicator-block">
        <span>RSI(14)</span>
        <strong style={{ color: rsiColor }}>{rsi?.toFixed(1)}</strong>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${rsi}%`, background: rsiColor }} />
        </div>
        <div className="zones">
          <span>30</span><span>70</span>
        </div>
      </div>

      <div className="indicator-block">
        <span>MACD</span>
        <strong>
          {macd?.trend === 'bullish' ? '▲' : '▼'} {macd?.histogram?.toFixed(4)}
        </strong>
      </div>

      <div className="indicator-block">
        <span>Bollinger</span>
        <strong>{bollingerPosition} · {bollingerBandwidth?.toFixed(2)}%</strong>
      </div>

      <div className="indicator-block">
        <span>ATR(14)</span>
        <strong>
          {formatPrice(atr)} ({currentPrice ? formatPercent((atr / currentPrice) * 100) : '—'})
        </strong>
      </div>

      <div className="indicator-block">
        <span>Паттерн</span>
        <span>
          {patternIcons[candlePattern?.name] || '—'} {candlePattern?.name?.replace(/_/g, ' ')}
          <span className={`bias-badge ${candlePattern?.bias}`}>{candlePattern?.bias}</span>
        </span>
      </div>

      <div className="indicator-block levels-list">
        <span>Уровни S/R</span>
        {(levels?.resistances || []).map((p, i) => (
          <div key={`r${i}`} className="level-row">
            <span>R{i + 1}</span>
            <span>{formatPrice(p)}</span>
            <span className="dist">{distPct(p, currentPrice)}</span>
          </div>
        ))}
        {(levels?.supports || []).map((p, i) => (
          <div key={`s${i}`} className="level-row support">
            <span>S{i + 1}</span>
            <span>{formatPrice(p)}</span>
            <span className="dist">{distPct(p, currentPrice)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
