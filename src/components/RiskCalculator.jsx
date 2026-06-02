import { useState, useMemo } from 'react';
import { formatPrice } from '../utils/format';

export default function RiskCalculator({ signal }) {
  const [deposit, setDeposit] = useState(1000);
  const [riskPct, setRiskPct] = useState(1);

  const calc = useMemo(() => {
    const entry = parseFloat(signal?.entry);
    const sl = parseFloat(signal?.sl);
    const tp1 = parseFloat(signal?.tp1);
    const tp2 = parseFloat(signal?.tp2);
    if (!entry || !sl) return null;

    const riskAmount = (deposit * riskPct) / 100;
    const slDist = Math.abs(entry - sl) / entry;
    const positionSize = slDist ? riskAmount / slDist : 0;
    const profitTp1 = positionSize * (Math.abs(entry - tp1) / entry);
    const profitTp2 = positionSize * (Math.abs(entry - tp2) / entry);

    const reward = Math.abs(entry - tp1);
    const risk = Math.abs(entry - sl);
    const rr = risk ? reward / risk : 0;

    return { positionSize, riskAmount, profitTp1, profitTp2, rr };
  }, [deposit, riskPct, signal]);

  if (!signal || signal.error) return null;

  return (
    <div className="card risk-calc fade-in-up">
      <h3 className="card-title">Калькулятор риска</h3>
      <div className="risk-inputs">
        <label>
          Депозит ($)
          <input
            type="number"
            value={deposit}
            onChange={(e) => setDeposit(Number(e.target.value))}
          />
        </label>
        <label>
          Риск (%)
          <input
            type="number"
            step="0.1"
            value={riskPct}
            onChange={(e) => setRiskPct(Number(e.target.value))}
          />
        </label>
      </div>
      {calc && (
        <>
          <div className="grid-2x2">
            <div className="grid-cell">
              <span className="cell-label">Позиция</span>
              <span className="cell-value">${formatPrice(calc.positionSize)}</span>
            </div>
            <div className="grid-cell">
              <span className="cell-label">Риск $</span>
              <span className="cell-value">${formatPrice(calc.riskAmount)}</span>
            </div>
            <div className="grid-cell">
              <span className="cell-label">Прибыль TP1</span>
              <span className="cell-value">${formatPrice(calc.profitTp1)}</span>
            </div>
            <div className="grid-cell">
              <span className="cell-label">Прибыль TP2</span>
              <span className="cell-value">${formatPrice(calc.profitTp2)}</span>
            </div>
          </div>
          <div className="rr-visual">
            <div className="rr-bar risk" style={{ flex: 1 }} />
            <div className="rr-bar reward" style={{ flex: calc.rr || 1 }} />
            <span>R:R 1:{calc.rr?.toFixed(1)}</span>
          </div>
        </>
      )}
    </div>
  );
}
