export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN is not configured' });
  }

  const { chatId, firstName } = req.body || {};
  if (!chatId) {
    return res.status(400).json({ error: 'chatId is required' });
  }

  const name = firstName || 'пользователь';

  const message = `
🔓 *Лимит обновлён!*

Привет, ${name}! Ваш бесплатный AI анализ снова доступен.

Нажмите кнопку ниже чтобы открыть сканер 👇
  `.trim();

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '📊 Открыть Crypto AI',
                web_app: { url: 'https://crypto-ai-dashboard-two.vercel.app' },
              },
            ],
          ],
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
