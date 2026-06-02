import { runFullScan } from '../../src/services/scanner.js';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await runFullScan();

    if (result.signals.length > 0) {
      await sendTelegramNotifications(result.signals);
    }

    const ownerChatId = process.env.TELEGRAM_CHAT_ID;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (ownerChatId && botToken) {
      const scanReport = `
📊 *Скан завершён*
⏰ ${new Date().toLocaleTimeString('ru-RU')}
🔍 Просканировано: 20 монет
🎯 Кандидатов: ${result.allCandidates?.length || 0}
${
  result.signals.length > 0
    ? `✅ Сигналов: ${result.signals.length}`
    : '➖ Сигналов не найдено'
}
      `.trim();

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: ownerChatId,
          text: scanReport,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '📈 Открыть дашборд',
                  web_app: { url: 'https://crypto-ai-dashboard-two.vercel.app' },
                },
              ],
            ],
          },
        }),
      });
    }

    res.status(200).json({
      success: true,
      scannedAt: new Date().toISOString(),
      signalsFound: result.signals.length,
      candidates: result.allCandidates.map((c) => ({
        symbol: c.symbol,
        score: c.score,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function sendTelegramNotifications(signals) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) return;

  for (const signal of signals) {
    const emoji =
      signal.direction === 'LONG'
        ? '🟢'
        : signal.direction === 'SHORT'
          ? '🔴'
          : '🟡';

    const message = `
${emoji} *${signal.direction}* — ${signal.symbol}
━━━━━━━━━━━━━━━
📍 Вход: \`${signal.entry}\`
🛡 Стоп: \`${signal.sl}\`
🎯 TP1: \`${signal.tp1}\`
🎯 TP2: \`${signal.tp2}\`
⚡ Уверенность: *${signal.confidence}%*
📊 R:R ${signal.riskReward}

💡 ${signal.reason}

[📈 Открыть график](https://crypto-ai-dashboard-two.vercel.app)
    `.trim();

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });
  }
}
