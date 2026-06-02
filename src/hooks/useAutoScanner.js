import { useState, useEffect, useRef, useCallback } from 'react';
import { runFullScan } from '../services/scanner';
import { saveScanHistory } from '../store/signalHistory';

// Тестовый режим: 1 час. Для продакшена заменить на 5 * 60 * 1000
const SCAN_INTERVAL = 60 * 60 * 1000;

function formatCountdown(ms) {
  if (ms <= 0) return 'Сканирую...';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function useAutoScanner({ enabled, onSignals, onScanComplete }) {
  const [scanning, setScanning] = useState(false);
  const [lastScanAt, setLastScanAt] = useState(null);
  const [nextScanAt, setNextScanAt] = useState(null);
  const [countdown, setCountdown] = useState('--:--');
  const [candidates, setCandidates] = useState([]);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const onSignalsRef = useRef(onSignals);
  const onScanCompleteRef = useRef(onScanComplete);

  useEffect(() => {
    onSignalsRef.current = onSignals;
    onScanCompleteRef.current = onScanComplete;
  }, [onSignals, onScanComplete]);

  const executeScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const result = await runFullScan();
      setLastScanAt(new Date(result.scannedAt));
      setNextScanAt(new Date(result.nextScanAt));
      setCandidates(result.allCandidates || []);

      const scanEntry = {
        scannedAt: result.scannedAt ?? Date.now(),
        signals: result.signals || [],
        candidates: result.allCandidates || [],
        signalsCount: result.signals?.length || 0,
      };
      saveScanHistory(scanEntry);

      if (result.signals?.length) {
        onSignalsRef.current?.(result.signals);
      }
      onScanCompleteRef.current?.(scanEntry);
    } catch (e) {
      setError(e?.message || 'Ошибка сканирования');
    } finally {
      setScanning(false);
    }
  }, []);

  const runNow = useCallback(() => {
    executeScan();
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (enabled) {
      intervalRef.current = setInterval(executeScan, SCAN_INTERVAL);
      setNextScanAt(new Date(Date.now() + SCAN_INTERVAL));
    }
  }, [enabled, executeScan]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return undefined;
    }

    executeScan();
    setNextScanAt(new Date(Date.now() + SCAN_INTERVAL));
    intervalRef.current = setInterval(() => {
      executeScan();
      setNextScanAt(new Date(Date.now() + SCAN_INTERVAL));
    }, SCAN_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, executeScan]);

  useEffect(() => {
    if (!enabled || !nextScanAt) return undefined;

    const tick = () => {
      const diff = nextScanAt.getTime() - Date.now();
      setCountdown(formatCountdown(diff));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [enabled, nextScanAt, scanning]);

  const topCandidates = candidates.map((c) => c.symbol).filter(Boolean);

  return {
    scanning,
    lastScanAt,
    nextScanAt,
    countdown,
    candidates,
    topCandidates,
    error,
    runNow,
  };
}
