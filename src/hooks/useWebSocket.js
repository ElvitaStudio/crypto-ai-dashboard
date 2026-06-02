import { useState, useEffect, useRef } from 'react';
import { createWebSocket } from '../services/binance';

export function useWebSocket(symbol, interval, onNewCandle) {
  const [livePrice, setLivePrice] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const onNewCandleRef = useRef(onNewCandle);

  useEffect(() => {
    onNewCandleRef.current = onNewCandle;
  }, [onNewCandle]);

  useEffect(() => {
    setLivePrice(null);
    setIsConnected(false);

    if (!symbol || !interval) return undefined;

    const ws = createWebSocket(
      symbol,
      interval,
      (candle) => {
        setIsConnected(true);
        onNewCandleRef.current?.(candle);
      },
      (price) => {
        setIsConnected(true);
        setLivePrice(price);
      }
    );

    return () => {
      ws.close();
      setIsConnected(false);
      setLivePrice(null);
    };
  }, [symbol, interval]);

  return { livePrice, isConnected };
}
