import asyncio
import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
from dotenv import load_dotenv
from database import get_user, create_user, activate_pro

load_dotenv()

BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
OWNER_ID = os.getenv('OWNER_CHAT_ID')
MINI_APP_URL = "https://app.aiscreener.best"

PLANS = {
    '1m': {'name': '1 месяц', 'amount': 19.99, 'months': 1},
    '3m': {'name': '3 месяца', 'amount': 50.97, 'months': 3},
    '6m': {'name': '6 месяцев', 'amount': 89.94, 'months': 6},
}

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    create_user(str(user.id), user.username, user.first_name)
    keyboard = [[
        InlineKeyboardButton("📊 Открыть Crypto AI", web_app={"url": MINI_APP_URL})
    ], [
        InlineKeyboardButton("⚡ Pro тариф", callback_data="show_plans"),
        InlineKeyboardButton("👤 Мой статус", callback_data="my_status")
    ]]
    await update.message.reply_text(
        f"👋 Привет, {user.first_name}!\n\n"
        f"🤖 *Crypto AI* — AI скринер криптовалют\n\n"
        f"• Реальные графики с уровнями S/R\n"
        f"• AI анализ LONG/SHORT сигналов\n"
        f"• Авто-сканер топ монет\n\n"
        f"Бесплатно: 1 AI анализ в 24 часа\n"
        f"Pro: безлимит + сигналы в Telegram",
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def show_plans(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    keyboard = [
        [InlineKeyboardButton("1 месяц — $19.99", callback_data="plan_1m")],
        [InlineKeyboardButton("3 месяца — $50.97 🔥 -15%", callback_data="plan_3m")],
        [InlineKeyboardButton("6 месяцев — $89.94 💎 -25%", callback_data="plan_6m")],
        [InlineKeyboardButton("◀️ Назад", callback_data="back_main")]
    ]
    await query.edit_message_text(
        "⚡ *Crypto AI Pro*\n\n"
        "✅ Безлимитный AI анализ\n"
        "🔔 Сигналы авто-сканера в Telegram\n"
        "⏱ Авто-сканер каждые 5 минут\n\n"
        "Выбери тариф:",
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def show_payment(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    plan_key = query.data.replace('plan_', '')
    plan = PLANS[plan_key]
    keyboard = [
        [InlineKeyboardButton("💎 TRC20 (Tron) ~$1", callback_data=f"pay_{plan_key}_TRC20")],
        [InlineKeyboardButton("🔷 ERC20 (Ethereum)", callback_data=f"pay_{plan_key}_ERC20")],
        [InlineKeyboardButton("🟡 BEP20 (BSC) ~$0.5", callback_data=f"pay_{plan_key}_BEP20")],
        [InlineKeyboardButton("◀️ Назад", callback_data="show_plans")]
    ]
    await query.edit_message_text(
        f"💳 *Оплата: {plan['name']}*\n\nСумма: *${plan['amount']} USDT*\n\nВыбери сеть:",
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def show_wallet(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    parts = query.data.split('_')
    plan_key = parts[1]
    network = parts[2]
    plan = PLANS[plan_key]
    wallets = {
        'TRC20': os.getenv('WALLET_TRC20'),
        'ERC20': os.getenv('WALLET_ERC20'),
        'BEP20': os.getenv('WALLET_BEP20'),
    }
    wallet = wallets[network]
    user = update.effective_user
    from database import create_payment
    create_payment(str(user.id), plan['amount'], network, plan_key, plan['months'])
    keyboard = [[
        InlineKeyboardButton("✅ Я оплатил", callback_data=f"paid_{plan_key}_{network}"),
        InlineKeyboardButton("◀️ Назад", callback_data=f"plan_{plan_key}")
    ]]
    await query.edit_message_text(
        f"💳 *Оплата {plan['name']}*\n\n"
        f"Отправь ровно *{plan['amount']} USDT*\n"
        f"Сеть: *{network}*\n\n"
        f"На адрес:\n`{wallet}`\n\n"
        f"⚠️ После отправки нажми *Я оплатил*\n"
        f"Активация автоматически за 1-5 минут",
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def paid_confirm(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    await query.edit_message_text(
        "⏳ *Ожидаем подтверждение*\n\n"
        "Проверяем блокчейн каждые 30 секунд.\n"
        "Уведомление придёт автоматически.\n\n"
        "Обычно 1-5 минут после отправки.",
        parse_mode='Markdown'
    )

async def my_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    user_id = str(update.effective_user.id)
    user = get_user(user_id)
    from datetime import datetime
    if user and user['is_pro'] and user['pro_expires_at']:
        try:
            expires = datetime.fromisoformat(user['pro_expires_at'])
            if expires > datetime.now():
                days_left = (expires - datetime.now()).days
                expires_str = expires.strftime('%d.%m.%Y')
                text = f"⚡ *Pro активен*\n\n📅 До: *{expires_str}*\n⏰ Осталось: *{days_left} дней*"
            else:
                text = "❌ *Pro истёк*\n\nОформи подписку снова!"
        except:
            text = "❌ Ошибка проверки"
    else:
        text = "👤 *Бесплатный план*\n\n1 AI анализ в 24 часа\n\nПерейди на Pro!"
    keyboard = [[
        InlineKeyboardButton("⚡ Купить Pro", callback_data="show_plans"),
        InlineKeyboardButton("📊 Открыть", web_app={"url": MINI_APP_URL})
    ]]
    await query.edit_message_text(text, parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup(keyboard))

async def admin_activate(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if str(update.effective_user.id) != OWNER_ID:
        return
    args = context.args
    if len(args) < 2:
        await update.message.reply_text("Использование: /activate <user_id> <1m|3m|6m>")
        return
    months = PLANS.get(args[1], {}).get('months')
    if not months:
        await update.message.reply_text("Неверный план. Используй: 1m, 3m, 6m")
        return
    expires = activate_pro(args[0], months)
    expires_str = expires.strftime('%d.%m.%Y')
    await update.message.reply_text(f"✅ Pro активирован для {args[0]}\nДо: {expires_str}")
    try:
        await context.bot.send_message(chat_id=args[0],
            text=f"✅ *Pro активирован!*\n📅 До: *{expires_str}*\n\nОткрывай бота! 🚀",
            parse_mode='Markdown')
    except:
        pass

async def admin_stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if str(update.effective_user.id) != OWNER_ID:
        return
    import sqlite3
    conn = sqlite3.connect('/root/crypto-payment/payments.db')
    c = conn.cursor()
    c.execute('SELECT COUNT(*) FROM users')
    total = c.fetchone()[0]
    c.execute('SELECT COUNT(*) FROM users WHERE is_pro=1')
    pro = c.fetchone()[0]
    c.execute('SELECT SUM(amount) FROM payments WHERE status="confirmed"')
    revenue = c.fetchone()[0] or 0
    conn.close()
    await update.message.reply_text(
        f"📊 *Статистика*\n\n👥 Всего: *{total}*\n⚡ Pro: *{pro}*\n💰 Выручка: *${revenue:.2f}*",
        parse_mode='Markdown')

def main():
    application = Application.builder().token(BOT_TOKEN).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("activate", admin_activate))
    application.add_handler(CommandHandler("stats", admin_stats))
    application.add_handler(CallbackQueryHandler(show_plans, pattern="show_plans"))
    application.add_handler(CallbackQueryHandler(my_status, pattern="my_status"))
    application.add_handler(CallbackQueryHandler(show_payment, pattern="^plan_"))
    application.add_handler(CallbackQueryHandler(show_wallet, pattern="^pay_"))
    application.add_handler(CallbackQueryHandler(paid_confirm, pattern="^paid_"))
    application.add_handler(CallbackQueryHandler(start, pattern="back_main"))
    print("🤖 Бот запущен")
    application.run_polling(drop_pending_updates=True, allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(asyncio.sleep(0))
    finally:
        pass
    main()
