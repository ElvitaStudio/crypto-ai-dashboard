const FUTURES_REST = 'https://fapi.binance.com';
const SPOT_REST = 'https://api.binance.com';
const WS_BASE = 'wss://fstream.binance.com';

const STABLE_BASES = ['USDT', 'BUSD', 'USDC', 'DAI', 'TUSD', 'FDUSD'];

function hasData(data) {
  if (Array.isArray(data)) return data.length > 0;
  return data != null && typeof data === 'object' && !data.code;
}

export async function smartFetch(symbol, endpoint, params = {}) {
  const query = new URLSearchParams({
    symbol,
    ...Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v != null && v !== '')
        .map(([k, v]) => [k, String(v)])
    ),
  }).toString();

  try {
    const r = await fetch(`${FUTURES_REST}/fapi/v1/${endpoint}?${query}`);
    if (r.ok) {
      const data = await r.json();
      if (hasData(data)) return { data, source: 'futures' };
    }
  } catch {
    /* futures недоступен — пробуем спот */
  }

  const r = await fetch(`${SPOT_REST}/api/v3/${endpoint}?${query}`);
  if (!r.ok) throw new Error(`Spot error: ${r.status}`);
  const data = await r.json();
  if (data?.code != null && data?.msg) throw new Error(data.msg);
  return { data, source: 'spot' };
}

function parseKlines(data) {
  if (!Array.isArray(data)) throw new Error('Invalid klines');
  return data.map((k) => ({
    t: k[0],
    o: parseFloat(k[1]),
    h: parseFloat(k[2]),
    l: parseFloat(k[3]),
    c: parseFloat(k[4]),
    v: parseFloat(k[5]),
  }));
}

function parseOrderBook(data) {
  return {
    bids: data.bids.map(([price, qty]) => [parseFloat(price), parseFloat(qty)]),
    asks: data.asks.map(([price, qty]) => [parseFloat(price), parseFloat(qty)]),
  };
}

function mapTicker24hr(data, source) {
  const base = {
    lastPrice: parseFloat(data.lastPrice),
    priceChangePercent: parseFloat(data.priceChangePercent),
    quoteVolume: parseFloat(data.quoteVolume),
    highPrice: parseFloat(data.highPrice),
    lowPrice: parseFloat(data.lowPrice),
    source,
  };
  if (source === 'futures') {
    return {
      ...base,
      openInterest: parseFloat(data.openInterest || 0),
      lastFundingRate: parseFloat(data.lastFundingRate || 0),
      markPrice: parseFloat(data.markPrice || data.lastPrice || 0),
    };
  }
  return {
    ...base,
    openInterest: 0,
    lastFundingRate: 0,
    markPrice: base.lastPrice,
  };
}

export async function fetchSmartKlines(symbol, interval, limit = 100) {
  try {
    const { data } = await smartFetch(symbol, 'klines', { interval, limit });
    return parseKlines(data);
  } catch (e) {
    console.error('fetchSmartKlines error:', symbol, e?.message);
    return [];
  }
}

/** MiniChart: фьючерсы → спот при 404/пустом ответе */
export async function fetchKlinesWithFallback(symbol, interval = '15m', limit = 30) {
  const futuresUrl =
    `${FUTURES_REST}/fapi/v1/klines` +
    `?symbol=${symbol}&interval=${interval}&limit=${limit}`;

  try {
    const r = await fetch(futuresUrl);
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data) && data.length > 0) {
        return parseKlines(data);
      }
    }
  } catch {
    /* fallback */
  }

  const spotUrl =
    `${SPOT_REST}/api/v3/klines` +
    `?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const r = await fetch(spotUrl);
  if (!r.ok) throw new Error(`Spot klines: ${r.status}`);
  const data = await r.json();
  if (!Array.isArray(data) || !data.length) throw new Error('Empty klines');
  return parseKlines(data);
}

export async function fetchSmartTicker(symbol) {
  try {
    const { data, source } = await smartFetch(symbol, 'ticker/24hr');
    return mapTicker24hr(data, source);
  } catch (e) {
    console.error('fetchSmartTicker error:', symbol, e?.message);
    return null;
  }
}

export async function fetchSmartOrderBook(symbol, limit = 20) {
  try {
    const { data } = await smartFetch(symbol, 'depth', { limit });
    return parseOrderBook(data);
  } catch (e) {
    console.error('fetchSmartOrderBook error:', symbol, e?.message);
    return { bids: [], asks: [] };
  }
}

export async function fetchTopCoinsGecko() {
  try {
    const r = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets' +
        '?vs_currency=usd' +
        '&order=price_change_percentage_24h_desc' +
        '&per_page=100&page=1' +
        '&sparkline=false'
    );
    const data = await r.json();
    if (!Array.isArray(data)) throw new Error('Bad response');

    return data
      .sort(
        (a, b) =>
          Math.abs(b.price_change_percentage_24h) -
          Math.abs(a.price_change_percentage_24h)
      )
      .slice(0, 20)
      .map((coin) => ({
        symbol: coin.symbol.toUpperCase() + 'USDT',
        symbolClean: coin.symbol.toUpperCase(),
        name: coin.name,
        price: coin.current_price,
        change: coin.price_change_percentage_24h || 0,
        volume: coin.total_volume,
        image: coin.image,
      }));
  } catch (e) {
    console.error('CoinGecko error:', e);
    return [];
  }
}

export const fetchKlines = fetchSmartKlines;
export const fetchTicker = fetchSmartTicker;
export const fetchOrderBook = fetchSmartOrderBook;
export const fetchTopCoins = fetchTopCoinsGecko;

export const fetchFuturesKlines = fetchSmartKlines;
export const fetchFuturesTicker = fetchSmartTicker;
export const fetchFuturesOrderBook = fetchSmartOrderBook;
export const fetchFuturesTopCoins = fetchTopCoinsGecko;

export function createWebSocket(symbol, interval, onCandle, onTrade) {
  const sym = symbol.toLowerCase();
  const streams = `${sym}@kline_${interval}/${sym}@trade/${sym}@depth20@100ms`;
  const url = `${WS_BASE}/stream?streams=${streams}`;

  let ws = null;
  let closed = false;
  let reconnectTimer = null;

  const connect = () => {
    if (closed) return;
    ws = new WebSocket(url);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const payload = msg.data;
        if (!payload) return;

        if (payload.e === 'kline') {
          const k = payload.k;
          if (k.x) {
            onCandle({
              t: k.t,
              o: parseFloat(k.o),
              h: parseFloat(k.h),
              l: parseFloat(k.l),
              c: parseFloat(k.c),
              v: parseFloat(k.v),
            });
          }
        } else if (payload.e === 'trade' || payload.e === 'aggTrade') {
          onTrade(parseFloat(payload.p));
        }
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => {
      if (!closed) {
        reconnectTimer = setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => {
      ws?.close();
    };
  };

  connect();

  return {
    close() {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    },
  };
}
