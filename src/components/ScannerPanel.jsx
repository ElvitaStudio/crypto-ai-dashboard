import { useState, useEffect, useCallback } from 'react';
import { useAutoScanner } from '../hooks/useAutoScanner';
import { getScanHistory, clearScanHistory, clearHistory } from '../store/signalHistory';
import { formatPrice } from '../utils/format';

function formatScanSummary(count) {
  if (count === 0) return 'сигналов не найдено';
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return `найдено ${count} сигналов`;
  if (mod10 === 1) return 'найден 1 сигнал';
  if (mod10 >= 2 && mod10 <= 4) return `найдено ${count} сигнала`;
  return `найдено ${count} сигналов`;
}

function getScanTime(h) {
  return h.scannedAt ?? h.at ?? h.id;
}

function getSignalsCount(h) {
  return h.signalsCount ?? h.count ?? (h.signals?.length || 0);
}

function signalEmoji(direction) {
  if (direction === 'LONG') return '🟢';
  if (direction === 'SHORT') return '🔴';
  return '⚪';
}

function getTrendKind(trend) {
  const t = String(trend || '').toLowerCase();
  if (t.includes('up') || t.includes('bull')) return 'up';
  if (t.includes('down') || t.includes('bear')) return 'down';
  return 'neutral';
}

