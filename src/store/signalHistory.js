const STORAGE_KEY = 'crypto_signals_v1';
const MAX_RECORDS = 50;

const isBrowser = typeof localStorage !== 'undefined';

function load() {
  if (!isBrowser) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(records) {
  if (!isBrowser) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
}

export function saveSignal(signal) {
  if (
    !signal.entry ||
    signal.entry === '—' ||
    signal.entry === '0' ||
    +signal.entry === 0
  ) {
    console.warn('Пропускаем невалидный сигнал:', signal);
    return load();
  }

  const history = load();
  history.unshift({ ...signal, id: signal.id ?? Date.now() });
  save(history);
  return history;
}

export function getHistory() {
  return load();
}

export function updateResult(id, result) {
  const records = load();
  const idx = records.findIndex((r) => r.id === id);
  if (idx >= 0) {
    records[idx].result = result;
    save(records);
  }
  return records;
}

export function getStats() {
  const records = load();
  const wins = records.filter((r) => r.result === 'win').length;
  const losses = records.filter((r) => r.result === 'loss').length;
  const pending = records.filter((r) => r.result === 'pending').length;
  const total = records.length;
  const winRate = total ? (wins / (wins + losses || 1)) * 100 : 0;

  const rrValues = records
    .map((r) => {
      const m = String(r.riskReward || '').match(/1:(\d+\.?\d*)/);
      return m ? parseFloat(m[1]) : null;
    })
    .filter((v) => v != null);
  const avgRR = rrValues.length
    ? rrValues.reduce((a, b) => a + b, 0) / rrValues.length
    : 0;

  return { total, wins, losses, pending, winRate, avgRR };
}

export function clearHistory() {
  if (!isBrowser) return;
  localStorage.removeItem(STORAGE_KEY);
}

const SCAN_HISTORY_KEY = 'scan_history';

export function saveScanHistory(scan) {
  if (!isBrowser) return getScanHistory();
  try {
    const history = getScanHistory();
    history.unshift({
      ...scan,
      id: Date.now(),
    });
    const trimmed = history.slice(0, 50);
    localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(trimmed));
    return trimmed;
  } catch {
    return getScanHistory();
  }
}

export function getScanHistory() {
  if (!isBrowser) return [];
  try {
    return JSON.parse(localStorage.getItem(SCAN_HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearScanHistory() {
  if (!isBrowser) return;
  localStorage.removeItem(SCAN_HISTORY_KEY);
}
