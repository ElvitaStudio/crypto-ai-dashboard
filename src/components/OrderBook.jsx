import { formatPrice } from '../utils/format';

export default function OrderBook({ book, livePrice }) {
  const asks = [...(book?.asks || [])].sort((a, b) => a[0] - b[0]).slice(0, 10);
  const bids = [...(book?.bids || [])].sort((a, b) => b[0] - a[0]).slice(0, 10);
  const allQty = [...asks, ...bids].map(([, q]) => q);
  const maxQty = Math.max(...allQty, 0.0001);

  const bidVol = bids.reduce((s, [, q]) => s + q, 0);
  const askVol = asks.reduce((s, [, q]) => s + q, 0);
  const total = bidVol + askVol;
  const bidPct = total ? (bidVol / total) * 100 : 50;
  const askPct = 100 - bidPct;

  const spread =
    asks[0] && bids[0] ? Math.abs(asks[0][0] - bids[0][0]).toFixed(4) : '—';

  const Row = ({ price, qty, side }) => (
    <div className={`ob-row ${side}`}>
      <span>{formatPrice(price)}</span>
      <div className="ob-bar-wrap">
        <div
          className={`ob-bar ${side}`}
          style={{ width: `${(qty / maxQty) * 100}%` }}
        />
      </div>
      <span>{qty.toFixed(4)}</span>
    </div>
  );

  return (
    <div className="card orderbook-panel fade-in-up">
      <h3 className="card-title">Стакан</h3>
      {livePrice != null && (
        <p className="ob-live">Live: {formatPrice(livePrice)}</p>
      )}
      <div className="ob-asks">
        {asks.map(([p, q], i) => (
          <Row key={`a${i}`} price={p} qty={q} side="ask" />
        ))}
      </div>
      <div className="ob-spread">Spread: {spread}</div>
      <div className="ob-bids">
        {bids.map(([p, q], i) => (
          <Row key={`b${i}`} price={p} qty={q} side="bid" />
        ))}
      </div>
      <div className="ob-pressure">
        <div className="pressure-bar">
          <div className="bid-part" style={{ width: `${bidPct}%` }} />
          <div className="ask-part" style={{ width: `${askPct}%` }} />
        </div>
        <span>Bid {bidPct.toFixed(0)}% / Ask {askPct.toFixed(0)}%</span>
      </div>
    </div>
  );
}
