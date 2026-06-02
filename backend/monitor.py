import asyncio
import aiohttp
import os
import sqlite3
from datetime import datetime, timedelta
from dotenv import load_dotenv
from database import activate_pro, get_pending_payments, confirm_payment, get_user

load_dotenv()

BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
WALLET_TRC20 = os.getenv('WALLET_TRC20')
WALLET_ERC20 = os.getenv('WALLET_ERC20')
WALLET_BEP20 = os.getenv('WALLET_BEP20')

# Топ монеты для мониторинга
TOP_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT']

# Хранилище в памяти
sr_levels = {}
prev_prices = {}
last_fng_date = None

async def send_telegram(chat_id, text):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    async with aiohttp.ClientSession() as session:
        try:
            await session.post(url, json={
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "Markdown"
            })
        except Exception as e:
            print(f"Send telegram error: {e}")

def get_pro_users():
    """Получаем всех активных Pro пользователей"""
    conn = sqlite3.connect('/root/crypto-payment/payments.db')
    c = conn.cursor()
    now = datetime.now().isoformat()
    c.execute('''SELECT telegram_id FROM users 
        WHERE is_pro=1 AND pro_expires_at > ?''', (now,))
    rows = c.fetchall()
    conn.close()
    return [row[0] for row in rows]

# ==================== БЛОКЧЕЙН МОНИТОРИНГ ====================

async def check_trc20_transactions():
    try:
        url = f"https://apilist.tronscanapi.com/api/filter/trc20/transfers"
        params = {
            "limit": 50,
            "start": 0,
            "toAddress": WALLET_TRC20,
            "contractAddress": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        }
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as r:
                if r.status != 200:
                    return []
                data = await r.json()
                txs = data.get('token_transfers', [])
                result = []
                for tx in txs:
                    amount = float(tx.get('quant', 0)) / 1_000_000
                    result.append({
                        'hash': tx.get('transaction_id'),
                        'amount': amount,
                        'network': 'TRC20'
                    })
                return result
    except Exception as e:
        print(f"TRC20 error: {e}")
        return []

async def check_bep20_transactions():
    try:
        USDT_BEP20 = "0x55d398326f99059fF775485246999027B3197955"
        url = "https://api.bscscan.com/api"
        params = {
            "module": "account",
            "action": "tokentx",
            "contractaddress": USDT_BEP20,
            "address": WALLET_BEP20,
            "sort": "desc",
            "apikey": "YourApiKeyToken"
        }
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as r:
                data = await r.json()
                txs = data.get('result', [])
                if not isinstance(txs, list):
                    return []
                result = []
                for tx in txs[:20]:
                    if tx.get('to', '').lower() == WALLET_BEP20.lower():
                        amount = float(tx.get('value', 0)) / 1e18
                        result.append({
                            'hash': tx.get('hash'),
                            'amount': amount,
                            'network': 'BEP20'
                        })
                return result
    except Exception as e:
        print(f"BEP20 error: {e}")
        return []

def get_processed_hashes():
    conn = sqlite3.connect('/root/crypto-payment/payments.db')
    c = conn.cursor()
    c.execute('SELECT tx_hash FROM payments WHERE tx_hash IS NOT NULL')
    hashes = {row[0] for row in c.fetchall()}
    conn.close()
    return hashes

def match_payment_to_pending(amount, network, tolerance=0.5):
    conn = sqlite3.connect('/root/crypto-payment/payments.db')
    c = conn.cursor()
    c.execute('''SELECT id, telegram_id, amount, months, plan 
        FROM payments 
        WHERE status="pending" AND network=?
        AND amount BETWEEN ? AND ?
        ORDER BY created_at DESC LIMIT 1''',
        (network, amount - tolerance, amount + tolerance))
    row = c.fetchone()
    conn.close()
    if row:
        return {
            'payment_id': row[0],
            'telegram_id': row[1],
            'amount': row[2],
            'months': row[3],
            'plan': row[4]
        }
    return None

