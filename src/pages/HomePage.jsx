import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import AppHeader from '../components/AppHeader';
import ScannerPanel from '../components/ScannerPanel';
import { fetchTopCoinsGecko, fetchKlinesWithFallback } from '../services/binance';
import { formatPrice } from '../utils/format';
import { useCoinCardsSparklines } from '../hooks/useCoinCardsSparklines';

function ChartSkeleton() {
  return (
    <div
      style={{
        height: 130,
        background: '#1e2433',
        borderRadius: 8,
        animation: 'pulse 1.5s infinite',
      }}
    />
  );
}

function MiniChart({ symbol, color }) {
  const [candles, setCandles] = useState([]);
  const [livePrice, setLivePrice] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let retries = 0;
    const maxRetries = 3;
    let retryTimer = null;

    setError(false);
    setLoading(true);
    setCandles([]);
    setLivePrice(null);

    const loadChart = async () => {
      if (cancelled) return;
      try {
        const data = await fetchKlinesWithFallback(symbol, '15m', 30);
        if (!data.length) throw new Error('Empty');
        if (cancelled) return;
        setCandles(
          data.map((k) => ({
            o: k.o,
            h: k.h,
            l: k.l,
            c: k.c,
          }))
        );
        setError(false);
        setLoading(false);
      } catch {
        retries += 1;
        if (retries < maxRetries && !cancelled) {
          retryTimer = setTimeout(loadChart, 3000);
        } else if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadChart();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [symbol]);

  useEffect(() => {
    if (error || !candles.length) return;

    const ws = new WebSocket(
      `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@trade`
    );
    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        setLivePrice(+d.p);
      } catch {
        /* ignore */
      }
    };
    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [symbol, error, candles.length]);

  if (error) {
    return (
      <div
        style={{
          height: 130,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#2d3748',
          fontSize: 11,
        }}
      >
        нет данных
      </div>
    );
  }

  if (loading || !candles.length) {
    return <ChartSkeleton />;
  }

  const W = 200;
  const H = 130;
  const lows = candles.map((c) => c.l);
  const highs = candles.map((c) => c.h);
  const minP = Math.min(...lows);
  const maxP = Math.max(...highs);
  const range = maxP - minP || 1;

  const scaleY = (p) => H - ((p - minP) / range) * H;
  const candleW = W / candles.length - 1;

  const points = candles
    .map((c, i) => `${(i / (candles.length - 1)) * W},${scaleY(c.c)}`)
    .join(' ');

  const areaPoints = `0,${H} ${points} ${W},${H}`;
  const gradId = `grad_${symbol.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 130 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      <polygon points={areaPoints} fill={`url(#${gradId})`} />

      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {candles.map((c, i) => {
        const x = (i / (candles.length - 1)) * W;
        const isUp = c.c >= c.o;
        const candleColor = isUp ? '#26a69a' : '#ef5350';
        const top = scaleY(Math.max(c.o, c.c));
        const bot = scaleY(Math.min(c.o, c.c));
        const bodyH = Math.max(1, bot - top);
        return (
          <g key={i}>
            <line
              x1={x}
              y1={scaleY(c.h)}
              x2={x}
              y2={scaleY(c.l)}
              stroke={candleColor}
              strokeWidth="0.5"
              opacity="0.6"
            />
            <rect
              x={x - candleW / 2}
              y={top}
              width={Math.max(1, candleW)}
              height={bodyH}
              fill={candleColor}
              opacity="0.8"
            />
          </g>
        );
      })}

      {livePrice != null && (
        <circle
          cx={W}
          cy={scaleY(livePrice)}
          r="3"
          fill={color}
          style={{ animation: 'pulse 1s infinite' }}
        />
      )}
    </svg>
  );
}

function CoinListCard({ coin, isCandidate, onOpenCoin }) {
  const chartColor = (coin.change ?? 0) >= 0 ? '#26a69a' : '#ef5350';

  return (
    <div
      style={{
        position: 'relative',
        background: '#0d1520',
        border: isCandidate ? '2px solid #3b82f6' : '1px solid #1e2433',
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        minHeight: 170,
        maxHeight: 200,
      }}
      onClick={() => onOpenCoin(coin.symbol)}
    >
      {isCandidate && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: '#1d4ed8',
            borderRadius: 6,
            padding: '3px 8px',
            fontSize: 10,
            fontWeight: 700,
            color: 'white',
            zIndex: 1,
          }}
        >
          🔥 Кандидат
        </div>
      )}
      <div style={{ width: '42%', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#e2e8f0',
            textShadow:
              coin.change >= 0 ? '0 0 12px #26a69a' : '0 0 12px #ef5350',
          }}
        >
          {coin.symbolClean || coin.symbol.replace('USDT', '')}
        </div>
        {coin.name && coin.name.length > 4 && (
          <div style={{ fontSize: 10, color: '#4a5568', marginTop: 2 }}>
            {coin.name}
          </div>
        )}
        <div
          style={{
            fontSize: 16,
            fontFamily: 'monospace',
            color: coin.change >= 0 ? '#26a69a' : '#ef5350',
            marginTop: 4,
          }}
        >
          {formatPrice(coin.price)}
        </div>
        <div
          style={{
            display: 'inline-block',
            marginTop: 6,
            padding: '3px 10px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 700,
            background: coin.change >= 0 ? '#26a69a22' : '#ef535022',
            border: `1px solid ${coin.change >= 0 ? '#26a69a' : '#ef5350'}`,
            color: coin.change >= 0 ? '#26a69a' : '#ef5350',
          }}
        >
          {coin.change >= 0 ? '+' : ''}
          {coin.change?.toFixed(2)}%
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenCoin(coin.symbol);
          }}
          style={{
            display: 'block',
            marginTop: 10,
            width: '100%',
            padding: '10px',
            border: 'none',
            borderRadius: 8,
            background:
              coin.change >= 0
                ? 'linear-gradient(135deg, #065f46, #26a69a)'
                : 'linear-gradient(135deg, #7f1d1d, #ef5350)',
            color: 'white',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Открыть →
        </button>
      </div>
      <div style={{ width: '55%', height: 130 }}>
        <MiniChart symbol={coin.symbol} color={chartColor} />
      </div>
    </div>
  );
}

