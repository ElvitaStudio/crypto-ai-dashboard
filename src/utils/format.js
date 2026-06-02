export function formatPrice(p) {
  if (p == null || Number.isNaN(Number(p))) return '—';
  const num = Number(p);
  if (num === 0) return '0,00';
  if (num >= 1000) {
    return num.toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (num >= 1) {
    return num.toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }
  if (num >= 0.01) {
    return num.toLocaleString('ru-RU', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    });
  }
  return num.toLocaleString('ru-RU', {
    minimumFractionDigits: 6,
    maximumFractionDigits: 8,
  });
}

export function formatVolume(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  const n = Math.abs(Number(v));
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(2);
}

export function formatPercent(p) {
  if (p == null || Number.isNaN(Number(p))) return '—';
  const n = Number(p);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}
