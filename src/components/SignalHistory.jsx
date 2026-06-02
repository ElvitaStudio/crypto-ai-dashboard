import { useState, useEffect } from 'react';
import {
  getHistory,
  getStats,
  updateResult,
  clearHistory,
} from '../store/signalHistory';

export default function SignalHistory() {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({ total: 0, wins: 0, losses: 0, winRate: 0 });

  const reload = () => {
    setRecords(getHistory());
    setStats(getStats());
  };

  useEffect(() => {
    reload();
  }, []);

  const handleResult = (id, result) => {
    updateResult(id, result);
    reload();
  };

  const handleClear = () => {
    if (window.confirm('Очистить всю историю сигналов?')) {
      clearHistory();
      reload();
    }
  };

  return (
    <div className="signal-history fade-in-up">
      <div className="stats-row">
        <div className="stat"><span>Всего</span><strong>{stats.total}</strong></div>
        <div className="stat"><span>Побед</span><strong>{stats.wins}</strong></div>
        <div className="stat"><span>Поражений</span><strong>{stats.losses}</strong></div>
        <div className="stat"><span>Винрейт</span><strong>{stats.winRate.toFixed(0)}%</strong></div>
      </div>

      <div className="history-table">
        {records.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>История пуста</p>
        ) : (
          records.map((r) => (
            <div key={r.id} className="history-row">
              <div className="history-meta">
                <span>{new Date(r.createdAt).toLocaleString('ru-RU')}</span>
                <span>{r.symbol?.replace('USDT', '')}</span>
                <span className={`dir-${r.direction}`}>{r.direction}</span>
                <span>{r.confidence}%</span>
                <span>{r.riskReward}</span>
              </div>
              <div className="result-btns">
                <button type="button" onClick={() => handleResult(r.id, 'win')}>✅ Win</button>
                <button type="button" onClick={() => handleResult(r.id, 'loss')}>❌ Loss</button>
                <button type="button" onClick={() => handleResult(r.id, 'pending')}>⏳ Pending</button>
                <span className={`result-tag ${r.result}`}>{r.result}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <button type="button" className="btn-clear" onClick={handleClear}>
        Очистить историю
      </button>
    </div>
  );
}