function getLastCandidates() {
  try {
    const history = JSON.parse(localStorage.getItem('scan_history') || '[]');
    if (!history.length) return [];
    return history[0].candidates?.map((c) => c.symbol).filter(Boolean) || [];
  } catch {
    return [];
  }
}

export default function HomePage({ onOpenCoin }) {
  const [topCoins, setTopCoins] = useState([]);
  const [topCandidates, setTopCandidates] = useState(getLastCandidates);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [coinsUpdatedAt, setCoinsUpdatedAt] = useState(null);
  const [loadingCoins, setLoadingCoins] = useState(true);

  const coinSymbols = useMemo(() => topCoins.map((c) => c.symbol), [topCoins]);

  const { invalidateCache } = useCoinCardsSparklines(coinSymbols);

  const sortedCoins = useMemo(
    () => [
      ...topCoins.filter((c) => topCandidates.includes(c.symbol)),
      ...topCoins.filter((c) => !topCandidates.includes(c.symbol)),
    ],
    [topCoins, topCandidates]
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTopCandidates(getLastCandidates());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadCoins = useCallback(async (showLoading = false) => {
    if (showLoading) setLoadingCoins(true);
    try {
      const coins = await fetchTopCoinsGecko();
      console.log('Монет загружено:', coins.length);
      setTopCoins(coins);
      setCoinsUpdatedAt(Date.now());
    } catch (e) {
      console.error('loadCoins error:', e);
    } finally {
      setLoadingCoins(false);
    }
  }, []);

  useEffect(() => {
    loadCoins(true);
    const interval = setInterval(() => loadCoins(false), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadCoins]);

  const handleRefresh = () => {
    invalidateCache();
    loadCoins(false);
    setLastRefresh(new Date());
  };

  useEffect(() => {
    console.log('topCoins state:', topCoins.length, topCoins[0]);
  }, [topCoins]);

  if (topCoins.length > 0) {
    console.log('Рендер карточек:', topCoins.length, topCoins[0]);
  }

  return (
    <div className="home-page page-content">
      <AppHeader
        lastRefresh={lastRefresh}
        onRefresh={handleRefresh}
        isConnected={false}
      />

      <ScannerPanel
        onCoinSelect={onOpenCoin}
        currentCoin={null}
        onCandidatesChange={setTopCandidates}
      />

      <section className="coin-list-section">
        <div
          style={{
            textAlign: 'center',
            padding: '16px 0 12px',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 4,
            color: '#26a69a',
            textShadow:
              '0 0 10px #26a69a, 0 0 20px #26a69a88, 0 0 40px #26a69a44',
            textTransform: 'uppercase',
          }}
        >
          ⚡ ТОП-20 АКТИВНЫХ МОНЕТ
        </div>

        {coinsUpdatedAt != null && (
          <div
            style={{
              textAlign: 'center',
              fontSize: 10,
              color: '#4a5568',
              marginBottom: 8,
            }}
          >
            Обновлено: {new Date(coinsUpdatedAt).toLocaleTimeString('ru-RU')}
          </div>
        )}

        {loadingCoins && topCoins.length === 0 ? (
          <div className="coin-list-skeleton">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="coin-card coin-card-skeleton" />
            ))}
          </div>
        ) : topCoins.length === 0 && !loadingCoins ? (
          <div
            style={{
              color: '#4a5568',
              textAlign: 'center',
              padding: 20,
            }}
          >
            Не удалось загрузить монеты. Нажмите «Обновить».
          </div>
        ) : (
          <div className="coin-list-grid">
            {sortedCoins.map((coin) => (
              <CoinListCard
                key={coin.symbol}
                coin={coin}
                isCandidate={topCandidates.includes(coin.symbol)}
                onOpenCoin={onOpenCoin}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
