import { useState, useCallback, useRef, useEffect } from 'react';
import Chart from '../components/Chart';
import SignalCard from '../components/SignalCard';
import Indicators from '../components/Indicators';
import OrderBook from '../components/OrderBook';
import RiskCalculator from '../components/RiskCalculator';
import MultiTimeframe from '../components/MultiTimeframe';
import SignalHistory from '../components/SignalHistory';
import VolumeHeatmap from '../components/VolumeHeatmap';
import FundingRates from '../components/FundingRates';
import OpenInterest from '../components/OpenInterest';
import CryptoNews from '../components/CryptoNews';
import ProModal from '../components/ProModal';
import {
  canRunAnalysis,
  recordAnalysisUsage,
  isOwner,
  saveTelegramUser,
  getTimeUntilReset,
} from '../store/userLimits';
import { useMarketData } from '../hooks/useMarketData';
import { useWebSocket } from '../hooks/useWebSocket';
import { analyzeMarket } from '../services/aiAnalysis';
import { formatPrice, formatVolume, formatPercent } from '../utils/format';

const INTERVALS = ['5m', '15m', '1h', '4h'];

export default function DetailPage({ symbol, onBack, onOpenPayment, serverProStatus }) {
  const [selectedInterval, setSelectedInterval] = useState('15m');
  const [signal, setSignal] = useState(null);
  const [signalLoading, setSignalLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signal');
  const [showProModal, setShowProModal] = useState(false);
  const [analysisCheck, setAnalysisCheck] = useState(null);
  const [resetCountdown, setResetCountdown] = useState('');
  const aiContextRef = useRef({
    fundingRate: null,
    fundingRateExtreme: false,
    openInterest: null,
    openInterestChange1h: null,
    openInterestTrend: null,
    newsSentiment: 'neutral',
    newsCount: 0,
  });

  const patchAiContext = useCallback((patch) => {
    aiContextRef.current = { ...aiContextRef.current, ...patch };
  }, []);

  const {
    candles,
    setCandles,
    allTimeframeCandles,
    ticker,
    indicators,
    levels,
    orderBook,
    futuresData,
    loading,
    error,
  } = useMarketData(symbol, selectedInterval);

  const handleNewCandle = useCallback(
    (candle) => {
      setCandles((prev) => {
        if (!prev.length) return [candle];
        const last = prev[prev.length - 1];
        if (last.t === candle.t) {
          return [...prev.slice(0, -1), candle];
        }
        return [...prev, candle];
      });
    },
    [setCandles]
  );

  const { livePrice } = useWebSocket(symbol, selectedInterval, handleNewCandle);

  const currentPrice = livePrice ?? ticker?.lastPrice ?? 0;
  const isUp = (ticker?.priceChangePercent ?? 0) >= 0;

  useEffect(() => {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const user = window.Telegram.WebApp.initDataUnsafe.user;
      saveTelegramUser(String(user.id), String(user.id));
    }
    setAnalysisCheck(canRunAnalysis());
  }, []);

  useEffect(() => {
    setSignal(null);
    setActiveTab('signal');
  }, [symbol]);

  useEffect(() => {
    if (isOwner()) return undefined;

    const tick = () => {
      const t = getTimeUntilReset();
      setResetCountdown(t?.formatted || '');
      if (!t && !canRunAnalysis().allowed) {
        setAnalysisCheck(canRunAnalysis());
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [analysisCheck?.allowed, signalLoading]);

  const userIsPro = isOwner() || serverProStatus;

  const handleAnalyze = async () => {
    if (!userIsPro) {
      const check = canRunAnalysis();
      setAnalysisCheck(check);
      if (!check.allowed) {
        setShowProModal(true);
        return;
      }
    }

    if (!indicators || !ticker) return;

    setSignalLoading(true);
    setSignal(null);

    try {
      const marketData = {
        symbol,
        currentPrice,
        change24h: ticker.priceChangePercent,
        volume24h: ticker.quoteVolume,
        volumeSpike: indicators.volumeSpike,
        rsi: indicators.rsi,
        macd: indicators.macd,
        bollingerBandwidth: indicators.bollingerBandwidth,
        bollingerPosition: indicators.bollingerPosition,
        atr: indicators.atr,
        candlePattern: indicators.candlePattern,
        multiTimeframe: indicators.multiTimeframe,
        supports: levels?.supports || [],
        resistances: levels?.resistances || [],
        pivot: levels?.pivot,
        orderBookBias: indicators.orderBookBias,
        openInterest: aiContextRef.current.openInterest ?? futuresData?.openInterest,
        fundingRate: aiContextRef.current.fundingRate ?? futuresData?.lastFundingRate,
        fundingRateExtreme: aiContextRef.current.fundingRateExtreme,
        openInterestChange1h: aiContextRef.current.openInterestChange1h,
        openInterestTrend: aiContextRef.current.openInterestTrend,
        newsSentiment: aiContextRef.current.newsSentiment,
        newsCount: aiContextRef.current.newsCount,
      };
      const result = await analyzeMarket(marketData);
      setSignal(result);
      if (!userIsPro) {
        recordAnalysisUsage();
        setAnalysisCheck(canRunAnalysis());
      }
    } catch {
      setSignal({ direction: 'НЕЙТРАЛЬНО', confidence: 0, error: true });
    } finally {
      setSignalLoading(false);
    }
  };

  return (
    <div className="detail-page page-content">
      <header className="detail-header">
        <button type="button" className="detail-back-btn" onClick={onBack}>
          ← Назад
        </button>
        <div className="detail-header-center">
          <div className="detail-symbol">{symbol.replace('USDT', '')}</div>
          <div className="detail-price-row">
            <span
              className="detail-price"
              style={{ color: isUp ? '#26a69a' : '#ef5350' }}
            >
              {formatPrice(currentPrice)}
            </span>
            <span
              className="detail-change"
              style={{
                color: isUp ? '#26a69a' : '#ef5350',
                background: isUp ? '#26a69a22' : '#ef535022',
              }}
            >
              {formatPercent(ticker?.priceChangePercent)}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpenPayment?.()}
          style={{
            flexShrink: 0,
            background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
            border: 'none',
            borderRadius: 6,
            color: 'white',
            fontSize: 10,
            fontWeight: 600,
            padding: '6px 8px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontFamily: 'inherit',
          }}
        >
          ⚡ Перейти на Pro
        </button>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <main className="main-grid">
        <div className="col-left">
          <div className="price-block card">
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 3,
                color: '#26a69a',
                textShadow: '0 0 10px #26a69a88, 0 0 20px #26a69a44',
                marginBottom: 4,
                fontFamily: 'monospace',
              }}
            >
              {symbol}
            </div>
            <div className="price-main">
              <span className="price-big" style={{ fontSize: 28 }}>
                {formatPrice(currentPrice)}
              </span>
              <span
                className="change24"
                style={{ color: isUp ? 'var(--green)' : 'var(--red)' }}
              >
                {formatPercent(ticker?.priceChangePercent)}
              </span>
            </div>
            <div className="price-stats">
              <span>Vol {formatVolume(ticker?.quoteVolume)}</span>
              <span>H {formatPrice(ticker?.highPrice)}</span>
              <span>L {formatPrice(ticker?.lowPrice)}</span>
            </div>
            <div className="interval-btns">
              {INTERVALS.map((iv) => (
                <button
                  key={iv}
                  type="button"
                  className={selectedInterval === iv ? 'active' : ''}
                  onClick={() => setSelectedInterval(iv)}
                >
                  {iv}
                </button>
              ))}
            </div>
          </div>

          <Chart
            symbol={symbol}
            candles={candles}
            levels={levels}
            livePrice={livePrice}
            bollingerBands={indicators?.bollinger}
          />

          <MultiTimeframe
            allTimeframeCandles={allTimeframeCandles}
            currentPrice={currentPrice}
          />

          <VolumeHeatmap candles={candles} />

          <div className="tabs">
            <button
              type="button"
              className={activeTab === 'signal' ? 'active' : ''}
              onClick={() => setActiveTab('signal')}
            >
              🤖 Сигнал AI
            </button>
            <button
              type="button"
              className={activeTab === 'history' ? 'active' : ''}
              onClick={() => setActiveTab('history')}
            >
              📋 История
            </button>
          </div>

          {activeTab === 'signal' ? (
            <div className="tab-content">
              <button
                type="button"
                className="btn-analyze"
                onClick={handleAnalyze}
                disabled={signalLoading || loading}
                style={{
                  width: '100%',
                  background: signalLoading
                    ? '#1e2433'
                    : 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '12px',
                  cursor: signalLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {signalLoading
                  ? '⏳ Анализирую...'
                  : userIsPro
                    ? '🤖 Запустить AI анализ'
                    : analysisCheck?.allowed
                      ? '🤖 Запустить AI анализ (1 из 1)'
                      : '🔒 Лимит исчерпан'}
              </button>
              {serverProStatus && !isOwner() && (
                <div
                  style={{
                    textAlign: 'center',
                    fontSize: 10,
                    color: '#26a69a',
                    marginTop: 4,
                  }}
                >
                  ⚡ Pro активен
                </div>
              )}
              {!isOwner() && !serverProStatus && (
                <div
                  style={{
                    textAlign: 'center',
                    fontSize: 10,
                    color: '#4a5568',
                    marginTop: 4,
                  }}
                >
                  {analysisCheck?.allowed ? (
                    'Бесплатно: 1 анализ в 24 часа'
                  ) : (
                    <>
                      Сброс через{' '}
                      <span
                        style={{
                          fontFamily: 'monospace',
                          color: '#fbbf24',
                          letterSpacing: 1,
                        }}
                      >
                        {resetCountdown || '00:00:00'}
                      </span>
                    </>
                  )}
                </div>
              )}
              <SignalCard signal={signal} loading={signalLoading} />
              {signal && !signal.error && <RiskCalculator signal={signal} />}
            </div>
          ) : (
            <SignalHistory />
          )}
        </div>

        <div className="col-right">
          <Indicators
            indicators={indicators}
            levels={levels}
            currentPrice={currentPrice}
          />
          <OrderBook book={orderBook} livePrice={livePrice} />
          <FundingRates selectedCoin={symbol} onMetrics={patchAiContext} />
          <OpenInterest
            symbol={symbol}
            priceChange24h={ticker?.priceChangePercent}
            onMetrics={patchAiContext}
          />
          <CryptoNews symbol={symbol} onMetrics={patchAiContext} />
        </div>
      </main>

      <ProModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        onOpenPayment={() => {
          setShowProModal(false);
          onOpenPayment?.();
        }}
      />
    </div>
  );
}
