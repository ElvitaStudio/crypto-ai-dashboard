# Crypto AI Dashboard

Крипто-дашборд с техническим анализом и AI-сигналами на базе Claude API и данных Binance.

## Установка

```bash
git clone <repo-url>
cd crypto-ai-dashboard
cp .env.example .env
# Заполни VITE_ANTHROPIC_API_KEY в .env
npm install
npm run dev
```

Откройте http://localhost:5175

## Возможности

- **График свечей** — Lightweight Charts с объёмом, Bollinger Bands и уровнями S/R
- **Мультитаймфрейм** — анализ тренда на 5m, 15m, 1h, 4h с конфлюэнцией
- **Volume Heatmap** — зоны интереса покупателей/продавцов
- **Индикаторы** — RSI, MACD, Bollinger, ATR, паттерны свечей, уровни
- **Стакан** — 10 bid/ask с визуализацией объёма и давления
- **AI анализ** — торговые сигналы через Claude (LONG/SHORT/НЕЙТРАЛЬНО)
- **Калькулятор риска** — размер позиции, риск $, прибыль к TP1/TP2
- **История сигналов** — сохранение в localStorage, win/loss tracking
- **Авто-сканер** — сканирование топ-20 монет каждый час (тестовый режим)
- **Coin Selector** — топ монет по волатильности за 24ч

## Стек

React + Vite, Lightweight Charts v4, Claude API, Binance REST/WebSocket API

## Переменные окружения

| Ключ | Описание |
|------|----------|
| `VITE_ANTHROPIC_API_KEY` | API ключ Anthropic |
| `VITE_BINANCE_WS` | WebSocket Binance |
| `VITE_BINANCE_REST` | REST API spot |
| `VITE_BINANCE_FUTURES` | REST API futures |

## Авто-сканер: переключение на 5 минут

В `src/hooks/useAutoScanner.js` замените:

```js
const SCAN_INTERVAL = 60 * 60 * 1000 // 1 час (тестовый режим)
```

на:

```js
const SCAN_INTERVAL = 5 * 60 * 1000  // 5 минут (продакшен)
```
