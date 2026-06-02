import { useState } from 'react';
import { saveSignal } from '../store/signalHistory';
import { formatPrice } from '../utils/format';

const directionColors = {
  LONG: '#26a69a',
  SHORT: '#ef5350',
  'НЕЙТРАЛЬНО': '#fbbf24',
};

function Cell({ label, value }) {
  return (
    <div className="grid-cell">
      <span className="cell-label">{label}</span>
      <span className="cell-value">{value}</span>
    </div>
  );
}

export default function SignalCard({ signal, loading }) {
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);

  if (loading) {
    return (
      <div className="signal-card skeleton-wrap">
        <div className="skeleton" style={{ height: 32, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 80, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 48 }} />
      </div>
    );
  }

  if (!signal) {
    return (
      <div className="signal-card empty">
        <p style={{ color: 'var(--text-muted)' }}>Запустите AI анализ для получения сигнала</p>
      </div>
    );
  }

  const color = directionColors[signal.direction] || directionColors['НЕЙТРАЛЬНО'];

  return (
    <div
      className="signal-card fade-in-up"
      style={{
        border: '1px solid var(--border)',
        borderLeft: `4px solid ${color}`,
      }}
    >
      <div className="signal-header">
        <span className="direction-badge" style={{ background: color }}>
          {signal.direction}
        </span>
        <div className="confidence-wrap">
          <span>{signal.confidence}%</span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${signal.confidence}%`, background: color }}
            />
          </div>
        </div>
      </div>

      <div className="grid-2x2">
        <Cell label="Entry" value={formatPrice(signal.entry)} />
        <Cell label="Stop Loss" value={formatPrice(signal.sl)} />
        <Cell label="TP1" value={formatPrice(signal.tp1)} />
        <Cell label="TP2" value={formatPrice(signal.tp2)} />
      </div>

      {signal.riskReward && <span className="rr-badge">R:R {signal.riskReward}</span>}

      <p className="signal-reason">{signal.reason}</p>

      <button type="button" className="accordion-toggle" onClick={() => setExpanded(!expanded)}>
        {expanded ? '▼' : '▶'} Риски и инвалидация
      </button>
      {expanded && (
        <div className="accordion-body">
          <p><strong>Риски:</strong> {signal.keyRisks}</p>
          <p><strong>Инвалидация:</strong> {signal.invalidation}</p>
        </div>
      )}

      {!signal.error && (
        <button
          type="button"
          className="btn-save"
          onClick={() => {
            saveSignal(signal);
            setSaved(true);
          }}
          disabled={saved}
        >
          {saved ? '✓ Сохранено' : '💾 Сохранить сигнал'}
        </button>
      )}
    </div>
  );
}