function ToastNotification({ toasts, onClose, onOpen }) {
  return (
    <div className="toast-container">
      {toasts.slice(0, 3).map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.direction === 'LONG' ? 'long' : 'short'} ${t.exiting ? 'exiting' : ''}`}
        >
          <button type="button" className="toast-close" onClick={() => onClose(t.id)}>×</button>
          <strong>🔥 {t.symbol?.replace('USDT', '')} — {t.direction} ({t.confidence}%)</strong>
          <p>{String(t.reason || '').slice(0, 60)}...</p>
          <button type="button" className="toast-open" onClick={() => onOpen(t.symbol)}>
            Открыть
          </button>
        </div>
      ))}
    </div>
  );
}

export default function ScannerPanel({
  onCoinSelect,
  currentCoin,
  onSignals,
  onCandidatesChange,
}) {
  const [enabled, setEnabled] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [historySectionOpen, setHistorySectionOpen] = useState(false);
  const [expandedScanId, setExpandedScanId] = useState(null);
  const [scanHistory, setScanHistory] = useState(() => getScanHistory());

  const addToasts = useCallback((signals) => {
    const newToasts = signals
      .filter((s) => s.confidence >= 65)
      .map((s) => ({ ...s, toastId: `${s.id}-${Date.now()}` }));
    setToasts((prev) => [...newToasts.map((s) => ({ ...s, id: s.toastId })), ...prev].slice(0, 3));

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      newToasts.forEach((s) => {
        new Notification(`🔥 Новый сигнал: ${s.symbol}`, {
          body: `${s.direction} • ${s.confidence}% уверенность\n${s.reason}`,
          icon: '/favicon.svg',
        });
      });
    }
  }, []);

  const handleSignals = useCallback(
    (signals) => {
      if (signals?.length) {
        addToasts(signals);
        onSignals?.(signals);
      }
    },
    [addToasts, onSignals]
  );

  const handleScanComplete = useCallback(() => {
    setScanHistory(getScanHistory());
    const history = getScanHistory();
    const symbols =
      history[0]?.candidates?.map((c) => c.symbol).filter(Boolean) || [];
    if (symbols.length) onCandidatesChange?.(symbols);
  }, [onCandidatesChange]);

  const {
    scanning,
    lastScanAt,
    countdown,
    candidates,
    topCandidates,
    error,
    runNow,
  } = useAutoScanner({
    enabled,
    onSignals: handleSignals,
    onScanComplete: handleScanComplete,
  });

  useEffect(() => {
    onCandidatesChange?.(topCandidates.length ? topCandidates : candidates.map((c) => c.symbol));
  }, [candidates, topCandidates, onCandidatesChange]);

  useEffect(() => {
    const timers = toasts
      .filter((t) => !t.exiting)
      .map((t) =>
        setTimeout(() => {
          setToasts((prev) =>
            prev.map((x) => (x.id === t.id ? { ...x, exiting: true } : x))
          );
          setTimeout(() => {
            setToasts((prev) => prev.filter((x) => x.id !== t.id));
          }, 300);
        }, 10000)
      );
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  const handleToggle = () => {
    const next = !enabled;
    if (next && typeof Notification !== 'undefined') {
      Notification.requestPermission();
    }
    setEnabled(next);
  };

  const historyItems = showAllHistory ? scanHistory : scanHistory.slice(0, 5);

  const toggleHistoryItem = (id) => {
    setExpandedScanId((prev) => (prev === id ? null : id));
  };

  return (
  <>
    <div className="scanner-panel card">
      <div className="scanner-header">
        <div>
          <h3>🔍 АВТО-СКАНЕР</h3>
          <span className="badge-test">ТЕСТ • 1ч</span>
        </div>
        <button type="button" className="scanner-toggle" onClick={handleToggle}>
          <span className={`dot ${enabled ? 'on' : 'off'}`} />
          {enabled ? 'Активен' : 'Выключен'} {enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {enabled && (
        <div className="scanner-status">
          {scanning ? (
            <div className="scanning-state">
              <p>⏳ Сканирую 20 монет...</p>
              <div className="progress-bar pulse-bar" />
            </div>
          ) : (
            <>
              <div className="scan-times">
                <div>
                  <span>Последний скан</span>
                  <strong>{lastScanAt ? lastScanAt.toLocaleTimeString('ru-RU') : '—'}</strong>
                </div>
                <div>
                  <span>Следующий скан</span>
                  <strong>{countdown}</strong>
                </div>
              </div>
              <button type="button" className="btn-outline btn-sm" onClick={runNow} disabled={scanning}>
                ▶ Запустить сейчас
              </button>
            </>
          )}
          {error && <p className="error-text">{error}</p>}
        </div>
      )}

      {scanHistory.length > 0 && (
        <div className="scan-history-block">
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
            <button
              type="button"
              className="scan-history-section-toggle"
              onClick={() => setHistorySectionOpen((v) => !v)}
            >
              📋 История сигналов {historySectionOpen ? '▼' : '▶'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm('Очистить всю историю сигналов?')) {
                  clearScanHistory();
                  clearHistory();
                  setScanHistory([]);
                }
              }}
              style={{
                background: 'none',
                border: '1px solid #2d3748',
                borderRadius: 6,
                color: '#4a5568',
                fontSize: 10,
                padding: '3px 8px',
                cursor: 'pointer',
                marginLeft: 8,
              }}
            >
              🗑 Очистить
            </button>
          </div>
          <div className={`scan-history-collapse ${historySectionOpen ? 'open' : ''}`}>
          <ul className="scan-history-list">
            {historyItems.map((h) => {
              const scanId = h.id ?? getScanTime(h);
              const expanded = expandedScanId === scanId;
              const signals = h.signals || [];
              const scanCandidates = h.candidates || [];
              const count = getSignalsCount(h);
              return (
                <li key={scanId} className="scan-history-item">
                  <button
                    type="button"
                    className="scan-history-row"
                    onClick={() => toggleHistoryItem(scanId)}
                  >
                    <span className="scan-history-arrow">
                      {expanded ? '▼' : '▶'}
                    </span>
                    <span className="scan-history-time">
                      {new Date(getScanTime(h)).toLocaleTimeString('ru-RU')}
                    </span>
                    <span className="scan-history-sep"> — </span>
                    <span
                      className={`scan-history-summary ${
                        count === 0 ? 'is-zero' : 'is-found'
                      }`}
                    >
                      {formatScanSummary(count)}
                    </span>
                  </button>
                  {expanded && (
                    <div className="scan-history-details">
                      <div className="scan-history-section">
                        <strong className="scan-history-heading">Топ кандидаты</strong>
                        {scanCandidates.length > 0 ? (
                          <ul className="scan-candidates-list">
                            {scanCandidates.map((c) => {
                              const rsi = c.rsi ?? c.indicators?.rsi;
                              const trend =
                                c.trend ?? c.indicators?.multiTimeframe?.['15m'];
                              const trendKind = getTrendKind(trend);
                              return (
                                <li key={c.symbol} className="scan-candidate-row">
                                  <span className="scan-candidate-symbol">
                                    {c.symbol?.replace('USDT', '')}
                                  </span>
                                  <span className="scan-candidate-muted"> — score </span>
                                  <span className="scan-candidate-score">{c.score}</span>
                                  {rsi != null && (
                                    <>
                                      <span className="scan-candidate-muted"> • RSI </span>
                                      <span className="scan-candidate-rsi">
                                        {Number(rsi).toFixed(0)}
                                      </span>
                                    </>
                                  )}
                                  {trend && (
                                    <>
                                      <span className="scan-candidate-muted"> • </span>
                                      <span
                                        className={`scan-candidate-trend trend-${trendKind}`}
                                      >
                                        {trend}
                                      </span>
                                    </>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="scan-history-empty">Кандидаты не сохранены</p>
                        )}
                      </div>
                      <div className="scan-history-section">
                        <strong className="scan-history-heading">Сигналы</strong>
                        {signals.length > 0 ? (
                          <ul className="scan-signals-list">
                            {signals.map((s, idx) => (
                              <li key={`${s.symbol}-${s.id ?? idx}`} className="scan-signal-item">
                                <div className="scan-signal-main">
                                  <span className="scan-signal-emoji">
                                    {signalEmoji(s.direction)}
                                  </span>{' '}
                                  <span
                                    className={
                                      s.direction === 'LONG'
                                        ? 'scan-signal-long'
                                        : 'scan-signal-short'
                                    }
                                  >
                                    {s.direction}
                                  </span>
                                  <span className="scan-signal-muted"> — </span>
                                  <span className="scan-signal-symbol">
                                    {s.symbol?.replace('USDT', '')}
                                  </span>
                                  <span className="scan-signal-muted"> (</span>
                                  <span className="scan-signal-confidence">
                                    {s.confidence}%
                                  </span>
                                  <span className="scan-signal-muted">)</span>
                                </div>
                                <div
                                  style={{
                                    marginTop: 8,
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1fr',
                                    gap: 6,
                                  }}
                                >
                                  {[
                                    { label: 'ВХОД', value: formatPrice(s.entry), color: '#e2e8f0' },
                                    { label: 'СТОП', value: formatPrice(s.sl), color: '#ef5350' },
                                    { label: 'TP1', value: formatPrice(s.tp1), color: '#26a69a' },
                                  ].map(({ label, value, color }) => (
                                    <div
                                      key={label}
                                      style={{
                                        background: '#080b12',
                                        border: '1px solid #1e2433',
                                        borderRadius: 6,
                                        padding: '6px 8px',
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontSize: 10,
                                          color: '#4a5568',
                                          marginBottom: 2,
                                          letterSpacing: 1,
                                        }}
                                      >
                                        {label}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: 15,
                                          color,
                                          fontWeight: 700,
                                          fontFamily: 'monospace',
                                        }}
                                      >
                                        {value}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {s.riskReward && (
                                  <div
                                    style={{
                                      marginTop: 6,
                                      display: 'inline-block',
                                      background: '#7c3aed22',
                                      border: '1px solid #7c3aed44',
                                      borderRadius: 4,
                                      padding: '4px 12px',
                                      fontSize: 13,
                                      color: '#a78bfa',
                                      fontWeight: 600,
                                    }}
                                  >
                                    R:R {s.riskReward}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="scan-history-empty">Сигналов не найдено</p>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {scanHistory.length > 5 && !showAllHistory && (
            <button type="button" className="link-btn" onClick={() => setShowAllHistory(true)}>
              показать все
            </button>
          )}
          </div>
        </div>
      )}
    </div>

    <ToastNotification
      toasts={toasts}
      onClose={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      onOpen={(symbol) => {
        onCoinSelect(symbol);
        setToasts([]);
      }}
    />
  </>
  );
}
