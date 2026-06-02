import axios from 'axios';

async function callAnthropic(body) {
  const isServer = typeof window === 'undefined';

  if (isServer) {
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      const err = new Error(data?.error?.message || 'Anthropic API error');
      err.response = { data };
      throw err;
    }
    return data;
  }

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY?.trim();
  const headers = { 'Content-Type': 'application/json' };
  if (!import.meta.env.PROD && apiKey) {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
  }

  const { data } = await axios.post('https://api.aiscreener.best/api/anthropic', body, { headers });
  return data;
}

export async function analyzeMarket(marketData) {
  const {
    symbol,
    currentPrice,
    change24h,
    volume24h,
    volumeSpike,
    rsi,
    macd,
    bollingerBandwidth,
    bollingerPosition,
    atr,
    candlePattern,
    multiTimeframe,
    supports,
    resistances,
    pivot,
    orderBookBias,
    openInterest,
    fundingRate,
    fundingRateExtreme,
    openInterestChange1h,
    openInterestTrend,
    newsSentiment,
    newsCount,
  } = marketData;

  const rsiLabel = rsi > 70 ? 'ПЕРЕКУПЛЕН' : rsi < 30 ? 'ПЕРЕПРОДАН' : 'НЕЙТРАЛЬНЫЙ';
  const atrPct = currentPrice ? ((atr / currentPrice) * 100).toFixed(2) : '0';

  const prompt = `
Ты профессиональный крипто-трейдер с 10-летним опытом.
Проведи технический анализ и дай точный торговый сигнал.

МОНЕТА: ${symbol} | БИРЖА: Binance

=== ЦЕНА И ОБЪЁМ ===
Текущая цена: ${currentPrice}
Изменение 24ч: ${change24h}%
Объём 24ч: $${volume24h}
Всплеск объёма vs среднее 20 свечей: ${volumeSpike}%

=== ТЕХНИЧЕСКИЕ ИНДИКАТОРЫ ===
RSI(14): ${rsi} [${rsiLabel}]
MACD: ${macd?.trend}, histogram: ${macd?.histogram}
Bollinger: цена ${bollingerPosition}, bandwidth: ${bollingerBandwidth}%
ATR(14): ${atr} (${atrPct}% от цены)
Паттерн: ${candlePattern?.name} (${candlePattern?.bias})

=== МУЛЬТИТАЙМФРЕЙМ ===
5m: ${multiTimeframe?.['5m']}
15m: ${multiTimeframe?.['15m']}
1h: ${multiTimeframe?.['1h']}
4h: ${multiTimeframe?.['4h']}
Конфлюэнция: ${multiTimeframe?.confluence}

=== УРОВНИ ===
Сопротивления: ${(resistances || []).join(' | ')}
Поддержки: ${(supports || []).join(' | ')}
Пивот: ${pivot}

=== СТАКАН ===
Давление покупок: ${orderBookBias}%

=== ФЬЮЧЕРСЫ ===
Open Interest: ${openInterest ?? 'нет данных'}
Funding Rate: ${fundingRate ?? 'нет данных'}

=== РЫНОЧНЫЙ СЕНТИМЕНТ ===
Funding Rate: ${fundingRate ?? 'нет данных'}% ${fundingRateExtreme ? '⚠️ ЭКСТРЕМАЛЬНЫЙ' : ''}
Open Interest: ${openInterest ?? 'нет данных'} (изменение 1ч: ${openInterestChange1h != null ? `${Number(openInterestChange1h).toFixed(2)}%` : 'нет данных'})
Тренд OI: ${openInterestTrend ?? 'нет данных'}
Новости: тональность ${newsSentiment ?? 'neutral'}, свежих новостей ${newsCount ?? 0}

Верни ТОЛЬКО валидный JSON без markdown и без пояснений:
{
  "direction": "LONG" | "SHORT" | "НЕЙТРАЛЬНО",
  "confidence": 0-100,
  "entry": "цена входа",
  "sl": "стоп-лосс",
  "tp1": "первая цель",
  "tp2": "вторая цель",
  "riskReward": "1:X",
  "timeframe": "рекомендуемый таймфрейм",
  "reason": "3-4 предложения на русском — ключевые причины",
  "keyRisks": "главный риск сделки",
  "invalidation": "при каком условии сигнал отменяется"
}
`;

  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  };

  try {
    const data = await callAnthropic(body);

    let text = data.content?.[0]?.text || '';
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(text);
    return {
      ...parsed,
      id: Date.now(),
      symbol,
      createdAt: new Date().toISOString(),
      result: 'pending',
    };
  } catch (err) {
    const apiMsg = err?.response?.data?.error?.message;
    return {
      direction: 'НЕЙТРАЛЬНО',
      confidence: 0,
      error: true,
      reason: apiMsg || 'Ошибка анализа',
      id: Date.now(),
      symbol,
      createdAt: new Date().toISOString(),
      result: 'pending',
    };
  }
}
