const API_URL = 'https://api.aiscreener.best';

export async function registerUser(telegramUser) {
  try {
    const r = await fetch(`${API_URL}/api/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegram_id: String(telegramUser.id),
        username: telegramUser.username,
        first_name: telegramUser.first_name,
      }),
    });
    return r.json();
  } catch (e) {
    console.error('Register error:', e);
    return null;
  }
}

export async function checkProStatus(telegramId) {
  try {
    const r = await fetch(`${API_URL}/api/user/${telegramId}`);
    const data = await r.json();
    console.log('Pro check:', telegramId, data);
    return {
      isPro: data.is_pro === true,
      expiresAt: data.pro_expires_at,
      firstName: data.first_name,
    };
  } catch (e) {
    console.error('Check pro error:', e);
    return { isPro: false, expiresAt: null };
  }
}

export async function createPayment(telegramId, plan, network) {
  try {
    const r = await fetch(`${API_URL}/api/payment/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegram_id: String(telegramId),
        plan,
        network,
      }),
    });
    return r.json();
  } catch (e) {
    console.error('Payment error:', e);
    return null;
  }
}