async def process_transaction(tx, processed_hashes):
    if tx['hash'] in processed_hashes:
        return
    payment = match_payment_to_pending(tx['amount'], tx['network'])
    if not payment:
        return
    confirm_payment(payment['payment_id'], tx['hash'])
    expires = activate_pro(payment['telegram_id'], payment['months'])
    print(f"✅ Активирован Pro для {payment['telegram_id']} до {expires}")
    expires_str = expires.strftime('%d.%m.%Y')
    await send_telegram(
        payment['telegram_id'],
        f"✅ *Оплата подтверждена!*\n\n"
        f"⚡ *Crypto AI Pro активирован*\n"
        f"📅 Действует до: *{expires_str}*\n"
        f"💎 Тариф: {payment['months']} мес.\n\n"
        f"Спасибо за покупку! Открывай бота и пользуйся без ограничений 🚀"
    )
    owner_id = os.getenv('OWNER_CHAT_ID')
    if owner_id:
        await send_telegram(
            owner_id,
            f"💰 *Новая оплата!*\n"
            f"👤 User: {payment['telegram_id']}\n"
            f"💵 Сумма: ${tx['amount']} USDT\n"
            f"🌐 Сеть: {tx['network']}\n"
            f"📅 До: {expires_str}"
        )

async def check_expiring_subscriptions():
    from database import get_expiring_soon
    users = get_expiring_soon()
    now = datetime.now()
    for telegram_id, expires_at in users:
        try:
            expires = datetime.fromisoformat(expires_at)
            days_left = (expires - now).days
            if days_left == 3:
                expires_str = expires.strftime('%d.%m.%Y')
                await send_telegram(
                    telegram_id,
                    f"⏰ *Напоминание о подписке*\n\n"
                    f"Ваш Pro тариф истекает через *3 дня* ({expires_str})\n\n"
                    f"Чтобы продолжить получать сигналы — продлите подписку в боте."
                )
        except Exception as e:
            print(f"Reminder error: {e}")

# ==================== ЦЕНЫ И УРОВНИ S/R ====================

async def get_price(symbol):
    try:
        url = f"https://api.binance.com/api/v3/ticker/price?symbol={symbol}"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as r:
                data = await r.json()
                return float(data['price'])
    except:
        return None

async def get_sr_levels(symbol):
    """Вычисляем уровни S/R на основе свечей H4"""
    try:
        url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval=4h&limit=50"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as r:
                candles = await r.json()
                highs = [float(c[2]) for c in candles]
                lows = [float(c[3]) for c in candles]
                levels = []
                for i in range(2, len(highs) - 2):
                    if highs[i] > highs[i-1] and highs[i] > highs[i-2] and highs[i] > highs[i+1] and highs[i] > highs[i+2]:
                        levels.append(('R', highs[i]))
                    if lows[i] < lows[i-1] and lows[i] < lows[i-2] and lows[i] < lows[i+1] and lows[i] < lows[i+2]:
                        levels.append(('S', lows[i]))
                return levels[-6:] if len(levels) > 6 else levels
    except:
        return []

async def check_sr_breakouts():
    """Проверяем пробои уровней S/R"""
    global sr_levels, prev_prices
    pro_users = get_pro_users()
    if not pro_users:
        return

    for symbol in TOP_SYMBOLS:
        price = await get_price(symbol)
        if not price:
            continue

        if symbol not in sr_levels:
            sr_levels[symbol] = await get_sr_levels(symbol)

        levels = sr_levels.get(symbol, [])
        prev = prev_prices.get(symbol)
        prev_prices[symbol] = price

        if not prev or not levels:
            continue

        tolerance_pct = 0.003

        for level_type, level_price in levels:
            if prev < level_price and price > level_price * (1 + tolerance_pct):
                coin = symbol.replace('USDT', '')
                msg = (
                    f"🚀 *Пробой уровня!* #{coin}\n\n"
                    f"📈 Цена пробила *сопротивление* ${level_price:,.2f}\n"
                    f"💰 Текущая цена: *${price:,.2f}*\n"
                    f"📊 Сигнал: возможное продолжение роста\n\n"
                    f"⚡ _Crypto AI Pro Alert_"
                )
                for user_id in pro_users:
                    await send_telegram(user_id, msg)
                print(f"🚀 Пробой R {symbol}: {level_price} → {price}")

            elif prev > level_price and price < level_price * (1 - tolerance_pct):
                coin = symbol.replace('USDT', '')
                msg = (
                    f"⚠️ *Пробой уровня!* #{coin}\n\n"
                    f"📉 Цена пробила *поддержку* ${level_price:,.2f}\n"
                    f"💰 Текущая цена: *${price:,.2f}*\n"
                    f"📊 Сигнал: возможное продолжение падения\n\n"
                    f"⚡ _Crypto AI Pro Alert_"
                )
                for user_id in pro_users:
                    await send_telegram(user_id, msg)
                print(f"⚠️ Пробой S {symbol}: {level_price} → {price}")

# ==================== МОНИТОРИНГ ОБЪЁМОВ ====================

