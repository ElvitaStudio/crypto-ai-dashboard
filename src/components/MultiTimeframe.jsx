import { analyzeTimeframe } from '../services/analysis';

const TF_LABELS = ['5m', '15m', '1h', '4h'];

const trendArrow = {
  uptrend: '▲',
  downtrend: '▼',
  sideways: '→',
};

const trendColor = {
  uptrend: 'var(--green)',
  downtrend: 'var(--red)',
  sideways: 'var(--text-muted)',
};

const confluenceLabels = {
  strong_bull: '🔥 Сильный бычий',
  strong_bear: '❄️ Сильный медвежий',
  mixed: '⚠️ Смешанный',
};

function Sparkline({ candles, color }) {
  if (!candles?.length) return null;
  const data = candles.slice(-20);
  const closes = data.map((c) => c.c);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const w = 80;
  const h = 30;
  const points = closes
    .map((c, i) => {
      const x = (i / (closes.length - 1 || 1)) * w;
      const y = h - ((c - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} className="sparkline">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

export default function MultiTimeframe({ allTimeframeCandles, currentPrice }) {
  const trends = {};
  TF_LABELS.forEach((tf) => {
    trends[tf] = analyzeTimeframe(allTimeframeCandles?.[tf] || []);
  });

  const up = Object.values(trends).filter((t) => t === 'uptrend').length;
  const down = Object.values(trends).filter((t) => t === 'downtrend').length;
  let confluence = 'mixed';
  if (up >= 3) confluence = 'strong_bull';
  else if (down >= 3) confluence = 'strong_bear';

  return (
    <div className="card mtf-panel fade-in-up">
      <h3 className="card-title">Мультитаймфрейм</h3>
      <div className="mtf-grid">
        {TF_LABELS.map((tf) => {
          const trend = trends[tf];
          const color = trendColor[trend];
          return (
            <div key={tf} className="mtf-card" style={{ borderColor: color }}>
              <div className="mtf-header">
                <span>{tf}</span>
                <span style={{ color }}>{trendArrow[trend]}</span>
              </div>
              <Sparkline
                candles={allTimeframeCandles?.[tf]}
                color={color}
              />
              {currentPrice != null && (
                <span className="mtf-price" style={{ color }}>{trend}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className={`confluence-badge ${confluence}`}>
        {confluenceLabels[confluence]}
      </div>
    </div>
  );
}
