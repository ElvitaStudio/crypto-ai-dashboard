# 🤖 Crypto AI Dashboard

> AI-powered cryptocurrency screener as a Telegram Mini App

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://python.org)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📱 What is Crypto AI Dashboard?

A fully functional Telegram Mini App for cryptocurrency traders. Users open the app directly inside Telegram, select a coin, and receive an AI-generated trading signal with entry point, stop-loss, and take-profit targets — powered by Claude AI (Anthropic).

**Live Demo:** [@ai_cryptoanalyze_bot](https://t.me/ai_cryptoanalyze_bot)

---

## ✨ Features

### 🧠 AI Trading Signals
- **LONG / SHORT / NEUTRAL** direction with confidence score (0-100%)
- Entry price, Stop-Loss, TP1 & TP2 targets
- Risk/Reward ratio
- Recommended timeframe
- Signal reasoning in plain language
- Invalidation conditions

### 📊 Technical Analysis
- RSI(14), MACD, Bollinger Bands, ATR(14)
- Support & Resistance levels (auto-calculated from H4 candles)
- Multi-timeframe analysis: 5m / 15m / 1h / 4h
- Candlestick pattern recognition
- Order book pressure (buy vs sell %)

### 📈 Futures Data
- Open Interest + 1h change
- Funding Rate with extreme value warnings
- OI trend direction

### 🔔 Pro Alerts (Telegram notifications)
- S/R breakout alerts every 5 minutes
- Abnormal volume alerts (2.5x threshold) every 15 minutes
- Daily Fear & Greed Index digest at 9:00 UTC
- Subscription expiry reminder (3 days before)

### 💳 Payment System
- USDT TRC20 and BEP20 support
- **Automatic** blockchain payment monitoring
- Instant Pro activation after payment confirmation

---

## 💰 Business Model

| Plan | Price | Features |
|------|-------|----------|
| Free | $0 | 1 AI analysis per 24 hours |
| Pro 1 month | $19.99 | Unlimited + all alerts |
| Pro 3 months | $50.97 | 15% discount |
| Pro 6 months | $89.94 | 25% discount |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | FastAPI (Python 3.10) |
| Database | SQLite |
| AI Engine | Claude Sonnet (Anthropic API) |
| Market Data | Binance API (free) |
| Bot | python-telegram-bot |
| Hosting | Ubuntu 22.04 VPS |

---

## 📁 Project Structure

```
crypto-ai-dashboard/
├── frontend/                 # React + Vite Mini App
│   ├── src/
│   │   ├── pages/            # HomePage, DetailPage, PaymentPage
│   │   ├── components/       # SignalCard, Indicators, VolumeHeatmap, etc.
│   │   ├── services/         # aiAnalysis.js, paymentApi.js
│   │   └── store/            # userLimits.js
│   └── vite.config.js
│
├── backend/                  # FastAPI Python
│   ├── app.py                # Main API + Anthropic proxy
│   ├── database.py           # SQLite models
│   ├── bot.py                # Telegram bot handlers
│   ├── monitor.py            # Blockchain monitor + Pro alerts
│   └── requirements.txt
│
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- Anthropic API Key (from [console.anthropic.com](https://console.anthropic.com))

### Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your keys

# Start API
uvicorn app:app --host 0.0.0.0 --port 8001

# Start bot
python bot.py

# Start monitor
python monitor.py
```

### Frontend Setup

```bash
cd frontend
npm install
npm run build
# Deploy dist/ to your web server
```

### Environment Variables

```env
TELEGRAM_BOT_TOKEN=your_bot_token
OWNER_CHAT_ID=your_telegram_id
ANTHROPIC_API_KEY=your_anthropic_key
WALLET_TRC20=your_trc20_wallet
WALLET_BEP20=your_bep20_wallet
SECRET_KEY=your_secret_key
API_PORT=8001
```

---

## 🌐 Deployment

The app is designed to run on a single VPS with nginx:

- Frontend: served as static files
- Backend API: proxied via nginx to port 8001
- Bot & Monitor: managed with PM2

Example nginx config included in `/docs/nginx.conf`

---

## 📊 Monitored Coins

BTC, ETH, SOL, BNB, XRP — easily extendable in `monitor.py`

---

## 🔒 Security Notes

- Never commit `.env` file (already in `.gitignore`)
- Replace all API keys before deployment
- Anthropic API key is proxied server-side (never exposed to client)

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 💬 Contact

Built by [@ElvitaStudio](https://github.com/Elvita-Studio)

---

⭐ If you find this project useful, please give it a star!