async def get_volume_data(symbol):
    try:
        url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval=1h&limit=25"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as r:
                candles = await r.json()
                volumes = [float(c[5]) for c in candles]
                current_vol = volumes[-1]
                avg_vol = sum(volumes[:-1]) / len(volumes[:-1])
                return current_vol, avg_vol
    except:
        return None, None

async def check_volume_anomalies():
    """Алерт при аномальном объёме (x2.5 от среднего)"""
    pro_users = get_pro_users()
    if not pro_users:
        return

    for symbol in TOP_SYMBOLS:
        current_vol, avg_vol = await get_volume_data(symbol)
        if not current_vol or not avg_vol or avg_vol == 0:
            continue

        ratio = current_vol / avg_vol
        if ratio >= 2.5:
            price = await get_price(symbol)
            coin = symbol.replace('USDT', '')
            msg = (
                f"🔥 *Аномальный объём!* #{coin}\n\n"
                f"📊 Объём выше нормы в *{ratio:.1f}x*\n"
                f"💰 Цена: *${price:,.2f}*\n"
                f"⚡ Крупные игроки активны — следи за движением!\n\n"
                f"_Crypto AI Pro Alert_"
            )
            for user_id in pro_users:
                await send_telegram(user_id, msg)
            print(f"🔥 Аномальный объём {symbol}: x{ratio:.1f}")

# ==================== СТРАХ И ЖАДНОСТЬ ====================

async def get_fear_greed_index():
    try:
        url = "https://api.alternative.me/fng/?limit=1"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as r:
                data = await r.json()
                item = data['data'][0]
                value = int(item['value'])
                classification = item['value_classification']
                return value, classification
    except:
        return None, None

async def send_daily_fear_greed():
    """Ежедневный дайджест в 9:00 UTC"""
    global last_fng_date
    now = datetime.utcnow()
    today = now.date()

    if now.hour != 9:
        return
    if last_fng_date == today:
        return

    value, classification = await get_fear_greed_index()
    if value is None:
        return

    if value <= 25:
        emoji = "😱"
        advice = "Экстремальный страх — исторически хорошее время для покупок"
    elif value <= 45:
        emoji = "😰"
        advice = "Страх на рынке — осторожно, но есть возможности"
    elif value <= 55:
        emoji = "😐"
        advice = "Нейтральный рынок — торгуй по тренду"
    elif value <= 75:
        emoji = "😏"
        advice = "Жадность растёт — будь осторожен с входами"
    else:
        emoji = "🤑"
        advice = "Экстремальная жадность — высокий риск коррекции"

    btc_price = await get_price('BTCUSDT')
    btc_str = f"${btc_price:,.0f}" if btc_price else "N/A"

    msg = (
        f"{emoji} *Индекс страха и жадности*\n\n"
        f"📊 Значение: *{value}/100* — {classification}\n"
        f"₿ BTC: *{btc_str}*\n\n"
        f"💡 {advice}\n\n"
        f"_Crypto AI · Ежедневный дайджест_"
    )

    pro_users = get_pro_users()
    for user_id in pro_users:
        await send_telegram(user_id, msg)

    last_fng_date = today
    print(f"📊 Fear&Greed: {value} ({classification}) → {len(pro_users)} users")

# ==================== ГЛАВНЫЙ ЦИКЛ ====================

async def monitor_loop():
    global sr_levels
    print("🔍 Монитор запущен (блокчейн + сигналы)")
    check_count = 0

    while True:
        try:
            # Блокчейн (каждые 30 сек)
            processed = get_processed_hashes()
            trc20_txs = await check_trc20_transactions()
            for tx in trc20_txs:
                await process_transaction(tx, processed)
            bep20_txs = await check_bep20_transactions()
            for tx in bep20_txs:
                await process_transaction(tx, processed)

            check_count += 1

            # Пробои S/R каждые 5 мин
            if check_count % 10 == 0:
                await check_sr_breakouts()
                await send_daily_fear_greed()

            # Аномальный объём каждые 15 мин
            if check_count % 30 == 0:
                await check_volume_anomalies()

            # Обновляем уровни S/R и подписки каждый час
            if check_count % 120 == 0:
                sr_levels = {}
                await check_expiring_subscriptions()

            print(f"✓ #{check_count} | TRC20: {len(trc20_txs)} | BEP20: {len(bep20_txs)}")

        except Exception as e:
            print(f"Monitor error: {e}")

        await asyncio.sleep(30)

if __name__ == "__main__":
    asyncio.run(monitor_loop())
