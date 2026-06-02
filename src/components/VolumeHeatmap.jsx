import { useEffect, useRef } from 'react';
import { calcVolumeProfile } from '../services/analysis';
import { formatPrice } from '../utils/format';

function volumeColor(ratio) {
  if (ratio < 0.25) return '#0d1117';
  if (ratio < 0.5) return '#1e3a5f';
  if (ratio < 0.75) return '#f59e0b';
  return '#ef4444';
}

export default function VolumeHeatmap({ candles }) {
  const canvasRef = useRef(null);
  const data = (candles || []).slice(-50);
  const profile = calcVolumeProfile(data);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !profile.length) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = 160 * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = 160;
    const maxVol = Math.max(...profile.map((z) => z.volume), 1);
    const topZones = [...profile]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 3)
      .map((z) => z.priceFrom);

    const rowH = h / profile.length;

    profile.forEach((zone, i) => {
      const ratio = zone.volume / maxVol;
      ctx.fillStyle = volumeColor(ratio);
      ctx.fillRect(40, i * rowH, w - 50, rowH - 1);

      if (topZones.includes(zone.priceFrom)) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = '10px IBM Plex Mono';
        ctx.fillText('🔥', w - 28, i * rowH + rowH / 2 + 3);
      }

      ctx.fillStyle = '#4a5568';
      ctx.font = '9px IBM Plex Mono';
      ctx.fillText(formatPrice(zone.priceTo), 2, i * rowH + rowH / 2 + 3);
    });
  }, [profile, candles]);

  return (
    <div className="card heatmap-panel fade-in-up">
      <h3 className="card-title">Volume Heatmap</h3>
      <canvas ref={canvasRef} style={{ width: '100%', height: 160, display: 'block' }} />
      <p className="heatmap-caption">Зоны интереса покупателей/продавцов</p>
    </div>
  );
}
