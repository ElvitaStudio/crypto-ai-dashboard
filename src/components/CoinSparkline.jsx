export default function CoinSparkline({ symbol = 'coin', candles, loading, height = 100 }) {
  if (loading || !candles?.length) {
    return (
      <div
        className="sparkline-placeholder"
        style={{ height, width: '100%', borderRadius: 6 }}
      />
    );
  }

  const prices = candles.map((c) => c.c);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const w = 100;
  const h = 100;

  const coords = prices.map((p, i) => {
    const x = prices.length > 1 ? (i / (prices.length - 1)) * w : w / 2;
    const y = h - ((p - min) / range) * (h - 4) - 2;
    return { x, y };
  });

  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const areaPoints = `0,${h} ${linePoints} ${w},${h}`;
  const isUp = prices[prices.length - 1] >= prices[0];
  const color = isUp ? '#26a69a' : '#ef5350';
  const gradId = `spark-${symbol}-${isUp ? 'up' : 'down'}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradId})`} />
      <polyline
        points={linePoints}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
